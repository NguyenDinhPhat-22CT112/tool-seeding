"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiClient } from "@/lib/api/client";
import { ProcessingJobResponse } from "@/lib/types";

export interface PaginatedJobsResponse {
  items: ProcessingJobResponse[];
  total: number;
  page: number;
  pageSize: number;
}

export function useFetchProcessingJobs(
  options?: {
    analysisSessionId?: string;
    jobType?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  },
  sessionId?: string,
) {
  const { auth } = useAuth();
  const orgId = auth?.organizationId;

  return useQuery({
    queryKey: ["jobs", sessionId || options?.analysisSessionId, options],
    queryFn: async () => {
      if (!orgId) throw new Error("Thiáº¿u Organization ID");

      const params = new URLSearchParams();
      if (options?.analysisSessionId)
        params.set("analysisSessionId", options.analysisSessionId);
      if (options?.jobType) params.set("jobType", options.jobType);
      if (options?.status) params.set("status", options.status);
      if (options?.page) params.set("page", options.page.toString());
      if (options?.pageSize) params.set("pageSize", options.pageSize.toString());

      return apiClient.get<PaginatedJobsResponse>(
        `/processing-jobs?${params.toString()}`,
      );
    },
    enabled: !!orgId,
    staleTime: 30 * 1000,
  });
}

export function useRetryJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (jobId: string) =>
      apiClient.post<ProcessingJobResponse>(`/processing-jobs/${jobId}/retry`, {}),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["jobs"] });
    },
  });
}

export function useCancelJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (jobId: string) =>
      apiClient.post<ProcessingJobResponse>(`/processing-jobs/${jobId}/cancel`, {}),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["jobs"] });
    },
  });
}

// â”€â”€ Trigger AI pipelines â”€â”€

export function useTriggerInsightGeneration(sessionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      apiClient.post(`/analysis-sessions/${sessionId}/insight-generation`, {}),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["jobs", sessionId] });
    },
  });
}

export function useTriggerStrategyGeneration(sessionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      apiClient.post(`/analysis-sessions/${sessionId}/strategy-generation`, {}),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["jobs", sessionId] });
      void queryClient.invalidateQueries({ queryKey: ["strategy-versions", sessionId] });
    },
  });
}
