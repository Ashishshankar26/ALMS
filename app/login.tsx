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
  const { login } = useAuth();
  const { refreshData } = useScraper();
  const { colors, isDark } = useTheme();
  const webViewRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // This script runs BEFORE the page loads. It places a shield over the input fields.
  // Whenever the user taps the Password field, the 'blur' event tries to tell the website they left the User ID field.
  // We intercept that event and kill it instantly so the website's anti-bot AJAX never fires!
  const injectedJavaScriptBeforeContentLoaded = `
    (function() {
      function killEvent(e) {
        if (e.target && (e.target.id === 'txtU' || e.target.type === 'password' || e.target.tagName === 'INPUT')) {
          e.stopImmediatePropagation();
          e.stopPropagation();
        }
      }
      // Use the capture phase (true) to intercept events BEFORE jQuery can see them
      document.addEventListener('blur', killEvent, true);
      document.addEventListener('focusout', killEvent, true);
      document.addEventListener('change', killEvent, true);
    })();
    true;
  `;

  const injectedJavaScript = `
    (function() {
      // Monitor login button clicks to capture credentials
      var btn = document.getElementById('btnLogin');
      if (btn) {
        btn.addEventListener('click', function() {
          var u = document.getElementById('txtUserName') ? document.getElementById('txtUserName').value : '';
          var p = document.getElementById('txtPassword') ? document.getElementById('txtPassword').value : '';
          if (u && p) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'SAVE_CREDENTIALS', u: u, p: p }));
          }
        });
      }

      // Check for presence of fields and notify app
      var poll = setInterval(function() {
        if (document.getElementById('txtUserName')) {
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

  const handleNavigationStateChange = (navState: any) => {
    if (navState.url.toLowerCase().includes('dashboard') || navState.url.toLowerCase().includes('home')) {
        login({ name: 'Student', username: savedCreds?.u, password: savedCreds?.p }).then(() => {
            router.replace('/(tabs)');
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
              var u = document.getElementById('txtUserName');
              var p = document.getElementById('txtPassword');
              if (u) u.value = '${savedCreds.u}';
              if (p) p.value = '${savedCreds.p}';
              // Trigger any focus events needed by the site
              u?.dispatchEvent(new Event('change', { bubbles: true }));
              p?.dispatchEvent(new Event('change', { bubbles: true }));
            })();
            true;
          `);
        }
      }
    } catch (e) {}
  };

  const spoofedUserAgent = "Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36";

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
            <Text style={[styles.loginSubtitle, { color: colors.textSecondary }]}>Enter your credentials to sync your dashboard</Text>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Registration Number</Text>
              <TextInput 
                style={[styles.input, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F2F2F7', color: colors.text, borderColor: colors.border }]}
                placeholder="e.g. 1220..."
                placeholderTextColor={isDark ? '#666' : '#999'}
                value={username}
                onChangeText={setUsername}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Password</Text>
              <TextInput 
                style={[styles.input, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F2F2F7', color: colors.text, borderColor: colors.border }]}
                placeholder="••••••••"
                secureTextEntry
                placeholderTextColor={isDark ? '#666' : '#999'}
                value={password}
                onChangeText={setPassword}
              />
            </View>

            <TouchableOpacity 
              style={[styles.loginButton, { backgroundColor: colors.primary }]}
              onPress={() => {
                const width = 500;
                const height = 600;
                const left = (window.innerWidth - width) / 2;
                const top = (window.innerHeight - height) / 2;
                window.open('https://ums.lpu.in/lpuums/LoginNew.aspx', 'LPULogin', `width=${width},height=${height},top=${top},left=${left}`);
                // Now that the popup is open, show the "I've Logged In" button
                setError(false); // Reuse error state or just handle navigation
                setLoading(false);
              }}
            >
              <Text style={styles.loginButtonText}>Step 1: Open Secure Login</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.dashboardButton, { borderColor: colors.primary, borderWidth: 2 }]}
              onPress={() => {
                if (!username) {
                  alert('Please enter your Registration Number');
                  return;
                }
                login({ name: 'Student', username: username, password: password }).then(() => {
                  // Instant Sync Trigger for Web - Injecting username directly
                  refreshData(username);
                  router.replace('/(tabs)');
                });
              }}
            >
              <Text style={[styles.dashboardButtonText, { color: colors.primary }]}>Step 2: Sync & Go to Dashboard</Text>
            </TouchableOpacity>

            <View style={styles.securityBadge}>
              <Lock size={12} color="#34C759" />
              <Text style={styles.securityText}>After logging in in the popup, click Step 2.</Text>
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
