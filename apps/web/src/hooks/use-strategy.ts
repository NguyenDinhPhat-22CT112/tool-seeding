"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiClient } from "@/lib/api/client";
import {
  CreateStrategyRevisionRequest,
  ReviewStrategyVersionRequest,
  StrategyResponse,
  StrategyVersionListResponse,
  StrategyVersionResponse,
  UpdateStrategyVersionRequest,
} from "@/lib/types";

export function useFetchStrategy(sessionId?: string) {
  const { auth } = useAuth();
  const orgId = auth?.organizationId;

  return useQuery({
    queryKey: ["strategy", sessionId],
    queryFn: async () => {
      if (!orgId || !sessionId) throw new Error("Thiáº¿u Organization/Session ID");
      return apiClient.get<StrategyResponse>(
        `/analysis-sessions/${sessionId}/strategy`,
      );
    },
    enabled: !!orgId && !!sessionId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useFetchStrategyVersions(
  sessionId?: string,
  options?: { status?: string; page?: number; pageSize?: number },
) {
  const { auth } = useAuth();
  const orgId = auth?.organizationId;

  return useQuery({
    queryKey: ["strategy-versions", sessionId, options],
    queryFn: async () => {
      if (!orgId || !sessionId) throw new Error("Thiáº¿u Organization/Session ID");

      const params = new URLSearchParams();
      if (options?.status) params.set("status", options.status);
      if (options?.page) params.set("page", options.page.toString());
      if (options?.pageSize) params.set("pageSize", options.pageSize.toString());

      return apiClient.get<StrategyVersionListResponse>(
        `/analysis-sessions/${sessionId}/strategy/versions?${params.toString()}`,
      );
    },
    enabled: !!orgId && !!sessionId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useFetchStrategyVersion(sessionId?: string, versionId?: string) {
  const { auth } = useAuth();
  const orgId = auth?.organizationId;

  return useQuery({
    queryKey: ["strategy-version", sessionId, versionId],
    queryFn: async () => {
      if (!orgId || !sessionId || !versionId)
        throw new Error("Thiáº¿u Organization/Session/Version ID");
      return apiClient.get<StrategyVersionResponse>(
        `/analysis-sessions/${sessionId}/strategy/versions/${versionId}`,
      );
    },
    enabled: !!orgId && !!sessionId && !!versionId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateStrategyRevision(sessionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateStrategyRevisionRequest) =>
      apiClient.post<StrategyVersionResponse>(
        `/analysis-sessions/${sessionId}/strategy/versions`,
        data,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["strategy-versions", sessionId] });
      void queryClient.invalidateQueries({ queryKey: ["strategy", sessionId] });
    },
  });
}

export function useUpdateStrategyVersion(sessionId: string, versionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateStrategyVersionRequest) =>
      apiClient.patch<StrategyVersionResponse>(
        `/analysis-sessions/${sessionId}/strategy/versions/${versionId}`,
        data,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["strategy-versions", sessionId] });
      void queryClient.invalidateQueries({
        queryKey: ["strategy-version", sessionId, versionId],
      });
    },
  });
}

export function useSubmitStrategyVersion(sessionId: string, versionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      apiClient.post<StrategyVersionResponse>(
        `/analysis-sessions/${sessionId}/strategy/versions/${versionId}/submit`,
        {},
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["strategy-versions", sessionId] });
      void queryClient.invalidateQueries({
        queryKey: ["strategy-version", sessionId, versionId],
      });
    },
  });
}

export function useApproveStrategyVersion(sessionId: string, versionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      apiClient.post<StrategyVersionResponse>(
        `/analysis-sessions/${sessionId}/strategy/versions/${versionId}/approve`,
        {},
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["strategy-versions", sessionId] });
      void queryClient.invalidateQueries({ queryKey: ["strategy", sessionId] });
      void queryClient.invalidateQueries({
        queryKey: ["strategy-version", sessionId, versionId],
      });
    },
  });
}

export function useRejectStrategyVersion(sessionId: string, versionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ReviewStrategyVersionRequest) =>
      apiClient.post<StrategyVersionResponse>(
        `/analysis-sessions/${sessionId}/strategy/versions/${versionId}/reject`,
        data,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["strategy-versions", sessionId] });
      void queryClient.invalidateQueries({
        queryKey: ["strategy-version", sessionId, versionId],
      });
    },
  });
}

export function useRequestRevision(sessionId: string, versionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ReviewStrategyVersionRequest) =>
      apiClient.post<StrategyVersionResponse>(
        `/analysis-sessions/${sessionId}/strategy/versions/${versionId}/revision`,
        data,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["strategy-versions", sessionId] });
      void queryClient.invalidateQueries({
        queryKey: ["strategy-version", sessionId, versionId],
      });
    },
  });
}

export function useLockStrategyVersion(sessionId: string, versionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      apiClient.post<StrategyVersionResponse>(
        `/analysis-sessions/${sessionId}/strategy/versions/${versionId}/lock`,
        {},
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["strategy-versions", sessionId] });
      void queryClient.invalidateQueries({ queryKey: ["strategy", sessionId] });
      void queryClient.invalidateQueries({
        queryKey: ["strategy-version", sessionId, versionId],
      });
    },
  });
}

export function useArchiveStrategyVersion(sessionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (versionId: string) =>
      apiClient.post<StrategyVersionResponse>(
        `/analysis-sessions/${sessionId}/strategy/versions/${versionId}/archive`,
        {},
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["strategy-versions", sessionId] });
    },
  });
}
