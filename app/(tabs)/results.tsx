import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, RefreshControl, TouchableOpacity, Dimensions, Platform } from 'react-native';
import Animated, { FadeInDown, FadeInUp, Layout } from 'react-native-reanimated';
import { useScraper } from '../../context/ScraperContext';
import { ChevronDown, ChevronUp, GraduationCap, Award, BookOpen, Star } from 'lucide-react-native';
import { useTheme, Typography } from '../../context/ThemeContext';
import { BlurView } from 'expo-blur';

const { width } = Dimensions.get('window');

type TabType = 'REGULAR' | 'BACKLOG';

export default function ResultsScreen() {
  const { data, isScraping, refreshData } = useScraper();
  const { colors, isDark } = useTheme();
  
  const resultsData = (data.results && data.results.length > 0) ? data.results : [];
  
  const isBacklog = (term: string) => {
    const cleaned = term.replace(/Term/i, '').replace(/Semester/i, '').replace(/Id/i, '').replace(/:/g, '').trim().toUpperCase();
    const romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
    if (romanNumerals.includes(cleaned)) return false;
    if (/^\\d+$/.test(cleaned)) return false;
    return /[A-Z]/.test(cleaned);
  };
  
  const regularResults = resultsData.filter(sem => !isBacklog(sem.semester));
  const backlogResults = resultsData.filter(sem => isBacklog(sem.semester));
  
  const [activeTab, setActiveTab] = useState<TabType>('REGULAR');
  const displayData = activeTab === 'REGULAR' ? regularResults : backlogResults;

  const [expandedSem, setExpandedSem] = useState<string | null>(resultsData[0]?.semester || null);
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);

  const getGradeColor = (grade: string) => {
    const g = grade.toUpperCase();
    if (['O', 'A+', 'A'].includes(g)) return '#34C759'; // Success Green
    if (['B+', 'B'].includes(g)) return '#007AFF'; // Blue
    if (['C', 'P', 'D'].includes(g)) return '#FFCC00'; // Yellow
    return '#FF3B30'; // Red
  };

  const getGradeBg = (grade: string) => {
    const color = getGradeColor(grade);
    return isDark ? `${color}20` : `${color}15`;
  };

  if (resultsData.length === 0) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.emptyIconContainer, { backgroundColor: isDark ? colors.card : '#F2F2F7' }]}>
          <GraduationCap size={48} color={colors.primary} />
        </View>
        <Text style={[styles.emptyText, { color: colors.text }]}>No results found yet.</Text>
        <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
          Pull to refresh on the home screen to sync your semester-wise grades.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={
          <RefreshControl 
            refreshing={isScraping} 
            onRefresh={refreshData}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Hero Header - ANIMATED */}
        <Animated.View 
          entering={FadeInUp.delay(100).duration(800).springify()}
          style={[styles.header, { backgroundColor: colors.card }]}
        >
          <View style={styles.headerTopCompact}>
            <View>
              <Text style={[styles.headerLabel, { color: isDark ? colors.textSecondary : '#8E8E93' }]}>ACADEMIC JOURNEY</Text>
              <View style={styles.heroValueRow}>
                <Text style={[styles.heroValueCompact, { color: colors.text }]}>{data.cgpa || '0.00'}</Text>
                <View style={[styles.gpaBadgeCompact, { backgroundColor: colors.primary + '15' }]}>
                  <Text style={[styles.gpaTextCompact, { color: colors.primary }]}>CGPA</Text>
                </View>
              </View>
            </View>
            
            <View style={[styles.heroIconCircleCompact, { backgroundColor: colors.primary + '15' }]}>
              <Star size={24} color={colors.primary} />
            </View>
          </View>

          <View style={styles.statsRowCompact}>
            <View style={styles.statItemCompact}>
              <Award size={14} color={colors.warning} />
              <Text style={[styles.statTextCompact, { color: colors.textSecondary }]}>Top 10% Batch</Text>
            </View>
            <View style={[styles.dividerCompact, { backgroundColor: colors.border }]} />
            <View style={styles.statItemCompact}>
              <BookOpen size={14} color={colors.primary} />
              <Text style={[styles.statTextCompact, { color: colors.textSecondary }]}>{regularResults.length} Semesters</Text>
            </View>
          </View>

          <View style={[styles.segmentedContainer, { backgroundColor: colors.surface }]}>
            <TouchableOpacity
              style={[styles.segmentItem, activeTab === 'REGULAR' && { backgroundColor: colors.card }]}
              onPress={() => setActiveTab('REGULAR')}
            >
              <Text style={[styles.segmentText, { color: activeTab === 'REGULAR' ? colors.text : colors.textSecondary }]}>
                Semester Results
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.segmentItem, activeTab === 'BACKLOG' && { backgroundColor: colors.card }]}
              onPress={() => setActiveTab('BACKLOG')}
            >
              <Text style={[styles.segmentText, { color: activeTab === 'BACKLOG' ? colors.text : colors.textSecondary }]}>
                Reappear/Backlog
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        <View style={styles.list}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{activeTab === 'REGULAR' ? 'Semester Breakdown' : 'Reappear / Backlog History'}</Text>
          
          {displayData.length === 0 ? (
            <View style={[styles.emptyContainer, { backgroundColor: colors.background, paddingVertical: 40 }]}>
              <View style={[styles.emptyIconContainer, { backgroundColor: isDark ? colors.card : '#F2F2F7', width: 60, height: 60, borderRadius: 30 }]}>
                <Award size={28} color={colors.primary} />
              </View>
              <Text style={[styles.emptyText, { color: colors.text, fontSize: 16 }]}>Clear Record!</Text>
              <Text style={[styles.emptySubtext, { color: colors.textSecondary, textAlign: 'center', marginTop: 8 }]}>
                You have no reappear or backlog subjects.
              </Text>
            </View>
          ) : null}

          {displayData.map((sem, index) => {
            const isExpanded = expandedSem === sem.semester;

            return (
              <Animated.View 
                key={index}
                entering={FadeInDown.delay(200 + index * 100).duration(600).springify()}
              >
                <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <TouchableOpacity 
                    style={styles.cardHeader}
                    onPress={() => setExpandedSem(isExpanded ? null : sem.semester)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.semInfo}>
                      <View style={[styles.semNumberBadge, { backgroundColor: activeTab === 'BACKLOG' ? colors.warning : colors.primary }]}>
                        <Text style={styles.semNumberText}>{activeTab === 'BACKLOG' ? 'R' : (index + 1)}</Text>
                      </View>
                      <View>
                        <Text style={[styles.semTitle, { color: colors.text }]}>
                          {sem.semester}
                        </Text>
                        <Text style={[styles.semSubtitle, { color: colors.textSecondary }]}>Passed All Subjects</Text>
                      </View>
                    </View>
                    
                    <View style={styles.headerRight}>
                      {activeTab !== 'BACKLOG' && (
                        <View style={[styles.sgpaBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F9F9F9' }]}>
                          <Text style={[styles.sgpaLabel, { color: colors.textSecondary }]}>TGPA</Text>
                          <Text style={[styles.sgpaValue, { color: colors.primary }]}>{sem.sgpa}</Text>
                        </View>
                      )}
                      {isExpanded ? 
                        <ChevronUp size={20} color={colors.textSecondary} /> : 
                        <ChevronDown size={20} color={colors.textSecondary} />
                      }
                    </View>
                  </TouchableOpacity>

                  {isExpanded && (
                    <Animated.View entering={FadeInUp.duration(400)} style={[styles.expandedContent, { borderTopColor: colors.border }]}>
                      {(sem.subjects || []).map((sub, subIndex) => {
                        const isSubExpanded = expandedSubject === `${index}-${subIndex}`;
                        return (
                          <View key={subIndex} style={styles.subjectContainer}>
                            <TouchableOpacity 
                              style={styles.subjectRow}
                              onPress={() => setExpandedSubject(isSubExpanded ? null : `${index}-${subIndex}`)}
                              activeOpacity={0.7}
                            >
                              <View style={styles.subjectMain}>
                                <Text style={[styles.subjectName, { color: colors.text }]} numberOfLines={1}>{sub.name}</Text>
                                <View style={styles.subjectMeta}>
                                  <Text style={[styles.subjectCode, { color: colors.textSecondary }]}>{sub.code}</Text>
                                  {sub.marksDetails && sub.marksDetails.length > 0 && (
                                    <>
                                      <View style={styles.dot} />
                                      <Text style={[styles.creditsText, { color: colors.primary }]}>View Marks</Text>
                                    </>
                                  )}
                                </View>
                              </View>
                              {activeTab !== 'BACKLOG' && (
                                <View style={[styles.gradeBadge, { backgroundColor: getGradeBg(sub.grade) }]}>
                                  <Text style={[styles.gradeText, { color: getGradeColor(sub.grade) }]}>{sub.grade}</Text>
                                </View>
                              )}
                            </TouchableOpacity>

                            {isSubExpanded && sub.marksDetails && sub.marksDetails.length > 0 && (
                              <Animated.View entering={FadeInUp.duration(300)} style={[styles.marksTableContainer, { backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : '#F9F9FB', borderColor: colors.border }]}>
                                <View style={styles.marksTableHeader}>
                                  <Text style={[styles.marksHeaderCell, { color: colors.textSecondary, flex: 1, paddingRight: 8 }]}>Type</Text>
                                  <Text style={[styles.marksHeaderCell, { color: colors.textSecondary, width: 95, textAlign: 'center' }]}>Marks</Text>
                                  <Text style={[styles.marksHeaderCell, { color: colors.textSecondary, width: 95, textAlign: 'right' }]}>Weightage</Text>
                                </View>
                                {sub.marksDetails.map((mark, mIdx) => {
                                  let displayType = mark.type;
                                  const tLower = displayType.toLowerCase();
                                  if (tLower.includes('continuous assessment')) displayType = 'CA';
                                  else if (tLower.includes('mid term')) displayType = 'Mid Term';
                                  else if (tLower.includes('end term')) displayType = 'End Term';
                                  else if (tLower.includes('attendance')) displayType = 'Attendance';
                                  
                                  return (
                                    <View key={mIdx} style={[styles.marksTableRow, { borderTopColor: colors.border }]}>
                                      <Text style={[styles.marksCell, { color: colors.text, flex: 1, paddingRight: 8 }]} numberOfLines={3}>{displayType}</Text>
                                      <Text style={[styles.marksCell, { color: colors.text, width: 95, textAlign: 'center', fontWeight: '600' }]} numberOfLines={2}>{mark.marks}</Text>
                                      <Text style={[styles.marksCell, { color: colors.text, width: 95, textAlign: 'right', fontWeight: '600' }]} numberOfLines={2}>{mark.weightage}</Text>
                                    </View>
                                  );
                                })}
                              </Animated.View>
                            )}
                          </View>
                        );
                      })}
                    </Animated.View>
                  )}
                </View>
              </Animated.View>
            );
          })}
        </View>
      </ScrollView>
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
    marginBottom: 15,
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
    gap: 8,
  },
  heroValueCompact: {
    fontSize: 32,
    fontWeight: '800',
  },
  gpaBadgeCompact: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  gpaTextCompact: {
    fontSize: 10,
    fontWeight: '800',
  },
  segmentedContainer: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 4,
    gap: 4,
    marginTop: 15,
  },
  segmentItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '700',
  },
  heroIconCircleCompact: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRowCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  statItemCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statTextCompact: {
    fontSize: 12,
    fontWeight: '700',
  },
  dividerCompact: {
    width: 1,
    height: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statText: {
    fontSize: 13,
    fontWeight: '600',
  },
  divider: {
    width: 1,
    height: 14,
    marginHorizontal: 15,
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
    marginBottom: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 12,
    elevation: 2,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  semInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  semNumberBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  semNumberText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  semTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  semSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sgpaBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    alignItems: 'center',
  },
  sgpaLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  sgpaValue: {
    fontSize: 15,
    fontWeight: '800',
  },
  expandedContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  subjectRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  subjectMain: {
    flex: 1,
    paddingRight: 10,
  },
  subjectName: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
    textTransform: 'capitalize',
  },
  subjectMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  subjectCode: {
    fontSize: 12,
    fontWeight: '500',
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#C7C7CC',
  },
  creditsText: {
    fontSize: 12,
    fontWeight: '500',
  },
  gradeBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradeText: {
    fontWeight: '800',
    fontSize: 15,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 15,
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 22,
  },
  subjectContainer: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  marksTableContainer: {
    marginTop: 0,
    marginBottom: 12,
    marginHorizontal: 4,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  marksTableHeader: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  marksHeaderCell: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  marksTableRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  marksCell: {
    fontSize: 13,
  },
});
