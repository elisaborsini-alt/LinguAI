import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';

import type {OnboardingStackParamList} from '@appTypes/navigation';

import NativeLanguageScreen from '@app/screens/onboarding/NativeLanguageScreen';
import TargetLanguageScreen from '@app/screens/onboarding/TargetLanguageScreen';
import LanguageVariantScreen from '@app/screens/onboarding/LanguageVariantScreen';
import GoalSelectScreen from '@app/screens/onboarding/GoalSelectScreen';
import LevelAssessmentScreen from '@app/screens/onboarding/LevelAssessmentScreen';
import PlacementChatScreen from '@app/screens/onboarding/PlacementChatScreen';
import PreferencesScreen from '@app/screens/onboarding/PreferencesScreen';
import OnboardingCompleteScreen from '@app/screens/onboarding/OnboardingCompleteScreen';

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

export const OnboardingNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        gestureEnabled: true,
      }}>
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
