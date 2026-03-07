import {useCallback} from 'react';

import {useAuthStore} from '@state/stores/authStore';
import {useUserStore} from '@state/stores/userStore';
import type {UserProfile} from '@appTypes/domain';
import type {LoginRequest, RegisterRequest} from '@appTypes/api';

interface UseAuthReturn {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
}

export const useAuth = (): UseAuthReturn => {
  const {
    user,
    isAuthenticated,
    isLoading,
    isInitialized,
    login: storeLogin,
    logout: storeLogout,
    setLoading,
  } = useAuthStore();

  const {setProfile, resetOnboarding} = useUserStore();

  const login = useCallback(
    async (credentials: LoginRequest) => {
      setLoading(true);
      try {
        // TODO: Implement actual API call
        // const response = await authApi.login(credentials);
        // storeLogin(response.user, {
        //   accessToken: response.accessToken,
        //   refreshToken: response.refreshToken,
        //   expiresAt: response.expiresAt,
        // });
        // setProfile(response.user);

        // Placeholder for now
        throw new Error('Login API not implemented');
      } catch (error) {
        setLoading(false);
        throw error;
      }
    },
    [setLoading, storeLogin, setProfile],
  );

  const register = useCallback(
    async (data: RegisterRequest) => {
      setLoading(true);
      try {
        // TODO: Implement actual API call
        // const response = await authApi.register(data);
        // storeLogin(response.user, {
        //   accessToken: response.accessToken,
        //   refreshToken: response.refreshToken,
        //   expiresAt: response.expiresAt,
        // });
        // setProfile(response.user);

        // Placeholder for now
        throw new Error('Register API not implemented');
      } catch (error) {
        setLoading(false);
        throw error;
      }
    },
    [setLoading, storeLogin, setProfile],
  );

  const logout = useCallback(async () => {
    try {
      // TODO: Call logout API to invalidate tokens
      // await authApi.logout();
    } catch {
      // Ignore logout errors, still clear local state
    } finally {
      storeLogout();
      setProfile(null);
      resetOnboarding();
    }
  }, [storeLogout, setProfile, resetOnboarding]);

  const refreshSession = useCallback(async (): Promise<boolean> => {
    try {
      // TODO: Implement token refresh
      // const tokens = useAuthStore.getState().tokens;
      // if (!tokens?.refreshToken) return false;
      // const response = await authApi.refreshToken(tokens.refreshToken);
      // useAuthStore.getState().setTokens({
      //   accessToken: response.accessToken,
      //   refreshToken: response.refreshToken,
      //   expiresAt: response.expiresAt,
      // });
      // return true;

      return false;
    } catch {
      storeLogout();
      return false;
    }
  }, [storeLogout]);

  return {
    user,
    isAuthenticated,
    isLoading,
    isInitialized,
    login,
    register,
    logout,
    refreshSession,
  };
};

export default useAuth;
