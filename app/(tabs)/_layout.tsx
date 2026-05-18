import React, { useEffect, useRef } from 'react';
import { Tabs, Redirect } from 'expo-router';
import { ActivityIndicator, View, StyleSheet, Platform, Dimensions, TouchableOpacity } from 'react-native';
import { Home, Calendar, Award, CheckCircle, FileText } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { useAuth } from '../../context/AuthContext';
import { registerForPushNotificationsAsync } from '../../utils/notifications';
import { useTheme } from '../../context/ThemeContext';

const { width: SCREEN_W } = Dimensions.get('window');
const TAB_BAR_W = Math.min(SCREEN_W * 0.85, 380);

const ICON_MAP: Record<string, any> = {
  index: Home,
  timetable: Calendar,
  attendance: CheckCircle,
  results: Award,
  leave: FileText,
};

import { useSafeAreaInsets } from 'react-native-safe-area-context';

function MyTabBar({ state, navigation }: any) {
  const insets = useSafeAreaInsets();
  const bottomInset = insets.bottom > 0 ? insets.bottom + 8 : 20;
  const { isDark } = useTheme();
  return (
    <View style={[styles.tabBarOuter, { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.7)', borderWidth: 1, bottom: bottomInset, left: (SCREEN_W - TAB_BAR_W) / 2, width: TAB_BAR_W }]}>
      <BlurView tint={isDark ? 'dark' : 'light'} intensity={Platform.OS === 'ios' ? 85 : 65} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, borderRadius: 32 }} />
      {state.routes.map((route: any, i: number) => {
        const focused = i === state.index;
        const Icon = ICON_MAP[route.name] || Home;
        const onPress = () => { navigation.navigate(route.name); };
        return (
          <TouchableOpacity key={route.key} onPress={onPress} activeOpacity={0.7} style={[
            styles.tabBtn,
            { backgroundColor: isDark ? (focused ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.18)') : (focused ? '#FFFFFF' : 'rgba(255,255,255,0.7)'),
              borderColor: isDark ? (focused ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.18)') : (focused ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.5)') },
          ]}>
            <Icon size={20} color={isDark ? '#FFFFFF' : '#111'} />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function TabLayout() {
  const { isAuthenticated, loading } = useAuth();
  const { colors, isDark } = useTheme();

  useEffect(() => {
    if (isAuthenticated) {
      registerForPushNotificationsAsync();
    }
  }, [isAuthenticated]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: isDark ? '#000' : '#fff' }}>
        <ActivityIndicator size="large" color="#007bff" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  return (
    <Tabs
      tabBar={(props: any) => <MyTabBar {...props} />}
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: { display: 'none' },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="timetable" options={{ title: 'Timetable' }} />
      <Tabs.Screen name="attendance" options={{ title: 'Attendance' }} />
      <Tabs.Screen name="results" options={{ title: 'Results' }} />
      <Tabs.Screen name="leave" options={{ title: 'Leave' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarOuter: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 36 : 24,
    left: (SCREEN_W - TAB_BAR_W) / 2,
    width: TAB_BAR_W,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 10,
  },
  tabBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});
