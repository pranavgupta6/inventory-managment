import { randomUUID } from 'node:crypto';
import { ConflictError, LarkIntegrationError, NotFoundError } from '../../middleware/index.js';
import type { IBitableRepository } from '../../repositories/bitable/bitable.interface.js';
import type { Assignment, AssignmentListResult, BitableRecord } from '../../types/index.js';
import {
  notifyDeviceAssigned,
  notifyDeviceReturned,
} from '../../services/email/notification.service.js';
import { env } from '../../config/env.js';
import { auditService } from '../audit/audit.service.js';
import type {
  AssignmentQuery,
  CreateAssignmentInput,
  ReturnAssignmentInput,
  UpdateAssignmentInput,
} from './assignments.schemas.js';

const FIELD = {
  assignmentId: 'assignment_id',
  itemId: 'item_id',
  itemName: 'Item Name',
  employeeId: 'Employee ID',
  employeeName: 'Employee Name',
  assignedAt: 'Assigned At',
  returnedAt: 'Returned At',
  notes: 'Notes',
  status: 'Status',
} as const;

const INVENTORY_FIELD = {
  itemId: 'item_id',
  imei1: 'IMEI1',
  imei2: 'IMEI2',
  serialNumber: 'Serial Number',
  status: 'Status',
} as const;

export class AssignmentsService {
  constructor(private readonly repository: IBitableRepository) {}

  async list(query: AssignmentQuery): Promise<AssignmentListResult> {
    const records = await this.readAll();
    const items = records.map(toAssignment);
    const search = (query.search || '').toLowerCase();

    const filtered = items.filter((item) => {
      const searchable = [
        item.itemName,
        item.employeeName,
        item.employeeId,
        item.notes || '',
      ].join(' ').toLowerCase();

      return (
        (search.length === 0 || searchable.includes(search)) &&
        (query.status === undefined || item.status === query.status)
      );
    });

    const start = (query.page - 1) * query.pageSize;

    return {
      records: filtered.slice(start, start + query.pageSize),
      page: query.page,
      pageSize: query.pageSize,
      total: filtered.length,
      totalPages: Math.max(1, Math.ceil(filtered.length / query.pageSize)),
      activeCount: items.filter((item) => item.status === 'Active').length,
      returnedCount: items.filter((item) => item.status === 'Returned').length,
    };
  }

  async get(id: string): Promise<Assignment> {
    return (await this.resolveItem(id)).item;
  }

  async create(input: CreateAssignmentInput): Promise<Assignment> {
    if (input.status !== 'Active') {
      throw new ConflictError('New assignments must use Active status. Return an assignment through the return workflow.');
    }

    // Duplicate Checkpoint: Assigned devices cannot be reassigned until marked as Returned.
    const all = await this.readAll();
    const active = all.map(toAssignment).filter((a) => a.status === 'Active');
    const existingActive = active.find(
      (a) => a.itemId.toLowerCase() === input.itemId.trim().toLowerCase(),
    );

    if (existingActive) {
      auditService.log({
        actorId: input.employeeId || 'tl@company.com',
        actorRole: 'TL',
        action: 'DUPLICATE_BLOCKED',
        entityType: 'Assignment',
        entityId: input.itemId,
        details: {
          reason: `Device '${input.itemId}' is already actively assigned to ${existingActive.employeeName} (${existingActive.employeeId}). Cannot reassign until marked Returned.`,
          attemptedAssignee: input.employeeName,
        },
        status: 'BLOCKED',
      });

      throw new ConflictError(
        `Duplicate Entry Checkpoint: Device '${input.itemId}' is currently assigned to ${existingActive.employeeName}. Assigned devices cannot be reassigned until marked as Returned.`,
      );
    }

    const inventory = await this.resolveInventoryDevice(input.itemId);
    const inventoryStatus = text(inventory.fields, INVENTORY_FIELD.status);
    if (inventoryStatus !== 'Inactive') {
      throw new ConflictError(
        `Device '${input.itemId}' is not available in inventory. Only Inactive devices can be assigned.`,
      );
    }

    await this.repository.updateRecord(this.inventoryTableId(), inventory.recordId, {
      [INVENTORY_FIELD.status]: 'Active',
    });

    let record: BitableRecord;
    try {
      record = await this.repository.createRecord(this.tableId(), {
        ...toFields(input),
        [FIELD.assignmentId]: randomUUID(),
      });
    } catch (error) {
      await this.repository.updateRecord(this.inventoryTableId(), inventory.recordId, {
        [INVENTORY_FIELD.status]: 'Inactive',
      });
      throw error;
    }

    const created = toAssignment(record);

    auditService.log({
      actorId: input.employeeId || 'tl@company.com',
      actorRole: 'TL',
      action: 'DEVICE_ASSIGNED',
      entityType: 'Assignment',
      entityId: created.id,
      details: {
        itemName: input.itemName,
        itemId: input.itemId,
        employeeName: input.employeeName,
        employeeId: input.employeeId,
      },
      status: 'SUCCESS',
    });

    // Notify employee of assignment
    if (input.employeeId && input.employeeId.includes('@')) {
      void notifyDeviceAssigned({
        to: input.employeeId,
        employeeName: input.employeeName,
        itemName: input.itemName,
        itemId: input.itemId,
        assignedAt: input.assignedAt,
        notes: input.notes,
      });
    }

    return created;
  }

