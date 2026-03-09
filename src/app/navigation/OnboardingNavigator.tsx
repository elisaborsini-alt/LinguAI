

import DeviceLanguageScreen from '@app/screens/onboarding/DeviceLanguageScreen';
import GoalSelectScreen from '@app/screens/onboarding/GoalSelectScreen';
import LanguageVariantScreen from '@app/screens/onboarding/LanguageVariantScreen';
import LevelAssessmentScreen from '@app/screens/onboarding/LevelAssessmentScreen';
import NativeLanguageScreen from '@app/screens/onboarding/NativeLanguageScreen';
import OnboardingCompleteScreen from '@app/screens/onboarding/OnboardingCompleteScreen';
import PlacementChatScreen from '@app/screens/onboarding/PlacementChatScreen';
import PreferencesScreen from '@app/screens/onboarding/PreferencesScreen';
import TargetLanguageScreen from '@app/screens/onboarding/TargetLanguageScreen';
import type {OnboardingStackParamList} from '@appTypes/navigation';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import React from 'react';

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

export const OnboardingNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        gestureEnabled: true,
      }}>
      <Stack.Screen name="DeviceLanguage" component={DeviceLanguageScreen} />
      <Stack.Screen name="NativeLanguage" component={NativeLanguageScreen} />
      <Stack.Screen name="TargetLanguage" component={TargetLanguageScreen} />
      <Stack.Screen name="LanguageVariant" component={LanguageVariantScreen} />
      <Stack.Screen name="GoalSelect" component={GoalSelectScreen} />
      <Stack.Screen name="PlacementChat" component={PlacementChatScreen} />
      <Stack.Screen name="LevelAssessment" component={LevelAssessmentScreen} />
      <Stack.Screen name="Preferences" component={PreferencesScreen} />
      <Stack.Screen
        name="OnboardingComplete"
        component={OnboardingCompleteScreen}
        options={{gestureEnabled: false}}
      />
    </Stack.Navigator>
  );
};

export default OnboardingNavigator;
