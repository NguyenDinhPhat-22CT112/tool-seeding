"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiClient } from "@/lib/api/client";
import {
  AIGenerationResponse,
  ContentVersionResponse,
  CreateManualContentRequest,
  CreatePromptTemplateRequest,
  GenerateContentsRequest,
  PromptTemplateResponse,
  ReviewContentRequest,
  SeedingContentDetail,
  SeedingContentListResponse,
  UpdateContentRequest,
} from "@/lib/types";

export function useFetchContents(
  sessionId?: string,
  options?: { status?: string; origin?: string; page?: number; pageSize?: number },
) {
  const { auth } = useAuth();
  const orgId = auth?.organizationId;

  return useQuery({
    queryKey: ["contents", sessionId, options],
    queryFn: async () => {
      if (!orgId || !sessionId) throw new Error("Thiếu Organization/Session ID");
      const params = new URLSearchParams();
      if (options?.status) params.set("status", options.status);
      if (options?.origin) params.set("origin", options.origin);
      if (options?.page) params.set("page", options.page.toString());
      if (options?.pageSize) params.set("pageSize", options.pageSize.toString());
      return apiClient.get<SeedingContentListResponse>(
        `/analysis-sessions/${sessionId}/contents?${params.toString()}`,
      );
    },
    enabled: !!orgId && !!sessionId,
    staleTime: 30_000,
  });
}

export function useFetchContentDetail(sessionId?: string, contentId?: string) {
  const { auth } = useAuth();
  const orgId = auth?.organizationId;

  return useQuery({
    queryKey: ["content", sessionId, contentId],
    queryFn: async () => {
      if (!orgId || !sessionId || !contentId)
        throw new Error("Thiếu Organization/Session/Content ID");
      return apiClient.get<SeedingContentDetail>(
        `/analysis-sessions/${sessionId}/contents/${contentId}`,
      );
    },
    enabled: !!orgId && !!sessionId && !!contentId,
    staleTime: 30_000,
  });
}

export function useFetchContentVersions(contentId?: string) {
  const { auth } = useAuth();
  const orgId = auth?.organizationId;

  return useQuery({
    queryKey: ["content-versions", contentId],
    queryFn: async () => {
      if (!orgId || !contentId) throw new Error("Thiếu Organization/Content ID");
      return apiClient.get<ContentVersionResponse[]>(`/contents/${contentId}/versions`);
    },
    enabled: !!orgId && !!contentId,
    staleTime: 30_000,
  });
}

export function useGenerateContents(sessionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: GenerateContentsRequest) =>
      apiClient.post<{ aiGenerationId: string; jobId: string }>(
        `/analysis-sessions/${sessionId}/contents/generate`,
        data,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["contents", sessionId] });
    },
  });
}

export function useFetchAIGeneration(aiGenerationId?: string) {
  const { auth } = useAuth();
  const orgId = auth?.organizationId;

  return useQuery({
    queryKey: ["ai-generation", aiGenerationId],
    queryFn: async () => {
      if (!orgId || !aiGenerationId) throw new Error("Thiếu Organization/AIGeneration ID");
      return apiClient.get<AIGenerationResponse>(`/ai-generations/${aiGenerationId}`);
    },
    enabled: !!orgId && !!aiGenerationId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "PENDING" ? 2000 : false;
    },
  });
}

export function useSaveAIGeneration(sessionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ aiGenerationId, selectedCandidateIndex }: { aiGenerationId: string; selectedCandidateIndex: number }) =>
      apiClient.post<SeedingContentDetail>(
        `/analysis-sessions/${sessionId}/ai-generations/${aiGenerationId}/save`,
        { selectedCandidateIndex },
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["contents", sessionId] });
    },
  });
}

export function useCreateManualContent(sessionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateManualContentRequest) =>
      apiClient.post<SeedingContentDetail>(
        `/analysis-sessions/${sessionId}/contents/manual`,
        data,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["contents", sessionId] });
    },
  });
}