  async update(id: string, input: UpdateAssignmentInput): Promise<Assignment> {
    const { record } = await this.resolveItem(id);

    if (input.status === 'Returned' && input.status !== undefined) {
      return this.returnAssignment(id, {
        returnedAt: input.returnedAt || '',
        ...(input.notes !== undefined && { notes: input.notes }),
      });
    }

    if (input.status === 'Active' && input.status !== undefined) {
      const existing = toAssignment(record);
      if (existing.status === 'Returned') {
        throw new ConflictError(
          `Assignment '${existing.id}' is already Returned. Create a new assignment record for a reassignment.`,
        );
      }
    }

    const updated = await this.repository.updateRecord(this.tableId(), record.recordId, toFields(input));
    return toAssignment(updated);
  }

  async hasActiveAssignment(itemId: string): Promise<boolean> {
    const target = itemId.trim().toLowerCase();
    const records = await this.readAll();
    return records.some((record) => {
      const assignment = toAssignment(record);
      return assignment.status === 'Active' && assignment.itemId.trim().toLowerCase() === target;
    });
  }

  async returnAssignment(id: string, input: ReturnAssignmentInput): Promise<Assignment> {
    const { record, item: existing } = await this.resolveItem(id);
    const inventory = await this.resolveInventoryDevice(existing.itemId);
    const returnedAt = input.returnedAt || new Date().toISOString().slice(0, 10);
    const patch: Record<string, unknown> = {
      [FIELD.status]: 'Returned',
      [FIELD.returnedAt]: dateToLarkTimestamp(returnedAt),
    };
    if (input.notes !== undefined) {
      patch[FIELD.notes] = input.notes;
    }
    await this.repository.updateRecord(this.inventoryTableId(), inventory.recordId, {
      [INVENTORY_FIELD.status]: 'Inactive',
    });

    let updated: BitableRecord;
    try {
      updated = await this.repository.updateRecord(this.tableId(), record.recordId, patch);
    } catch (error) {
      await this.repository.updateRecord(this.inventoryTableId(), inventory.recordId, {
        [INVENTORY_FIELD.status]: 'Active',
      });
      throw error;
    }
    const returned = toAssignment(updated);

    auditService.log({
      actorId: existing.employeeId || 'employee@company.com',
      actorRole: 'Employee',
      action: 'DEVICE_RETURNED',
      entityType: 'Assignment',
      entityId: id,
      details: {
        itemName: existing.itemName,
        employeeName: existing.employeeName,
        returnedAt,
        notes: input.notes,
      },
      status: 'SUCCESS',
    });

    // Notify employee of returned confirmation
    if (existing.employeeId && existing.employeeId.includes('@')) {
      void notifyDeviceReturned({
        to: existing.employeeId,
        employeeName: existing.employeeName,
        itemName: existing.itemName,
        returnedAt,
        ...(input.notes ? { notes: input.notes } : {}),
      });
    }

    return returned;
  }

