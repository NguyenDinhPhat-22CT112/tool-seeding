"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiClient } from "@/lib/api/client";
import {
  AnalysisSessionDetailResponse,
  AnalysisSessionListResponse,
  CreateAnalysisSessionRequest,
  UpdateAnalysisSessionRequest,
  TriggerProcessResponse,
} from "@/lib/types";

export function useFetchSessions(options?: {
  businessId?: string;
  status?: string;
  keyword?: string;
  page?: number;
  pageSize?: number;
}) {
  const { auth } = useAuth();
  const orgId = auth?.organizationId;

  return useQuery({
    queryKey: ["sessions", { orgId, ...options }],
    queryFn: async () => {
      if (!orgId) throw new Error("Thiáº¿u Organization ID");

      const params = new URLSearchParams();
      if (options?.businessId) params.set("businessId", options.businessId);
      if (options?.status) params.set("status", options.status);
      if (options?.keyword) params.set("keyword", options.keyword);
      if (options?.page) params.set("page", options.page.toString());
      if (options?.pageSize) params.set("pageSize", options.pageSize.toString());

      return apiClient.get<AnalysisSessionListResponse>(
        `/analysis-sessions?${params.toString()}`,
      );
    },
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
  });
}

const ACTIVE_SESSION_STATUSES = new Set([
  "DATA_COLLECTION",
  "PROCESSING",
  "ANALYZING",
  "STRATEGY_BUILDING",
]);

export function useFetchSession(sessionId?: string) {
  const { auth } = useAuth();
  const orgId = auth?.organizationId;

  return useQuery({
    queryKey: ["session", sessionId],
    queryFn: async () => {
      if (!orgId || !sessionId) throw new Error("Thiáº¿u Organization/Session ID");
      return apiClient.get<AnalysisSessionDetailResponse>(
        `/analysis-sessions/${sessionId}`,
      );
    },
    enabled: !!orgId && !!sessionId,
    staleTime: 5 * 60 * 1000,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status && ACTIVE_SESSION_STATUSES.has(status) ? 3000 : false;
    },
  });
}

export function useCreateSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateAnalysisSessionRequest) =>
      apiClient.post<AnalysisSessionDetailResponse>("/analysis-sessions", data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["sessions"] });
    },
  });
}

export function useUpdateSession(sessionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateAnalysisSessionRequest) =>
      apiClient.patch<AnalysisSessionDetailResponse>(
        `/analysis-sessions/${sessionId}`,
        data,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["sessions"] });
      void queryClient.invalidateQueries({ queryKey: ["session", sessionId] });
    },
  });
}

export function useStartDataCollection(sessionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      apiClient.post<AnalysisSessionDetailResponse>(
        `/analysis-sessions/${sessionId}/start-data-collection`,
        {},
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["sessions"] });
      void queryClient.invalidateQueries({ queryKey: ["session", sessionId] });
    },
  });
}

export function useTriggerProcess(sessionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      apiClient.post<TriggerProcessResponse>(
        `/analysis-sessions/${sessionId}/process`,
        {},
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["session", sessionId] });
      void queryClient.invalidateQueries({ queryKey: ["jobs", sessionId] });
    },
  });
}

export function useCompleteStage(sessionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      apiClient.post<AnalysisSessionDetailResponse>(
        `/analysis-sessions/${sessionId}/complete`,
        {},
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["sessions"] });
      void queryClient.invalidateQueries({ queryKey: ["session", sessionId] });
    },
  });
}

export function useArchiveSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sessionId: string) =>
      apiClient.post<AnalysisSessionDetailResponse>(
        `/analysis-sessions/${sessionId}/archive`,
        {},
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["sessions"] });
    },
  });
}

export function useDeleteSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sessionId: string) =>
      apiClient.delete(`/analysis-sessions/${sessionId}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["sessions"] });
    },
  });
}
