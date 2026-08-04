"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiClient } from "@/lib/api/client";
import {
  CreateDataSourceRequest,
  DataSourceListResponse,
  DataSourceResponse,
  UpdateDataSourceRequest,
} from "@/lib/types";

export function useFetchDataSources(sessionId?: string) {
  const { auth } = useAuth();
  const orgId = auth?.organizationId;

  return useQuery({
    queryKey: ["data-sources", sessionId],
    queryFn: async () => {
      if (!orgId || !sessionId) throw new Error("Thiáº¿u Organization/Session ID");
      return apiClient.get<DataSourceListResponse>(
        `/analysis-sessions/${sessionId}/data-sources`,
      );
    },
    enabled: !!orgId && !!sessionId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateDataSource(sessionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateDataSourceRequest) =>
      apiClient.post<DataSourceResponse>(
        `/analysis-sessions/${sessionId}/data-sources`,
        data,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["data-sources", sessionId] });
    },
  });
}

export function useUpdateDataSource(sessionId: string, dataSourceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateDataSourceRequest) =>
      apiClient.patch<DataSourceResponse>(
        `/analysis-sessions/${sessionId}/data-sources/${dataSourceId}`,
        data,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["data-sources", sessionId] });
    },
  });
}

export function useDeleteDataSource(sessionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dataSourceId: string) =>
      apiClient.delete(`/analysis-sessions/${sessionId}/data-sources/${dataSourceId}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["data-sources", sessionId] });
    },
  });
}
