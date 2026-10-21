import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client.js';
import type {
  EquipmentRequest,
  EquipmentRequestListResult,
  RequestCategory,
  RequestStatus,
} from '@/types/api.js';

export interface RequestFilters {
  page: number;
  pageSize: number;
  search: string;
  category: RequestCategory | '';
  status: RequestStatus | '';
}

const key = (filters: RequestFilters) => ['requests', filters] as const;

export function useRequests(filters: RequestFilters) {
  const params = new URLSearchParams({
    page: String(filters.page),
    pageSize: String(filters.pageSize),
    search: filters.search,
    ...(filters.category ? { category: filters.category } : {}),
    ...(filters.status ? { status: filters.status } : {}),
  });

  return useQuery({
    queryKey: key(filters),
    queryFn: () => apiClient.get<EquipmentRequestListResult>(`/requests?${params.toString()}`),
  });
}

export type CreateRequestInput = {
  requestedBy: string;
  requestedByName?: string;
  category: RequestCategory;
  description: string;
  purpose?: string;
  projectDepartment?: string;
  duration?: string;
  preferredDevice?: string;
  notes?: string;
};

export type UpdateRequestStatusInput = {
  status: RequestStatus;
  notes?: string;
  remarks?: string;
  assignedItemId?: string;
  assignedDeviceName?: string;
  assignedDate?: string;
  actorId?: string;
  actorRole?: string;
};

export type FulfillRequestInput = {
  brand: string;
  deviceModel: string;
  sampleHwType?: string;
  imei1: string;
  imei2?: string;
  serialNumber?: string;
  vcId?: string;
  color?: string;
  storageRam?: string;
  assignedDate: string;
  warehouseLocation: string;
  inventoryHolder: string;
  remarks?: string;
  assignToRequester?: boolean;
};

export function useRequestMutations() {
  const queryClient = useQueryClient();
  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['requests'] });
    void queryClient.invalidateQueries({ queryKey: ['inventory'] });
    void queryClient.invalidateQueries({ queryKey: ['assignments'] });
    void queryClient.invalidateQueries({ queryKey: ['overview'] });
  };

  const create = useMutation({
    mutationFn: (input: CreateRequestInput) => apiClient.post<EquipmentRequest>('/requests', input),
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<CreateRequestInput> }) =>
      apiClient.patch<EquipmentRequest>(`/requests/${encodeURIComponent(id)}`, input),
    onSuccess: invalidate,
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateRequestStatusInput }) =>
      apiClient.patch<EquipmentRequest>(`/requests/${encodeURIComponent(id)}/status`, input),
    onSuccess: invalidate,
  });

  const fulfill = useMutation({
    mutationFn: ({ id, input }: { id: string; input: FulfillRequestInput }) =>
      apiClient.post<{ request: EquipmentRequest; inventoryItem: any }>(
        `/requests/${encodeURIComponent(id)}/fulfill`,
        input,
      ),
    onSuccess: invalidate,
  });

  return { create, update, updateStatus, fulfill };
}
