const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";
const DEMO_ORGANIZATION_ID =
  process.env.NEXT_PUBLIC_DEMO_ORGANIZATION_ID ?? "org_demo";
const DEMO_USER_ID = process.env.NEXT_PUBLIC_DEMO_USER_ID ?? "user_demo_admin";
const DEMO_USER_ROLE = process.env.NEXT_PUBLIC_DEMO_USER_ROLE ?? "ORG_ADMIN";

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
};

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { body, headers, ...rest } = options;

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: {
      "Content-Type": "application/json",
      "x-organization-id": DEMO_ORGANIZATION_ID,
      "x-user-id": DEMO_USER_ID,
      "x-user-role": DEMO_USER_ROLE,
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
    ...rest,
  });

  if (!response.ok) {
    const errorData: unknown = await response.json().catch(() => ({ message: response.statusText }));
    const error = errorData as {
      code?: string;
      message?: string | string[];
    };
    const message = Array.isArray(error.message)
      ? error.message.join(", ")
      : error.message;
    throw new ApiClientError(
      message ?? "Không thể hoàn tất yêu cầu",
      response.status,
      error.code,
    );
  }

  const data: unknown = await response.json();
  return data as T;
}

export const apiClient = {
  get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return request<T>(endpoint, { ...options, method: "GET" });
  },

  post<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return request<T>(endpoint, { ...options, method: "POST", body });
  },

  put<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return request<T>(endpoint, { ...options, method: "PUT", body });
  },

  patch<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return request<T>(endpoint, { ...options, method: "PATCH", body });
  },

  delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return request<T>(endpoint, { ...options, method: "DELETE" });
  },
};

export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}
