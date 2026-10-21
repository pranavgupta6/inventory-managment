import { z } from 'zod';

export const auditActionSchema = z.enum([
  'INVENTORY_CREATED',
  'INVENTORY_BULK_UPLOAD',
  'INVENTORY_UPDATED',
  'INVENTORY_DEACTIVATED',
  'REQUEST_SUBMITTED',
  'REQUEST_APPROVED',
  'REQUEST_REJECTED',
  'REQUEST_FULFILLED',
  'DEVICE_ASSIGNED',
  'DEVICE_RETURNED',
  'DEVICE_REALLOCATED',
  'DUPLICATE_BLOCKED',
  'ANOMALY_DETECTED',
  'DELETION_BLOCKED',
]);

export const actorRoleSchema = z.enum(['Admin', 'TL', 'Employee', 'System']);

export const auditLogSchema = z.object({
  id: z.string(),
  timestamp: z.string(),
  actorId: z.string(),
  actorName: z.string().optional(),
  actorRole: actorRoleSchema,
  action: auditActionSchema,
  entityType: z.enum(['Inventory', 'Request', 'Assignment', 'BulkUpload', 'Security']),
  entityId: z.string(),
  details: z.record(z.unknown()).or(z.string()),
  status: z.enum(['SUCCESS', 'BLOCKED', 'FLAGGED']),
});

export type AuditLogEntry = z.infer<typeof auditLogSchema>;

export const auditQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().default(''),
  action: auditActionSchema.optional(),
  actorRole: actorRoleSchema.optional(),
  status: z.enum(['SUCCESS', 'BLOCKED', 'FLAGGED']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export type AuditQuery = z.infer<typeof auditQuerySchema>;

export const reportQuerySchema = z.object({
  type: z.enum([
    'overall_inventory',
    'reconciliation',
    'overdue_returns',
    'duplicate_logs',
    'exceptions',
  ]),
  timeframe: z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'all']).default('all'),
  format: z.enum(['json', 'csv']).default('json'),
});

export type ReportQuery = z.infer<typeof reportQuerySchema>;
