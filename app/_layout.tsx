import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import * as Updates from 'expo-updates';
import { Alert, Platform, View } from 'react-native';
import 'react-native-reanimated';

import { useColorScheme } from '@/components/useColorScheme';
import { AuthProvider } from '../context/AuthContext';
import { ScraperProvider } from '../context/ScraperContext';
import { AppThemeProvider, useTheme } from '../context/ThemeContext';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
      checkUpdates();
    }
  }, [loaded]);

  async function checkUpdates() {
    if (__DEV__) return;
    try {
      const update = await Updates.checkForUpdateAsync();
      if (update.isAvailable) {
        Alert.alert(
          'Update Available',
          'A new version of ALMS is available. Would you like to update now?',
          [
            { text: 'Later', style: 'cancel' },
            { 
              text: 'Update', 
              onPress: async () => {
                await Updates.fetchUpdateAsync();
                await Updates.reloadAsync();
              } 
            },
          ]
        );
      }
    } catch (error) {
      console.log('Error checking for updates:', error);
    }
  }

  if (!loaded) {
    return null;
  }

  return (
    <AuthProvider>
      <ScraperProvider>
        <AppThemeProvider>
          <RootLayoutNav />
        </AppThemeProvider>
      </ScraperProvider>
    </AuthProvider>
  );
}

function RootLayoutNav() {
  const { colors, isDark } = useTheme();

  const CustomTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
      primary: colors.primary,
      background: colors.background,
      card: colors.card,
      text: colors.text,
      border: colors.border,
      notification: colors.error,
    },
  };

  return (
    <ThemeProvider value={CustomTheme}>
      <View style={{ 
        flex: 1, 
        backgroundColor: colors.background,
        alignSelf: Platform.OS === 'web' ? 'center' : 'stretch',
        width: '100%',
        maxWidth: Platform.OS === 'web' ? 500 : 'none',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: Platform.OS === 'web' ? 0.1 : 0,
        shadowRadius: 10,
      }}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="fees" options={{ title: 'Fees', headerShown: false }} />
          <Stack.Screen name="exams" options={{ title: 'Exams', headerShown: false }} />
          <Stack.Screen name="ums_form" options={{ title: 'University Form', headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
        </Stack>
      </View>
    </ThemeProvider>
  );
}
