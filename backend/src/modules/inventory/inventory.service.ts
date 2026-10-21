import { randomUUID } from 'node:crypto';
import { ConflictError, LarkIntegrationError, NotFoundError } from '../../middleware/index.js';
import type { IBitableRepository } from '../../repositories/bitable/bitable.interface.js';
import type { BitableRecord, InventoryItem, InventoryListResult } from '../../types/index.js';
import { env } from '../../config/env.js';
import type {
  CreateInventoryInput,
  InventoryQuery,
  UpdateInventoryInput,
  BulkUploadInput,
  BulkUploadItem,
} from './inventory.schemas.js';
import { auditService } from '../audit/audit.service.js';
import { AssignmentsService } from '../assignments/assignments.service.js';

const FIELD = {
  itemId: 'item_id',
  brand: 'Brand',
  deviceModel: 'Device Model',
  sampleHwType: 'Sample HW Type',
  imei1: 'IMEI1',
  imei2: 'IMEI2',
  serialNumber: 'Serial Number',
  vcId: 'VC ID',
  color: 'Color',
  storageRam: 'Storage/Ram',
  assignedDate: 'Assigned Date',
  warehouseLocation: 'Warehouse/Location',
  inventoryHolder: 'Inventory Holder',
  remarks: 'Remarks',
  status: 'Status',
} as const;

export interface BulkUploadResult {
  importedCount: number;
  blockedCount: number;
  totalProcessed: number;
  imported: InventoryItem[];
  blocked: Array<{ item: BulkUploadItem; reason: string }>;
}

export class InventoryService {
  constructor(private readonly repository: IBitableRepository) {}

  async list(query: InventoryQuery): Promise<InventoryListResult> {
    const records = await this.readAll();
    const items = records.map(toInventoryItem);
    const search = query.search.toLowerCase();
    const filtered = items.filter((item) => {
      const searchable = [
        item.brand,
        item.deviceModel,
        item.imei1,
        item.imei2,
        item.serialNumber,
        item.vcId,
        item.warehouseLocation,
        item.inventoryHolder,
      ]
        .join(' ')
        .toLowerCase();
      return (
        (search.length === 0 || searchable.includes(search)) &&
        (query.brand === undefined || item.brand === query.brand) &&
        (query.status === undefined || item.status === query.status)
      );
    });
    const start = (query.page - 1) * query.pageSize;
    const byBrand = items.reduce<Record<string, number>>((counts, item) => {
      counts[item.brand] = (counts[item.brand] ?? 0) + 1;
      return counts;
    }, {});

    return {
      records: filtered.slice(start, start + query.pageSize),
      page: query.page,
      pageSize: query.pageSize,
      total: filtered.length,
      totalPages: Math.max(1, Math.ceil(filtered.length / query.pageSize)),
      totalByBrand: byBrand,
      activeCount: items.filter((item) => item.status === 'Active').length,
      inactiveCount: items.filter((item) => item.status === 'Inactive').length,
    };
  }

  async get(id: string): Promise<InventoryItem> {
    return (await this.resolveItem(id)).item;
  }

  async create(input: CreateInventoryInput): Promise<InventoryItem> {
    try {
      await this.ensureUniqueImeiAndVc(input.imei1, input.imei2, input.vcId);
    } catch (err) {
      auditService.log({
        actorId: 'admin@inventory.internal',
        actorRole: 'Admin',
        action: 'DUPLICATE_BLOCKED',
        entityType: 'Inventory',
        entityId: input.imei1 || input.vcId || 'NEW_DEVICE',
        details: {
          error: err instanceof Error ? err.message : 'Duplicate identifier',
          imei1: input.imei1,
          imei2: input.imei2,
          vcId: input.vcId,
          brand: input.brand,
          deviceModel: input.deviceModel,
        },
        status: 'BLOCKED',
      });
      throw err;
    }

    const holder = input.inventoryHolder || input.assignedTo || 'IT Stock';
    const record = await this.repository.createRecord(this.tableId(), {
      ...toFields({ ...input, inventoryHolder: holder }),
      [FIELD.itemId]: randomUUID(),
    });
    const item = toInventoryItem(record);

    auditService.log({
      actorId: 'admin@inventory.internal',
      actorRole: 'Admin',
      action: 'INVENTORY_CREATED',
      entityType: 'Inventory',
      entityId: item.itemId,
      details: {
        brand: item.brand,
        deviceModel: item.deviceModel,
        imei1: item.imei1,
      },
      status: 'SUCCESS',
    });

    return item;
  }

