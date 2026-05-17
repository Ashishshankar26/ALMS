import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Platform, SafeAreaView, ActivityIndicator, Dimensions } from 'react-native';
import Animated, { FadeInDown, FadeInUp, Layout } from 'react-native-reanimated';
import { RefreshCcw, CalendarCheck, FileText, Send } from 'lucide-react-native';
import { WebView } from 'react-native-webview';
import { useTheme } from '../../context/ThemeContext';

const { width } = Dimensions.get('window');

type TabType = 'APPLY' | 'SLIP';

const APPLY_URL = 'https://ums.lpu.in/lpuums/frmStudentHostelLeaveApplicationTermWise.aspx';
const SLIP_URL  = 'https://ums.lpu.in/lpuums/frmHostelLeaveSlipTest.aspx';

const injectedJS = `
  (function() {
    try {
      var style = document.createElement('style');
      style.innerHTML = '#Happeningleft, .lpu-naac, .header-wrapper, footer { display: none !important; } .form-info, .page-content { width: 100% !important; padding: 10px !important; }';
      document.head.appendChild(style);
    } catch (e) {}
  })(); true;
`;

export default function LeaveScreen() {
  const { colors, isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<TabType>('APPLY');
  const [loadingApply, setLoadingApply] = useState(true);
  const [loadingSlip,  setLoadingSlip]  = useState(true);
  const slipWebViewRef = React.useRef<WebView>(null);

  const refreshSlip = () => {
    setLoadingSlip(true);
    slipWebViewRef.current?.reload();
  };

  // WEB FALLBACK: WebView is not available in the browser
  if (Platform.OS === 'web') {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', padding: 24 }]}>
        <View style={[styles.heroHeader, { backgroundColor: colors.card, width: '100%', borderRadius: 24, marginBottom: 0, padding: 24, borderColor: colors.border }]}>
          <View style={styles.heroContent}>
            <View>
              <Text style={[styles.heroLabel, { color: colors.textSecondary }]}>Leave Management</Text>
              <Text style={[styles.heroValue, { color: colors.text }]}>Hostel Leave</Text>
            </View>
            <View style={[styles.heroIconCircle, { backgroundColor: colors.primary + '20' }]}>
              <CalendarCheck size={32} color={colors.primary} />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.refreshFab, { backgroundColor: colors.primary, position: 'relative', bottom: 0, alignSelf: 'stretch', marginBottom: 12 }]}
            onPress={() => (window as any).open(APPLY_URL, '_blank')}
            activeOpacity={0.8}
          >
            <Send size={18} color="#fff" />
            <Text style={styles.refreshFabText}>Open Apply Leave Portal</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.refreshFab, { backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.primary, position: 'relative', bottom: 0, alignSelf: 'stretch' }]}
            onPress={() => (window as any).open(SLIP_URL, '_blank')}
            activeOpacity={0.8}
          >
            <FileText size={18} color={colors.primary} />
            <Text style={[styles.refreshFabText, { color: colors.primary }]}>View Leave Slip</Text>
          </TouchableOpacity>

          <Text style={{ color: colors.textSecondary, fontSize: 12, textAlign: 'center', marginTop: 16, opacity: 0.7 }}>
            Opens securely in a new tab. Your UMS session is shared.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Hero Header - ANIMATED */}
      <Animated.View 
        entering={FadeInUp.delay(100).duration(800).springify()}
        style={[styles.heroHeader, { backgroundColor: colors.card, borderColor: colors.border }]}
      >
        <View style={styles.heroContent}>
          <View>
            <Text style={[styles.heroLabel, { color: colors.textSecondary }]}>Leave Management</Text>
            <Text style={[styles.heroValue, { color: colors.text }]}>Hostel Leave</Text>
          </View>
          <View style={[styles.heroIconCircle, { backgroundColor: colors.primary + '20' }]}>
            <CalendarCheck size={32} color={colors.primary} />
          </View>
        </View>

        <View style={[styles.segmentedContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.segmentItem, activeTab === 'APPLY' && { backgroundColor: colors.card }]}
            onPress={() => setActiveTab('APPLY')}
          >
            <Send size={16} color={activeTab === 'APPLY' ? colors.primary : colors.textSecondary} />
            <Text style={[styles.segmentText, { color: activeTab === 'APPLY' ? colors.text : colors.textSecondary }]}>
              Apply Leave
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentItem, activeTab === 'SLIP' && { backgroundColor: colors.card }]}
            onPress={() => setActiveTab('SLIP')}
          >
            <FileText size={16} color={activeTab === 'SLIP' ? colors.primary : colors.textSecondary} />
            <Text style={[styles.segmentText, { color: activeTab === 'SLIP' ? colors.text : colors.textSecondary }]}>
              Leave Slip
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      <View style={styles.webviewContainer}>
        {/* ── Apply Leave WebView ── */}
        <View style={[styles.webviewWrapper, activeTab !== 'APPLY' && styles.hidden]}>
          {loadingApply && (
            <View style={[styles.loaderContainer, { backgroundColor: colors.background }]}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loaderText, { color: colors.textSecondary }]}>Optimizing Portal View...</Text>
            </View>
          )}
          <WebView
            source={{ uri: APPLY_URL, headers: { 'X-Requested-With': '' } }}
            userAgent="Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36"
            style={[styles.webview, loadingApply && { opacity: 0 }]}
            onLoadEnd={() => setLoadingApply(false)}
            injectedJavaScript={injectedJS}
            sharedCookiesEnabled={true}
            thirdPartyCookiesEnabled={true}
          />
        </View>

        {/* ── Leave Slip WebView ── */}
        <View style={[styles.webviewWrapper, activeTab !== 'SLIP' && styles.hidden]}>
          {loadingSlip && (
            <View style={[styles.loaderContainer, { backgroundColor: colors.background }]}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loaderText, { color: colors.textSecondary }]}>Fetching Latest Slip...</Text>
            </View>
          )}
          <WebView
            ref={slipWebViewRef}
            source={{ uri: SLIP_URL, headers: { 'X-Requested-With': '' } }}
            userAgent="Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36"
            style={[styles.webview, loadingSlip && { opacity: 0 }]}
            onLoadEnd={() => setLoadingSlip(false)}
            injectedJavaScript={injectedJS}
            sharedCookiesEnabled={true}
            thirdPartyCookiesEnabled={true}
          />
          
          <TouchableOpacity 
            style={[styles.refreshFab, { backgroundColor: colors.primary }]} 
            onPress={refreshSlip}
            activeOpacity={0.8}
          >
            <RefreshCcw size={18} color="#fff" />
            <Text style={styles.refreshFabText}>Reload Slip</Text>
          </TouchableOpacity>
        </View>
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
    shadowColor: '#5856D6',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 28,
    elevation: 12,
    zIndex: 10,
  },
  heroContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 25,
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
    shadowColor: '#5856D6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 6,
  },
  segmentedContainer: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 4,
    gap: 4,
    borderWidth: 1.5,
    overflow: 'hidden',
    shadowColor: '#5856D6',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 5,
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
