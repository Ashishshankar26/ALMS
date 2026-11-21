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

const UPLOAD_URL = 'https://ums.lpu.in/lpuums/frmstudentassignmentupload.aspx';

export default function AssignmentUploadScreen() {
  const { colors } = useTheme();
  const { authData } = useAuth();
  const { refreshData } = useScraper();
  const [loading, setLoading] = useState(true);
  const [isDisconnected, setIsDisconnected] = useState(false);
  const webViewRef = useRef<WebView>(null);

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(ALMS_SESSION_RESTORED, () => {
      console.log('[assignments_upload] Session restored, reloading upload page');
      setIsDisconnected(false);
      webViewRef.current?.injectJavaScript(`window.location.href = '${UPLOAD_URL}'; true;`);
    });
    return () => sub.remove();
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Upload Assignment</Text>
        <View style={{ width: 44 }} />
      </View>

      <WebViewSessionBanner
        visible={isDisconnected}
        returnTo="/assignments_upload"
      />

      {/* Loading overlay */}
      {loading && (
        <View style={[styles.loaderContainer, { backgroundColor: colors.background }]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loaderText, { color: colors.textSecondary }]}>Loading upload portal...</Text>
        </View>
      )}

      <WebView
        ref={webViewRef}
        source={{ uri: UPLOAD_URL, headers: TURNSTILE_WEBVIEW_HEADERS }}
        userAgent={SPOOFED_USER_AGENT}
        injectedJavaScriptBeforeContentLoaded={TURNSTILE_BEFORE_CONTENT_JS}
        style={[styles.webview, loading && { opacity: 0 }]}
        onNavigationStateChange={(navState) => {
          const currentNavUrl = navState.url || '';
          if (isLoginOrSessionUrl(currentNavUrl)) {
            setIsDisconnected(true);
          } else if (isDisconnected && isAuthenticatedUrl(currentNavUrl)) {
            console.log('[assignments_upload] In-place login detected!');
            setIsDisconnected(false);
            notifySessionRestored({ sourceUrl: UPLOAD_URL });
            try { refreshData?.(); } catch (e) {}
            if (!currentNavUrl.toLowerCase().includes('frmstudentassignmentupload')) {
              webViewRef.current?.injectJavaScript(`window.location.href = '${UPLOAD_URL}'; true;`);
            }
          }
        }}
        onLoadEnd={() => {
          setLoading(false);
          webViewRef.current?.injectJavaScript(getSessionWatcherJS(authData?.username, authData?.password));
        }}
        {...COMMON_TURNSTILE_WEBVIEW_PROPS}
        allowFileAccessFromFileURLs={true}
        injectedJavaScript={`
          (function() {
            var postMsg = function(data) {
              var bridge = window.ReactNativeWebView || window.__RN_WV_REF__;
              if (bridge && bridge.postMessage) {
                try { bridge.postMessage(JSON.stringify(data)); } catch(e) {}
              }
            };
            var s = document.createElement('style');
            s.innerHTML = \`
              #Happeningleft, .lpu-naac, .header-wrapper, footer, .top-nav, .side-nav, #id_header, .footer-wrapper { 
                display: none !important; 
              }
              .form-info, .page-content, .container-fluid, body, html { 
                width: 100% !important; 
                padding: 0 !important; 
                margin: 0 !important;
                background: white !important;
              }
              table { width: 100% !important; zoom: 0.9; }
              input[type="submit"], .btn { 
                border-radius: 8px !important;
                padding: 10px 20px !important;
                background-color: #007AFF !important;
                border: none !important;
              }
            \`;
            document.head.appendChild(s);
            
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
  container: { flex: 1 },
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
    shadowColor: '#AF52DE',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 28,
    elevation: 12,
    zIndex: 5,
  },
  backBtn: { width: 44, height: 44, justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '700' },
  webview: { flex: 1 },
  loaderContainer: {
    ...StyleSheet.absoluteFill,
    top: 100,
    justifyContent: 'center', alignItems: 'center',
    zIndex: 1,
  },
  loaderText: { marginTop: 12, fontSize: 15 },
});