  async bulkUpload(input: BulkUploadInput): Promise<BulkUploadResult> {
    const existingRecords = await this.readAll();
    const existingItems = existingRecords.map(toInventoryItem);

    // Build tracking sets for O(1) duplicate checks
    const knownImeis = new Set<string>();
    const knownVcIds = new Set<string>();

    for (const item of existingItems) {
      if (item.imei1) knownImeis.add(item.imei1.trim());
      if (item.imei2) knownImeis.add(item.imei2.trim());
      if (item.vcId) knownVcIds.add(item.vcId.trim());
    }

    const imported: InventoryItem[] = [];
    const blocked: Array<{ item: BulkUploadItem; reason: string }> = [];

    const assignmentsService = new AssignmentsService(this.repository);

    for (let index = 0; index < input.items.length; index++) {
      const item = input.items[index]!;
      const rowNum = index + 1;
      const imei1 = item.imei1?.trim();
      const imei2 = item.imei2?.trim() || '';
      const vcId = item.vcId?.trim() || '';

      // Checkpoint 1: IMEI1 format
      if (!imei1 || !/^\d{15}$/.test(imei1)) {
        const reason = `Row ${rowNum}: Invalid IMEI1 (${imei1 || 'empty'}). Exactly 15 digits required.`;
        blocked.push({ item, reason });
        auditService.log({
          actorId: input.actorId,
          actorRole: input.actorRole,
          action: 'DUPLICATE_BLOCKED',
          entityType: 'BulkUpload',
          entityId: imei1 || `ROW_${rowNum}`,
          details: { row: rowNum, reason, item },
          status: 'BLOCKED',
        });
        continue;
      }

      // Checkpoint 2: Duplicate IMEI1
      if (knownImeis.has(imei1)) {
        const reason = `Row ${rowNum}: Duplicate IMEI1 '${imei1}' already exists in inventory or earlier in batch.`;
        blocked.push({ item, reason });
        auditService.log({
          actorId: input.actorId,
          actorRole: input.actorRole,
          action: 'DUPLICATE_BLOCKED',
          entityType: 'BulkUpload',
          entityId: imei1,
          details: { row: rowNum, reason, duplicateType: 'IMEI1', value: imei1 },
          status: 'BLOCKED',
        });
        continue;
      }

      // Checkpoint 3: Duplicate IMEI2
      if (imei2 && /^\d{15}$/.test(imei2) && knownImeis.has(imei2)) {
        const reason = `Row ${rowNum}: Duplicate IMEI2 '${imei2}' already exists in inventory or earlier in batch.`;
        blocked.push({ item, reason });
        auditService.log({
          actorId: input.actorId,
          actorRole: input.actorRole,
          action: 'DUPLICATE_BLOCKED',
          entityType: 'BulkUpload',
          entityId: imei2,
          details: { row: rowNum, reason, duplicateType: 'IMEI2', value: imei2 },
          status: 'BLOCKED',
        });
        continue;
      }

      // Checkpoint 4: Duplicate VC ID
      if (vcId && knownVcIds.has(vcId)) {
        const reason = `Row ${rowNum}: Duplicate VC ID '${vcId}' already exists in inventory or earlier in batch.`;
        blocked.push({ item, reason });
        auditService.log({
          actorId: input.actorId,
          actorRole: input.actorRole,
          action: 'DUPLICATE_BLOCKED',
          entityType: 'BulkUpload',
          entityId: vcId,
          details: { row: rowNum, reason, duplicateType: 'VC_ID', value: vcId },
          status: 'BLOCKED',
        });
        continue;
      }

      // All checkpoints passed -> Create record
      try {
        const assignedDate = item.assignedDate || new Date().toISOString().slice(0, 10);
        const holder = item.assignedTo || item.inventoryHolder || 'IT Stock';
        const remarksWithDetails = [
          item.remarks || '',
          item.sampleReceivedDate ? `Sample Received: ${item.sampleReceivedDate}` : '',
          item.dateOfReceipt ? `Receipt Date: ${item.dateOfReceipt}` : '',
          item.employeeId ? `Employee ID: ${item.employeeId}` : '',
        ]
          .filter(Boolean)
          .join(' | ');

        const record = await this.repository.createRecord(this.tableId(), {
          [FIELD.itemId]: randomUUID(),
          [FIELD.brand]: item.brand,
          [FIELD.deviceModel]: item.deviceModel,
          [FIELD.sampleHwType]: item.sampleHwType || 'PRO',
          [FIELD.imei1]: imei1,
          [FIELD.imei2]: imei2,
          [FIELD.serialNumber]: item.serialNumber || '',
          [FIELD.vcId]: vcId,
          [FIELD.color]: item.color || '',
          [FIELD.storageRam]: item.storageRam || '',
          [FIELD.assignedDate]: dateToLarkTimestamp(assignedDate),
          [FIELD.warehouseLocation]: item.warehouseLocation || 'Main Warehouse',
          [FIELD.inventoryHolder]: holder,
          [FIELD.remarks]: remarksWithDetails,
          [FIELD.status]: item.assignedTo || item.employeeId ? 'Inactive' : item.status || 'Inactive',
        });

        const createdItem = toInventoryItem(record);
        imported.push(createdItem);

        // Add to known sets so subsequent batch rows cannot collide
        knownImeis.add(imei1);
        if (imei2) knownImeis.add(imei2);
        if (vcId) knownVcIds.add(vcId);

        // If assignedTo or employeeId is provided, also create an assignment record
        if (item.assignedTo || item.employeeId) {
          try {
            await assignmentsService.create({
              itemId: imei1,
              itemName: `${item.brand} ${item.deviceModel}`,
              employeeName: item.assignedTo || item.employeeId || 'Assigned User',
              employeeId: item.employeeId || item.assignedTo || 'EMP-UNKNOWN',
              assignedAt: assignedDate,
              returnedAt: '',
              notes: `Bulk upload allocation: ${item.remarks || 'Standard allocation'}`,
              status: 'Active',
            });
          } catch (assignErr) {
            console.warn(`Could not auto-create assignment for bulk item ${imei1}:`, assignErr);
          }
        }
      } catch (err) {
        const reason = `Row ${rowNum}: Failed to save to database - ${err instanceof Error ? err.message : 'Unknown error'}`;
        blocked.push({ item, reason });
      }
    }

    auditService.log({
      actorId: input.actorId,
      actorRole: input.actorRole,
      action: 'INVENTORY_BULK_UPLOAD',
      entityType: 'BulkUpload',
      entityId: `BATCH_${Date.now()}`,
      details: {
        totalRows: input.items.length,
        importedCount: imported.length,
        blockedCount: blocked.length,
      },
      status: blocked.length > 0 ? 'FLAGGED' : 'SUCCESS',
    });

    return {
      importedCount: imported.length,
      blockedCount: blocked.length,
      totalProcessed: input.items.length,
      imported,
      blocked,
    };
  }

