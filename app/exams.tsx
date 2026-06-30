import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, ActivityIndicator, ScrollView } from 'react-native';
import { WebView } from 'react-native-webview';
import { router } from 'expo-router';
import { ArrowLeft, Calendar, Clock, MapPin, User } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useScraper } from '../context/ScraperContext';
import { useTheme } from '../context/ThemeContext';

const EXAMS_URL = 'https://ums.lpu.in/lpuums/openapp.aspx?from=ums&toApp=nextproject&pagename=dashboard/examination/conduct/seatingplan';

export default function ExamsScreen() {
  const { data } = useScraper();
  const { colors, isDark } = useTheme();
  const [loading, setLoading] = useState(true);
  const [showWebView, setShowWebView] = useState(false);
  const exams = data.exams || [];
  const currentExamsUrl = data.examUrl || EXAMS_URL;

  const handleDownload = async (downloadUrl: string) => {
    try {
      setLoading(true);
      const filename = 'LPU_Admit_Card_' + new Date().getTime() + '.pdf';
      const fileUri = (FileSystem as any).documentDirectory + filename;
      
      console.log('Downloading admit card from:', downloadUrl);
      
      const downloadRes = await (FileSystem as any).downloadAsync(downloadUrl, fileUri);
      
      if (downloadRes.status === 200) {
        console.log('Download complete:', downloadRes.uri);
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(downloadRes.uri);
        } else {
          alert('Sharing is not available on this device');
        }
      } else {
        alert('Failed to download admit card. Status: ' + downloadRes.status);
      }
    } catch (error) {
      console.error('Download error:', error);
      alert('Error downloading admit card');
    } finally {
      setLoading(false);
    }
  };

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
        <TouchableOpacity 
          onPress={() => router.back()} 
          style={[
            styles.backBtn, 
            { 
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
            }
          ]}
        >
          <ArrowLeft size={18} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Upcoming Exams</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Native Exam List */}
      {exams.length > 0 && !showWebView ? (
        <ScrollView style={styles.examList} contentContainerStyle={{ padding: 20 }}>
                              {exams.map((exam: any, index: number) => {
            const examThemes = [
              {
                accent: '#FF3B30', // Vibrant Red
                bg: isDark ? '#2D1A1A' : '#FFEBEE',
                text: isDark ? '#FFCDD2' : '#B71C1C',
                textSecondary: isDark ? 'rgba(255, 205, 210, 0.7)' : 'rgba(183, 28, 28, 0.7)'
              },
              {
                accent: '#007AFF', // Electric Blue
                bg: isDark ? '#161B2E' : '#E8EAF6',
                text: isDark ? '#C5CAE9' : '#1A237E',
                textSecondary: isDark ? 'rgba(197, 202, 233, 0.7)' : 'rgba(26, 35, 126, 0.7)'
              },
              {
                accent: '#34C759', // Emerald Green
                bg: isDark ? '#142517' : '#E8F5E9',
                text: isDark ? '#A5D6A7' : '#0B5D2E',
                textSecondary: isDark ? 'rgba(165, 214, 167, 0.7)' : 'rgba(11, 93, 46, 0.7)'
              },
              {
                accent: '#FF9500', // Sunset Orange
                bg: isDark ? '#2E1E12' : '#FFF3E0',
                text: isDark ? '#FFE0B2' : '#5D360B',
                textSecondary: isDark ? 'rgba(255, 224, 178, 0.7)' : 'rgba(93, 54, 11, 0.7)'
              },
              {
                accent: '#5856D6', // Royal Purple -> mapped to Teal pastel
                bg: isDark ? '#112A2E' : '#E0F7FA',
                text: isDark ? '#B2EBF2' : '#006064',
                textSecondary: isDark ? 'rgba(178, 235, 242, 0.7)' : 'rgba(0, 96, 100, 0.7)'
              },
              {
                accent: '#AF52DE', // Deep Orchid/Violet
                bg: isDark ? '#231A2D' : '#F3E5F5',
                text: isDark ? '#E1BEE7' : '#4A148C',
                textSecondary: isDark ? 'rgba(225, 190, 231, 0.7)' : 'rgba(74, 20, 140, 0.7)'
              },
            ];
            const theme = examThemes[index % examThemes.length];
            const cardColor = theme.accent;

            return (
              <View 
                key={index} 
                style={[
                  styles.examCard, 
                  { 
                    padding: 18, 
                    borderRadius: 24, 
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)', 
                    borderWidth: 1.2,
                    backgroundColor: theme.bg,
                    marginBottom: 16,
                    shadowColor: theme.text,
                    shadowOffset: { width: 0, height: 8 },
                    shadowOpacity: isDark ? 0.15 : 0.08,
                    shadowRadius: 12,
                    elevation: 2,
                    position: 'relative',
                    overflow: 'hidden'
                  }
                ]}
              >
                {/* Exam Header */}
                <View style={styles.examHeader}>
                  <View style={[styles.dateBadge, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)', borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)', borderWidth: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, gap: 5 }]}>
                    <Calendar size={13} color={theme.text} />
                    <Text style={[styles.dateText, { color: theme.text, fontSize: 11, fontWeight: '700' }]}>{exam.date}</Text>
                  </View>
                  <View style={[styles.timeBadge, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)', borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)', borderWidth: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, gap: 5 }]}>
                    <Clock size={13} color={theme.text} />
                    <Text style={[styles.timeText, { color: theme.text, fontSize: 11, fontWeight: '700' }]}>{exam.time}</Text>
                  </View>
                </View>

                <Text style={{ fontSize: 12, fontWeight: '900', color: theme.text, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4, opacity: 0.8 }}>
                  {exam.subjectCode}
                </Text>
                
                <Text style={{ fontSize: 16, fontWeight: '800', color: theme.text, lineHeight: 22, letterSpacing: -0.2, marginBottom: 14 }}>
                  {exam.subject}
                </Text>

                <View style={[styles.footerRow, { borderTopColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)', borderTopWidth: 1, paddingTop: 12, flexDirection: 'row', justifyContent: 'space-between' }]}>
                  <View style={styles.metaItem}>
                    <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: theme.text + '15', alignItems: 'center', justifyContent: 'center' }}>
                      <MapPin size={11} color={theme.text} />
                    </View>
                    <Text style={[styles.metaText, { color: theme.textSecondary, fontWeight: '700' }]}>Room: {exam.room}</Text>
                  </View>
                  {exam.seat && (
                    <View style={styles.metaItem}>
                      <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: theme.text + '15', alignItems: 'center', justifyContent: 'center' }}>
                        <User size={11} color={theme.text} />
                      </View>
                      <Text style={[styles.metaText, { color: theme.textSecondary, fontWeight: '700' }]}>Seat: {exam.seat}</Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
          
          <TouchableOpacity 
            style={[styles.webFallbackBtn, { borderColor: colors.primary + '40', backgroundColor: colors.primary + '10' }]} 
            onPress={() => setShowWebView(true)}
          >
            <Text style={{ color: colors.primary, fontWeight: '600' }}>View Date Sheet on UMS</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <>
          {loading && (
            <View style={[styles.loaderContainer, { backgroundColor: colors.background }]}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loaderText, { color: colors.textSecondary }]}>Loading seating plan...</Text>
            </View>
          )}
          <WebView
            source={{ uri: currentExamsUrl }}
            userAgent="Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36"
            style={[styles.webview]}
            onLoadEnd={() => setLoading(false)}
            sharedCookiesEnabled={true}
            thirdPartyCookiesEnabled={true}
            injectedJavaScript={`
              (function() {
                var applyStyles = function() {
                  var s = document.getElementById('alms-injected-styles');
                  if (!s) {
                    s = document.createElement('style');
                    s.id = 'alms-injected-styles';
                    document.head.appendChild(s);
                  }
                  s.innerHTML = \`
                    .header-wrapper, footer, .top-nav, .side-nav, .navbar, .sidebar, .header-nav, .main-header, #Happeningleft, .lpu-naac, .footer-wrapper { 
                      display: none !important; 
                    }
                    .page-content, .container-fluid, body, html, .main-content, .wrapper, .content-wrapper { 
                      width: 100% !important; 
                      padding: 0 !important; 
                      margin: 0 !important;
                      overflow-x: hidden !important;
                    }
                    * { max-width: 100vw !important; }
                  \`;
                };

                applyStyles();
                
                // Monitor for dynamic changes and re-apply
                var observer = new MutationObserver(applyStyles);
                observer.observe(document.body, { childList: true, subtree: true });
                
                // Also check for redirects to login
                if (document.body.innerText.includes('Login') && document.querySelectorAll('input[type="password"]').length > 0) {
                  window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'SESSION_EXPIRED' }));
                }
              })(); true;
            `}
            onError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              console.warn('WebView error: ', nativeEvent);
            }}
            onHttpError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              console.warn('WebView HTTP error: ', nativeEvent);
            }}
            onFileDownload={({ nativeEvent: { downloadUrl } }) => {
              handleDownload(downloadUrl);
            }}
            onShouldStartLoadWithRequest={(request) => {
              // Intercept PDF downloads
              if (request.url.toLowerCase().endsWith('.pdf') || request.url.includes('Download') || request.url.includes('AdmitCard')) {
                handleDownload(request.url);
                return false;
              }
              return true;
            }}
            onNavigationStateChange={(navState) => {
              console.log('WebView Nav State Change:', navState.url);
              if (navState.url.includes('login') || navState.url.includes('Login')) {
                console.warn('WebView Redirected to Login!');
              }
            }}
            onMessage={(event) => {
              try {
                const msg = JSON.parse(event.nativeEvent.data);
                if (msg.type === 'SESSION_EXPIRED') {
                  console.warn('Scraper detected session expiry on Exams portal');
                  router.replace('/login');
                }
              } catch(e) {}
              console.log('WebView message:', event.nativeEvent.data);
            }}
          />
        </>
      )}
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
  backBtn: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    alignItems: 'center', 
    justifyContent: 'center',
    borderWidth: 1,
  },
  title: { fontSize: 18, fontWeight: '700', color: '#000' },
  webview: { flex: 1 },
  loaderContainer: {
    ...StyleSheet.absoluteFillObject,
    top: 100,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#fff', zIndex: 1,
  },
  loaderText: { marginTop: 12, color: '#8E8E93', fontSize: 15 },
  examList: { flex: 1 },
  examCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    marginBottom: 16,
    backgroundColor: '#fff',
    overflow: 'hidden',
    shadowColor: '#34C759',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 9,
  },
  examHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  dateText: { fontSize: 12, fontWeight: 'bold' },
  timeText: { fontSize: 12, fontWeight: 'bold' },
  courseCode: { fontSize: 14, fontWeight: 'bold', marginBottom: 4 },
  subjectName: { fontSize: 16, fontWeight: '600', marginBottom: 15 },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E5EA',
  },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 13, fontWeight: '500' },
  webFallbackBtn: {
    marginTop: 10,
    padding: 15,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    marginBottom: 30,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', marginTop: 20 },
  emptySubtitle: { fontSize: 14, textAlign: 'center', marginTop: 8 },
});
