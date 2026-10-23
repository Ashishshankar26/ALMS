import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, AppState, AppStateStatus } from 'react-native';
import React from 'react';
import { NextClassWidget, NextClassWidgetData, ScheduleItem } from './NextClassWidget';
import { AttendanceWidget, AttendanceWidgetData } from './AttendanceWidget';
import { QuickStatsWidget, QuickStatsWidgetData } from './QuickStatsWidget';
import { getUpcomingExam, decodeLpuRoom } from './theme';
import type { WidgetInfo } from 'react-native-android-widget';

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

// Convert minute-of-day integer into formatted 12-hour AM/PM string (e.g. 840 -> "02:00 PM")
export function formatMinutesToTime(minutes: number): string {
  const h24 = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  const ampm = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  const mm = m < 10 ? `0${m}` : `${m}`;
  return `${h12}:${mm} ${ampm}`;
}

// Extract current next class and entire day schedule from timetable data
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

  // Sort today's schedule chronologically
  parsed.sort((a, b) => (a.startMin || 0) - (b.startMin || 0));

  const todaySchedule: ScheduleItem[] = parsed.map(c => ({
    time: c.time,
    subject: formatSubjectTitle(c.subject || 'Class'),
    subjectCode: c.subjectCode || '',
    room: c.room || 'TBA',
    type: c.type || 'Lecture',
    isOngoing: Boolean(c.startMin !== null && c.endMin !== null && currentMinutes >= c.startMin && currentMinutes < c.endMin),
    isPast: Boolean(c.endMin !== null && c.endMin <= currentMinutes),
    isUpcoming: Boolean(c.startMin !== null && c.startMin > currentMinutes),
  }));

  const todayTotalClasses = todaySchedule.length;
  const todayCompletedClasses = todaySchedule.filter(s => s.isPast).length;
  const todayRemainingClasses = todaySchedule.filter(s => s.isUpcoming).length;

  // 1. Ongoing class
  const ongoing = parsed.find(c => c.startMin !== null && c.endMin !== null && currentMinutes >= c.startMin && currentMinutes < c.endMin);
  if (ongoing) {
    const remaining = (ongoing.endMin || 0) - currentMinutes;
    const endTimeStr = ongoing.endMin !== null ? formatMinutesToTime(ongoing.endMin) : '';
    const ongoingIdx = todaySchedule.findIndex(s => s.isOngoing);
    const currentClassIndex = ongoingIdx >= 0 ? ongoingIdx + 1 : 1;

    return {
      status: 'ongoing',
      statusText: endTimeStr ? `ACTIVE NOW • TILL ${endTimeStr} (${remaining}m)` : `ACTIVE NOW • ${remaining}m left`,
      time: ongoing.time,
      subject: formatSubjectTitle(ongoing.subject || 'Class'),
      room: ongoing.room || 'TBA',
      type: ongoing.type || 'Lecture',
      subjectCode: ongoing.subjectCode || '',
      todaySchedule,
      todayTotalClasses,
      todayCompletedClasses,
      todayRemainingClasses,
      currentClassIndex,
      timeUntilOrLeft: `${remaining}m left`,
      activeClassEndTime: endTimeStr,
    };
  }

  // 2. Upcoming class today
  const upcoming = parsed.filter(c => (c.startMin || 0) > currentMinutes);
  if (upcoming.length > 0) {
    upcoming.sort((a, b) => (a.startMin || 0) - (b.startMin || 0));
    const next = upcoming[0];
    const minsUntil = (next.startMin || 0) - currentMinutes;
    const startTimeStr = next.startMin !== null ? formatMinutesToTime(next.startMin) : '';
    const nextIdx = todaySchedule.findIndex(s => s.isUpcoming);
    const currentClassIndex = nextIdx >= 0 ? nextIdx + 1 : 1;

    return {
      status: 'upcoming',
      statusText: startTimeStr ? `STARTS AT ${startTimeStr} (${minsUntil}m)` : `STARTS IN ${minsUntil}m`,
      time: next.time,
      subject: formatSubjectTitle(next.subject || 'Class'),
      room: next.room || 'TBA',
      type: next.type || 'Lecture',
      subjectCode: next.subjectCode || '',
      todaySchedule,
      todayTotalClasses,
      todayCompletedClasses,
      todayRemainingClasses,
      currentClassIndex,
      timeUntilOrLeft: `in ${minsUntil}m`,
      nextClassStartTime: startTimeStr,
    };
  }

  // 3. Look ahead across the stored week's timetable (Tomorrow, or next active day like Monday)
  for (let offset = 1; offset <= 7; offset++) {
    const targetDay = days[(now.getDay() + offset) % 7];
    if (targetDay === 'Sunday') continue;
    const dayKey = Object.keys(timetable).find(k => k.toLowerCase() === targetDay.toLowerCase());
    if (dayKey && Array.isArray(timetable[dayKey]) && timetable[dayKey].length > 0) {
      let dayClasses = timetable[dayKey].map((c: any) => {
        const slot = parseTimeSlot(c.time);
        return { ...c, startMin: slot?.startMinutes ?? null };
      }).filter((c: any) => c.startMin !== null);

      if (targetDay === 'Saturday') {
        dayClasses = dayClasses.filter((cls: any) => !(cls.subject || '').toLowerCase().includes('project work'));
      }

      if (dayClasses.length > 0) {
        dayClasses.sort((a: any, b: any) => (a.startMin || 0) - (b.startMin || 0));
        const first = dayClasses[0];
        const statusLabel = offset === 1 ? 'TOMORROW' : targetDay.toUpperCase();
        const startTimeStr = first.startMin !== null ? formatMinutesToTime(first.startMin) : '';
        return {
          status: offset === 1 ? 'tomorrow' : 'upcoming',
          statusText: startTimeStr ? `${statusLabel} AT ${startTimeStr}` : statusLabel,
          time: first.time,
          subject: formatSubjectTitle(first.subject || 'Class'),
          room: first.room || 'TBA',
          type: first.type || 'Lecture',
          subjectCode: first.subjectCode || '',
          todaySchedule,
          todayTotalClasses,
          todayCompletedClasses,
          todayRemainingClasses,
          currentClassIndex: 0,
          nextClassStartTime: startTimeStr,
        };
      }
    }
  }

  return {
    status: 'no_classes',
    statusText: todayTotalClasses > 0 ? `ALL ${todayTotalClasses} CLASSES DONE ✓` : 'ALL CAUGHT UP',
    time: '',
    subject: '',
    room: '',
    type: '',
    subjectCode: '',
    todaySchedule,
    todayTotalClasses,
    todayCompletedClasses,
    todayRemainingClasses,
    currentClassIndex: 0,
  };
}

