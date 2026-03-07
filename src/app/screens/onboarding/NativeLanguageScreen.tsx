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
import {useNavigation} from '@react-navigation/native';

import {useTheme} from '@state/hooks/useTheme';
import {useUserStore} from '@state/stores/userStore';
import {useLanguages} from '@state/hooks/useLanguages';
import {Text, Button, Card} from '@ui/components';
import {spacing} from '@ui/theme';
import type {OnboardingStackScreenProps} from '@appTypes/navigation';

type NavigationProp = OnboardingStackScreenProps<'NativeLanguage'>['navigation'];

export const NativeLanguageScreen: React.FC = () => {
  const {colors} = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const {setOnboardingData} = useUserStore();
  const {languages, isLoading} = useLanguages();

  const [selected, setSelected] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const filteredLanguages = useMemo(() => {
    if (!search.trim()) return languages;
    const q = search.toLowerCase();
    return languages.filter(
      l =>
        l.name.toLowerCase().includes(q) ||
        l.nativeName.toLowerCase().includes(q) ||
        l.code.includes(q),
    );
  }, [languages, search]);

  const handleContinue = () => {
    if (!selected) return;
    setOnboardingData({nativeLanguage: selected});
    navigation.navigate('TargetLanguage', {nativeLanguage: selected});
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
        <Text variant="overline" color="secondary">
          STEP 1 OF 6
        </Text>
        <Text variant="headlineMedium" style={styles.title}>
          What's your native language?
        </Text>
        <Text variant="bodyLarge" color="secondary">
          We'll use this to personalize your learning experience
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
        {filteredLanguages.map((language) => (
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
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
  },
  title: {
    marginTop: spacing.xs,
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

export default NativeLanguageScreen;
