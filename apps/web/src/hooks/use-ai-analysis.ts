"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiClient } from "@/lib/api/client";
import { FeedbackAnalysisResponse } from "@/lib/types";

export function useFetchFeedbackAnalyses(
  sessionId?: string,
  feedbackId?: string,
) {
  const { auth } = useAuth();
  const orgId = auth?.organizationId;

  return useQuery({
    queryKey: ["feedback-analyses", sessionId, feedbackId],
    queryFn: async () => {
      if (!orgId || !sessionId || !feedbackId)
        throw new Error("Thiếu Organization/Session/Feedback ID");
      return apiClient.get<FeedbackAnalysisResponse[]>(
        `/analysis-sessions/${sessionId}/feedback/${feedbackId}/analyses`,
      );
    },
    enabled: !!orgId && !!sessionId && !!feedbackId,
    staleTime: 5 * 60 * 1000,
  });
}
