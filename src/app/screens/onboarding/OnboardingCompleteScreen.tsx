
import {useTheme} from '@state/hooks/useTheme';
import {useAuthStore} from '@state/stores/authStore';
import {useUserStore} from '@state/stores/userStore';
import {Text, Button} from '@ui/components';
import {spacing} from '@ui/theme';
import React from 'react';
import {View, StyleSheet, SafeAreaView} from 'react-native';

export const OnboardingCompleteScreen: React.FC = () => {
  const {colors} = useTheme();
  const {onboardingData} = useUserStore();
  const {user, updateUser} = useAuthStore();

  const handleStart = () => {
    // Mark onboarding as complete
    if (user) {
      updateUser({
        ...user,
        nativeLanguage: onboardingData.nativeLanguage!,
        targetLanguage: onboardingData.targetLanguage!,
        currentGoal: onboardingData.goal!,
        onboardingCompleted: true,
      });
    }
  };

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: colors.background.primary}]}>
      <View style={styles.content}>
        {/* Success Icon */}
        <View style={[styles.iconContainer, {backgroundColor: colors.semantic.successLight}]}>
          <Text style={styles.icon}>L</Text>
        </View>

        <Text variant="headlineLarge" align="center" style={styles.title}>
          Tutto pronto
        </Text>

        <Text variant="bodyLarge" color="secondary" align="center" style={styles.subtitle}>
          Abbiamo preparato tutto per te. Quando vuoi, possiamo cominciare.
        </Text>

        {/* Summary */}
        <View style={[styles.summaryCard, {backgroundColor: colors.background.secondary}]}>
          <SummaryItem
            label="Learning"
            value={`${onboardingData.targetLanguage?.code.toUpperCase()} (${onboardingData.targetLanguage?.variant})`}
          />
          <SummaryItem label="Goal" value={formatGoal(onboardingData.goal)} />
          <SummaryItem
            label="Session Length"
            value={`${onboardingData.preferences?.sessionLengthMinutes || 15} minutes`}
          />
        </View>

        {/* Tips */}
        <View style={styles.tips}>
          <Text variant="titleSmall" style={styles.tipsTitle}>
            Prima di iniziare:
          </Text>
          <TipItem text="Puoi iniziare con una conversazione semplice" />
          <TipItem text="Gli errori fanno parte del percorso" />
          <TipItem text="Anche solo qualche minuto alla volta va bene" />
        </View>
      </View>

      <View style={styles.footer}>
        <Button
          title="Cominciamo"
          onPress={handleStart}
          fullWidth
          size="large"
        />
      </View>
    </SafeAreaView>
  );
};

interface SummaryItemProps {
  label: string;
  value: string;
}

const SummaryItem: React.FC<SummaryItemProps> = ({label, value}) => (
  <View style={styles.summaryItem}>
    <Text variant="bodySmall" color="secondary">
      {label}
    </Text>
    <Text variant="titleSmall">{value}</Text>
  </View>
);

interface TipItemProps {
  text: string;
}

const TipItem: React.FC<TipItemProps> = ({text}) => {
  const {colors} = useTheme();
  return (
    <View style={styles.tipItem}>
      <View style={[styles.tipBullet, {backgroundColor: colors.brand.primary}]} />
      <Text variant="bodyMedium" color="secondary">
        {text}
      </Text>
    </View>
  );
};

const formatGoal = (goal?: string): string => {
  if (!goal) {return '';}
  return goal
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase());
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.screenHorizontal,
    paddingTop: spacing.xxxl,
    alignItems: 'center',
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  icon: {
    fontSize: 48,
  },
  title: {
    marginBottom: spacing.sm,
  },
  subtitle: {
    maxWidth: 300,
    marginBottom: spacing.xl,
  },
  summaryCard: {
    width: '100%',
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.xl,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  tips: {
    width: '100%',
  },
  tipsTitle: {
    marginBottom: spacing.sm,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  tipBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 7,
    marginRight: spacing.sm,
  },
  footer: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingVertical: spacing.lg,
  },
});

export default OnboardingCompleteScreen;