// ── DATA EXTRACTORS ──

// Retrieve cached data and compute NextClass widget state with schedule & academic stats
export async function getWidgetClassData(): Promise<NextClassWidgetData> {
  try {
    const raw = await AsyncStorage.getItem('@scraped_data');
    if (!raw) {
      return {
        status: 'no_classes',
        statusText: 'ALL CAUGHT UP',
        time: '',
        subject: '',
        room: '',
        type: '',
        subjectCode: '',
        todaySchedule: [],
      };
    }
    const parsed = JSON.parse(raw);
    const result = calculateNextClass(parsed.timetable || {}, parsed.makeupClasses || []);

    if (Array.isArray(parsed.attendance) && parsed.attendance.length > 0) {
      const total = parsed.attendance.reduce((acc: number, curr: any) => acc + (curr.totalClasses || 0), 0);
      const attended = parsed.attendance.reduce((acc: number, curr: any) => acc + (curr.attendedClasses || 0), 0);
      const duty = parsed.attendance.reduce((acc: number, curr: any) => acc + (curr.dutyLeaves || 0), 0);
      const bonus = parsed.attendance.reduce((acc: number, curr: any) => acc + (curr.bonusAttendance || 0), 0);
      const totalPresent = attended + duty + bonus;

      const officialParsed = parseFloat(parsed.overallAttendance);
      result.overallAttendance = (!isNaN(officialParsed) && officialParsed > 0 && officialParsed <= 100)
        ? Math.ceil(officialParsed)
        : (total > 0 ? Math.min(100, Math.ceil((totalPresent / total) * 100)) : 0);
      result.attendedClasses = totalPresent;
      result.totalClasses = total;
    }
    result.cgpa = parsed.cgpa || '';
    result.upcomingExam = getUpcomingExam(parsed.exams || []);
    return result;
  } catch (e) {
    return {
      status: 'no_classes',
      statusText: 'ALL CAUGHT UP',
      time: '',
      subject: '',
      room: '',
      type: '',
      subjectCode: '',
      todaySchedule: [],
    };
  }
}

