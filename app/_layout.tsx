import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import Constants from 'expo-constants';

// Determine if rescue UI should be shown based on app version
const shouldShowRescue = (() => {
  const current = Constants.expoConfig?.version || '0.0.0';
  const required = '1.0.2';
  const parse = (v: string) => v.split('.').map((n: string) => parseInt(n, 10));
  const [cMaj, cMin, cPatch] = parse(current);
  const [rMaj, rMin, rPatch] = parse(required);
  if (cMaj > rMaj) return false;
  if (cMaj < rMaj) return true;
  if (cMin > rMin) return false;
  if (cMin < rMin) return true;
  return cPatch < rPatch;
})();
import { Alert, Platform, View, StyleSheet, TouchableOpacity, Text, Linking } from 'react-native';
import * as Updates from 'expo-updates';
import 'react-native-reanimated';


import { useColorScheme } from '@/components/useColorScheme';
import { AuthProvider } from '../context/AuthContext';
import { ScraperProvider } from '../context/ScraperContext';
import { AppThemeProvider, useTheme } from '../context/ThemeContext';
import AnimatedSplashScreen from '../components/AnimatedSplashScreen';

import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

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
  const [splashAnimationComplete, setSplashAnimationComplete] = useState(false);
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

  if (shouldShowRescue) {
    return (
      <SafeAreaProvider>
        <View style={rescueStyles.container}>
          <View style={rescueStyles.card}>
            <Text style={rescueStyles.emoji}>🚨</Text>
            <Text style={rescueStyles.title}>CRITICAL UPDATE REQUIRED</Text>
            <Text style={rescueStyles.subtitle}>
              Your current ALMS app version is outdated and has been disabled due to critical package and API updates.
            </Text>
            <Text style={rescueStyles.description}>
              Please download and install the new ALMS v1.0.3 APK immediately to restore service and experience the stunning new premium layout.
            </Text>
            
            <TouchableOpacity 
              style={rescueStyles.button}
              onPress={() => Linking.openURL('https://github.com/Ashishshankar26/ALMS/releases/download/v1.0.3/ALMS_v1.0.3.apk')}
              activeOpacity={0.8}
            >
              <Text style={rescueStyles.buttonText}>Download ALMS v1.0.3 APK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppThemeProvider>
          <ScraperProvider>
            <View style={{ flex: 1 }}>
              <RootLayoutNav />
              {!splashAnimationComplete && (
                <AnimatedSplashScreen onAnimationComplete={() => setSplashAnimationComplete(true)} />
              )}
            </View>
          </ScraperProvider>
        </AppThemeProvider>
      </AuthProvider>
    </SafeAreaProvider>
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
      <StatusBar style={isDark ? "light" : "dark"} />
      <View style={{ 
        flex: 1, 
        backgroundColor: colors.background,
      }}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="fees" options={{ title: 'Fees', headerShown: false }} />
          <Stack.Screen name="exams" options={{ title: 'Exams', headerShown: false }} />
          <Stack.Screen name="result_summary" options={{ title: 'Result Summary', headerShown: false }} />
          <Stack.Screen name="ums_form" options={{ title: 'University Form', headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
        </Stack>
      </View>
    </ThemeProvider>
  );
}

const rescueStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F081D',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 24,
    padding: 32,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 5,
  },
  emoji: {
    fontSize: 64,
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FF4D4D',
    textAlign: 'center',
    letterSpacing: 1,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
  },
  description: {
    fontSize: 14,
    color: '#B3B3CC',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 32,
  },
  button: {
    width: '100%',
    height: 56,
    backgroundColor: '#6C5CE7',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  }
});

