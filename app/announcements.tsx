import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Platform, ActivityIndicator, Dimensions } from 'react-native';
import Animated, { FadeInDown, FadeInUp, Layout } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { Bell, ChevronLeft, ChevronRight, GraduationCap, UserCheck, FileText, Tag, Award, MapPin, Sparkles } from 'lucide-react-native';
import { useScraper } from '../context/ScraperContext';
import { useTheme } from '../context/ThemeContext';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

export default function AnnouncementsScreen() {
  const { data, isScraping } = useScraper();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [activeCategoryTab, setActiveCategoryTab] = useState('ALL');
  const [expandedAnnouncementIdx, setExpandedAnnouncementIdx] = useState<number | null>(null);

  const getMessageConfig = (title: string) => {
    const t = (title || "").toLowerCase();
    if (
      t.includes('result') || t.includes('mark') || t.includes('grade') ||
      t.includes('academic') || t.includes('course') || t.includes('class') ||
      t.includes('syllabus') || t.includes('registration') || t.includes('timetable') ||
      t.includes('time table') || t.includes('subject') || t.includes('evaluation') ||
      t.includes('criteria') || t.includes('curriculum') || t.includes('lecture') ||
      t.includes('practical') || t.includes('workshop') || t.includes('faculty') ||
      t.includes('mentor') || t.includes('teacher') || t.includes('cse') ||
      t.includes('ece') || t.includes('mec') || t.includes('mth') || t.includes('phy')
    ) {
      return { color: '#34C759', label: 'ACADEMIC', icon: GraduationCap };
    }
    if (t.includes('attendance') || t.includes('shortage') || t.includes('presents'))
      return { color: '#FF9500', label: 'ATTENDANCE', icon: UserCheck };
    if (t.includes('exam') || t.includes('date sheet') || t.includes('ca ') || t.includes('ete'))
      return { color: '#FF3B30', label: 'EXAMINATIONS', icon: FileText };
    if (t.includes('fee') || t.includes('payment') || t.includes('due') || t.includes('fines'))
      return { color: '#5856D6', label: 'FINANCIAL', icon: Tag };
    if (t.includes('placement') || t.includes('job') || t.includes('interview') || t.includes('drive'))
      return { color: '#007AFF', label: 'PLACEMENT', icon: Award };
    if (t.includes('leave') || t.includes('duty') || t.includes('od'))
      return { color: '#AF52DE', label: 'LEAVE/OD', icon: MapPin };
    return { color: colors.primary, label: 'ANNOUNCEMENT', icon: Bell };
  };

  const getCardTheme = (label: string) => {
    switch (label) {
      case 'ACADEMIC':
        return {
          bg: isDark ? '#142517' : '#E8F5E9',
          text: isDark ? '#A5D6A7' : '#0B5D2E',
          textSecondary: isDark ? 'rgba(165, 214, 167, 0.7)' : 'rgba(11, 93, 46, 0.7)',
          accent: '#34C759'
        };
      case 'ATTENDANCE':
        return {
          bg: isDark ? '#2E1E12' : '#FFF3E0',
          text: isDark ? '#FFE0B2' : '#5D360B',
          textSecondary: isDark ? 'rgba(255, 224, 178, 0.7)' : 'rgba(93, 54, 11, 0.7)',
          accent: '#FF9500'
        };
      case 'EXAMINATIONS':
        return {
          bg: isDark ? '#2D1A1A' : '#FFEBEE',
          text: isDark ? '#FFCDD2' : '#B71C1C',
          textSecondary: isDark ? 'rgba(255, 205, 210, 0.7)' : 'rgba(183, 28, 28, 0.7)',
          accent: '#FF3B30'
        };
      case 'FINANCIAL':
        return {
          bg: isDark ? '#112A2E' : '#E0F7FA',
          text: isDark ? '#B2EBF2' : '#006064',
          textSecondary: isDark ? 'rgba(178, 235, 242, 0.7)' : 'rgba(0, 96, 100, 0.7)',
          accent: '#5856D6'
        };
      case 'PLACEMENT':
        return {
          bg: isDark ? '#161B2E' : '#E8EAF6',
          text: isDark ? '#C5CAE9' : '#1A237E',
          textSecondary: isDark ? 'rgba(197, 202, 233, 0.7)' : 'rgba(26, 35, 126, 0.7)',
          accent: '#007AFF'
        };
      case 'LEAVE/OD':
        return {
          bg: isDark ? '#231A2D' : '#F3E5F5',
          text: isDark ? '#E1BEE7' : '#4A148C',
          textSecondary: isDark ? 'rgba(225, 190, 231, 0.7)' : 'rgba(74, 20, 140, 0.7)',
          accent: '#AF52DE'
        };
      default:
        return {
          bg: isDark ? '#1D2226' : '#ECEFF1',
          text: isDark ? '#CFD8DC' : '#263238',
          textSecondary: isDark ? 'rgba(207, 216, 220, 0.7)' : 'rgba(38, 50, 56, 0.7)',
          accent: colors.primary
        };
    }
  };

  const announcements = data.announcements || [];

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Premium Header */}
      <View style={[styles.header, { borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.card }]}>
          <ChevronLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={[styles.title, { color: colors.text }]}>Announcements</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>University Announcements & Board</Text>
        </View>
      </View>

      {/* Category Tabs */}
      <View style={{ paddingVertical: 14 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
        >
          {[
            { key: 'ALL', label: 'All' },
            { key: 'ACADEMIC', label: 'Academics' },
            { key: 'EXAMINATIONS', label: 'Exams' },
            { key: 'ATTENDANCE', label: 'Attendance' },
            { key: 'FINANCIAL', label: 'Financial' },
            { key: 'PLACEMENT', label: 'Placement' },
            { key: 'LEAVE/OD', label: 'Leaves' },
            { key: 'ANNOUNCEMENT', label: 'Announcements' },
          ].map((tab) => {
            const count = tab.key === 'ALL' 
              ? announcements.length 
              : announcements.filter((item: any) => getMessageConfig(item.title).label === tab.key).length;

            if (count === 0 && tab.key !== 'ALL') return null;
            const isActive = activeCategoryTab === tab.key;
            const tabTheme = getCardTheme(tab.key);

            return (
              <TouchableOpacity
                key={tab.key}
                activeOpacity={0.8}
                onPress={() => {
                  setActiveCategoryTab(tab.key);
                  setExpandedAnnouncementIdx(null);
                }}
                style={[
                  styles.tabButton,
                  isActive
                    ? { backgroundColor: tabTheme.bg, borderColor: tabTheme.text + '25' }
                    : { 
                        backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                        borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' 
                      },
                ]}
              >
                <Text style={[styles.tabText, { color: isActive ? tabTheme.text : colors.textSecondary }]}>
                  {tab.label}
                </Text>
                <View style={[styles.badge, isActive ? { backgroundColor: tabTheme.text + '18' } : { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' }]}>
                  <Text style={[styles.badgeText, { color: isActive ? tabTheme.text : colors.textSecondary }]}>
                    {count}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Main List */}
      <ScrollView 
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
      >
        {(() => {
          const filtered = announcements.filter((item: any) => {
            if (activeCategoryTab === 'ALL') return true;
            return getMessageConfig(item.title).label === activeCategoryTab;
          });

          if (filtered.length > 0) {
            return filtered.map((item: any, idx: number) => {
              const isExpanded = expandedAnnouncementIdx === idx;
              const config = getMessageConfig(item.title);
              const Icon = config.icon;
              const cardTheme = getCardTheme(config.label);

              const cleanTitle = item.title ? item.title.trim() : 'Announcement';

              return (
                <Animated.View
                  key={item.id || idx}
                  layout={Layout.springify()}
                  entering={FadeInDown.delay(idx * 50)}
                >
                  <TouchableOpacity
                    onPress={() => setExpandedAnnouncementIdx(isExpanded ? null : idx)}
                    activeOpacity={0.92}
                    style={[
                      styles.card,
                      {
                        backgroundColor: cardTheme.bg,
                        shadowColor: cardTheme.accent,
                        shadowOpacity: isExpanded ? (isDark ? 0.2 : 0.08) : 0,
                        elevation: isExpanded ? 3 : 0,
                      }
                    ]}
                  >
                    {/* Top Row */}
                    <View style={styles.cardHeader}>
                      <View style={styles.cardHeaderLeft}>
                        <Icon size={12} color={cardTheme.text} style={{ opacity: 0.85 }} />
                        <Text style={[styles.cardLabel, { color: cardTheme.text }]}>
                          University Announcement
                        </Text>
                      </View>
                      <View style={[styles.chevronBg, { backgroundColor: cardTheme.text + '10' }]}>
                        <ChevronRight
                          size={11}
                          color={cardTheme.text}
                          style={{ 
                            opacity: 0.85,
                            transform: [{ rotate: isExpanded ? '90deg' : '0deg' }] 
                          }}
                        />
                      </View>
                    </View>

                    {/* Title */}
                    <Text 
                      style={[styles.cardTitle, { color: cardTheme.text }]} 
                      numberOfLines={isExpanded ? undefined : 2}
                    >
                      {cleanTitle}
                    </Text>

                    {/* Content */}
                    {(isExpanded || item.content) && (
                      <Animated.View entering={FadeInUp.duration(300)}>
                        <View style={[styles.divider, { backgroundColor: cardTheme.text + '15' }]} />
                        <Text
                          style={[styles.cardContent, { color: cardTheme.text }]}
                          numberOfLines={isExpanded ? undefined : 2}
                        >
                          {item.content}
                        </Text>
                      </Animated.View>
                    )}

                    {/* Footer Row */}
                    <View style={styles.cardFooter}>
                      <Text style={[styles.dateText, { color: cardTheme.textSecondary }]}>
                        {item.date}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </Animated.View>
              );
            });
          } else {
            return (
              <View style={styles.emptyState}>
                <View style={[styles.emptyIconBg, { backgroundColor: colors.primary + '10' }]}>
                  <Bell size={32} color={colors.primary} />
                </View>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No new announcements in this section</Text>
              </View>
            );
          }
        })()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  headerTitleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 10,
    minWidth: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  card: {
    borderRadius: 24,
    marginBottom: 14,
    overflow: 'hidden',
    position: 'relative',
    padding: 20,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    opacity: 0.85,
    letterSpacing: 0.2,
    textTransform: 'capitalize',
  },
  chevronBg: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 24,
    marginTop: 16,
    marginBottom: 16,
    letterSpacing: -0.2,
  },
  divider: {
    height: 1,
    marginBottom: 14,
  },
  cardContent: {
    fontSize: 13.5,
    lineHeight: 21,
    opacity: 0.9,
    marginBottom: 16,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  dateText: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyIconBg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
