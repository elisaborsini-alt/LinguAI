import React, {useState, useCallback, useMemo, useEffect} from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  FlatList,
  TouchableOpacity,
  TextInput,
  Dimensions,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  FadeIn,
  FadeInDown,
  Layout,
} from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';

import {useTheme} from '@state/hooks/useTheme';
import {Text, Card} from '@ui/components';
import {
  MiniScore,
  LanguageSelector,
  QuickLanguageSwitch,
  toSelectorLanguage,
} from '@ui/components/pronunciation';
import type {Language} from '@ui/components/pronunciation';
import {useLanguages} from '@state/hooks/useLanguages';
import {spacing} from '@ui/theme';
import type {ConversationStackScreenProps} from '@appTypes/navigation';
import type {
  PhraseCategory,
  PronunciationPhrase,
  PronunciationDifficulty,
} from '@appTypes/pronunciation';

type NavigationProp = ConversationStackScreenProps<'PronunciationPractice'>['navigation'];

const {width: SCREEN_WIDTH} = Dimensions.get('window');

// Mock data with multi-language support
const MOCK_CATEGORIES: PhraseCategory[] = [
  {id: 'greetings', name: 'Greetings', description: 'Common greetings', icon: '👋', sortOrder: 1},
  {id: 'numbers', name: 'Numbers', description: 'Numbers and counting', icon: '🔢', sortOrder: 2},
  {id: 'travel', name: 'Travel', description: 'Travel phrases', icon: '✈️', sortOrder: 3},
  {id: 'food', name: 'Food & Drink', description: 'Restaurant vocabulary', icon: '🍽️', sortOrder: 4},
  {id: 'business', name: 'Business', description: 'Professional language', icon: '💼', sortOrder: 5},
  {id: 'twisters', name: 'Tongue Twisters', description: 'Advanced practice', icon: '👅', sortOrder: 6},
];

const MOCK_PHRASES: Record<string, PronunciationPhrase[]> = {
  en: [
    {id: 'en1', text: 'Hello, how are you?', phoneticIPA: 'həˈloʊ haʊ ɑːr juː', languageCode: 'en', languageVariant: 'US', categoryId: 'greetings', difficulty: 'beginner', isCustom: false, bestScore: 85},
    {id: 'en2', text: 'Good morning', phoneticIPA: 'ɡʊd ˈmɔːrnɪŋ', languageCode: 'en', languageVariant: 'US', categoryId: 'greetings', difficulty: 'beginner', isCustom: false, bestScore: 72},
    {id: 'en3', text: 'Nice to meet you', phoneticIPA: 'naɪs tuː miːt juː', languageCode: 'en', languageVariant: 'US', categoryId: 'greetings', difficulty: 'beginner', isCustom: false},
    {id: 'en4', text: 'I would like to order', phoneticIPA: 'aɪ wʊd laɪk tuː ˈɔːrdər', languageCode: 'en', languageVariant: 'US', categoryId: 'food', difficulty: 'intermediate', isCustom: false, bestScore: 78},
    {id: 'en5', text: 'She sells seashells', phoneticIPA: 'ʃiː selz ˈsiːʃelz', languageCode: 'en', languageVariant: 'US', categoryId: 'twisters', difficulty: 'advanced', isCustom: false},
  ],
  es: [
    {id: 'es1', text: '¡Hola! ¿Cómo estás?', phoneticIPA: 'ola komo esˈtas', languageCode: 'es', languageVariant: 'ES', categoryId: 'greetings', difficulty: 'beginner', isCustom: false, bestScore: 90},
    {id: 'es2', text: 'Buenos días', phoneticIPA: 'ˈbwenos ˈdias', languageCode: 'es', languageVariant: 'ES', categoryId: 'greetings', difficulty: 'beginner', isCustom: false},
    {id: 'es3', text: 'Mucho gusto', phoneticIPA: 'ˈmutʃo ˈɣusto', languageCode: 'es', languageVariant: 'ES', categoryId: 'greetings', difficulty: 'beginner', isCustom: false, bestScore: 65},
  ],
  fr: [
    {id: 'fr1', text: 'Bonjour, comment allez-vous?', phoneticIPA: 'bɔ̃ʒuʁ kɔmɑ̃ ale vu', languageCode: 'fr', languageVariant: 'FR', categoryId: 'greetings', difficulty: 'beginner', isCustom: false},
    {id: 'fr2', text: 'Enchanté', phoneticIPA: 'ɑ̃ʃɑ̃te', languageCode: 'fr', languageVariant: 'FR', categoryId: 'greetings', difficulty: 'beginner', isCustom: false, bestScore: 82},
  ],
  de: [
    {id: 'de1', text: 'Guten Tag', phoneticIPA: 'ˈɡuːtən taːk', languageCode: 'de', categoryId: 'greetings', difficulty: 'beginner', isCustom: false, bestScore: 75},
    {id: 'de2', text: 'Wie geht es Ihnen?', phoneticIPA: 'viː ɡeːt ɛs ˈiːnən', languageCode: 'de', categoryId: 'greetings', difficulty: 'intermediate', isCustom: false},
  ],
  it: [
    {id: 'it1', text: 'Ciao, come stai?', phoneticIPA: 'tʃao ˈkome stai', languageCode: 'it', categoryId: 'greetings', difficulty: 'beginner', isCustom: false, bestScore: 88},
    {id: 'it2', text: 'Piacere di conoscerti', phoneticIPA: 'pjaˈtʃere di koˈnoʃʃerti', languageCode: 'it', categoryId: 'greetings', difficulty: 'intermediate', isCustom: false},
  ],
  ja: [
    {id: 'ja1', text: 'こんにちは', phoneticIPA: 'konnichiwa', languageCode: 'ja', categoryId: 'greetings', difficulty: 'beginner', isCustom: false, bestScore: 70},
    {id: 'ja2', text: 'はじめまして', phoneticIPA: 'hajimemashite', languageCode: 'ja', categoryId: 'greetings', difficulty: 'beginner', isCustom: false},
  ],
  ko: [
    {id: 'ko1', text: '안녕하세요', phoneticIPA: 'annyeonghaseyo', languageCode: 'ko', categoryId: 'greetings', difficulty: 'beginner', isCustom: false},
    {id: 'ko2', text: '만나서 반갑습니다', phoneticIPA: 'mannaseo bangapseumnida', languageCode: 'ko', categoryId: 'greetings', difficulty: 'intermediate', isCustom: false, bestScore: 60},
  ],
  zh: [
    {id: 'zh1', text: '你好', phoneticIPA: 'nǐ hǎo', languageCode: 'zh', languageVariant: 'CN', categoryId: 'greetings', difficulty: 'beginner', isCustom: false, bestScore: 55},
    {id: 'zh2', text: '很高兴认识你', phoneticIPA: 'hěn gāoxìng rènshí nǐ', languageCode: 'zh', languageVariant: 'CN', categoryId: 'greetings', difficulty: 'intermediate', isCustom: false},
  ],
  pt: [
    {id: 'pt1', text: 'Olá, tudo bem?', phoneticIPA: 'oˈla ˈtudu bẽj', languageCode: 'pt', languageVariant: 'BR', categoryId: 'greetings', difficulty: 'beginner', isCustom: false, bestScore: 80},
  ],
};