  async exportCsv(): Promise<{ filename: string; csv: string }> {
    const records = await this.readAll();
    const items = records.map(toAssignment);

    const headers = [
      'Assignment ID',
      'Item Name',
      'IMEI / Device Identifier',
      'Employee Name',
      'Employee ID',
      'Assigned At',
      'Returned At',
      'Status',
      'Notes',
    ];

    const rows = items.map((item) => [
      item.id,
      item.itemName,
      item.itemId,
      item.employeeName,
      item.employeeId,
      item.assignedAt,
      item.returnedAt || '-',
      item.status,
      item.notes || '-',
    ]);

    const escapeCell = (cell: string | number) => {
      const str = String(cell ?? '').replace(/"/g, '""');
      return /[",\n\r]/.test(str) ? `"${str}"` : str;
    };

    const headerLine = headers.map(escapeCell).join(',');
    const rowLines = rows.map((r) => r.map(escapeCell).join(','));
    const csv = [headerLine, ...rowLines].join('\r\n');
    const filename = `Device_Assignments_Export_${new Date().toISOString().slice(0, 10)}.csv`;

    return { filename, csv };
  }

  async delete(id: string, actorId = 'system'): Promise<never> {
    auditService.log({
      actorId,
      actorRole: 'Admin',
      action: 'DELETION_BLOCKED',
      entityType: 'Assignment',
      entityId: id,
      details: 'Attempted delete on assignment entry. Prohibited by policy.',
      status: 'BLOCKED',
    });
    throw new ConflictError(
      'Deletion is strictly prohibited by policy. No deletion rights for any assignment record. Devices must be marked as Returned.',
    );
  }

  private tableId(): string {
    if (!env.LARK_TABLE_ASSIGNMENTS || env.LARK_TABLE_ASSIGNMENTS.length === 0) {
      throw new LarkIntegrationError('LARK_TABLE_ASSIGNMENTS is not configured.', 'ASSIGNMENTS_TABLE_NOT_CONFIGURED');
    }
    return env.LARK_TABLE_ASSIGNMENTS;
  }

  private inventoryTableId(): string {
    if (!env.LARK_TABLE_INVENTORY || env.LARK_TABLE_INVENTORY.length === 0) {
      throw new LarkIntegrationError('LARK_TABLE_INVENTORY is not configured.', 'INVENTORY_TABLE_NOT_CONFIGURED');
    }
    return env.LARK_TABLE_INVENTORY;
  }

  private async resolveInventoryDevice(itemId: string): Promise<BitableRecord> {
    const target = itemId.trim().toLowerCase();
    const records: BitableRecord[] = [];
    let pageToken: string | undefined;
    let hasMore = true;

    while (hasMore) {
      const page = await this.repository.listRecords(this.inventoryTableId(), {
        pageSize: 100,
        ...(pageToken !== undefined && { pageToken }),
      });
      records.push(...page.records);
      pageToken = page.pageToken;
      hasMore = page.hasMore && pageToken !== undefined;
    }

    const record = records.find((candidate) =>
      [INVENTORY_FIELD.itemId, INVENTORY_FIELD.imei1, INVENTORY_FIELD.imei2, INVENTORY_FIELD.serialNumber]
        .some((field) => text(candidate.fields, field).trim().toLowerCase() === target),
    );

    if (record === undefined) {
      throw new NotFoundError(`Inventory device '${itemId}'`);
    }
    return record;
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

  private async resolveItem(id: string): Promise<{ record: BitableRecord; item: Assignment }> {
    const tableId = this.tableId();
    const byId = await this.repository.findRecordByField(tableId, FIELD.assignmentId, id);
    const record = byId ?? (await this.repository.getRecord(tableId, id));
    if (record === null) throw new NotFoundError('Assignment');
    return { record, item: toAssignment(record) };
  }
}

function toFields(input: Record<string, unknown>): Record<string, unknown> {
  const fields: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    const fieldName = FIELD[key as keyof typeof FIELD];
    if (fieldName === undefined || value === undefined) {
      continue;
    }

    if ((key === 'assignedAt' || key === 'returnedAt') && typeof value === 'string') {
      if (value.length === 0) {
        continue;
      }
      fields[fieldName] = dateToLarkTimestamp(value);
      continue;
    }

    fields[fieldName] = value;
  }
  return fields;
}

function text(fields: BitableRecord['fields'], key: string): string {
  const value = fields[key];
  if (value === undefined || value === null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && (key === FIELD.assignedAt || key === FIELD.returnedAt)) {
    return larkTimestampToDate(value);
  }
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
    throw new LarkIntegrationError('Date must be valid.', 'INVALID_DATE');
  }
  return timestamp;
}

function larkTimestampToDate(value: number): string {
  const timestamp = value < 100000000000 ? value * 1000 : value;
  return new Date(timestamp).toISOString().slice(0, 10);
}

function toAssignment(record: BitableRecord): Assignment {
  const fields = record.fields;
  const rawStatus = text(fields, FIELD.status);
  const returnedAt = text(fields, FIELD.returnedAt);
  const notes = text(fields, FIELD.notes);

  return {
    id: text(fields, FIELD.assignmentId) || record.recordId,
    itemId: text(fields, FIELD.itemId),
    itemName: text(fields, FIELD.itemName),
    employeeId: text(fields, FIELD.employeeId),
    employeeName: text(fields, FIELD.employeeName),
    assignedAt: text(fields, FIELD.assignedAt),
    status: (rawStatus === 'Returned' ? 'Returned' : 'Active') as Assignment['status'],
    ...(returnedAt.length > 0 ? { returnedAt } : {}),
    ...(notes.length > 0 ? { notes } : {}),
  };
}
