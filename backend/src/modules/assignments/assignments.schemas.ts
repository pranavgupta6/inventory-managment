import { z } from 'zod';

export const ASSIGNMENT_STATUSES = ['Active', 'Returned'] as const;

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
const dateString = z
  .string()
  .trim()
  .regex(dateRegex, 'Date must use YYYY-MM-DD format')
  .refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00Z`)), 'Date must be valid');

const optionalDateString = z
  .string()
  .trim()
  .refine((val) => val === '' || (dateRegex.test(val) && !Number.isNaN(Date.parse(`${val}T00:00:00Z`))), 'Date must use YYYY-MM-DD format')
  .optional()
  .default('');

export const assignmentIdSchema = z.object({ id: z.string().trim().min(1).max(100) });

export const assignmentQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(200).optional().default(''),
  status: z.preprocess((v) => (v === '' ? undefined : v), z.enum(ASSIGNMENT_STATUSES).optional()),
});

export const createAssignmentSchema = z.object({
  itemId: z.string().trim().min(1, 'Item ID is required').max(100),
  itemName: z.string().trim().min(1, 'Item Name is required').max(200),
  employeeId: z.string().trim().min(1, 'Employee ID is required').max(100),
  employeeName: z.string().trim().min(1, 'Employee Name is required').max(200),
  assignedAt: dateString,
  returnedAt: optionalDateString,
  notes: z.string().trim().max(2000).optional().default(''),
  status: z.enum(ASSIGNMENT_STATUSES).default('Active'),
});

export const updateAssignmentSchema = z
  .object({
    itemId: z.string().trim().min(1).max(100).optional(),
    itemName: z.string().trim().min(1).max(200).optional(),
    employeeId: z.string().trim().min(1).max(100).optional(),
    employeeName: z.string().trim().min(1).max(200).optional(),
    assignedAt: dateString.optional(),
    returnedAt: optionalDateString,
    notes: z.string().trim().max(2000).optional(),
    status: z.enum(ASSIGNMENT_STATUSES).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, 'At least one field must be provided');

export const returnAssignmentSchema = z.object({
  returnedAt: optionalDateString,
  notes: z.string().trim().max(2000).optional(),
});

export type AssignmentQuery = z.infer<typeof assignmentQuerySchema>;
export type CreateAssignmentInput = z.infer<typeof createAssignmentSchema>;
export type UpdateAssignmentInput = z.infer<typeof updateAssignmentSchema>;
export type ReturnAssignmentInput = z.infer<typeof returnAssignmentSchema>;
