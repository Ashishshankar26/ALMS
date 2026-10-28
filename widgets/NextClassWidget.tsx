import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import type { WidgetInfo, ColorProp } from 'react-native-android-widget';
import {
  ApplePalette,
  getAppleWidgetConfig,
  calculateBunkMargin,
  decodeLpuRoom,
  type UpcomingExamInfo,
  type WidgetLayoutConfig,
} from './theme';
import type { SubjectAttendanceItem } from './AttendanceWidget';

export interface ScheduleItem {
  time: string;
  subject: string;
  subjectCode: string;
  room: string;
  type: string;
  isOngoing?: boolean;
  isPast?: boolean;
  isUpcoming?: boolean;
}

export interface UpNextClassInfo {
  time: string;
  startTime: string;
  subject: string;
  subjectCode: string;
  room: string;
  block: string;
  attendanceSafeText: string;
}

export interface NextClassWidgetData {
  status: 'ongoing' | 'upcoming' | 'tomorrow' | 'no_classes';
  statusText: string;
  time: string;
  subject: string;
  room: string;
  type: string;
  subjectCode: string;
  todaySchedule: ScheduleItem[];
  todayTotalClasses?: number;
  todayCompletedClasses?: number;
  todayRemainingClasses?: number;
  currentClassIndex?: number;
  timeUntilOrLeft?: string;
  activeClassEndTime?: string;
  nextClassStartTime?: string;
  overallAttendance?: number;
  attendedClasses?: number;
  totalClasses?: number;
  cgpa?: string;
  termGpa?: string;
  creditsCompleted?: string;
  upcomingExam?: UpcomingExamInfo | null;
  upNext?: UpNextClassInfo;
  subjects?: SubjectAttendanceItem[];
  stackIndex?: number;
  schedulePage?: number;
}

