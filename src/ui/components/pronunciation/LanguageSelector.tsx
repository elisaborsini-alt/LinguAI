import React, {useState, useCallback} from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Pressable,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';

import {useTheme} from '@state/hooks/useTheme';
import {Text} from '@ui/components';
import {spacing} from '@ui/theme';

export interface Language {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  variants?: {code: string; name: string}[];
  color: string; // Material You dynamic color
}

// Color palette for language chips — cycles for languages beyond the palette
const LANGUAGE_COLORS = [
  '#4285F4', '#EA4335', '#5F6368', '#FBBC04', '#34A853',
  '#00897B', '#E91E63', '#9C27B0', '#3F51B5', '#FF5722',
  '#607D8B', '#795548', '#009688', '#673AB7', '#FF9800',
];

/** Assign a consistent color to a language based on its position in a list. */
export function getLanguageColor(index: number): string {
  return LANGUAGE_COLORS[index % LANGUAGE_COLORS.length];
}

/** Convert API language data to the Language type used by this component. */
export function toSelectorLanguage(
  apiLang: {code: string; name: string; nativeName: string; flag: string; variants: {code: string; name: string}[]},
  index: number,
): Language {
  return {
    code: apiLang.code,
    name: apiLang.name,
    nativeName: apiLang.nativeName,
    flag: apiLang.flag,
    variants: apiLang.variants.length > 1 ? apiLang.variants : undefined,
    color: getLanguageColor(index),
  };
}

interface LanguageSelectorProps {
  languages: Language[];
  selectedLanguage: Language | null;
  selectedVariant?: string;
  onSelectLanguage: (language: Language, variant?: string) => void;
  compact?: boolean;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  languages: selectorLanguages,
  selectedLanguage,
  selectedVariant,
  onSelectLanguage,
  compact = false,
}) => {
  const {colors} = useTheme();
  const [modalVisible, setModalVisible] = useState(false);
  const [expandedLanguage, setExpandedLanguage] = useState<string | null>(null);

  const handleLanguagePress = useCallback(
    (language: Language) => {
      if (language.variants && language.variants.length > 0) {
        setExpandedLanguage(
          expandedLanguage === language.code ? null : language.code,
        );
      } else {
        onSelectLanguage(language);
        setModalVisible(false);
      }
    },
    [expandedLanguage, onSelectLanguage],
  );

  const handleVariantPress = useCallback(
    (language: Language, variantCode: string) => {
      onSelectLanguage(language, variantCode);
      setModalVisible(false);
      setExpandedLanguage(null);
    },
    [onSelectLanguage],
  );

  if (compact) {
    return (
      <TouchableOpacity
        style={[
          styles.compactSelector,
          {
            backgroundColor: selectedLanguage?.color + '20' || colors.background.secondary,
            borderColor: selectedLanguage?.color || colors.border.default,
          },
        ]}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.7}>
        <Text style={styles.compactFlag}>
          {selectedLanguage?.flag || '🌍'}
        </Text>
        <Text
          variant="labelMedium"
          style={{color: selectedLanguage?.color || colors.text.primary}}>
          {selectedLanguage?.name || 'Select'}
          {selectedVariant ? ` (${selectedVariant})` : ''}
        </Text>
        <Text style={{color: colors.text.tertiary}}>▼</Text>

        <LanguageModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          selectedLanguage={selectedLanguage}
          selectedVariant={selectedVariant}
          expandedLanguage={expandedLanguage}
          onLanguagePress={handleLanguagePress}
          onVariantPress={handleVariantPress}
        />
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <Text variant="titleMedium" style={styles.title}>
        Choose Language
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalScroll}>
        {selectorLanguages.map((language) => (
          <LanguageChip
            key={language.code}
            language={language}
            isSelected={selectedLanguage?.code === language.code}
            selectedVariant={
              selectedLanguage?.code === language.code ? selectedVariant : undefined
            }
            onPress={() => handleLanguagePress(language)}
            onVariantPress={(variant) => handleVariantPress(language, variant)}
            isExpanded={expandedLanguage === language.code}
          />
        ))}
      </ScrollView>
    </View>
  );
};

interface LanguageChipProps {
  language: Language;
  isSelected: boolean;
  selectedVariant?: string;
  onPress: () => void;
  onVariantPress: (variant: string) => void;
  isExpanded: boolean;
}

const LanguageChip: React.FC<LanguageChipProps> = ({
  language,
  isSelected,
  selectedVariant,
  onPress,
  onVariantPress,
  isExpanded,
}) => {
  const scale = useSharedValue(1);
  const progress = useSharedValue(isSelected ? 1 : 0);

  React.useEffect(() => {
    progress.value = withTiming(isSelected ? 1 : 0, {duration: 200});
  }, [isSelected, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{scale: scale.value}],
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      ['#F5F5F5', language.color + '25'],
    ),
    borderColor: interpolateColor(
      progress.value,
      [0, 1],
      ['#E0E0E0', language.color],
    ),
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
  };

  return (
    <View style={styles.chipContainer}>
      <AnimatedTouchable
        style={[styles.chip, animatedStyle]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}>
        <Text style={styles.chipFlag}>{language.flag}</Text>
        <View style={styles.chipText}>
          <Text
            variant="labelMedium"
            style={{color: isSelected ? language.color : '#333'}}>
            {language.name}
          </Text>
          {isSelected && selectedVariant && (
            <Text variant="caption" style={{color: language.color}}>
              {selectedVariant}
            </Text>
          )}
        </View>
        {language.variants && (
          <Text style={{color: isSelected ? language.color : '#999', fontSize: 10}}>
            {isExpanded ? '▲' : '▼'}
          </Text>
        )}
      </AnimatedTouchable>

      {/* Variants dropdown */}
      {isExpanded && language.variants && (
        <Animated.View
          style={[styles.variantsDropdown, {borderColor: language.color + '40'}]}>
          {language.variants.map((variant) => (
            <TouchableOpacity
              key={variant.code}
              style={[
                styles.variantItem,
                selectedVariant === variant.code && {
                  backgroundColor: language.color + '15',
                },
              ]}
              onPress={() => onVariantPress(variant.code)}>
              <Text
                variant="bodySmall"
                style={{
                  color:
                    selectedVariant === variant.code ? language.color : '#666',
                  fontWeight: selectedVariant === variant.code ? '600' : '400',
                }}>
                {variant.name}
              </Text>
            </TouchableOpacity>
          ))}
        </Animated.View>
      )}
    </View>
  );
};

