// ============================================
// Centralized Language Registry
// ============================================
// Single source of truth for all language metadata.
// To add a new language, add an entry to LANGUAGE_REGISTRY.
// No other files need to change.

export interface LanguageVariantDef {
  code: string;       // e.g. 'US', 'UK'
  name: string;       // e.g. 'American English'
  flag: string;       // e.g. '🇺🇸'
  locale: string;     // BCP-47 for STT/TTS, e.g. 'en-US'
}

export interface LanguageDef {
  code: string;           // ISO 639-1 or ISO 639-3
  name: string;           // English name
  nativeName: string;     // Name in the language itself
  flag: string;           // Primary flag emoji
  rtl?: boolean;          // Right-to-left script
  variants: LanguageVariantDef[];
  defaultVariant: string; // Default variant code
}

export const LANGUAGE_REGISTRY: LanguageDef[] = [
  // --- Languages with multiple variants ---
  {
    code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧',
    defaultVariant: 'US',
    variants: [
      { code: 'US', name: 'American English', flag: '🇺🇸', locale: 'en-US' },
      { code: 'UK', name: 'British English', flag: '🇬🇧', locale: 'en-GB' },
    ],
  },
  {
    code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸',
    defaultVariant: 'ES',
    variants: [
      { code: 'ES', name: 'Spanish (Spain)', flag: '🇪🇸', locale: 'es-ES' },
      { code: 'LATAM', name: 'Latin American Spanish', flag: '🇲🇽', locale: 'es-MX' },
    ],
  },
  {
    code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇵🇹',
    defaultVariant: 'BR',
    variants: [
      { code: 'BR', name: 'Brazilian Portuguese', flag: '🇧🇷', locale: 'pt-BR' },
      { code: 'PT', name: 'European Portuguese', flag: '🇵🇹', locale: 'pt-PT' },
    ],
  },
  {
    code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷',
    defaultVariant: 'FR',
    variants: [
      { code: 'FR', name: 'French (France)', flag: '🇫🇷', locale: 'fr-FR' },
      { code: 'CA', name: 'Canadian French', flag: '🇨🇦', locale: 'fr-CA' },
    ],
  },
  {
    code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳',
    defaultVariant: 'CN',
    variants: [
      { code: 'CN', name: 'Mandarin (Simplified)', flag: '🇨🇳', locale: 'zh-CN' },
      { code: 'TW', name: 'Mandarin (Traditional)', flag: '🇹🇼', locale: 'zh-TW' },
    ],
  },
  {
    code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦', rtl: true,
    defaultVariant: 'MSA',
    variants: [
      { code: 'MSA', name: 'Modern Standard Arabic', flag: '🇸🇦', locale: 'ar-SA' },
      { code: 'EG', name: 'Egyptian Arabic', flag: '🇪🇬', locale: 'ar-EG' },
    ],
  },
  // --- Languages with a single variant ---
  {
    code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪',
    defaultVariant: 'DE',
    variants: [{ code: 'DE', name: 'Standard German', flag: '🇩🇪', locale: 'de-DE' }],
  },
  {
    code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹',
    defaultVariant: 'IT',
    variants: [{ code: 'IT', name: 'Standard Italian', flag: '🇮🇹', locale: 'it-IT' }],
  },
  {
    code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺',
    defaultVariant: 'RU',
    variants: [{ code: 'RU', name: 'Standard Russian', flag: '🇷🇺', locale: 'ru-RU' }],
  },
  {
    code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵',
    defaultVariant: 'JP',
    variants: [{ code: 'JP', name: 'Standard Japanese', flag: '🇯🇵', locale: 'ja-JP' }],
  },
  {
    code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷',
    defaultVariant: 'KR',
    variants: [{ code: 'KR', name: 'Standard Korean', flag: '🇰🇷', locale: 'ko-KR' }],
  },
  {
    code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳',
    defaultVariant: 'IN',
    variants: [{ code: 'IN', name: 'Standard Hindi', flag: '🇮🇳', locale: 'hi-IN' }],
  },
  {
    code: 'tr', name: 'Turkish', nativeName: 'Türkçe', flag: '🇹🇷',
    defaultVariant: 'TR',
    variants: [{ code: 'TR', name: 'Standard Turkish', flag: '🇹🇷', locale: 'tr-TR' }],
  },
  {
    code: 'nl', name: 'Dutch', nativeName: 'Nederlands', flag: '🇳🇱',
    defaultVariant: 'NL',
    variants: [{ code: 'NL', name: 'Standard Dutch', flag: '🇳🇱', locale: 'nl-NL' }],
  },
  {
    code: 'sv', name: 'Swedish', nativeName: 'Svenska', flag: '🇸🇪',
    defaultVariant: 'SE',
    variants: [{ code: 'SE', name: 'Standard Swedish', flag: '🇸🇪', locale: 'sv-SE' }],
  },
  {
    code: 'pl', name: 'Polish', nativeName: 'Polski', flag: '🇵🇱',
    defaultVariant: 'PL',
    variants: [{ code: 'PL', name: 'Standard Polish', flag: '🇵🇱', locale: 'pl-PL' }],
  },
  {
    code: 'el', name: 'Greek', nativeName: 'Ελληνικά', flag: '🇬🇷',
    defaultVariant: 'GR',
    variants: [{ code: 'GR', name: 'Modern Greek', flag: '🇬🇷', locale: 'el-GR' }],
  },
  {
    code: 'th', name: 'Thai', nativeName: 'ไทย', flag: '🇹🇭',
    defaultVariant: 'TH',
    variants: [{ code: 'TH', name: 'Standard Thai', flag: '🇹🇭', locale: 'th-TH' }],
  },
  {
    code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', flag: '🇻🇳',
    defaultVariant: 'VN',
    variants: [{ code: 'VN', name: 'Standard Vietnamese', flag: '🇻🇳', locale: 'vi-VN' }],
  },
  {
    code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', flag: '🇮🇩',
    defaultVariant: 'ID',
    variants: [{ code: 'ID', name: 'Standard Indonesian', flag: '🇮🇩', locale: 'id-ID' }],
  },
  {
    code: 'uk', name: 'Ukrainian', nativeName: 'Українська', flag: '🇺🇦',
    defaultVariant: 'UA',
    variants: [{ code: 'UA', name: 'Standard Ukrainian', flag: '🇺🇦', locale: 'uk-UA' }],
  },
  {
    code: 'cs', name: 'Czech', nativeName: 'Čeština', flag: '🇨🇿',
    defaultVariant: 'CZ',
    variants: [{ code: 'CZ', name: 'Standard Czech', flag: '🇨🇿', locale: 'cs-CZ' }],
  },
  {
    code: 'ro', name: 'Romanian', nativeName: 'Română', flag: '🇷🇴',
    defaultVariant: 'RO',
    variants: [{ code: 'RO', name: 'Standard Romanian', flag: '🇷🇴', locale: 'ro-RO' }],
  },
  {
    code: 'hu', name: 'Hungarian', nativeName: 'Magyar', flag: '🇭🇺',
    defaultVariant: 'HU',
    variants: [{ code: 'HU', name: 'Standard Hungarian', flag: '🇭🇺', locale: 'hu-HU' }],
  },
  {
    code: 'da', name: 'Danish', nativeName: 'Dansk', flag: '🇩🇰',
    defaultVariant: 'DK',
    variants: [{ code: 'DK', name: 'Standard Danish', flag: '🇩🇰', locale: 'da-DK' }],
  },
  {
    code: 'fi', name: 'Finnish', nativeName: 'Suomi', flag: '🇫🇮',
    defaultVariant: 'FI',
    variants: [{ code: 'FI', name: 'Standard Finnish', flag: '🇫🇮', locale: 'fi-FI' }],
  },
  {
    code: 'no', name: 'Norwegian', nativeName: 'Norsk', flag: '🇳🇴',
    defaultVariant: 'NO',
    variants: [{ code: 'NO', name: 'Standard Norwegian', flag: '🇳🇴', locale: 'no-NO' }],
  },
  {
    code: 'he', name: 'Hebrew', nativeName: 'עברית', flag: '🇮🇱', rtl: true,
    defaultVariant: 'IL',
    variants: [{ code: 'IL', name: 'Modern Hebrew', flag: '🇮🇱', locale: 'he-IL' }],
  },
  {
    code: 'fa', name: 'Persian', nativeName: 'فارسی', flag: '🇮🇷', rtl: true,
    defaultVariant: 'IR',
    variants: [{ code: 'IR', name: 'Standard Persian', flag: '🇮🇷', locale: 'fa-IR' }],
  },
  {
    code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu', flag: '🇲🇾',
    defaultVariant: 'MY',
    variants: [{ code: 'MY', name: 'Standard Malay', flag: '🇲🇾', locale: 'ms-MY' }],
  },
  {
    code: 'tl', name: 'Filipino', nativeName: 'Filipino', flag: '🇵🇭',
    defaultVariant: 'PH',
    variants: [{ code: 'PH', name: 'Standard Filipino', flag: '🇵🇭', locale: 'fil-PH' }],
  },
  {
    code: 'bn', name: 'Bengali', nativeName: 'বাংলা', flag: '🇧🇩',
    defaultVariant: 'BD',
    variants: [{ code: 'BD', name: 'Standard Bengali', flag: '🇧🇩', locale: 'bn-BD' }],
  },
  {
    code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', flag: '🇮🇳',
    defaultVariant: 'IN',
    variants: [{ code: 'IN', name: 'Standard Tamil', flag: '🇮🇳', locale: 'ta-IN' }],
  },
  {
    code: 'sw', name: 'Swahili', nativeName: 'Kiswahili', flag: '🇰🇪',
    defaultVariant: 'KE',
    variants: [{ code: 'KE', name: 'Standard Swahili', flag: '🇰🇪', locale: 'sw-KE' }],
  },
  {
    code: 'bg', name: 'Bulgarian', nativeName: 'Български', flag: '🇧🇬',
    defaultVariant: 'BG',
    variants: [{ code: 'BG', name: 'Standard Bulgarian', flag: '🇧🇬', locale: 'bg-BG' }],
  },
  {
    code: 'hr', name: 'Croatian', nativeName: 'Hrvatski', flag: '🇭🇷',
    defaultVariant: 'HR',
    variants: [{ code: 'HR', name: 'Standard Croatian', flag: '🇭🇷', locale: 'hr-HR' }],
  },
  {
    code: 'sk', name: 'Slovak', nativeName: 'Slovenčina', flag: '🇸🇰',
    defaultVariant: 'SK',
    variants: [{ code: 'SK', name: 'Standard Slovak', flag: '🇸🇰', locale: 'sk-SK' }],
  },
  {
    code: 'ca', name: 'Catalan', nativeName: 'Català', flag: '🇪🇸',
    defaultVariant: 'ES',
    variants: [{ code: 'ES', name: 'Standard Catalan', flag: '🇪🇸', locale: 'ca-ES' }],
  },
  {
    code: 'sr', name: 'Serbian', nativeName: 'Српски', flag: '🇷🇸',
    defaultVariant: 'RS',
    variants: [{ code: 'RS', name: 'Standard Serbian', flag: '🇷🇸', locale: 'sr-RS' }],
  },
  {
    code: 'lt', name: 'Lithuanian', nativeName: 'Lietuvių', flag: '🇱🇹',
    defaultVariant: 'LT',
    variants: [{ code: 'LT', name: 'Standard Lithuanian', flag: '🇱🇹', locale: 'lt-LT' }],
  },
  {
    code: 'lv', name: 'Latvian', nativeName: 'Latviešu', flag: '🇱🇻',
    defaultVariant: 'LV',
    variants: [{ code: 'LV', name: 'Standard Latvian', flag: '🇱🇻', locale: 'lv-LV' }],
  },
  {
    code: 'sl', name: 'Slovenian', nativeName: 'Slovenščina', flag: '🇸🇮',
    defaultVariant: 'SI',
    variants: [{ code: 'SI', name: 'Standard Slovenian', flag: '🇸🇮', locale: 'sl-SI' }],
  },
  {
    code: 'et', name: 'Estonian', nativeName: 'Eesti', flag: '🇪🇪',
    defaultVariant: 'EE',
    variants: [{ code: 'EE', name: 'Standard Estonian', flag: '🇪🇪', locale: 'et-EE' }],
  },
];

