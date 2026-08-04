"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiClient } from "@/lib/api/client";
import {
  AddBusinessLocationFromSerpApiRequest,
  CreateBusinessFromSerpApiRequest,
  CreateBusinessFromSerpApiResponse,
  SerpApiAutocompleteRequest,
  SerpApiAutocompleteResponse,
  SerpApiPreviewRequest,
  SerpApiPreview,
  SerpApiStatusResponse,
  BusinessLocationResponse,
} from "@/lib/types";

export function useSerpApiStatus() {
  const { auth } = useAuth();
  const orgId = auth?.organizationId;

  return useQuery({
    queryKey: ["serpapi-status"],
    queryFn: async () => {
      if (!orgId) throw new Error("Thiáº¿u Organization ID");
      return apiClient.get<SerpApiStatusResponse>("/serpapi/status");
    },
    enabled: !!orgId,
    staleTime: 60 * 1000,
  });
}

export function useSerpApiAutocomplete() {
  return useMutation({
    mutationFn: (data: SerpApiAutocompleteRequest) =>
      apiClient.post<SerpApiAutocompleteResponse>("/serpapi/autocomplete", data),
  });
}

export function useSerpApiPreview() {
  return useMutation({
    mutationFn: (data: SerpApiPreviewRequest) =>
      apiClient.post<SerpApiPreview>("/serpapi/preview", data),
  });
}

export function useCreateBusinessFromSerpApi() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateBusinessFromSerpApiRequest) =>
      apiClient.post<CreateBusinessFromSerpApiResponse>(
        "/businesses/from-serpapi",
        data,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["businesses"] });
    },
  });
}

export function useAddLocationFromSerpApi(businessId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: AddBusinessLocationFromSerpApiRequest) =>
      apiClient.post<BusinessLocationResponse>(
        `/businesses/${businessId}/locations/from-serpapi`,
        data,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["locations", businessId] });
    },
  });
}