interface LanguageModalProps {
  visible: boolean;
  onClose: () => void;
  selectedLanguage: Language | null;
  selectedVariant?: string;
  expandedLanguage: string | null;
  onLanguagePress: (language: Language) => void;
  onVariantPress: (language: Language, variant: string) => void;
}

const LanguageModal: React.FC<LanguageModalProps> = ({
  visible,
  onClose,
  selectedLanguage,
  selectedVariant,
  expandedLanguage,
  onLanguagePress,
  onVariantPress,
}) => {
  const {colors} = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable
          style={[styles.modalContent, {backgroundColor: colors.background.primary}]}
          onPress={(e) => e.stopPropagation()}>
          <Text variant="titleLarge" style={styles.modalTitle}>
            Select Language
          </Text>

          <ScrollView style={styles.modalScroll}>
            {selectorLanguages.map((language) => (
              <View key={language.code}>
                <TouchableOpacity
                  style={[
                    styles.modalLanguageItem,
                    selectedLanguage?.code === language.code && {
                      backgroundColor: language.color + '15',
                      borderLeftColor: language.color,
                      borderLeftWidth: 3,
                    },
                  ]}
                  onPress={() => onLanguagePress(language)}>
                  <Text style={styles.modalFlag}>{language.flag}</Text>
                  <View style={styles.modalLanguageText}>
                    <Text variant="bodyLarge" style={{fontWeight: '500'}}>
                      {language.name}
                    </Text>
                    <Text variant="bodySmall" color="secondary">
                      {language.nativeName}
                    </Text>
                  </View>
                  {language.variants && (
                    <Text style={{color: colors.text.tertiary}}>
                      {expandedLanguage === language.code ? '▲' : '▼'}
                    </Text>
                  )}
                </TouchableOpacity>

                {expandedLanguage === language.code && language.variants && (
                  <View style={styles.modalVariants}>
                    {language.variants.map((variant) => (
                      <TouchableOpacity
                        key={variant.code}
                        style={[
                          styles.modalVariantItem,
                          selectedVariant === variant.code && {
                            backgroundColor: language.color + '20',
                          },
                        ]}
                        onPress={() => onVariantPress(language, variant.code)}>
                        <Text
                          variant="bodyMedium"
                          style={{
                            color:
                              selectedVariant === variant.code
                                ? language.color
                                : colors.text.primary,
                          }}>
                          {variant.name}
                        </Text>
                        {selectedVariant === variant.code && (
                          <Text style={{color: language.color}}>✓</Text>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            ))}
          </ScrollView>

          <TouchableOpacity
            style={[styles.modalCloseBtn, {backgroundColor: colors.brand.primary}]}
            onPress={onClose}>
            <Text variant="labelLarge" style={{color: '#fff'}}>
              Done
            </Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

// Quick language switch for home screen
interface QuickLanguageSwitchProps {
  languages: Language[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}

export const QuickLanguageSwitch: React.FC<QuickLanguageSwitchProps> = ({
  languages,
  selectedIndex,
  onSelect,
}) => {
  return (
    <View style={styles.quickSwitch}>
      {languages.map((lang, index) => (
        <TouchableOpacity
          key={lang.code}
          style={[
            styles.quickSwitchItem,
            selectedIndex === index && {
              backgroundColor: lang.color + '20',
              borderColor: lang.color,
            },
          ]}
          onPress={() => onSelect(index)}>
          <Text style={styles.quickSwitchFlag}>{lang.flag}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  title: {
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  horizontalScroll: {
    paddingHorizontal: spacing.xs,
    gap: spacing.sm,
  },
  chipContainer: {
    position: 'relative',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 25,
    borderWidth: 2,
    gap: spacing.sm,
    minWidth: 100,
  },
  chipFlag: {
    fontSize: 24,
  },
  chipText: {
    flex: 1,
  },
  variantsDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 4,
    zIndex: 100,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  variantItem: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  compactSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 20,
    borderWidth: 1.5,
    gap: spacing.xs,
  },
  compactFlag: {
    fontSize: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.lg,
    maxHeight: '80%',
  },
  modalTitle: {
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  modalScroll: {
    marginBottom: spacing.md,
  },
  modalLanguageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.xs,
  },
  modalFlag: {
    fontSize: 32,
    marginRight: spacing.md,
  },
  modalLanguageText: {
    flex: 1,
  },
  modalVariants: {
    marginLeft: 56,
    marginBottom: spacing.sm,
  },
  modalVariantItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.xxs,
  },
  modalCloseBtn: {
    paddingVertical: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
  },
  quickSwitch: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  quickSwitchItem: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F5F5',
  },
  quickSwitchFlag: {
    fontSize: 22,
  },
});

export default LanguageSelector;
