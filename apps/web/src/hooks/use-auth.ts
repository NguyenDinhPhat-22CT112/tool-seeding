'use client';

import { useAuthStore } from '@/lib/store/auth-store';
import { AuthContext, OrgRole } from '@/lib/types';
import { useEffect, useState } from 'react';

export function useAuth() {
  const { auth, setAuth, isAuthenticated, logout } = useAuthStore();
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const login = (authContext: AuthContext) => {
    setAuth(authContext);
  };

  const canAccess = (requiredRole?: OrgRole): boolean => {
    if (!auth) return false;
    if (!requiredRole) return true;

    // Define role hierarchy
    const roleHierarchy: Record<OrgRole, number> = {
      ORG_ADMIN: 5,
      STRATEGY_MANAGER: 4,
      INSIGHT_REVIEWER: 3,
      ANALYST: 2,
      VIEWER: 1,
    };

    return roleHierarchy[auth.role] >= roleHierarchy[requiredRole];
  };

  return {
    auth,
    isAuthenticated: isAuthenticated(),
    isHydrated,
    login,
    logout,
    canAccess,
  };
}
