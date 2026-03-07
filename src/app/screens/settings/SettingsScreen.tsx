import React from 'react';
import {View, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Alert} from 'react-native';
import {useNavigation} from '@react-navigation/native';

import {useTheme} from '@state/hooks/useTheme';
import {useAuth} from '@state/hooks/useAuth';
import {useUserStore} from '@state/stores/userStore';
import {Text, Card, Avatar, Divider} from '@ui/components';
import {spacing} from '@ui/theme';
import type {SettingsStackScreenProps} from '@appTypes/navigation';

type NavigationProp = SettingsStackScreenProps<'Settings'>['navigation'];

export const SettingsScreen: React.FC = () => {
  const {colors} = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const {logout} = useAuth();
  const {profile, preferences} = useUserStore();

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: () => logout(),
        },
      ],
    );
  };

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: colors.background.primary}]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text variant="headlineMedium">Settings</Text>
        </View>

        {/* Profile Card */}
        <TouchableOpacity
          onPress={() => navigation.navigate('Profile')}
          activeOpacity={0.7}>
          <Card variant="outlined" style={styles.profileCard}>
            <Avatar name={profile?.name || 'U'} size="large" />
            <View style={styles.profileInfo}>
              <Text variant="titleMedium">{profile?.name || 'User'}</Text>
              <Text variant="bodySmall" color="secondary">
                {profile?.email}
              </Text>
            </View>
            <Text variant="bodyLarge" color="tertiary">
              →
            </Text>
          </Card>
        </TouchableOpacity>

        {/* Language Settings */}
        <View style={styles.section}>
          <Text variant="labelMedium" color="secondary" style={styles.sectionLabel}>
            LANGUAGE
          </Text>
          <Card variant="outlined" padding={0}>
            <SettingsItem
              title="Learning"
              value={`${getLanguageName(profile?.targetLanguage?.code)} (${profile?.targetLanguage?.variant})`}
              onPress={() => {}}
            />
            <Divider spacing="none" />
            <SettingsItem
              title="Native Language"
              value={getLanguageName(profile?.nativeLanguage)}
              onPress={() => {}}
            />
            <Divider spacing="none" />
            <SettingsItem
              title="Current Goal"
              value={formatGoal(profile?.currentGoal)}
              onPress={() => {}}
            />
          </Card>
        </View>

        {/* Preferences */}
        <View style={styles.section}>
          <Text variant="labelMedium" color="secondary" style={styles.sectionLabel}>
            PREFERENCES
          </Text>
          <Card variant="outlined" padding={0}>
            <SettingsItem
              title="Error Corrections"
              value={preferences?.correctionIntensity || 'Moderate'}
              onPress={() => {}}
            />
            <Divider spacing="none" />
            <SettingsItem
              title="AI Speaking Speed"
              value={preferences?.speakingSpeed || 'Normal'}
              onPress={() => {}}
            />
            <Divider spacing="none" />
            <SettingsItem
              title="AI Voice"
              value={preferences?.voiceGender || 'Female'}
              onPress={() => {}}
            />
            <Divider spacing="none" />
            <SettingsItem
              title="Session Length"
              value={`${preferences?.sessionLengthMinutes || 15} minutes`}
              onPress={() => {}}
            />
          </Card>
        </View>

        {/* App Settings */}
        <View style={styles.section}>
          <Text variant="labelMedium" color="secondary" style={styles.sectionLabel}>
            APP
          </Text>
          <Card variant="outlined" padding={0}>
            <SettingsItem title="Notifications" value="On" onPress={() => {}} />
            <Divider spacing="none" />
            <SettingsItem title="Haptic Feedback" value="On" onPress={() => {}} />
          </Card>
        </View>

        {/* About */}
        <View style={styles.section}>
          <Text variant="labelMedium" color="secondary" style={styles.sectionLabel}>
            ABOUT
          </Text>
          <Card variant="outlined" padding={0}>
            <SettingsItem title="Privacy Policy" onPress={() => {}} />
            <Divider spacing="none" />
            <SettingsItem title="Terms of Service" onPress={() => {}} />
            <Divider spacing="none" />
            <SettingsItem title="Version" value="1.0.0" disabled />
          </Card>
        </View>

        {/* Logout */}
        <View style={styles.section}>
          <TouchableOpacity onPress={handleLogout}>
            <Card
              variant="outlined"
              style={[styles.logoutCard, {borderColor: colors.semantic.error}]}>
              <Text variant="bodyLarge" color="error" align="center">
                Log Out
              </Text>
            </Card>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

interface SettingsItemProps {
  title: string;
  value?: string;
  onPress?: () => void;
  disabled?: boolean;
}

const SettingsItem: React.FC<SettingsItemProps> = ({title, value, onPress, disabled}) => {
  const {colors} = useTheme();

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || !onPress}
      style={styles.settingsItem}
      activeOpacity={0.7}>
      <Text variant="bodyLarge">{title}</Text>
      <View style={styles.settingsItemRight}>
        {value && (
          <Text variant="bodyMedium" color="secondary">
            {value}
          </Text>
        )}
        {!disabled && onPress && (
          <Text variant="bodyMedium" color="tertiary" style={styles.chevron}>
            →
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

const getLanguageName = (code?: string): string => {
  const names: Record<string, string> = {
    en: 'English',
    es: 'Spanish',
    pt: 'Portuguese',
    fr: 'French',
    de: 'German',
    it: 'Italian',
    ar: 'Arabic',
  };
  return names[code || ''] || 'Not set';
};

const formatGoal = (goal?: string): string => {
  if (!goal) return 'Not set';
  return goal.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  header: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.screenHorizontal,
    padding: spacing.md,
  },
  profileInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  section: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.screenHorizontal,
  },
  sectionLabel: {
    marginBottom: spacing.xs,
    marginLeft: spacing.xs,
  },
  settingsItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 48,
  },
  settingsItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chevron: {
    marginLeft: spacing.xs,
  },
  logoutCard: {
    padding: spacing.md,
  },
});

export default SettingsScreen;
