import React, { useEffect } from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Link, Tabs, Redirect } from 'expo-router';
import { Pressable, ActivityIndicator, View, StyleSheet, Platform } from 'react-native';
import { Home, Calendar, Award, CheckCircle, FileText } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { useAuth } from '../../context/AuthContext';
import { registerForPushNotificationsAsync } from '../../utils/notifications';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useClientOnlyValue } from '@/components/useClientOnlyValue';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      registerForPushNotificationsAsync();
    }
  }, [isAuthenticated]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#007bff" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#8E8E93',
        headerShown: false,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          marginBottom: Platform.OS === 'ios' ? 0 : 5,
        },
        tabBarStyle: {
          position: 'absolute',
          bottom: Platform.OS === 'ios' ? 30 : 20,
          left: 20,
          right: 20,
          height: 65,
          borderRadius: 30,
          backgroundColor: '#fff',
          borderTopWidth: 0,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.1,
          shadowRadius: 15,
          elevation: 10,
          paddingBottom: Platform.OS === 'ios' ? 20 : 0,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => <Home color={focused ? '#007AFF' : color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="timetable"
        options={{
          title: 'Timetable',
          tabBarIcon: ({ color, focused }) => <Calendar color={focused ? '#FF9500' : color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="attendance"
        options={{
          title: 'Attendance',
          tabBarIcon: ({ color, focused }) => <CheckCircle color={focused ? '#34C759' : color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="results"
        options={{
          title: 'Results',
          tabBarIcon: ({ color, focused }) => <Award color={focused ? '#AF52DE' : color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="leave"
        options={{
          title: 'Leave',
          tabBarIcon: ({ color, focused }) => <FileText color={focused ? '#5856D6' : color} size={24} />,
        }}
      />
    </Tabs>
  );
}
