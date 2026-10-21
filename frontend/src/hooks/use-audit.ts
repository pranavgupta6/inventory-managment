import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client.js';
import type {
  AuditListResult,
  AuditLogEntry,
  AnomalyReport,
  ReportType,
  ReportTimeframe,
} from '@/types/api.js';

export interface AuditFilters {
  page: number;
  pageSize: number;
  search: string;
  action?: string;
  status?: string;
  actorRole?: string;
  startDate?: string;
  endDate?: string;
}

export function useAuditLogs(filters: AuditFilters) {
  const params = new URLSearchParams({
    page: String(filters.page),
    pageSize: String(filters.pageSize),
    search: filters.search,
    ...(filters.action ? { action: filters.action } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.actorRole ? { actorRole: filters.actorRole } : {}),
    ...(filters.startDate ? { startDate: filters.startDate } : {}),
    ...(filters.endDate ? { endDate: filters.endDate } : {}),
  });

  return useQuery({
    queryKey: ['audit-logs', filters],
    queryFn: () => apiClient.get<AuditListResult>(`/audit/logs?${params.toString()}`),
  });
}

export function useDuplicateAlerts() {
  return useQuery({
    queryKey: ['audit-duplicates'],
    queryFn: () => apiClient.get<AuditLogEntry[]>('/audit/duplicates'),
    refetchInterval: 15000,
  });
}

export function useAnomalies() {
  return useQuery({
    queryKey: ['audit-anomalies'],
    queryFn: () => apiClient.get<AnomalyReport>('/audit/anomalies'),
    refetchInterval: 20000,
  });
}

export function useDownloadReport() {
  return {
    downloadReportUrl: (type: ReportType, timeframe: ReportTimeframe) =>
      `/api/audit/reports?type=${type}&timeframe=${timeframe}&format=csv`,
    downloadAssignmentsUrl: () => `/api/assignments/export?format=csv`,
  };
}

export function useAuditMutations() {
  const queryClient = useQueryClient();
  const logAction = useMutation({
    mutationFn: (entry: Partial<AuditLogEntry>) => apiClient.post<AuditLogEntry>('/audit/log', entry),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
      void queryClient.invalidateQueries({ queryKey: ['audit-duplicates'] });
    },
  });

  return { logAction };
}
