import React, { useRef, useState } from 'react';
import { StyleSheet, View, Text, ActivityIndicator, Platform, TouchableOpacity, TextInput } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';
import { WebView } from 'react-native-webview';
import { GraduationCap, Lock, ArrowLeft } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useAuth } from '../context/AuthContext';
import { useScraper } from '../context/ScraperContext';
import { router, useLocalSearchParams } from 'expo-router';
import {
  notifySessionRestored,
  SPOOFED_USER_AGENT,
  TURNSTILE_WEBVIEW_HEADERS,
  COMMON_TURNSTILE_WEBVIEW_PROPS,
  TURNSTILE_BEFORE_CONTENT_JS,
} from '../utils/webViewSession';

export default function LoginScreen() {
  const { login, isAuthenticated, loading: authLoading } = useAuth();
  const { isScraping, refreshData } = useScraper();
  const { returnTo, reauth } = useLocalSearchParams<{ returnTo?: string; reauth?: string }>();
  const { colors } = useTheme();
  const webViewRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [savedCreds, setSavedCreds] = useState<any>(null);
  const credsRef = useRef<any>(null);
  const hasNavigatedAway = useRef(false);

  const navigateAfterLogin = () => {
    if (hasNavigatedAway.current) return;
    hasNavigatedAway.current = true;
    notifySessionRestored();
    try {
      refreshData?.();
    } catch (e) {
      console.warn('refreshData error on login:', e);
    }
    if (returnTo) {
      router.replace(returnTo as any);
    } else {
      router.replace('/');
    }
  };

  // ─── AFTER page loads ──────────────────────────────────────────────────
  // Captures credentials on login click, auto-fills saved credentials,
  // forces input fields to reveal if UMS hid them under "Loading Portal...",
  // auto-clicks Turnstile and auto-submits once solved.
  const injectedJavaScript = `
    (function() {
      var postMsg = function(data) {
        var bridge = window.ReactNativeWebView || window.__RN_WV_REF__;
        if (bridge && bridge.postMessage) {
          try {
            bridge.postMessage(JSON.stringify(data));
          } catch(e) {}
        }
      };

      var username = '${savedCreds?.u || ''}';
      var password = '${savedCreds?.p || ''}';

      // ── Force reveal inputs if UMS hides them behind "Loading Portal..." ──
      function forceRevealInputs() {
        var u = document.querySelector('#txtU, #txtUserName, input[name="txtU"], input[name="txtUserName"]');
        var p = document.querySelector('input[type="password"]');
        if (u) {
          u.style.display = 'block';
          u.style.visibility = 'visible';
          u.style.opacity = '1';
          if (u.parentElement) {
            u.parentElement.style.display = 'block';
            u.parentElement.style.visibility = 'visible';
          }
        }
        if (p) {
          p.style.display = 'block';
          p.style.visibility = 'visible';
          p.style.opacity = '1';
          if (p.parentElement) {
            p.parentElement.style.display = 'block';
            p.parentElement.style.visibility = 'visible';
          }
        }
        var overlays = document.querySelectorAll('.loading-portal, #loadingPortal, #divLoading, .overlay');
        for (var i = 0; i < overlays.length; i++) {
          overlays[i].style.display = 'none';
        }
      }

      function fillInputs() {
        if (window.location.href.includes('LoginNew.aspx') || window.location.href.includes('Login.aspx')) {
          var u = document.querySelector('#txtU, #txtUserName, input[name="txtU"], input[name="txtUserName"]');
          var p = document.querySelector('input[type="password"]');
          if (u && username && !u.value) {
            try {
              var nSU = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
              nSU.call(u, username);
            } catch(e) {
              u.value = username;
            }
            u.dispatchEvent(new Event('input', { bubbles: true }));
            u.dispatchEvent(new Event('change', { bubbles: true }));
          }
          if (p && password && !p.value) {
            try {
              var nSP = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
              nSP.call(p, password);
            } catch(e) {
              p.value = password;
            }
            p.dispatchEvent(new Event('input', { bubbles: true }));
            p.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }
      }

      forceRevealInputs();
      fillInputs();
      var revealTimer = setInterval(function() {
        forceRevealInputs();
        fillInputs();
      }, 500);

      // Find login button and attach credential-saving listener
      var btn = document.querySelector('#btnLogin, input[type="submit"], button[type="submit"]');
      if (btn) {
        btn.addEventListener('click', function() {
          var u = document.querySelector('#txtU, #txtUserName, input[name="txtU"], input[name="txtUserName"]');
          var p = document.querySelector('input[type="password"]');
          if (u && u.value && p && p.value) {
            postMsg({ type: 'SAVE_CREDENTIALS', u: u.value, p: p.value });
          }
        });
      }

      // Poll for username field, then notify app for auto-fill
      var poll = setInterval(function() {
        var userField = document.querySelector('#txtU, #txtUserName, input[name="txtU"], input[name="txtUserName"]');
        if (userField) {
          clearInterval(poll);
          postMsg({ type: 'READY_TO_FILL' });
        }
      }, 500);

      // ── Auto-click Turnstile checkbox to trigger verification ──
      var turnstileClicked = false;
      var clickTurnstile = setInterval(function() {
        if (turnstileClicked) return;
        // Try Cloudflare's JS API first
        if (typeof turnstile !== 'undefined' && turnstile.execute) {
          try { turnstile.execute(); turnstileClicked = true; clearInterval(clickTurnstile); return; } catch(e) {}
        }
        // Find the Turnstile iframe and click its container
        var iframes = document.querySelectorAll('iframe');
        for (var i = 0; i < iframes.length; i++) {
          var src = iframes[i].src || '';
          if (src.includes('challenges.cloudflare.com') || src.includes('turnstile')) {
            var container = iframes[i].parentElement;
            if (container) {
              container.click();
              turnstileClicked = true;
              clearInterval(clickTurnstile);
            }
            break;
          }
        }
        // Also try clicking the .cf-turnstile div directly
        if (!turnstileClicked) {
          var cfDiv = document.querySelector('.cf-turnstile, [data-sitekey]');
          if (cfDiv) {
            cfDiv.click();
            turnstileClicked = true;
            clearInterval(clickTurnstile);
          }
        }
      }, 800);

      // Poll for Turnstile response token and auto-submit if credentials are ready
      var checkTurnstile = setInterval(function() {
        var u = document.querySelector('#txtU, #txtUserName, input[name="txtU"], input[name="txtUserName"]');
        var p = document.querySelector('input[type="password"]');
        var responseEl = document.querySelector('[name="cf-turnstile-response"], [name="g-recaptcha-response"]');
        if (responseEl && responseEl.value && u && u.value && p && p.value) {
          clearInterval(checkTurnstile);
          clearInterval(clickTurnstile);
          clearInterval(revealTimer);
          var btn = document.querySelector('#btnLogin, input[type="submit"], button[type="submit"]');
          if (btn && !window.__almsAutoSubmitted) {
            window.__almsAutoSubmitted = true;
            btn.click();
          }
        }
      }, 500);
    })();
    true;
  `;

  // Keep the ref in sync with state so closures/handlers always see latest
  React.useEffect(() => {
    credsRef.current = savedCreds;
  }, [savedCreds]);

  React.useEffect(() => {
    const loadCreds = async () => {
      const stored = await AsyncStorage.getItem('@credentials');
      if (stored) {
        const parsed = JSON.parse(stored);
        setSavedCreds(parsed);
        credsRef.current = parsed;
        setTimeout(() => {
          if (webViewRef.current && parsed.u && parsed.p) {
            const fillScript = `
              (function() {
                var u = document.querySelector('#txtU, #txtUserName, input[name="txtU"], input[name="txtUserName"]');
                var p = document.querySelector('input[type="password"]');
                if (u && !u.value) {
                  try {
                    var nSU = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
                    nSU.call(u, '` + parsed.u + `');
                  } catch(e) { u.value = '` + parsed.u + `'; }
                  u.dispatchEvent(new Event('input', { bubbles: true }));
                  u.dispatchEvent(new Event('change', { bubbles: true }));
                }
                if (p && !p.value) {
                  try {
                    var nSP = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
                    nSP.call(p, '` + parsed.p + `');
                  } catch(e) { p.value = '` + parsed.p + `'; }
                  p.dispatchEvent(new Event('input', { bubbles: true }));
                  p.dispatchEvent(new Event('change', { bubbles: true }));
                }
              })();
              true;
            `;
            webViewRef.current.injectJavaScript(fillScript);
          }
        }, 800);
      }
    };
    loadCreds();
  }, []);

  React.useEffect(() => {
    // Only auto-redirect on mount for standard cold-start launches, NOT when returning to a specific page or re-authenticating
    if (isAuthenticated && !authLoading && !returnTo && !reauth) {
      navigateAfterLogin();
    }
  }, [isAuthenticated, authLoading, returnTo, reauth]);

  const handleNavigationStateChange = (navState: any) => {
    const navUrl = (navState.url || '').toLowerCase();
    if (navUrl.includes('dashboard') || navUrl.includes('home') || navUrl.includes('default.aspx')) {
      login({ name: 'Student', username: credsRef.current?.u || savedCreds?.u, password: credsRef.current?.p || savedCreds?.p }).then(() => {
        navigateAfterLogin();
      });
    }
  };

  const onMessage = (event: any) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'SAVE_CREDENTIALS') {
        setSavedCreds(msg);
        credsRef.current = msg;
        AsyncStorage.setItem('@credentials', JSON.stringify(msg)).catch(console.error);
      } else if (msg.type === 'READY_TO_FILL') {
        const creds = credsRef.current;
        if (creds && creds.u && creds.p) {
          const fillScript = `
            (function() {
              var u = document.querySelector('#txtU, #txtUserName, input[name="txtU"], input[name="txtUserName"]');
              var p = document.querySelector('input[type="password"]');
              if (u) {
                try {
                  var nSU = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
                  nSU.call(u, '` + creds.u + `');
                } catch(e) { u.value = '` + creds.u + `'; }
                u.dispatchEvent(new Event('input', { bubbles: true }));
                u.dispatchEvent(new Event('change', { bubbles: true }));
              }
              if (p) {
                try {
                  var nSP = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
                  nSP.call(p, '` + creds.p + `');
                } catch(e) { p.value = '` + creds.p + `'; }
                p.dispatchEvent(new Event('input', { bubbles: true }));
                p.dispatchEvent(new Event('change', { bubbles: true }));
              }
            })();
            true;
          `;
          webViewRef.current?.injectJavaScript(fillScript);
        }
      }
    } catch (e) {}
  };


  const isDashboardTextFalseError = (message: string) => {
    return /quick links|ums home|lpu touch|lpu live|my class|yourdost|function enabledisable|document\.getelementbyid\('ctl00|go to search menu to add quick link/i.test(message || '');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {(returnTo || router.canGoBack()) && (
            <TouchableOpacity 
              onPress={() => {
                if (returnTo) router.replace(returnTo as any);
                else router.back();
              }}
              style={{ marginRight: 12, padding: 4 }}
            >
              <ArrowLeft size={22} color={colors.primary} />
            </TouchableOpacity>
          )}
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerText, { color: colors.text }]}>LPU UMS Login</Text>
            <Text style={[styles.subText, { color: colors.textSecondary }]}>Please log in to sync your data.</Text>
          </View>
        </View>
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
      ) : (
        <WebView
          ref={webViewRef}
          source={{
            uri: 'https://ums.lpu.in/lpuums/LoginNew.aspx',
            headers: TURNSTILE_WEBVIEW_HEADERS,
          }}
          style={styles.webview}
          userAgent={SPOOFED_USER_AGENT}
          injectedJavaScriptBeforeContentLoaded={TURNSTILE_BEFORE_CONTENT_JS}
          injectedJavaScript={injectedJavaScript}
          onNavigationStateChange={handleNavigationStateChange}
          onMessage={onMessage}
          onError={() => setError(true)}
          onHttpError={() => setError(true)}
          {...COMMON_TURNSTILE_WEBVIEW_PROPS}
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
