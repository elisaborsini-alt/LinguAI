import type {OnboardingStackScreenProps} from '@appTypes/navigation';
import {useNavigation} from '@react-navigation/native';
import {useLanguages} from '@state/hooks/useLanguages';
import {useTheme} from '@state/hooks/useTheme';
import {useUserStore} from '@state/stores/userStore';
import {Text, Button} from '@ui/components';
import {spacing} from '@ui/theme';
import React, {useEffect, useState} from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import * as RNLocalize from 'react-native-localize';

type NavigationProp = OnboardingStackScreenProps<'DeviceLanguage'>['navigation'];

interface DetectedLanguage {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
}

export const DeviceLanguageScreen: React.FC = () => {
  const {colors} = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const {setOnboardingData} = useUserStore();
  const {languages, isLoading} = useLanguages();

  const [detected, setDetected] = useState<DetectedLanguage | null>(null);

  useEffect(() => {
    if (languages.length === 0) {return;}

    const locales = RNLocalize.getLocales();
    if (locales.length === 0) {return;}

    const deviceLangCode = locales[0].languageCode;

    const match = languages.find(l => l.code === deviceLangCode);

    if (match) {
      setDetected({
        code: match.code,
        name: match.name,
        nativeName: match.nativeName,
        flag: match.flag,
      });
    }
  }, [languages]);

  const handleContinue = () => {
    if (!detected) {return;}
    setOnboardingData({nativeLanguage: detected.code});
    navigation.navigate('TargetLanguage', {nativeLanguage: detected.code});
  };

  const handleChangeLanguage = () => {
    navigation.navigate('NativeLanguage');
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, {backgroundColor: colors.background.primary}]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.brand.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!detected) {
    navigation.navigate('NativeLanguage');
    return null;
  }

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: colors.background.primary}]}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text variant="overline" color="secondary">
            STEP 1 OF 6
          </Text>
          <Text variant="headlineMedium" style={styles.title}>
            We detected your language
          </Text>
        </View>

        <View style={styles.detectedCard}>
          <View
            style={[
              styles.flagContainer,
              {backgroundColor: colors.brand.primaryLight},
            ]}>
            <Text style={styles.flagEmoji}>{detected.flag}</Text>
          </View>

          <Text variant="headlineSmall" style={styles.languageName}>
            {detected.name}
          </Text>
          <Text variant="bodyLarge" color="secondary" style={styles.nativeName}>
            {detected.nativeName}
          </Text>

          <Text variant="bodyMedium" color="secondary" style={styles.subtitle}>
            Continue in {detected.name}?
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Button
          title={`Continue in ${detected.name}`}
          onPress={handleContinue}
          fullWidth
          size="large"
        />
        <Button
          title="Choose a different language"
          onPress={handleChangeLanguage}
          variant="ghost"
          fullWidth
          size="large"
          style={styles.changeButton}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  header: {
    paddingHorizontal: spacing.screenHorizontal,
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  title: {
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  detectedCard: {
    alignItems: 'center',
    paddingHorizontal: spacing.screenHorizontal,
  },
  flagContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  flagEmoji: {
    fontSize: 48,
  },
  languageName: {
    marginBottom: spacing.xs,
  },
  nativeName: {
    marginBottom: spacing.lg,
  },
  subtitle: {
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingVertical: spacing.lg,
  },
  changeButton: {
    marginTop: spacing.sm,
  },
});

export default DeviceLanguageScreen;
