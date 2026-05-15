import React, { useRef, useState } from 'react';
import { StyleSheet, View, Text, ActivityIndicator, Platform, TouchableOpacity, TextInput } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';
import { WebView } from 'react-native-webview';
import { GraduationCap, Lock } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useAuth } from '../context/AuthContext';
import { useScraper } from '../context/ScraperContext';
import { router } from 'expo-router';

export default function LoginScreen() {
  const { login, isAuthenticated, loading: authLoading } = useAuth();
  const { isScraping } = useScraper();
  const { colors, isDark } = useTheme();
  const webViewRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // ─── BEFORE page loads ─────────────────────────────────────────────────
  // 1. Kill blur/focusout/change on UMS INPUT fields only — this prevents
  //    UMS's own anti-bot AJAX from firing when switching between fields.
  //    Turnstile runs inside its OWN iframe (challenges.cloudflare.com),
  //    so these main-document event interceptors do NOT affect it.
  // 2. Hide WebView fingerprint markers so Cloudflare Turnstile doesn't
  //    detect that we're in a WebView and auto-fail.
  const injectedJavaScriptBeforeContentLoaded = `
    (function() {
      // --- Anti-UMS-bot: kill blur/focusout/change on login inputs ---
      function killEvent(e) {
        if (e.target && (e.target.id === 'txtU' || e.target.type === 'password' || e.target.tagName === 'INPUT')) {
          e.stopImmediatePropagation();
          e.stopPropagation();
        }
      }
      document.addEventListener('blur', killEvent, true);
      document.addEventListener('focusout', killEvent, true);
      document.addEventListener('change', killEvent, true);

      // --- Hide WebView markers from Turnstile fingerprinting ---
      // Turnstile checks navigator.webdriver to detect automation
      Object.defineProperty(navigator, 'webdriver', {
        get: function() { return false; },
        configurable: true
      });
      // Hide the React Native WebView bridge
      if (window.ReactNativeWebView) {
        Object.defineProperty(window, '__RN_WV_REF__', {
          value: window.ReactNativeWebView,
          writable: false,
          configurable: false,
          enumerable: false
        });
      }
    })();
    true;
  `;

  // ─── AFTER page loads ──────────────────────────────────────────────────
  // Captures credentials on login click. Uses flexible selectors since
  // UMS now generates DYNAMIC IDs for password field and login button.
  const injectedJavaScript = `
    (function() {
      // Restore the bridge if we hid it
      if (window.__RN_WV_REF__ && !window.ReactNativeWebView) {
        window.ReactNativeWebView = window.__RN_WV_REF__;
      }

      // Find login button — could be #btnLogin or dynamically-named
      var btn = document.querySelector('#btnLogin, input[type="submit"], button[type="submit"]');
      if (btn) {
        btn.addEventListener('click', function() {
          var u = document.querySelector('#txtU, #txtUserName, input[name="txtU"], input[name="txtUserName"]');
          var p = document.querySelector('input[type="password"]');
          if (u && u.value && p && p.value) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'SAVE_CREDENTIALS', u: u.value, p: p.value }));
          }
        });
      }

      // Poll for username field, then notify app for auto-fill
      var poll = setInterval(function() {
        var userField = document.querySelector('#txtU, #txtUserName, input[name="txtU"], input[name="txtUserName"]');
        if (userField) {
          clearInterval(poll);
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'READY_TO_FILL' }));
        }
      }, 500);
    })();
    true;
  `;

  const [savedCreds, setSavedCreds] = useState<any>(null);

  React.useEffect(() => {
    const loadCreds = async () => {
      const stored = await AsyncStorage.getItem('@credentials');
      if (stored) setSavedCreds(JSON.parse(stored));
    };
    loadCreds();
  }, []);

  React.useEffect(() => {
    if (isAuthenticated && !authLoading) {
      router.replace('/');
    }
  }, [isAuthenticated, authLoading]);

  const handleNavigationStateChange = (navState: any) => {
    if (navState.url.toLowerCase().includes('dashboard') || navState.url.toLowerCase().includes('home')) {
        login({ name: 'Student', username: savedCreds?.u, password: savedCreds?.p }).then(() => {
            router.replace('/');
        });
    }
  };

  const onMessage = (event: any) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'SAVE_CREDENTIALS') {
        setSavedCreds(msg);
        AsyncStorage.setItem('@credentials', JSON.stringify(msg)).catch(console.error);
      } else if (msg.type === 'READY_TO_FILL') {
        if (savedCreds) {
          webViewRef.current?.injectJavaScript(`
            (function() {
              var u = document.querySelector('#txtU, #txtUserName, input[name="txtU"], input[name="txtUserName"]');
              var p = document.querySelector('input[type="password"]');
              if (u) u.value = '${savedCreds.u}';
              if (p) p.value = '${savedCreds.p}';
              u?.dispatchEvent(new Event('change', { bubbles: true }));
              p?.dispatchEvent(new Event('change', { bubbles: true }));
            })();
            true;
          `);
        }
      }
    } catch (e) {}
  };

  // Updated to a recent Chrome version — old Chrome/112 may be flagged by Turnstile
  const spoofedUserAgent = "Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36";

  const isDashboardTextFalseError = (message: string) => {
    return /quick links|ums home|lpu touch|lpu live|my class|yourdost|function enabledisable|document\.getelementbyid\('ctl00|go to search menu to add quick link/i.test(message || '');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerText, { color: colors.text }]}>LPU UMS Login</Text>
        <Text style={[styles.subText, { color: colors.textSecondary }]}>Please log in to sync your data.</Text>
      </View>

      {Platform.OS === 'web' ? (
        <View style={styles.webContainer}>
          <Animated.View entering={FadeInDown.duration(600)} style={[styles.customLoginCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.loginIconBg, { backgroundColor: colors.primary + '15' }]}>
              <GraduationCap size={40} color={colors.primary} />
            </View>
            <Text style={[styles.loginTitle, { color: colors.text }]}>LPU Student Login</Text>
            <Text style={[styles.loginSubtitle, { color: colors.textSecondary }]}>Please use the Android app to log in. UMS now uses Cloudflare verification.</Text>

            <View style={styles.securityBadge}>
              <Lock size={12} color="#34C759" />
              <Text style={styles.securityText}>Download the Android app for full access.</Text>
            </View>
          </Animated.View>
        </View>
      ) : (
        <WebView
          ref={webViewRef}
          source={{
            uri: 'https://ums.lpu.in/lpuums/LoginNew.aspx',
            headers: {
              'X-Requested-With': ''
            }
          }}
          style={styles.webview}
          userAgent={spoofedUserAgent}
          injectedJavaScriptBeforeContentLoaded={injectedJavaScriptBeforeContentLoaded}
          injectedJavaScript={injectedJavaScript}
          onNavigationStateChange={handleNavigationStateChange}
          onMessage={onMessage}
          onError={() => setError(true)}
          onHttpError={() => setError(true)}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          sharedCookiesEnabled={true}
          thirdPartyCookiesEnabled={true}
          mixedContentMode="always"
          // --- Turnstile compatibility props ---
          originWhitelist={['*']}
          setSupportMultipleWindows={false}
          allowsInlineMediaPlayback={true}
          allowFileAccess={true}
          allowUniversalAccessFromFileURLs={true}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#dee2e6',
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#343a40',
  },
  subText: {
    fontSize: 14,
    color: '#6c757d',
    marginTop: 5,
  },
  webview: {
    flex: 1,
  },
  loaderContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    zIndex: 10,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    fontSize: 16,
  },
  webContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  customLoginCard: {
    width: '100%',
    maxWidth: 420,
    padding: 35,
    borderRadius: 32,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.15,
    shadowRadius: 30,
    elevation: 10,
    alignItems: 'center',
  },
  loginIconBg: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  loginTitle: {
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 8,
  },
  loginSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 30,
    paddingHorizontal: 10,
  },
  inputGroup: {
    width: '100%',
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    width: '100%',
    height: 56,
    borderRadius: 16,
    paddingHorizontal: 20,
    fontSize: 16,
    borderWidth: 1,
  },
  loginButton: {
    width: '100%',
    height: 60,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },
  dashboardButton: {
    width: '100%',
    height: 60,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  dashboardButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 25,
    opacity: 0.7,
  },
  securityText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#34C759',
  }
});
