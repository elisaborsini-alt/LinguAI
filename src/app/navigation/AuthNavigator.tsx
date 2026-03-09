

import LoginScreen from '@app/screens/auth/LoginScreen';
import RegisterScreen from '@app/screens/auth/RegisterScreen';
import WelcomeScreen from '@app/screens/auth/WelcomeScreen';
import type {AuthStackParamList} from '@appTypes/navigation';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import React from 'react';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export const AuthNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}>
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
};

export default AuthNavigator;
