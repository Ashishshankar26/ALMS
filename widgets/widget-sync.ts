import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import React from 'react';
import { NextClassWidget, NextClassWidgetData } from './NextClassWidget';

// Format all-caps subject names into clean Title Case
export function formatSubjectTitle(raw: string): string {
  if (!raw) return 'Class';
  const clean = raw.trim();
  const isAllUpper = clean === clean.toUpperCase();
  if (!isAllUpper) return clean;

  const acronyms = new Set([
    'AI', 'ML', 'IOT', 'OS', 'DBMS', 'DSA', 'SQL', 'CSS', 'HTML', 'JS',
    'PHP', 'API', 'UI', 'UX', 'IT', 'ECE', 'CSE', 'MEC', 'CIV', 'EE',
    'LPU', 'TBA', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'
  ]);

  const specialWords: Record<string, string> = {
    'REACTJS': 'React.js',
    'NODEJS': 'Node.js',
    'NEXTJS': 'Next.js',
    'VUEJS': 'Vue.js',
    'CPP': 'C++',
    'OOP': 'OOPs',
  };

  return clean
    .toLowerCase()
    .split(/\s+/)
    .map((word, index) => {
      const upper = word.toUpperCase();
      if (specialWords[upper]) return specialWords[upper];
      if (acronyms.has(upper)) return upper;
      const minor = ['with', 'and', 'or', 'for', 'in', 'on', 'at', 'to', 'of', 'by', 'the', 'a', 'an'];
      if (index > 0 && minor.includes(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

// Time slot parser with UMS afternoon detection
export function parseTimeSlot(timeStr: string) {
  if (!timeStr) return null;
  const parts = timeStr.split(/\s*[-–—]\s*|\s+to\s+/i);
  if (parts.length === 0) return null;

  const parseSingle = (part: string, defaultPM: boolean) => {
    const match = part.match(/(\d{1,2}):(\d{2})/);
    if (!match) return null;
    let h = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    const partHasPM = part.toUpperCase().includes('PM');
    const partHasAM = part.toUpperCase().includes('AM');

    if (partHasPM) {
      if (h < 12) h += 12;
    } else if (partHasAM) {
      if (h === 12) h = 0;
    } else if (defaultPM) {
      if (h < 12) h += 12;
    } else {
      if (h >= 1 && h <= 7) h += 12;
    }
    return h * 60 + m;
  };

  const hasEndPM = parts[1]?.toUpperCase().includes('PM') || false;
  const startHasAM = parts[0]?.toUpperCase().includes('AM') || false;
  const startHasPM = parts[0]?.toUpperCase().includes('PM') || false;
  const startDefaultPM = hasEndPM && !startHasAM && !startHasPM;

  const startMinutes = parseSingle(parts[0], startDefaultPM);
  const endMinutes = parts[1] ? parseSingle(parts[1], hasEndPM) : (startMinutes !== null ? startMinutes + 50 : null);

  return { startMinutes, endMinutes };
}

// Extract current next class from timetable data
export function calculateNextClass(timetable: any = {}, makeupClasses: any[] = []): NextClassWidgetData {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const now = new Date();
  const currentDay = days[now.getDay()];
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  let candidates: any[] = [];
  const timetableDayKey = Object.keys(timetable).find(k => k.toLowerCase() === currentDay.toLowerCase());
  if (timetableDayKey && timetable[timetableDayKey]) {
    timetable[timetableDayKey].forEach((c: any) => candidates.push({ ...c }));
  }

  if (currentDay.toLowerCase() === 'saturday') {
    candidates = candidates.filter((cls: any) => {
      const subject = (cls.subject || "").toLowerCase();
      return !subject.includes('project work');
    });
  }

  // Add makeup classes for today
  if (Array.isArray(makeupClasses)) {
    makeupClasses.forEach((c: any) => {
      if (c.date) {
        try {
          const dateParts = c.date.split('-');
          if (dateParts.length === 3) {
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const classDate = new Date(parseInt(dateParts[2]), months.indexOf(dateParts[1]), parseInt(dateParts[0]));
            if (classDate.toDateString() === now.toDateString()) {
              candidates.push({
                time: c.time,
                subject: c.subject,
                subjectCode: c.subjectCode,
                room: c.room,
                type: c.type || 'Makeup',
              });
            }
          }
        } catch (e) {}
      }
    });
  }

  const parsed = candidates.map(c => {
    const slot = parseTimeSlot(c.time);
    return {
      ...c,
      startMin: slot?.startMinutes ?? null,
      endMin: slot?.endMinutes ?? null,
    };
  }).filter(c => c.startMin !== null);

  // 1. Ongoing class
  const ongoing = parsed.find(c => c.startMin !== null && c.endMin !== null && currentMinutes >= c.startMin && currentMinutes < c.endMin);
  if (ongoing) {
    const remaining = (ongoing.endMin || 0) - currentMinutes;
    return {
      status: 'ongoing',
      statusText: `LIVE NOW • ${remaining}m left`,
      time: ongoing.time,
      subject: formatSubjectTitle(ongoing.subject || 'Class'),
      room: ongoing.room || 'TBA',
      type: ongoing.type || 'Lecture',
      subjectCode: ongoing.subjectCode || '',
    };
  }

  // 2. Upcoming class today
  const upcoming = parsed.filter(c => (c.startMin || 0) > currentMinutes);
  if (upcoming.length > 0) {
    upcoming.sort((a, b) => (a.startMin || 0) - (b.startMin || 0));
    const next = upcoming[0];
    const minsUntil = (next.startMin || 0) - currentMinutes;
    return {
      status: 'upcoming',
      statusText: `STARTS IN ${minsUntil}m`,
      time: next.time,
      subject: formatSubjectTitle(next.subject || 'Class'),
      room: next.room || 'TBA',
      type: next.type || 'Lecture',
      subjectCode: next.subjectCode || '',
    };
  }

  // 3. Look ahead to Tomorrow
  const tomorrowDay = days[(now.getDay() + 1) % 7];
  if (tomorrowDay !== 'Sunday') {
    const tomorrowKey = Object.keys(timetable).find(k => k.toLowerCase() === tomorrowDay.toLowerCase());
    if (tomorrowKey && timetable[tomorrowKey] && timetable[tomorrowKey].length > 0) {
      const tomorrowParsed = timetable[tomorrowKey].map((c: any) => {
        const slot = parseTimeSlot(c.time);
        return { ...c, startMin: slot?.startMinutes ?? null };
      }).filter((c: any) => c.startMin !== null);

      if (tomorrowParsed.length > 0) {
        tomorrowParsed.sort((a: any, b: any) => (a.startMin || 0) - (b.startMin || 0));
        const firstTomorrow = tomorrowParsed[0];
        return {
          status: 'tomorrow',
          statusText: 'TOMORROW',
          time: firstTomorrow.time,
          subject: formatSubjectTitle(firstTomorrow.subject || 'Class'),
          room: firstTomorrow.room || 'TBA',
          type: firstTomorrow.type || 'Lecture',
          subjectCode: firstTomorrow.subjectCode || '',
        };
      }
    }
  }

  return {
    status: 'no_classes',
    statusText: 'ALL CAUGHT UP',
    time: '',
    subject: '',
    room: '',
    type: '',
    subjectCode: '',
  };
}

// Retrieve cached data and compute widget state
export async function getWidgetClassData(): Promise<NextClassWidgetData> {
  try {
    const raw = await AsyncStorage.getItem('@scraped_data');
    if (!raw) return { status: 'no_classes', statusText: 'ALL CAUGHT UP', time: '', subject: '', room: '', type: '', subjectCode: '' };
    const parsed = JSON.parse(raw);
    return calculateNextClass(parsed.timetable || {}, parsed.makeupClasses || []);
  } catch (e) {
    return { status: 'no_classes', statusText: 'ALL CAUGHT UP', time: '', subject: '', room: '', type: '', subjectCode: '' };
  }
}

// Trigger widget re-render on Android
export async function syncAndroidWidget(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    const { requestWidgetUpdate } = require('react-native-android-widget');
    const data = await getWidgetClassData();
    await requestWidgetUpdate({
      widgetName: 'NextClassWidget',
      renderWidget: () => React.createElement(NextClassWidget, { data }),
    });
  } catch (err) {
    // Graceful fallback if native widget code is not linked
  }
}
