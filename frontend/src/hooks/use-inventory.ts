import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client.js';
import type { InventoryItem, InventoryListResult, InventoryStatus } from '@/types/api.js';

export interface InventoryFilters {
  page: number;
  pageSize: number;
  search: string;
  brand: string;
  status: InventoryStatus | '';
}

const key = (filters: InventoryFilters) => ['inventory', filters] as const;

export function useInventory(filters: InventoryFilters) {
  const params = new URLSearchParams({
    page: String(filters.page),
    pageSize: String(filters.pageSize),
    search: filters.search,
    brand: filters.brand,
    ...(filters.status ? { status: filters.status } : {}),
  });
  return useQuery({
    queryKey: key(filters),
    queryFn: () => apiClient.get<InventoryListResult>(`/inventory?${params.toString()}`),
  });
}

export type InventoryInput = Omit<InventoryItem, 'itemId'>;

export function useInventoryMutations() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['inventory'] });
  const create = useMutation({
    mutationFn: (input: InventoryInput) => apiClient.post<InventoryItem>('/inventory', input),
    onSuccess: invalidate,
  });
  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<InventoryInput> }) =>
      apiClient.patch<InventoryItem>(`/inventory/${encodeURIComponent(id)}`, input),
    onSuccess: invalidate,
  });
  const deactivate = useMutation({
    mutationFn: (id: string) => apiClient.post<InventoryItem>(`/inventory/${encodeURIComponent(id)}/deactivate`, {}),
    onSuccess: invalidate,
  });
  const bulkUpload = useMutation({
    mutationFn: (data: { items: any[]; actorId?: string; actorRole?: string }) =>
      apiClient.post<import('@/types/api.js').BulkUploadResult>('/inventory/bulk-upload', data),
    onSuccess: () => {
      invalidate();
      void queryClient.invalidateQueries({ queryKey: ['assignments'] });
      void queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
      void queryClient.invalidateQueries({ queryKey: ['audit-duplicates'] });
    },
  });
  return { create, update, deactivate, bulkUpload };
}
