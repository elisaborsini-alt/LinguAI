import {create} from 'zustand';
import {persist, createJSONStorage} from 'zustand/middleware';
import {immer} from 'zustand/middleware/immer';

import type {UserProfile} from '@appTypes/domain';
import {storage} from '@data/storage/mmkv';

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

interface AuthState {
  // State
  user: UserProfile | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;

  // Actions
  setUser: (user: UserProfile | null) => void;
  setTokens: (tokens: AuthTokens | null) => void;
  login: (user: UserProfile, tokens: AuthTokens) => void;
  logout: () => void;
  updateUser: (updates: Partial<UserProfile>) => void;
  setLoading: (loading: boolean) => void;
  setInitialized: (initialized: boolean) => void;
  isTokenExpired: () => boolean;
}

const zustandStorage = {
  getItem: (name: string) => {
    const value = storage.getString(name);
    return value ?? null;
  },
  setItem: (name: string, value: string) => {
    storage.set(name, value);
  },
  removeItem: (name: string) => {
    storage.delete(name);
  },
};

export const useAuthStore = create<AuthState>()(
  persist(
    immer((set, get) => ({
      // Initial state
      user: null,
      tokens: null,
      isAuthenticated: false,
      isLoading: false,
      isInitialized: false,

      // Actions
      setUser: (user) =>
        set((state) => {
          state.user = user;
          state.isAuthenticated = user !== null;
        }),

      setTokens: (tokens) =>
        set((state) => {
          state.tokens = tokens;
        }),

      login: (user, tokens) =>
        set((state) => {
          state.user = user;
          state.tokens = tokens;
          state.isAuthenticated = true;
          state.isLoading = false;
        }),

      logout: () =>
        set((state) => {
          state.user = null;
          state.tokens = null;
          state.isAuthenticated = false;
        }),

      updateUser: (updates) =>
        set((state) => {
          if (state.user) {
            state.user = {...state.user, ...updates};
          }
        }),

      setLoading: (loading) =>
        set((state) => {
          state.isLoading = loading;
        }),

      setInitialized: (initialized) =>
        set((state) => {
          state.isInitialized = initialized;
        }),

      isTokenExpired: () => {
        const {tokens} = get();
        if (!tokens) return true;
        return Date.now() >= tokens.expiresAt;
      },
    })),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        user: state.user,
        tokens: state.tokens,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);

// Selectors
export const selectUser = (state: AuthState) => state.user;
export const selectIsAuthenticated = (state: AuthState) => state.isAuthenticated;
export const selectTokens = (state: AuthState) => state.tokens;
export const selectIsLoading = (state: AuthState) => state.isLoading;
export const selectIsInitialized = (state: AuthState) => state.isInitialized;