export function useUpdateContent(sessionId: string, contentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateContentRequest) =>
      apiClient.patch<SeedingContentDetail>(
        `/analysis-sessions/${sessionId}/contents/${contentId}`,
        data,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["contents", sessionId] });
      void queryClient.invalidateQueries({ queryKey: ["content", sessionId, contentId] });
      void queryClient.invalidateQueries({ queryKey: ["content-versions", contentId] });
    },
  });
}

export function useUpdateContentTags(sessionId: string, contentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (tags: string[]) =>
      apiClient.patch<SeedingContentDetail>(
        `/analysis-sessions/${sessionId}/contents/${contentId}/tags`,
        { tags },
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["contents", sessionId] });
      void queryClient.invalidateQueries({ queryKey: ["content", sessionId, contentId] });
    },
  });
}

export function useSubmitContent(sessionId: string, contentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiClient.post<SeedingContentDetail>(
        `/analysis-sessions/${sessionId}/contents/${contentId}/submit-review`,
        {},
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["contents", sessionId] });
      void queryClient.invalidateQueries({ queryKey: ["content", sessionId, contentId] });
    },
  });
}

export function useApproveContent(sessionId: string, contentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiClient.post<SeedingContentDetail>(
        `/analysis-sessions/${sessionId}/contents/${contentId}/approve`,
        {},
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["contents", sessionId] });
      void queryClient.invalidateQueries({ queryKey: ["content", sessionId, contentId] });
    },
  });
}

export function useRequestRevisionContent(sessionId: string, contentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ReviewContentRequest) =>
      apiClient.post<SeedingContentDetail>(
        `/analysis-sessions/${sessionId}/contents/${contentId}/request-revision`,
        data,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["contents", sessionId] });
      void queryClient.invalidateQueries({ queryKey: ["content", sessionId, contentId] });
    },
  });
}

export function useLockContent(sessionId: string, contentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiClient.post<SeedingContentDetail>(
        `/analysis-sessions/${sessionId}/contents/${contentId}/lock`,
        {},
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["contents", sessionId] });
      void queryClient.invalidateQueries({ queryKey: ["content", sessionId, contentId] });
    },
  });
}

export function useUnlockContent(sessionId: string, contentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ReviewContentRequest) =>
      apiClient.post<SeedingContentDetail>(
        `/analysis-sessions/${sessionId}/contents/${contentId}/unlock`,
        data,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["contents", sessionId] });
      void queryClient.invalidateQueries({ queryKey: ["content", sessionId, contentId] });
    },
  });
}

export function useArchiveContent(sessionId: string, contentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiClient.post<SeedingContentDetail>(
        `/analysis-sessions/${sessionId}/contents/${contentId}/archive`,
        {},
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["contents", sessionId] });
      void queryClient.invalidateQueries({ queryKey: ["content", sessionId, contentId] });
    },
  });
}

export function useFetchPromptTemplates(options?: {
  platform?: string;
  contentType?: string;
  purpose?: string;
}) {
  const { auth } = useAuth();
  const orgId = auth?.organizationId;

  return useQuery({
    queryKey: ["prompt-templates", options],
    queryFn: async () => {
      if (!orgId) throw new Error("Thiếu Organization ID");
      const params = new URLSearchParams();
      if (options?.platform) params.set("platform", options.platform);
      if (options?.contentType) params.set("contentType", options.contentType);
      if (options?.purpose) params.set("purpose", options.purpose);
      return apiClient.get<PromptTemplateResponse[]>(
        `/prompt-templates?${params.toString()}`,
      );
    },
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreatePromptTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePromptTemplateRequest) =>
      apiClient.post<PromptTemplateResponse>("/prompt-templates", data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["prompt-templates"] });
    },
  });
}

export function useUpdatePromptTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreatePromptTemplateRequest }) =>
      apiClient.patch<PromptTemplateResponse>(`/prompt-templates/${id}`, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["prompt-templates"] });
    },
  });
}