  async update(id: string, input: UpdateInventoryInput): Promise<InventoryItem> {
    const { record, item: existing } = await this.resolveItem(id);
    const assignmentsService = new AssignmentsService(this.repository);
    const hasActiveAssignment = await assignmentsService.hasActiveAssignment(existing.itemId);

    if (input.status === 'Active' && existing.status !== 'Active' && !hasActiveAssignment) {
      throw new ConflictError(
        `Device '${existing.itemId}' cannot be marked Active without a matching active assignment.`,
      );
    }

    if (input.status === 'Inactive' && existing.status === 'Active' && hasActiveAssignment) {
      throw new ConflictError(
        `Device '${existing.itemId}' has an active assignment. Return the assignment before marking the inventory device Inactive.`,
      );
    }

    await this.ensureUniqueImeiAndVc(
      input.imei1 ?? existing.imei1,
      input.imei2 ?? existing.imei2,
      input.vcId ?? existing.vcId,
      existing.itemId,
    );
    const updated = await this.repository.updateRecord(this.tableId(), record.recordId, toFields(input));
    const updatedItem = toInventoryItem(updated);

    auditService.log({
      actorId: 'admin@inventory.internal',
      actorRole: 'Admin',
      action: 'INVENTORY_UPDATED',
      entityType: 'Inventory',
      entityId: updatedItem.itemId,
      details: { updatedFields: Object.keys(input) },
      status: 'SUCCESS',
    });

    return updatedItem;
  }

