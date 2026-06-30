import React, { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { ArrowLeft, RefreshCw, TriangleAlert } from 'lucide-react-native';
import { router } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { useScraper, type ResultSummaryData } from '../context/ScraperContext';
import { useTheme } from '../context/ThemeContext';
import { RESULT_SUMMARY_DIRECT_URL, RESULT_SUMMARY_LAUNCH_URL } from '../constants/ums';

const MOBILE_USER_AGENT =
  'Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36';

export default function ResultSummaryScreen() {
  const { authData } = useAuth();
  const { updateResultSummary } = useScraper();
  const { colors, isDark } = useTheme();
  const webViewRef = useRef<WebView>(null);
  const currentUrlRef = useRef(RESULT_SUMMARY_LAUNCH_URL);
  const bridgeRetryRef = useRef(false);
  const [sourceUrl, setSourceUrl] = useState(RESULT_SUMMARY_LAUNCH_URL);
  const [webViewKey, setWebViewKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const injectedScript = useMemo(() => {
    const username = JSON.stringify(authData?.username || '');
    const password = JSON.stringify(authData?.password || '');

    return `
      (function() {
        if (window.__RN_WV_REF__ && !window.ReactNativeWebView) {
          window.ReactNativeWebView = window.__RN_WV_REF__;
        }

        var username = ${username};
        var password = ${password};
        var href = window.location.href;
        var isLoginPage = href.indexOf('LoginNew.aspx') !== -1 || href.indexOf('Login.aspx') !== -1;

        if (isLoginPage) {
          var usernameInput = document.querySelector('#txtU, #txtUserName, input[name="txtU"], input[name="txtUserName"]');
          var passwordInput = document.querySelector('input[type="password"]');
          var valueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;

          if (usernameInput && username) {
            valueSetter.call(usernameInput, username);
            usernameInput.dispatchEvent(new Event('input', { bubbles: true }));
          }
          if (passwordInput && password) {
            valueSetter.call(passwordInput, password);
            passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
          }

          var checkTurnstile = setInterval(function() {
            var responseElement = document.querySelector('[name="cf-turnstile-response"], [name="g-recaptcha-response"]');
            if (responseElement && responseElement.value) {
              clearInterval(checkTurnstile);
              var loginButton = document.querySelector('#btnLogin, input[type="submit"], button[type="submit"]');
              if (loginButton) loginButton.click();
            }
          }, 500);
        }

        var applyPortalStyles = function() {
          if (!document.head) return;
          var style = document.getElementById('alms-injected-styles');
          if (!style) {
            style = document.createElement('style');
            style.id = 'alms-injected-styles';
            document.head.appendChild(style);
          }
          style.innerHTML =
            '.header-wrapper, footer, .top-nav, .side-nav, .navbar, .sidebar, .header-nav, .main-header, #Happeningleft, .lpu-naac, .footer-wrapper {' +
            'display: none !important;' +
            '}' +
            '.page-content, .container-fluid, body, html, .main-content, .wrapper, .content-wrapper {' +
            'width: 100% !important; padding: 0 !important; margin: 0 !important; overflow-x: hidden !important;' +
            '}' +
            '* { max-width: 100vw !important; }';
        };

        applyPortalStyles();
        if (document.body) {
          var styleObserver = new MutationObserver(applyPortalStyles);
          styleObserver.observe(document.body, { childList: true, subtree: true });
        }

        if (isLoginPage && document.body && /Login/i.test(document.body.innerText || '') && document.querySelectorAll('input[type="password"]').length > 0) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'SESSION_EXPIRED' }));
        }

        if (href.indexOf('/dashboard/examination/result/resultsummary') === -1 || window.__ALMS_RESULT_SUMMARY_SCRAPER__) {
          return true;
        }

        window.__ALMS_RESULT_SUMMARY_SCRAPER__ = true;
        var attempts = 0;
        var lastSignature = '';
        var hasRenderedContent = false;
        var consecutiveBlankPolls = 0;

        function clean(value) {
          return String(value || '').replace(/\\s+/g, ' ').trim();
        }

        function firstMatch(text, patterns) {
          for (var index = 0; index < patterns.length; index++) {
            var match = text.match(patterns[index]);
            if (match && match[1]) return clean(match[1]);
          }
          return '';
        }

        var poll = setInterval(function() {
          attempts += 1;
          var bodyText = document.body ? (document.body.innerText || document.body.textContent || '') : '';
          var normalizedText = clean(bodyText);

          if (normalizedText.length > 20 && /Result Summary/i.test(normalizedText)) {
            hasRenderedContent = true;
            consecutiveBlankPolls = 0;
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'RESULT_SUMMARY_VISIBLE' }));
          } else if (hasRenderedContent && normalizedText.length < 20) {
            consecutiveBlankPolls += 1;
          } else {
            consecutiveBlankPolls = 0;
          }

          if (hasRenderedContent && consecutiveBlankPolls >= 6) {
            clearInterval(poll);
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'RESULT_SUMMARY_BLANK' }));
            return;
          }

          var cgpa = firstMatch(bodyText, [
            /CGPA\\s*:?\\s*([0-9]+(?:\\.[0-9]+)?)/i,
            /([0-9]+(?:\\.[0-9]+)?)\\s*CGPA/i,
            /Net Percentage\\s*:?\\s*([0-9]+(?:\\.[0-9]+)?)/i
          ]);

          var terms = [];
          var termPattern = /Term\\s+([^\\n:]{1,24})\\s*:\\s*([^\\n]{1,60})[\\s\\S]{0,260}?(?:TGPA|Term Percentage|TermPercentage)\\s*:?\\s*([0-9]+(?:\\.[0-9]+)?)/gi;
          var termMatch;
          while ((termMatch = termPattern.exec(bodyText)) !== null) {
            var term = {
              semester: clean(termMatch[1]),
              termId: clean(termMatch[2]),
              tgpa: clean(termMatch[3])
            };
            if (!terms.some(function(item) { return item.semester === term.semester && item.termId === term.termId; })) {
              terms.push(term);
            }
          }

          var courseMap = {};
          var courseGrades = {};
          var nodes = Array.prototype.slice.call(document.querySelectorAll('tr, li, [class*="MuiAccordionDetails-root"] > div, [class*="MuiAccordion-root"]'));
          nodes.forEach(function(node) {
            var text = clean(node.innerText || node.textContent || '');
            if (text.length < 3 || text.length > 700 || text.indexOf('::') === -1) return;
            var codeMatch = text.match(/\\b([A-Z]{2,}[A-Z0-9-]{2,})\\s*::/i);
            if (!codeMatch) return;
            var code = codeMatch[1].toUpperCase();
            courseMap[code] = true;
            var gradeMatch = text.match(/Grade\\s*:?\\s*(O|A\\+|A|B\\+|B|C\\+|C|D|E|F|R|ReApp|PASS|FAIL)\\b/i);
            if (gradeMatch) {
              courseGrades[code] = gradeMatch[1].toUpperCase();
            }
          });

          var gradeCounts = {};
          Object.keys(courseGrades).forEach(function(code) {
            var grade = courseGrades[code];
            gradeCounts[grade] = (gradeCounts[grade] || 0) + 1;
          });

          var latestTerm = terms.length > 0 ? terms[terms.length - 1] : null;
          var summary = {
            cgpa: cgpa || undefined,
            latestSemester: latestTerm ? 'Semester ' + latestTerm.semester : undefined,
            latestTermId: latestTerm ? latestTerm.termId : undefined,
            latestTgpa: latestTerm ? latestTerm.tgpa : undefined,
            subjectCount: Object.keys(courseMap).length || undefined,
            gradeCounts: Object.keys(gradeCounts).length ? gradeCounts : undefined,
            termCount: terms.length || undefined
          };
          var signature = JSON.stringify(summary);
          var hasUsefulData = !!(summary.cgpa || summary.latestTgpa || summary.subjectCount);

          if (hasUsefulData && signature !== lastSignature) {
            lastSignature = signature;
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'RESULT_SUMMARY_DATA',
              payload: Object.assign({}, summary, { lastUpdated: new Date().toISOString() })
            }));
          }

          if (attempts >= 60) {
            clearInterval(poll);
            if (!hasUsefulData && normalizedText.length < 80) {
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'RESULT_SUMMARY_BLANK' }));
            }
          }
        }, 500);
      })();
      true;
    `;
  }, [authData?.password, authData?.username]);

  const beforeContentScript = `
    (function() {
      Object.defineProperty(navigator, 'webdriver', { get: function() { return false; } });
      var isLoginPage = window.location.href.indexOf('LoginNew.aspx') !== -1 || window.location.href.indexOf('Login.aspx') !== -1;
      if (isLoginPage && window.ReactNativeWebView) {
        window.__RN_WV_REF__ = window.ReactNativeWebView;
        delete window.ReactNativeWebView;
      }
    })();
    true;
  `;

  const reloadThroughBridge = () => {
    bridgeRetryRef.current = true;
    currentUrlRef.current = RESULT_SUMMARY_LAUNCH_URL;
    setErrorMessage(null);
    setLoading(true);
    setSourceUrl(RESULT_SUMMARY_LAUNCH_URL);
    setWebViewKey(key => key + 1);
  };

  const retry = () => {
    currentUrlRef.current = sourceUrl;
    setErrorMessage(null);
    setLoading(true);
    setWebViewKey(key => key + 1);
  };

  const acceptSummary = (payload: Partial<ResultSummaryData>) => {
    updateResultSummary({
      ...(payload.cgpa ? { cgpa: String(payload.cgpa) } : {}),
      ...(payload.latestSemester ? { latestSemester: String(payload.latestSemester) } : {}),
      ...(payload.latestTermId ? { latestTermId: String(payload.latestTermId) } : {}),
      ...(payload.latestTgpa ? { latestTgpa: String(payload.latestTgpa) } : {}),
      ...(typeof payload.subjectCount === 'number' ? { subjectCount: payload.subjectCount } : {}),
      ...(payload.gradeCounts ? { gradeCounts: payload.gradeCounts } : {}),
      ...(typeof payload.termCount === 'number' ? { termCount: payload.termCount } : {}),
      lastUpdated: payload.lastUpdated || new Date().toISOString(),
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => router.back()}
          style={[styles.headerButton, { backgroundColor: colors.primary + '12', borderColor: colors.border }]}
        >
          <ArrowLeft size={19} color={colors.primary} />
        </TouchableOpacity>
        <Text selectable style={[styles.title, { color: colors.text }]}>Result Summary</Text>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Reload result summary"
          onPress={retry}
          style={[styles.headerButton, { backgroundColor: colors.primary + '12', borderColor: colors.border }]}
        >
          <RefreshCw size={18} color={colors.primary} />
        </TouchableOpacity>
      </View>

        <View style={styles.webViewContainer}>
          <WebView
            key={webViewKey}
            ref={webViewRef}
            source={{ uri: sourceUrl }}
            style={[styles.webView, { backgroundColor: isDark ? '#0D0E10' : '#FFFFFF' }]}
            userAgent={MOBILE_USER_AGENT}
            originWhitelist={['*']}
            javaScriptEnabled
            domStorageEnabled
            sharedCookiesEnabled
            thirdPartyCookiesEnabled
            mixedContentMode="always"
            setSupportMultipleWindows={false}
            injectedJavaScriptBeforeContentLoaded={beforeContentScript}
            injectedJavaScript={injectedScript}
            onLoadStart={({ nativeEvent }) => {
              currentUrlRef.current = nativeEvent.url;
              setErrorMessage(null);
              if (nativeEvent.url.includes('resultsummary')) setLoading(true);
            }}
            onLoadEnd={({ nativeEvent }) => {
              currentUrlRef.current = nativeEvent.url;
              webViewRef.current?.injectJavaScript(injectedScript);
              if (!nativeEvent.url.includes('resultsummary')) setLoading(false);
            }}
            onNavigationStateChange={navState => {
              currentUrlRef.current = navState.url;
              if (/Login(New)?\.aspx/i.test(navState.url)) setLoading(false);
            }}
            onMessage={({ nativeEvent }) => {
              try {
                const message = JSON.parse(nativeEvent.data);
                if (message.type === 'RESULT_SUMMARY_VISIBLE') {
                  setLoading(false);
                } else if (message.type === 'RESULT_SUMMARY_DATA') {
                  setLoading(false);
                  acceptSummary(message.payload || {});
                } else if (message.type === 'SESSION_EXPIRED') {
                  setLoading(false);
                  router.replace('/login');
                } else if (message.type === 'RESULT_SUMMARY_BLANK') {
                  if (!bridgeRetryRef.current) reloadThroughBridge();
                  else setErrorMessage('The university returned an empty result page. Please refresh your UMS session and try again.');
                }
              } catch (error) {
                console.warn('Result summary message error:', error);
              }
            }}
            onError={({ nativeEvent }) => {
              setLoading(false);
              setErrorMessage(nativeEvent.description || 'Unable to load the result summary.');
            }}
            onHttpError={({ nativeEvent }) => {
              setLoading(false);
              setErrorMessage(`University portal returned HTTP ${nativeEvent.statusCode}.`);
            }}
            onShouldStartLoadWithRequest={request => {
              if (request.url.includes('happenings.lpu.in')) {
                reloadThroughBridge();
                return false;
              }
              return true;
            }}
          />

          {loading && (
            <View style={[styles.loadingOverlay, { backgroundColor: isDark ? '#0D0E10' : '#FFFFFF' }]}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text selectable style={[styles.loadingText, { color: colors.textSecondary }]}>Loading your official results…</Text>
            </View>
          )}

          {errorMessage && (
            <View style={[styles.loadingOverlay, { backgroundColor: colors.background }]}>
              <TriangleAlert size={34} color={colors.error} />
              <Text selectable style={[styles.messageTitle, { color: colors.text }]}>Result page could not load</Text>
              <Text selectable style={[styles.messageBody, { color: colors.textSecondary }]}>{errorMessage}</Text>
              <TouchableOpacity style={[styles.primaryButton, { backgroundColor: colors.primary }]} onPress={reloadThroughBridge}>
                <Text style={styles.primaryButtonText}>Refresh UMS Session</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingTop: Platform.OS === 'ios' ? 56 : 42,
    paddingBottom: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    zIndex: 5,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 18, fontWeight: '800' },
  webViewContainer: { flex: 1 },
  webView: { flex: 1 },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    gap: 14,
    zIndex: 4,
  },
  loadingText: { fontSize: 14, fontWeight: '600' },
  messageContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  messageCard: { width: '100%', maxWidth: 420, borderWidth: 1, borderRadius: 24, padding: 24, alignItems: 'center', gap: 14 },
  messageTitle: { fontSize: 19, fontWeight: '800', textAlign: 'center' },
  messageBody: { fontSize: 14, lineHeight: 20, textAlign: 'center', maxWidth: 360 },
  primaryButton: { minWidth: 210, paddingHorizontal: 22, paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  primaryButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
});
