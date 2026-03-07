import React, {useEffect} from 'react';
import {StatusBar, LogBox} from 'react-native';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {SafeAreaProvider} from 'react-native-safe-area-context';

import {RootNavigator} from '@app/navigation';
import {useAuthStore} from '@state/stores/authStore';
import {useTheme} from '@state/hooks/useTheme';

// Ignore specific warnings in development
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
]);

const App: React.FC = () => {
  const {setInitialized} = useAuthStore();
  const {isDark} = useTheme();

  // Initialize app on mount
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Hydrate stores from storage
        // This happens automatically with Zustand persist middleware

        // Check if user is authenticated
        // If tokens exist, validate them or refresh if needed

        // Mark app as initialized
        setInitialized(true);
      } catch (error) {
        console.error('App initialization error:', error);
        setInitialized(true);
      }
    };

    initializeApp();
  }, [setInitialized]);

  return (
    <GestureHandlerRootView style={{flex: 1}}>
      <SafeAreaProvider>
        <StatusBar
          barStyle={isDark ? 'light-content' : 'dark-content'}
          backgroundColor="transparent"
          translucent
        />
        <RootNavigator />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

export default App;
