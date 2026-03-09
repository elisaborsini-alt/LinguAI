import type {LoginRequest, RegisterRequest} from '@appTypes/api';
import type {UserProfile} from '@appTypes/domain';
import {useAuthStore} from '@state/stores/authStore';
import {useUserStore} from '@state/stores/userStore';
import {useCallback} from 'react';


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

  const createMockUser = useCallback(
    (email: string, name?: string): UserProfile => ({
      id: 'dev-user-1',
      email,
      name: name ?? 'Dev User',
      nativeLanguage: 'en',
      targetLanguage: {code: 'es', variant: 'es-ES'},
      currentGoal: 'conversation',
      estimatedLevels: {
        grammar: 'A1',
        vocabulary: 'A1',
        fluency: 'A1',
        overall: 'A1',
        confidence: 0,
        lastUpdated: new Date(),
      },
      preferences: {
        correctionIntensity: 'moderate',
        speakingSpeed: 'normal',
        voiceGender: 'female',
        sessionLengthMinutes: 15,
        notificationsEnabled: true,
        hapticFeedback: true,
      },
      onboardingCompleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
    [],
  );

  const mockTokens = {
    accessToken: 'dev-token',
    refreshToken: 'dev-refresh',
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
  };

  const login = useCallback(
    async (credentials: LoginRequest) => {
      setLoading(true);
      try {
        // TODO: Replace with actual API call when backend auth is ready
        // const response = await authApi.login(credentials);
        const mockUser = createMockUser(credentials.email);
        storeLogin(mockUser, mockTokens);
        setProfile(mockUser);
      } catch (error) {
        setLoading(false);
        throw error;
      }
    },
    [setLoading, storeLogin, setProfile, createMockUser],
  );

  const register = useCallback(
    async (data: RegisterRequest) => {
      setLoading(true);
      try {
        // TODO: Replace with actual API call when backend auth is ready
        // const response = await authApi.register(data);
        const mockUser = createMockUser(data.email, data.name);
        storeLogin(mockUser, mockTokens);
        setProfile(mockUser);
      } catch (error) {
        setLoading(false);
        throw error;
      }
    },
    [setLoading, storeLogin, setProfile, createMockUser],
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
