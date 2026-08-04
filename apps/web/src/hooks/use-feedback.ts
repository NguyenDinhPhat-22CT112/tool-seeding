"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiClient } from "@/lib/api/client";
import {
  CreateFeedbackRequest,
  FeedbackListItemResponse,
  FeedbackListResponse,
  FeedbackResponse,
  UpdateFeedbackRequest,
} from "@/lib/types";

export function useFetchFeedback(
  sessionId?: string,
  options?: { processingStatus?: string; page?: number; pageSize?: number },
) {
  const { auth } = useAuth();
  const orgId = auth?.organizationId;

  return useQuery({
    queryKey: ["feedback", sessionId, options],
    queryFn: async () => {
      if (!orgId || !sessionId) throw new Error("Thiáº¿u Organization/Session ID");

      const params = new URLSearchParams();
      if (options?.processingStatus)
        params.set("processingStatus", options.processingStatus);
      if (options?.page) params.set("page", options.page.toString());
      if (options?.pageSize) params.set("pageSize", options.pageSize.toString());

      return apiClient.get<FeedbackListResponse>(
        `/analysis-sessions/${sessionId}/feedback?${params.toString()}`,
      );
    },
    enabled: !!orgId && !!sessionId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateFeedback(sessionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateFeedbackRequest) =>
      apiClient.post<FeedbackResponse>(
        `/analysis-sessions/${sessionId}/feedback`,
        data,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["feedback", sessionId] });
    },
  });
}

export function useUpdateFeedback(sessionId: string, feedbackId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateFeedbackRequest) =>
      apiClient.patch<FeedbackResponse>(
        `/analysis-sessions/${sessionId}/feedback/${feedbackId}`,
        data,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["feedback", sessionId] });
    },
  });
}

export function useExcludeFeedback(sessionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (feedbackId: string) =>
      apiClient.delete<FeedbackListItemResponse>(
        `/analysis-sessions/${sessionId}/feedback/${feedbackId}`,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["feedback", sessionId] });
    },
  });
}
