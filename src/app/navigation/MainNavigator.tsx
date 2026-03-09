// Conversation screens
import CallScreen from '@app/screens/conversation/CallScreen';
import ChatScreen from '@app/screens/conversation/ChatScreen';
import ConversationHomeScreen from '@app/screens/conversation/ConversationHomeScreen';
import PronunciationPracticeScreen from '@app/screens/conversation/PronunciationPracticeScreen';
import PronunciationResultsScreen from '@app/screens/conversation/PronunciationResultsScreen';
import PronunciationSessionScreen from '@app/screens/conversation/PronunciationSessionScreen';
import ScenarioSelectScreen from '@app/screens/conversation/ScenarioSelectScreen';
import SessionSummaryScreen from '@app/screens/conversation/SessionSummaryScreen';
import HomeScreen from '@app/screens/home/HomeScreen';
import ProgressDashboardScreen from '@app/screens/progress/ProgressDashboardScreen';
import SessionReportScreen from '@app/screens/progress/SessionReportScreen';
import TimeMachineScreen from '@app/screens/progress/TimeMachineScreen';
import ProfileScreen from '@app/screens/settings/ProfileScreen';
import SettingsScreen from '@app/screens/settings/SettingsScreen';
import type {
  MainTabParamList,
  HomeStackParamList,
  ConversationStackParamList,
  ProgressStackParamList,
  SettingsStackParamList,
} from '@appTypes/navigation';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {useTheme} from '@state/hooks/useTheme';
import React from 'react';
import {Text} from 'react-native';

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
          tabBarIcon: () => <Text style={{fontSize: 22}}>🏠</Text>,
        }}
      />
      <Tab.Screen
        name="ConversationTab"
        component={ConversationStackNavigator}
        options={{
          tabBarLabel: 'Practice',
          tabBarIcon: () => <Text style={{fontSize: 22}}>💬</Text>,
        }}
      />
      <Tab.Screen
        name="ProgressTab"
        component={ProgressStackNavigator}
        options={{
          tabBarLabel: 'Progress',
          tabBarIcon: () => <Text style={{fontSize: 22}}>📊</Text>,
        }}
      />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsStackNavigator}
        options={{
          tabBarLabel: 'Settings',
          tabBarIcon: () => <Text style={{fontSize: 22}}>⚙️</Text>,
        }}
      />
    </Tab.Navigator>
  );
};

export default MainNavigator;
