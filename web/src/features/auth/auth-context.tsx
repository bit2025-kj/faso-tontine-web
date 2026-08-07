import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, type ReactNode, useContext } from 'react';
import { ApiError, api } from '../../lib/api';
import type { UserOut } from './types';

interface AuthContextValue {
  user: UserOut | null;
  isLoading: boolean;
  /** True once we've asked the BFF at least once — lets callers distinguish "loading" from "no session". */
  isReady: boolean;
  refresh: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const query = useQuery<UserOut | null>({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      try {
        return await api.get<UserOut>('/auth/me');
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) return null;
        throw err;
      }
    },
    staleTime: 60_000,
    retry: false,
  });

  const value: AuthContextValue = {
    user: query.data ?? null,
    isLoading: query.isLoading,
    isReady: query.isFetched,
    refresh: () => queryClient.invalidateQueries({ queryKey: ['auth', 'me'] }),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
