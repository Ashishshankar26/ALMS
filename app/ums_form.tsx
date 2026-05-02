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
        <WebView
          source={{ uri: fullUrl }}
          style={{ flex: 1, backgroundColor: colors.background }}
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => setLoading(false)}
          // Ensure session is shared if possible (standard WebView behavior)
          incognito={false}
          domStorageEnabled={true}
          javaScriptEnabled={true}
        />
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
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
});
