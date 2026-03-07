import React, {useState} from 'react';
import {View, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';

import {useTheme} from '@state/hooks/useTheme';
import {useUserStore} from '@state/stores/userStore';
import {Text, Button, Card} from '@ui/components';
import {spacing} from '@ui/theme';
import type {OnboardingStackScreenProps} from '@appTypes/navigation';
import type {LearningGoal} from '@appTypes/domain';

type NavigationProp = OnboardingStackScreenProps<'GoalSelect'>['navigation'];
type RouteProp = OnboardingStackScreenProps<'GoalSelect'>['route'];

interface GoalOption {
  id: LearningGoal;
  title: string;
  description: string;
  icon: string;
}

const goals: GoalOption[] = [
  {
    id: 'professional',
    title: 'Professional / Work',
    description: 'Business meetings, emails, presentations',
    icon: '💼',
  },
  {
    id: 'travel',
    title: 'Travel',
    description: 'Hotels, restaurants, directions, sightseeing',
    icon: '✈️',
  },
  {
    id: 'conversation',
    title: 'General Conversation',
    description: 'Everyday topics, fluency, confidence',
    icon: '💬',
  },
  {
    id: 'interviews',
    title: 'Job Interviews',
    description: 'Interview prep, professional responses',
    icon: '🎯',
  },
  {
    id: 'customer_support',
    title: 'Customer Support / Sales',
    description: 'Client calls, support scenarios, sales',
    icon: '🎧',
  },
  {
    id: 'social',
    title: 'Social / Dating',
    description: 'Casual conversations, making friends',
    icon: '🤝',
  },
];

export const GoalSelectScreen: React.FC = () => {
  const {colors} = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProp>();
  const {setOnboardingData} = useUserStore();

  const {nativeLanguage, targetLanguage} = route.params;
  const [selected, setSelected] = useState<LearningGoal | null>(null);

  const handleContinue = () => {
    if (!selected) return;

    setOnboardingData({goal: selected});

    navigation.navigate('PlacementChat', {
      nativeLanguage,
      targetLanguage,
      goal: selected,
    });
  };

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: colors.background.primary}]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text variant="bodyLarge" color="link">
            Back
          </Text>
        </TouchableOpacity>
        <Text variant="overline" color="secondary" style={styles.step}>
          STEP 4 OF 6
        </Text>
        <Text variant="headlineMedium" style={styles.title}>
          What's your main goal?
        </Text>
        <Text variant="bodyLarge" color="secondary">
          We'll tailor conversations to help you succeed
        </Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {goals.map((goal) => (
          <TouchableOpacity
            key={goal.id}
            onPress={() => setSelected(goal.id)}
            activeOpacity={0.7}>
            <Card
              variant={selected === goal.id ? 'outlined' : 'default'}
              style={[
                styles.goalCard,
                selected === goal.id && {
                  borderColor: colors.brand.primary,
                  backgroundColor: colors.brand.primaryLight,
                },
              ]}>
              <Text style={styles.icon}>{goal.icon}</Text>
              <View style={styles.goalInfo}>
                <Text variant="titleMedium">{goal.title}</Text>
                <Text variant="bodySmall" color="secondary">
                  {goal.description}
                </Text>
              </View>
              {selected === goal.id && (
                <View style={[styles.checkmark, {backgroundColor: colors.brand.primary}]}>
                  <Text style={{color: colors.text.inverse}}>✓</Text>
                </View>
              )}
            </Card>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title="Continue"
          onPress={handleContinue}
          disabled={!selected}
          fullWidth
          size="large"
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: spacing.md,
  },
  step: {
    marginBottom: spacing.xs,
  },
  title: {
    marginBottom: spacing.xs,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  goalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  icon: {
    fontSize: 32,
    marginRight: spacing.md,
  },
  goalInfo: {
    flex: 1,
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingVertical: spacing.lg,
  },
});

export default GoalSelectScreen;
