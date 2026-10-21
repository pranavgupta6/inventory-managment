import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client.js';
import type { Assignment, AssignmentListResult, AssignmentStatus } from '@/types/api.js';

export interface AssignmentFilters {
  page: number;
  pageSize: number;
  search: string;
  status: AssignmentStatus | '';
}

const key = (filters: AssignmentFilters) => ['assignments', filters] as const;

export function useAssignments(filters: AssignmentFilters) {
  const params = new URLSearchParams({
    page: String(filters.page),
    pageSize: String(filters.pageSize),
    search: filters.search,
    ...(filters.status ? { status: filters.status } : {}),
  });

  return useQuery({
    queryKey: key(filters),
    queryFn: () => apiClient.get<AssignmentListResult>(`/assignments?${params.toString()}`),
  });
}

export type CreateAssignmentInput = {
  itemId: string;
  itemName: string;
  employeeId: string;
  employeeName: string;
  assignedAt: string;
  returnedAt?: string;
  notes?: string;
  status?: AssignmentStatus;
};

export type ReturnAssignmentInput = {
  returnedAt?: string;
  notes?: string;
};

export function useAssignmentMutations() {
  const queryClient = useQueryClient();
  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['assignments'] });
    void queryClient.invalidateQueries({ queryKey: ['overview'] });
  };

  const create = useMutation({
    mutationFn: (input: CreateAssignmentInput) => apiClient.post<Assignment>('/assignments', input),
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<CreateAssignmentInput> }) =>
      apiClient.patch<Assignment>(`/assignments/${encodeURIComponent(id)}`, input),
    onSuccess: invalidate,
  });

  const returnAssignment = useMutation({
    mutationFn: ({ id, input }: { id: string; input: ReturnAssignmentInput }) =>
      apiClient.post<Assignment>(`/assignments/${encodeURIComponent(id)}/return`, input),
    onSuccess: invalidate,
  });

  return { create, update, returnAssignment };
}