  async deactivate(id: string): Promise<InventoryItem> {
    const { record, item } = await this.resolveItem(id);
    const assignmentsService = new AssignmentsService(this.repository);
    if (await assignmentsService.hasActiveAssignment(item.itemId)) {
      throw new ConflictError(
        `Device '${item.itemId}' has an active assignment. Return the assignment before deactivating it.`,
      );
    }

    const updated = await this.repository.updateRecord(this.tableId(), record.recordId, {
      [FIELD.status]: 'Inactive',
    });
    const updatedItem = toInventoryItem(updated);

    auditService.log({
      actorId: 'admin@inventory.internal',
      actorRole: 'Admin',
      action: 'INVENTORY_DEACTIVATED',
      entityType: 'Inventory',
      entityId: updatedItem.itemId,
      details: { status: 'Inactive' },
      status: 'SUCCESS',
    });

    return updatedItem;
  }

  /**
   * Deletion prohibition enforcement (Pillar 3 & 7: Transparency & Tracking)
   */
  async delete(id: string, actorId = 'system'): Promise<never> {
    auditService.log({
      actorId,
      actorRole: 'Admin',
      action: 'DELETION_BLOCKED',
      entityType: 'Inventory',
      entityId: id,
      details: 'Attempted delete on inventory entry. Prohibited by policy.',
      status: 'BLOCKED',
    });
    throw new ConflictError(
      'Deletion is strictly prohibited by policy. No deletion rights for any inventory entry. Use deactivation or controlled status amendment instead.',
    );
  }

  private tableId(): string {
    if (env.LARK_TABLE_INVENTORY.length === 0) {
      throw new LarkIntegrationError('LARK_TABLE_INVENTORY is not configured.', 'INVENTORY_TABLE_NOT_CONFIGURED');
    }
    return env.LARK_TABLE_INVENTORY;
  }

  private async readAll(): Promise<BitableRecord[]> {
    const records: BitableRecord[] = [];
    let pageToken: string | undefined;
    let hasMore = true;
    while (hasMore) {
      const page = await this.repository.listRecords(this.tableId(), {
        pageSize: 100,
        ...(pageToken !== undefined && { pageToken }),
      });
      records.push(...page.records);
      pageToken = page.pageToken;
      hasMore = page.hasMore && pageToken !== undefined;
    }
    return records;
  }

