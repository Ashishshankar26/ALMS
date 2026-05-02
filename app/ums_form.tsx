import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { useLocalSearchParams, router } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { useScraper } from '../context/ScraperContext';

export default function UmsFormScreen() {
  const { url, title } = useLocalSearchParams<{ url: string; title: string }>();
  const { colors, isDark } = useTheme();
  const [loading, setLoading] = React.useState(true);
  
  // Get the base UMS URL
  const baseUrl = 'https://ums.lpu.in/lpuums/';
  const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url}`;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>{title || 'UMS Portal'}</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={{ flex: 1 }}>
        {Platform.OS === 'web' ? (
          <View style={styles.webFallbackContainer}>
            <View style={[styles.webFallbackCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.iconBg, { backgroundColor: colors.primary + '15' }]}>
                <Text style={{ fontSize: 32 }}>🔐</Text>
              </View>
              <Text style={[styles.fallbackTitle, { color: colors.text }]}>Secure Access Required</Text>
              <Text style={[styles.fallbackDesc, { color: colors.textSecondary }]}>
                For your security, university forms like "{title || 'this portal'}" must be opened in a dedicated secure window.
              </Text>
              <TouchableOpacity 
                style={[styles.webButton, { backgroundColor: colors.primary }]}
                onPress={() => window.open(fullUrl, '_blank')}
              >
                <Text style={styles.webButtonText}>Open Secure Form</Text>
              </TouchableOpacity>
              <Text style={styles.webFooterText}>Return here once you're finished.</Text>
            </View>
          </View>
        ) : (
          <>
            <WebView
              source={{ uri: fullUrl }}
              style={{ flex: 1, backgroundColor: colors.background }}
              onLoadStart={() => setLoading(true)}
              onLoadEnd={() => setLoading(false)}
              incognito={false}
              domStorageEnabled={true}
              javaScriptEnabled={true}
            />
            {loading && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            )}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 15,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
    marginLeft: -10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  webFallbackContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  webFallbackCard: {
    width: '100%',
    maxWidth: 400,
    padding: 30,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
  },
  iconBg: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  fallbackTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
  },
  fallbackDesc: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 25,
    opacity: 0.8,
  },
  webButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 15,
  },
  webButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  webFooterText: {
    fontSize: 12,
    color: '#8E8E93',
  }
});
