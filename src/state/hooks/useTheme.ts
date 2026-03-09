import {lightTheme, darkTheme, Theme, typography, spacing, borderRadius, iconSize} from '@ui/theme';
import {useMemo} from 'react';
import {useColorScheme} from 'react-native';


interface UseThemeReturn {
  colors: Theme;
  typography: typeof typography;
  spacing: typeof spacing;
  borderRadius: typeof borderRadius;
  iconSize: typeof iconSize;
  isDark: boolean;
}

export const useTheme = (): UseThemeReturn => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const theme = useMemo(
    () => ({
      colors: isDark ? darkTheme : lightTheme,
      typography,
      spacing,
      borderRadius,
      iconSize,
      isDark,
    }),
    [isDark],
  );

  return theme;
};

export default useTheme;
