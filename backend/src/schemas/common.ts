import { z } from 'zod';

// ---------------------------------------------------------------------------
// Common query parameter schemas
// ---------------------------------------------------------------------------

export const paginationQuerySchema = z.object({
  pageSize: z
    .string()
    .optional()
    .transform((v) => (v !== undefined ? parseInt(v, 10) : 20))
    .pipe(z.number().int().min(1).max(500)),
  pageToken: z.string().optional(),
});

export const searchQuerySchema = z.object({
  q: z.string().max(500).optional(),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
export type SearchQuery = z.infer<typeof searchQuerySchema>;
