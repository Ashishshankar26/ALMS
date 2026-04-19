import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { useScraper } from '../../context/ScraperContext';
import { Clock, MapPin, Tag } from 'lucide-react-native';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

export default function TimetableScreen() {
  const { data } = useScraper();
  const timetable = data.timetable || {};
  const [activeDay, setActiveDay] = useState('Monday');

  // Extract Makeup Classes (Saturday & Sunday) and filter out non-classes like "Project Work"
  const makeupClasses = [
    ...(timetable['Saturday'] || []),
    ...(timetable['Sunday'] || [])
  ]
  .filter(cls => cls.subject && !/Project Work/i.test(cls.subject))
  .map(cls => ({ ...cls, isMakeup: true, dayName: cls.dayName || 'Weekend' }));

  const classesForDay = timetable[activeDay] || [];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Schedule</Text>
        
        {/* Day Selector */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.daySelector}
          contentContainerStyle={{ paddingHorizontal: 20 }}
        >
          {DAYS.map((day) => (
            <TouchableOpacity 
              key={day}
              style={[styles.dayButton, activeDay === day && styles.dayButtonActive]}
              onPress={() => setActiveDay(day)}
            >
              <Text style={[styles.dayText, activeDay === day && styles.dayTextActive]}>
                {day.substring(0, 3)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView style={styles.list} contentContainerStyle={{ paddingBottom: 100 }}>
        
        {/* Makeup Classes Section */}
        <View style={styles.makeupSection}>
          <Text style={styles.sectionTitle}>Makeup Classes</Text>
          {makeupClasses.length > 0 ? (
            makeupClasses.map((cls: any, index: number) => {
              const timeParts = (cls.time || "").split(/\s*-\s*/);
              const startTime = timeParts[0] || "--:--";
              const endTimeFull = timeParts[1] || "";
              const endTime = endTimeFull.split(/\s+/)[0] || "--:--";
              const ampm = (cls.time || "").toUpperCase().includes('PM') ? 'PM' : 'AM';
              
              return (
                <View key={index} style={[styles.classCard, styles.makeupCard]}>
                  <View style={styles.timeColumn}>
                    <Text style={styles.timeStart}>{startTime}</Text>
                    <View style={styles.timeLine} />
                    <View style={{ alignItems: 'center', marginTop: -2 }}>
                      <Text style={styles.timeEnd}>{endTime}</Text>
                      <Text style={styles.timeAmpm}>{ampm}</Text>
                    </View>
                  </View>
                  <View style={styles.classInfo}>
                    <Text style={styles.makeupDate}>
                      {cls.dayName || 'Saturday'} {cls.date ? `(${cls.date})` : ''}
                    </Text>
                    <Text style={styles.subjectName}>: {cls.subject}</Text>
                    <View style={styles.metaRow}>
                      <MapPin size={14} color="#8E8E93" />
                      <Text style={styles.metaText}>{cls.room}</Text>
                    </View>
                  </View>
                </View>
              );
            })
          ) : (
            <View style={[styles.emptyCard, { backgroundColor: '#FFFBE6', borderColor: '#FFD60A', borderWidth: 1 }]}>
              <Text style={[styles.emptyText, { color: '#FF9500' }]}>No makeup classes assigned.</Text>
            </View>
          )}
        </View>

        {/* Regular Schedule Section */}
        <Text style={styles.sectionTitle}>Regular Schedule</Text>
        {classesForDay.length > 0 ? (
          classesForDay.map((cls: any, index: number) => {
            const timeParts = (cls.time || "").split(/\s*-\s*/);
            const startTime = timeParts[0] || "--:--";
            const endTimeFull = timeParts[1] || "";
            const endTime = endTimeFull.split(/\s+/)[0] || "--:--";
            const ampm = (cls.time || "").toUpperCase().includes('PM') ? 'PM' : 'AM';

            return (
              <View key={cls.id || index} style={styles.classCard}>
                <View style={styles.timeColumn}>
                  <Text style={styles.timeStart}>{startTime}</Text>
                  <View style={styles.timeLine} />
                  <View style={{ alignItems: 'center', marginTop: -2 }}>
                    <Text style={styles.timeEnd}>{endTime}</Text>
                    <Text style={styles.timeAmpm}>{ampm}</Text>
                  </View>
                </View>
                
                <View style={styles.classInfo}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                     <Text style={[styles.courseCode, { color: '#007AFF', marginBottom: 0 }]}>{cls.subjectCode}</Text>
                  </View>
                  <Text style={[styles.subjectName, { fontSize: 18 }]}>{cls.subject}</Text>
                  
                  <View style={[styles.metaRow, { marginTop: 8 }]}>
                    <MapPin size={14} color="#8E8E93" />
                    <Text style={styles.metaText}>{cls.room}</Text>
                  </View>
                  
                  <View style={styles.metaRow}>
                    <Tag size={14} color="#8E8E93" />
                    <Text style={styles.metaText}>{cls.type}</Text>
                  </View>
                </View>
              </View>
            );
          })
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No classes scheduled for {activeDay}.</Text>
          </View>
        )}
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
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#C7C7CC',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
    letterSpacing: -0.5,
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  daySelector: {
    marginBottom: 15,
  },
  dayButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F2F2F7',
    marginRight: 10,
  },
  dayButtonActive: {
    backgroundColor: '#007AFF',
  },
  dayText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#8E8E93',
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
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 15,
    marginTop: 5,
  },
  makeupSection: {
    marginBottom: 20,
  },
  makeupCard: {
    borderWidth: 1,
    borderColor: '#FFD60A',
    backgroundColor: '#FFFBE6',
  },
  makeupDate: {
    fontSize: 14,
    color: '#FF9500',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  classCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  timeColumn: {
    alignItems: 'center',
    marginRight: 20,
    width: 60,
  },
  timeStart: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000',
  },
  timeLine: {
    width: 2,
    height: 30,
    backgroundColor: '#E5E5EA',
    marginVertical: 5,
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
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  metaText: {
    fontSize: 14,
    color: '#8E8E93',
    marginLeft: 8,
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
