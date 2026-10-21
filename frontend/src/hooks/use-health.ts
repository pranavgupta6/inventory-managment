import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client.js';
import type { HealthResponse, IntegrationStatus } from '@/types/api.js';

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const healthQueryKeys = {
  all: ['health'] as const,
  status: ['integration-status'] as const,
};

// ---------------------------------------------------------------------------
// Health check hook
// ---------------------------------------------------------------------------

export function useHealth() {
  return useQuery({
    queryKey: healthQueryKeys.all,
    queryFn: () => apiClient.get<HealthResponse>('/health'),
    staleTime: 60_000,
    retry: 2,
  });
}

// ---------------------------------------------------------------------------
// Integration status hook
// ---------------------------------------------------------------------------

export function useIntegrationStatus() {
  return useQuery({
    queryKey: healthQueryKeys.status,
    queryFn: () => apiClient.get<IntegrationStatus>('/integration-status'),
    staleTime: 30_000,
    retry: 1,
  });
}
