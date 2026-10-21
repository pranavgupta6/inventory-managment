import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { AuditLogEntry, AuditQuery, ReportQuery } from './audit.schemas.js';
import type { InventoryItem, Assignment } from '../../types/index.js';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const AUDIT_FILE = path.join(DATA_DIR, 'audit-logs.json');

export class AuditService {
  private static instance: AuditService | null = null;
  private cache: AuditLogEntry[] = [];

  constructor() {
    this.ensureStorage();
    this.loadCache();
  }

  public static getInstance(): AuditService {
    if (!AuditService.instance) {
      AuditService.instance = new AuditService();
    }
    return AuditService.instance;
  }

  private ensureStorage(): void {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(AUDIT_FILE)) {
      fs.writeFileSync(AUDIT_FILE, JSON.stringify([], null, 2), 'utf-8');
    }
  }

  private loadCache(): void {
    try {
      const data = fs.readFileSync(AUDIT_FILE, 'utf-8');
      this.cache = JSON.parse(data) as AuditLogEntry[];
    } catch {
      this.cache = [];
    }
  }

  private save(): void {
    try {
      fs.writeFileSync(AUDIT_FILE, JSON.stringify(this.cache, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to persist audit log to disk:', err);
    }
  }

  public log(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): AuditLogEntry {
    const fullEntry: AuditLogEntry = {
      ...entry,
      id: randomUUID(),
      timestamp: new Date().toISOString(),
    };
    this.cache.unshift(fullEntry);
    this.save();
    return fullEntry;
  }

  public list(query: AuditQuery): {
    records: AuditLogEntry[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    duplicateCount: number;
    blockedCount: number;
  } {
    const search = query.search.toLowerCase();
    const filtered = this.cache.filter((item) => {
      const detailsStr = typeof item.details === 'string' ? item.details : JSON.stringify(item.details);
      const searchable = [
        item.actorId,
        item.actorName || '',
        item.action,
        item.entityType,
        item.entityId,
        detailsStr,
      ]
        .join(' ')
        .toLowerCase();

      const matchesSearch = search.length === 0 || searchable.includes(search);
      const matchesAction = !query.action || item.action === query.action;
      const matchesRole = !query.actorRole || item.actorRole === query.actorRole;
      const matchesStatus = !query.status || item.status === query.status;

      let matchesDate = true;
      if (query.startDate) {
        matchesDate = matchesDate && item.timestamp >= query.startDate;
      }
      if (query.endDate) {
        matchesDate = matchesDate && item.timestamp <= query.endDate;
      }

      return matchesSearch && matchesAction && matchesRole && matchesStatus && matchesDate;
    });

    const start = (query.page - 1) * query.pageSize;
    const records = filtered.slice(start, start + query.pageSize);

    return {
      records,
      total: filtered.length,
      page: query.page,
      pageSize: query.pageSize,
      totalPages: Math.max(1, Math.ceil(filtered.length / query.pageSize)),
      duplicateCount: this.cache.filter((e) => e.action === 'DUPLICATE_BLOCKED').length,
      blockedCount: this.cache.filter((e) => e.status === 'BLOCKED').length,
    };
  }

  public getDuplicateAlerts(): AuditLogEntry[] {
    return this.cache
      .filter((e) => e.action === 'DUPLICATE_BLOCKED' || e.status === 'BLOCKED')
      .slice(0, 50);
  }

  public getAnomalies(
    inventoryItems: InventoryItem[],
    assignments: Assignment[],
  ): {
    duplicatesBlocked: number;
    overdueAssignments: Assignment[];
    missingImeis: InventoryItem[];
    inactiveOrDamaged: InventoryItem[];
  } {
    const now = Date.now();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

    const overdueAssignments = assignments.filter((a) => {
      if (a.status !== 'Active') return false;
      const assignedTime = Date.parse(a.assignedAt);
      if (Number.isNaN(assignedTime)) return false;
      return now - assignedTime > thirtyDaysMs;
    });

    const missingImeis = inventoryItems.filter(
      (item) => !item.imei1 || item.imei1.trim().length === 0,
    );

    const inactiveOrDamaged = inventoryItems.filter(
      (item) =>
        item.status === 'Inactive' ||
        (item.remarks && /damage|broken|scrap|lost/i.test(item.remarks)),
    );

    return {
      duplicatesBlocked: this.cache.filter((e) => e.action === 'DUPLICATE_BLOCKED').length,
      overdueAssignments,
      missingImeis,
      inactiveOrDamaged,
    };
  }

  public generateReport(
    query: ReportQuery,
    inventoryItems: InventoryItem[],
    assignments: Assignment[],
  ): { filename: string; csv: string; data: unknown } {
    const timeframeDays = getTimeframeDays(query.timeframe);
    const cutoffDate = timeframeDays > 0 ? new Date(Date.now() - timeframeDays * 24 * 60 * 60 * 1000).toISOString() : null;

    let headers: string[] = [];
    let rows: (string | number)[][] = [];
    let title: string = query.type;

    switch (query.type) {
      case 'overall_inventory': {
        title = 'Overall_Inventory_Report';
        headers = ['Item ID', 'Brand', 'Device Model', 'Sample HW Type', 'IMEI1', 'IMEI2', 'Serial No', 'Color', 'Storage/RAM', 'Assigned Date', 'Warehouse/Location', 'Holder', 'Status'];
        rows = inventoryItems.map((i) => [
          i.itemId,
          i.brand,
          i.deviceModel,
          i.sampleHwType,
          i.imei1,
          i.imei2 || '-',
          i.serialNumber || '-',
          i.color || '-',
          i.storageRam || '-',
          i.assignedDate,
          i.warehouseLocation,
          i.inventoryHolder,
          i.status,
        ]);
        break;
      }
      case 'reconciliation': {
        title = 'Inventory_Reconciliation_Report';
        const activeAssignedCount = assignments.filter((a) => a.status === 'Active').length;
        const returnedCount = assignments.filter((a) => a.status === 'Returned').length;
        const totalInventory = inventoryItems.length;
        const availableInStock = Math.max(0, totalInventory - activeAssignedCount);

        headers = ['Metric', 'Count', 'Description'];
        rows = [
          ['Total Devices in Catalog', totalInventory, 'Total inventory tracked in master bitable'],
          ['Currently Assigned', activeAssignedCount, 'Devices currently held by employees'],
          ['Available in Stock', availableInStock, 'Devices unassigned and ready for allocation'],
          ['Total Historical Returns', returnedCount, 'Completed assignment returns logged'],
          ['Active Inventory Status', inventoryItems.filter((i) => i.status === 'Active').length, 'Devices with Active operational flag'],
          ['Inactive / Scrapped', inventoryItems.filter((i) => i.status === 'Inactive').length, 'Devices deactivated or decommissioned'],
        ];
        break;
      }
      case 'overdue_returns': {
        title = 'Overdue_Device_Returns_Report';
        headers = ['Assignment ID', 'Item Name', 'IMEI / ID', 'Employee Name', 'Employee Email/ID', 'Assigned Date', 'Days Out', 'Status'];
        const now = Date.now();
        rows = assignments
          .filter((a) => a.status === 'Active')
          .map((a) => {
            const time = Date.parse(a.assignedAt);
            const daysOut = Number.isNaN(time) ? 0 : Math.floor((now - time) / (24 * 60 * 60 * 1000));
            return { a, daysOut };
          })
          .filter((item) => item.daysOut >= (query.timeframe === 'weekly' ? 7 : query.timeframe === 'monthly' ? 30 : 14))
          .map(({ a, daysOut }) => [
            a.id,
            a.itemName,
            a.itemId,
            a.employeeName,
            a.employeeId,
            a.assignedAt,
            daysOut,
            a.status,
          ]);
        break;
      }
      case 'duplicate_logs': {
        title = 'Duplicate_Attempts_and_Audit_Report';
        headers = ['Timestamp', 'Actor ID', 'Actor Role', 'Action', 'Entity Type', 'Status', 'Details'];
        const logs = cutoffDate ? this.cache.filter((e) => e.timestamp >= cutoffDate) : this.cache;
        rows = logs
          .filter((e) => e.action === 'DUPLICATE_BLOCKED' || e.status === 'BLOCKED' || e.status === 'FLAGGED')
          .map((e) => [
            e.timestamp,
            e.actorId,
            e.actorRole,
            e.action,
            e.entityType,
            e.status,
            typeof e.details === 'string' ? e.details : JSON.stringify(e.details),
          ]);
        break;
      }
      case 'exceptions': {
        title = 'Inventory_Exceptions_Report';
        headers = ['Item ID', 'Brand', 'Model', 'IMEI1', 'Status', 'Remarks', 'Exception Type'];
        rows = inventoryItems
          .filter((i) => i.status === 'Inactive' || !i.imei1 || (i.remarks && /damage|broken|scrap|lost/i.test(i.remarks)))
          .map((i) => {
            let reason = 'Flagged Inactive';
            if (!i.imei1) reason = 'Missing IMEI';
            else if (i.remarks && /damage|broken/i.test(i.remarks)) reason = 'Damaged Hardware';
            else if (i.remarks && /lost/i.test(i.remarks)) reason = 'Lost Device';
            return [
              i.itemId,
              i.brand,
              i.deviceModel,
              i.imei1 || '[MISSING]',
              i.status,
              i.remarks || '-',
              reason,
            ];
          });
        break;
      }
    }

    const csv = toCsv(headers, rows);
    const filename = `${title}_${query.timeframe}_${new Date().toISOString().slice(0, 10)}.csv`;
    return {
      filename,
      csv,
      data: { headers, rows, count: rows.length, timeframe: query.timeframe },
    };
  }
}

function getTimeframeDays(timeframe: string): number {
  switch (timeframe) {
    case 'daily':
      return 1;
    case 'weekly':
      return 7;
    case 'monthly':
      return 30;
    case 'quarterly':
      return 90;
    default:
      return 0;
  }
}

function toCsv(headers: string[], rows: (string | number)[][]): string {
  const escapeCell = (cell: string | number) => {
    const str = String(cell ?? '').replace(/"/g, '""');
    return /[",\n\r]/.test(str) ? `"${str}"` : str;
  };
  const headerLine = headers.map(escapeCell).join(',');
  const rowLines = rows.map((r) => r.map(escapeCell).join(','));
  return [headerLine, ...rowLines].join('\r\n');
}

export const auditService = AuditService.getInstance();
