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
  const { colors } = useTheme();
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
      // Save React Native WebView bridge and delete it from window to hide from Turnstile fingerprinting
      if (window.ReactNativeWebView) {
        window.__RN_WV_REF__ = window.ReactNativeWebView;
        delete window.ReactNativeWebView;
      }
      
      // Override webdriver
      Object.defineProperty(navigator, 'webdriver', {
        get: function() { return false; }
      });
      
      // Override plugins if empty
      if (!navigator.plugins || navigator.plugins.length === 0) {
        Object.defineProperty(navigator, 'plugins', {
          get: function() { return [1, 2, 3]; }
        });
      }

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

      // Poll for Turnstile response token and auto-submit if credentials are ready
      var checkTurnstile = setInterval(function() {
        var u = document.querySelector('#txtU, #txtUserName, input[name="txtU"], input[name="txtUserName"]');
        var p = document.querySelector('input[type="password"]');
        var responseEl = document.querySelector('[name="cf-turnstile-response"], [name="g-recaptcha-response"]');
        if (responseEl && responseEl.value && u && u.value && p && p.value) {
          clearInterval(checkTurnstile);
          var btn = document.querySelector('#btnLogin, input[type="submit"], button[type="submit"]');
          if (btn) {
            btn.click();
          }
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

  // Dynamic UserAgent matching platform OS to prevent Turnstile fingerprinting mismatches
  const spoofedUserAgent = Platform.OS === 'ios' 
    ? "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1"
    : "Mozilla/5.0 (Linux; Android 14; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36";

  const isDashboardTextFalseError = (message: string) => {
    return /quick links|ums home|lpu touch|lpu live|my class|yourdost|function enabledisable|document\.getelementbyid\('ctl00|go to search menu to add quick link/i.test(message || '');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerText, { color: colors.text }]}>LPU UMS Login</Text>
        <Text style={[styles.subText, { color: colors.textSecondary }]}>Please log in to sync your data.</Text>
      </View>

      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Network Error connecting to UMS.</Text>
          <Text style={{color: colors.textSecondary, textAlign: 'center', marginTop: 10}}>This is usually caused by a bad connection or a temporary issue with the UMS servers.</Text>
          <TouchableOpacity 
            style={[styles.loginButton, { backgroundColor: colors.primary, width: 200, marginTop: 20 }]}
            onPress={() => setError(false)}
          >
            <Text style={styles.loginButtonText}>Retry Connection</Text>
          </TouchableOpacity>
        </View>
      ) : Platform.OS === 'web' ? (
        <View style={styles.webContainer}>
          <Animated.View entering={FadeInDown.duration(600)} style={[styles.customLoginCard, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1.5 }]}>
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
          cacheEnabled={true}
          androidLayerType="hardware"
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
    borderBottomWidth: 1.5,
    borderBottomColor: '#dee2e6',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
    shadowColor: '#0A84FF',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 28,
    elevation: 12,
    zIndex: 5,
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
    overflow: 'hidden',
    shadowColor: '#0A84FF',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.24,
    shadowRadius: 34,
    elevation: 14,
    alignItems: 'center',
  },
  loginIconBg: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
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
    shadowColor: '#0A84FF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 3,
  },
  loginButton: {
    width: '100%',
    height: 60,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    shadowColor: '#0A84FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 18,
    elevation: 8,
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
