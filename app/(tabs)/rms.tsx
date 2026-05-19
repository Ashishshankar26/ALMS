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
  
  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#0A0B10' : '#F7F9FC', paddingTop: insets.top }]}>
      <WebView
        ref={webViewRef}
        source={{ uri: 'https://ums.lpu.in/LpuUms/frmMtsUserHome.aspx' }}
        style={{ flex: 1 }}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        sharedCookiesEnabled={true}
        startInLoadingState={true}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
