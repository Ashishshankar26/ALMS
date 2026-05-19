import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated, Dimensions, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { useTheme } from '../../context/ThemeContext';
import { MessageSquare, RefreshCcw, Plus, ChevronRight, Search } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

// Premium Component
export default function RMSScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const webViewRef = useRef<WebView>(null);
  
  const [requests, setRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [debugLog, setDebugLog] = useState<string>('');

  const INJECTED_JAVASCRIPT = `
    (function() {
      try {
        var log = function(msg) { window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'LOG', msg: msg })); };
        log("RMS WebView loaded: " + window.location.href);
        
        // Very broad smart parsing for tables (standard UMS layout)
        var data = [];
        var rows = document.querySelectorAll('table tr');
        
        if (rows.length > 0) {
          log("Found " + rows.length + " table rows. Parsing...");
          for(var i=1; i<rows.length; i++) { // skip header
            var cells = rows[i].querySelectorAll('td');
            if (cells.length >= 3) {
              data.push({
                id: Math.random().toString(),
                ticketId: cells[0].innerText.trim(),
                category: cells[1].innerText.trim(),
                subject: cells[2] ? cells[2].innerText.trim() : 'No Subject',
                status: cells[cells.length-1].innerText.trim() || 'Pending',
                date: cells[3] ? cells[3].innerText.trim() : 'Recent'
              });
            }
          }
        }
        
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'RMS_DATA',
          data: data
        }));
        
        // Also dump a sample for debugging
        var sample = document.body.innerText.substring(0, 1000);
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'DUMP', text: sample }));
      } catch(e) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'LOG', msg: "ERROR: " + e.message }));
      }
    })();
    true;
  `;

  const onMessage = (event: any) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'LOG') {
        console.log("RMS Log:", msg.msg);
        setDebugLog(prev => prev + "\\n" + msg.msg);
      } else if (msg.type === 'RMS_DATA') {
        console.log("RMS Parsed Data:", msg.data);
        setRequests(msg.data);
        setIsLoading(false);
      } else if (msg.type === 'DUMP') {
        console.log("RMS Dump:", msg.text);
      }
    } catch(e) {}
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#0A0B10' : '#F7F9FC' }]}>
      {/* Hidden WebView for fetching data */}
      <View style={{ position: 'absolute', width: 0, height: 0, opacity: 0 }}>
        <WebView
          ref={webViewRef}
          source={{ uri: 'https://ums.lpu.in/LpuUms/frmMtsUserHome.aspx' }}
          injectedJavaScript={INJECTED_JAVASCRIPT}
          onMessage={onMessage}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          sharedCookiesEnabled={true}
        />
      </View>

      <View style={[styles.header, { paddingTop: insets.top + 20, paddingHorizontal: 24, backgroundColor: isDark ? '#0A0B10' : '#F7F9FC' }]}>
        <View>
          <Text style={[styles.headerTitle, { color: isDark ? '#FFFFFF' : '#111827' }]}>Request Management</Text>
          <Text style={[styles.headerSubtitle, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>Track and log assistance requests</Text>
        </View>
        <TouchableOpacity 
          style={[styles.headerBtn, { backgroundColor: isDark ? '#1F2937' : '#E5E7EB' }]}
          onPress={() => {
            setIsLoading(true);
            webViewRef.current?.reload();
          }}
        >
          <RefreshCcw size={20} color={isDark ? '#F3F4F6' : '#374151'} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.actionRow}>
          <TouchableOpacity style={[styles.newRequestBtn, { backgroundColor: colors.primary }]}>
            <Plus size={20} color="#FFF" />
            <Text style={styles.newRequestText}>New Request</Text>
          </TouchableOpacity>
          <View style={[styles.searchBox, { backgroundColor: isDark ? '#1F2937' : '#FFFFFF' }]}>
            <Search size={18} color={isDark ? '#9CA3AF' : '#6B7280'} />
            <Text style={[styles.searchText, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>Search tickets...</Text>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: isDark ? '#F3F4F6' : '#111827' }]}>Recent Requests</Text>

        {isLoading ? (
          <View style={[styles.card, { backgroundColor: isDark ? '#1F2937' : '#FFFFFF', alignItems: 'center', padding: 40 }]}>
            <Text style={{ color: isDark ? '#9CA3AF' : '#6B7280', fontSize: 16, fontWeight: '600' }}>Syncing with UMS...</Text>
            <Text style={{ color: isDark ? '#6B7280' : '#9CA3AF', fontSize: 12, marginTop: 8 }}>{debugLog.split('\\n').pop()}</Text>
          </View>
        ) : requests.length > 0 ? (
          requests.map((req, idx) => (
            <TouchableOpacity key={req.id || idx} activeOpacity={0.8} style={[styles.card, { backgroundColor: isDark ? '#1F2937' : '#FFFFFF' }]}>
              <View style={styles.cardHeader}>
                <View style={[styles.tag, { backgroundColor: req.status.toLowerCase().includes('pending') ? '#FEF3C7' : '#D1FAE5' }]}>
                  <Text style={[styles.tagText, { color: req.status.toLowerCase().includes('pending') ? '#D97706' : '#059669' }]}>
                    {req.status}
                  </Text>
                </View>
                <Text style={[styles.date, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>{req.date}</Text>
              </View>
              <Text style={[styles.subject, { color: isDark ? '#F3F4F6' : '#111827' }]}>{req.subject}</Text>
              <View style={styles.cardFooter}>
                <Text style={[styles.ticketId, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>ID: {req.ticketId}</Text>
                <View style={styles.chevronWrap}>
                  <ChevronRight size={14} color={isDark ? '#9CA3AF' : '#6B7280'} />
                </View>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={[styles.card, { backgroundColor: isDark ? '#1F2937' : '#FFFFFF', alignItems: 'center', padding: 40 }]}>
            <MessageSquare size={48} color={isDark ? '#374151' : '#E5E7EB'} />
            <Text style={{ color: isDark ? '#9CA3AF' : '#6B7280', fontSize: 16, fontWeight: '600', marginTop: 16 }}>No requests found</Text>
            <Text style={{ color: isDark ? '#6B7280' : '#9CA3AF', fontSize: 13, marginTop: 8, textAlign: 'center' }}>
              You haven't logged any requests yet, or we couldn't parse the UMS layout.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(156, 163, 175, 0.1)',
  },
  headerTitle: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 14, fontWeight: '500', marginTop: 4 },
  headerBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: { padding: 24, paddingBottom: 100 },
  actionRow: { flexDirection: 'row', gap: 12, marginBottom: 32 },
  newRequestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 16,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  newRequestText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderRadius: 16,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchText: { fontSize: 15, fontWeight: '500' },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  card: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  tagText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  date: { fontSize: 12, fontWeight: '600' },
  subject: { fontSize: 17, fontWeight: '700', lineHeight: 24, marginBottom: 16 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ticketId: { fontSize: 13, fontWeight: '600' },
  chevronWrap: { width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(156, 163, 175, 0.1)', alignItems: 'center', justifyContent: 'center' },
});
