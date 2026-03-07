import {MMKV} from 'react-native-mmkv';

// Main storage instance
export const storage = new MMKV({
  id: 'linguaai-storage',
  encryptionKey: 'linguaai-encryption-key', // In production, use a secure key
});

// Secure storage for sensitive data (tokens, etc.)
export const secureStorage = new MMKV({
  id: 'linguaai-secure-storage',
  encryptionKey: 'linguaai-secure-encryption-key', // In production, use keychain
});

// Storage keys
export const StorageKeys = {
  // Auth
  ACCESS_TOKEN: 'accessToken',
  REFRESH_TOKEN: 'refreshToken',
  TOKEN_EXPIRY: 'tokenExpiry',

  // User
  USER_PROFILE: 'userProfile',
  USER_PREFERENCES: 'userPreferences',
  ONBOARDING_COMPLETED: 'onboardingCompleted',

  // Settings
  THEME_MODE: 'themeMode',
  LANGUAGE: 'appLanguage',

  // Cache
  MEMORY_CACHE: 'memoryCache',
  LAST_SYNC: 'lastSync',
} as const;

// Helper functions
export const storageHelpers = {
  // Generic getters/setters
  getString: (key: string): string | undefined => {
    return storage.getString(key);
  },

  setString: (key: string, value: string): void => {
    storage.set(key, value);
  },

  getNumber: (key: string): number | undefined => {
    return storage.getNumber(key);
  },

  setNumber: (key: string, value: number): void => {
    storage.set(key, value);
  },

  getBoolean: (key: string): boolean | undefined => {
    return storage.getBoolean(key);
  },

  setBoolean: (key: string, value: boolean): void => {
    storage.set(key, value);
  },

  getObject: <T>(key: string): T | undefined => {
    const value = storage.getString(key);
    if (value) {
      try {
        return JSON.parse(value) as T;
      } catch {
        return undefined;
      }
    }
    return undefined;
  },

  setObject: <T>(key: string, value: T): void => {
    storage.set(key, JSON.stringify(value));
  },

  delete: (key: string): void => {
    storage.delete(key);
  },

  contains: (key: string): boolean => {
    return storage.contains(key);
  },

  clearAll: (): void => {
    storage.clearAll();
  },

  // Secure storage operations
  secure: {
    getString: (key: string): string | undefined => {
      return secureStorage.getString(key);
    },

    setString: (key: string, value: string): void => {
      secureStorage.set(key, value);
    },

    delete: (key: string): void => {
      secureStorage.delete(key);
    },

    clearAll: (): void => {
      secureStorage.clearAll();
    },
  },
};

export default storage;
