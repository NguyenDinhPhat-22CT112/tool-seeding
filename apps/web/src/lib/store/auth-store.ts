import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AuthContext } from '../types';
import { apiClient } from '../api/client';

interface AuthStore {
  auth: AuthContext | null;
  setAuth: (auth: AuthContext | null) => void;
  isAuthenticated: () => boolean;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      auth: null,
      setAuth: (auth) => {
        set({ auth });
        apiClient.setAuthContext(auth);
      },
      isAuthenticated: () => {
        return get().auth !== null;
      },
      logout: () => {
        set({ auth: null });
        apiClient.setAuthContext(null);
      },
    }),
    {
      name: 'auth-store',
      version: 1,
      onRehydrateStorage: () => (state) => {
        if (state?.auth) {
          apiClient.setAuthContext(state.auth);
        }
      },
    }
  )
);
