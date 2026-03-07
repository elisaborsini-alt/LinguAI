import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {View, StyleSheet} from 'react-native';

import {useTheme} from '@state/hooks/useTheme';
import type {
  MainTabParamList,
  HomeStackParamList,
  ConversationStackParamList,
  ProgressStackParamList,
  SettingsStackParamList,
} from '@appTypes/navigation';

// Home screens
import HomeScreen from '@app/screens/home/HomeScreen';

// Conversation screens
import ConversationHomeScreen from '@app/screens/conversation/ConversationHomeScreen';
import ChatScreen from '@app/screens/conversation/ChatScreen';
import CallScreen from '@app/screens/conversation/CallScreen';
import ScenarioSelectScreen from '@app/screens/conversation/ScenarioSelectScreen';
import PronunciationPracticeScreen from '@app/screens/conversation/PronunciationPracticeScreen';
import PronunciationSessionScreen from '@app/screens/conversation/PronunciationSessionScreen';
import PronunciationResultsScreen from '@app/screens/conversation/PronunciationResultsScreen';
import SessionSummaryScreen from '@app/screens/conversation/SessionSummaryScreen';

// Progress screens
import ProgressDashboardScreen from '@app/screens/progress/ProgressDashboardScreen';
import SessionReportScreen from '@app/screens/progress/SessionReportScreen';
import TimeMachineScreen from '@app/screens/progress/TimeMachineScreen';

// Settings screens
import SettingsScreen from '@app/screens/settings/SettingsScreen';
import ProfileScreen from '@app/screens/settings/ProfileScreen';

// Tab icons (using simple View placeholders - replace with actual icons)
const TabIcon = ({focused, color}: {focused: boolean; color: string}) => (
  <View style={[styles.tabIcon, {backgroundColor: focused ? color : 'transparent'}]} />
);

// Stack navigators for each tab
const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const ConversationStack = createNativeStackNavigator<ConversationStackParamList>();
const ProgressStack = createNativeStackNavigator<ProgressStackParamList>();
const SettingsStack = createNativeStackNavigator<SettingsStackParamList>();

const Tab = createBottomTabNavigator<MainTabParamList>();

// Home Tab Stack
const HomeStackNavigator = () => (
  <HomeStack.Navigator screenOptions={{headerShown: false}}>
    <HomeStack.Screen name="Home" component={HomeScreen} />
  </HomeStack.Navigator>
);

// Conversation Tab Stack
const ConversationStackNavigator = () => (
  <ConversationStack.Navigator screenOptions={{headerShown: false}}>
    <ConversationStack.Screen name="ConversationHome" component={ConversationHomeScreen} />
    <ConversationStack.Screen name="ScenarioSelect" component={ScenarioSelectScreen} />
    <ConversationStack.Screen
      name="Chat"
      component={ChatScreen}
      options={{gestureEnabled: false}}
    />
    <ConversationStack.Screen
      name="Call"
      component={CallScreen}
      options={{gestureEnabled: false}}
    />
    <ConversationStack.Screen
      name="SessionSummary"
      component={SessionSummaryScreen}
      options={{gestureEnabled: false}}
    />
    <ConversationStack.Screen
      name="PronunciationPractice"
      component={PronunciationPracticeScreen}
    />
    <ConversationStack.Screen
      name="PronunciationSession"
      component={PronunciationSessionScreen}
    />
    <ConversationStack.Screen
      name="PronunciationResults"
      component={PronunciationResultsScreen}
    />
  </ConversationStack.Navigator>
);

// Progress Tab Stack
const ProgressStackNavigator = () => (
  <ProgressStack.Navigator screenOptions={{headerShown: false}}>
    <ProgressStack.Screen name="ProgressDashboard" component={ProgressDashboardScreen} />
    <ProgressStack.Screen name="SessionReport" component={SessionReportScreen} />
    <ProgressStack.Screen name="TimeMachine" component={TimeMachineScreen} />
  </ProgressStack.Navigator>
);

// Settings Tab Stack
const SettingsStackNavigator = () => (
  <SettingsStack.Navigator screenOptions={{headerShown: false}}>
    <SettingsStack.Screen name="Settings" component={SettingsScreen} />
    <SettingsStack.Screen name="Profile" component={ProfileScreen} />
  </SettingsStack.Navigator>
);

export const MainNavigator: React.FC = () => {
  const {colors} = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.background.primary,
          borderTopColor: colors.border.light,
          paddingTop: 8,
          paddingBottom: 8,
          height: 60,
        },
        tabBarActiveTintColor: colors.brand.primary,
        tabBarInactiveTintColor: colors.text.tertiary,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      }}>
      <Tab.Screen
        name="HomeTab"
        component={HomeStackNavigator}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({focused, color}) => <TabIcon focused={focused} color={color} />,
        }}
      />
      <Tab.Screen
        name="ConversationTab"
        component={ConversationStackNavigator}
        options={{
          tabBarLabel: 'Practice',
          tabBarIcon: ({focused, color}) => <TabIcon focused={focused} color={color} />,
        }}
      />
      <Tab.Screen
        name="ProgressTab"
        component={ProgressStackNavigator}
        options={{
          tabBarLabel: 'Progress',
          tabBarIcon: ({focused, color}) => <TabIcon focused={focused} color={color} />,
        }}
      />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsStackNavigator}
        options={{
          tabBarLabel: 'Settings',
          tabBarIcon: ({focused, color}) => <TabIcon focused={focused} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'currentColor',
  },
});

export default MainNavigator;