  private async ensureUniqueImeiAndVc(
    imei1: string,
    imei2: string,
    vcId?: string,
    excludingId?: string,
  ): Promise<void> {
    const records = await this.readAll();
    for (const record of records) {
      const item = toInventoryItem(record);
      if (item.itemId === excludingId) continue;

      if (item.imei1 === imei1 || (imei2 && item.imei1 === imei2)) {
        throw new ConflictError(`Duplicate Checkpoint: A device with IMEI '${imei1}' already exists.`);
      }
      if (imei2 && (item.imei2 === imei2 || item.imei1 === imei2)) {
        throw new ConflictError(`Duplicate Checkpoint: A device with IMEI '${imei2}' already exists.`);
      }
      if (vcId && item.vcId && item.vcId.trim() === vcId.trim()) {
        throw new ConflictError(`Duplicate Checkpoint: A device with VC ID '${vcId}' already exists.`);
      }
    }
  }

  private async resolveItem(id: string): Promise<{ record: BitableRecord; item: InventoryItem }> {
    const tableId = this.tableId();
    const byItemId = await this.repository.findRecordByField(tableId, FIELD.itemId, id);
    const record = byItemId ?? (await this.repository.getRecord(tableId, id));
    if (record === null) throw new NotFoundError('Inventory device');
    return { record, item: toInventoryItem(record) };
  }
}

function toFields(input: Record<string, unknown>): Record<string, unknown> {
  const fields: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    const fieldName = FIELD[key as keyof typeof FIELD];
    if (fieldName !== undefined && value !== undefined) {
      fields[fieldName] =
        key === 'assignedDate' && typeof value === 'string'
          ? dateToLarkTimestamp(value)
          : value;
    }
  }
  return fields;
}

function text(fields: BitableRecord['fields'], key: string): string {
  const value = fields[key];
  if (value === undefined || value === null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && key === FIELD.assignedDate) return larkTimestampToDate(value);
  if (Array.isArray(value)) {
    const first = value[0];
    if (typeof first === 'string') return first;
    if (typeof first === 'object' && first !== null) {
      const named = first as { name?: unknown; text?: unknown };
      return typeof named.name === 'string' ? named.name : typeof named.text === 'string' ? named.text : '';
    }
  }
  if (typeof value === 'object') {
    const named = value as { name?: unknown; text?: unknown; value?: unknown };
    if (typeof named.name === 'string') return named.name;
    if (typeof named.text === 'string') return named.text;
    if (typeof named.value === 'string') return named.value;
  }
  return String(value);
}

function dateToLarkTimestamp(value: string): number {
  const timestamp = Date.parse(`${value}T00:00:00Z`);
  if (Number.isNaN(timestamp)) {
    throw new LarkIntegrationError('Assigned Date must be a valid date.', 'INVALID_ASSIGNED_DATE');
  }
  return timestamp;
}

function larkTimestampToDate(value: number): string {
  const timestamp = value < 100000000000 ? value * 1000 : value;
  return new Date(timestamp).toISOString().slice(0, 10);
}

function toInventoryItem(record: BitableRecord): InventoryItem {
  const fields = record.fields;
  return {
    itemId: text(fields, FIELD.itemId) || record.recordId,
    brand: text(fields, FIELD.brand),
    deviceModel: text(fields, FIELD.deviceModel),
    sampleHwType: text(fields, FIELD.sampleHwType),
    imei1: text(fields, FIELD.imei1),
    imei2: text(fields, FIELD.imei2),
    serialNumber: text(fields, FIELD.serialNumber),
    vcId: text(fields, FIELD.vcId),
    color: text(fields, FIELD.color),
    storageRam: text(fields, FIELD.storageRam),
    assignedDate: text(fields, FIELD.assignedDate),
    warehouseLocation: text(fields, FIELD.warehouseLocation),
    inventoryHolder: text(fields, FIELD.inventoryHolder),
    remarks: text(fields, FIELD.remarks),
    status: text(fields, FIELD.status) === 'Inactive' ? 'Inactive' : 'Active',
  };
}
