import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import type { WidgetInfo, ColorProp } from 'react-native-android-widget';
import {
  ApplePalette,
  getAppleWidgetConfig,
  calculateBunkMargin,
  decodeLpuRoom,
  type ExamCountdownData,
  type WidgetLayoutConfig,
} from './theme';

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
  stackIndex?: number;
  schedulePage?: number;
  todaySchedule?: ScheduleItem[];
  overallAttendance?: number;
  attendedClasses?: number;
  totalClasses?: number;
  cgpa?: string;

  // Contextual Exam Countdown
  upcomingExam?: ExamCountdownData | null;
}

// Format all-caps subject names into clean Title Case with Apple-standard styling
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

// ── APPLE SMART STACK VERTICAL PAGE INDICATOR ──
// Inspired by iOS Smart Stack: clean vertical capsule dots along the right side
function renderSmartStackIndicator(
  activeIndex: number,
  totalCards: number,
  cfg: WidgetLayoutConfig
) {
  const dots = [];
  for (let i = 0; i < totalCards; i++) {
    const isActive = i === activeIndex;
    dots.push(
      <FlexWidget
        key={i}
        style={{
          width: isActive ? 4 : 3,
          height: isActive ? 12 : 3,
          borderRadius: 2,
          backgroundColor: isActive ? '#FFFFFF' : 'rgba(255, 255, 255, 0.28)',
          marginVertical: 1.5,
        }}
      />
    );
  }

  return (
    <FlexWidget
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.07)',
        borderRadius: 14,
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.10)',
      }}
    >
      {/* Up navigation button (Previous Card) */}
      <FlexWidget
        style={{ paddingHorizontal: 5, paddingVertical: 2 }}
        clickAction="UP_STACK"
      >
        <TextWidget
          text="‹"
          style={{
            color: '#FFFFFF',
            fontSize: 14,
            fontWeight: '900',
          }}
        />
      </FlexWidget>

      {/* Vertical capsule dots stack */}
      <FlexWidget
        style={{
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 4,
          paddingVertical: 1,
        }}
        clickAction="CYCLE_STACK"
      >
        {dots}
      </FlexWidget>

      {/* Down navigation button (Next Card) */}
      <FlexWidget
        style={{ paddingHorizontal: 5, paddingVertical: 2 }}
        clickAction="DOWN_STACK"
      >
        <TextWidget
          text="›"
          style={{
            color: '#FFFFFF',
            fontSize: 14,
            fontWeight: '900',
          }}
        />
      </FlexWidget>
    </FlexWidget>
  );
}