// ============================================
// Lookup helpers
// ============================================

const _byCode = new Map<string, LanguageDef>();
for (const lang of LANGUAGE_REGISTRY) {
  _byCode.set(lang.code, lang);
}

/** Get full language definition by ISO code. */
export function getLanguageDef(code: string): LanguageDef | undefined {
  return _byCode.get(code);
}

/** Get human-readable language name. Falls back to the raw code for unknown languages. */
export function getLanguageName(code: string, variant?: string): string {
  const lang = _byCode.get(code);
  if (!lang) return code;
  if (variant) {
    const v = lang.variants.find(vd => vd.code === variant);
    if (v) return v.name;
  }
  return lang.name;
}

/** Check if a language code exists in the registry. */
export function isKnownLanguage(code: string): boolean {
  return _byCode.has(code);
}

/** Get all registered language codes. */
export function getAllLanguageCodes(): string[] {
  return LANGUAGE_REGISTRY.map(l => l.code);
}

/** Get BCP-47 locale for a language+variant pair. Falls back to the code itself. */
export function getLocale(code: string, variant?: string): string {
  const lang = _byCode.get(code);
  if (!lang) return code;
  if (variant) {
    const v = lang.variants.find(vd => vd.code === variant);
    if (v) return v.locale;
  }
  return lang.variants[0]?.locale || code;
}
