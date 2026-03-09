import type {LearningGoal} from '@appTypes/domain';
import type {ConversationStackScreenProps} from '@appTypes/navigation';
import {useNavigation} from '@react-navigation/native';
import {useTheme} from '@state/hooks/useTheme';
import {useUserStore} from '@state/stores/userStore';
import {Text, Card} from '@ui/components';
import {spacing} from '@ui/theme';
import React from 'react';
import {View, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity} from 'react-native';

type NavigationProp = ConversationStackScreenProps<'ConversationHome'>['navigation'];

interface ScenarioOption {
  id: string;
  title: string;
  description: string;
  emoji: string;
  goal: LearningGoal;
}

const scenarios: ScenarioOption[] = [
  {
    id: 'free_conversation',
    title: 'Free Conversation',
    description: 'Talk about anything you want',
    emoji: '💬',
    goal: 'conversation',
  },
  {
    id: 'job_interview',
    title: 'Job Interview',
    description: 'Practice answering interview questions',
    emoji: '💼',
    goal: 'interviews',
  },
  {
    id: 'business_meeting',
    title: 'Business Meeting',
    description: 'Discuss projects and collaborate',
    emoji: '📊',
    goal: 'professional',
  },
  {
    id: 'hotel_checkin',
    title: 'Hotel Check-in',
    description: 'Book a room and ask about amenities',
    emoji: '🏨',
    goal: 'travel',
  },
  {
    id: 'restaurant',
    title: 'At a Restaurant',
    description: 'Order food and ask for recommendations',
    emoji: '🍽️',
    goal: 'travel',
  },
  {
    id: 'customer_call',
    title: 'Customer Support Call',
    description: 'Handle customer inquiries',
    emoji: '🎧',
    goal: 'customer_support',
  },
];

export const ConversationHomeScreen: React.FC = () => {
  const {colors} = useTheme();
  const navigation = useNavigation<NavigationProp>();
  useUserStore();

  const handleStartChat = (scenarioId?: string) => {
    navigation.navigate('Chat', {
      scenario: scenarioId
        ? {
            id: scenarioId,
            type: scenarioId,
            description: scenarios.find((s) => s.id === scenarioId)?.title || '',
            aiRole: 'AI Tutor',
            userRole: 'Learner',
          }
        : undefined,
    });
  };

  const handleStartCall = (scenarioId?: string) => {
    navigation.navigate('Call', {
      scenario: scenarioId
        ? {
            id: scenarioId,
            type: scenarioId,
            description: scenarios.find((s) => s.id === scenarioId)?.title || '',
            aiRole: 'AI Tutor',
            userRole: 'Learner',
          }
        : undefined,
    });
  };

  const handlePronunciationPractice = () => {
    navigation.navigate('PronunciationPractice');
  };

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: colors.background.primary}]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text variant="headlineMedium">Practice</Text>
          <Text variant="bodyLarge" color="secondary">
            Choose how you want to practice today
          </Text>
        </View>

        {/* Mode Selection */}
        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Practice Mode
          </Text>
          <View style={styles.modeGrid}>
            <TouchableOpacity
              style={styles.modeItem}
              onPress={() => handleStartChat()}
              activeOpacity={0.7}>
              <Card
                variant="elevated"
                style={[styles.modeCard, {backgroundColor: colors.brand.primaryLight}]}>
                <Text style={styles.modeEmoji}>💬</Text>
                <Text variant="titleMedium">Text Chat</Text>
                <Text variant="bodySmall" color="secondary" align="center">
                  Type your responses at your own pace
                </Text>
              </Card>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modeItem}
              onPress={() => handleStartCall()}
              activeOpacity={0.7}>
              <Card
                variant="elevated"
                style={[styles.modeCard, {backgroundColor: colors.semantic.successLight}]}>
                <Text style={styles.modeEmoji}>📞</Text>
                <Text variant="titleMedium">Voice Call</Text>
                <Text variant="bodySmall" color="secondary" align="center">
                  Speak naturally like a real call
                </Text>
              </Card>
            </TouchableOpacity>
          </View>

          {/* Pronunciation Practice Card */}
          <TouchableOpacity
            onPress={handlePronunciationPractice}
            activeOpacity={0.7}
            style={styles.pronunciationCard}>
            <Card
              variant="elevated"
              style={[styles.fullWidthModeCard, {backgroundColor: colors.brand.primaryLight}]}>
              <View style={styles.pronunciationContent}>
                <Text style={styles.modeEmoji}>🎤</Text>
                <View style={styles.pronunciationText}>
                  <Text variant="titleMedium">Pronunciation Practice</Text>
                  <Text variant="bodySmall" color="secondary">
                    Compare your pronunciation with native speakers
                  </Text>
                </View>
                <Text variant="bodyLarge" color="tertiary">→</Text>
              </View>
            </Card>
          </TouchableOpacity>
        </View>

        {/* Scenarios */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Practice Scenarios
              </Text>
              <Text variant="bodyMedium" color="secondary">
                Choose a specific situation to practice
              </Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('ScenarioSelect', {})}>
              <Text variant="bodyMedium" color="link">See all</Text>
            </TouchableOpacity>
          </View>

          {scenarios.slice(0, 4).map((scenario) => (
            <TouchableOpacity
              key={scenario.id}
              onPress={() => handleStartCall(scenario.id)}
              activeOpacity={0.7}>
              <Card variant="outlined" style={styles.scenarioCard}>
                <Text style={styles.scenarioEmoji}>{scenario.emoji}</Text>
                <View style={styles.scenarioInfo}>
                  <Text variant="titleSmall">{scenario.title}</Text>
                  <Text variant="bodySmall" color="secondary">
                    {scenario.description}
                  </Text>
                </View>
                <Text variant="bodySmall" color="tertiary">
                  →
                </Text>
              </Card>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
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
  section: {
    paddingHorizontal: spacing.screenHorizontal,
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    marginBottom: spacing.xxs,
  },
  modeGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  modeItem: {
    flex: 1,
  },
  modeCard: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  modeEmoji: {
    fontSize: 40,
    marginBottom: spacing.sm,
  },
  scenarioCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    marginBottom: spacing.xs,
  },
  scenarioEmoji: {
    fontSize: 32,
    marginRight: spacing.md,
  },
  scenarioInfo: {
    flex: 1,
  },
  pronunciationCard: {
    marginTop: spacing.sm,
  },
  fullWidthModeCard: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  pronunciationContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pronunciationText: {
    flex: 1,
    marginLeft: spacing.md,
  },
});

export default ConversationHomeScreen;
