import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Dimensions, Platform } from 'react-native';
import Animated, { FadeInDown, FadeInUp, Layout } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useScraper } from '../../context/ScraperContext';
import { Clock, MapPin, Tag, User, ChevronDown, ChevronUp } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function TimetableScreen() {
  const { data } = useScraper();
  const { colors, isDark } = useTheme();
  const timetable = data.timetable || {};
  
  // Default to current day
  const getCurrentDay = () => {
    const dayIndex = new Date().getDay();
    const daysMap = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const currentDay = daysMap[dayIndex];
    // If it's Sunday, default to Monday
    return currentDay === 'Sunday' ? 'Monday' : currentDay;
  };

  const [activeDay, setActiveDay] = useState(getCurrentDay());
  const [showMakeup, setShowMakeup] = useState(false);
  const makeupClasses: any[] = [];

  const isClassMakeup = (cls: any) => {
    const type = (cls.type || "").toLowerCase();
    const subject = (cls.subject || "").toLowerCase();
    
    const hasMakeupKeyword = 
      cls.isMakeup || 
      cls.date || 
      type.includes('makeup') || 
      type.includes('adjustment') ||
      type.includes('special') ||
      subject.includes('(makeup)') ||
      subject.includes('(adjustment)');

    if (hasMakeupKeyword) return true;

    // Cross-reference with the dedicated makeup classes list
    const isMatchedInMakeupList = data.makeupClasses?.some((m: any) => 
      m.subjectCode === cls.subjectCode && 
      (m.time === cls.time || m.time?.includes(cls.time?.split(' ')[0]))
    );

    return !!isMatchedInMakeupList;
  };

    // Populate Makeup Classes section exclusively from the dedicated makeup data
  const now = new Date();
  const rawMakeupClasses = data.makeupClasses || [];

  if (rawMakeupClasses && rawMakeupClasses.length > 0) {
    rawMakeupClasses.forEach(cls => {
      // 1. Check if class has already happened
      let hasHappened = false;
      if (cls.date) {
        try {
          // Parse date: e.g., "15-May-2026"
          const dateParts = cls.date.split('-');
          const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          const classDate = new Date(
            parseInt(dateParts[2]), 
            months.indexOf(dateParts[1]), 
            parseInt(dateParts[0])
          );
          
          // Set to end of day for basic date comparison
          classDate.setHours(23, 59, 59);

          if (classDate < now) {
            hasHappened = true;
          } else if (classDate.toDateString() === now.toDateString()) {
            // If today, check the time
            const timeParts = (cls.time || "").split(/\s*-\s*/);
            const endTimeStr = timeParts[1] || ""; // e.g., "04:50 PM"
            if (endTimeStr) {
               const [time, ampm] = endTimeStr.split(' ');
               let [hours, minutes] = time.split(':').map(Number);
               if (ampm === 'PM' && hours < 12) hours += 12;
               if (ampm === 'AM' && hours === 12) hours = 0;
               
               const classEndTime = new Date(now);
               classEndTime.setHours(hours, minutes, 0);
               
               if (now > classEndTime) {
                 hasHappened = true;
               }
            }
          }
        } catch (e) {
          console.error("Error parsing class date/time", e);
        }
      }

      if (hasHappened) return;

      // Internal deduplication check for safety
      const exists = makeupClasses.some(m =>
        m.time === cls.time &&
        m.subjectCode === cls.subjectCode &&
        m.date === cls.date
      );
      if (!exists) {
        makeupClasses.push({ ...cls, isMakeup: true });
      }
    });
  }

  let classesForDay = timetable[activeDay] || [];

  // Saturday Filtering Logic
  if (activeDay === 'Saturday') {
    classesForDay = classesForDay.filter((cls: any) => {
      const subject = (cls.subject || "").toLowerCase();
      const isProjectWork = subject.includes('project work');
      // On Saturday, only show if NOT project work AND it's a makeup class
      // (Makeup classes in the timetable often have 'Adjustment' or 'Makeup' or are identified by having a specific date)
      return !isProjectWork && (cls.isMakeup || cls.type?.toLowerCase().includes('makeup') || cls.date);
    });
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Animated.View 
        entering={FadeInUp.delay(100).duration(800).springify()}
        style={[
          styles.header, 
          { 
            backgroundColor: colors.card, 
            borderColor: colors.border,
            shadowColor: isDark ? '#000000' : 'rgba(0,0,0,0.15)'
          }
        ]}
      >
        <View style={styles.headerTopCompact}>
          <View>
            <Text style={[styles.headerLabel, { color: isDark ? colors.textSecondary : '#8E8E93' }]}>ACADEMIC WEEK</Text>
            <View style={styles.titleRow}>
              <Text style={[styles.headerTitleCompact, { color: colors.text }]}>Schedule</Text>
              <View style={[styles.todayBadgeCompact, { backgroundColor: colors.primary + '15' }]}>
                <Clock size={10} color={colors.primary} />
                <Text style={[styles.todayTextCompact, { color: colors.primary }]}>{activeDay}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Day Selector */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.daySelectorCompact}
          contentContainerStyle={{ paddingHorizontal: 20 }}
        >
          {DAYS.map((day) => (
            <TouchableOpacity
              key={day}
              style={[
                styles.dayButtonCompact, 
                { 
                  backgroundColor: isDark ? colors.surface : 'rgba(0, 0, 0, 0.04)', 
                  borderColor: isDark ? colors.border : 'rgba(0, 0, 0, 0.08)' 
                },
                activeDay === day && { 
                  backgroundColor: colors.primary, 
                  borderColor: colors.primary,
                  shadowColor: colors.primary,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.24,
                  shadowRadius: 8,
                  elevation: 4,
                }
              ]}
              onPress={() => setActiveDay(day)}
            >
              <Text style={[styles.dayTextCompact, { color: activeDay === day ? '#fff' : (isDark ? colors.textSecondary : '#444446') }]}>
                {day.substring(0, 3)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Animated.View>

      <ScrollView 
        style={styles.list} 
        contentContainerStyle={{ paddingBottom: 100 }}
      >

        {/* Makeup Classes Section - COLLAPSIBLE */}
        {makeupClasses.length > 0 && (
          <View style={styles.makeupSection}>
                        <TouchableOpacity 
              style={[
                styles.makeupHeader, 
                { 
                  backgroundColor: isDark ? '#2A1905' : '#FFF9E6', 
                  borderColor: isDark ? 'rgba(255, 149, 0, 0.15)' : '#FFEAA7',
                }
              ]}
              onPress={() => setShowMakeup(!showMakeup)}
              activeOpacity={0.7}
            >
              <View style={styles.makeupHeaderLeft}>
                <View style={[styles.makeupBadgeIcon, { backgroundColor: colors.warning }]}>
                  <Clock size={14} color="#fff" />
                </View>
                <View>
                  <Text style={[styles.makeupTitle, { color: colors.text }]}>Makeup Classes</Text>
                  <Text style={[styles.makeupSub, { color: colors.textSecondary }]}>{makeupClasses.length} sessions available</Text>
                </View>
              </View>
              {showMakeup ? <ChevronUp size={20} color={colors.textSecondary} /> : <ChevronDown size={20} color={colors.textSecondary} />}
            </TouchableOpacity>

            {showMakeup && (
  <Animated.View 
                entering={FadeInUp.duration(400)}
                style={styles.makeupContent}
              >
                <ScrollView 
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: 4, paddingVertical: 8, gap: 12, flexDirection: 'row' }}
                >
                  {makeupClasses.map((cls: any, index: number) => {
                    const timeParts = (cls.time || "").split(/\s*-\s*/);
                    const startTime = timeParts[0] || "--:--";
                    const accentColor = '#FF9500'; // Sunset Orange for Makeup

                    return (
                      <Animated.View 
                        key={index}
                        entering={FadeInDown.delay(index * 50).duration(400)}
                        style={[
                          { 
                            width: 175,
                            height: 175,
                            padding: 14, 
                            borderRadius: 20, 
                            borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)', 
                            borderWidth: 1.2,
                            backgroundColor: isDark ? '#1C1F26' : '#FFFFFF',
                            shadowColor: '#000000',
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: isDark ? 0.12 : 0.05,
                            shadowRadius: 8,
                            elevation: 2,
                            position: 'relative',
                            overflow: 'hidden',
                          }
                        ]}
                      >
                        {/* Subtle Frosted Dynamic Color Tint Overlay */}
                        <View 
                          style={{ 
                            ...StyleSheet.absoluteFillObject, 
                            backgroundColor: accentColor, 
                            opacity: isDark ? 0.05 : 0.03,
                            zIndex: -1 
                          }} 
                        />

                        <View style={{ flex: 1, justifyContent: 'space-between' }}>
                          <View>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                              <Text style={[styles.makeupDate, { color: colors.warning, fontSize: 10, fontWeight: '800', marginBottom: 0 }]} numberOfLines={1}>
                                {cls.date}
                              </Text>
                              <View style={[styles.courseBadge, { backgroundColor: accentColor + '15', borderColor: accentColor + '30', borderWidth: 1, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }]}>
                                <Text style={[styles.courseCode, { color: accentColor, fontWeight: '800', fontSize: 9 }]}>{cls.subjectCode}</Text>
                              </View>
                            </View>
                            
                            <Text 
                              style={[styles.subjectName, { color: colors.text, fontSize: 12, fontWeight: '800', lineHeight: 16, marginBottom: 0 }]}
                              numberOfLines={3}
                            >
                              {cls.subject}
                            </Text>
                          </View>

                          <View style={{ marginTop: 6 }}>
                            <View style={[styles.metaRow, { marginBottom: 4, alignItems: 'center', gap: 4 }]}>
                              <Clock size={11} color={colors.textSecondary} />
                              <Text style={[styles.metaText, { color: colors.textSecondary, fontSize: 10, fontWeight: '600', marginLeft: 0 }]} numberOfLines={1}>
                                {startTime}
                              </Text>
                            </View>

                            <View style={[styles.metaRow, { alignItems: 'center', gap: 4 }]}>
                              <MapPin size={11} color={colors.textSecondary} />
                              <Text style={[styles.metaText, { color: colors.textSecondary, fontSize: 10, fontWeight: '600', marginLeft: 0 }]} numberOfLines={1}>
                                Room: {cls.room}
                              </Text>
                            </View>
                          </View>
                        </View>
                      </Animated.View>
                    );
                  })}
                </ScrollView>
              </Animated.View>
            )}
          </View>
        )}

                {/* Regular Schedule Section - ANIMATED */}
        <Animated.View entering={FadeInDown.delay(400).duration(800).springify()}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Regular Schedule</Text>
                    {classesForDay.length > 0 ? (
            classesForDay.map((cls: any, index: number) => {
              const timeParts = (cls.time || "").split(/\s*-\s*/);
              const startTime = timeParts[0] || "--:--";
              const endTimeFull = timeParts[1] || "";
              const endTime = endTimeFull.split(/\s+/)[0] || "--:--";
              const ampm = (cls.time || "").toUpperCase().includes('PM') ? 'PM' : 'AM';

              const isPractical = (cls.type || "").toLowerCase().includes('practical');
              const isTutorial = (cls.type || "").toLowerCase().includes('tutorial');
              const accentColor = isClassMakeup(cls) 
                ? '#FF9500' // Sunset Orange for Makeup
                : (isPractical ? '#34C759' : (isTutorial ? '#00A2FF' : '#5856D6')); // Cyan for Tutorial, Emerald for Practical, Royal Purple for Lecture

              return (
                <Animated.View 
                  key={cls.id || index}
                  entering={FadeInDown.delay(500 + index * 50).duration(600).springify()}
                >
                                    <View 
                    style={[
                      styles.classCard, 
                      { 
                        padding: 18, 
                        paddingLeft: 20,
                        borderRadius: 24, 
                        borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)', 
                        borderWidth: 1.2,
                        backgroundColor: isDark ? '#1C1F26' : '#FFFFFF',
                        marginBottom: 16,
                        shadowColor: '#000000',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: isDark ? 0.12 : 0.05,
                        shadowRadius: 8,
                        elevation: 2,
                        position: 'relative',
                        overflow: 'hidden',
                        flexDirection: 'row'
                      }
                    ]}
                  >
                    {/* Subtle Frosted Dynamic Color Tint Overlay */}
                    <View 
                      style={{ 
                        ...StyleSheet.absoluteFillObject, 
                        backgroundColor: accentColor, 
                        opacity: isDark ? 0.05 : 0.03,
                        zIndex: -1 
                      }} 
                    />

                    {/* Left Time Column */}
                    <View style={styles.timeColumn}>
                      <Text style={[styles.timeStart, { color: colors.text, fontWeight: '800' }]}>{startTime}</Text>
                      <View style={[styles.timeLine, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)', marginVertical: 8 }]}>
                        <View style={[styles.timeDot, { backgroundColor: accentColor, borderColor: isDark ? '#121418' : '#ffffff' }]} />
                      </View>
                      <View style={{ alignItems: 'center', marginTop: -2 }}>
                        <Text style={[styles.timeEnd, { color: colors.textSecondary }]}>{endTime}</Text>
                        <Text style={[styles.timeAmpm, { color: colors.textSecondary }]}>{ampm}</Text>
                      </View>
                    </View>

                    {/* Right Class Details Info */}
                    <View style={styles.classInfo}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <View style={[styles.courseBadge, { backgroundColor: accentColor + '15', borderColor: accentColor + '30', borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }]}>
                          <Text style={[styles.courseCode, { color: accentColor, fontWeight: '800', fontSize: 11 }]}>{cls.subjectCode}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', gap: 6 }}>
                          {isClassMakeup(cls) && (
                            <View style={[styles.practicalBadge, { backgroundColor: 'rgba(255, 149, 0, 0.15)', borderColor: 'rgba(255, 149, 0, 0.3)', borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }]}>
                              <Text style={[styles.practicalBadgeText, { color: '#FF9500', fontSize: 9, fontWeight: '800' }]}>MAKEUP</Text>
                            </View>
                          )}
                          {isPractical && (
                            <View style={[styles.practicalBadge, { backgroundColor: 'rgba(52, 199, 89, 0.15)', borderColor: 'rgba(52, 199, 89, 0.3)', borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }]}>
                              <Text style={[styles.practicalBadgeText, { color: '#34C759', fontSize: 9, fontWeight: '800' }]}>LAB</Text>
                            </View>
                          )}
                          {isTutorial && (
                            <View style={[styles.practicalBadge, { backgroundColor: 'rgba(0, 162, 255, 0.15)', borderColor: 'rgba(0, 162, 255, 0.3)', borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }]}>
                              <Text style={[styles.practicalBadgeText, { color: '#00A2FF', fontSize: 9, fontWeight: '800' }]}>TUTORIAL</Text>
                            </View>
                          )}
                        </View>
                      </View>

                      <Text style={[styles.subjectName, { fontSize: 16, color: colors.text, fontWeight: '800', marginBottom: 12 }]}>{cls.subject}</Text>

                      <View style={styles.badgeRow}>
                        <View style={[styles.roomBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }]}>
                          <MapPin size={11} color={accentColor} />
                          <Text style={[styles.roomText, { color: colors.textSecondary, fontWeight: '700', fontSize: 11 }]}>{cls.room || 'TBA'}</Text>
                        </View>
                        <View style={[styles.typeBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }]}>
                          <Tag size={11} color={accentColor} />
                          <Text style={[styles.typeText, { color: colors.textSecondary, fontWeight: '700', fontSize: 11 }]}>{cls.type}</Text>
                        </View>
                      </View>

                      {cls.faculty ? (
                        <View style={[styles.metaRow, { marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
                          <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: accentColor + '15', alignItems: 'center', justifyContent: 'center', marginRight: 8 }}>
                            <User size={11} color={accentColor} />
                          </View>
                          <Text style={[styles.metaText, { color: colors.textSecondary, fontWeight: '700', fontSize: 12 }]} numberOfLines={1}>
                            {cls.faculty.includes(')') ? cls.faculty.split(')')[0] + ')' : cls.faculty}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                </Animated.View>
              );
            })
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No classes scheduled for {activeDay}.</Text>
            </View>
          )}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 10,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    borderWidth: 1.5,
    borderTopWidth: 0,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
    zIndex: 5,
  },
  headerTopCompact: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  headerLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitleCompact: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  todayBadgeCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  todayTextCompact: {
    fontSize: 10,
    fontWeight: '700',
  },
  daySelectorCompact: {
    marginTop: 0,
    marginBottom: 5,
  },
  dayButtonCompact: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 60,
    borderWidth: 1.2,
  },
  dayTextCompact: {
    fontSize: 13,
    fontWeight: '600',
  },
  dayTextActive: {
    color: '#fff',
  },
  list: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 6,
    marginTop: 12,
    letterSpacing: -0.3,
  },
  makeupSection: {
    marginBottom: 0,
  },
    makeupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  makeupHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  makeupBadgeIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  makeupTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  makeupSub: {
    fontSize: 11,
    fontWeight: '600',
  },
  makeupContent: {
    marginTop: 5,
  },
  makeupGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
    makeupGridCard: {
    width: (Dimensions.get('window').width - 52) / 2,
    aspectRatio: 1,
    flexDirection: 'column',
    marginBottom: 12,
  },
  makeupSingleCard: {
    width: '100%',
    flexDirection: 'row',
    marginBottom: 12,
  },
  makeupBadge: {
    backgroundColor: '#FF9500',
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 8,
    gap: 4,
  },
  makeupBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  makeupDate: {
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  classCardPremium: {
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 16,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#0A84FF',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 9,
  },
  classHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  timeBadgeWidget: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  timeTextWidget: {
    fontSize: 12,
    fontWeight: '800',
  },
  typeBadgeWidget: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  typeTextWidget: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  subjectTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 15,
    lineHeight: 24,
  },
  classFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footerText: {
    fontSize: 13,
    fontWeight: '600',
  },
  footerDivider: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  facultyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  facultyText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardGlow: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 100,
    height: 100,
    borderRadius: 50,
  },
    classCard: {
    flexDirection: 'row',
    overflow: 'hidden',
  },
  cardAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 6,
  },
  timeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    position: 'absolute',
    top: '50%',
    left: -3,
    marginTop: -4,
    borderWidth: 2,
    borderColor: '#fff',
  },
  courseBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  practicalBadge: {
    backgroundColor: '#34C759',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  practicalBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  timeColumn: {
    alignItems: 'center',
    marginRight: 15,
    width: 55,
  },
  timeStart: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000',
  },
  timeLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#E5E5EA',
    marginVertical: 4,
  },
  timeEnd: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
  },
  timeAmpm: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#8E8E93',
    marginTop: 2,
  },
  classInfo: {
    flex: 1,
  },
  courseCode: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '700',
    marginBottom: 2,
  },
  subjectName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 10,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  roomBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  roomText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  typeText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 13,
    color: '#8E8E93',
    marginLeft: 6,
    flexShrink: 1,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderStyle: 'dashed',
    shadowColor: '#0A84FF',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.14,
    shadowRadius: 22,
    elevation: 6,
  },
  emptyText: {
    fontSize: 16,
    color: '#8E8E93',
    fontWeight: '500',
  }
});
