"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiClient } from "@/lib/api/client";
import {
  ImportBatchListResponse,
  ImportBatchResponse,
} from "@/lib/types";

export function useFetchImportBatches(sessionId?: string) {
  const { auth } = useAuth();
  const orgId = auth?.organizationId;

  return useQuery({
    queryKey: ["imports", sessionId],
    queryFn: async () => {
      if (!orgId || !sessionId) throw new Error("Thiáº¿u Organization/Session ID");
      return apiClient.get<ImportBatchListResponse>(
        `/analysis-sessions/${sessionId}/imports`,
      );
    },
    enabled: !!orgId && !!sessionId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useUploadImportFile(sessionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return apiClient.postFormData<ImportBatchResponse>(
        `/analysis-sessions/${sessionId}/imports`,
        formData,
      );
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["imports", sessionId] });
      void queryClient.invalidateQueries({ queryKey: ["data-sources", sessionId] });
    },
  });
}

export function useMapImportColumns(sessionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: { batchId: string; columnMapping: Record<string, string> }) =>
      apiClient.post<ImportBatchResponse>(
        `/analysis-sessions/${sessionId}/imports/${variables.batchId}/mapping`,
        { columnMapping: variables.columnMapping },
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["imports", sessionId] });
    },
  });
}

export function usePreviewImport(sessionId: string) {
  return useMutation({
    mutationFn: (batchId: string) =>
      apiClient.post(`/analysis-sessions/${sessionId}/imports/${batchId}/preview`, {}),
  });
}

export function useConfirmImport(sessionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (batchId: string) =>
      apiClient.post<ImportBatchResponse>(
        `/analysis-sessions/${sessionId}/imports/${batchId}/confirm`,
        {},
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["imports", sessionId] });
      void queryClient.invalidateQueries({ queryKey: ["feedback", sessionId] });
    },
  });
}

export function useDownloadImportErrors(sessionId: string) {
  return useMutation({
    mutationFn: (batchId: string) =>
      apiClient.get<Blob>(`/analysis-sessions/${sessionId}/imports/${batchId}/errors`),
  });
}
