import { ApiClientError, AuthContext } from "../types";

interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
}

class ApiClient {
  private baseUrl: string;
  private authContext: AuthContext | null = null;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
  }

  setAuthContext(context: AuthContext | null) {
    this.authContext = context;
  }

  getAuthContext(): AuthContext | null {
    return this.authContext;
  }

  private getHeaders(skipAuth: boolean = false): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (!skipAuth && this.authContext) {
      headers["x-organization-id"] = this.authContext.organizationId;
      headers["x-user-id"] = this.authContext.userId;
      headers["x-user-role"] = this.authContext.role;
    }

    return headers;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      let errorData: {
        statusCode?: number;
        code?: string;
        message?: string | string[];
      };

      try {
        errorData = (await response.json()) as {
          statusCode?: number;
          code?: string;
          message?: string | string[];
        };
      } catch {
        errorData = {};
      }

      const message = Array.isArray(errorData.message)
        ? errorData.message.join(", ")
        : errorData.message || `HTTP ${response.status}`;

      throw new ApiClientError(
        message,
        response.status,
        errorData.code || `HTTP_${response.status}`,
      );
    }

    try {
      return (await response.json()) as T;
    } catch {
      return {} as T;
    }
  }

  async get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: "GET",
      headers: this.getHeaders(options?.skipAuth),
      ...options,
    });
    return this.handleResponse<T>(response);
  }

  async post<T>(
    endpoint: string,
    data?: unknown,
    options?: RequestOptions,
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: "POST",
      headers: this.getHeaders(options?.skipAuth),
      body: data !== undefined ? JSON.stringify(data) : undefined,
      ...options,
    });
    return this.handleResponse<T>(response);
  }

  async patch<T>(
    endpoint: string,
    data?: unknown,
    options?: RequestOptions,
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: "PATCH",
      headers: this.getHeaders(options?.skipAuth),
      body: data !== undefined ? JSON.stringify(data) : undefined,
      ...options,
    });
    return this.handleResponse<T>(response);
  }

  async delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: "DELETE",
      headers: this.getHeaders(options?.skipAuth),
      ...options,
    });
    return this.handleResponse<T>(response);
  }

  async postFormData<T>(
    endpoint: string,
    formData: FormData,
    options?: RequestOptions,
  ): Promise<T> {
    const headers = this.getHeaders(options?.skipAuth);
    delete headers["Content-Type"];

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: "POST",
      headers,
      body: formData,
      ...options,
    });
    return this.handleResponse<T>(response);
  }
}

export const apiClient = new ApiClient();
