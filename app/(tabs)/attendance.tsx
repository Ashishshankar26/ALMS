import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Dimensions, Platform, Modal, TextInput } from 'react-native';
import Animated, { FadeInDown, FadeInUp, Layout } from 'react-native-reanimated';
import { useScraper } from '../../context/ScraperContext';
import { CheckCircle, AlertTriangle, XCircle, Calculator, Plus, Minus, Calendar, Edit2, Clock, Award } from 'lucide-react-native';
import { useTheme, Typography } from '../../context/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');
const SEMESTER_DATE_KEY = '@semester_end_date';

export default function AttendanceScreen() {
  const { data, isScraping } = useScraper();
  const { colors, isDark } = useTheme();
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [targetPct, setTargetPct] = useState(75);
  const [semesterEndDate, setSemesterEndDate] = useState(new Date('2026-06-01'));
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Persistence: Load Date on Mount
  useEffect(() => {
    const loadStoredDate = async () => {
      try {
        const storedDate = await AsyncStorage.getItem(SEMESTER_DATE_KEY);
        if (storedDate) {
          setSemesterEndDate(new Date(storedDate));
        }
      } catch (e) {
        console.error('Failed to load semester date', e);
      }
    };
    loadStoredDate();
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

  const changeTarget = (delta: number) => {
    setTargetPct(prev => Math.min(100, Math.max(50, prev + delta)));
  };

  const [showAggregate, setShowAggregate] = useState(true);
  const attendanceData = data.attendance || [];

  // Calculate Remaining Weeks
  const today = new Date();
  const diffTime = Math.max(0, semesterEndDate.getTime() - today.getTime());
  const diffWeeks = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7));
  const EST_CLASSES_PER_WEEK = 4; // Default estimate
  const remainingClassesEst = diffWeeks * EST_CLASSES_PER_WEEK;

  // Calculate Overall Attendance including Duty Leaves
  const totalClasses = attendanceData.reduce((acc, curr) => acc + (curr.totalClasses || 0), 0);
  const attendedClasses = attendanceData.reduce((acc, curr) => acc + (curr.attendedClasses || 0), 0);
  const dutyLeaves = attendanceData.reduce((acc, curr) => acc + (curr.dutyLeaves || 0), 0);
  
  const overallAttendance = totalClasses > 0 ? Math.ceil(((attendedClasses + dutyLeaves) / totalClasses) * 100).toString() : '0';
  const rawOverallAttendance = totalClasses > 0 ? Math.ceil((attendedClasses / totalClasses) * 100).toString() : '0';
  
  const displayAttendance = showAggregate ? overallAttendance : rawOverallAttendance;

  const getStatus = (percentage: number) => {
    if (percentage >= targetPct + 10) return { text: 'Safe', color: '#34C759', icon: <CheckCircle size={20} color="#34C759" /> };
    if (percentage >= targetPct)      return { text: 'Warning', color: '#FF9500', icon: <AlertTriangle size={20} color="#FF9500" /> };
    return { text: 'Critical', color: '#FF3B30', icon: <XCircle size={20} color="#FF3B30" /> };
  };

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
      ? Math.floor((effectiveAttended + (remainingPrecise - safeToMissTerm)) / totalTermClasses * 100)
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
        {/* Hero Header - ANIMATED */}
        <Animated.View 
          entering={FadeInUp.delay(100).duration(800).springify()}
          style={[styles.header, { backgroundColor: colors.card }]}
        >
          <View style={styles.headerTopCompact}>
            <View>
              <Text style={[styles.headerLabel, { color: isDark ? colors.textSecondary : '#8E8E93' }]}>OVERALL STATUS</Text>
              <View style={styles.heroValueRow}>
                <Text style={[styles.heroValueCompact, { color: colors.text }]}>{displayAttendance}%</Text>
                {isScraping && (
                  <View style={[styles.syncingBadge, { backgroundColor: colors.primary + '15' }]}>
                    <Text style={[styles.syncingText, { color: colors.primary }]}>Sync</Text>
                  </View>
                )}
              </View>
            </View>
            
            <TouchableOpacity 
              onPress={() => setShowAggregate(!showAggregate)}
              style={[styles.toggleBtnCompact, { backgroundColor: colors.primary + '15' }]}
            >
              <Text style={[styles.toggleTextCompact, { color: colors.primary }]}>
                {showAggregate ? 'Aggregate' : 'Raw'}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.chipSectionLabel, { color: isDark ? colors.textSecondary : '#8E8E93' }]}>PREDICTOR SETTINGS</Text>
          <View style={styles.actionRowCompact}>
            <TouchableOpacity 
              onPress={() => setShowDatePicker(true)}
              style={[styles.chipCompact, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F5F7FA' }]}
            >
              <Calendar size={12} color={colors.primary} />
              <Text style={[styles.chipTextCompact, { color: colors.text }]}>
                End: {semesterEndDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </Text>
            </TouchableOpacity>

            <View style={[styles.chipCompact, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F5F7FA' }]}>
              <View style={styles.targetControlCompact}>
                <TouchableOpacity onPress={() => changeTarget(-5)} style={styles.miniBtn}>
                  <Minus size={12} color={colors.primary} />
                </TouchableOpacity>
                <Text style={[styles.chipTextCompact, { color: colors.text }]}>Goal: {targetPct}%</Text>
                <TouchableOpacity onPress={() => changeTarget(5)} style={styles.miniBtn}>
                  <Plus size={12} color={colors.primary} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Animated.View>

      <View style={styles.list}>
        <Text style={[styles.sectionTitleCompact, { color: colors.text }]}>COURSE ANALYTICS</Text>
        {attendanceData.map((item, index) => {
          const effectivePct = item.totalClasses > 0 
            ? Math.ceil(((item.attendedClasses + (item.dutyLeaves || 0)) / item.totalClasses) * 100) 
            : 0;
          const status = getStatus(effectivePct);
          const isSelected = selectedSubject === item.subjectCode;

          return (
            <TouchableOpacity 
              key={index}
              style={[styles.card, { backgroundColor: colors.card, borderColor: isSelected ? colors.primary : 'transparent' }]}
              onPress={() => setSelectedSubject(isSelected ? null : item.subjectCode)}
              activeOpacity={0.7}
            >
              <View style={[styles.percentageBadge, { backgroundColor: `${status.color}15`, position: 'absolute', top: 15, right: 15 }]}>
                <Text style={[styles.percentageText, { color: status.color }]}>{effectivePct}%</Text>
              </View>

              <View style={styles.cardHeader}>
                <View style={styles.cardInfo}>
                  <View style={[styles.subjectCodeBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F0F0F0' }]}>
                    <Text style={[styles.subjectCode, { color: colors.primary }]}>{item.subjectCode}</Text>
                  </View>
                  <Text style={[styles.subjectName, { color: colors.text, paddingRight: 60 }]}>{item.subjectName}</Text>
                  
                  {/* Progress Bar - KEPT */}
                  <View style={styles.progressContainer}>
                    <View style={[styles.miniProgressBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
                      <View style={[styles.miniProgressFill, { width: `${Math.min(effectivePct, 100)}%`, backgroundColor: status.color }]} />
                    </View>
                  </View>
                </View>
              </View>

              <View style={[styles.statsRow, { backgroundColor: colors.surface }]}>
                <View style={styles.stat}>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Attended</Text>
                  <Text style={[styles.statValue, { color: colors.text }]}>{item.attendedClasses}</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total</Text>
                  <Text style={[styles.statValue, { color: colors.text }]}>{item.totalClasses}</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Leaves</Text>
                  <Text style={[styles.statValue, { color: colors.text }]}>{item.dutyLeaves || 0}</Text>
                </View>
                <View style={[styles.statStatus, { backgroundColor: colors.card }]}>
                  {status.icon}
                  <Text style={[styles.statusText, { color: status.color }]}>{status.text}</Text>
                </View>
              </View>

              {isSelected && (
                <Animated.View 
                  entering={FadeInUp.duration(400)} 
                  style={[styles.calculatorBox, { backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.02)', borderColor: colors.border }]}
                >
                  {/* Calculator Header */}
                  <View style={styles.calcHeader}>
                    <View style={[styles.calcIconBg, { backgroundColor: colors.primary + '20' }]}>
                      <Calculator size={14} color={colors.primary} />
                    </View>
                    <Text style={[styles.calcTitle, { color: colors.textSecondary }]}>Smart Forecast Panel</Text>
                  </View>

                  {/* Main Metrics Grid */}
                  <View style={styles.projectionGrid}>
                    {/* TERM SAFE MARGIN */}
                    {(() => {
                      const proj = calculateMissable(item);
                      return (
                        <>
                          <View style={styles.projectionCol}>
                            <View style={styles.metricIconHeader}>
                              <CheckCircle size={10} color={proj.isSafe ? '#34C759' : colors.error} />
                              <Text style={[styles.projectionLabel, { color: colors.textSecondary }]}>Safe Margin</Text>
                            </View>
                            <Text style={[styles.projectionValue, { color: proj.isSafe ? '#34C759' : colors.error }]}>
                              {proj.value} 
                              <Text style={{ fontSize: 10, fontWeight: '600' }}> {proj.value === 1 ? 'Class' : 'Classes'}</Text>
                            </Text>
                            <Text style={[styles.projectionHint, { color: colors.textSecondary }]}>Total for term</Text>
                          </View>

                          <View style={[styles.projectionDivider, { backgroundColor: colors.border }]} />

                          {/* SKIP 1 TODAY IMPACT */}
                          <View style={styles.projectionCol}>
                            <View style={styles.metricIconHeader}>
                              <AlertTriangle size={10} color={((item.attendedClasses + (item.dutyLeaves || 0)) / (item.totalClasses + 1)) < (targetPct/100) ? colors.error : '#34C759'} />
                              <Text style={[styles.projectionLabel, { color: colors.textSecondary }]}>Skip Today</Text>
                            </View>
                            <Text style={[
                              styles.projectionValue, 
                              { color: ((item.attendedClasses + (item.dutyLeaves || 0)) / (item.totalClasses + 1)) < (targetPct/100) ? colors.error : '#34C759' }
                            ]}>
                              {Math.floor(((item.attendedClasses + (item.dutyLeaves || 0)) / (item.totalClasses + 1)) * 100)}%
                            </Text>
                            <Text style={[styles.projectionHint, { color: colors.textSecondary }]}>If you miss 1</Text>
                          </View>

                          <View style={[styles.projectionDivider, { backgroundColor: colors.border }]} />

                          {/* FINAL FORECAST */}
                          <View style={styles.projectionCol}>
                            <View style={styles.metricIconHeader}>
                              <Award size={10} color={proj.forecast < targetPct ? colors.error : '#34C759'} />
                              <Text style={[styles.projectionLabel, { color: colors.textSecondary }]}>Final Aim</Text>
                            </View>
                            <Text style={[styles.projectionValue, { color: proj.forecast < targetPct ? colors.error : '#34C759' }]}>
                              {proj.forecast}%
                            </Text>
                            <Text style={[styles.projectionHint, { color: colors.textSecondary }]}>Term End</Text>
                          </View>
                        </>
                      );
                    })()}
                  </View>

                  {/* Summary Footer */}
                  <View style={[styles.calcAdvice, { backgroundColor: colors.surface }]}>
                    <Clock size={12} color={colors.primary} />
                    <Text style={[styles.calcAdviceText, { color: colors.textSecondary }]}>
                      {(() => {
                        const proj = calculateMissable(item);
                        return `Final prediction: ${proj.forecast}% based on ${proj.remaining} remaining classes. Target is ${targetPct}%.`;
                      })()}
                    </Text>
                  </View>
                </Animated.View>
              )}
            </TouchableOpacity>
          );
        })}

        {/* Aggregate Summary Section at the Bottom - ANIMATED */}
        <Animated.View entering={FadeInDown.delay(400).duration(800)}>
          <Text style={[styles.sectionTitle, { marginTop: 30, marginBottom: 10, color: colors.text }]}>Summary Report</Text>
          <View style={[styles.aggregateCard, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}>
            <Text style={[styles.aggregateTitle, { color: colors.text }]}>Aggregate Attendance Details</Text>
            <View style={[styles.aggregateDivider, { backgroundColor: colors.border }]} />
            <View style={styles.aggregateRow}>
              <View style={styles.aggregateStat}>
                <Text style={[styles.aggregateLabel, { color: colors.textSecondary }]}>Total</Text>
                <Text style={[styles.aggregateValue, { color: colors.text }]}>{totalClasses}</Text>
              </View>
              <View style={styles.aggregateStat}>
                <Text style={[styles.aggregateLabel, { color: colors.textSecondary }]}>Attended</Text>
                <Text style={[styles.aggregateValue, { color: colors.text }]}>{attendedClasses}</Text>
              </View>
              <View style={styles.aggregateStat}>
                <Text style={[styles.aggregateLabel, { color: colors.textSecondary }]}>Duty Leave</Text>
                <Text style={[styles.aggregateValue, { color: colors.text }]}>{dutyLeaves}</Text>
              </View>
            </View>
            <View style={[styles.finalPercentageBox, { backgroundColor: isDark ? 'rgba(52, 199, 89, 0.15)' : 'rgba(52, 199, 89, 0.1)' }]}>
              <View>
                <Text style={[styles.finalPercentageLabel, { color: '#34C759' }]}>Aggregate Attendance</Text>
                <Text style={{ color: isDark ? '#34C759' : 'rgba(52, 199, 89, 0.8)', fontSize: 11, fontWeight: '700' }}>Including Duty Leaves</Text>
              </View>
              <Text style={[styles.finalPercentageValue, { color: '#34C759' }]}>{overallAttendance}%</Text>
            </View>
          </View>
        </Animated.View>
      </View>
    </ScrollView>

      {/* Simple Date Picker Modal */}
      <Modal visible={showDatePicker} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <Animated.View entering={FadeInUp} style={[styles.dateModal, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Set Semester End Date</Text>
            <Text style={[styles.modalSub, { color: colors.textSecondary }]}>This helps predict your final attendance.</Text>
            
            <View style={styles.dateSelectorGrid}>
              {/* Day Selector */}
              <View style={styles.dateSelectorRow}>
                <Text style={[styles.dateSelectorLabel, { color: colors.textSecondary }]}>Day</Text>
                <View style={styles.dateSelectorControls}>
                  <TouchableOpacity 
                    style={[styles.dateSmallBtn, { backgroundColor: colors.surface }]}
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
                    style={[styles.dateSmallBtn, { backgroundColor: colors.surface }]}
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
              <View style={styles.dateSelectorRow}>
                <Text style={[styles.dateSelectorLabel, { color: colors.textSecondary }]}>Month</Text>
                <View style={styles.dateSelectorControls}>
                  <TouchableOpacity 
                    style={[styles.dateSmallBtn, { backgroundColor: colors.surface }]}
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
                    style={[styles.dateSmallBtn, { backgroundColor: colors.surface }]}
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
              <View style={styles.dateSelectorRow}>
                <Text style={[styles.dateSelectorLabel, { color: colors.textSecondary }]}>Year</Text>
                <View style={styles.dateSelectorControls}>
                  <TouchableOpacity 
                    style={[styles.dateSmallBtn, { backgroundColor: colors.surface }]}
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
                    style={[styles.dateSmallBtn, { backgroundColor: colors.surface }]}
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
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 15,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  headerTopCompact: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
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
    marginBottom: 12,
    marginTop: 10,
    paddingHorizontal: 5,
    opacity: 0.8,
  },
  headerLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  heroValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroValueCompact: {
    fontSize: 28,
    fontWeight: '800',
  },
  toggleBtnCompact: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
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
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 12,
  },
  chipTextCompact: {
    fontSize: 11,
    fontWeight: '700',
  },
  syncingBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 8,
  },
  syncingText: {
    fontSize: 10,
    fontWeight: '800',
  },
  targetControlCompact: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  miniBtn: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
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
  syncingText: {
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
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
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
  dateModal: {
    width: '100%',
    padding: 24,
    borderRadius: 28,
    alignItems: 'center',
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
    backgroundColor: 'rgba(0,0,0,0.02)',
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
    padding: 20,
    marginTop: 10,
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
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 12,
    elevation: 2,
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
  miniProgressBar: {
    height: 6,
    borderRadius: 3,
    marginTop: 10,
    width: '100%',
    overflow: 'hidden',
  },
  miniProgressFill: {
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
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  cardInfo: {
    flex: 1,
    paddingRight: 20,
  },
  subjectCode: {
    fontSize: 12,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
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
