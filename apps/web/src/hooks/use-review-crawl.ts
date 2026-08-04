"use client";

import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { TriggerReviewCrawlResponse } from "@/lib/types";

export function useTriggerReviewCrawl(sessionId: string) {
  return useMutation({
    mutationFn: (data: { businessLocationId: string; name?: string }) =>
      apiClient.post<TriggerReviewCrawlResponse>(
        `/analysis-sessions/${sessionId}/review-crawl`,
        data,
      ),
  });
}
