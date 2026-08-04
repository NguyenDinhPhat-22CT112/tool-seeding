"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiClient } from "@/lib/api/client";
import {
  BusinessDetailResponse,
  BusinessListResponse,
  BusinessLocationResponse,
  CreateBusinessRequest,
  CreateBusinessLocationRequest,
  UpdateBusinessRequest,
  UpdateBusinessLocationRequest,
} from "@/lib/types";

// ============================================================================
// Business Queries
// ============================================================================

export function useFetchBusinesses(options?: {
  page?: number;
  pageSize?: number;
  search?: string;
}) {
  const { auth } = useAuth();
  const orgId = auth?.organizationId;

  return useQuery({
    queryKey: ["businesses", { orgId, ...options }],
    queryFn: async () => {
      if (!orgId) throw new Error("Thiáº¿u Organization ID");

      const params = new URLSearchParams();
      if (options?.page) params.set("page", options.page.toString());
      if (options?.pageSize) params.set("pageSize", options.pageSize.toString());
      if (options?.search) params.set("search", options.search);

      return apiClient.get<BusinessListResponse>(
        `/businesses?${params.toString()}`,
      );
    },
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useFetchBusiness(businessId?: string) {
  const { auth } = useAuth();
  const orgId = auth?.organizationId;

  return useQuery({
    queryKey: ["business", businessId],
    queryFn: async () => {
      if (!orgId || !businessId) throw new Error("Thiáº¿u Organization/Business ID");
      return apiClient.get<BusinessDetailResponse>(`/businesses/${businessId}`);
    },
    enabled: !!orgId && !!businessId,
    staleTime: 5 * 60 * 1000,
  });
}

// ============================================================================
// Business Mutations
// ============================================================================

export function useCreateBusiness() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateBusinessRequest) =>
      apiClient.post<BusinessDetailResponse>("/businesses", data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["businesses"] });
    },
  });
}

export function useUpdateBusiness(businessId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateBusinessRequest) =>
      apiClient.patch<BusinessDetailResponse>(`/businesses/${businessId}`, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["businesses"] });
      void queryClient.invalidateQueries({ queryKey: ["business", businessId] });
    },
  });
}

export function useDeleteBusiness() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (businessId: string) =>
      apiClient.delete(`/businesses/${businessId}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["businesses"] });
    },
  });
}

// ============================================================================
// Location Queries
// ============================================================================

export function useFetchLocations(businessId?: string) {
  const { auth } = useAuth();
  const orgId = auth?.organizationId;

  return useQuery({
    queryKey: ["locations", businessId],
    queryFn: async () => {
      if (!orgId || !businessId) throw new Error("Thiáº¿u Organization/Business ID");
      const response = await apiClient.get<{ items: BusinessLocationResponse[] }>(
        `/businesses/${businessId}/locations`,
      );
      return response.items;
    },
    enabled: !!orgId && !!businessId,
    staleTime: 5 * 60 * 1000,
  });
}

// ============================================================================
// Location Mutations
// ============================================================================

export function useCreateLocation(businessId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateBusinessLocationRequest) =>
      apiClient.post<BusinessLocationResponse>(
        `/businesses/${businessId}/locations`,
        data,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["locations", businessId] });
      void queryClient.invalidateQueries({ queryKey: ["business", businessId] });
    },
  });
}

export function useUpdateLocation(businessId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ locationId, data }: { locationId: string; data: UpdateBusinessLocationRequest }) =>
      apiClient.patch<BusinessLocationResponse>(
        `/businesses/${businessId}/locations/${locationId}`,
        data,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["locations", businessId] });
      void queryClient.invalidateQueries({ queryKey: ["business", businessId] });
    },
  });
}

export function useDeleteLocation(businessId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (locationId: string) =>
      apiClient.delete(`/businesses/${businessId}/locations/${locationId}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["locations", businessId] });
      void queryClient.invalidateQueries({ queryKey: ["business", businessId] });
    },
  });
}
