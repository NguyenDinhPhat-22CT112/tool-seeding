"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/lib/store/auth-store";
import { apiClient } from "@/lib/api/client";
import { AuthContext } from "@/lib/types";

interface AuthContextProviderProps {
  children: React.ReactNode;
  initialAuth?: AuthContext;
}

export function AuthContextProvider({
  children,
  initialAuth,
}: AuthContextProviderProps) {
  const { auth, setAuth } = useAuthStore();

  useEffect(() => {
    if (initialAuth && !auth) {
      setAuth(initialAuth);
    }

    const params = new URLSearchParams(window.location.search);
    const org = params.get("org");
    const user = params.get("user");
    const role = params.get("role");

    if (org && user && role && !auth) {
      const authContext: AuthContext = {
        organizationId: org,
        userId: user,
        role: role as AuthContext["role"],
      };
      setAuth(authContext);
      window.history.replaceState({}, "", "/dashboard");
    }
  }, []);

  useEffect(() => {
    if (auth) {
      apiClient.setAuthContext(auth);
    }
  }, [auth]);

  return <>{children}</>;
}
