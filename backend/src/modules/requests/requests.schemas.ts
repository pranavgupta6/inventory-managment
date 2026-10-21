import { z } from 'zod';

export const REQUEST_STATUSES = ['Pending', 'Approved', 'Rejected', 'Fulfilled'] as const;
export const REQUEST_CATEGORIES = ['Mobile', 'Laptop', 'Tablet', 'Accessory', 'Other'] as const;

export const requestIdSchema = z.object({ id: z.string().trim().min(1).max(100) });

export const requestQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(200).optional().default(''),
  category: z.preprocess((v) => (v === '' ? undefined : v), z.enum(REQUEST_CATEGORIES).optional()),
  status: z.preprocess((v) => (v === '' ? undefined : v), z.enum(REQUEST_STATUSES).optional()),
});

export const createRequestSchema = z.object({
  requestedBy: z.string().trim().min(1, 'Requester email/ID is required').max(100),
  requestedByName: z.string().trim().max(200).optional().default(''),
  category: z.enum(REQUEST_CATEGORIES),
  description: z.string().trim().min(1, 'Description is required').max(2000),
  purpose: z.string().trim().max(2000).optional().default(''),
  projectDepartment: z.string().trim().max(200).optional().default(''),
  duration: z.string().trim().max(100).optional().default(''),
  preferredDevice: z.string().trim().max(200).optional().default(''),
  notes: z.string().trim().max(2000).optional().default(''),
});

export const updateRequestSchema = z
  .object({
    requestedBy: z.string().trim().min(1).max(100).optional(),
    requestedByName: z.string().trim().max(200).optional(),
    category: z.enum(REQUEST_CATEGORIES).optional(),
    description: z.string().trim().min(1).max(2000).optional(),
    purpose: z.string().trim().max(2000).optional(),
    projectDepartment: z.string().trim().max(200).optional(),
    duration: z.string().trim().max(100).optional(),
    preferredDevice: z.string().trim().max(200).optional(),
    status: z.enum(REQUEST_STATUSES).optional(),
    notes: z.string().trim().max(2000).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, 'At least one field must be provided');

export const updateRequestStatusSchema = z.object({
  status: z.enum(REQUEST_STATUSES),
  remarks: z.string().trim().max(2000).optional(),
  notes: z.string().trim().max(2000).optional(),
  assignedItemId: z.string().trim().optional(),
  assignedDeviceName: z.string().trim().optional(),
  assignedDate: z.string().trim().optional(),
  actorId: z.string().trim().optional().default('tl@company.com'),
  actorRole: z.enum(['Admin', 'TL', 'Employee', 'System']).optional().default('TL'),
});

export const fulfillRequestSchema = z.object({
  brand: z.string().trim().min(1, 'Brand is required').max(100),
  deviceModel: z.string().trim().min(1, 'Device Model is required').max(200),
  sampleHwType: z.string().trim().default('PRO'),
  imei1: z.string().trim().regex(/^\d{15}$/, 'IMEI1 must be exactly 15 digits'),
  imei2: z.string().trim().optional().default(''),
  serialNumber: z.string().trim().max(200).optional().default(''),
  vcId: z.string().trim().max(200).optional().default(''),
  color: z.string().trim().max(100).optional().default(''),
  storageRam: z.string().trim().max(100).optional().default(''),
  assignedDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, 'Assigned Date must use YYYY-MM-DD format'),
  warehouseLocation: z.string().trim().min(1, 'Warehouse/Location is required').max(200),
  inventoryHolder: z.string().trim().min(1, 'Inventory Holder is required').max(200),
  remarks: z.string().trim().max(2000).optional().default(''),
  assignToRequester: z.boolean().optional().default(true),
});

export type RequestQuery = z.infer<typeof requestQuerySchema>;
export type CreateRequestInput = z.infer<typeof createRequestSchema>;
export type UpdateRequestInput = z.infer<typeof updateRequestSchema>;
export type UpdateRequestStatusInput = z.infer<typeof updateRequestStatusSchema>;
export type FulfillRequestInput = z.infer<typeof fulfillRequestSchema>;
