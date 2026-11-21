import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, ActivityIndicator, DeviceEventEmitter } from 'react-native';
import { WebView } from 'react-native-webview';
import { router } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useScraper } from '../context/ScraperContext';
import { WebViewSessionBanner } from '../components/WebViewSessionBanner';
import {
  notifySessionRestored,
  isLoginOrSessionUrl,
  isAuthenticatedUrl,
  getSessionWatcherJS,
  ALMS_SESSION_RESTORED,
  SPOOFED_USER_AGENT,
  TURNSTILE_WEBVIEW_HEADERS,
  COMMON_TURNSTILE_WEBVIEW_PROPS,
  TURNSTILE_BEFORE_CONTENT_JS,
} from '../utils/webViewSession';

const FEES_URL = 'https://ums.lpu.in/lpuums/Reports/frmStatementofAccounts.aspx';

export default function FeesScreen() {
  const { colors, isDark } = useTheme();
  const { authData } = useAuth();
  const { refreshData } = useScraper();
  const [loading, setLoading] = useState(true);
  const [isDisconnected, setIsDisconnected] = useState(false);
  const webViewRef = useRef<WebView>(null);

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(ALMS_SESSION_RESTORED, () => {
      console.log('[fees] Session restored, reloading Statement of Accounts');
      setIsDisconnected(false);
      webViewRef.current?.injectJavaScript(`window.location.href = '${FEES_URL}'; true;`);
    });
    return () => sub.remove();
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[
        styles.header, 
        { 
          backgroundColor: colors.card, 
          borderBottomColor: colors.border,
          shadowColor: isDark ? '#000000' : 'rgba(0,0,0,0.15)'
        }
      ]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Statement of Accounts</Text>
        <View style={{ width: 44 }} />
      </View>

      <WebViewSessionBanner
        visible={isDisconnected}
        returnTo="/fees"
      />

      {/* Loading overlay */}
      {loading && (
        <View style={[styles.loaderContainer, { backgroundColor: colors.background }]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loaderText, { color: colors.textSecondary }]}>Loading fee details...</Text>
        </View>
      )}

      <WebView
        ref={webViewRef}
        source={{ uri: FEES_URL, headers: TURNSTILE_WEBVIEW_HEADERS }}
        userAgent={SPOOFED_USER_AGENT}
        injectedJavaScriptBeforeContentLoaded={TURNSTILE_BEFORE_CONTENT_JS}
        style={[styles.webview, loading && { opacity: 0 }]}
        onNavigationStateChange={(navState) => {
          const currentNavUrl = navState.url || '';
          if (isLoginOrSessionUrl(currentNavUrl)) {
            setIsDisconnected(true);
          } else if (isDisconnected && isAuthenticatedUrl(currentNavUrl)) {
            console.log('[fees] In-place login detected!');
            setIsDisconnected(false);
            notifySessionRestored({ sourceUrl: FEES_URL });
            try { refreshData?.(); } catch (e) {}
            if (!currentNavUrl.toLowerCase().includes('frmstatementofaccounts')) {
              webViewRef.current?.injectJavaScript(`window.location.href = '${FEES_URL}'; true;`);
            }
          }
        }}
        onLoadEnd={() => {
          setLoading(false);
          webViewRef.current?.injectJavaScript(getSessionWatcherJS(authData?.username, authData?.password));
        }}
        {...COMMON_TURNSTILE_WEBVIEW_PROPS}
        injectedJavaScript={`
          (function() {
            var postMsg = function(data) {
              var bridge = window.ReactNativeWebView || window.__RN_WV_REF__;
              if (bridge && bridge.postMessage) {
                try { bridge.postMessage(JSON.stringify(data)); } catch(e) {}
              }
            };
            // Hide everything except the main content
            var s = document.createElement('style');
            s.innerHTML = \`
              #Happeningleft, .lpu-naac, .header-wrapper, footer, .top-nav, .side-nav, #id_header, .footer-wrapper, .left-side-nav { 
                display: none !important; 
              }
              .form-info, .page-content, .container-fluid, body, html { 
                width: 100% !important; 
                padding: 0 !important; 
                margin: 0 !important;
                background: white !important;
              }
              table { width: 100% !important; zoom: 0.9; }
              .card { border: none !important; box-shadow: none !important; }
              /* Specific fixes for Statement of Accounts page */
              #divMain { width: 100% !important; }
            \`;
            document.head.appendChild(s);
            
            // Check for session expiry
            if (document.body.innerText.includes('Login') && document.querySelectorAll('input[type="password"]').length > 0) {
              postMsg({ type: 'SESSION_EXPIRED' });
            }
          })(); true;
        `}
        onMessage={(event) => {
          try {
            const msg = JSON.parse(event.nativeEvent.data);
            if (msg.type === 'SESSION_EXPIRED' || msg.type === 'ALMS_SESSION_EXPIRED') {
              setIsDisconnected(true);
            }
          } catch(e) {}
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 56 : 44,
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1.5,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
    zIndex: 5,
  },
  backBtn: { width: 44, height: 44, justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '700', color: '#000' },
  webview: { flex: 1 },
  loaderContainer: {
    ...StyleSheet.absoluteFill,
    top: 100,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#fff', zIndex: 1,
  },
  loaderText: { marginTop: 12, color: '#8E8E93', fontSize: 15 },
});
