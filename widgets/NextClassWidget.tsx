import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import type { WidgetInfo, ColorProp } from 'react-native-android-widget';

export interface ScheduleItem {
  time: string;
  subject: string;
  subjectCode: string;
  room: string;
  type: string;
  isPast?: boolean;
  isOngoing?: boolean;
  isUpcoming?: boolean;
}

export interface NextClassWidgetData {
  status: 'ongoing' | 'upcoming' | 'tomorrow' | 'no_classes';
  statusText: string;
  time: string;
  subject: string;
  room: string;
  type: string;
  subjectCode: string;
  teacher?: string;

  // Real-time Today metrics & time left
  todayTotalClasses?: number;
  todayCompletedClasses?: number;
  todayRemainingClasses?: number;
  currentClassIndex?: number;
  timeUntilOrLeft?: string;
  activeClassEndTime?: string;
  nextClassStartTime?: string;

  // Stack, pagination & detail enhancements
  stackIndex?: number; // 0: Next Class, 1: Schedule, 2: Attendance
  schedulePage?: number; // pagination for today's schedule
  todaySchedule?: ScheduleItem[];
  overallAttendance?: number;
  attendedClasses?: number;
  totalClasses?: number;
  cgpa?: string;
}

// Format all-caps subject names into clean Title Case (matching the in-app formatSubjectTitle)
function formatTitle(raw: string): string {
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

// ── INTELLIGENT AUTO-RESIZING LAYOUT ENGINE ──
// Detects smartphone screen ratios, launcher cell widths/heights, and 5x6 / 4x5 grids
export function getWidgetLayoutConfig(
  rawWidth?: number,
  rawHeight?: number,
  screenInfo?: WidgetInfo['screenInfo']
) {
  const screenW = screenInfo?.screenWidthDp && screenInfo.screenWidthDp > 0 ? screenInfo.screenWidthDp : 380;
  const screenH = screenInfo?.screenHeightDp && screenInfo.screenHeightDp > 0 ? screenInfo.screenHeightDp : 800;

  const hasValidDims = Boolean(rawWidth && rawWidth > 0 && rawHeight && rawHeight > 0);
  // Default to standard 4x2 card dimensions (320 x 150) if launcher hasn't supplied dimensions yet.
  const w = hasValidDims ? (rawWidth as number) : 320;
  const h = hasValidDims ? (rawHeight as number) : 150;

  const widthRatio = w / screenW;

  // 1. Ultra-compact 1-row height strip (e.g. 4x1 horizontal bar, or 2x1)
  const isMicro = h < 95;

  // 2. Small Box / 2x2 detection:
  // ONLY true when width is truly narrow (<= 215dp) OR occupies <= 50% screen width
  const isSmallBox = !isMicro && hasValidDims && (w < 215 || widthRatio <= 0.52);

  // 3. Large multi-row expanded card (e.g. 4x3, 4x4, 5x4)
  const isLarge = !isMicro && !isSmallBox && h >= 210;

  // 4. Medium / 5-column standard (e.g. 4-cell on 5x6 grid, or 3x2)
  const isMedium = !isMicro && !isSmallBox && !isLarge && (w < 320 || h < 155);

  // 5. Full Standard 4x2 desktop card (w >= 320 && h >= 155)
  const isFull = !isMicro && !isSmallBox && !isLarge && !isMedium;

  return {
    w,
    h,
    isSmallBox,
    isMicro,
    isMedium,
    isFull,
    isLarge,
    padH: isSmallBox ? 10 : 13,
    padV: isSmallBox ? 8 : 11,
    borderRadius: isSmallBox ? 18 : 22,
    titleFontSize: isSmallBox ? 14 : (isMicro ? 13 : 18),
    badgeFontSize: isSmallBox || isMicro ? 8.5 : 10.5,
    scheduleItemsCount: isSmallBox ? 2 : (isMicro ? 1 : (isLarge ? 4 : 3)),
  };
}

export function NextClassWidget({
  data,
  widgetInfo,
}: {
  data?: NextClassWidgetData;
  widgetInfo?: WidgetInfo;
}) {
  const cfg = getWidgetLayoutConfig(widgetInfo?.width, widgetInfo?.height, widgetInfo?.screenInfo);

  const stackIndex = ((data?.stackIndex ?? 0) % 3 + 3) % 3;
  const hasClasses = Boolean(data && data.status !== 'no_classes' && data.subject);

  // Status flags
  const isOngoing = data?.status === 'ongoing';
  const isTomorrow = data?.status === 'tomorrow';
  const isLab = Boolean(
    (data?.type || '').toLowerCase().includes('lab') ||
    (data?.type || '').toLowerCase().includes('practical')
  );

  // ── APP'S EXACT MODERN CARD PALETTE (Matching in-app modernNextClassCard) ──
  const cardBg: ColorProp = '#141722';
  const cardBorder: ColorProp = 'rgba(255, 255, 255, 0.09)';

  // Accent Colors matching the app
  const accentColor: ColorProp = isOngoing ? '#10B981' : (isTomorrow ? '#A855F7' : (isLab ? '#0EA5E9' : '#6366F1'));
  const statusBadgeBg: ColorProp = isOngoing ? 'rgba(16, 185, 129, 0.14)' : (isTomorrow ? 'rgba(168, 85, 247, 0.14)' : 'rgba(99, 102, 241, 0.14)');
  const statusBorderColor: ColorProp = isOngoing ? 'rgba(16, 185, 129, 0.28)' : (isTomorrow ? 'rgba(168, 85, 247, 0.28)' : 'rgba(99, 102, 241, 0.28)');

  // Formatted status pill text matching in-app header (e.g. "IN SESSION • 42m left")
  const statusPillText = isOngoing
    ? (data?.timeUntilOrLeft ? `IN SESSION • ${data.timeUntilOrLeft}` : 'IN SESSION')
    : (data?.timeUntilOrLeft ? `STARTS IN ${data.timeUntilOrLeft}` : (isTomorrow ? `TOMORROW • ${data?.time?.split('-')[0]?.trim() || ''}` : 'NEXT CLASS'));

  // Course Code
  const courseCode = data?.subjectCode || '';
  // Room
  const roomDisplay = data?.room && data.room !== 'TBA'
    ? (data.room.toLowerCase().startsWith('room') ? data.room : `Room ${data.room}`)
    : 'Room TBA';
  // Time
  const timeDisplay = data?.time || '04:10-05:00 PM';
  // Type
  const classType = (data?.type || 'Lecture').toUpperCase();
  // Formatted Subject Title
  const subjectTitle = formatTitle(data?.subject || 'Class');

  // ── REUSABLE CARD SWITCHER CONTROLS [ ‹  1/3  › ] ──
  // Spacious, reliable touch targets with generous hitboxes that never get clipped on 5x6 grids
  const renderCardSwitcher = (activeIdx: number) => {
    return (
      <FlexWidget
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: 'rgba(255, 255, 255, 0.08)',
          borderRadius: 10,
          borderWidth: 1,
          borderColor: 'rgba(255, 255, 255, 0.12)',
        }}
      >
        {/* Previous Card Button */}
        <FlexWidget
          style={{
            paddingHorizontal: 8,
            paddingVertical: 4,
          }}
          clickAction="PREV_STACK"
        >
          <TextWidget
            text="‹"
            style={{
              color: '#FFFFFF',
              fontSize: 15,
              fontWeight: '900',
            }}
          />
        </FlexWidget>

        {/* Current / Total Stack Indicator (Tapping also cycles to next) */}
        <FlexWidget
          style={{
            paddingHorizontal: 3,
            paddingVertical: 4,
          }}
          clickAction="NEXT_STACK"
        >
          <TextWidget
            text={`${activeIdx + 1}/3`}
            style={{
              color: 'rgba(255, 255, 255, 0.85)',
              fontSize: 10.5,
              fontWeight: '800',
            }}
          />
        </FlexWidget>

        {/* Next Card Button */}
        <FlexWidget
          style={{
            paddingHorizontal: 8,
            paddingVertical: 4,
          }}
          clickAction="NEXT_STACK"
        >
          <TextWidget
            text="›"
            style={{
              color: '#FFFFFF',
              fontSize: 15,
              fontWeight: '900',
            }}
          />
        </FlexWidget>
      </FlexWidget>
    );
  };

  // ═════════════════════════════════════════════════════════════════════════
  // CARD 1: TODAY'S SCHEDULE (Matching in-app design language)
  // ═════════════════════════════════════════════════════════════════════════
  if (stackIndex === 1) {
    const schedule = data?.todaySchedule || [];
    const count = schedule.length;
    const pageSize = cfg.scheduleItemsCount;
    const totalPages = Math.max(1, Math.ceil(count / pageSize));
    const rawPage = data?.schedulePage ?? 0;
    const safePage = ((rawPage % totalPages) + totalPages) % totalPages;
    const visibleClasses = schedule.slice(safePage * pageSize, (safePage + 1) * pageSize);

    return (
      <FlexWidget
        style={{
          height: 'match_parent',
          width: 'match_parent',
          backgroundColor: cardBg,
          borderRadius: cfg.borderRadius,
          borderWidth: 1.2,
          borderColor: cardBorder,
          paddingHorizontal: cfg.padH,
          paddingVertical: cfg.padV,
          justifyContent: 'space-between',
        }}
      >
        {/* Header Row: Status Pill on Left, Top Right Pill on Right */}
        <FlexWidget
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: 'match_parent',
            marginBottom: 6,
          }}
        >
          {/* Status Pill matching the app */}
          <FlexWidget
            style={{
              backgroundColor: 'rgba(56, 189, 248, 0.14)',
              borderRadius: 20,
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderWidth: 1,
              borderColor: 'rgba(56, 189, 248, 0.28)',
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
                backgroundColor: '#38BDF8',
                marginRight: 6,
              }}
            />
            <TextWidget
              text={`TODAY • ${count} ${count === 1 ? 'CLASS' : 'CLASSES'}`}
              maxLines={1}
              style={{
                color: '#38BDF8',
                fontSize: cfg.badgeFontSize,
                fontWeight: '800',
                letterSpacing: 0.3,
              }}
            />
          </FlexWidget>

          {/* Top Right Schedule Pill (Tapping also cycles stack) */}
          <FlexWidget
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              borderRadius: 12,
              paddingHorizontal: 9,
              paddingVertical: 5,
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.12)',
              flexDirection: 'row',
              alignItems: 'center',
            }}
            clickAction="NEXT_STACK"
          >
            <TextWidget
              text="📅 Schedule"
              style={{
                color: '#FFFFFF',
                fontSize: 11,
                fontWeight: '700',
                letterSpacing: 0.2,
              }}
            />
          </FlexWidget>
        </FlexWidget>

        {/* Schedule Items List */}
        {count === 0 ? (
          <FlexWidget
            style={{ alignItems: 'center', justifyContent: 'center', flex: 1 }}
            clickAction="OPEN_APP"
          >
            <TextWidget
              text="No classes today ✓"
              style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: 13, fontWeight: '700' }}
            />
          </FlexWidget>
        ) : (
          <FlexWidget style={{ width: 'match_parent', flexDirection: 'column', flex: 1, justifyContent: 'center' }}>
            {visibleClasses.map((item, idx) => (
              <FlexWidget
                key={idx}
                style={{
                  width: 'match_parent',
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: item.isOngoing ? 'rgba(16, 185, 129, 0.14)' : 'rgba(255, 255, 255, 0.05)',
                  borderRadius: 10,
                  paddingHorizontal: 8,
                  paddingVertical: cfg.isSmallBox ? 3 : 5,
                  borderWidth: 1,
                  borderColor: item.isOngoing ? '#10B981' : 'rgba(255, 255, 255, 0.08)',
                  marginBottom: cfg.isSmallBox ? 3 : 4,
                }}
                clickAction="OPEN_APP"
              >
                {/* Time Chip */}
                <TextWidget
                  text={item.time.split('-')[0].trim()}
                  style={{
                    color: item.isOngoing ? '#10B981' : '#E2E8F0',
                    fontSize: cfg.isSmallBox ? 9.5 : 10.5,
                    fontWeight: '800',
                    width: cfg.isSmallBox ? 52 : 62,
                  }}
                />

                {/* Subject Title */}
                <FlexWidget style={{ flex: 1, marginHorizontal: 4 }}>
                  <TextWidget
                    text={cfg.isSmallBox ? (item.subjectCode || item.subject) : item.subject}
                    maxLines={1}
                    truncate="END"
                    style={{
                      color: '#FFFFFF',
                      fontSize: cfg.isSmallBox ? 10 : 11.5,
                      fontWeight: '700',
                    }}
                  />
                </FlexWidget>

                {/* Room */}
                <TextWidget
                  text={item.room ? item.room.replace(/^Room\s*/i, '') : 'TBA'}
                  style={{
                    color: 'rgba(255, 255, 255, 0.8)',
                    fontSize: cfg.isSmallBox ? 9 : 10,
                    fontWeight: '700',
                  }}
                />
              </FlexWidget>
            ))}
          </FlexWidget>
        )}

        {/* Footer Row: Pagination on Left, Card Switcher [ ‹  2/3  › ] on Right */}
        <FlexWidget
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: 'match_parent',
            marginTop: 4,
          }}
        >
          {/* Left Pagination Info */}
          <FlexWidget style={{ flexDirection: 'row', alignItems: 'center' }}>
            <FlexWidget clickAction="OPEN_APP" style={{ marginRight: 6 }}>
              <TextWidget
                text={count > pageSize
                  ? `Showing ${safePage * pageSize + 1}-${Math.min((safePage + 1) * pageSize, count)} of ${count}`
                  : `${count} total today`}
                style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: 9.5, fontWeight: '600' }}
              />
            </FlexWidget>

            {totalPages > 1 ? (
              <FlexWidget style={{ flexDirection: 'row', alignItems: 'center' }}>
                <FlexWidget
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: 8,
                    paddingHorizontal: 7,
                    paddingVertical: 3,
                    marginRight: 4,
                  }}
                  clickAction="PREV_SCHEDULE_PAGE"
                >
                  <TextWidget
                    text="▲"
                    style={{ color: '#38BDF8', fontSize: 9, fontWeight: 'bold' }}
                  />
                </FlexWidget>

                <FlexWidget
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: 8,
                    paddingHorizontal: 7,
                    paddingVertical: 3,
                  }}
                  clickAction="NEXT_SCHEDULE_PAGE"
                >
                  <TextWidget
                    text="▼"
                    style={{ color: '#38BDF8', fontSize: 9, fontWeight: 'bold' }}
                  />
                </FlexWidget>
              </FlexWidget>
            ) : null}
          </FlexWidget>

          {/* Right: Card Switcher [ ‹  2/3  › ] */}
          {renderCardSwitcher(1)}
        </FlexWidget>
      </FlexWidget>
    );
  }

  // ═════════════════════════════════════════════════════════════════════════
  // CARD 2: ATTENDANCE & STATS (Matching in-app design language)
  // ═════════════════════════════════════════════════════════════════════════
  if (stackIndex === 2) {
    const total = data?.totalClasses ?? 0;
    const attended = data?.attendedClasses ?? 0;
    const attPct = data?.overallAttendance ?? 0;
    const cgpa = data?.cgpa || '--';

    const isSafe = attPct >= 80;
    const isWarning = attPct >= 75 && attPct < 80;
    const attColor: ColorProp = isSafe ? '#10B981' : (isWarning ? '#F59E0B' : '#EF4444');
    const attBgPill: ColorProp = isSafe ? 'rgba(16, 185, 129, 0.14)' : (isWarning ? 'rgba(245, 158, 11, 0.14)' : 'rgba(239, 68, 68, 0.14)');
    const attBorderPill: ColorProp = isSafe ? 'rgba(16, 185, 129, 0.28)' : (isWarning ? 'rgba(245, 158, 11, 0.28)' : 'rgba(239, 68, 68, 0.28)');

    return (
      <FlexWidget
        style={{
          height: 'match_parent',
          width: 'match_parent',
          backgroundColor: cardBg,
          borderRadius: cfg.borderRadius,
          borderWidth: 1.2,
          borderColor: cardBorder,
          paddingHorizontal: cfg.padH,
          paddingVertical: cfg.padV,
          justifyContent: 'space-between',
        }}
      >
        {/* Header Row: Status Pill on Left, Attended Chip on Right */}
        <FlexWidget
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: 'match_parent',
            marginBottom: 6,
          }}
        >
          {/* Status Pill */}
          <FlexWidget
            style={{
              backgroundColor: attBgPill,
              borderRadius: 20,
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderWidth: 1,
              borderColor: attBorderPill,
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
                backgroundColor: attColor,
                marginRight: 6,
              }}
            />
            <TextWidget
              text={isSafe ? `SAFE • ${attPct}%` : (isWarning ? `WARNING • ${attPct}%` : `CRITICAL • ${attPct}%`)}
              maxLines={1}
              style={{
                color: attColor,
                fontSize: cfg.badgeFontSize,
                fontWeight: '800',
                letterSpacing: 0.3,
              }}
            />
          </FlexWidget>

          {/* Top Right Attended Count Pill */}
          <FlexWidget
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              borderRadius: 12,
              paddingHorizontal: 9,
              paddingVertical: 5,
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.12)',
              flexDirection: 'row',
              alignItems: 'center',
            }}
            clickAction="NEXT_STACK"
          >
            <TextWidget
              text={`📚 ${attended}/${total}`}
              style={{
                color: '#FFFFFF',
                fontSize: 11,
                fontWeight: '700',
                letterSpacing: 0.2,
              }}
            />
          </FlexWidget>
        </FlexWidget>

        {/* Middle Hero Attendance Content */}
        <FlexWidget
          style={{
            flexDirection: 'column',
            justifyContent: 'center',
            width: 'match_parent',
            flex: 1,
          }}
          clickAction="OPEN_APP"
        >
          <FlexWidget
            style={{
              flexDirection: 'row',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              width: 'match_parent',
              marginBottom: 4,
            }}
          >
            <FlexWidget style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
              <TextWidget
                text={`${attPct}%`}
                style={{
                  color: '#FFFFFF',
                  fontSize: cfg.isSmallBox ? 26 : 32,
                  fontWeight: '900',
                  letterSpacing: -1,
                }}
              />
              <TextWidget
                text=" ATTENDANCE"
                style={{
                  color: 'rgba(255, 255, 255, 0.55)',
                  fontSize: 10,
                  fontWeight: '800',
                  letterSpacing: 0.8,
                  marginLeft: 6,
                }}
              />
            </FlexWidget>

            <TextWidget
              text={`${attended}/${total} attended`}
              style={{
                color: 'rgba(255, 255, 255, 0.85)',
                fontSize: 11,
                fontWeight: '700',
              }}
            />
          </FlexWidget>

          {/* Progress Bar */}
          <FlexWidget
            style={{
              width: 'match_parent',
              height: 5,
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              borderRadius: 3,
              marginVertical: 4,
            }}
          >
            <FlexWidget
              style={{
                width: (Math.max(10, (cfg.w - cfg.padH * 2) * Math.min(100, Math.max(0, attPct)) / 100)) as any,
                height: 'match_parent',
                backgroundColor: attColor,
                borderRadius: 3,
              }}
            />
          </FlexWidget>
        </FlexWidget>

        {/* Bottom Details Chips Row: Status + CGPA on Left, Card Switcher [ ‹  3/3  › ] on Right */}
        <FlexWidget
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: 'match_parent',
            marginTop: 4,
          }}
        >
          {/* Left Details Chips Group */}
          <FlexWidget
            style={{
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <FlexWidget
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.06)',
                borderRadius: 10,
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.08)',
                marginRight: 6,
              }}
              clickAction="OPEN_APP"
            >
              <TextWidget
                text={isSafe ? 'Status: Safe ✓' : (isWarning ? 'Status: Warning ⚠️' : 'Status: Critical ⚠️')}
                style={{ color: attColor, fontSize: 10, fontWeight: '700' }}
              />
            </FlexWidget>

            {cgpa && cgpa !== '--' && !cfg.isSmallBox ? (
              <FlexWidget
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.06)',
                  borderRadius: 10,
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderWidth: 1,
                  borderColor: 'rgba(255, 255, 255, 0.08)',
                }}
                clickAction="OPEN_APP"
              >
                <TextWidget
                  text={`CGPA: ${cgpa}`}
                  style={{ color: '#A78BFA', fontSize: 10, fontWeight: '800' }}
                />
              </FlexWidget>
            ) : null}
          </FlexWidget>

          {/* Right: Card Switcher [ ‹  3/3  › ] */}
          {renderCardSwitcher(2)}
        </FlexWidget>
      </FlexWidget>
    );
  }

  // ═════════════════════════════════════════════════════════════════════════
  // NO CLASSES / ALL CAUGHT UP STATE (Card 0 when no classes)
  // ═════════════════════════════════════════════════════════════════════════
  if (!hasClasses) {
    return (
      <FlexWidget
        style={{
          height: 'match_parent',
          width: 'match_parent',
          backgroundColor: cardBg,
          borderRadius: cfg.borderRadius,
          borderWidth: 1.2,
          borderColor: cardBorder,
          paddingHorizontal: cfg.padH,
          paddingVertical: cfg.padV,
          justifyContent: 'space-between',
        }}
      >
        {/* Header Row */}
        <FlexWidget
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: 'match_parent',
          }}
        >
          <FlexWidget
            style={{
              backgroundColor: 'rgba(16, 185, 129, 0.14)',
              borderRadius: 20,
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderWidth: 1,
              borderColor: 'rgba(16, 185, 129, 0.28)',
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
                backgroundColor: '#10B981',
                marginRight: 6,
              }}
            />
            <TextWidget
              text="ALL CAUGHT UP ✓"
              style={{ color: '#10B981', fontSize: cfg.badgeFontSize, fontWeight: '800' }}
            />
          </FlexWidget>

          <FlexWidget
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              borderRadius: 12,
              paddingHorizontal: 9,
              paddingVertical: 5,
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.12)',
            }}
            clickAction="NEXT_STACK"
          >
            <TextWidget
              text="🕒 Free Time"
              style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '700' }}
            />
          </FlexWidget>
        </FlexWidget>

        {/* Center Content */}
        <FlexWidget
          style={{ alignItems: 'center', justifyContent: 'center', flex: 1, marginVertical: 4 }}
          clickAction="OPEN_APP"
        >
          <TextWidget
            text="No classes scheduled"
            style={{
              color: '#FFFFFF',
              fontSize: cfg.isSmallBox ? 13 : 17,
              fontWeight: '800',
              marginBottom: 2,
            }}
          />
          <TextWidget
            text="Enjoy your free time!"
            style={{ color: 'rgba(255, 255, 255, 0.65)', fontSize: 11 }}
          />
        </FlexWidget>

        {/* Bottom Row */}
        <FlexWidget
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: 'match_parent',
          }}
        >
          <FlexWidget clickAction="OPEN_APP">
            <TextWidget
              text="Tap to open ALMS"
              style={{ color: 'rgba(255, 255, 255, 0.45)', fontSize: 9.5 }}
            />
          </FlexWidget>

          {renderCardSwitcher(0)}
        </FlexWidget>
      </FlexWidget>
    );
  }

  // ═════════════════════════════════════════════════════════════════════════
  // CARD 0: NEXT CLASS / IN SESSION
  // EXACT CLONE OF IN-APP modernNextClassCard (IMAGE 1)
  // ═════════════════════════════════════════════════════════════════════════

  // ── 1. 2x2 COMPACT BOX (Strictly Course Code, Room, Time, Timer & Controls) ──
  if (cfg.isSmallBox) {
    return (
      <FlexWidget
        style={{
          height: 'match_parent',
          width: 'match_parent',
          backgroundColor: cardBg,
          borderRadius: cfg.borderRadius,
          borderWidth: 1.2,
          borderColor: cardBorder,
          paddingHorizontal: cfg.padH,
          paddingVertical: cfg.padV,
          justifyContent: 'space-between',
        }}
      >
        {/* Header Row: Status Pill on Left, Switcher on Right */}
        <FlexWidget
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: 'match_parent',
          }}
        >
          {/* Status Pill */}
          <FlexWidget
            style={{
              backgroundColor: statusBadgeBg,
              borderRadius: 20,
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderWidth: 1,
              borderColor: statusBorderColor,
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
                backgroundColor: accentColor,
                marginRight: 5,
              }}
            />
            <TextWidget
              text={isOngoing ? (data?.timeUntilOrLeft || 'LIVE') : (data?.timeUntilOrLeft ? `IN ${data.timeUntilOrLeft}` : 'NEXT')}
              maxLines={1}
              style={{
                color: accentColor,
                fontSize: 8.5,
                fontWeight: '900',
              }}
            />
          </FlexWidget>

          {/* Switcher [ ‹  1/3  › ] */}
          {renderCardSwitcher(0)}
        </FlexWidget>

        {/* Middle: Course Code + Type Badge */}
        <FlexWidget
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: 'match_parent',
            marginVertical: 2,
          }}
          clickAction="OPEN_APP"
        >
          <TextWidget
            text={courseCode || subjectTitle.slice(0, 7)}
            style={{
              color: '#FFFFFF',
              fontSize: 20,
              fontWeight: '900',
              letterSpacing: -0.5,
            }}
          />
          <FlexWidget
            style={{
              backgroundColor: statusBadgeBg,
              borderRadius: 6,
              paddingHorizontal: 6,
              paddingVertical: 2,
              borderWidth: 1,
              borderColor: statusBorderColor,
            }}
          >
            <TextWidget
              text={classType.slice(0, 3)}
              style={{
                color: accentColor,
                fontSize: 9,
                fontWeight: '900',
              }}
            />
          </FlexWidget>
        </FlexWidget>

        {/* Bottom Details Row: Room + Time */}
        <FlexWidget
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: 'match_parent',
          }}
        >
          {/* Room Chip */}
          <FlexWidget
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.06)',
              borderRadius: 8,
              paddingHorizontal: 6,
              paddingVertical: 3,
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.08)',
            }}
            clickAction="OPEN_APP"
          >
            <TextWidget
              text={roomDisplay.replace(/^Room\s*/i, '📍 ')}
              style={{ color: '#FFFFFF', fontSize: 9.5, fontWeight: '700' }}
            />
          </FlexWidget>

          {/* Time Chip */}
          <FlexWidget
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.06)',
              borderRadius: 8,
              paddingHorizontal: 6,
              paddingVertical: 3,
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.08)',
            }}
            clickAction="OPEN_APP"
          >
            <TextWidget
              text={`🕒 ${timeDisplay.split('-')[0].trim()}`}
              style={{ color: '#E2E8F0', fontSize: 9.5, fontWeight: '700' }}
            />
          </FlexWidget>
        </FlexWidget>
      </FlexWidget>
    );
  }

  // ── 2. STANDARD / 5x6 EXPANDED CARD (EXACT IN-APP DESIGN FROM IMAGE 1) ──
  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: cardBg,
        borderRadius: cfg.borderRadius,
        borderWidth: 1.2,
        borderColor: cardBorder,
        paddingHorizontal: cfg.padH,
        paddingVertical: cfg.padV,
        justifyContent: 'space-between',
      }}
    >
      {/* ── TOP STATUS & TIME ROW (Image 1 Header) ── */}
      <FlexWidget
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: 'match_parent',
        }}
      >
        {/* Modern Status Pill: [ ● IN SESSION • 42m left ] */}
        <FlexWidget
          style={{
            backgroundColor: statusBadgeBg,
            borderRadius: 20,
            paddingHorizontal: 10,
            paddingVertical: 5,
            borderWidth: 1,
            borderColor: statusBorderColor,
            flexDirection: 'row',
            alignItems: 'center',
          }}
          clickAction="REFRESH_WIDGET"
        >
          {/* Status Dot */}
          <FlexWidget
            style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: accentColor,
              marginRight: 6,
            }}
          />
          {/* Status Text */}
          <TextWidget
            text={statusPillText}
            maxLines={1}
            truncate="END"
            style={{
              color: accentColor,
              fontSize: cfg.badgeFontSize,
              fontWeight: '800',
              letterSpacing: 0.3,
            }}
          />
        </FlexWidget>

        {/* Prominent Time Chip (Image 1 Header Right: [ 🕒 04:10-05:00 PM ]) */}
        <FlexWidget
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
            borderRadius: 12,
            paddingHorizontal: 9,
            paddingVertical: 5,
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.12)',
            flexDirection: 'row',
            alignItems: 'center',
          }}
          clickAction="NEXT_STACK"
        >
          <TextWidget
            text={`🕒 ${timeDisplay}`}
            style={{
              color: '#FFFFFF',
              fontSize: 11,
              fontWeight: '700',
              letterSpacing: 0.2,
            }}
          />
        </FlexWidget>
      </FlexWidget>

      {/* ── SUBJECT TITLE (Image 1 Middle: Title-Cased, Clean, Crisp) ── */}
      <FlexWidget
        style={{
          width: 'match_parent',
          marginVertical: 4,
        }}
        clickAction="OPEN_APP"
      >
        <TextWidget
          text={subjectTitle}
          maxLines={cfg.isMedium ? 1 : 2}
          truncate="END"
          style={{
            color: '#FFFFFF',
            fontSize: cfg.titleFontSize,
            fontWeight: '800',
            lineHeight: cfg.titleFontSize + 4,
            letterSpacing: -0.2,
          }}
        />
      </FlexWidget>

      {/* ── BOTTOM DETAILS CHIPS ROW (Image 1 Bottom Row) ── */}
      <FlexWidget
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: 'match_parent',
        }}
      >
        {/* Left Chips Group */}
        <FlexWidget
          style={{
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          {/* Room Chip: [ 📍 Room 34-101 ] */}
          <FlexWidget
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.06)',
              borderRadius: 10,
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.08)',
              marginRight: 5,
            }}
            clickAction="OPEN_APP"
          >
            <TextWidget
              text={`📍 ${roomDisplay}`}
              style={{
                color: '#FFFFFF',
                fontSize: 10.5,
                fontWeight: '700',
              }}
            />
          </FlexWidget>

          {/* Course Code Chip: [ 🏷 PEA306 ] */}
          {courseCode ? (
            <FlexWidget
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.06)',
                borderRadius: 10,
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.08)',
                marginRight: 5,
              }}
              clickAction="OPEN_APP"
            >
              <TextWidget
                text={`🏷 ${courseCode}`}
                style={{
                  color: 'rgba(255, 255, 255, 0.75)',
                  fontSize: 10.5,
                  fontWeight: '700',
                }}
              />
            </FlexWidget>
          ) : null}

          {/* Class Type Badge: [ LECTURE ] */}
          <FlexWidget
            style={{
              backgroundColor: statusBadgeBg,
              borderRadius: 8,
              paddingHorizontal: 7,
              paddingVertical: 3,
              borderWidth: 1,
              borderColor: statusBorderColor,
            }}
            clickAction="OPEN_APP"
          >
            <TextWidget
              text={classType}
              style={{
                color: accentColor,
                fontSize: 9,
                fontWeight: '900',
                letterSpacing: 0.5,
              }}
            />
          </FlexWidget>
        </FlexWidget>

        {/* Far Right: Card Switcher [ ‹  1/3  › ] */}
        {renderCardSwitcher(0)}
      </FlexWidget>
    </FlexWidget>
  );
}
