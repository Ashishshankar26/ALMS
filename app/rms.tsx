import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Platform, ActivityIndicator } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { MessageSquare, Search, PlusCircle, RefreshCcw, ChevronLeft } from 'lucide-react-native';
import { WebView } from 'react-native-webview';
import { useTheme } from '../context/ThemeContext';
import { router } from 'expo-router';

type TabType = 'TRACK' | 'LOG';

const TRACK_URL = 'https://ums.lpu.in/LpuUms/frmMtsUserHome.aspx';
const LOG_URL   = 'https://ums.lpu.in/LpuUms/frmMtsMessage.aspx';

const injectedJS = `
  (function() {
    try {
      var style = document.createElement('style');
      style.innerHTML = '#Happeningleft, .lpu-naac, .header-wrapper, footer { display: none !important; } .form-info, .page-content { width: 100% !important; padding: 10px !important; }';
      document.head.appendChild(style);
    } catch (e) {}
  })(); true;
`;

export default function RMSScreen() {
  const { colors, isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<TabType>('TRACK');
  const [loadingTrack, setLoadingTrack] = useState(true);
  const [loadingLog, setLoadingLog] = useState(true);
  const trackWebViewRef = React.useRef<WebView>(null);
  const logWebViewRef = React.useRef<WebView>(null);

  const refreshWebView = () => {
    if (activeTab === 'TRACK') {
      setLoadingTrack(true);
      trackWebViewRef.current?.reload();
    } else {
      setLoadingLog(true);
      logWebViewRef.current?.reload();
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Hero Header - ANIMATED */}
      <Animated.View 
        entering={FadeInUp.delay(100).duration(800).springify()}
        style={[
          styles.heroHeader, 
          { 
            backgroundColor: colors.card, 
            borderColor: colors.border,
            shadowColor: isDark ? '#000000' : 'rgba(0,0,0,0.15)'
          }
        ]}
      >
        <View style={styles.heroContent}>
          <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.primary + '15' }]}>
            <ChevronLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[styles.heroLabel, { color: colors.textSecondary }]}>Request Management</Text>
            <Text style={[styles.heroValue, { color: colors.text }]}>RMS Portal</Text>
          </View>
          <View style={[styles.heroIconCircle, { backgroundColor: colors.primary + '20' }]}>
            <MessageSquare size={32} color={colors.primary} />
          </View>
        </View>

        <View style={[styles.segmentedContainer, { backgroundColor: isDark ? colors.surface : 'rgba(0, 0, 0, 0.05)', borderColor: isDark ? colors.border : 'rgba(0, 0, 0, 0.08)' }]}>
          <TouchableOpacity
            style={[
              styles.segmentItem, 
              activeTab === 'TRACK' && { 
                backgroundColor: isDark ? colors.card : '#FFFFFF',
                shadowColor: '#000000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: isDark ? 0 : 0.08,
                shadowRadius: 4,
                elevation: isDark ? 0 : 2,
              }
            ]}
            onPress={() => setActiveTab('TRACK')}
          >
            <Search size={16} color={activeTab === 'TRACK' ? colors.primary : (isDark ? colors.textSecondary : '#555558')} />
            <Text style={[styles.segmentText, { color: activeTab === 'TRACK' ? colors.text : (isDark ? colors.textSecondary : '#555558') }]}>
              Track Request
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.segmentItem, 
              activeTab === 'LOG' && { 
                backgroundColor: isDark ? colors.card : '#FFFFFF',
                shadowColor: '#000000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: isDark ? 0 : 0.08,
                shadowRadius: 4,
                elevation: isDark ? 0 : 2,
              }
            ]}
            onPress={() => setActiveTab('LOG')}
          >
            <PlusCircle size={16} color={activeTab === 'LOG' ? colors.primary : (isDark ? colors.textSecondary : '#555558')} />
            <Text style={[styles.segmentText, { color: activeTab === 'LOG' ? colors.text : (isDark ? colors.textSecondary : '#555558') }]}>
              Log Request
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      <View style={styles.webviewContainer}>
        {/* ── Track WebView ── */}
        <View style={[styles.webviewWrapper, activeTab !== 'TRACK' && styles.hidden]}>
          {loadingTrack && (
            <View style={[styles.loaderContainer, { backgroundColor: colors.background }]}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loaderText, { color: colors.textSecondary }]}>Optimizing Portal View...</Text>
            </View>
          )}
          <WebView
            ref={trackWebViewRef}
            source={{ uri: TRACK_URL, headers: { 'X-Requested-With': '' } }}
            userAgent="Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36"
            style={[styles.webview, loadingTrack && { opacity: 0 }]}
            onLoadEnd={() => setLoadingTrack(false)}
            injectedJavaScript={injectedJS}
            sharedCookiesEnabled={true}
            thirdPartyCookiesEnabled={true}
          />
        </View>

        {/* ── Log Request WebView ── */}
        <View style={[styles.webviewWrapper, activeTab !== 'LOG' && styles.hidden]}>
          {loadingLog && (
            <View style={[styles.loaderContainer, { backgroundColor: colors.background }]}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loaderText, { color: colors.textSecondary }]}>Loading Form...</Text>
            </View>
          )}
          <WebView
            ref={logWebViewRef}
            source={{ uri: LOG_URL, headers: { 'X-Requested-With': '' } }}
            userAgent="Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36"
            style={[styles.webview, loadingLog && { opacity: 0 }]}
            onLoadEnd={() => setLoadingLog(false)}
            injectedJavaScript={injectedJS}
            sharedCookiesEnabled={true}
            thirdPartyCookiesEnabled={true}
          />
        </View>

        <TouchableOpacity 
          style={[styles.refreshFab, { backgroundColor: colors.primary }]} 
          onPress={refreshWebView}
          activeOpacity={0.8}
        >
          <RefreshCcw size={18} color="#fff" />
          <Text style={styles.refreshFabText}>Reload Page</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  heroHeader: {
    paddingTop: Platform.OS === 'ios' ? 70 : 50,
    paddingBottom: 25,
    paddingHorizontal: 25,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    borderWidth: 1.5,
    borderTopWidth: 0,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
    zIndex: 10,
  },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 25,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  heroLabel: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  heroValue: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  heroIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  segmentedContainer: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 4,
    gap: 4,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  segmentItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '700',
  },
  webviewContainer: {
    flex: 1,
    marginTop: -20, // Negative margin to tuck under header slightly
  },
  webviewWrapper: {
    ...StyleSheet.absoluteFillObject,
  },
  hidden: {
    display: 'none',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
    marginTop: 20,
    marginBottom: Platform.OS === 'ios' ? 100 : 80,
  },
  loaderContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
    paddingTop: 100,
  },
  loaderText: {
    marginTop: 15,
    fontSize: 14,
    fontWeight: '600',
  },
  refreshFab: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 140 : 120,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 30,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.22)',
    shadowColor: '#5856D6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.24,
    shadowRadius: 18,
    elevation: 10,
  },
  refreshFabText: {
    color: '#fff',
    fontWeight: '800',
    marginLeft: 10,
    fontSize: 15,
  },
});
