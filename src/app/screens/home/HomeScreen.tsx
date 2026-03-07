import React from 'react';
import {View, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity} from 'react-native';
import {useNavigation} from '@react-navigation/native';

import {useTheme} from '@state/hooks/useTheme';
import {useUserStore} from '@state/stores/userStore';
import {useProgressStore} from '@state/stores/progressStore';
import {Text, Button, Card, Avatar, ProgressBar} from '@ui/components';
import {spacing} from '@ui/theme';
import type {MainTabScreenProps} from '@appTypes/navigation';

type NavigationProp = MainTabScreenProps<'HomeTab'>['navigation'];

export const HomeScreen: React.FC = () => {
  const {colors} = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const {profile} = useUserStore();
  const {currentStreak, overview} = useProgressStore();

  const targetLanguageName = getLanguageName(profile?.targetLanguage?.code);

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: colors.background.primary}]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text variant="bodyMedium" color="secondary">
              Bentornato,
            </Text>
            <Text variant="headlineSmall">{profile?.name || 'Learner'}</Text>
          </View>
          <TouchableOpacity
            onPress={() =>
              navigation.navigate('SettingsTab', {screen: 'Profile'})
            }>
            <Avatar name={profile?.name || 'U'} size="medium" />
          </TouchableOpacity>
        </View>

        {/* Streak Card */}
        <Card variant="elevated" style={styles.streakCard}>
          <View style={styles.streakContent}>
            <View style={[styles.streakIcon, {backgroundColor: colors.semantic.warningLight}]}>
              <Text style={styles.streakEmoji}>{' '}</Text>
            </View>
            <View style={styles.streakInfo}>
              <Text variant="titleLarge">{currentStreak} giorni consecutivi</Text>
              <Text variant="bodySmall" color="secondary">
                Stai costruendo una continuità
              </Text>
            </View>
          </View>
        </Card>

        {/* Quick Start */}
        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Inizia
          </Text>
          <View style={styles.quickStartGrid}>
            <QuickStartCard
              title="Chat"
              description="Text conversation"
              emoji="💬"
              color={colors.brand.primaryLight}
              onPress={() =>
                navigation.navigate('ConversationTab', {
                  screen: 'Chat',
                  params: {},
                })
              }
            />
            <QuickStartCard
              title="Voice Call"
              description="Practice speaking"
              emoji="📞"
              color={colors.semantic.successLight}
              onPress={() =>
                navigation.navigate('ConversationTab', {
                  screen: 'Call',
                  params: {},
                })
              }
            />
          </View>
        </View>

        {/* Progress Overview */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text variant="titleMedium">Il tuo percorso</Text>
            <TouchableOpacity
              onPress={() =>
                navigation.navigate('ProgressTab', {screen: 'ProgressDashboard'})
              }>
              <Text variant="bodyMedium" color="link">
                See all
              </Text>
            </TouchableOpacity>
          </View>

          <Card variant="outlined" style={styles.progressCard}>
            <View style={styles.progressItem}>
              <View style={styles.progressHeader}>
                <Text variant="bodyMedium">Speaking Time</Text>
                <Text variant="titleSmall">
                  {overview?.totalSpeakingTimeMinutes || 0} min
                </Text>
              </View>
              <ProgressBar progress={Math.min(100, (overview?.totalSpeakingTimeMinutes || 0) / 60 * 100)} />
            </View>

            <View style={styles.progressItem}>
              <View style={styles.progressHeader}>
                <Text variant="bodyMedium">Sessions</Text>
                <Text variant="titleSmall">{overview?.totalSessions || 0}</Text>
              </View>
              <ProgressBar
                progress={Math.min(100, (overview?.totalSessions || 0) * 10)}
                color={colors.brand.secondary}
              />
            </View>

            <View style={styles.levelBadges}>
              <LevelBadge label="Grammar" level={profile?.estimatedLevels?.grammar || 'A1'} />
              <LevelBadge label="Vocabulary" level={profile?.estimatedLevels?.vocabulary || 'A1'} />
              <LevelBadge label="Fluency" level={profile?.estimatedLevels?.fluency || 'A1'} />
            </View>
          </Card>
        </View>

        {/* Learning Tips */}
        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Una nota
          </Text>
          <Card
            variant="default"
            style={[styles.tipCard, {backgroundColor: colors.brand.primaryLight}]}>
            <Text variant="bodyLarge" style={{color: colors.brand.primaryDark}}>
              Anche pochi minuti ogni giorno costruiscono qualcosa. Non conta la durata, conta la presenza.
            </Text>
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

interface QuickStartCardProps {
  title: string;
  description: string;
  emoji: string;
  color: string;
  onPress: () => void;
}

const QuickStartCard: React.FC<QuickStartCardProps> = ({
  title,
  description,
  emoji,
  color,
  onPress,
}) => (
  <TouchableOpacity style={styles.quickStartItem} onPress={onPress} activeOpacity={0.7}>
    <Card variant="elevated" style={[styles.quickStartCard, {backgroundColor: color}]}>
      <Text style={styles.quickStartEmoji}>{emoji}</Text>
      <Text variant="titleSmall">{title}</Text>
      <Text variant="caption" color="secondary">
        {description}
      </Text>
    </Card>
  </TouchableOpacity>
);

interface LevelBadgeProps {
  label: string;
  level: string;
}

const LevelBadge: React.FC<LevelBadgeProps> = ({label, level}) => {
  const {colors} = useTheme();
  return (
    <View style={styles.levelBadge}>
      <Text variant="caption" color="secondary">
        {label}
      </Text>
      <View
        style={[
          styles.levelPill,
          {backgroundColor: colors.levels[level as keyof typeof colors.levels] || colors.text.secondary},
        ]}>
        <Text variant="labelSmall" style={{color: '#FFF'}}>
          {level}
        </Text>
      </View>
    </View>
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
  return names[code || ''] || 'Language';
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.screenHorizontal,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  headerLeft: {},
  streakCard: {
    marginHorizontal: spacing.screenHorizontal,
    marginBottom: spacing.lg,
  },
  streakContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  streakIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  streakEmoji: {
    fontSize: 24,
  },
  streakInfo: {},
  section: {
    paddingHorizontal: spacing.screenHorizontal,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    marginBottom: spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  quickStartGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  quickStartItem: {
    flex: 1,
  },
  quickStartCard: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  quickStartEmoji: {
    fontSize: 32,
    marginBottom: spacing.xs,
  },
  progressCard: {
    padding: spacing.md,
  },
  progressItem: {
    marginBottom: spacing.md,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  levelBadges: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: spacing.sm,
  },
  levelBadge: {
    alignItems: 'center',
  },
  levelPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: 12,
    marginTop: spacing.xxs,
  },
  tipCard: {
    padding: spacing.md,
  },
});

export default HomeScreen;
