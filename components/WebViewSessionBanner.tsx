import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Platform } from 'react-native';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import { KeyRound, ArrowRight, X } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { router } from 'expo-router';

export interface WebViewSessionBannerProps {
  visible: boolean;
  returnTo?: string;
  onLoginPress?: () => void;
  onDismiss?: () => void;
  message?: string;
}

export function WebViewSessionBanner({
  visible,
  returnTo,
  onLoginPress,
  onDismiss,
  message = 'Session disconnected • Tap to log in',
}: WebViewSessionBannerProps) {
  const { colors, isDark } = useTheme();

  if (!visible) return null;

  const handlePress = () => {
    if (onLoginPress) {
      onLoginPress();
    } else if (returnTo) {
      router.push({
        pathname: '/login',
        params: { returnTo },
      } as any);
    } else {
      router.push('/login' as any);
    }
  };

  return (
    <Animated.View
      entering={FadeInDown.duration(260)}
      exiting={FadeOutUp.duration(200)}
      style={[
        styles.container,
        {
          backgroundColor: isDark ? '#1C1D24' : '#FFFFFF',
          borderColor: isDark ? 'rgba(255, 149, 0, 0.4)' : 'rgba(255, 149, 0, 0.5)',
          shadowColor: '#000000',
        },
      ]}
    >
      <TouchableOpacity
        style={styles.touchArea}
        onPress={handlePress}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel="Log in to restore session"
      >
        <View style={[styles.iconCircle, { backgroundColor: '#FF950020' }]}>
          <KeyRound size={16} color="#FF9500" />
        </View>

        <View style={styles.textWrap}>
          <Text style={[styles.message, { color: colors.text }]} numberOfLines={1}>
            {message}
          </Text>
        </View>

        <View style={[styles.loginBtn, { backgroundColor: colors.primary }]}>
          <Text style={styles.loginBtnText}>Log In</Text>
          <ArrowRight size={13} color="#FFFFFF" style={{ marginLeft: 3 }} />
        </View>
      </TouchableOpacity>

      {onDismiss && (
        <TouchableOpacity
          style={styles.dismissBtn}
          onPress={onDismiss}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <X size={15} color={colors.textSecondary} />
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 12,
    marginVertical: 6,
    borderRadius: 14,
    borderWidth: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 99,
  },
  touchArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  textWrap: {
    flex: 1,
    marginRight: 8,
  },
  message: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  loginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  loginBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  dismissBtn: {
    padding: 4,
    marginLeft: 6,
  },
});