export function NextClassWidget({
  data,
  widgetInfo,
}: {
  data?: NextClassWidgetData;
  widgetInfo?: WidgetInfo;
}) {
  const cfg = getAppleWidgetConfig(widgetInfo?.width, widgetInfo?.height, widgetInfo?.screenInfo);

  // Total stack cards count:
  // 0: Next Class (Calendar)
  // 1: Attendance & Bunk Margin (Activity)
  // 2: Today's Schedule (Reminders/Timeline)
  // 3: Upcoming Exam Countdown (if exam within 14 days)
  // 4: Academic Quick Stats & CGPA
  const hasUpcomingExam = Boolean(data?.upcomingExam && data.upcomingExam.isApproaching);
  const totalCards = hasUpcomingExam ? 5 : 4;
  const rawIdx = data?.stackIndex ?? 0;
  const stackIndex = ((rawIdx % totalCards) + totalCards) % totalCards;

  const hasClasses = Boolean(data && data.status !== 'no_classes' && data.subject);
  const isOngoing = data?.status === 'ongoing';
  const isTomorrow = data?.status === 'tomorrow';

  // Apple SF Pro styled title & decoded room
  const subjectTitle = formatAppleTitle(data?.subject || 'No Upcoming Class');
  const courseCode = data?.subjectCode || '';
  const decodedRoom = decodeLpuRoom(data?.room || 'TBA');
  const timeDisplay = data?.time || '04:10 – 05:00 PM';
  const classType = (data?.type || 'Lecture').toUpperCase();

  // Bunk Margin calculation for attendance
  const attended = data?.attendedClasses ?? 0;
  const total = data?.totalClasses ?? 0;
  const bunkResult = calculateBunkMargin(attended, total, 0.75);
  const attPct = data?.overallAttendance ?? bunkResult.percentage;
  const cgpa = data?.cgpa || '--';

  // ═════════════════════════════════════════════════════════════════════════
  // 1. SMALL 2x2 COMPACT BOX (Apple Focus Mode Layout)
  // ═════════════════════════════════════════════════════════════════════════
  if (cfg.isSmall) {
    if (stackIndex === 1) {
      // 2x2 Attendance & Bunk Card
      return (
        <FlexWidget
          style={{
            height: 'match_parent',
            width: 'match_parent',
            backgroundColor: ApplePalette.surface,
            borderRadius: cfg.borderRadius,
            borderWidth: 1,
            borderColor: ApplePalette.border,
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
                backgroundColor: bunkResult.bgColor,
                borderRadius: 14,
                paddingHorizontal: 7,
                paddingVertical: 3,
                borderWidth: 1,
                borderColor: bunkResult.borderColor,
              }}
            >
              <TextWidget
                text={bunkResult.label}
                style={{ color: bunkResult.color, fontSize: 8.5, fontWeight: '800' }}
              />
            </FlexWidget>

            {renderSmartStackIndicator(1, totalCards, cfg)}
          </FlexWidget>

          {/* Hero Attendance */}
          <FlexWidget
            style={{ flexDirection: 'column', marginVertical: 2 }}
            clickAction="OPEN_URI"
            clickActionData={{ uri: 'alms://(tabs)/attendance' }}
          >
            <TextWidget
              text={`${attPct}%`}
              style={{
                color: '#FFFFFF',
                fontSize: 26,
                fontWeight: '900',
                letterSpacing: -0.5,
              }}
            />
            <TextWidget
              text={`${attended}/${total} Classes`}
              style={{ color: ApplePalette.textSecondary, fontSize: 9.5, fontWeight: '600' }}
            />
          </FlexWidget>

          {/* Bottom CGPA Pill */}
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
                backgroundColor: ApplePalette.purpleBg,
                borderRadius: 8,
                paddingHorizontal: 6,
                paddingVertical: 2.5,
                borderWidth: 1,
                borderColor: ApplePalette.purpleBorder,
              }}
              clickAction="OPEN_URI"
              clickActionData={{ uri: 'alms://(tabs)/attendance' }}
            >
              <TextWidget
                text={`CGPA ${cgpa}`}
                style={{ color: ApplePalette.purple, fontSize: 9, fontWeight: '800' }}
              />
            </FlexWidget>
          </FlexWidget>
        </FlexWidget>
      );
    }

    // 2x2 Class Card (Default)
    return (
      <FlexWidget
        style={{
          height: 'match_parent',
          width: 'match_parent',
          backgroundColor: ApplePalette.surface,
          borderRadius: cfg.borderRadius,
          borderWidth: 1,
          borderColor: ApplePalette.border,
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
              backgroundColor: isOngoing ? ApplePalette.mintBg : ApplePalette.blueBg,
              borderRadius: 14,
              paddingHorizontal: 7,
              paddingVertical: 3,
              borderWidth: 1,
              borderColor: isOngoing ? ApplePalette.mintBorder : ApplePalette.blueBorder,
            }}
            clickAction="REFRESH_WIDGET"
          >
            <TextWidget
              text={isOngoing ? '● LIVE' : (data?.timeUntilOrLeft ? data.timeUntilOrLeft.toUpperCase() : 'NEXT')}
              style={{
                color: isOngoing ? ApplePalette.mint : ApplePalette.blue,
                fontSize: 8.5,
                fontWeight: '900',
              }}
            />
          </FlexWidget>

          {renderSmartStackIndicator(stackIndex, totalCards, cfg)}
        </FlexWidget>

        {/* Middle: Course Code + Short Subject */}
        <FlexWidget
          style={{ width: 'match_parent', marginVertical: 1 }}
          clickAction="OPEN_URI"
          clickActionData={{ uri: 'alms://timetable' }}
        >
          <TextWidget
            text={courseCode || subjectTitle.slice(0, 7)}
            style={{
              color: '#FFFFFF',
              fontSize: 18,
              fontWeight: '900',
              letterSpacing: -0.3,
            }}
          />
          <TextWidget
            text={subjectTitle}
            maxLines={1}
            truncate="END"
            style={{
              color: ApplePalette.textSecondary,
              fontSize: 10,
              fontWeight: '600',
            }}
          />
        </FlexWidget>

        {/* Bottom: Room + Time */}
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
              backgroundColor: ApplePalette.surfacePill,
              borderRadius: 8,
              paddingHorizontal: 6,
              paddingVertical: 3,
            }}
            clickAction="OPEN_URI"
            clickActionData={{ uri: 'alms://timetable' }}
          >
            <TextWidget
              text={decodedRoom.block.replace('Block ', 'B')}
              style={{ color: '#FFFFFF', fontSize: 9.5, fontWeight: '700' }}
            />
          </FlexWidget>

          <TextWidget
            text={timeDisplay.split('–')[0].trim()}
            style={{ color: ApplePalette.textTertiary, fontSize: 9.5, fontWeight: '600' }}
          />
        </FlexWidget>
      </FlexWidget>
    );
  }

  // ═════════════════════════════════════════════════════════════════════════
  // 2. CARD 1: ATTENDANCE & BUNK MARGIN (Apple Activity Design)
  // ═════════════════════════════════════════════════════════════════════════
  if (stackIndex === 1) {
    return (
      <FlexWidget
        style={{
          height: 'match_parent',
          width: 'match_parent',
          backgroundColor: ApplePalette.surface,
          borderRadius: cfg.borderRadius,
          borderWidth: 1,
          borderColor: ApplePalette.border,
          paddingHorizontal: cfg.padH,
          paddingVertical: cfg.padV,
          justifyContent: 'space-between',
        }}
      >
        {/* Top Header Row: Status Pill on Left, Bunk Margin Pill + Indicator on Right */}
        <FlexWidget
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: 'match_parent',
            marginBottom: 4,
          }}
        >
          {/* Apple Category Pill */}
          <FlexWidget
            style={{
              backgroundColor: bunkResult.bgColor,
              borderRadius: 16,
              paddingHorizontal: 9,
              paddingVertical: 4.5,
              borderWidth: 1,
              borderColor: bunkResult.borderColor,
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
                backgroundColor: bunkResult.color,
                marginRight: 6,
              }}
            />
            <TextWidget
              text={`ATTENDANCE • ${bunkResult.label.toUpperCase()}`}
              maxLines={1}
              style={{
                color: bunkResult.color,
                fontSize: cfg.badgeFontSize,
                fontWeight: '800',
                letterSpacing: 0.2,
              }}
            />
          </FlexWidget>

          {/* Smart Stack Page Indicator */}
          {renderSmartStackIndicator(1, totalCards, cfg)}
        </FlexWidget>

        {/* Middle Hero: Apple Activity Percent & Bunk Metric */}
        <FlexWidget
          style={{
            flexDirection: 'column',
            justifyContent: 'center',
            width: 'match_parent',
            flex: 1,
          }}
          clickAction="OPEN_URI"
          clickActionData={{ uri: 'alms://(tabs)/attendance' }}
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
                  fontSize: cfg.isMedium ? 30 : 34,
                  fontWeight: '900',
                  letterSpacing: -1,
                }}
              />
              <TextWidget
                text=" OVERALL"
                style={{
                  color: ApplePalette.textTertiary,
                  fontSize: 10,
                  fontWeight: '800',
                  letterSpacing: 0.8,
                  marginLeft: 6,
                  marginBottom: 4,
                }}
              />
            </FlexWidget>

            {/* Bunk Margin Callout Badge */}
            <FlexWidget
              style={{
                backgroundColor: bunkResult.bgColor,
                borderRadius: 10,
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderWidth: 1,
                borderColor: bunkResult.borderColor,
              }}
            >
              <TextWidget
                text={bunkResult.pillText}
                style={{
                  color: bunkResult.color,
                  fontSize: 10.5,
                  fontWeight: '800',
                }}
              />
            </FlexWidget>
          </FlexWidget>

          {/* Apple-style Smooth Horizontal Progress Bar */}
          <FlexWidget
            style={{
              width: 'match_parent',
              height: 6,
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              borderRadius: 3,
              marginVertical: 3,
            }}
          >
            <FlexWidget
              style={{
                width: (Math.max(10, (cfg.w - cfg.padH * 2) * Math.min(100, Math.max(0, attPct)) / 100)) as any,
                height: 'match_parent',
                backgroundColor: bunkResult.color,
                borderRadius: 3,
              }}
            />
          </FlexWidget>
        </FlexWidget>

        {/* Bottom Details Row: Deep Link Chips */}
        <FlexWidget
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: 'match_parent',
            marginTop: 4,
          }}
        >
          <FlexWidget style={{ flexDirection: 'row', alignItems: 'center' }}>
            {/* Attended Ratio Chip */}
            <FlexWidget
              style={{
                backgroundColor: ApplePalette.surfacePill,
                borderRadius: 10,
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderWidth: 1,
                borderColor: ApplePalette.borderLight,
                marginRight: 6,
              }}
              clickAction="OPEN_URI"
              clickActionData={{ uri: 'alms://(tabs)/attendance' }}
            >
              <TextWidget
                text={`📚 ${attended}/${total} Classes`}
                style={{ color: '#FFFFFF', fontSize: 10.5, fontWeight: '700' }}
              />
            </FlexWidget>

            {/* CGPA Pill */}
            {cgpa && cgpa !== '--' ? (
              <FlexWidget
                style={{
                  backgroundColor: ApplePalette.purpleBg,
                  borderRadius: 10,
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderWidth: 1,
                  borderColor: ApplePalette.purpleBorder,
                }}
                clickAction="OPEN_URI"
                clickActionData={{ uri: 'alms://(tabs)/results' }}
              >
                <TextWidget
                  text={`CGPA ${cgpa}`}
                  style={{ color: ApplePalette.purple, fontSize: 10.5, fontWeight: '800' }}
                />
              </FlexWidget>
            ) : null}
          </FlexWidget>

          {/* Deep link direct jump */}
          <FlexWidget
            style={{
              backgroundColor: ApplePalette.surfacePill,
              borderRadius: 10,
              paddingHorizontal: 8,
              paddingVertical: 4,
            }}
            clickAction="OPEN_URI"
            clickActionData={{ uri: 'alms://(tabs)/attendance' }}
          >
            <TextWidget
              text="Details ›"
              style={{ color: ApplePalette.textSecondary, fontSize: 10.5, fontWeight: '700' }}
            />
          </FlexWidget>
        </FlexWidget>
      </FlexWidget>
    );
  }

  // ═════════════════════════════════════════════════════════════════════════
  // 3. CARD 2: TODAY'S SCHEDULE (Apple Reminders / Timeline Design)
  // ═════════════════════════════════════════════════════════════════════════
  if (stackIndex === 2) {
    const schedule = data?.todaySchedule || [];
    const count = schedule.length;
    const pageSize = cfg.isLarge ? 4 : 3;
    const totalPages = Math.max(1, Math.ceil(count / pageSize));
    const rawPage = data?.schedulePage ?? 0;
    const safePage = ((rawPage % totalPages) + totalPages) % totalPages;
    const visibleClasses = schedule.slice(safePage * pageSize, (safePage + 1) * pageSize);

    return (
      <FlexWidget
        style={{
          height: 'match_parent',
          width: 'match_parent',
          backgroundColor: ApplePalette.surface,
          borderRadius: cfg.borderRadius,
          borderWidth: 1,
          borderColor: ApplePalette.border,
          paddingHorizontal: cfg.padH,
          paddingVertical: cfg.padV,
          justifyContent: 'space-between',
        }}
      >
        {/* Header Row: Schedule Status on Left, Indicator on Right */}
        <FlexWidget
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: 'match_parent',
            marginBottom: 4,
          }}
        >
          <FlexWidget
            style={{
              backgroundColor: ApplePalette.tealBg,
              borderRadius: 16,
              paddingHorizontal: 9,
              paddingVertical: 4.5,
              borderWidth: 1,
              borderColor: ApplePalette.tealBorder,
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
                backgroundColor: ApplePalette.teal,
                marginRight: 6,
              }}
            />
            <TextWidget
              text={`TODAY • ${count} ${count === 1 ? 'CLASS' : 'CLASSES'}`}
              maxLines={1}
              style={{
                color: ApplePalette.teal,
                fontSize: cfg.badgeFontSize,
                fontWeight: '800',
                letterSpacing: 0.2,
              }}
            />
          </FlexWidget>

          {renderSmartStackIndicator(2, totalCards, cfg)}
        </FlexWidget>

        {/* Schedule Items List */}
        {count === 0 ? (
          <FlexWidget
            style={{ alignItems: 'center', justifyContent: 'center', flex: 1 }}
            clickAction="OPEN_URI"
            clickActionData={{ uri: 'alms://timetable' }}
          >
            <TextWidget
              text="No Classes Today"
              style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '700', marginBottom: 2 }}
            />
            <TextWidget
              text="Enjoy your campus free time"
              style={{ color: ApplePalette.textTertiary, fontSize: 11 }}
            />
          </FlexWidget>
        ) : (
          <FlexWidget style={{ width: 'match_parent', flexDirection: 'column', flex: 1, justifyContent: 'center' }}>
            {visibleClasses.map((item, idx) => {
              const itemRoom = decodeLpuRoom(item.room);
              return (
                <FlexWidget
                  key={idx}
                  style={{
                    width: 'match_parent',
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: item.isOngoing ? ApplePalette.mintBg : ApplePalette.surfaceSubtle,
                    borderRadius: 10,
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderWidth: 1,
                    borderColor: item.isOngoing ? ApplePalette.mintBorder : ApplePalette.border,
                    marginBottom: 3.5,
                  }}
                  clickAction="OPEN_URI"
                  clickActionData={{ uri: 'alms://timetable' }}
                >
                  {/* Time */}
                  <TextWidget
                    text={item.time.split('–')[0].split('-')[0].trim()}
                    style={{
                      color: item.isOngoing ? ApplePalette.mint : ApplePalette.textPrimary,
                      fontSize: 10.5,
                      fontWeight: '800',
                      width: 58,
                    }}
                  />

                  {/* Subject Name */}
                  <FlexWidget style={{ flex: 1, marginHorizontal: 4 }}>
                    <TextWidget
                      text={formatAppleTitle(item.subject)}
                      maxLines={1}
                      truncate="END"
                      style={{
                        color: item.isOngoing ? '#FFFFFF' : ApplePalette.textSecondary,
                        fontSize: 11,
                        fontWeight: item.isOngoing ? '800' : '600',
                      }}
                    />
                  </FlexWidget>

                  {/* Decoded Room */}
                  <TextWidget
                    text={itemRoom.shortLabel}
                    style={{
                      color: item.isOngoing ? ApplePalette.mint : ApplePalette.textTertiary,
                      fontSize: 10,
                      fontWeight: '700',
                    }}
                  />
                </FlexWidget>
              );
            })}
          </FlexWidget>
        )}

        {/* Footer: Pagination info on Left, Timetable link on Right */}
        <FlexWidget
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: 'match_parent',
            marginTop: 3,
          }}
        >
          <FlexWidget style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TextWidget
              text={count > pageSize
                ? `Showing ${safePage * pageSize + 1}–${Math.min((safePage + 1) * pageSize, count)} of ${count}`
                : `${count} scheduled`}
              style={{ color: ApplePalette.textTertiary, fontSize: 9.5, fontWeight: '600', marginRight: 6 }}
            />

            {totalPages > 1 ? (
              <FlexWidget style={{ flexDirection: 'row', alignItems: 'center' }}>
                <FlexWidget
                  style={{
                    backgroundColor: ApplePalette.surfacePill,
                    borderRadius: 6,
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    marginRight: 3,
                  }}
                  clickAction="PREV_SCHEDULE_PAGE"
                >
                  <TextWidget text="▲" style={{ color: ApplePalette.teal, fontSize: 8.5, fontWeight: 'bold' }} />
                </FlexWidget>
                <FlexWidget
                  style={{
                    backgroundColor: ApplePalette.surfacePill,
                    borderRadius: 6,
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                  }}
                  clickAction="NEXT_SCHEDULE_PAGE"
                >
                  <TextWidget text="▼" style={{ color: ApplePalette.teal, fontSize: 8.5, fontWeight: 'bold' }} />
                </FlexWidget>
              </FlexWidget>
            ) : null}
          </FlexWidget>

          <FlexWidget
            style={{
              backgroundColor: ApplePalette.surfacePill,
              borderRadius: 8,
              paddingHorizontal: 8,
              paddingVertical: 3.5,
            }}
            clickAction="OPEN_URI"
            clickActionData={{ uri: 'alms://timetable' }}
          >
            <TextWidget
              text="Full Day ›"
              style={{ color: ApplePalette.textSecondary, fontSize: 10, fontWeight: '700' }}
            />
          </FlexWidget>
        </FlexWidget>
      </FlexWidget>
    );
  }

  // ═════════════════════════════════════════════════════════════════════════
  // 4. CARD 3: UPCOMING EXAM COUNTDOWN (Apple Event Countdown Design)
  // Shown when an exam or CA is within 14 days
  // ═════════════════════════════════════════════════════════════════════════
  if (stackIndex === 3 && hasUpcomingExam && data?.upcomingExam) {
    const exam = data.upcomingExam;
    const isUrgent = exam.daysRemaining <= 3;
    const examColor = isUrgent ? ApplePalette.coral : ApplePalette.amber;
    const examBg = isUrgent ? ApplePalette.coralBg : ApplePalette.amberBg;
    const examBorder = isUrgent ? ApplePalette.coralBorder : ApplePalette.amberBorder;

    return (
      <FlexWidget
        style={{
          height: 'match_parent',
          width: 'match_parent',
          backgroundColor: ApplePalette.surface,
          borderRadius: cfg.borderRadius,
          borderWidth: 1,
          borderColor: examBorder,
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
            marginBottom: 4,
          }}
        >
          <FlexWidget
            style={{
              backgroundColor: examBg,
              borderRadius: 16,
              paddingHorizontal: 9,
              paddingVertical: 4.5,
              borderWidth: 1,
              borderColor: examBorder,
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <FlexWidget
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: examColor,
                marginRight: 6,
              }}
            />
            <TextWidget
              text={`EXAM • ${exam.countdownLabel}`}
              style={{ color: examColor, fontSize: cfg.badgeFontSize, fontWeight: '900', letterSpacing: 0.3 }}
            />
          </FlexWidget>

          {renderSmartStackIndicator(3, totalCards, cfg)}
        </FlexWidget>

        {/* Middle: Exam Subject & Details */}
        <FlexWidget
          style={{ width: 'match_parent', marginVertical: 3 }}
          clickAction="OPEN_URI"
          clickActionData={{ uri: 'alms://exams' }}
        >
          <TextWidget
            text={exam.subjectCode}
            style={{ color: examColor, fontSize: 11, fontWeight: '900', letterSpacing: 0.5, marginBottom: 1 }}
          />
          <TextWidget
            text={formatAppleTitle(exam.subject)}
            maxLines={1}
            truncate="END"
            style={{
              color: '#FFFFFF',
              fontSize: 17,
              fontWeight: '800',
              letterSpacing: -0.2,
            }}
          />
        </FlexWidget>

        {/* Footer: Date, Room & Seat */}
        <FlexWidget
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: 'match_parent',
            marginTop: 4,
          }}
        >
          <FlexWidget style={{ flexDirection: 'row', alignItems: 'center' }}>
            <FlexWidget
              style={{
                backgroundColor: ApplePalette.surfacePill,
                borderRadius: 8,
                paddingHorizontal: 7,
                paddingVertical: 3.5,
                marginRight: 5,
              }}
              clickAction="OPEN_URI"
              clickActionData={{ uri: 'alms://exams' }}
            >
              <TextWidget
                text={`📅 ${exam.dateStr} • ${exam.timeStr}`}
                style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '700' }}
              />
            </FlexWidget>

            <FlexWidget
              style={{
                backgroundColor: ApplePalette.surfacePill,
                borderRadius: 8,
                paddingHorizontal: 7,
                paddingVertical: 3.5,
              }}
              clickAction="OPEN_URI"
              clickActionData={{ uri: 'alms://exams' }}
            >
              <TextWidget
                text={`📍 ${exam.room}${exam.seat ? ` • Seat ${exam.seat}` : ''}`}
                style={{ color: ApplePalette.textSecondary, fontSize: 10, fontWeight: '700' }}
              />
            </FlexWidget>
          </FlexWidget>

          <FlexWidget
            style={{
              backgroundColor: examBg,
              borderRadius: 8,
              paddingHorizontal: 8,
              paddingVertical: 3.5,
            }}
            clickAction="OPEN_URI"
            clickActionData={{ uri: 'alms://exams' }}
          >
            <TextWidget text="Seating ›" style={{ color: examColor, fontSize: 10, fontWeight: '800' }} />
          </FlexWidget>
        </FlexWidget>
      </FlexWidget>
    );
  }

  // ═════════════════════════════════════════════════════════════════════════
  // 5. CARD 4: ACADEMIC QUICK STATS (Apple Modular Glanceable Design)
  // ═════════════════════════════════════════════════════════════════════════
  if (stackIndex === (hasUpcomingExam ? 4 : 3)) {
    const currentCardIdx = hasUpcomingExam ? 4 : 3;
    return (
      <FlexWidget
        style={{
          height: 'match_parent',
          width: 'match_parent',
          backgroundColor: ApplePalette.surface,
          borderRadius: cfg.borderRadius,
          borderWidth: 1,
          borderColor: ApplePalette.border,
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
            marginBottom: 4,
          }}
        >
          <FlexWidget
            style={{
              backgroundColor: ApplePalette.purpleBg,
              borderRadius: 16,
              paddingHorizontal: 9,
              paddingVertical: 4.5,
              borderWidth: 1,
              borderColor: ApplePalette.purpleBorder,
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
                backgroundColor: ApplePalette.purple,
                marginRight: 6,
              }}
            />
            <TextWidget
              text="ACADEMIC OVERVIEW"
              style={{ color: ApplePalette.purple, fontSize: cfg.badgeFontSize, fontWeight: '800', letterSpacing: 0.2 }}
            />
          </FlexWidget>

          {renderSmartStackIndicator(currentCardIdx, totalCards, cfg)}
        </FlexWidget>

        {/* Middle: Dual Modular Stat Columns */}
        <FlexWidget
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: 'match_parent',
            flex: 1,
            marginVertical: 4,
          }}
        >
          {/* CGPA Column */}
          <FlexWidget
            style={{
              backgroundColor: ApplePalette.surfaceSubtle,
              borderRadius: 14,
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderWidth: 1,
              borderColor: ApplePalette.border,
              flex: 1,
              marginRight: 6,
            }}
            clickAction="OPEN_URI"
            clickActionData={{ uri: 'alms://(tabs)/results' }}
          >
            <TextWidget
              text={cgpa}
              style={{ color: '#FFFFFF', fontSize: 24, fontWeight: '900', letterSpacing: -0.5 }}
            />
            <TextWidget
              text="CUMULATIVE GPA"
              style={{ color: ApplePalette.purple, fontSize: 8.5, fontWeight: '800', letterSpacing: 0.5, marginTop: 2 }}
            />
          </FlexWidget>

          {/* Attendance Column */}
          <FlexWidget
            style={{
              backgroundColor: ApplePalette.surfaceSubtle,
              borderRadius: 14,
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderWidth: 1,
              borderColor: ApplePalette.border,
              flex: 1,
              marginLeft: 6,
            }}
            clickAction="OPEN_URI"
            clickActionData={{ uri: 'alms://(tabs)/attendance' }}
          >
            <TextWidget
              text={`${attPct}%`}
              style={{ color: '#FFFFFF', fontSize: 24, fontWeight: '900', letterSpacing: -0.5 }}
            />
            <TextWidget
              text={bunkResult.pillText.toUpperCase()}
              style={{ color: bunkResult.color, fontSize: 8.5, fontWeight: '800', letterSpacing: 0.5, marginTop: 2 }}
            />
          </FlexWidget>
        </FlexWidget>

        {/* Footer Row */}
        <FlexWidget
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: 'match_parent',
          }}
        >
          <TextWidget
            text="ALMS Companion • Live Student Portal"
            style={{ color: ApplePalette.textTertiary, fontSize: 9.5, fontWeight: '600' }}
          />

          <FlexWidget
            style={{
              backgroundColor: ApplePalette.surfacePill,
              borderRadius: 8,
              paddingHorizontal: 8,
              paddingVertical: 3.5,
            }}
            clickAction="OPEN_APP"
          >
            <TextWidget text="Dashboard ›" style={{ color: ApplePalette.textSecondary, fontSize: 10, fontWeight: '700' }} />
          </FlexWidget>
        </FlexWidget>
      </FlexWidget>
    );
  }

  // ═════════════════════════════════════════════════════════════════════════
  // 6. CARD 0: NO CLASSES STATE (Apple Zen / Free Time)
  // ═════════════════════════════════════════════════════════════════════════
  if (!hasClasses) {
    return (
      <FlexWidget
        style={{
          height: 'match_parent',
          width: 'match_parent',
          backgroundColor: ApplePalette.surface,
          borderRadius: cfg.borderRadius,
          borderWidth: 1,
          borderColor: ApplePalette.border,
          paddingHorizontal: cfg.padH,
          paddingVertical: cfg.padV,
          justifyContent: 'space-between',
        }}
      >
        {/* Header */}
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
              backgroundColor: ApplePalette.mintBg,
              borderRadius: 16,
              paddingHorizontal: 9,
              paddingVertical: 4.5,
              borderWidth: 1,
              borderColor: ApplePalette.mintBorder,
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
                backgroundColor: ApplePalette.mint,
                marginRight: 6,
              }}
            />
            <TextWidget
              text="ALL CAUGHT UP"
              style={{ color: ApplePalette.mint, fontSize: cfg.badgeFontSize, fontWeight: '900', letterSpacing: 0.3 }}
            />
          </FlexWidget>

          {renderSmartStackIndicator(0, totalCards, cfg)}
        </FlexWidget>

        {/* Center Content */}
        <FlexWidget
          style={{ alignItems: 'flex-start', justifyContent: 'center', flex: 1, marginVertical: 4 }}
          clickAction="OPEN_URI"
          clickActionData={{ uri: 'alms://timetable' }}
        >
          <TextWidget
            text="No Classes Scheduled"
            style={{
              color: '#FFFFFF',
              fontSize: 18,
              fontWeight: '800',
              letterSpacing: -0.2,
              marginBottom: 3,
            }}
          />
          <TextWidget
            text="Enjoy your campus free time or prepare for next semester."
            maxLines={1}
            style={{ color: ApplePalette.textSecondary, fontSize: 11, fontWeight: '500' }}
          />
        </FlexWidget>

        {/* Bottom Details */}
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
              backgroundColor: bunkResult.bgColor,
              borderRadius: 8,
              paddingHorizontal: 8,
              paddingVertical: 3.5,
            }}
            clickAction="OPEN_URI"
            clickActionData={{ uri: 'alms://(tabs)/attendance' }}
          >
            <TextWidget
              text={`Attendance: ${attPct}% • ${bunkResult.label}`}
              style={{ color: bunkResult.color, fontSize: 10, fontWeight: '700' }}
            />
          </FlexWidget>

          <FlexWidget
            style={{
              backgroundColor: ApplePalette.surfacePill,
              borderRadius: 8,
              paddingHorizontal: 8,
              paddingVertical: 3.5,
            }}
            clickAction="OPEN_APP"
          >
            <TextWidget text="Open ALMS ›" style={{ color: ApplePalette.textSecondary, fontSize: 10, fontWeight: '700' }} />
          </FlexWidget>
        </FlexWidget>
      </FlexWidget>
    );
  }

  // ═════════════════════════════════════════════════════════════════════════
  // 7. CARD 0: NEXT CLASS / IN SESSION (Apple Calendar & Live Activity)
  // Flagship 4x2 / 4x4 Presentation
  // ═════════════════════════════════════════════════════════════════════════
  const statusColor: ColorProp = isOngoing
    ? ApplePalette.mint
    : (isTomorrow ? ApplePalette.purple : ApplePalette.blue);
  const statusBg: ColorProp = isOngoing
    ? ApplePalette.mintBg
    : (isTomorrow ? ApplePalette.purpleBg : ApplePalette.blueBg);
  const statusBorder: ColorProp = isOngoing
    ? ApplePalette.mintBorder
    : (isTomorrow ? ApplePalette.purpleBorder : ApplePalette.blueBorder);

  const statusLabel = isOngoing
    ? (data?.timeUntilOrLeft ? `IN SESSION • ${data.timeUntilOrLeft}` : 'IN SESSION')
    : (data?.timeUntilOrLeft ? `STARTS IN ${data.timeUntilOrLeft}` : (isTomorrow ? 'TOMORROW' : 'NEXT CLASS'));

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: ApplePalette.surface,
        borderRadius: cfg.borderRadius,
        borderWidth: 1,
        borderColor: ApplePalette.border,
        paddingHorizontal: cfg.padH,
        paddingVertical: cfg.padV,
        justifyContent: 'space-between',
      }}
    >
      {/* ── TOP HEADER ROW: Apple Live Activity Badge on Left, Smart Stack Indicator on Right ── */}
      <FlexWidget
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: 'match_parent',
          marginBottom: 3,
        }}
      >
        {/* Status Badge */}
        <FlexWidget
          style={{
            backgroundColor: statusBg,
            borderRadius: 16,
            paddingHorizontal: 9,
            paddingVertical: 4.5,
            borderWidth: 1,
            borderColor: statusBorder,
            flexDirection: 'row',
            alignItems: 'center',
          }}
          clickAction="REFRESH_WIDGET"
        >
          {/* Apple Live Activity Pulse Dot */}
          <FlexWidget
            style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: statusColor,
              marginRight: 6,
            }}
          />
          <TextWidget
            text={statusLabel}
            maxLines={1}
            truncate="END"
            style={{
              color: statusColor,
              fontSize: cfg.badgeFontSize,
              fontWeight: '900',
              letterSpacing: 0.3,
            }}
          />
        </FlexWidget>

        {/* Prominent Apple Time Pill */}
        <FlexWidget
          style={{
            backgroundColor: ApplePalette.surfacePill,
            borderRadius: 12,
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderWidth: 1,
            borderColor: ApplePalette.borderLight,
            flexDirection: 'row',
            alignItems: 'center',
            marginRight: 6,
          }}
          clickAction="CYCLE_STACK"
        >
          <TextWidget
            text={timeDisplay}
            style={{
              color: '#FFFFFF',
              fontSize: 10.5,
              fontWeight: '700',
              letterSpacing: 0.2,
            }}
          />
        </FlexWidget>

        {/* Smart Stack Vertical Indicator */}
        {renderSmartStackIndicator(0, totalCards, cfg)}
      </FlexWidget>

      {/* ── MIDDLE HERO: Subject Title & Decoded Campus Location ── */}
      <FlexWidget
        style={{ width: 'match_parent', marginVertical: 3 }}
        clickAction="OPEN_URI"
        clickActionData={{ uri: 'alms://timetable' }}
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
            letterSpacing: -0.3,
          }}
        />

        {/* Decoded Location Subtitle: e.g. "Block 34 • 1st Floor (Room 34-101)" */}
        <TextWidget
          text={`📍 ${decodedRoom.block} • ${decodedRoom.floor} (${decodedRoom.fullLabel.split(', ')[1] || decodedRoom.shortLabel})`}
          maxLines={1}
          truncate="END"
          style={{
            color: ApplePalette.textSecondary,
            fontSize: 11,
            fontWeight: '600',
            marginTop: 2,
          }}
        />
      </FlexWidget>

      {/* ── BOTTOM DEEP LINK CHIPS & ATTENDANCE STATUS ── */}
      <FlexWidget
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: 'match_parent',
          marginTop: 3,
        }}
      >
        {/* Left Chips Group */}
        <FlexWidget style={{ flexDirection: 'row', alignItems: 'center' }}>
          {/* Room Deep Link */}
          <FlexWidget
            style={{
              backgroundColor: ApplePalette.surfacePill,
              borderRadius: 9,
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderWidth: 1,
              borderColor: ApplePalette.border,
              marginRight: 5,
            }}
            clickAction="OPEN_URI"
            clickActionData={{ uri: 'alms://timetable' }}
          >
            <TextWidget
              text={`📍 ${decodedRoom.shortLabel}`}
              style={{ color: '#FFFFFF', fontSize: 10.5, fontWeight: '700' }}
            />
          </FlexWidget>

          {/* Course Code Chip */}
          {courseCode ? (
            <FlexWidget
              style={{
                backgroundColor: ApplePalette.surfacePill,
                borderRadius: 9,
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderWidth: 1,
                borderColor: ApplePalette.border,
                marginRight: 5,
              }}
              clickAction="OPEN_URI"
              clickActionData={{ uri: 'alms://(tabs)/attendance' }}
            >
              <TextWidget
                text={`🏷 ${courseCode}`}
                style={{ color: ApplePalette.textSecondary, fontSize: 10.5, fontWeight: '700' }}
              />
            </FlexWidget>
          ) : null}

          {/* Type Badge */}
          <FlexWidget
            style={{
              backgroundColor: statusBg,
              borderRadius: 8,
              paddingHorizontal: 7,
              paddingVertical: 3.5,
              borderWidth: 1,
              borderColor: statusBorder,
            }}
          >
            <TextWidget
              text={classType}
              style={{
                color: statusColor,
                fontSize: 9,
                fontWeight: '900',
                letterSpacing: 0.5,
              }}
            />
          </FlexWidget>
        </FlexWidget>

        {/* Right Bunk Margin Quick Pill */}
        <FlexWidget
          style={{
            backgroundColor: bunkResult.bgColor,
            borderRadius: 8,
            paddingHorizontal: 7,
            paddingVertical: 3.5,
          }}
          clickAction="OPEN_URI"
          clickActionData={{ uri: 'alms://(tabs)/attendance' }}
        >
          <TextWidget
            text={bunkResult.label}
            style={{ color: bunkResult.color, fontSize: 9.5, fontWeight: '800' }}
          />
        </FlexWidget>
      </FlexWidget>
    </FlexWidget>
  );
}
