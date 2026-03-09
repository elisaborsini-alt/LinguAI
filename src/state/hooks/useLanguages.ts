import {languagesApi, LanguageResponse} from '@data/api/endpoints/languages';
import {useState, useEffect, useCallback} from 'react';


interface UseLanguagesReturn {
  languages: LanguageResponse[];
  isLoading: boolean;
  error: string | null;
  getLanguage: (code: string) => LanguageResponse | undefined;
  refresh: () => Promise<void>;
}

// Fallback languages when backend is not available
const FALLBACK_LANGUAGES: LanguageResponse[] = [
  {code: 'en', name: 'English', nativeName: 'English', flag: '\u{1F1EC}\u{1F1E7}', rtl: false, variants: [{code: 'en-US', name: 'American English', flag: '\u{1F1FA}\u{1F1F8}', locale: 'en-US'}, {code: 'en-GB', name: 'British English', flag: '\u{1F1EC}\u{1F1E7}', locale: 'en-GB'}], defaultVariant: 'en-US'},
  {code: 'es', name: 'Spanish', nativeName: 'Espa\u00f1ol', flag: '\u{1F1EA}\u{1F1F8}', rtl: false, variants: [{code: 'es-ES', name: 'European Spanish', flag: '\u{1F1EA}\u{1F1F8}', locale: 'es-ES'}, {code: 'es-MX', name: 'Mexican Spanish', flag: '\u{1F1F2}\u{1F1FD}', locale: 'es-MX'}], defaultVariant: 'es-ES'},
  {code: 'fr', name: 'French', nativeName: 'Fran\u00e7ais', flag: '\u{1F1EB}\u{1F1F7}', rtl: false, variants: [{code: 'fr-FR', name: 'French', flag: '\u{1F1EB}\u{1F1F7}', locale: 'fr-FR'}], defaultVariant: 'fr-FR'},
  {code: 'de', name: 'German', nativeName: 'Deutsch', flag: '\u{1F1E9}\u{1F1EA}', rtl: false, variants: [{code: 'de-DE', name: 'German', flag: '\u{1F1E9}\u{1F1EA}', locale: 'de-DE'}], defaultVariant: 'de-DE'},
  {code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '\u{1F1EE}\u{1F1F9}', rtl: false, variants: [{code: 'it-IT', name: 'Italian', flag: '\u{1F1EE}\u{1F1F9}', locale: 'it-IT'}], defaultVariant: 'it-IT'},
  {code: 'pt', name: 'Portuguese', nativeName: 'Portugu\u00eas', flag: '\u{1F1F5}\u{1F1F9}', rtl: false, variants: [{code: 'pt-BR', name: 'Brazilian Portuguese', flag: '\u{1F1E7}\u{1F1F7}', locale: 'pt-BR'}, {code: 'pt-PT', name: 'European Portuguese', flag: '\u{1F1F5}\u{1F1F9}', locale: 'pt-PT'}], defaultVariant: 'pt-BR'},
  {code: 'ja', name: 'Japanese', nativeName: '\u65e5\u672c\u8a9e', flag: '\u{1F1EF}\u{1F1F5}', rtl: false, variants: [{code: 'ja-JP', name: 'Japanese', flag: '\u{1F1EF}\u{1F1F5}', locale: 'ja-JP'}], defaultVariant: 'ja-JP'},
  {code: 'ko', name: 'Korean', nativeName: '\ud55c\uad6d\uc5b4', flag: '\u{1F1F0}\u{1F1F7}', rtl: false, variants: [{code: 'ko-KR', name: 'Korean', flag: '\u{1F1F0}\u{1F1F7}', locale: 'ko-KR'}], defaultVariant: 'ko-KR'},
  {code: 'zh', name: 'Chinese', nativeName: '\u4e2d\u6587', flag: '\u{1F1E8}\u{1F1F3}', rtl: false, variants: [{code: 'zh-CN', name: 'Simplified Chinese', flag: '\u{1F1E8}\u{1F1F3}', locale: 'zh-CN'}, {code: 'zh-TW', name: 'Traditional Chinese', flag: '\u{1F1F9}\u{1F1FC}', locale: 'zh-TW'}], defaultVariant: 'zh-CN'},
  {code: 'ar', name: 'Arabic', nativeName: '\u0627\u0644\u0639\u0631\u0628\u064a\u0629', flag: '\u{1F1F8}\u{1F1E6}', rtl: true, variants: [{code: 'ar-SA', name: 'Modern Standard Arabic', flag: '\u{1F1F8}\u{1F1E6}', locale: 'ar-SA'}], defaultVariant: 'ar-SA'},
  {code: 'ru', name: 'Russian', nativeName: '\u0420\u0443\u0441\u0441\u043a\u0438\u0439', flag: '\u{1F1F7}\u{1F1FA}', rtl: false, variants: [{code: 'ru-RU', name: 'Russian', flag: '\u{1F1F7}\u{1F1FA}', locale: 'ru-RU'}], defaultVariant: 'ru-RU'},
  {code: 'hi', name: 'Hindi', nativeName: '\u0939\u093f\u0928\u094d\u0926\u0940', flag: '\u{1F1EE}\u{1F1F3}', rtl: false, variants: [{code: 'hi-IN', name: 'Hindi', flag: '\u{1F1EE}\u{1F1F3}', locale: 'hi-IN'}], defaultVariant: 'hi-IN'},
  {code: 'tr', name: 'Turkish', nativeName: 'T\u00fcrk\u00e7e', flag: '\u{1F1F9}\u{1F1F7}', rtl: false, variants: [{code: 'tr-TR', name: 'Turkish', flag: '\u{1F1F9}\u{1F1F7}', locale: 'tr-TR'}], defaultVariant: 'tr-TR'},
  {code: 'nl', name: 'Dutch', nativeName: 'Nederlands', flag: '\u{1F1F3}\u{1F1F1}', rtl: false, variants: [{code: 'nl-NL', name: 'Dutch', flag: '\u{1F1F3}\u{1F1F1}', locale: 'nl-NL'}], defaultVariant: 'nl-NL'},
  {code: 'pl', name: 'Polish', nativeName: 'Polski', flag: '\u{1F1F5}\u{1F1F1}', rtl: false, variants: [{code: 'pl-PL', name: 'Polish', flag: '\u{1F1F5}\u{1F1F1}', locale: 'pl-PL'}], defaultVariant: 'pl-PL'},
  {code: 'sv', name: 'Swedish', nativeName: 'Svenska', flag: '\u{1F1F8}\u{1F1EA}', rtl: false, variants: [{code: 'sv-SE', name: 'Swedish', flag: '\u{1F1F8}\u{1F1EA}', locale: 'sv-SE'}], defaultVariant: 'sv-SE'},
];

// Module-level cache so we don't refetch on every mount
let cachedLanguages: LanguageResponse[] | null = null;

export const useLanguages = (): UseLanguagesReturn => {
  const [languages, setLanguages] = useState<LanguageResponse[]>(cachedLanguages || []);
  const [isLoading, setIsLoading] = useState(!cachedLanguages);
  const [error, setError] = useState<string | null>(null);

  const fetchLanguages = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await languagesApi.getAll();
      cachedLanguages = data;
      setLanguages(data);
    } catch {
      // Use fallback languages when backend is not available
      cachedLanguages = FALLBACK_LANGUAGES;
      setLanguages(FALLBACK_LANGUAGES);
      setError(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!cachedLanguages) {
      fetchLanguages();
    }
  }, [fetchLanguages]);

  const getLanguage = useCallback(
    (code: string) => languages.find(l => l.code === code),
    [languages],
  );

  return {languages, isLoading, error, getLanguage, refresh: fetchLanguages};
};