// Retrieve cached data and compute Attendance widget state
export async function getWidgetAttendanceData(): Promise<AttendanceWidgetData | undefined> {
  try {
    const raw = await AsyncStorage.getItem('@scraped_data');
    if (!raw) return undefined;
    const parsed = JSON.parse(raw);
    const attendance = parsed.attendance;
    if (!Array.isArray(attendance) || attendance.length === 0) return undefined;

    const total = attendance.reduce((acc: number, curr: any) => acc + (curr.totalClasses || 0), 0);
    const attended = attendance.reduce((acc: number, curr: any) => acc + (curr.attendedClasses || 0), 0);
    const dutyLeaves = attendance.reduce((acc: number, curr: any) => acc + (curr.dutyLeaves || 0), 0);
    const bonusAttendance = attendance.reduce((acc: number, curr: any) => acc + (curr.bonusAttendance || 0), 0);
    const totalPresent = attended + dutyLeaves + bonusAttendance;

    const officialParsed = parseFloat(parsed.overallAttendance);
    const calculated = total > 0 ? Math.min(100, Math.ceil((totalPresent / total) * 100)) : 0;
    const overallPercentage = (!isNaN(officialParsed) && officialParsed > 0 && officialParsed <= 100)
      ? Math.ceil(officialParsed)
      : calculated;

    const criticalCount = attendance.filter((a: any) => {
      const t = a.totalClasses || 0;
      const p = (a.attendedClasses || 0) + (a.dutyLeaves || 0) + (a.bonusAttendance || 0);
      return t > 0 && (p / t) * 100 < 75;
    }).length;

    return {
      overallPercentage,
      attended,
      total,
      dutyLeaves,
      bonusAttendance,
      subjectCount: attendance.length,
      criticalCount,
    };
  } catch (e) {
    return undefined;
  }
}

// Retrieve cached data and compute QuickStats widget state
export async function getWidgetQuickStatsData(): Promise<QuickStatsWidgetData | undefined> {
  try {
    const raw = await AsyncStorage.getItem('@scraped_data');
    if (!raw) return undefined;
    const parsed = JSON.parse(raw);

    const attendance = parsed.attendance;
    const total = Array.isArray(attendance) ? attendance.reduce((acc: number, curr: any) => acc + (curr.totalClasses || 0), 0) : 0;
    const attended = Array.isArray(attendance) ? attendance.reduce((acc: number, curr: any) => acc + (curr.attendedClasses || 0), 0) : 0;
    const dutyLeaves = Array.isArray(attendance) ? attendance.reduce((acc: number, curr: any) => acc + (curr.dutyLeaves || 0), 0) : 0;
    const bonusAttendance = Array.isArray(attendance) ? attendance.reduce((acc: number, curr: any) => acc + (curr.bonusAttendance || 0), 0) : 0;
    const totalPresent = attended + dutyLeaves + bonusAttendance;

    const officialParsed = parseFloat(parsed.overallAttendance);
    const calculated = total > 0 ? Math.min(100, Math.ceil((totalPresent / total) * 100)) : 0;
    const attendancePercent = (!isNaN(officialParsed) && officialParsed > 0 && officialParsed <= 100)
      ? Math.ceil(officialParsed)
      : calculated;

    const classData = calculateNextClass(parsed.timetable || {}, parsed.makeupClasses || []);

    return {
      cgpa: parsed.cgpa || '--',
      attendancePercent,
      attended,
      total,
      nextSubject: classData.subject ? formatSubjectTitle(classData.subject) : '',
      nextTime: classData.time || '',
      nextRoom: classData.room || '',
      hasClass: classData.status !== 'no_classes',
    };
  } catch (e) {
    return undefined;
  }
}

// Schedule 10-minute pre-class alerts and starting transition notifications so user stays alerted even when app is killed
export async function scheduleClassTransitionAlerts(schedule: ScheduleItem[]): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    const Notifications = require('expo-notifications');
    const permissions = await Notifications.getPermissionsAsync();
    if (!permissions.granted) return;

    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const notif of scheduled) {
      if (notif.content.data?.isClassAlert || notif.content.data?.isClassTransition) {
        await Notifications.cancelScheduledNotificationAsync(notif.identifier);
      }
    }

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    for (const item of schedule) {
      const slot = parseTimeSlot(item.time);
      if (!slot?.startMinutes) continue;

      const decoded = decodeLpuRoom(item.room);
      const roomStr = decoded.fullLabel;
      const formattedSub = formatSubjectTitle(item.subject);

      // 1. Ten-minute pre-class alert
      const alert10Min = slot.startMinutes - 10;
      if (alert10Min > currentMinutes) {
        const trigger10 = new Date();
        trigger10.setHours(Math.floor(alert10Min / 60));
        trigger10.setMinutes(alert10Min % 60);
        trigger10.setSeconds(0);

        await Notifications.scheduleNotificationAsync({
          content: {
            title: `Class in 10m: ${formattedSub}`,
            body: `📍 ${roomStr} • Starts at ${formatMinutesToTime(slot.startMinutes)}`,
            data: { isClassAlert: true, url: 'alms://timetable' },
            sound: true,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: trigger10,
          },
        });
      }

      // 2. Class starting now transition alert
      if (slot.startMinutes > currentMinutes) {
        const triggerDate = new Date();
        triggerDate.setHours(Math.floor(slot.startMinutes / 60));
        triggerDate.setMinutes(slot.startMinutes % 60);
        triggerDate.setSeconds(0);

        await Notifications.scheduleNotificationAsync({
          content: {
            title: `Class Starting: ${formattedSub}`,
            body: `📍 ${roomStr} • ${item.time}`,
            data: { isClassAlert: true, url: 'alms://timetable' },
            sound: true,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: triggerDate,
          },
        });
      }
    }
  } catch (err) {}
}

