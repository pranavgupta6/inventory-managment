import { z } from 'zod';

export const BRANDS = ['Itel', 'Tecno', 'Infinix', 'Oraimo', 'Villaon', 'Other'] as const;
export const SAMPLE_HW_TYPES = ['PRO', 'PRO-1', 'PR1', 'PR1-1', 'PR2', 'PIR', 'MPR'] as const;

const optionalText = (max: number): z.ZodType<string, z.ZodTypeDef, string | undefined> =>
  z.string().trim().max(max).optional().default('');

const date = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Assigned Date must use YYYY-MM-DD format')
  .refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00Z`)), 'Assigned Date must be a valid date');

const imei = z.string().trim().regex(/^\d{15}$/, 'IMEI must contain exactly 15 digits');
const optionalImei = z
  .string()
  .trim()
  .refine((value) => value === '' || /^\d{15}$/.test(value), 'IMEI2 must be empty or contain exactly 15 digits')
  .optional()
  .default('');

const optionalQueryEnum = <T extends readonly [string, ...string[]]>(values: T) =>
  z.preprocess((value) => (value === '' ? undefined : value), z.enum(values).optional());

export const inventoryIdSchema = z.object({ id: z.string().trim().min(1).max(100) });

export const inventoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(200).optional().default(''),
  brand: optionalQueryEnum(BRANDS),
  status: optionalQueryEnum(['Active', 'Inactive'] as const),
});

const deviceFields = {
  brand: z.enum(BRANDS),
  deviceModel: z.string().trim().min(1, 'Device Model is required').max(200),
  sampleHwType: z.enum(SAMPLE_HW_TYPES),
  imei1: imei,
  imei2: optionalImei,
  serialNumber: optionalText(200),
  vcId: optionalText(200),
  color: optionalText(100),
  storageRam: optionalText(100),
  assignedDate: date,
  warehouseLocation: z.string().trim().min(1, 'Warehouse / Location is required').max(200),
  inventoryHolder: z.string().trim().min(1, 'Inventory Holder is required').max(200),
  remarks: optionalText(2000),
  status: z.enum(['Active', 'Inactive']).default('Active'),
  sampleReceivedDate: optionalText(50),
  dateOfReceipt: optionalText(50),
  employeeId: optionalText(100),
  assignedTo: optionalText(200),
};

export const createInventorySchema = z.object(deviceFields);
export const updateInventorySchema = z
  .object(deviceFields)
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'At least one field must be provided');

export const bulkUploadItemSchema = z.object({
  brand: z.string().trim().min(1, 'Brand is required'),
  deviceModel: z.string().trim().min(1, 'Device Model is required'),
  sampleHwType: z.string().trim().default('PRO'),
  sampleReceivedDate: z.string().trim().optional().default(''),
  vcId: z.string().trim().optional().default(''),
  imei1: z.string().trim().min(1, 'IMEI1 is required'),
  imei2: z.string().trim().optional().default(''),
  serialNumber: z.string().trim().optional().default(''),
  color: z.string().trim().optional().default(''),
  storageRam: z.string().trim().optional().default(''),
  dateOfReceipt: z.string().trim().optional().default(''),
  warehouseLocation: z.string().trim().optional().default('Main Warehouse'),
  assignedTo: z.string().trim().optional().default(''),
  inventoryHolder: z.string().trim().optional().default(''),
  employeeId: z.string().trim().optional().default(''),
  assignedDate: z.string().trim().optional().default(''),
  remarks: z.string().trim().optional().default(''),
  status: z.enum(['Active', 'Inactive']).optional().default('Active'),
});

export const bulkUploadSchema = z.object({
  items: z.array(bulkUploadItemSchema).min(1, 'At least one item is required for bulk upload'),
  actorId: z.string().optional().default('admin@inventory.internal'),
  actorRole: z.enum(['Admin', 'TL', 'Employee', 'System']).optional().default('Admin'),
});

export type InventoryQuery = z.infer<typeof inventoryQuerySchema>;
export type CreateInventoryInput = z.infer<typeof createInventorySchema>;
export type UpdateInventoryInput = z.infer<typeof updateInventorySchema>;
export type BulkUploadItem = z.infer<typeof bulkUploadItemSchema>;
export type BulkUploadInput = z.infer<typeof bulkUploadSchema>;

