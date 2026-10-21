import { randomUUID } from 'node:crypto';
import { ConflictError, LarkIntegrationError, NotFoundError } from '../../middleware/index.js';
import type { IBitableRepository } from '../../repositories/bitable/bitable.interface.js';
import type { BitableRecord, EquipmentRequest, EquipmentRequestListResult } from '../../types/index.js';
import { env } from '../../config/env.js';
import {
  notifyRequestStatusChanged,
  notifyRequestSubmitted,
} from '../../services/email/notification.service.js';
import { InventoryService } from '../inventory/inventory.service.js';
import { AssignmentsService } from '../assignments/assignments.service.js';
import { auditService } from '../audit/audit.service.js';
import type {
  CreateRequestInput,
  FulfillRequestInput,
  RequestQuery,
  UpdateRequestInput,
  UpdateRequestStatusInput,
} from './requests.schemas.js';

const FIELD = {
  requestId: 'request_id',
  requestedBy: 'Requested By',
  requestedByName: 'Requested By Name',
  category: 'Category',
  description: 'Description',
  status: 'Status',
  createdAt: 'Created At',
  updatedAt: 'Updated At',
  notes: 'Notes',
} as const;

export class EquipmentRequestsService {
  constructor(private readonly repository: IBitableRepository) {}

  async list(query: RequestQuery): Promise<EquipmentRequestListResult> {
    const records = await this.readAll();
    const items = records.map(toEquipmentRequest);
    const search = (query.search || '').toLowerCase();

    const filtered = items.filter((item) => {
      const searchable = [
        item.requestedBy,
        item.requestedByName || '',
        item.category,
        item.description,
        item.notes || '',
      ]
        .join(' ')
        .toLowerCase();

      return (
        (search.length === 0 || searchable.includes(search)) &&
        (query.category === undefined || item.category === query.category) &&
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
      pendingCount: items.filter((item) => item.status === 'Pending').length,
      approvedCount: items.filter((item) => item.status === 'Approved').length,
      rejectedCount: items.filter((item) => item.status === 'Rejected').length,
      fulfilledCount: items.filter((item) => item.status === 'Fulfilled').length,
    };
  }

  async get(id: string): Promise<EquipmentRequest> {
    return (await this.resolveItem(id)).item;
  }

  async create(input: CreateRequestInput): Promise<EquipmentRequest> {
    const now = Date.now();
    const id = randomUUID();

    // Construct enriched description with Purpose, Project/Department, Duration, Preferred Device
    const parts: string[] = [];
    if (input.purpose) parts.push(`Purpose: ${input.purpose}`);
    if (input.projectDepartment) parts.push(`Dept/Project: ${input.projectDepartment}`);
    if (input.duration) parts.push(`Duration: ${input.duration}`);
    if (input.preferredDevice) parts.push(`Preferred: ${input.preferredDevice}`);
    if (input.description) parts.push(input.description);

    const fullDescription = parts.join(' | ') || input.description;

    const record = await this.repository.createRecord(this.tableId(), {
      [FIELD.requestId]: id,
      [FIELD.requestedBy]: input.requestedBy,
      [FIELD.requestedByName]: input.requestedByName || '',
      [FIELD.category]: input.category,
      [FIELD.description]: fullDescription,
      [FIELD.status]: 'Pending',
      [FIELD.createdAt]: now,
      [FIELD.updatedAt]: now,
      [FIELD.notes]: input.notes || '',
    });
    const created = toEquipmentRequest(record);

    auditService.log({
      actorId: input.requestedBy,
      actorName: input.requestedByName || input.requestedBy,
      actorRole: 'Employee',
      action: 'REQUEST_SUBMITTED',
      entityType: 'Request',
      entityId: id,
      details: {
        category: input.category,
        purpose: input.purpose,
        projectDepartment: input.projectDepartment,
        duration: input.duration,
        preferredDevice: input.preferredDevice,
      },
      status: 'SUCCESS',
    });

    // Send email notification to requester
    void notifyRequestSubmitted({
      to: input.requestedBy,
      requesterName: input.requestedByName || input.requestedBy,
      requestId: id,
      category: input.category,
      description: fullDescription,
    });

    return created;
  }

  async update(id: string, input: UpdateRequestInput): Promise<EquipmentRequest> {
    const { record } = await this.resolveItem(id);
    const patch: Record<string, unknown> = {
      [FIELD.updatedAt]: Date.now(),
    };

    if (input.requestedBy !== undefined) patch[FIELD.requestedBy] = input.requestedBy;
    if (input.requestedByName !== undefined) patch[FIELD.requestedByName] = input.requestedByName;
    if (input.category !== undefined) patch[FIELD.category] = input.category;
    if (input.description !== undefined) patch[FIELD.description] = input.description;
    if (input.status !== undefined) patch[FIELD.status] = input.status;
    if (input.notes !== undefined) patch[FIELD.notes] = input.notes;

    const updated = await this.repository.updateRecord(this.tableId(), record.recordId, patch);
    return toEquipmentRequest(updated);
  }

  async updateStatus(id: string, input: UpdateRequestStatusInput): Promise<EquipmentRequest> {
    const { record } = await this.resolveItem(id);
    const reqObj = toEquipmentRequest(record);
    const assignmentsService = new AssignmentsService(this.repository);
    const inventoryService = new InventoryService(this.repository);

    let assignedDeviceIdentifier = input.assignedDeviceName || reqObj.category;

    // Duplicate Checkpoint: If assigning a device upon approval, check that device is not already actively assigned!
    if (input.status === 'Approved' && input.assignedItemId) {
      const activeAssignments = await assignmentsService.list({ page: 1, pageSize: 1000, search: '', status: 'Active' });
      const alreadyAssigned = activeAssignments.records.find(
        (a) => a.itemId.toLowerCase() === input.assignedItemId!.toLowerCase(),
      );

      if (alreadyAssigned) {
        auditService.log({
          actorId: input.actorId || 'tl@company.com',
          actorRole: input.actorRole || 'TL',
          action: 'DUPLICATE_BLOCKED',
          entityType: 'Request',
          entityId: id,
          details: {
            reason: `Device '${input.assignedItemId}' is currently assigned to ${alreadyAssigned.employeeName} (${alreadyAssigned.employeeId}). Cannot reassign until marked Returned.`,
            attemptedItem: input.assignedItemId,
          },
          status: 'BLOCKED',
        });

        throw new ConflictError(
          `Duplicate Checkpoint Blocked: Device '${input.assignedItemId}' is already assigned to ${alreadyAssigned.employeeName}. Assigned devices cannot be reassigned until marked as Returned.`,
        );
      }

      // Safe to assign -> Auto-create assignment record
      const assignedDate = input.assignedDate || new Date().toISOString().slice(0, 10);
      try {
        await assignmentsService.create({
          itemId: input.assignedItemId,
          itemName: input.assignedDeviceName || `Allocated Device (${input.assignedItemId})`,
          employeeId: reqObj.requestedBy,
          employeeName: reqObj.requestedByName || reqObj.requestedBy,
          assignedAt: assignedDate,
          returnedAt: '',
          notes: `Assigned via approved request #${id.slice(0, 8)}`,
          status: 'Active',
        });
        assignedDeviceIdentifier = `${input.assignedDeviceName || 'Device'} (IMEI/ID: ${input.assignedItemId})`;
      } catch (err) {
        console.warn('Could not auto-create assignment record upon approval:', err);
      }
    }

    const patchNotes = [
      reqObj.notes || '',
      input.notes || '',
      input.remarks ? `Remarks: ${input.remarks}` : '',
      input.assignedItemId ? `Assigned Item: ${input.assignedItemId}` : '',
    ]
      .filter(Boolean)
      .join(' | ');

    const patch: Record<string, unknown> = {
      [FIELD.status]: input.status,
      [FIELD.updatedAt]: Date.now(),
      [FIELD.notes]: patchNotes,
    };

    const updated = await this.repository.updateRecord(this.tableId(), record.recordId, patch);
    const updatedReq = toEquipmentRequest(updated);

    // Audit Logging
    auditService.log({
      actorId: input.actorId || 'tl@company.com',
      actorRole: input.actorRole || 'TL',
      action: input.status === 'Approved' ? 'REQUEST_APPROVED' : input.status === 'Rejected' ? 'REQUEST_REJECTED' : 'INVENTORY_UPDATED',
      entityType: 'Request',
      entityId: id,
      details: {
        status: input.status,
        remarks: input.remarks,
        assignedDevice: assignedDeviceIdentifier,
      },
      status: 'SUCCESS',
    });

    // Notify requester with specific acknowledgment copy per requirement
    void notifyRequestStatusChanged({
      to: reqObj.requestedBy,
      requesterName: reqObj.requestedByName || reqObj.requestedBy,
      category: reqObj.category,
      status: input.status,
      deviceDetails: assignedDeviceIdentifier,
      ...(input.notes ? { notes: input.notes } : {}),
      ...(input.remarks ? { remarks: input.remarks } : {}),
    });

    return updatedReq;
  }

  async fulfill(id: string, input: FulfillRequestInput): Promise<{ request: EquipmentRequest; inventoryItem: any }> {
    const { record } = await this.resolveItem(id);
    const reqObj = toEquipmentRequest(record);

    // 1. Add device to Inventory
    const inventoryService = new InventoryService(this.repository);
    const inventoryItem = await inventoryService.create({
      brand: input.brand as any,
      deviceModel: input.deviceModel,
      sampleHwType: input.sampleHwType as any,
      imei1: input.imei1,
      imei2: input.imei2,
      serialNumber: input.serialNumber,
      vcId: input.vcId,
      color: input.color,
      storageRam: input.storageRam,
      assignedDate: input.assignedDate,
      warehouseLocation: input.warehouseLocation,
      inventoryHolder: reqObj.requestedByName || reqObj.requestedBy,
      remarks: input.remarks,
      status: 'Active',
      sampleReceivedDate: '',
      dateOfReceipt: '',
      employeeId: reqObj.requestedBy,
      assignedTo: reqObj.requestedByName || reqObj.requestedBy,
    });

    // 2. Mark request as Fulfilled
    const patch: Record<string, unknown> = {
      [FIELD.status]: 'Fulfilled',
      [FIELD.updatedAt]: Date.now(),
      [FIELD.notes]: `${reqObj.notes ? reqObj.notes + ' | ' : ''}Fulfilled with device ${input.deviceModel} (IMEI: ${input.imei1})`,
    };
    const updated = await this.repository.updateRecord(this.tableId(), record.recordId, patch);
    const updatedReq = toEquipmentRequest(updated);

    // 3. If assignToRequester is requested, create an Assignment record as well
    if (input.assignToRequester) {
      try {
        const assignmentsService = new AssignmentsService(this.repository);
        await assignmentsService.create({
          itemId: input.imei1,
          itemName: `${input.brand} ${input.deviceModel}`,
          employeeId: reqObj.requestedBy,
          employeeName: reqObj.requestedByName || reqObj.requestedBy,
          assignedAt: input.assignedDate,
          returnedAt: '',
          notes: `Assigned via request fulfillment #${id.slice(0, 8)}`,
          status: 'Active',
        });
      } catch (err) {
        console.warn('Could not auto-create assignment record upon fulfillment:', err);
      }
    }

    auditService.log({
      actorId: 'admin@inventory.internal',
      actorRole: 'Admin',
      action: 'REQUEST_FULFILLED',
      entityType: 'Request',
      entityId: id,
      details: {
        device: `${input.brand} ${input.deviceModel} (IMEI: ${input.imei1})`,
        assignedTo: reqObj.requestedBy,
      },
      status: 'SUCCESS',
    });

    // 4. Send email notification
    void notifyRequestStatusChanged({
      to: reqObj.requestedBy,
      requesterName: reqObj.requestedByName || reqObj.requestedBy,
      category: reqObj.category,
      status: 'Fulfilled',
      deviceDetails: `${input.brand} ${input.deviceModel} (IMEI: ${input.imei1})`,
      notes: `Your requested device ${input.brand} ${input.deviceModel} (IMEI: ${input.imei1}) has been registered and provisioned.`,
    });

    return { request: updatedReq, inventoryItem };
  }

  async delete(id: string, actorId = 'system'): Promise<never> {
    auditService.log({
      actorId,
      actorRole: 'Admin',
      action: 'DELETION_BLOCKED',
      entityType: 'Request',
      entityId: id,
      details: 'Attempted delete on equipment request. Prohibited by policy.',
      status: 'BLOCKED',
    });
    throw new ConflictError(
      'Deletion is strictly prohibited by policy. No deletion rights for any equipment request. Status can only be rejected or updated.',
    );
  }

  private tableId(): string {
    if (!env.LARK_TABLE_REQUESTS || env.LARK_TABLE_REQUESTS.length === 0) {
      throw new LarkIntegrationError('LARK_TABLE_REQUESTS is not configured.', 'REQUESTS_TABLE_NOT_CONFIGURED');
    }
    return env.LARK_TABLE_REQUESTS;
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

  private async resolveItem(id: string): Promise<{ record: BitableRecord; item: EquipmentRequest }> {
    const tableId = this.tableId();
    const byId = await this.repository.findRecordByField(tableId, FIELD.requestId, id);
    const record = byId ?? (await this.repository.getRecord(tableId, id));
    if (record === null) throw new NotFoundError('Equipment Request');
    return { record, item: toEquipmentRequest(record) };
  }
}

function text(fields: BitableRecord['fields'], key: string): string {
  const value = fields[key];
  if (value === undefined || value === null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && (key === FIELD.createdAt || key === FIELD.updatedAt)) {
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

function larkTimestampToDate(value: number): string {
  const timestamp = value < 100000000000 ? value * 1000 : value;
  return new Date(timestamp).toISOString().slice(0, 10);
}

function toEquipmentRequest(record: BitableRecord): EquipmentRequest {
  const fields = record.fields;
  const rawCategory = text(fields, FIELD.category);
  const rawStatus = text(fields, FIELD.status);
  const requestedByName = text(fields, FIELD.requestedByName);
  const notes = text(fields, FIELD.notes);

  return {
    id: text(fields, FIELD.requestId) || record.recordId,
    requestedBy: text(fields, FIELD.requestedBy),
    category: (['Mobile', 'Laptop', 'Tablet', 'Accessory', 'Other'].includes(rawCategory)
      ? rawCategory
      : 'Other') as EquipmentRequest['category'],
    description: text(fields, FIELD.description),
    status: (['Pending', 'Approved', 'Rejected', 'Fulfilled'].includes(rawStatus)
      ? rawStatus
      : 'Pending') as EquipmentRequest['status'],
    createdAt: text(fields, FIELD.createdAt),
    updatedAt: text(fields, FIELD.updatedAt),
    ...(requestedByName.length > 0 ? { requestedByName } : {}),
    ...(notes.length > 0 ? { notes } : {}),
  };
}
