import type {UserPreferences} from '@appTypes/domain';
import type {OnboardingStackScreenProps} from '@appTypes/navigation';
import {useNavigation} from '@react-navigation/native';
import {useTheme} from '@state/hooks/useTheme';
import {useUserStore} from '@state/stores/userStore';
import {Text, Button, Card, Chip} from '@ui/components';
import {spacing} from '@ui/theme';
import React, {useState} from 'react';
import {View, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity} from 'react-native';

type NavigationProp = OnboardingStackScreenProps<'Preferences'>['navigation'];

export const PreferencesScreen: React.FC = () => {
  const {colors} = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const {setOnboardingData} = useUserStore();

  const [preferences, setPreferences] = useState<Partial<UserPreferences>>({
    correctionIntensity: 'moderate',
    speakingSpeed: 'normal',
    voiceGender: 'female',
    sessionLengthMinutes: 15,
  });

  const handleContinue = () => {
    setOnboardingData({preferences});
    navigation.navigate('OnboardingComplete');
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
          STEP 6 OF 6
        </Text>
        <Text variant="headlineMedium" style={styles.title}>
          Customize your experience
        </Text>
        <Text variant="bodyLarge" color="secondary">
          You can change these anytime in settings
        </Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Correction Intensity */}
        <Card variant="outlined" padding="md">
          <Text variant="titleSmall" style={styles.sectionTitle}>
            Error Corrections
          </Text>
          <Text variant="bodySmall" color="secondary" style={styles.sectionDescription}>
            How often should I point out mistakes?
          </Text>
          <View style={styles.chipGroup}>
            <Chip
              label="Minimal"
              selected={preferences.correctionIntensity === 'minimal'}
              onPress={() =>
                setPreferences((p) => ({...p, correctionIntensity: 'minimal'}))
              }
            />
            <Chip
              label="Moderate"
              selected={preferences.correctionIntensity === 'moderate'}
              onPress={() =>
                setPreferences((p) => ({...p, correctionIntensity: 'moderate'}))
              }
            />
            <Chip
              label="Detailed"
              selected={preferences.correctionIntensity === 'detailed'}
              onPress={() =>
                setPreferences((p) => ({...p, correctionIntensity: 'detailed'}))
              }
            />
          </View>
        </Card>

        {/* Speaking Speed */}
        <Card variant="outlined" padding="md">
          <Text variant="titleSmall" style={styles.sectionTitle}>
            AI Speaking Speed
          </Text>
          <Text variant="bodySmall" color="secondary" style={styles.sectionDescription}>
            How fast should the AI speak?
          </Text>
          <View style={styles.chipGroup}>
            <Chip
              label="Slow"
              selected={preferences.speakingSpeed === 'slow'}
              onPress={() => setPreferences((p) => ({...p, speakingSpeed: 'slow'}))}
            />
            <Chip
              label="Normal"
              selected={preferences.speakingSpeed === 'normal'}
              onPress={() => setPreferences((p) => ({...p, speakingSpeed: 'normal'}))}
            />
            <Chip
              label="Fast"
              selected={preferences.speakingSpeed === 'fast'}
              onPress={() => setPreferences((p) => ({...p, speakingSpeed: 'fast'}))}
            />
          </View>
        </Card>

        {/* Voice Gender */}
        <Card variant="outlined" padding="md">
          <Text variant="titleSmall" style={styles.sectionTitle}>
            AI Voice
          </Text>
          <Text variant="bodySmall" color="secondary" style={styles.sectionDescription}>
            Choose your AI tutor&apos;s voice
          </Text>
          <View style={styles.chipGroup}>
            <Chip
              label="Female"
              selected={preferences.voiceGender === 'female'}
              onPress={() => setPreferences((p) => ({...p, voiceGender: 'female'}))}
            />
            <Chip
              label="Male"
              selected={preferences.voiceGender === 'male'}
              onPress={() => setPreferences((p) => ({...p, voiceGender: 'male'}))}
            />
          </View>
        </Card>

        {/* Session Length */}
        <Card variant="outlined" padding="md">
          <Text variant="titleSmall" style={styles.sectionTitle}>
            Preferred Session Length
          </Text>
          <Text variant="bodySmall" color="secondary" style={styles.sectionDescription}>
            How long do you want to practice per session?
          </Text>
          <View style={styles.chipGroup}>
            <Chip
              label="5 min"
              selected={preferences.sessionLengthMinutes === 5}
              onPress={() => setPreferences((p) => ({...p, sessionLengthMinutes: 5}))}
            />
            <Chip
              label="10 min"
              selected={preferences.sessionLengthMinutes === 10}
              onPress={() => setPreferences((p) => ({...p, sessionLengthMinutes: 10}))}
            />
            <Chip
              label="15 min"
              selected={preferences.sessionLengthMinutes === 15}
              onPress={() => setPreferences((p) => ({...p, sessionLengthMinutes: 15}))}
            />
            <Chip
              label="30 min"
              selected={preferences.sessionLengthMinutes === 30}
              onPress={() => setPreferences((p) => ({...p, sessionLengthMinutes: 30}))}
            />
          </View>
        </Card>
      </ScrollView>

      <View style={styles.footer}>
        <Button title="Complete Setup" onPress={handleContinue} fullWidth size="large" />
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
    gap: spacing.md,
  },
  sectionTitle: {
    marginBottom: spacing.xxs,
  },
  sectionDescription: {
    marginBottom: spacing.sm,
  },
  chipGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  footer: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingVertical: spacing.lg,
  },
});

export default PreferencesScreen;
