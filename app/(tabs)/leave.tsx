import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Platform, SafeAreaView, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';

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
  const [activeTab, setActiveTab] = useState<TabType>('APPLY');
  const [loadingApply, setLoadingApply] = useState(true);
  const [loadingSlip,  setLoadingSlip]  = useState(true);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Leave Manager</Text>

        <View style={styles.segmentedControl}>
          <TouchableOpacity
            style={[styles.segmentButton, activeTab === 'APPLY' && styles.segmentActive]}
            onPress={() => setActiveTab('APPLY')}
          >
            <Text style={[styles.segmentText, activeTab === 'APPLY' && styles.segmentTextActive]}>
              Apply Leave
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentButton, activeTab === 'SLIP' && styles.segmentActive]}
            onPress={() => setActiveTab('SLIP')}
          >
            <Text style={[styles.segmentText, activeTab === 'SLIP' && styles.segmentTextActive]}>
              Leave Slip
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.webviewContainer}>
        {/* ── Apply Leave WebView — stays mounted, only hidden ── */}
        <View style={[styles.webviewWrapper, activeTab !== 'APPLY' && styles.hidden]}>
          {loadingApply && (
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.loaderText}>Loading portal...</Text>
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

        {/* ── Leave Slip WebView — stays mounted, only hidden ── */}
        <View style={[styles.webviewWrapper, activeTab !== 'SLIP' && styles.hidden]}>
          {loadingSlip && (
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.loaderText}>Loading portal...</Text>
            </View>
          )}
          <WebView
            source={{ uri: SLIP_URL, headers: { 'X-Requested-With': '' } }}
            userAgent="Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36"
            style={[styles.webview, loadingSlip && { opacity: 0 }]}
            onLoadEnd={() => setLoadingSlip(false)}
            injectedJavaScript={injectedJS}
            sharedCookiesEnabled={true}
            thirdPartyCookiesEnabled={true}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    paddingTop: Platform.OS === 'ios' ? 20 : 40,
    paddingBottom: 15,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#C7C7CC',
  },
  title: { fontSize: 28, fontWeight: 'bold', color: '#000', letterSpacing: -0.5, marginBottom: 20 },
  segmentedControl: { flexDirection: 'row', backgroundColor: '#F2F2F7', borderRadius: 8, padding: 3 },
  segmentButton: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 6 },
  segmentActive: {
    backgroundColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1, shadowRadius: 2, elevation: 2,
  },
  segmentText: { fontSize: 14, fontWeight: '500', color: '#8E8E93' },
  segmentTextActive: { color: '#000', fontWeight: '600' },
  webviewContainer: { flex: 1 },
  webviewWrapper: { ...StyleSheet.absoluteFillObject },
  hidden: { display: 'none' },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
    marginBottom: Platform.OS === 'ios' ? 80 : 60,
  },
  loaderContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#F2F2F7', zIndex: 1,
  },
  loaderText: { marginTop: 10, color: '#8E8E93', fontSize: 14 },
});
