import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { router } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useScraper } from '../context/ScraperContext';

const EXAMS_URL = 'https://ums.lpu.in/lpuums/frmStudentDateSheetConduction.aspx';

export default function ExamsScreen() {
  const { data } = useScraper();
  const [loading, setLoading] = useState(true);
  const currentExamsUrl = data.examUrl || EXAMS_URL;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Upcoming Exams</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Loading overlay */}
      {loading && (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loaderText}>Loading exam schedule...</Text>
        </View>
      )}

      <WebView
        source={{ uri: currentExamsUrl }}
        userAgent="Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36"
        style={[styles.webview, loading && { opacity: 0 }]}
        onLoadEnd={() => setLoading(false)}
        sharedCookiesEnabled={true}
        thirdPartyCookiesEnabled={true}
        injectedJavaScript={`
          (function() {
            // Hide everything except the main content
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
              .card { border: none !important; box-shadow: none !important; }
            \`;
            document.head.appendChild(s);
            
            // Check for session expiry
            if (document.body.innerText.includes('Login') && document.querySelectorAll('input[type="password"]').length > 0) {
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'SESSION_EXPIRED' }));
            }
          })(); true;
        `}
        onMessage={(event) => {
          try {
            const msg = JSON.parse(event.nativeEvent.data);
            if (msg.type === 'SESSION_EXPIRED') {
              router.replace('/login');
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
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#C7C7CC',
  },
  backBtn: { width: 44, height: 44, justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '700', color: '#000' },
  webview: { flex: 1 },
  loaderContainer: {
    ...StyleSheet.absoluteFillObject,
    top: 100,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#fff', zIndex: 1,
  },
  loaderText: { marginTop: 12, color: '#8E8E93', fontSize: 15 },
});
