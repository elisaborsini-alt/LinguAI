import type {OnboardingStackScreenProps} from '@appTypes/navigation';
import {useNavigation, useRoute} from '@react-navigation/native';
import {useLanguages} from '@state/hooks/useLanguages';
import {useTheme} from '@state/hooks/useTheme';
import {useUserStore} from '@state/stores/userStore';
import {Text, Button, Card} from '@ui/components';
import {spacing} from '@ui/theme';
import React, {useState, useEffect} from 'react';
import {View, StyleSheet, SafeAreaView, TouchableOpacity, ActivityIndicator} from 'react-native';

type NavigationProp = OnboardingStackScreenProps<'LanguageVariant'>['navigation'];
type RouteProp = OnboardingStackScreenProps<'LanguageVariant'>['route'];

export const LanguageVariantScreen: React.FC = () => {
  const {colors} = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProp>();
  const {setOnboardingData} = useUserStore();
  const {getLanguage, isLoading} = useLanguages();

  const {nativeLanguage, targetLanguage} = route.params;
  const languageDef = getLanguage(targetLanguage);
  const variants = languageDef?.variants || [];
  const [selected, setSelected] = useState<string | null>(null);

  // Auto-select and navigate if only one variant
  useEffect(() => {
    if (variants.length === 1) {
      const variant = variants[0].code;
      setOnboardingData({
        targetLanguage: {code: targetLanguage, variant},
      });
      navigation.replace('GoalSelect', {
        nativeLanguage,
        targetLanguage: {code: targetLanguage, variant},
      });
    }
  }, [variants, targetLanguage, nativeLanguage, setOnboardingData, navigation]);

  const handleContinue = () => {
    if (!selected) {return;}

    setOnboardingData({
      targetLanguage: {code: targetLanguage, variant: selected},
    });

    navigation.navigate('GoalSelect', {
      nativeLanguage,
      targetLanguage: {code: targetLanguage, variant: selected},
    });
  };

  if (isLoading || variants.length <= 1) {
    return (
      <SafeAreaView style={[styles.container, {backgroundColor: colors.background.primary}]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.brand.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: colors.background.primary}]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text variant="bodyLarge" color="link">
            Back
          </Text>
        </TouchableOpacity>
        <Text variant="overline" color="secondary" style={styles.step}>
          STEP 3 OF 6
        </Text>
        <Text variant="headlineMedium" style={styles.title}>
          Which variant would you like to learn?
        </Text>
        <Text variant="bodyLarge" color="secondary">
          This affects vocabulary, expressions, and pronunciation
        </Text>
      </View>

      <View style={styles.content}>
        {variants.map((variant) => (
          <TouchableOpacity
            key={variant.code}
            onPress={() => setSelected(variant.code)}
            activeOpacity={0.7}>
            <Card
              variant={selected === variant.code ? 'outlined' : 'default'}
              style={[
                styles.variantCard,
                selected === variant.code && {
                  borderColor: colors.brand.primary,
                  backgroundColor: colors.brand.primaryLight,
                },
              ]}>
              <Text style={styles.flag}>{variant.flag}</Text>
              <View style={styles.variantInfo}>
                <Text variant="titleMedium">{variant.name}</Text>
              </View>
              {selected === variant.code && (
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    paddingHorizontal: spacing.screenHorizontal,
    gap: spacing.sm,
  },
  variantCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  flag: {
    fontSize: 40,
    marginRight: spacing.md,
  },
  variantInfo: {
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

export default LanguageVariantScreen;