export const PronunciationPracticeScreen: React.FC = () => {
  const {colors} = useTheme();
  const navigation = useNavigation<NavigationProp>();

  // Language data from API
  const {languages: apiLanguages} = useLanguages();
  const selectorLanguages = useMemo(
    () => apiLanguages.map((l, i) => toSelectorLanguage(l, i)),
    [apiLanguages],
  );

  // Language state
  const defaultLang: Language = selectorLanguages[0] || {code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧', color: '#4285F4'};
  const [selectedLanguage, setSelectedLanguage] = useState<Language>(defaultLang);
  const [selectedVariant, setSelectedVariant] = useState<string | undefined>('US');
  const [recentLanguages, setRecentLanguages] = useState<Language[]>([]);

  // Initialize recent languages when data loads
  useEffect(() => {
    if (selectorLanguages.length > 0 && recentLanguages.length === 0) {
      setSelectedLanguage(selectorLanguages[0]);
      setRecentLanguages(selectorLanguages.slice(0, 3));
    }
  }, [selectorLanguages, recentLanguages.length]);

  // Filter state
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<PronunciationDifficulty | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Animation values
  const headerOpacity = useSharedValue(1);

  // Get phrases for selected language
  const currentPhrases = useMemo(() => {
    return MOCK_PHRASES[selectedLanguage.code] || [];
  }, [selectedLanguage.code]);

  // Filter phrases
  const filteredPhrases = useMemo(() => {
    return currentPhrases.filter(phrase => {
      if (selectedCategory && phrase.categoryId !== selectedCategory) return false;
      if (selectedDifficulty && phrase.difficulty !== selectedDifficulty) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          phrase.text.toLowerCase().includes(query) ||
          phrase.phoneticIPA?.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [currentPhrases, selectedCategory, selectedDifficulty, searchQuery]);

  // Stats for current language
  const languageStats = useMemo(() => {
    const phrases = currentPhrases;
    const practiced = phrases.filter(p => p.bestScore !== undefined).length;
    const avgScore = phrases.reduce((acc, p) => acc + (p.bestScore || 0), 0) / (practiced || 1);
    return {
      total: phrases.length,
      practiced,
      avgScore: Math.round(avgScore),
    };
  }, [currentPhrases]);

  const handleLanguageSelect = useCallback((language: Language, variant?: string) => {
    setSelectedLanguage(language);
    setSelectedVariant(variant);
    setSelectedCategory(null);

    // Update recent languages
    setRecentLanguages(prev => {
      const filtered = prev.filter(l => l.code !== language.code);
      return [language, ...filtered].slice(0, 3);
    });
  }, []);

  const handlePhraseSelect = useCallback((phrase: PronunciationPhrase) => {
    navigation.navigate('PronunciationSession', {
      phraseId: phrase.id,
      categoryId: phrase.categoryId,
    });
  }, [navigation]);

  const handleCategorySelect = useCallback((categoryId: string | null) => {
    setSelectedCategory(prev => prev === categoryId ? null : categoryId);
  }, []);

  const getDifficultyColor = (difficulty: PronunciationDifficulty): string => {
    switch (difficulty) {
      case 'beginner': return '#34A853';
      case 'intermediate': return '#FBBC04';
      case 'advanced': return '#EA4335';
    }
  };

  const renderPhraseItem = ({item, index}: {item: PronunciationPhrase; index: number}) => (
    <Animated.View
      entering={FadeInDown.delay(index * 50).springify()}
      layout={Layout.springify()}>
      <TouchableOpacity
        onPress={() => handlePhraseSelect(item)}
        activeOpacity={0.7}>
        <View
          style={[
            styles.phraseCard,
            {
              backgroundColor: colors.background.primary,
              borderLeftColor: selectedLanguage.color,
            },
          ]}>
          <View style={styles.phraseContent}>
            <View style={styles.phraseTextContainer}>
              <Text variant="bodyLarge" style={[styles.phraseText, {fontWeight: '500'}]}>
                {item.text}
              </Text>
              {item.phoneticIPA && (
                <Text variant="bodySmall" color="secondary" style={styles.phonetic}>
                  /{item.phoneticIPA}/
                </Text>
              )}
              <View style={styles.phraseMetaRow}>
                <View
                  style={[
                    styles.difficultyBadge,
                    {backgroundColor: getDifficultyColor(item.difficulty) + '20'},
                  ]}>
                  <Text
                    variant="caption"
                    style={{color: getDifficultyColor(item.difficulty), fontWeight: '600'}}>
                    {item.difficulty}
                  </Text>
                </View>
                {item.attemptCount !== undefined && (
                  <Text variant="caption" color="tertiary">
                    {item.attemptCount} attempts
                  </Text>
                )}
              </View>
            </View>

            {item.bestScore !== undefined ? (
              <MiniScore score={item.bestScore} size={44} />
            ) : (
              <View style={[styles.newBadge, {backgroundColor: selectedLanguage.color + '15'}]}>
                <Text variant="labelSmall" style={{color: selectedLanguage.color}}>
                  NEW
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: colors.background.secondary}]}>
      {/* Header with gradient */}
      <LinearGradient
        colors={[selectedLanguage.color, selectedLanguage.color + 'CC']}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}
        style={styles.headerGradient}>
        <View style={styles.headerContent}>
          <View style={styles.headerTop}>
            <View>
              <Text variant="headlineMedium" style={styles.headerTitle}>
                Pronunciation
              </Text>
              <Text variant="bodyMedium" style={styles.headerSubtitle}>
                Practice with native speakers
              </Text>
            </View>
            <QuickLanguageSwitch
              languages={recentLanguages}
              selectedIndex={recentLanguages.findIndex(l => l.code === selectedLanguage.code)}
              onSelect={(index) => handleLanguageSelect(recentLanguages[index])}
            />
          </View>

          {/* Language Stats Card */}
          <View style={styles.statsCard}>
            <View style={styles.statItem}>
              <Text variant="headlineSmall" style={styles.statValue}>
                {languageStats.practiced}
              </Text>
              <Text variant="caption" style={styles.statLabel}>
                practiced
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text variant="headlineSmall" style={styles.statValue}>
                {languageStats.total}
              </Text>
              <Text variant="caption" style={styles.statLabel}>
                phrases
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text variant="headlineSmall" style={styles.statValue}>
                {languageStats.avgScore}%
              </Text>
              <Text variant="caption" style={styles.statLabel}>
                avg score
              </Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      {/* Main Content */}
      <View style={styles.mainContent}>
        {/* Language Selector */}
        <View style={styles.languageSelectorContainer}>
          <LanguageSelector
            languages={selectorLanguages}
            selectedLanguage={selectedLanguage}
            selectedVariant={selectedVariant}
            onSelectLanguage={handleLanguageSelect}
          />
        </View>

        {/* Search bar */}
        <View style={styles.searchContainer}>
          <View style={[styles.searchInput, {backgroundColor: colors.background.primary}]}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              placeholder={`Search ${selectedLanguage.name} phrases...`}
              placeholderTextColor={colors.text.tertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={[styles.searchTextInput, {color: colors.text.primary}]}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Text style={styles.clearButton}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Category chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
          style={styles.categoryContainer}>
          {MOCK_CATEGORIES.map(category => (
            <TouchableOpacity
              key={category.id}
              onPress={() => handleCategorySelect(category.id)}
              activeOpacity={0.7}>
              <View
                style={[
                  styles.categoryChip,
                  {
                    backgroundColor:
                      selectedCategory === category.id
                        ? selectedLanguage.color
                        : colors.background.primary,
                    borderColor:
                      selectedCategory === category.id
                        ? selectedLanguage.color
                        : colors.border.default,
                  },
                ]}>
                <Text style={styles.categoryIcon}>{category.icon}</Text>
                <Text
                  variant="labelSmall"
                  style={{
                    color:
                      selectedCategory === category.id
                        ? '#fff'
                        : colors.text.primary,
                  }}>
                  {category.name}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Difficulty filter */}
        <View style={styles.difficultyContainer}>
          {(['beginner', 'intermediate', 'advanced'] as PronunciationDifficulty[]).map(
            (difficulty) => (
              <TouchableOpacity
                key={difficulty}
                onPress={() =>
                  setSelectedDifficulty(prev =>
                    prev === difficulty ? null : difficulty,
                  )
                }
                activeOpacity={0.7}>
                <View
                  style={[
                    styles.difficultyChip,
                    {
                      backgroundColor:
                        selectedDifficulty === difficulty
                          ? getDifficultyColor(difficulty)
                          : 'transparent',
                      borderColor: getDifficultyColor(difficulty),
                    },
                  ]}>
                  <Text
                    variant="labelSmall"
                    style={{
                      color:
                        selectedDifficulty === difficulty
                          ? '#fff'
                          : getDifficultyColor(difficulty),
                    }}>
                    {difficulty}
                  </Text>
                </View>
              </TouchableOpacity>
            ),
          )}
        </View>

        {/* Phrase list */}
        <FlatList
          data={filteredPhrases}
          keyExtractor={item => item.id}
          renderItem={renderPhraseItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Animated.View entering={FadeIn} style={styles.emptyState}>
              <Text style={styles.emptyIcon}>
                {currentPhrases.length === 0 ? '🌍' : '🔍'}
              </Text>
              <Text variant="titleMedium" color="secondary" align="center">
                {currentPhrases.length === 0
                  ? `No phrases yet for ${selectedLanguage.name}`
                  : 'No phrases found'}
              </Text>
              <Text variant="bodySmall" color="tertiary" align="center">
                {currentPhrases.length === 0
                  ? 'Le frasi arriveranno presto'
                  : 'Try adjusting your filters'}
              </Text>
            </Animated.View>
          }
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerGradient: {
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    paddingHorizontal: spacing.screenHorizontal,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  headerTitle: {
    color: '#fff',
    marginBottom: spacing.xxs,
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.85)',
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 16,
    padding: spacing.md,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    color: '#fff',
    fontWeight: '700',
  },
  statLabel: {
    color: 'rgba(255,255,255,0.8)',
    marginTop: spacing.xxs,
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginHorizontal: spacing.md,
  },
  mainContent: {
    flex: 1,
    marginTop: -spacing.md,
  },
  languageSelectorContainer: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingTop: spacing.md,
  },
  searchContainer: {
    paddingHorizontal: spacing.screenHorizontal,
    marginBottom: spacing.sm,
  },
  searchInput: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: spacing.sm,
  },
  searchTextInput: {
    flex: 1,
    fontSize: 16,
    padding: 0,
  },
  clearButton: {
    fontSize: 16,
    padding: spacing.xs,
    color: '#999',
  },
  categoryContainer: {
    marginBottom: spacing.sm,
  },
  categoryScroll: {
    paddingHorizontal: spacing.screenHorizontal,
    gap: spacing.sm,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    borderWidth: 1.5,
    gap: spacing.xs,
  },
  categoryIcon: {
    fontSize: 16,
  },
  difficultyContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.screenHorizontal,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  difficultyChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  listContent: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingBottom: spacing.xl,
  },
  phraseCard: {
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  phraseContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  phraseTextContainer: {
    flex: 1,
    marginRight: spacing.md,
  },
  phraseText: {
    marginBottom: spacing.xxs,
  },
  phonetic: {
    fontStyle: 'italic',
    marginBottom: spacing.xs,
  },
  phraseMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  difficultyBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: 8,
  },
  newBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyIcon: {
    fontSize: 56,
    marginBottom: spacing.md,
  },
});

export default PronunciationPracticeScreen;
