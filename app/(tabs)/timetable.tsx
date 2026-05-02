import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Dimensions, Platform } from 'react-native';
import Animated, { FadeInDown, FadeInUp, Layout } from 'react-native-reanimated';
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
  if (data.makeupClasses && data.makeupClasses.length > 0) {
    data.makeupClasses.forEach(cls => {
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
        style={[styles.header, { backgroundColor: colors.card }]}
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
                { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F5F7FA' }, 
                activeDay === day && { backgroundColor: colors.primary }
              ]}
              onPress={() => setActiveDay(day)}
            >
              <Text style={[styles.dayTextCompact, { color: colors.textSecondary }, activeDay === day && { color: '#fff' }]}>
                {day.substring(0, 3)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Animated.View>

      <ScrollView style={styles.list} contentContainerStyle={{ paddingBottom: 100 }}>

        {/* Makeup Classes Section - COLLAPSIBLE */}
        {makeupClasses.length > 0 && (
          <View style={styles.makeupSection}>
            <TouchableOpacity 
              style={[styles.makeupHeader, { backgroundColor: isDark ? 'rgba(255,159,10,0.1)' : 'rgba(255,149,0,0.1)', borderColor: isDark ? 'rgba(255,159,10,0.2)' : 'rgba(255,149,0,0.2)' }]}
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
                layout={Layout.springify()}
                style={styles.makeupContent}
              >
                <View style={makeupClasses.length > 1 ? styles.makeupGridContainer : null}>
                  {makeupClasses.map((cls: any, index: number) => {
                    const isGrid = makeupClasses.length > 1;
                    const timeParts = (cls.time || "").split(/\s*-\s*/);
                    const startTime = timeParts[0] || "--:--";
                    const endTimeFull = timeParts[1] || "";
                    const endTime = endTimeFull.split(/\s+/)[0] || "--:--";
                    const ampm = (cls.time || "").toUpperCase().includes('PM') ? 'PM' : 'AM';

                    return (
                      <Animated.View 
                        key={index}
                        entering={FadeInDown.delay(index * 50).duration(400)}
                        style={[
                          styles.classCard, 
                          isGrid ? styles.makeupGridCard : styles.makeupSingleCard,
                          { backgroundColor: colors.card }
                        ]}
                      >
                        {!isGrid && (
                          <View style={styles.timeColumn}>
                            <Text style={[styles.timeStart, { color: colors.text }]}>{startTime}</Text>
                            <div style={[styles.timeLine, { backgroundColor: isDark ? 'rgba(255,149,0,0.3)' : '#FFD60A' }]} />
                            <View style={{ alignItems: 'center', marginTop: -2 }}>
                              <Text style={[styles.timeEnd, { color: colors.textSecondary }]}>{endTime}</Text>
                              <Text style={[styles.timeAmpm, { color: colors.textSecondary }]}>{ampm}</Text>
                            </View>
                          </View>
                        )}
                        
                        <View style={isGrid ? { flex: 1 } : styles.classInfo}>
                          <Text style={[styles.makeupDate, { color: colors.warning, fontSize: isGrid ? 11 : 13 }]}>
                            {cls.date} {cls.dayName ? `(${cls.dayName})` : ''}
                          </Text>

                          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                            <Text style={[styles.courseCode, { color: colors.primary, marginBottom: 0, fontSize: isGrid ? 12 : 14 }]}>
                              {cls.subjectCode}
                            </Text>
                          </View>
                          
                          <Text 
                            style={[styles.subjectName, { color: colors.text, fontSize: isGrid ? 14 : 18, marginBottom: 8 }]}
                            numberOfLines={isGrid ? 2 : undefined}
                          >
                            {cls.subject}
                          </Text>

                          {isGrid && (
                             <View style={[styles.metaRow, { marginBottom: 2 }]}>
                                <Clock size={12} color={colors.textSecondary} />
                                <Text style={[styles.metaText, { color: colors.textSecondary, fontSize: 11, marginLeft: 4 }]}>{startTime}</Text>
                             </View>
                          )}

                          <View style={styles.metaRow}>
                            <MapPin size={isGrid ? 12 : 14} color={colors.textSecondary} />
                            <Text style={[styles.metaText, { color: colors.textSecondary, fontSize: isGrid ? 11 : 14, marginLeft: isGrid ? 4 : 8 }]}>
                              {isGrid ? cls.room : `Room: ${cls.room}`}
                            </Text>
                          </View>

                          {!isGrid && cls.category ? (
                            <>
                              <View style={[styles.metaRow, { marginTop: 4 }]}>
                                <View style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                                  <Text style={{ fontSize: 10, color: colors.textSecondary, fontWeight: 'bold' }}>{cls.category.toUpperCase()}</Text>
                                </View>
                              </View>
                              {cls.faculty ? (
                                <View style={[styles.metaRow, { marginTop: 4 }]}>
                                  <User size={12} color={colors.textSecondary} />
                                  <Text style={[styles.metaText, { color: colors.textSecondary, fontSize: 11 }]}>
                                    {cls.faculty.includes(')') ? cls.faculty.split(')')[0] + ')' : cls.faculty}
                                  </Text>
                                </View>
                              ) : null}
                            </>
                          ) : null}
                        </View>
                      </Animated.View>
                    );
                  })}
                </View>
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
              const accentColor = isPractical ? '#34C759' : colors.primary; // Green for practical, Purple/Blue for lecture

              return (
                <Animated.View 
                  key={cls.id || index}
                  entering={FadeInDown.delay(500 + index * 50).duration(600).springify()}
                >
                  <View style={[styles.classCard, { backgroundColor: colors.card }]}>
                    <View style={[styles.cardAccent, { backgroundColor: accentColor }]} />
                    
                    <View style={styles.timeColumn}>
                      <Text style={[styles.timeStart, { color: colors.text }]}>{startTime}</Text>
                      <View style={[styles.timeLine, { backgroundColor: colors.border }]}>
                        <View style={[styles.timeDot, { backgroundColor: accentColor }]} />
                      </View>
                      <View style={{ alignItems: 'center', marginTop: -2 }}>
                        <Text style={[styles.timeEnd, { color: colors.textSecondary }]}>{endTime}</Text>
                        <Text style={[styles.timeAmpm, { color: colors.textSecondary }]}>{ampm}</Text>
                      </View>
                    </View>

                    <View style={styles.classInfo}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <View style={[styles.courseBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#F2F2F7' }]}>
                          <Text style={[styles.courseCode, { color: accentColor }]}>{cls.subjectCode}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', gap: 6 }}>
                          {isClassMakeup(cls) && (
                            <View style={[styles.practicalBadge, { backgroundColor: '#FF9500' }]}>
                              <Text style={styles.practicalBadgeText}>MAKEUP</Text>
                            </View>
                          )}
                          {isPractical && (
                            <View style={styles.practicalBadge}>
                              <Text style={styles.practicalBadgeText}>LAB</Text>
                            </View>
                          )}
                        </View>
                      </View>
                      <Text style={[styles.subjectName, { fontSize: 18, color: colors.text }]}>{cls.subject}</Text>

                      <View style={[styles.badgeRow, { marginTop: 8 }]}>
                        <View style={[styles.roomBadge, { backgroundColor: isDark ? 'rgba(255,149,0,0.15)' : '#FFF4E5' }]}>
                          <MapPin size={12} color="#FF9500" />
                          <Text style={[styles.roomText, { color: isDark ? '#FF9500' : '#CC7700' }]}>{cls.room || 'TBA'}</Text>
                        </View>
                        <View style={[styles.typeBadge, { backgroundColor: isDark ? 'rgba(52,199,89,0.15)' : '#E8F5E9' }]}>
                          <Tag size={12} color="#34C759" />
                          <Text style={[styles.typeText, { color: isDark ? '#34C759' : '#2E7D32' }]}>{cls.type}</Text>
                        </View>
                      </View>

                      {cls.faculty ? (
                        <View style={[styles.metaRow, { marginTop: 8, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
                          <User size={14} color={colors.textSecondary} />
                          <Text style={[styles.metaText, { color: colors.textSecondary, fontWeight: '500' }]} numberOfLines={1}>
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
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 5,
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
    flexDirection: 'column',
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#FF9500',
    borderRadius: 16,
    marginBottom: 12,
  },
  makeupSingleCard: {
    borderWidth: 1.5,
    borderColor: '#FF9500',
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
  },
  timeTextWidget: {
    fontSize: 12,
    fontWeight: '800',
  },
  typeBadgeWidget: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
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
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    paddingLeft: 24,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 4,
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
  },
  emptyText: {
    fontSize: 16,
    color: '#8E8E93',
    fontWeight: '500',
  }
});
