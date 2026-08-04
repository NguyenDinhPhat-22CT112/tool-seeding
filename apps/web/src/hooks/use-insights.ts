"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiClient } from "@/lib/api/client";
import {
  CreateInsightRequest,
  InsightListResponse,
  InsightResponse,
  ReviewInsightRequest,
  UpdateInsightRequest,
} from "@/lib/types";

export function useFetchInsights(
  sessionId?: string,
  options?: {
    status?: string;
    origin?: string;
    isFlagged?: boolean;
    search?: string;
    includeArchived?: boolean;
    page?: number;
    pageSize?: number;
  },
) {
  const { auth } = useAuth();
  const orgId = auth?.organizationId;

  return useQuery({
    queryKey: ["insights", sessionId, options],
    queryFn: async () => {
      if (!orgId || !sessionId) throw new Error("Thiáº¿u Organization/Session ID");

      const params = new URLSearchParams();
      if (options?.status) params.set("status", options.status);
      if (options?.origin) params.set("origin", options.origin);
      if (options?.isFlagged !== undefined)
        params.set("isFlagged", String(options.isFlagged));
      if (options?.search) params.set("search", options.search);
      if (options?.includeArchived)
        params.set("includeArchived", String(options.includeArchived));
      if (options?.page) params.set("page", options.page.toString());
      if (options?.pageSize) params.set("pageSize", options.pageSize.toString());

      return apiClient.get<InsightListResponse>(
        `/analysis-sessions/${sessionId}/insights?${params.toString()}`,
      );
    },
    enabled: !!orgId && !!sessionId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useFetchInsight(sessionId?: string, insightId?: string) {
  const { auth } = useAuth();
  const orgId = auth?.organizationId;

  return useQuery({
    queryKey: ["insight", sessionId, insightId],
    queryFn: async () => {
      if (!orgId || !sessionId || !insightId)
        throw new Error("Thiáº¿u Organization/Session/Insight ID");
      return apiClient.get<InsightResponse>(
        `/analysis-sessions/${sessionId}/insights/${insightId}`,
      );
    },
    enabled: !!orgId && !!sessionId && !!insightId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateInsight(sessionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateInsightRequest) =>
      apiClient.post<InsightResponse>(
        `/analysis-sessions/${sessionId}/insights`,
        data,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["insights", sessionId] });
    },
  });
}

export function useUpdateInsight(sessionId: string, insightId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateInsightRequest) =>
      apiClient.patch<InsightResponse>(
        `/analysis-sessions/${sessionId}/insights/${insightId}`,
        data,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["insights", sessionId] });
      void queryClient.invalidateQueries({
        queryKey: ["insight", sessionId, insightId],
      });
    },
  });
}

export function useSubmitInsight(sessionId: string, insightId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      apiClient.post<InsightResponse>(
        `/analysis-sessions/${sessionId}/insights/${insightId}/submit`,
        {},
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["insights", sessionId] });
      void queryClient.invalidateQueries({
        queryKey: ["insight", sessionId, insightId],
      });
    },
  });
}

export function useApproveInsight(sessionId: string, insightId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ReviewInsightRequest) =>
      apiClient.post<InsightResponse>(
        `/analysis-sessions/${sessionId}/insights/${insightId}/approve`,
        data,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["insights", sessionId] });
      void queryClient.invalidateQueries({
        queryKey: ["insight", sessionId, insightId],
      });
    },
  });
}

export function useRejectInsight(sessionId: string, insightId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ReviewInsightRequest) =>
      apiClient.post<InsightResponse>(
        `/analysis-sessions/${sessionId}/insights/${insightId}/reject`,
        data,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["insights", sessionId] });
      void queryClient.invalidateQueries({
        queryKey: ["insight", sessionId, insightId],
      });
    },
  });
}

export function useRequestReanalysis(sessionId: string, insightId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ReviewInsightRequest) =>
      apiClient.post<InsightResponse>(
        `/analysis-sessions/${sessionId}/insights/${insightId}/reanalysis`,
        data,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["insights", sessionId] });
      void queryClient.invalidateQueries({
        queryKey: ["insight", sessionId, insightId],
      });
    },
  });
}

export function useArchiveInsight(sessionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (insightId: string) =>
      apiClient.post<InsightResponse>(
        `/analysis-sessions/${sessionId}/insights/${insightId}/archive`,
        {},
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["insights", sessionId] });
    },
  });
}

// API khÃ´ng cÃ³ DELETE insight â€” thay báº±ng archive (káº¿t thÃºc, chá»‰ Ä‘á»c).
export function useDeleteInsight(sessionId: string, insightId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      apiClient.post<InsightResponse>(
        `/analysis-sessions/${sessionId}/insights/${insightId}/archive`,
        {},
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["insights", sessionId] });
      void queryClient.invalidateQueries({
        queryKey: ["insight", sessionId, insightId],
      });
    },
  });
}
