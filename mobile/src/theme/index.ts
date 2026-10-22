import { MD3LightTheme, type MD3Theme } from 'react-native-paper'

export const vetGreen = [
  '#eefcf5',
  '#d8f6e7',
  '#abeccd',
  '#7ae1b0',
  '#52d899',
  '#39d28b',
  '#2ad084',
  '#18b870',
  '#08a361',
  '#008c50'
] as const

export const theme: MD3Theme = {
  ...MD3LightTheme,
  roundness: 4,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#047857',
    onPrimary: '#ffffff',
    primaryContainer: vetGreen[2],
    onPrimaryContainer: '#002114',
    secondary: '#4f6354',
    onSecondary: '#ffffff',
    secondaryContainer: vetGreen[1],
    onSecondaryContainer: '#0d2012',
    tertiary: '#3c6472',
    onTertiary: '#ffffff',
    tertiaryContainer: '#bfe9f9',
    onTertiaryContainer: '#001f27',
    background: '#f6faf7',
    onBackground: '#171d18',
    surface: '#f6faf7',
    onSurface: '#171d18',
    surfaceVariant: '#dce5dc',
    onSurfaceVariant: '#404942',
    outline: '#707970',
    outlineVariant: '#bfc9c0',
    error: '#ba1a1a',
    onError: '#ffffff',
    errorContainer: '#ffdad6',
    onErrorContainer: '#410002',
    elevation: {
      ...MD3LightTheme.colors.elevation,
      level1: '#edf3ee',
      level2: '#e7eee9',
      level3: '#e2e9e4',
      level4: '#dfe7e1',
      level5: '#dae2dc'
    }
  }
}