export function formatAppleTitle(raw: string): string {
  if (!raw) return 'Class';
  const clean = raw.trim();
  const isAllUpper = clean === clean.toUpperCase();
  if (!isAllUpper) return clean;

  const acronyms = new Set([
    'AI', 'ML', 'IOT', 'OS', 'DBMS', 'DSA', 'SQL', 'CSS', 'HTML', 'JS',
    'PHP', 'API', 'UI', 'UX', 'IT', 'ECE', 'CSE', 'MEC', 'CIV', 'EE',
    'LPU', 'TBA', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'
  ]);

  return clean
    .toLowerCase()
    .split(/\s+/)
    .map((word, index) => {
      const upper = word.toUpperCase();
      if (acronyms.has(upper)) return upper;
      const minor = ['with', 'and', 'or', 'for', 'in', 'on', 'at', 'to', 'of', 'by', 'the', 'a', 'an'];
      if (index > 0 && minor.includes(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

// ── Smart Stack Vertical Indicator Dots ──
function renderVerticalStackIndicator(activeIndex: number, total: number = 4) {
  const dots = [];
  for (let i = 0; i < total; i++) {
    const isActive = i === activeIndex;
    dots.push(
      <FlexWidget
        key={`dot_${i}`}
        style={{
          width: 3.5,
          height: isActive ? 16 : 3.5,
          borderRadius: 2,
          backgroundColor: isActive ? '#FFFFFF' : '#636366',
          marginBottom: i < total - 1 ? 2.5 : 0,
        }}
      />
    );
  }

  return (
    <FlexWidget
      style={{
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: 14,
        paddingVertical: 2,
      }}
      clickAction="CYCLE_STACK"
    >
      {dots}
    </FlexWidget>
  );
}

export function NextClassWidget({
  data,
  widgetInfo,
  stackIndex,
}: {
  data?: NextClassWidgetData;
  widgetInfo?: WidgetInfo;
  stackIndex?: number;
}) {
  const cfg = getAppleWidgetConfig(widgetInfo?.width, widgetInfo?.height, widgetInfo?.screenInfo);

  const hasUpcomingExam = Boolean(data?.upcomingExam && data.upcomingExam.isApproaching);
  const totalCards = hasUpcomingExam ? 5 : 4;
  const resolvedStackIndex = data?.stackIndex !== undefined ? data.stackIndex : (stackIndex ?? 0);
  const activeStackIndex = ((resolvedStackIndex % totalCards) + totalCards) % totalCards;

  // Attendance & Bunk Margin data
  const attended = data?.attendedClasses ?? 58;
  const total = data?.totalClasses ?? 74;
  const bunkResult = calculateBunkMargin(attended, total, 0.75);
  const attPct = data?.overallAttendance ?? (total > 0 ? Math.round((attended / total) * 100) : 78.4);
  const isSafe = attPct >= 75;
  const targetDiff = (attPct - 75).toFixed(1);

  // Class Info
  const isOngoing = data?.status === 'ongoing';
  const isTomorrow = data?.status === 'tomorrow';
  const hasClasses = data && data.status !== 'no_classes' && data.subject;
  const subjectTitle = formatAppleTitle(data?.subject || 'Software Engineering');
  const courseCode = data?.subjectCode || 'CSE320';
  const timeDisplay = data?.time || '09:00 AM – 10:00 AM';
  const rawRoom = data?.room || '34-101';
  const decodedRoom = decodeLpuRoom(rawRoom);
  const roomShort = decodedRoom.shortLabel.replace('Room ', '');
  const tileRoomCode = rawRoom.includes('-')
    ? rawRoom
    : (decodedRoom.roomNumber ? `${decodedRoom.blockNumber || 'B'}-${decodedRoom.roomNumber}` : rawRoom.slice(0, 7));
  const timeRemaining = data?.timeUntilOrLeft ? data.timeUntilOrLeft.replace('left', '').replace('in', '').trim() : '42m';

  // Up Next Class
  const upNext = data?.upNext || {
    time: '10:00 AM',
    startTime: '10:00 AM',
    subject: 'Front End Web Development',
    subjectCode: 'INT219',
    room: '38-302',
    block: 'Block 38',
    attendanceSafeText: 'Attendance Safe (82.1%)',
  };

  // 4x2 launcher widgets on Android report h ~130-220dp; >= 240dp indicates expanded 3+ rows
  const isCompactHeight = cfg.h < 240;
  const rootPadV = isCompactHeight ? 6 : 12;
  const rootPadH = cfg.w < 300 ? 10 : 14;

  // Adaptive Card 0 dimensions (fits in ~131dp)
  const heroTimeSize = isCompactHeight ? 20 : 28;
  const heroLocSize = isCompactHeight ? 11 : 13.5;
  const heroMarginB = isCompactHeight ? 2 : 4;
  const pillsMarginB = isCompactHeight ? 3 : 5;
  const pillPadV = isCompactHeight ? 2.5 : 4.5;
  const pillPadH = isCompactHeight ? 7 : 10;
  const pillFontSize = isCompactHeight ? 9 : 10.5;
  const upNextPadV = isCompactHeight ? 5 : 9;
  const upNextPadH = isCompactHeight ? 8 : 12;
  const upNextSubjSize = isCompactHeight ? 11 : 13;
  const upNextDetailSize = isCompactHeight ? 8.5 : 10;
  const btnPadV = isCompactHeight ? 4 : 6;
  const btnPadH = isCompactHeight ? 8 : 11;
  const btnFontSize = isCompactHeight ? 9 : 10.5;

  // Adaptive Card 1 dimensions (fits in ~127dp)
  const attPctSize = isCompactHeight ? 24 : 32;
  const attLabelSize = isCompactHeight ? 9 : 10.5;
  const bunkTitleSize = isCompactHeight ? 13 : 18;
  const bunkSubSize = isCompactHeight ? 8 : 9;
  const bunkPadV = isCompactHeight ? 4 : 7;
  const bunkPadH = isCompactHeight ? 8 : 14;
  const trackHeight = isCompactHeight ? 9 : 12;
  const cardPadV = isCompactHeight ? 4 : 8;
  const cardPadH = isCompactHeight ? 6 : 10;
  const cardSubjSize = isCompactHeight ? 9.5 : 11;
  const cardPctSize = isCompactHeight ? 13 : 16;
  const cardMarginSize = isCompactHeight ? 8.5 : 10;

  // Adaptive Card 2 dimensions (fits in ~122dp)
  const cgpaHeroSize = isCompactHeight ? 20 : 28;
  const cgpaTermSize = isCompactHeight ? 9.5 : 11;
  const cgpaCreditSize = isCompactHeight ? 8 : 9;
  const tilePadV = isCompactHeight ? 5 : 9;
  const tilePadH = isCompactHeight ? 6 : 10;
  const tileBtnPadV = isCompactHeight ? 3.5 : 5;
  const tileBtnFontSize = isCompactHeight ? 8 : 9;

  // Adaptive Card 3 dimensions
  const examCodeSize = isCompactHeight ? 22 : 28;
  const examTitleSize = isCompactHeight ? 10.5 : 12.5;
  const examDateSize = isCompactHeight ? 9 : 10.5;
  const examBarPadV = isCompactHeight ? 4 : 7;

  // ═════════════════════════════════════════════════════════════════════════
  // 1. SMALL 2x2 COMPACT FOCUS (Glanceable Minimal)
  // ═════════════════════════════════════════════════════════════════════════
  if (cfg.isSmall) {
    return (
      <FlexWidget
        style={{
          height: 'match_parent',
          width: 'match_parent',
          backgroundColor: '#1C1C1E',
          borderRadius: 24,
          borderWidth: 1.5,
          borderColor: '#2C2C2E',
          paddingHorizontal: 12,
          paddingVertical: 10,
          justifyContent: 'space-between',
        }}
      >
        <FlexWidget style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: 'match_parent' }}>
          <FlexWidget
            style={{
              backgroundColor: isOngoing ? 'rgba(48, 209, 88, 0.15)' : 'rgba(10, 132, 255, 0.15)',
              borderRadius: 14,
              paddingHorizontal: 7,
              paddingVertical: 3,
              borderWidth: 1,
              borderColor: isOngoing ? '#30D158' : '#0A84FF',
              flexDirection: 'row',
              alignItems: 'center',
            }}
            clickAction="REFRESH_WIDGET"
          >
            <FlexWidget
              style={{
                width: 5,
                height: 5,
                borderRadius: 2.5,
                backgroundColor: isOngoing ? '#30D158' : '#0A84FF',
                marginRight: 4,
              }}
            />
            <TextWidget
              text={isOngoing ? 'LIVE' : (isTomorrow ? 'TOMORROW' : 'NEXT')}
              style={{ color: isOngoing ? '#30D158' : '#0A84FF', fontSize: 8.5, fontWeight: '900' }}
            />
          </FlexWidget>

          {renderVerticalStackIndicator(activeStackIndex, totalCards)}
        </FlexWidget>

        <FlexWidget style={{ width: 'match_parent', marginVertical: 1 }} clickAction="OPEN_URI" clickActionData={{ uri: 'alms://timetable' }}>
          <TextWidget
            text={courseCode}
            style={{ color: '#FFFFFF', fontSize: 20, fontWeight: '900', letterSpacing: -0.3 }}
          />
          <TextWidget
            text={subjectTitle}
            maxLines={1}
            truncate="END"
            style={{ color: '#8E8E93', fontSize: 10, fontWeight: '600' }}
          />
        </FlexWidget>

        <FlexWidget style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: 'match_parent' }}>
          <FlexWidget
            style={{
              backgroundColor: '#2C2C2E',
              borderRadius: 8,
              paddingHorizontal: 6,
              paddingVertical: 3,
            }}
            clickAction="OPEN_URI"
            clickActionData={{ uri: 'alms://timetable' }}
          >
            <TextWidget
              text={`📍 ${roomShort}`}
              style={{ color: '#0A84FF', fontSize: 9.5, fontWeight: '700' }}
            />
          </FlexWidget>

          <TextWidget
            text={timeDisplay.split('–')[0].split('-')[0].trim()}
            style={{ color: '#8E8E93', fontSize: 9.5, fontWeight: '600' }}
          />
        </FlexWidget>
      </FlexWidget>
    );
  }

  // ═════════════════════════════════════════════════════════════════════════
  // 2. STACK CARD 1: ATTENDANCE & SAFETY (EXACT CLONE OF USER IMAGE 2)
  // ═════════════════════════════════════════════════════════════════════════
  if (activeStackIndex === 1) {
    const trackWidth = Math.max(200, cfg.w - 32);
    const fillWidth = Math.max(10, Math.min(trackWidth, Math.round((trackWidth * Math.min(100, attPct)) / 100)));

    const subList = data?.subjects && data.subjects.length >= 3 ? data.subjects.slice(0, 3) : [
      { subjectCode: 'CSE320', percentage: 84.2, attended: 32, total: 38, marginText: '+4 Safe', color: '#30D158' as ColorProp },
      { subjectCode: 'INT219', percentage: 76.0, attended: 19, total: 25, marginText: '+1 Safe', color: '#FF9F0A' as ColorProp },
      { subjectCode: 'MTH401', percentage: 72.5, attended: 29, total: 40, marginText: 'Need 2', color: '#FF453A' as ColorProp },
    ];

    return (
      <FlexWidget
        style={{
          height: 'match_parent',
          width: 'match_parent',
          backgroundColor: '#1C1C1E',
          borderRadius: 24,
          borderWidth: 1.5,
          borderColor: '#2C2C2E',
          paddingHorizontal: rootPadH,
          paddingVertical: rootPadV,
          justifyContent: isCompactHeight ? 'flex-start' : 'space-between',
        }}
        clickAction="OPEN_URI"
        clickActionData={{ uri: 'alms://(tabs)/attendance' }}
      >
        {/* Header */}
        <FlexWidget style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', width: 'match_parent' }}>
          <FlexWidget style={{ flexDirection: 'column' }}>
            <TextWidget
              text="ATTENDANCE & SAFETY"
              style={{ color: '#8E8E93', fontSize: 10, fontWeight: '800', letterSpacing: 0.8 }}
            />
            <TextWidget
              text="University Overall Standing"
              style={{ color: '#FFFFFF', fontSize: 20, fontWeight: '800', letterSpacing: -0.3, marginTop: 2 }}
            />
          </FlexWidget>

          {renderVerticalStackIndicator(1, totalCards)}
        </FlexWidget>

        {/* Top Hero Section */}
        <FlexWidget
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: 'match_parent',
            marginVertical: 4,
          }}
        >
          <FlexWidget style={{ flexDirection: 'column', flex: 1 }}>
            <TextWidget
              text={`${attPct}%`}
              style={{
                color: isSafe ? '#30D158' : '#FF453A',
                fontSize: attPctSize,
                fontWeight: '900',
                letterSpacing: -1,
              }}
            />
            <TextWidget
              text={isSafe ? `75% Target Threshold: +${targetDiff}% Margin` : `75% Target Threshold: -${Math.abs(Number(targetDiff))}% Deficit`}
              style={{ color: '#8E8E93', fontSize: attLabelSize, fontWeight: '600', marginTop: 2 }}
            />
          </FlexWidget>

          <FlexWidget
            style={{
              backgroundColor: isSafe ? 'rgba(48, 209, 88, 0.15)' : 'rgba(255, 69, 58, 0.15)',
              borderWidth: 1.5,
              borderColor: isSafe ? '#30D158' : '#FF453A',
              borderRadius: 18,
              paddingHorizontal: bunkPadH,
              paddingVertical: bunkPadV,
              alignItems: 'flex-start',
              justifyContent: 'center',
            }}
          >
            <TextWidget
              text={isSafe ? `+${bunkResult.margin} CLASSES` : `NEED ${bunkResult.margin || 1} CLASSES`}
              style={{
                color: isSafe ? '#30D158' : '#FF453A',
                fontSize: bunkTitleSize,
                fontWeight: '900',
                letterSpacing: -0.3,
              }}
            />
            <TextWidget
              text={isSafe ? 'Safe to miss without dropping below 75%' : 'Must attend consecutively to reach 75%'}
              style={{ color: isSafe ? '#30D158' : '#FF453A', fontSize: bunkSubSize, fontWeight: '600', marginTop: 2 }}
            />
          </FlexWidget>
        </FlexWidget>

        {/* Progress Bar */}
        <FlexWidget style={{ flexDirection: 'column', width: 'match_parent', marginVertical: 3 }}>
          <FlexWidget style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: 'match_parent', marginBottom: 4 }}>
            <TextWidget
              text="ATTENDANCE PROGRESS"
              style={{ color: '#8E8E93', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 }}
            />
            <TextWidget
              text={`${attended} / ${total} Classes`}
              style={{ color: '#FFFFFF', fontSize: 10.5, fontWeight: '700' }}
            />
          </FlexWidget>

          {/* Progress Bar Track with 75% Target Marker */}
          <FlexWidget
            style={{
              height: 14,
              width: 'match_parent',
              backgroundColor: '#2C2C2E',
              borderRadius: 7,
              flexDirection: 'row',
              alignItems: 'center',
              overflow: 'hidden',
            }}
          >
            {attPct >= 75 ? (
              <>
                <FlexWidget
                  style={{
                    height: 14,
                    flex: 75,
                    backgroundColor: '#30D158',
                  }}
                />
                <FlexWidget
                  style={{
                    height: 14,
                    width: 2.5,
                    backgroundColor: '#FFFFFF',
                  }}
                />
                <FlexWidget
                  style={{
                    height: 14,
                    flex: Math.max(0.1, attPct - 75),
                    backgroundColor: '#30D158',
                  }}
                />
                <FlexWidget
                  style={{
                    height: 14,
                    flex: Math.max(0.1, 100 - attPct),
                    backgroundColor: '#2C2C2E',
                  }}
                />
              </>
            ) : (
              <>
                <FlexWidget
                  style={{
                    height: 14,
                    flex: Math.max(0.1, attPct),
                    backgroundColor: '#FF453A',
                  }}
                />
                <FlexWidget
                  style={{
                    height: 14,
                    flex: Math.max(0.1, 75 - attPct),
                    backgroundColor: '#2C2C2E',
                  }}
                />
                <FlexWidget
                  style={{
                    height: 14,
                    width: 2.5,
                    backgroundColor: '#FFFFFF',
                  }}
                />
                <FlexWidget
                  style={{
                    height: 14,
                    flex: 25,
                    backgroundColor: '#2C2C2E',
                  }}
                />
              </>
            )}
          </FlexWidget>
        </FlexWidget>

        {/* 3 Subject Cards */}
        <FlexWidget style={{ flexDirection: 'row', width: 'match_parent', justifyContent: 'space-between', marginTop: isCompactHeight ? 2 : 4 }}>
          {subList.map((sub, idx) => (
            <FlexWidget
              key={sub.subjectCode}
              style={{
                backgroundColor: '#2C2C2E',
                borderRadius: 14,
                borderWidth: 1,
                borderColor: '#38383A',
                paddingHorizontal: cardPadH,
                paddingVertical: cardPadV,
                flex: 1,
                marginRight: idx < 2 ? 6 : 0,
                justifyContent: 'space-between',
              }}
            >
              <TextWidget
                text={sub.subjectCode}
                style={{ color: '#FFFFFF', fontSize: cardSubjSize, fontWeight: '800' }}
              />
              <FlexWidget style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 2 }}>
                <TextWidget
                  text={`${sub.percentage}%`}
                  style={{ color: sub.color, fontSize: cardPctSize, fontWeight: '900', letterSpacing: -0.3 }}
                />
                <TextWidget
                  text={sub.marginText}
                  style={{ color: sub.color, fontSize: cardMarginSize, fontWeight: '800' }}
                />
              </FlexWidget>
            </FlexWidget>
          ))}
        </FlexWidget>
      </FlexWidget>
    );
  }

  // ═════════════════════════════════════════════════════════════════════════
  // 3. STACK CARD 2: ACADEMIC OVERVIEW (EXACT CLONE OF USER IMAGE 1)
  // ═════════════════════════════════════════════════════════════════════════
  if (activeStackIndex === 2) {
    const cgpa = data?.cgpa || '8.42';
    const termGpa = data?.termGpa || '8.60';
    const credits = data?.creditsCompleted || '36';

    return (
      <FlexWidget
        style={{
          height: 'match_parent',
          width: 'match_parent',
          backgroundColor: '#1C1C1E',
          borderRadius: 24,
          borderWidth: 1.5,
          borderColor: '#2C2C2E',
          paddingHorizontal: rootPadH,
          paddingVertical: rootPadV,
          justifyContent: isCompactHeight ? 'flex-start' : 'space-between',
        }}
      >
        {/* Header */}
        <FlexWidget style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', width: 'match_parent', marginBottom: isCompactHeight ? 4 : 8 }}>
          <FlexWidget style={{ flexDirection: 'column' }}>
            <TextWidget
              text="ACADEMIC OVERVIEW"
              style={{ color: '#8E8E93', fontSize: 10, fontWeight: '800', letterSpacing: 0.8 }}
            />
            <TextWidget
              text="Student Portal Glance"
              style={{ color: '#FFFFFF', fontSize: isCompactHeight ? 16 : 20, fontWeight: '800', letterSpacing: -0.3, marginTop: 2 }}
            />
          </FlexWidget>

          {renderVerticalStackIndicator(2, totalCards)}
        </FlexWidget>

        {/* 3 Modular Tiles */}
        <FlexWidget style={{ flexDirection: 'row', width: 'match_parent', flex: 1, justifyContent: 'space-between' }}>
          {/* Tile 1: CGPA */}
          <FlexWidget
            style={{
              backgroundColor: '#2C2C2E',
              borderRadius: 14,
              borderWidth: 1,
              borderColor: '#38383A',
              paddingHorizontal: tilePadH,
              paddingVertical: tilePadV,
              flex: 1,
              marginRight: isCompactHeight ? 3 : 5,
              justifyContent: 'space-between',
            }}
            clickAction="OPEN_URI"
            clickActionData={{ uri: 'alms://(tabs)/results' }}
          >
            <FlexWidget style={{ flexDirection: 'column' }}>
              <TextWidget
                text="CUMULATIVE GPA"
                maxLines={1}
                truncate="END"
                style={{ color: '#8E8E93', fontSize: isCompactHeight ? 7.5 : 9, fontWeight: '800', letterSpacing: 0.2 }}
              />
              <TextWidget
                text={cgpa}
                maxLines={1}
                style={{ color: '#BF5AF2', fontSize: cgpaHeroSize, fontWeight: '900', letterSpacing: -0.5, marginVertical: 1 }}
              />
              <TextWidget
                text={`Term GPA: ${termGpa}`}
                maxLines={1}
                truncate="END"
                style={{ color: '#FFFFFF', fontSize: cgpaTermSize, fontWeight: '700', marginBottom: 1 }}
              />
              <TextWidget
                text={`${credits} Credits Completed`}
                maxLines={1}
                truncate="END"
                style={{ color: '#8E8E93', fontSize: cgpaCreditSize, fontWeight: '500' }}
              />
            </FlexWidget>

            <FlexWidget
              style={{
                backgroundColor: '#3A3A3C',
                borderRadius: 10,
                paddingVertical: tileBtnPadV,
                paddingHorizontal: 4,
                alignItems: 'center',
                justifyContent: 'center',
                width: 'match_parent',
                marginTop: 3,
              }}
            >
              <TextWidget
                text="View Grade Details ›"
                maxLines={1}
                truncate="END"
                style={{ color: '#BF5AF2', fontSize: tileBtnFontSize, fontWeight: '800' }}
              />
            </FlexWidget>
          </FlexWidget>

          {/* Tile 2: Attendance */}
          <FlexWidget
            style={{
              backgroundColor: '#2C2C2E',
              borderRadius: 14,
              borderWidth: 1,
              borderColor: '#38383A',
              paddingHorizontal: tilePadH,
              paddingVertical: tilePadV,
              flex: 1,
              marginHorizontal: isCompactHeight ? 3 : 5,
              justifyContent: 'space-between',
            }}
            clickAction="OPEN_URI"
            clickActionData={{ uri: 'alms://(tabs)/attendance' }}
          >
            <FlexWidget style={{ flexDirection: 'column' }}>
              <TextWidget
                text="OVERALL ATTENDANCE"
                maxLines={1}
                truncate="END"
                style={{ color: '#8E8E93', fontSize: isCompactHeight ? 7.5 : 9, fontWeight: '800', letterSpacing: 0.2 }}
              />
              <TextWidget
                text={`${attPct}%`}
                maxLines={1}
                style={{
                  color: isSafe ? '#30D158' : '#FF453A',
                  fontSize: cgpaHeroSize,
                  fontWeight: '900',
                  letterSpacing: -0.5,
                  marginVertical: 1,
                }}
              />
              <TextWidget
                text={bunkResult.label}
                maxLines={1}
                truncate="END"
                style={{ color: bunkResult.color, fontSize: cgpaTermSize, fontWeight: '800', marginBottom: 1 }}
              />
              <TextWidget
                text={`${attended} / ${total} Classes`}
                maxLines={1}
                truncate="END"
                style={{ color: '#8E8E93', fontSize: cgpaCreditSize, fontWeight: '500' }}
              />
            </FlexWidget>

            <FlexWidget
              style={{
                backgroundColor: isSafe ? 'rgba(48, 209, 88, 0.15)' : 'rgba(255, 69, 58, 0.15)',
                borderWidth: 1,
                borderColor: isSafe ? '#30D158' : '#FF453A',
                borderRadius: 10,
                paddingVertical: tileBtnPadV,
                paddingHorizontal: 4,
                alignItems: 'center',
                justifyContent: 'center',
                width: 'match_parent',
                marginTop: 3,
              }}
            >
              <TextWidget
                text={isSafe ? `✓ Safe (+${targetDiff}%)` : `⚠️ Need (${Math.abs(Number(targetDiff))}%)`}
                maxLines={1}
                truncate="END"
                style={{ color: isSafe ? '#30D158' : '#FF453A', fontSize: tileBtnFontSize, fontWeight: '800' }}
              />
            </FlexWidget>
          </FlexWidget>

          {/* Tile 3: Upcoming Class */}
          <FlexWidget
            style={{
              backgroundColor: '#2C2C2E',
              borderRadius: 14,
              borderWidth: 1,
              borderColor: '#38383A',
              paddingHorizontal: tilePadH,
              paddingVertical: tilePadV,
              flex: 1,
              marginLeft: isCompactHeight ? 3 : 5,
              justifyContent: 'space-between',
            }}
            clickAction="OPEN_URI"
            clickActionData={{ uri: 'alms://timetable' }}
          >
            <FlexWidget style={{ flexDirection: 'column' }}>
              <TextWidget
                text="UPCOMING CLASS"
                maxLines={1}
                truncate="END"
                style={{ color: '#8E8E93', fontSize: isCompactHeight ? 7.5 : 9, fontWeight: '800', letterSpacing: 0.2 }}
              />
              <TextWidget
                text={tileRoomCode}
                maxLines={1}
                truncate="END"
                style={{
                  color: '#0A84FF',
                  fontSize: cgpaHeroSize,
                  fontWeight: '900',
                  letterSpacing: -0.5,
                  marginVertical: 1,
                }}
              />
              <TextWidget
                text={`${timeDisplay.split('–')[0].split('-')[0].trim()} • ${courseCode}`}
                maxLines={1}
                truncate="END"
                style={{ color: '#FFFFFF', fontSize: cgpaTermSize, fontWeight: '700', marginBottom: 1 }}
              />
              <TextWidget
                text={`${decodedRoom.block} • ${decodedRoom.floor}`}
                maxLines={1}
                truncate="END"
                style={{ color: '#64D2FF', fontSize: cgpaCreditSize, fontWeight: '600' }}
              />
            </FlexWidget>

            <FlexWidget
              style={{
                backgroundColor: '#3A3A3C',
                borderRadius: 10,
                paddingVertical: tileBtnPadV,
                paddingHorizontal: 4,
                alignItems: 'center',
                justifyContent: 'center',
                width: 'match_parent',
                marginTop: 3,
              }}
            >
              <TextWidget
                text="Open Timetable ›"
                maxLines={1}
                truncate="END"
                style={{ color: '#0A84FF', fontSize: tileBtnFontSize, fontWeight: '800' }}
              />
            </FlexWidget>
          </FlexWidget>
        </FlexWidget>
      </FlexWidget>
    );
  }

  // ═════════════════════════════════════════════════════════════════════════
  // 4. STACK CARD 3: UPCOMING EXAM COUNTDOWN (When relevant)
  // ═════════════════════════════════════════════════════════════════════════
  if (activeStackIndex === 3 && hasUpcomingExam && data?.upcomingExam) {
    const exam = data.upcomingExam;
    const isUrgent = exam.daysRemaining <= 3;
    const examColor = isUrgent ? '#FF453A' : '#FF9F0A';

    return (
      <FlexWidget
        style={{
          height: 'match_parent',
          width: 'match_parent',
          backgroundColor: '#1C1C1E',
          borderRadius: 24,
          borderWidth: 1.5,
          borderColor: '#2C2C2E',
          paddingHorizontal: rootPadH,
          paddingVertical: rootPadV,
          justifyContent: isCompactHeight ? 'flex-start' : 'space-between',
        }}
        clickAction="OPEN_URI"
        clickActionData={{ uri: 'alms://exams' }}
      >
        <FlexWidget style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: 'match_parent' }}>
          <FlexWidget
            style={{
              backgroundColor: isUrgent ? 'rgba(255, 69, 58, 0.15)' : 'rgba(255, 159, 10, 0.15)',
              borderRadius: 14,
              paddingHorizontal: 9,
              paddingVertical: 4.5,
              borderWidth: 1,
              borderColor: examColor,
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <TextWidget
              text={`⏳ ${exam.type.toUpperCase()} IN ${exam.daysRemaining} DAYS`}
              style={{ color: examColor, fontSize: 10, fontWeight: '900', letterSpacing: 0.5 }}
            />
          </FlexWidget>

          {renderVerticalStackIndicator(3, totalCards)}
        </FlexWidget>

        <FlexWidget style={{ marginVertical: isCompactHeight ? 2 : 4 }}>
          <TextWidget
            text={exam.courseCode || exam.subjectCode || 'EXAM'}
            style={{ color: '#FFFFFF', fontSize: examCodeSize, fontWeight: '900', letterSpacing: -0.5 }}
          />
          <TextWidget
            text={formatAppleTitle(exam.courseTitle || exam.subject || 'University Examination')}
            maxLines={1}
            truncate="END"
            style={{ color: '#8E8E93', fontSize: examTitleSize, fontWeight: '600', marginTop: 2 }}
          />
          <TextWidget
            text={`📅 ${exam.date} • ${exam.time} • Room ${exam.room || 'TBA'}${exam.seatNo ? ` (Seat ${exam.seatNo})` : ''}`}
            style={{ color: '#64D2FF', fontSize: examDateSize, fontWeight: '700', marginTop: 2 }}
          />
        </FlexWidget>

        <FlexWidget
          style={{
            backgroundColor: '#2C2C2E',
            borderRadius: 14,
            paddingHorizontal: 12,
            paddingVertical: examBarPadV,
            width: 'match_parent',
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <TextWidget
            text="Tap to view complete date sheet & seating"
            style={{ color: '#8E8E93', fontSize: 10, fontWeight: '600' }}
          />
          <TextWidget text="Exams ›" style={{ color: '#0A84FF', fontSize: 10.5, fontWeight: '800' }} />
        </FlexWidget>
      </FlexWidget>
    );
  }

  // ═════════════════════════════════════════════════════════════════════════
  // 5. STACK CARD 0: NEXT CLASS / IN SESSION (EXACT CLONE OF USER IMAGE 3)
  // Flagship Presentation
  // ═════════════════════════════════════════════════════════════════════════
  const statusLabel = isOngoing ? 'LIVE NOW' : (isTomorrow ? 'TOMORROW' : 'NEXT CLASS');

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: '#1C1C1E',
        borderRadius: 24,
        borderWidth: 1.5,
        borderColor: '#2C2C2E',
        paddingHorizontal: rootPadH,
        paddingVertical: rootPadV,
        justifyContent: isCompactHeight ? 'flex-start' : 'space-between',
      }}
    >
      {/* ── TOP HEADER ROW ── */}
      <FlexWidget
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: 'match_parent',
          marginBottom: isCompactHeight ? 2 : 0,
        }}
      >
        {/* Left: Status Pill + Course Info */}
        <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <FlexWidget
            style={{
              backgroundColor: 'rgba(48, 209, 88, 0.15)',
              borderRadius: 16,
              paddingHorizontal: 10,
              paddingVertical: 4.5,
              borderWidth: 1,
              borderColor: '#30D158',
              flexDirection: 'row',
              alignItems: 'center',
            }}
            clickAction="REFRESH_WIDGET"
          >
            <FlexWidget
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: '#30D158',
                marginRight: 6,
              }}
            />
            <TextWidget
              text={statusLabel}
              style={{
                color: '#30D158',
                fontSize: 10,
                fontWeight: '900',
                letterSpacing: 0.5,
              }}
            />
          </FlexWidget>

          <FlexWidget style={{ flex: 1, marginLeft: 10 }}>
            <TextWidget
              text={`${courseCode} • ${subjectTitle}`}
              maxLines={1}
              truncate="END"
              style={{
                color: '#FFFFFF',
                fontSize: 13.5,
                fontWeight: '800',
              }}
            />
          </FlexWidget>
        </FlexWidget>

        {/* Right: Vertical Indicator Dots */}
        {renderVerticalStackIndicator(0, totalCards)}
      </FlexWidget>

      {/* ── MIDDLE HERO: TIME RANGE & DECODED LOCATION ── */}
      <FlexWidget
        style={{ flexDirection: 'column', width: 'match_parent', marginTop: isCompactHeight ? 1 : 2, marginBottom: heroMarginB }}
        clickAction="OPEN_URI"
        clickActionData={{ uri: 'alms://timetable' }}
      >
        <TextWidget
          text={timeDisplay}
          style={{
            color: '#FFFFFF',
            fontSize: heroTimeSize,
            fontWeight: '900',
            letterSpacing: -0.5,
          }}
        />
        <TextWidget
          text={`${decodedRoom.block} • ${decodedRoom.floor}`}
          style={{
            color: '#64D2FF',
            fontSize: heroLocSize,
            fontWeight: '600',
            marginTop: 1,
          }}
        />
      </FlexWidget>

      {/* ── PILLS ROW ── */}
      <FlexWidget
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          width: 'match_parent',
          marginBottom: pillsMarginB,
        }}
      >
        {/* Pill 1: Room */}
        <FlexWidget
          style={{
            backgroundColor: '#2C2C2E',
            borderWidth: 1,
            borderColor: '#38383A',
            borderRadius: 10,
            paddingHorizontal: pillPadH,
            paddingVertical: pillPadV,
            marginRight: 6,
          }}
          clickAction="OPEN_URI"
          clickActionData={{ uri: 'alms://timetable' }}
        >
          <TextWidget
            text={`Room ${tileRoomCode}`}
            maxLines={1}
            truncate="END"
            style={{ color: '#FFFFFF', fontSize: pillFontSize, fontWeight: '700' }}
          />
        </FlexWidget>

        {/* Pill 2: Bunk Margin */}
        <FlexWidget
          style={{
            backgroundColor: 'rgba(48, 209, 88, 0.15)',
            borderWidth: 1,
            borderColor: '#30D158',
            borderRadius: 10,
            paddingHorizontal: pillPadH,
            paddingVertical: pillPadV,
            marginRight: 6,
          }}
          clickAction="OPEN_URI"
          clickActionData={{ uri: 'alms://(tabs)/attendance' }}
        >
          <TextWidget
            text={bunkResult.label.startsWith('+') ? `✓ ${bunkResult.label}` : bunkResult.label}
            maxLines={1}
            truncate="END"
            style={{ color: '#30D158', fontSize: pillFontSize, fontWeight: '800' }}
          />
        </FlexWidget>

        {/* Pill 3: Time Remaining */}
        <FlexWidget
          style={{
            backgroundColor: 'rgba(10, 132, 255, 0.15)',
            borderWidth: 1,
            borderColor: '#0A84FF',
            borderRadius: 10,
            paddingHorizontal: pillPadH,
            paddingVertical: pillPadV,
          }}
        >
          <TextWidget
            text={`⏳ ${timeRemaining} Left`}
            maxLines={1}
            truncate="END"
            style={{ color: '#0A84FF', fontSize: pillFontSize, fontWeight: '800' }}
          />
        </FlexWidget>
      </FlexWidget>

      {/* ── BOTTOM CARD: UP NEXT SECTION ── */}
      <FlexWidget
        style={{
          backgroundColor: '#2C2C2E',
          borderWidth: 1,
          borderColor: '#38383A',
          borderRadius: 14,
          paddingHorizontal: upNextPadH,
          paddingVertical: upNextPadV,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: 'match_parent',
        }}
      >
        {/* Left Column */}
        <FlexWidget style={{ flexDirection: 'column', flex: 1, marginRight: isCompactHeight ? 6 : 8 }}>
          <TextWidget
            text={`UP NEXT AT ${upNext.startTime || '10:00 AM'}`}
            style={{
              color: '#8E8E93',
              fontSize: isCompactHeight ? 8.5 : 9.5,
              fontWeight: '800',
              letterSpacing: 0.5,
            }}
          />
          <TextWidget
            text={`${upNext.subjectCode} • ${upNext.subject}`}
            maxLines={1}
            truncate="END"
            style={{
              color: '#FFFFFF',
              fontSize: upNextSubjSize,
              fontWeight: '800',
              marginTop: 1,
            }}
          />
          <TextWidget
            text={`${upNext.block} • Room ${upNext.room} • ${upNext.attendanceSafeText}`}
            maxLines={1}
            truncate="END"
            style={{
              color: '#8E8E93',
              fontSize: upNextDetailSize,
              fontWeight: '500',
              marginTop: 1,
            }}
          />
        </FlexWidget>

        {/* Right Button */}
        <FlexWidget
          style={{
            backgroundColor: '#3A3A3C',
            borderRadius: 10,
            paddingHorizontal: btnPadH,
            paddingVertical: btnPadV,
            alignItems: 'center',
            justifyContent: 'center',
          }}
          clickAction="OPEN_URI"
          clickActionData={{ uri: 'alms://timetable' }}
        >
          <TextWidget
            text="Timetable ›"
            maxLines={1}
            truncate="END"
            style={{ color: '#0A84FF', fontSize: btnFontSize, fontWeight: '800' }}
          />
        </FlexWidget>
      </FlexWidget>
    </FlexWidget>
  );
}
