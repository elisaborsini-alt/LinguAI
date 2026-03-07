import {useState, useEffect, useCallback} from 'react';

import {languagesApi, LanguageResponse} from '@data/api/endpoints/languages';

interface UseLanguagesReturn {
  languages: LanguageResponse[];
  isLoading: boolean;
  error: string | null;
  getLanguage: (code: string) => LanguageResponse | undefined;
  refresh: () => Promise<void>;
}

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
    } catch (err) {
      setError('Failed to load languages');
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
