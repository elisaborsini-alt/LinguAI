import type {OnboardingStackScreenProps} from '@appTypes/navigation';
import {useNavigation, useRoute} from '@react-navigation/native';
import {useLanguages} from '@state/hooks/useLanguages';
import {useTheme} from '@state/hooks/useTheme';
import {useUserStore} from '@state/stores/userStore';
import {Text, Button, Card} from '@ui/components';
import {spacing} from '@ui/theme';
import React, {useState, useMemo} from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';

type NavigationProp = OnboardingStackScreenProps<'TargetLanguage'>['navigation'];
type RouteProp = OnboardingStackScreenProps<'TargetLanguage'>['route'];

export const TargetLanguageScreen: React.FC = () => {
  const {colors} = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProp>();
  const {setOnboardingData} = useUserStore();
  const {languages, isLoading} = useLanguages();

  const {nativeLanguage} = route.params;
  const [selected, setSelected] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Filter out native language and apply search
  const availableLanguages = useMemo(() => {
    const filtered = languages.filter((lang) => lang.code !== nativeLanguage);
    if (!search.trim()) {return filtered;}
    const q = search.toLowerCase();
    return filtered.filter(
      l =>
        l.name.toLowerCase().includes(q) ||
        l.nativeName.toLowerCase().includes(q) ||
        l.code.includes(q),
    );
  }, [languages, nativeLanguage, search]);

  const handleContinue = () => {
    if (!selected) {return;}

    const selectedLang = languages.find((l) => l.code === selected);
    if (!selectedLang) {return;}

    if (selectedLang.variants.length > 1) {
      // Multiple variants — let user choose
      navigation.navigate('LanguageVariant', {
        nativeLanguage,
        targetLanguage: selected,
      });
    } else {
      // Single variant — auto-select and skip variant screen
      const variant = selectedLang.defaultVariant;
      setOnboardingData({
        targetLanguage: {code: selected, variant},
      });
      navigation.navigate('GoalSelect', {
        nativeLanguage,
        targetLanguage: {code: selected, variant},
      });
    }
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

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: colors.background.primary}]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text variant="bodyLarge" color="link">
            Back
          </Text>
        </TouchableOpacity>
        <Text variant="overline" color="secondary" style={styles.step}>
          STEP 2 OF 6
        </Text>
        <Text variant="headlineMedium" style={styles.title}>
          What language do you want to learn?
        </Text>
        <Text variant="bodyLarge" color="secondary">
          Choose the language you want to practice
        </Text>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={[
            styles.searchInput,
            {
              backgroundColor: colors.background.secondary,
              color: colors.text.primary,
              borderColor: colors.border?.default || colors.background.secondary,
            },
          ]}
          placeholder="Search languages..."
          placeholderTextColor={colors.text.secondary}
          value={search}
          onChangeText={setSearch}
          autoCorrect={false}
        />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {availableLanguages.map((language) => (
          <TouchableOpacity
            key={language.code}
            onPress={() => setSelected(language.code)}
            activeOpacity={0.7}>
            <Card
              variant={selected === language.code ? 'outlined' : 'default'}
              style={[
                styles.languageCard,
                selected === language.code && {
                  borderColor: colors.brand.primary,
                  backgroundColor: colors.brand.primaryLight,
                },
              ]}>
              <Text style={styles.flag}>{language.flag}</Text>
              <View style={styles.languageInfo}>
                <Text variant="titleMedium">{language.name}</Text>
                <Text variant="bodySmall" color="secondary">
                  {language.nativeName}
                </Text>
              </View>
              {selected === language.code && (
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  searchContainer: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingBottom: spacing.md,
  },
  searchInput: {
    height: 44,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    fontSize: 16,
    borderWidth: 1,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  languageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  flag: {
    fontSize: 32,
    marginRight: spacing.md,
  },
  languageInfo: {
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

export default TargetLanguageScreen;
