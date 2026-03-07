import React, {useState} from 'react';
import {View, StyleSheet, SafeAreaView, TouchableOpacity} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';

import {useTheme} from '@state/hooks/useTheme';
import {Text, Button, Card} from '@ui/components';
import {spacing} from '@ui/theme';
import type {OnboardingStackScreenProps} from '@appTypes/navigation';
import type {CEFRLevel} from '@appTypes/domain';

type NavigationProp = OnboardingStackScreenProps<'LevelAssessment'>['navigation'];
type RouteProp = OnboardingStackScreenProps<'LevelAssessment'>['route'];

interface LevelOption {
  level: CEFRLevel;
  title: string;
  description: string;
}

const levels: LevelOption[] = [
  {
    level: 'A1',
    title: 'Complete Beginner',
    description: 'I know very few words or none at all',
  },
  {
    level: 'A2',
    title: 'Elementary',
    description: 'I can understand basic phrases and introduce myself',
  },
  {
    level: 'B1',
    title: 'Intermediate',
    description: 'I can handle most travel situations and simple conversations',
  },
  {
    level: 'B2',
    title: 'Upper Intermediate',
    description: 'I can discuss complex topics with some difficulty',
  },
  {
    level: 'C1',
    title: 'Advanced',
    description: 'I can express myself fluently and spontaneously',
  },
  {
    level: 'C2',
    title: 'Proficient',
    description: 'I can understand virtually everything and express myself precisely',
  },
];

export const LevelAssessmentScreen: React.FC = () => {
  const {colors} = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProp>();

  const {nativeLanguage, targetLanguage, goal} = route.params;
  const [selected, setSelected] = useState<CEFRLevel | null>(null);

  const handleContinue = () => {
    if (!selected) return;

    navigation.navigate('Preferences', {
      nativeLanguage,
      targetLanguage,
      goal,
    });
  };

  const getLevelColor = (level: CEFRLevel): string => {
    return colors.levels[level] || colors.text.secondary;
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
          STEP 5 OF 6
        </Text>
        <Text variant="headlineMedium" style={styles.title}>
          How would you describe your current level?
        </Text>
        <Text variant="bodyLarge" color="secondary">
          Don't worry, we'll adjust based on your actual conversations
        </Text>
      </View>

      <View style={styles.content}>
        {levels.map((levelOption) => (
          <TouchableOpacity
            key={levelOption.level}
            onPress={() => setSelected(levelOption.level)}
            activeOpacity={0.7}>
            <Card
              variant={selected === levelOption.level ? 'outlined' : 'default'}
              style={[
                styles.levelCard,
                selected === levelOption.level && {
                  borderColor: colors.brand.primary,
                  backgroundColor: colors.brand.primaryLight,
                },
              ]}>
              <View
                style={[
                  styles.levelBadge,
                  {backgroundColor: getLevelColor(levelOption.level)},
                ]}>
                <Text variant="labelMedium" style={{color: colors.text.inverse}}>
                  {levelOption.level}
                </Text>
              </View>
              <View style={styles.levelInfo}>
                <Text variant="titleSmall">{levelOption.title}</Text>
                <Text variant="bodySmall" color="secondary">
                  {levelOption.description}
                </Text>
              </View>
              {selected === levelOption.level && (
                <View style={[styles.checkmark, {backgroundColor: colors.brand.primary}]}>
                  <Text style={{color: colors.text.inverse}}>✓</Text>
                </View>
              )}
            </Card>
          </TouchableOpacity>
        ))}
      </View>

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
    paddingBottom: spacing.md,
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
    paddingHorizontal: spacing.screenHorizontal,
    gap: spacing.xs,
  },
  levelCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
  },
  levelBadge: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  levelInfo: {
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

export default LevelAssessmentScreen;