// ── WIDGET UPDATE TRIGGERS ──

// Trigger ALL widget types to re-render on Android with their specific widgetInfo dimensions
export async function syncAndroidWidget(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    const { requestWidgetUpdate } = require('react-native-android-widget');

    // Update NextClassWidget (Smart Stack)
    try {
      const classData = await getWidgetClassData();
      const hasUpcomingExam = Boolean(classData.upcomingExam && classData.upcomingExam.isApproaching);
      const totalCards = hasUpcomingExam ? 5 : 4;

      await requestWidgetUpdate({
        widgetName: 'NextClassWidget',
        renderWidget: async (widgetInfo: WidgetInfo) => {
          const savedStack =
            (await AsyncStorage.getItem(`@widget_stack_${widgetInfo.widgetId}`)) ||
            (await AsyncStorage.getItem('@widget_active_stack_index'));
          const rawStack = savedStack ? parseInt(savedStack, 10) : 0;
          const stackIndex = isNaN(rawStack) ? 0 : ((rawStack % totalCards) + totalCards) % totalCards;

          const savedPage =
            (await AsyncStorage.getItem(`@widget_page_${widgetInfo.widgetId}`)) ||
            (await AsyncStorage.getItem('@widget_active_page_index'));
          const schedulePage = savedPage ? parseInt(savedPage, 10) : 0;

          return React.createElement(NextClassWidget, {
            data: {
              ...classData,
              stackIndex,
              schedulePage: isNaN(schedulePage) ? 0 : schedulePage,
            },
            widgetInfo,
          });
        },
      });

      // Schedule transition alerts for today's classes
      if (Array.isArray(classData.todaySchedule) && classData.todaySchedule.length > 0) {
        scheduleClassTransitionAlerts(classData.todaySchedule).catch(() => {});
      }
    } catch (err) {}

    // Update AttendanceWidget
    try {
      const attData = await getWidgetAttendanceData();
      await requestWidgetUpdate({
        widgetName: 'AttendanceWidget',
        renderWidget: (widgetInfo: WidgetInfo) => React.createElement(AttendanceWidget, { data: attData, widgetInfo }),
      });
    } catch (err) {}

    // Update QuickStatsWidget
    try {
      const statsData = await getWidgetQuickStatsData();
      await requestWidgetUpdate({
        widgetName: 'QuickStatsWidget',
        renderWidget: (widgetInfo: WidgetInfo) => React.createElement(QuickStatsWidget, { data: statsData, widgetInfo }),
      });
    } catch (err) {}
  } catch (err) {
    // Graceful fallback if native widget code is not linked
  }
}

// ── LIVE IN-APP AUTO-SYNC ──
// Keeps widgets ticking in real-time when app is open or resumes from background
let autoSyncInterval: ReturnType<typeof setInterval> | null = null;
let appStateSub: any = null;

export function initWidgetAutoSync(): () => void {
  if (Platform.OS !== 'android') return () => {};

  // Initial immediate sync
  syncAndroidWidget().catch(() => {});

  // Sync whenever app comes into foreground
  if (!appStateSub) {
    appStateSub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') {
        syncAndroidWidget().catch(() => {});
      }
    });
  }

  // Periodic 60s ticker while app is active so real-time countdown stays accurate
  if (!autoSyncInterval) {
    autoSyncInterval = setInterval(() => {
      if (AppState.currentState === 'active') {
        syncAndroidWidget().catch(() => {});
      }
    }, 60000);
  }

  return () => {
    if (autoSyncInterval) {
      clearInterval(autoSyncInterval);
      autoSyncInterval = null;
    }
    if (appStateSub) {
      appStateSub.remove();
      appStateSub = null;
    }
  };
}
