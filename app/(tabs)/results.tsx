import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { useScraper } from '../../context/ScraperContext';
import { ChevronDown, ChevronUp, GraduationCap } from 'lucide-react-native';

const DUMMY_RESULTS = [
  {
    semester: 'Semester 1',
    sgpa: '8.45',
    cgpa: '8.45',
    subjects: [
      { code: 'MTH165', name: 'Mathematics I', grade: 'A', status: 'Pass' },
      { code: 'PHY101', name: 'Physics', grade: 'A+', status: 'Pass' },
      { code: 'CSE101', name: 'Introduction to Programming', grade: 'O', status: 'Pass' },
    ]
  },
  {
    semester: 'Semester 2',
    sgpa: '7.66',
    cgpa: '8.05',
    subjects: [
      { code: 'CSE202', name: 'Object Oriented Programming', grade: 'B+', status: 'Pass' },
      { code: 'MTH166', name: 'Mathematics II', grade: 'A', status: 'Pass' },
      { code: 'ECE101', name: 'Basic Electronics', grade: 'A', status: 'Pass' },
    ]
  }
];

export default function ResultsScreen() {
  const { data } = useScraper();
  const resultsData = (data.results && data.results.length > 0) ? data.results : DUMMY_RESULTS;
  const [expandedSem, setExpandedSem] = useState<string | null>(resultsData[0]?.semester || null);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
      <View style={styles.header}>
        <Text style={styles.title}>Academic Results</Text>
        <View style={styles.subtitleRow}>
          <Text style={styles.subtitle}>Current CGPA: {data.cgpa || '--'}</Text>
          <View style={styles.comingSoonBadge}>
            <Text style={styles.comingSoonText}>Coming Soon</Text>
          </View>
        </View>
      </View>

      <View style={styles.list}>
        {resultsData.map((sem, index) => {
          const isExpanded = expandedSem === sem.semester;

          return (
            <View key={index} style={styles.card}>
              <TouchableOpacity 
                style={styles.cardHeader}
                onPress={() => setExpandedSem(isExpanded ? null : sem.semester)}
                activeOpacity={0.7}
              >
                <View style={styles.semInfo}>
                  <Text style={styles.semTitle}>{sem.semester}</Text>
                  <View style={styles.sgpaBadge}>
                    <Text style={styles.sgpaText}>SGPA: {sem.sgpa}</Text>
                  </View>
                </View>
                {isExpanded ? <ChevronUp color="#8E8E93" /> : <ChevronDown color="#8E8E93" />}
              </TouchableOpacity>

              {isExpanded && (
                <View style={styles.expandedContent}>
                  {(sem.subjects || []).map((sub, subIndex) => (
                    <View key={subIndex} style={styles.subjectRow}>
                      <View style={styles.subjectInfo}>
                        <Text style={styles.subjectName}>{sub.name}</Text>
                        <Text style={styles.creditsText}>{sub.credits} Credits</Text>
                      </View>
                      <View style={styles.gradeBadge}>
                        <Text style={styles.gradeText}>{sub.grade}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#C7C7CC',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#000',
    letterSpacing: -0.5,
    flexShrink: 1,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 10,
  },
  comingSoonBadge: {
    backgroundColor: '#E5F1FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  comingSoonText: {
    color: '#007AFF',
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  subtitle: {
    fontSize: 15,
    color: '#8E8E93',
    fontWeight: '500',
  },
  list: {
    padding: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  semInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  semTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginRight: 15,
  },
  sgpaBadge: {
    backgroundColor: '#FFF2E5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  sgpaText: {
    color: '#FF9500',
    fontWeight: 'bold',
    fontSize: 14,
  },
  expandedContent: {
    paddingHorizontal: 20,
    paddingBottom: 10,
    backgroundColor: '#FAFAFA',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E5EA',
  },
  subjectRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  subjectInfo: {
    flex: 1,
    paddingRight: 15,
  },
  subjectName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  creditsText: {
    fontSize: 13,
    color: '#8E8E93',
  },
  gradeBadge: {
    backgroundColor: '#E5F1FF',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradeText: {
    color: '#007AFF',
    fontWeight: 'bold',
    fontSize: 16,
  }
});
