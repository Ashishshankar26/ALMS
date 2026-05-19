import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Dimensions, Platform, Modal, TextInput } from 'react-native';
import Animated, { FadeInDown, FadeInUp, Layout } from 'react-native-reanimated';

import { useScraper } from '../../context/ScraperContext';
import { CheckCircle, AlertTriangle, XCircle, Plus, Minus, Calendar, Award, X, Target } from 'lucide-react-native';
import { useTheme, Typography } from '../../context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');
const SEMESTER_DATE_KEY = '@semester_end_date';
const TARGET_PCT_KEY = '@attendance_target_pct';

export default function AttendanceScreen() {
  const insets = useSafeAreaInsets();
  const { data, isScraping } = useScraper();
  const { colors, isDark } = useTheme();
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [targetPct, setTargetPct] = useState(75);
  const [semesterEndDate, setSemesterEndDate] = useState(new Date('2026-06-01'));
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Persistence: Load Date & Target on Mount
  useEffect(() => {
    const loadStoredData = async () => {
      try {
        const storedDate = await AsyncStorage.getItem(SEMESTER_DATE_KEY);
        if (storedDate) {
          setSemesterEndDate(new Date(storedDate));
        }
        const storedTarget = await AsyncStorage.getItem(TARGET_PCT_KEY);
        if (storedTarget) {
          setTargetPct(parseInt(storedTarget, 10));
        }
      } catch (e) {
        console.error('Failed to load stored attendance data', e);
      }
    };
    loadStoredData();
  }, []);

  // Persistence: Save Date on Change
  useEffect(() => {
    const saveDate = async () => {
      try {
        await AsyncStorage.setItem(SEMESTER_DATE_KEY, semesterEndDate.toISOString());
      } catch (e) {
        console.error('Failed to save semester date', e);
      }
    };
    saveDate();
  }, [semesterEndDate]);

  // Persistence: Save Target on Change
  useEffect(() => {
    const saveTarget = async () => {
      try {
        await AsyncStorage.setItem(TARGET_PCT_KEY, targetPct.toString());
      } catch (e) {
        console.error('Failed to save target percentage', e);
      }
    };
    saveTarget();
  }, [targetPct]);

  const changeTarget = (delta: number) => {
    setTargetPct(prev => Math.min(100, Math.max(50, prev + delta)));
  };

  const [showAggregate, setShowAggregate] = useState(true);
  const attendanceData = data.attendance || [];
  const openedSubject = selectedSubject ? attendanceData.find((item: any) => item.subjectCode === selectedSubject) : null;

  // Calculate Remaining Weeks
  const today = new Date();
  const diffTime = Math.max(0, semesterEndDate.getTime() - today.getTime());
  const diffWeeks = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7));
  const EST_CLASSES_PER_WEEK = 4; // Default estimate
  const remainingClassesEst = diffWeeks * EST_CLASSES_PER_WEEK;

  // Calculate totals for the summary section
  const totalClasses = attendanceData.reduce((acc, curr) => acc + (curr.totalClasses || 0), 0);
  const attendedClasses = attendanceData.reduce((acc, curr) => acc + (curr.attendedClasses || 0), 0);
  const dutyLeaves = attendanceData.reduce((acc, curr) => acc + (curr.dutyLeaves || 0), 0);
  
  // Use UMS-provided overall attendance (fetched from #AttPercent on dashboard)
  // Only calculate ourselves as fallback if UMS value is missing
  const umsOverallAttendance = data.overallAttendance && data.overallAttendance !== '0.0' ? data.overallAttendance : null;
  const formattedUmsAttendance = umsOverallAttendance ? Math.round(parseFloat(umsOverallAttendance)).toString() : null;
  const calcOverall = totalClasses > 0 ? Math.round(((attendedClasses + dutyLeaves) / totalClasses) * 100).toString() : '0';
  const overallAttendance = formattedUmsAttendance || calcOverall;
  const rawOverallAttendance = totalClasses > 0 ? Math.round((attendedClasses / totalClasses) * 100).toString() : '0';
  
  const displayAttendance = showAggregate ? overallAttendance : rawOverallAttendance;

  const getStatus = (percentage: number) => {
    if (percentage === 100 || percentage >= targetPct + 5) return { text: 'Safe', color: '#34C759', icon: <CheckCircle size={20} color="#34C759" /> };
    if (percentage >= targetPct)                            return { text: 'Warning', color: '#FF9500', icon: <AlertTriangle size={20} color="#FF9500" /> };
    return { text: 'Critical', color: '#FF3B30', icon: <XCircle size={20} color="#FF3B30" /> };
  };

  const getEffectivePct = (item: any) => (
    item.percentage && item.percentage > 0
      ? item.percentage
      : (item.totalClasses > 0
        ? Math.round(((item.attendedClasses + (item.dutyLeaves || 0)) / item.totalClasses) * 100)
        : 0)
  );

  const getWidgetTheme = (percentage: number): [string, string, string] => {
    if (percentage === 100 || percentage >= targetPct + 5) return ['#F4FFF8', '#34C759', '#111111'];
    if (percentage >= targetPct)                            return ['#FFF8EA', '#FF9500', '#111111'];
    return ['#FFF1F3', '#FF3B30', '#111111'];
  };

  const widgetPalettes: [string, string, string][] = [
    ['#0EA5E9', '#2563EB', '#FFFFFF'],
    ['#22C55E', '#059669', '#FFFFFF'],
    ['#A855F7', '#7C3AED', '#FFFFFF'],
    ['#F97316', '#EA580C', '#FFFFFF'],
    ['#14B8A6', '#0F766E', '#FFFFFF'],
    ['#EC4899', '#BE185D', '#FFFFFF'],
    ['#FACC15', '#F59E0B', '#111111'],
    ['#6366F1', '#4338CA', '#FFFFFF'],
  ];

  const getWidgetPalette = (_index: number, percentage: number): [string, string, string] => getWidgetTheme(percentage);

  const DAYS_MAP = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const getPreciseRemainingClasses = (subjectCode: string) => {
    let count = 0;
    const tempDate = new Date();
    // Start from tomorrow to count future classes
    tempDate.setDate(tempDate.getDate() + 1);
    
    while (tempDate <= semesterEndDate) {
      const dayName = DAYS_MAP[tempDate.getDay()];
      const dayClasses = data.timetable?.[dayName] || [];
      
      dayClasses.forEach((cls: any) => {
        if (cls.subjectCode === subjectCode || cls.subjectCode?.includes(subjectCode)) {
          count++;
        }
      });
      
      tempDate.setDate(tempDate.getDate() + 1);
    }
    return count;
  };

  const calculateMissable = (item: any) => {
    const { attendedClasses: attended, totalClasses: total, dutyLeaves: leaves, subjectCode } = item;
    const effectiveAttended = (attended || 0) + (leaves || 0);
    
    // 100% Precise Remaining Count based on Calendar traversal
    const remainingPrecise = getPreciseRemainingClasses(subjectCode);
    
    const totalTermClasses = (total || 0) + remainingPrecise;
    const minNeededToHitTarget = Math.ceil((targetPct / 100) * totalTermClasses);
    
    // Max missable = (Current Attended + All future classes) - Min needed for target
    const rawSafeToMiss = (effectiveAttended + remainingPrecise) - minNeededToHitTarget;
    const safeToMissTerm = Math.min(remainingPrecise, Math.max(0, rawSafeToMiss));
    
    const forecastIfMissed = totalTermClasses > 0 
      ? Math.round((effectiveAttended + (remainingPrecise - safeToMissTerm)) / totalTermClasses * 100)
      : 0;

    return { 
      value: safeToMissTerm, 
      label: 'Safe to miss (Term)', 
      isSafe: safeToMissTerm > 0,
      forecast: forecastIfMissed,
      remaining: remainingPrecise
    };
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        <Animated.View 
          entering={FadeInUp.delay(100).duration(800).springify()}
          style={{ marginHorizontal: 16, marginTop: insets.top > 0 ? insets.top + 10 : 20 }}
        >
          {/* Header Label outside */}
          <Text style={{ color: colors.textSecondary, fontSize: 10, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 }}>
            ATTENDANCE WIDGET
          </Text>

          <View 
            style={{ 
              borderRadius: 24, 
              borderColor: isDark ? '#2D3139' : '#E5E5E5', 
              borderWidth: 1.5,
              backgroundColor: isDark ? '#000000' : '#FFFFFF',
              shadowColor: '#000000',
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: isDark ? 0.15 : 0.05,
              shadowRadius: 12,
              elevation: 2,
              padding: 20,
            }}
          >
            {/* Top Row: Left Overall Percentage, Right Segment LED & Stats */}
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              
              {/* Left Column (40% width) */}
              <View style={{ flex: 4, justifyContent: 'center' }}>
                <Text style={{ color: isDark ? '#888888' : '#666666', fontSize: 8, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 2 }}>
                  OVERALL
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ color: colors.text, fontSize: 44, fontWeight: '900', letterSpacing: -1.5, lineHeight: 46 }}>
                    {displayAttendance}%
                  </Text>
                  {isScraping && (
                    <View style={{ backgroundColor: colors.primary + '18', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                      <Text style={{ color: colors.primary, fontSize: 8, fontWeight: '900', letterSpacing: 0.5 }}>SYNC</Text>
                    </View>
                  )}
                </View>
                
                {/* Dynamic Status Pill */}
                {(() => {
                  const numVal = parseFloat(displayAttendance);
                  const isSafe = numVal >= targetPct;
                  const pillColor = isSafe ? '#00E676' : '#FF9100';
                  return (
                    <View 
                      style={{ 
                        alignSelf: 'flex-start',
                        backgroundColor: pillColor, 
                        paddingHorizontal: 8, 
                        paddingVertical: 2, 
                        borderRadius: 4, 
                        marginTop: 8 
                      }}
                    >
                      <Text style={{ color: '#000000', fontWeight: '900', fontSize: 8, letterSpacing: 0.8 }}>
                        {isSafe ? 'SAFE' : 'LOW ATTENDANCE'}
                      </Text>
                    </View>
                  );
                })()}

                {/* Aggregate / Raw Toggle inside Widget */}
                <TouchableOpacity 
                  onPress={() => setShowAggregate(!showAggregate)}
                  activeOpacity={0.8}
                  style={{
                    alignSelf: 'flex-start',
                    backgroundColor: isDark ? 'rgba(0, 122, 255, 0.12)' : 'rgba(0, 122, 255, 0.06)',
                    borderColor: isDark ? 'rgba(0, 122, 255, 0.22)' : 'rgba(0, 122, 255, 0.12)',
                    borderWidth: 1,
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderRadius: 6,
                    marginTop: 6
                  }}
                >
                  <Text style={{ color: isDark ? '#FFFFFF' : colors.primary, fontSize: 8, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' }}>
                    {showAggregate ? 'Aggregate View' : 'Raw View'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Middle Vertical Tech Divider */}
              <View style={{ width: 1.5, height: '80%', backgroundColor: isDark ? '#2D3139' : '#E5E5E5', marginHorizontal: 16 }} />

              {/* Right Column: LED & Stats (60% width) */}
              <View style={{ flex: 6, justifyContent: 'center' }}>
                {/* LED Progress segments */}
                {(() => {
                  const numVal = parseFloat(displayAttendance);
                  const isSafe = numVal >= targetPct;
                  const barColor = isSafe ? '#00E676' : '#FF9100';
                  const activeBlocks = Math.round(numVal / 10);
                  
                  return (
                    <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%', marginBottom: 16 }}>
                      {Array.from({ length: 10 }).map((_, idx) => {
                        const isActive = idx < activeBlocks;
                        return (
                          <View 
                            key={idx}
                            style={{ 
                              flex: 1, 
                              height: 6, 
                              borderRadius: 1.5, 
                              backgroundColor: isActive ? barColor : (isDark ? '#262626' : '#E5E5E5'),
                              marginRight: idx === 9 ? 0 : 3
                            }} 
                          />
                        );
                      })}
                    </View>
                  );
                })()}

                {/* Grid Analytics Columns */}
                <View style={{ width: '100%' }}>
                  {/* Labels Row */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 4 }}>
                    <View style={{ flex: 1, alignItems: 'center' }}>
                      <Text style={{ color: isDark ? '#888888' : '#666666', fontSize: 7, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase', textAlign: 'center' }} numberOfLines={1}>
                        DELIVERED
                      </Text>
                    </View>
                    <View style={{ flex: 1, alignItems: 'center' }}>
                      <Text style={{ color: isDark ? '#888888' : '#666666', fontSize: 7, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase', textAlign: 'center' }} numberOfLines={1}>
                        ATTENDED
                      </Text>
                    </View>
                    <View style={{ flex: 1, alignItems: 'center' }}>
                      <Text style={{ color: isDark ? '#888888' : '#666666', fontSize: 7, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase', textAlign: 'center' }} numberOfLines={1}>
                        DUTY LEAVE
                      </Text>
                    </View>
                  </View>

                  {/* Values Row */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%' }}>
                    <View style={{ flex: 1, alignItems: 'center' }}>
                      <Text style={{ color: colors.text, fontSize: 18, fontWeight: '900', textAlign: 'center' }}>
                        {totalClasses}
                      </Text>
                    </View>
                    <View style={{ flex: 1, alignItems: 'center' }}>
                      <Text style={{ color: colors.text, fontSize: 18, fontWeight: '900', textAlign: 'center' }}>
                        {attendedClasses}
                      </Text>
                    </View>
                    <View style={{ flex: 1, alignItems: 'center' }}>
                      <Text style={{ color: colors.text, fontSize: 18, fontWeight: '900', textAlign: 'center' }}>
                        {dutyLeaves}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

            </View>

            {/* Bottom Tech Divider Line */}
            <View style={{ height: 1.5, backgroundColor: isDark ? '#2D3139' : '#E5E5E5', marginVertical: 16 }} />

            {/* Bottom Row: Date Picker & Goal target controller */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              
              {/* Date selection capsule */}
              <TouchableOpacity 
                onPress={() => setShowDatePicker(true)}
                activeOpacity={0.8}
                style={{ 
                  flex: 1, 
                  flexDirection: 'row', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  gap: 6,
                  backgroundColor: isDark ? '#16181D' : 'rgba(0,0,0,0.02)',
                  borderColor: isDark ? '#2D3139' : '#E5E5E5',
                  borderWidth: 1.2,
                  borderRadius: 12,
                  paddingVertical: 8,
                }}
              >
                <Calendar size={12} color={colors.textSecondary} />
                <Text style={{ color: colors.text, fontSize: 10, fontWeight: '800' }}>
                  End: {semesterEndDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </Text>
              </TouchableOpacity>

              {/* Goal control capsule */}
              <View 
                style={{ 
                  flex: 1.2, 
                  flexDirection: 'row', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  backgroundColor: isDark ? '#16181D' : 'rgba(0,0,0,0.02)',
                  borderColor: isDark ? '#2D3139' : '#E5E5E5',
                  borderWidth: 1.2,
                  borderRadius: 12,
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                }}
              >
                <TouchableOpacity 
                  onPress={() => changeTarget(-5)} 
                  activeOpacity={0.8}
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    backgroundColor: isDark ? '#2D3139' : 'rgba(0, 0, 0, 0.05)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Minus size={11} color={colors.text} />
                </TouchableOpacity>
                
                <Text style={{ color: colors.text, fontSize: 10, fontWeight: '800' }}>
                  Goal: {targetPct}%
                </Text>
                
                <TouchableOpacity 
                  onPress={() => changeTarget(5)} 
                  activeOpacity={0.8}
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    backgroundColor: isDark ? '#2D3139' : 'rgba(0, 0, 0, 0.05)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Plus size={11} color={colors.text} />
                </TouchableOpacity>
              </View>

            </View>

          </View>
        </Animated.View>
      <View style={styles.list}>
        <Text style={[styles.sectionTitleCompact, { color: colors.text }]}>COURSE WIDGETS</Text>
        <View style={styles.widgetGrid}>
        {attendanceData.map((item, index) => {
          const effectivePct = getEffectivePct(item);
          const status = getStatus(effectivePct);
          const [base, accent, ink] = getWidgetPalette(index, effectivePct);
          const proj = calculateMissable(item);

          return (
            <TouchableOpacity 
              key={index}
              style={[styles.widgetCardWrap, index % 2 === 0 && styles.widgetCardLeft, { shadowColor: accent }]}
              onPress={() => setSelectedSubject(item.subjectCode)}
              activeOpacity={0.82}
            >
              <View
                style={[styles.widgetCard, { borderColor: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.62)', backgroundColor: isDark ? 'rgba(26,28,32,0.92)' : base }]}
              >
                <View style={styles.widgetHandle} />
                <View style={styles.widgetTopRow}>
                  <View style={[styles.subjectCodeBadge, { backgroundColor: accent + '18', borderColor: accent + '30' }]}>
                    <Text style={[styles.subjectCode, { color: isDark ? '#FFFFFF' : '#111111' }]}>{item.subjectCode}</Text>
                  </View>
                  <View style={[styles.widgetArrow, { backgroundColor: accent + '18', borderColor: accent + '30' }]}>
                    {React.cloneElement(status.icon, { color: accent, size: 15 })}
                  </View>
                </View>

                <Text style={[styles.widgetSubject, { color: isDark ? '#FFFFFF' : '#111111' }]} numberOfLines={2}>{item.subjectName}</Text>
                <Text style={[styles.widgetValue, { color: isDark ? '#FFFFFF' : '#111111' }]}>{effectivePct}%</Text>

                <View style={[styles.widgetProgress, { backgroundColor: isDark ? 'rgba(255,255,255,0.14)' : 'rgba(17,17,17,0.08)' }]}>
                  <View style={[styles.widgetProgressFill, { width: `${Math.min(effectivePct, 100)}%`, backgroundColor: accent }]} />
                </View>

                <View style={styles.widgetFooterRow}>
                  <View style={styles.widgetFooterItem}>
                    <Text style={[styles.widgetMiniValue, { color: isDark ? '#FFFFFF' : '#111111' }]}>{item.attendedClasses}/{item.totalClasses}</Text>
                  </View>
                  <View style={[styles.widgetFooterDivider, { backgroundColor: isDark ? '#FFFFFF' : '#111111' }]} />
                  <View style={styles.widgetFooterItem}>
                    <Text style={[styles.widgetMiniValue, { color: isDark ? '#FFFFFF' : '#111111', textAlign: 'right' }]}>DL {item.dutyLeaves || 0}</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
        </View>

      </View>
    </ScrollView>

      <Modal visible={!!openedSubject} transparent animationType="fade" onRequestClose={() => setSelectedSubject(null)}>
                                                                                <View style={styles.modalOverlay}>
          {openedSubject ? (() => {
            const effectivePct = getEffectivePct(openedSubject);
            const status = getStatus(effectivePct);
            const proj = calculateMissable(openedSubject);
            const [base, accent, ink] = getWidgetTheme(effectivePct);
            const skipTodayPct = Math.round(((openedSubject.attendedClasses + (openedSubject.dutyLeaves || 0)) / (openedSubject.totalClasses + 1)) * 100);

            // Format student name to "LASTNAME, FIRSTNAME" safely and make sure it is compact
            const rawName = data.profile?.name || 'STUDENT PASSENGER';
            const nameParts = rawName.trim().split(' ');
            const formattedName = nameParts.length > 1 
              ? `${nameParts[nameParts.length - 1]}, ${nameParts[0]}`
              : rawName;

            return (
              <View style={{ alignItems: 'center' }}>
                <TouchableOpacity 
                  activeOpacity={0.96} 
                  onPress={() => setSelectedSubject(null)}
                >
                  <Animated.View 
                    entering={FadeInUp.duration(280)} 
                    style={[
                      styles.attendanceWindow, 
                      { 
                        backgroundColor: isDark ? '#12151D' : '#FFFFFF', 
                        borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                        borderWidth: 1.5,
                        shadowColor: accent,
                        padding: 0,
                        position: 'relative',
                        overflow: 'visible',
                        height: 200,
                        width: width - 24,
                        maxWidth: 440,
                        borderRadius: 18,
                        justifyContent: 'space-between'
                      }
                    ]}
                  >
                    {/* Top Accent Strip (Dynamic Status Accent Color) */}
                    <View style={{ position: 'absolute', top: 0, left: 24, right: 24, height: 3, backgroundColor: accent, borderBottomLeftRadius: 1.5, borderBottomRightRadius: 1.5 }} />

                    {/* Inner Ticket Container */}
                    <View style={{ flex: 1, padding: 14, paddingVertical: 14, justifyContent: 'space-between' }}>
                      
                      {/* Top Row: Passenger, Barcode, Date */}
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        {/* Passenger */}
                        <View style={{ flex: 1.2, marginRight: 4 }}>
                          <Text style={{ color: colors.textSecondary, fontSize: 7.5, fontWeight: '900', letterSpacing: 0.5 }}>PASSENGER</Text>
                          <Text style={{ color: isDark ? '#FFFFFF' : '#111419', fontSize: 12, fontWeight: '800', textTransform: 'uppercase', marginTop: 2 }} numberOfLines={1}>
                            {formattedName}
                          </Text>
                        </View>

                        {/* Barcode in the Middle (Compact to prevent crowding) */}
                        <View style={{ flex: 1.2, alignItems: 'center', marginTop: -2 }}>
                          <Text style={{ color: isDark ? '#FFFFFF' : '#111419', fontSize: 6.5, fontWeight: '900', letterSpacing: 0.5, marginBottom: 2 }}>FIRST CLASS TICKET</Text>
                          <View style={{ flexDirection: 'row', gap: 1, height: 14, alignItems: 'center', justifyContent: 'center' }}>
                            {[1, 2, 1, 3, 1, 2, 1, 3, 2, 1, 2, 1].map((w, idx) => (
                              <View key={idx} style={{ width: w, height: '100%', backgroundColor: isDark ? '#FFFFFF' : '#111419', opacity: 0.85 }} />
                            ))}
                          </View>
                        </View>

                        {/* Date */}
                        <View style={{ flex: 0.6, alignItems: 'flex-end', marginLeft: 4 }}>
                          <Text style={{ color: colors.textSecondary, fontSize: 7.5, fontWeight: '900', letterSpacing: 0.5 }}>DATE</Text>
                          <Text style={{ color: isDark ? '#FFFFFF' : '#111419', fontSize: 12, fontWeight: '800', marginTop: 2 }}>
                            {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' })}
                          </Text>
                        </View>
                      </View>

                      {/* Middle Row: Flight Route (Subject Code ➔ Status) */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 4 }}>
                        {/* Origin (Subject Code) */}
                        <View style={{ flex: 4.5 }}>
                          <Text style={{ color: colors.textSecondary, fontSize: 7.5, fontWeight: '900', letterSpacing: 0.5 }}>ORIGIN</Text>
                          <Text style={{ color: isDark ? '#FFFFFF' : '#111419', fontSize: 26, fontWeight: '900', letterSpacing: -0.5 }} numberOfLines={1}>
                            {openedSubject.subjectCode}
                          </Text>
                          <Text style={{ color: colors.textSecondary, fontSize: 8.5, fontWeight: '700', textTransform: 'uppercase', marginTop: 1 }} numberOfLines={1}>
                            {openedSubject.subjectName}
                          </Text>
                        </View>

                        {/* Center Direction Arrow */}
                        <View style={{ flex: 1.5, alignItems: 'center', justifyContent: 'center' }}>
                          <Text style={{ color: isDark ? '#FFFFFF' : '#111419', fontSize: 24, fontWeight: '300' }}>➔</Text>
                        </View>

                        {/* Destination (Status) */}
                        <View style={{ flex: 4.5, alignItems: 'flex-end' }}>
                          <Text style={{ color: colors.textSecondary, fontSize: 7.5, fontWeight: '900', letterSpacing: 0.5 }}>STATUS</Text>
                          <Text style={{ color: accent, fontSize: 26, fontWeight: '900', letterSpacing: -0.5 }} numberOfLines={1}>
                            {status.text}
                          </Text>
                          <Text style={{ color: colors.textSecondary, fontSize: 8.5, fontWeight: '700', textTransform: 'uppercase', marginTop: 1 }}>
                            STANDING
                          </Text>
                        </View>
                      </View>

                      {/* Bottom Section: Single horizontal row with 4 columns, full labels, massive numbers */}
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1.5, borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', paddingTop: 10 }}>
                        <View style={{ alignItems: 'flex-start', flex: 1 }}>
                          <Text style={{ color: colors.textSecondary, fontSize: 7.5, fontWeight: '900', letterSpacing: 0.5 }}>PERCENTAGE</Text>
                          <Text style={{ color: accent, fontSize: 16, fontWeight: '900', marginTop: 2 }}>{effectivePct}%</Text>
                        </View>
                        <View style={{ alignItems: 'center', flex: 1 }}>
                          <Text style={{ color: colors.textSecondary, fontSize: 7.5, fontWeight: '900', letterSpacing: 0.5 }}>MISSABLE</Text>
                          <Text style={{ color: proj.isSafe ? '#34C759' : '#FF3B30', fontSize: 16, fontWeight: '900', marginTop: 2 }}>{proj.value}</Text>
                        </View>
                        <View style={{ alignItems: 'center', flex: 1 }}>
                          <Text style={{ color: colors.textSecondary, fontSize: 7.5, fontWeight: '900', letterSpacing: 0.5 }}>FORECAST</Text>
                          <Text style={{ color: proj.forecast < targetPct ? '#FF3B30' : '#34C759', fontSize: 16, fontWeight: '900', marginTop: 2 }}>{proj.forecast}%</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end', flex: 1 }}>
                          <Text style={{ color: colors.textSecondary, fontSize: 7.5, fontWeight: '900', letterSpacing: 0.5 }}>SKIP TODAY</Text>
                          <Text style={{ color: skipTodayPct < targetPct ? '#FF3B30' : '#34C759', fontSize: 16, fontWeight: '900', marginTop: 2 }}>{skipTodayPct}%</Text>
                        </View>
                      </View>

                    </View>

                    {/* Bottom Accent Strip (Dynamic Status Accent Color) */}
                    <View style={{ position: 'absolute', bottom: 0, left: 24, right: 24, height: 3, backgroundColor: accent, borderTopLeftRadius: 1.5, borderTopRightRadius: 1.5 }} />

                    {/* Left half-circle notch punch-out (Vertically Centered) */}
                    <View 
                      style={{ 
                        position: 'absolute', 
                        left: -12, 
                        top: '50%', 
                        marginTop: -12, 
                        width: 24, 
                        height: 24, 
                        borderRadius: 12, 
                        backgroundColor: isDark ? '#08090C' : 'rgba(0,0,0,0.5)', 
                        borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                        borderWidth: 1.5,
                        zIndex: 10 
                      }} 
                    />
                    
                    {/* Right half-circle notch punch-out (Vertically Centered) */}
                    <View 
                      style={{ 
                        position: 'absolute', 
                        right: -12, 
                        top: '50%', 
                        marginTop: -12, 
                        width: 24, 
                        height: 24, 
                        borderRadius: 12, 
                        backgroundColor: isDark ? '#08090C' : 'rgba(0,0,0,0.5)', 
                        borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                        borderWidth: 1.5,
                        zIndex: 10 
                      }} 
                    />
                  </Animated.View>
                </TouchableOpacity>

                <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 9, fontWeight: '800', marginTop: 15, letterSpacing: 1, textTransform: 'uppercase' }}>
                  TAP TICKET TO DISMISS
                </Text>
              </View>
            );
          })() : null}
        </View>
      </Modal>

      {/* Simple Date Picker Modal */}
      <Modal visible={showDatePicker} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <Animated.View 
            entering={FadeInUp} 
            style={[
              styles.dateModal, 
              { 
                backgroundColor: isDark ? '#171A20' : '#FFFFFF', 
                borderColor: colors.border, 
                borderWidth: 1.5,
                shadowColor: isDark ? '#000000' : 'rgba(0,0,0,0.18)'
              }
            ]}
          >
            <Text style={[styles.modalTitle, { color: colors.text }]}>Set Semester End Date</Text>
            <Text style={[styles.modalSub, { color: colors.textSecondary }]}>This helps predict your final attendance.</Text>
            
            <View style={styles.dateSelectorGrid}>
              {/* Day Selector */}
              <View style={[styles.dateSelectorRow, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }]}>
                <Text style={[styles.dateSelectorLabel, { color: colors.textSecondary }]}>Day</Text>
                <View style={styles.dateSelectorControls}>
                  <TouchableOpacity 
                    style={[
                      styles.dateSmallBtn, 
                      { 
                        backgroundColor: isDark ? colors.surface : 'rgba(0, 0, 0, 0.04)', 
                        borderColor: isDark ? colors.border : 'rgba(0, 0, 0, 0.08)', 
                        borderWidth: 1 
                      }
                    ]}
                    onPress={() => {
                      const d = new Date(semesterEndDate);
                      d.setDate(d.getDate() - 1);
                      setSemesterEndDate(d);
                    }}
                  >
                    <Minus size={16} color={colors.text} />
                  </TouchableOpacity>
                  <Text style={[styles.dateSegmentValue, { color: colors.text }]}>{semesterEndDate.getDate()}</Text>
                  <TouchableOpacity 
                    style={[
                      styles.dateSmallBtn, 
                      { 
                        backgroundColor: isDark ? colors.surface : 'rgba(0, 0, 0, 0.04)', 
                        borderColor: isDark ? colors.border : 'rgba(0, 0, 0, 0.08)', 
                        borderWidth: 1 
                      }
                    ]}
                    onPress={() => {
                      const d = new Date(semesterEndDate);
                      d.setDate(d.getDate() + 1);
                      setSemesterEndDate(d);
                    }}
                  >
                    <Plus size={16} color={colors.text} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Month Selector */}
              <View style={[styles.dateSelectorRow, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }]}>
                <Text style={[styles.dateSelectorLabel, { color: colors.textSecondary }]}>Month</Text>
                <View style={styles.dateSelectorControls}>
                  <TouchableOpacity 
                    style={[
                      styles.dateSmallBtn, 
                      { 
                        backgroundColor: isDark ? colors.surface : 'rgba(0, 0, 0, 0.04)', 
                        borderColor: isDark ? colors.border : 'rgba(0, 0, 0, 0.08)', 
                        borderWidth: 1 
                      }
                    ]}
                    onPress={() => {
                      const d = new Date(semesterEndDate);
                      d.setMonth(d.getMonth() - 1);
                      setSemesterEndDate(d);
                    }}
                  >
                    <Minus size={16} color={colors.text} />
                  </TouchableOpacity>
                  <Text style={[styles.dateSegmentValue, { color: colors.text }]}>{semesterEndDate.toLocaleDateString('en-US', { month: 'short' })}</Text>
                  <TouchableOpacity 
                    style={[
                      styles.dateSmallBtn, 
                      { 
                        backgroundColor: isDark ? colors.surface : 'rgba(0, 0, 0, 0.04)', 
                        borderColor: isDark ? colors.border : 'rgba(0, 0, 0, 0.08)', 
                        borderWidth: 1 
                      }
                    ]}
                    onPress={() => {
                      const d = new Date(semesterEndDate);
                      d.setMonth(d.getMonth() + 1);
                      setSemesterEndDate(d);
                    }}
                  >
                    <Plus size={16} color={colors.text} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Year Selector */}
              <View style={[styles.dateSelectorRow, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }]}>
                <Text style={[styles.dateSelectorLabel, { color: colors.textSecondary }]}>Year</Text>
                <View style={styles.dateSelectorControls}>
                  <TouchableOpacity 
                    style={[
                      styles.dateSmallBtn, 
                      { 
                        backgroundColor: isDark ? colors.surface : 'rgba(0, 0, 0, 0.04)', 
                        borderColor: isDark ? colors.border : 'rgba(0, 0, 0, 0.08)', 
                        borderWidth: 1 
                      }
                    ]}
                    onPress={() => {
                      const d = new Date(semesterEndDate);
                      d.setFullYear(d.getFullYear() - 1);
                      setSemesterEndDate(d);
                    }}
                  >
                    <Minus size={16} color={colors.text} />
                  </TouchableOpacity>
                  <Text style={[styles.dateSegmentValue, { color: colors.text }]}>{semesterEndDate.getFullYear()}</Text>
                  <TouchableOpacity 
                    style={[
                      styles.dateSmallBtn, 
                      { 
                        backgroundColor: isDark ? colors.surface : 'rgba(0, 0, 0, 0.04)', 
                        borderColor: isDark ? colors.border : 'rgba(0, 0, 0, 0.08)', 
                        borderWidth: 1 
                      }
                    ]}
                    onPress={() => {
                      const d = new Date(semesterEndDate);
                      d.setFullYear(d.getFullYear() + 1);
                      setSemesterEndDate(d);
                    }}
                  >
                    <Plus size={16} color={colors.text} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <TouchableOpacity 
              style={[styles.saveBtn, { backgroundColor: colors.primary }]}
              onPress={() => setShowDatePicker(false)}
            >
              <Text style={styles.saveBtnText}>Done</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    marginTop: Platform.OS === 'ios' ? 54 : 34,
    marginHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 12,
    paddingHorizontal: 18,
    borderRadius: 26,
    borderWidth: 1.5,
    overflow: 'hidden',
    zIndex: 5,
  },
  headerTopCompact: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  chipSectionLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 4,
    opacity: 0.7,
  },
  sectionTitleCompact: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 14,
    marginTop: 4,
    paddingHorizontal: 2,
    opacity: 0.8,
  },
  headerLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  heroValueRow_old: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroValueCompact: {
    fontSize: 34,
    lineHeight: 36,
    fontWeight: '900',
    letterSpacing: -1,
  },
  toggleBtnCompact: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 18,
  },
  toggleTextCompact: {
    fontSize: 12,
    fontWeight: '700',
  },
  actionRowCompact: {
    flexDirection: 'row',
    gap: 10,
  },
  chipCompact: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 42,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  chipTextCompact: {
    fontSize: 12,
    fontWeight: '700',
  },
  syncingBadge_old: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 8,
  },
  syncingText_old: {
    fontSize: 10,
    fontWeight: '800',
  },
  targetControlCompact_old: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  miniBtn_old: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aggregateBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  targetControlsTop: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,122,255,0.08)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 3,
    gap: 8,
  },
  targetBtnTop: {
    padding: 2,
  },
  targetValueTop: {
    ...Typography.tiny,
    minWidth: 28,
    textAlign: 'center',
  },
  aggregateBadgeText: {
    ...Typography.tiny,
  },
  heroLabel: {
    ...Typography.caption,
  },
  heroValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
  },
  heroValue: {
    ...Typography.h1,
    fontSize: 48, // Keeping this large size for hero
  },
  syncingText_very_old: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  heroIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRowHero: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 25,
    paddingTop: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  statItemHero: {
    flex: 1,
    alignItems: 'center',
  },
  statValueHero: {
    fontSize: 18,
    fontWeight: '800',
  },
  statLabelHero: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  dividerHero: {
    width: 1,
    height: 20,
    opacity: 0.3,
  },
  heroActionGrid: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  actionChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 16,
  },
  actionChipLabel: {
    ...Typography.tiny,
    fontSize: 9,
    letterSpacing: 0.5,
  },
  actionChipValue: {
    ...Typography.bodyBold,
    fontSize: 14,
  },
  targetControlCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  miniBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncingBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  syncingText: {
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  targetRowHero: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 25,
    padding: 12,
    borderRadius: 16,
  },
  targetLabelHero: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  targetControlsHero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  targetBtnHero: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  targetValueHero: {
    fontSize: 16,
    fontWeight: '800',
    minWidth: 40,
    textAlign: 'center',
  },
  datePickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,122,255,0.05)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  dateText: {
    fontSize: 12,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  attendanceWindow: {
    width: '100%',
    maxWidth: 350,
    borderRadius: 30,
    borderWidth: 1,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.12,
    shadowRadius: 28,
    elevation: 12,
  },
  windowHero: {
    padding: 18,
    paddingTop: 20,
    minHeight: 122,
  },
  windowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  windowPercent: {
    fontSize: 34,
    lineHeight: 36,
    fontWeight: '900',
    letterSpacing: -1,
    marginLeft: 10,
  },
  windowHeroRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 12,
    gap: 10,
  },
  windowHeroCopy: {
    flex: 1,
  },
  windowSubject: {
    fontSize: 15,
    lineHeight: 18,
    fontWeight: '900',
    opacity: 0.92,
  },
  windowStatusText: {
    fontSize: 11,
    fontWeight: '900',
    marginTop: 5,
    textTransform: 'uppercase',
  },
  windowProgress: {
    height: 6,
    borderRadius: 4,
    marginTop: 12,
    overflow: 'hidden',
  },
  windowBody: {
    padding: 12,
  },
  windowMetricGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  windowMetric: {
    flex: 1,
    minHeight: 58,
    borderRadius: 17,
    borderWidth: 1,
    padding: 9,
    justifyContent: 'space-between',
  },
  windowMetricValue: {
    fontSize: 19,
    fontWeight: '900',
  },
  windowMetricLabel: {
    fontSize: 9,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  compactForecastGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  compactForecastTile: {
    flex: 1,
    minHeight: 76,
    borderRadius: 18,
    borderWidth: 1,
    padding: 9,
    justifyContent: 'space-between',
  },
  compactForecastValue: {
    fontSize: 16,
    fontWeight: '900',
  },
  compactForecastLabel: {
    fontSize: 9,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  dateModal: {
    width: '100%',
    padding: 24,
    borderRadius: 28,
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#0A84FF',
    shadowOffset: { width: 0, height: 22 },
    shadowOpacity: 0.22,
    shadowRadius: 34,
    elevation: 14,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
  },
  modalSub: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 24,
  },
  dateSelectorGrid: {
    width: '100%',
    gap: 15,
    marginBottom: 30,
  },
  dateSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.04)',
    padding: 12,
    borderRadius: 16,
  },
  dateSelectorLabel: {
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  dateSelectorControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  dateSmallBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateSegmentValue: {
    fontSize: 16,
    fontWeight: '800',
    minWidth: 45,
    textAlign: 'center',
  },
  saveBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
  },
  list: {
    paddingHorizontal: 20,
    paddingTop: 20,
    marginTop: 6,
  },
  widgetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
  },
  widgetCardWrap: {
    width: (width - 64) / 2,
    height: (width - 64) / 2,
    borderRadius: 30,
    marginBottom: 18,
    shadowColor: '#34C759',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.22,
    shadowRadius: 28,
    elevation: 10,
  },
  widgetCardLeft: {
    marginRight: 12,
  },
  widgetCard: {
    flex: 1,
    height: '100%',
    borderRadius: 30,
    borderWidth: 1.5,
    padding: 13,
    overflow: 'hidden',
    justifyContent: 'space-between',
  },
  widgetHandle: {
    position: 'absolute',
    top: 10,
    alignSelf: 'center',
    width: 28,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(17,17,17,0.12)',
  },
  widgetTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  widgetArrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  widgetValue: {
    fontSize: 30,
    lineHeight: 32,
    fontWeight: '900',
    letterSpacing: -1.2,
  },
  widgetSubject: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '900',
    minHeight: 24,
    marginTop: 2,
    opacity: 0.96,
    textTransform: 'uppercase',
  },
  widgetProgress: {
    height: 4,
    borderRadius: 3,
    overflow: 'hidden',
  },
  widgetProgressFill: {
    height: '100%',
    borderRadius: 4,
  },
  widgetFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 0,
  },
  widgetFooterItem: {
    flex: 1,
  },
  widgetFooterDivider: {
    width: 1,
    height: 14,
    opacity: 0.22,
  },
  widgetMiniLabel: {
    fontSize: 8,
    fontWeight: '900',
    opacity: 0.65,
    textTransform: 'uppercase',
  },
  widgetMiniValue: {
    fontSize: 10,
    fontWeight: '900',
    marginTop: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 15,
    marginLeft: 5,
  },
  card: {
    borderRadius: 24,
    padding: 18,
    marginBottom: 16,
    minHeight: 180,
    borderWidth: 1.5,
    shadowColor: '#34C759',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.2,
    shadowRadius: 26,
    elevation: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  cardAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 6,
  },
  lowAttendanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 10,
  },
  lowAttendanceText: {
    fontSize: 9,
    fontWeight: '800',
  },
  miniProgressBar_old: {
    height: 6,
    borderRadius: 3,
    marginTop: 10,
    width: '100%',
    overflow: 'hidden',
  },
  miniProgressFill_old: {
    height: '100%',
    borderRadius: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  subjectCodeBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  cardInfo: {
    flex: 1,
    paddingRight: 20,
  },
  subjectCode: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  subjectName: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 22,
    marginBottom: 12,
  },
  progressContainer: {
    width: '100%',
  },
  miniProgressBar: {
    height: 8,
    borderRadius: 4,
    width: '100%',
    overflow: 'hidden',
  },
  miniProgressFill: {
    height: '100%',
    borderRadius: 4,
  },
  percentageBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 20,
    minWidth: 85,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  percentageText: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  pctLabel: {
    fontSize: 8,
    fontWeight: '800',
    marginTop: -2,
    textTransform: 'uppercase',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  stat: {
    flex: 1,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  statStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 6,
  },
  calculatorBox: {
    marginTop: 18,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  calcHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  calcIconBg: {
    padding: 6,
    borderRadius: 8,
  },
  calcTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  projectionGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  projectionCol: {
    flex: 1,
    alignItems: 'center',
  },
  metricIconHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  projectionDivider: {
    width: 1,
    height: 40,
    opacity: 0.5,
  },
  projectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  projectionValue: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  projectionHint: {
    fontSize: 9,
    fontWeight: '500',
    marginTop: 2,
  },
  calcAdvice: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    gap: 8,
  },
  calcAdviceText: {
    fontSize: 11,
    fontWeight: '700',
    flex: 1,
  },
  aggregateCard: {
    borderRadius: 28,
    padding: 25,
    marginTop: 10,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  aggregateTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 15,
  },
  aggregateDivider: {
    height: 1,
    marginBottom: 20,
  },
  aggregateRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 25,
  },
  aggregateStat: {
    flex: 1,
    alignItems: 'center',
  },
  aggregateLabel: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 8,
    textAlign: 'center',
    opacity: 0.6,
  },
  aggregateValue: {
    fontSize: 24,
    fontWeight: '900',
  },
  finalPercentageBox: {
    backgroundColor: 'rgba(52, 199, 89, 0.1)',
    borderRadius: 20,
    padding: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  finalPercentageLabel: {
    fontSize: 16,
    fontWeight: '800',
  },
  finalPercentageValue: {
    fontSize: 28,
    fontWeight: '900',
  }
});
