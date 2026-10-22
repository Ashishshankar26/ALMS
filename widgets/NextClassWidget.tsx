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

// Unified Responsive Layout Engine that prevents cramping across ALL launcher cell sizes
function getWidgetLayoutConfig(w: number, h: number) {
  const isMicro = h < 95;              // 1-cell height (e.g. 4x1, 3x1, 2x1)
  const isCompact = h >= 95 && h < 140; // 2-cell short height (e.g. 2x2, 3x2 on small launchers)
  const isMedium = h >= 140 && h < 225; // Standard 2-cell / 3-cell height (e.g. 4x2, 3x2, 4x3)
  const isLarge = h >= 225;            // Tall 4x4, 5x4

  const isNarrow = w < 220;            // 2-cell width (e.g. 2x2, 2x3)
  const isWide = w >= 320;             // 4-cell or wider

  return {
    isMicro,
    isCompact,
    isMedium,
    isLarge,
    isNarrow,
    isWide,
    // Spacing
    padH: isNarrow ? 10 : (isMicro ? 12 : (isCompact ? 12 : 16)),
    padV: isMicro ? 6 : (isCompact ? 8 : (isMedium ? 12 : 16)),
    borderRadius: isMicro ? 14 : (isCompact ? 18 : 24),
    // Typography
    titleFontSize: isMicro ? 12 : (isCompact ? (isNarrow ? 13 : 15) : (isMedium ? (isNarrow ? 16 : 19) : 22)),
    titleMaxLines: isMicro || isCompact ? 1 : 2,
    badgeFontSize: isMicro || isNarrow ? 8 : 10,
    // Elements to show
    showHandle: !isMicro && h >= 115,
    scheduleItemsCount: isMicro ? 1 : (isCompact ? 2 : (isMedium ? 3 : 4)),
  };
}

export function NextClassWidget({
  data,
  widgetInfo,
}: {
  data?: NextClassWidgetData;
  widgetInfo?: WidgetInfo;
}) {
  const w = widgetInfo?.width ?? 320;
  const h = widgetInfo?.height ?? 160;
  const cfg = getWidgetLayoutConfig(w, h);

  const stackIndex = ((data?.stackIndex ?? 0) % 3 + 3) % 3;
  const hasClasses = Boolean(data && data.status !== 'no_classes' && data.subject);

  // Status flags
  const isOngoing = data?.status === 'ongoing';
  const isTomorrow = data?.status === 'tomorrow';
  const isLab = Boolean(
    (data?.type || '').toLowerCase().includes('lab') ||
    (data?.type || '').toLowerCase().includes('practical')
  );

  // ── APP'S UTILITY STACK COLOR PALETTES ──
  // Card 0: Next Class / Active Class (Deep Emerald for Live, Royal Indigo for Upcoming, Deep Plum for Tomorrow)
  const nextClassBg: ColorProp = isOngoing ? '#06261D' : (isTomorrow ? '#21102B' : (isLab ? '#09212B' : '#101438'));
  const nextClassBorder: ColorProp = isOngoing ? '#059669' : (isTomorrow ? '#9333EA' : (isLab ? '#0284C7' : '#4F46E5'));
  const nextClassAccent: ColorProp = isOngoing ? '#10B981' : (isTomorrow ? '#A855F7' : (isLab ? '#38BDF8' : '#818CF8'));
  const nextClassBadgeBg: ColorProp = isOngoing ? 'rgba(16, 185, 129, 0.22)' : (isTomorrow ? 'rgba(168, 85, 247, 0.22)' : 'rgba(99, 102, 241, 0.22)');

  // Card 1: Today's Schedule (Deep Sapphire Navy from the app)
  const scheduleBg: ColorProp = '#081A2E';
  const scheduleBorder: ColorProp = '#0284C7';
  const scheduleAccent: ColorProp = '#38BDF8';
  const scheduleBadgeBg: ColorProp = 'rgba(56, 189, 248, 0.22)';

  // Card 2: Attendance (Deep Crimson/Rose matching app's attendance stack card)
  const attPct = data?.overallAttendance ?? 0;
  const isSafe = attPct >= 80;
  const isWarning = attPct >= 75 && attPct < 80;
  const attColor: ColorProp = isSafe ? '#10B981' : (isWarning ? '#F59E0B' : '#EF4444');
  const attBg: ColorProp = '#260D17';
  const attBorder: ColorProp = isSafe ? '#059669' : (isWarning ? '#D97706' : '#E11D48');
  const attBadgeBg: ColorProp = isSafe ? 'rgba(16, 185, 129, 0.22)' : (isWarning ? 'rgba(245, 158, 11, 0.22)' : 'rgba(239, 68, 68, 0.22)');

  // Top Handle Pill (directly from app's stackHandle style)
  const renderStackHandle = () => {
    if (!cfg.showHandle) return null;
    return (
      <FlexWidget
        style={{
          width: 'match_parent',
          alignItems: 'center',
          marginBottom: cfg.isCompact ? 6 : 8,
        }}
      >
        <FlexWidget
          style={{
            width: 32,
            height: 3,
            backgroundColor: 'rgba(255, 255, 255, 0.25)',
            borderRadius: 2,
          }}
        />
      </FlexWidget>
    );
  };

  // Sleek Glass Card Header with Status Badge & Cycler Controls
  const renderStackHeader = (
    activeIdx: number,
    statusBadgeText: string,
    categoryLabel: string,
    badgeBgColor: ColorProp,
    badgeBorderColor: ColorProp,
    badgeTextColor: ColorProp
  ) => {
    return (
      <FlexWidget
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: 'match_parent',
          marginBottom: cfg.isMicro ? 3 : 6,
        }}
      >
        {/* Left Side: Mini Status Badge + Optional Category Label */}
        <FlexWidget
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            flex: 1,
          }}
        >
          {/* Mini Status Badge (clickable to refresh data) */}
          <FlexWidget
            style={{
              backgroundColor: badgeBgColor,
              borderRadius: 8,
              paddingHorizontal: cfg.isMicro || cfg.isNarrow ? 6 : 9,
              paddingVertical: cfg.isMicro ? 2 : 4,
              borderWidth: 1,
              borderColor: badgeBorderColor,
              flexDirection: 'row',
              alignItems: 'center',
            }}
            clickAction="REFRESH_WIDGET"
          >
            <TextWidget
              text={statusBadgeText}
              maxLines={1}
              truncate="END"
              style={{
                color: badgeTextColor,
                fontSize: cfg.badgeFontSize,
                fontWeight: '900',
                letterSpacing: 0.5,
              }}
            />
            <TextWidget
              text=" ↻"
              style={{
                color: badgeTextColor,
                fontSize: cfg.badgeFontSize,
                fontWeight: 'bold',
              }}
            />
          </FlexWidget>

          {/* Category label shown when width permits */}
          {!cfg.isNarrow && !cfg.isMicro ? (
            <TextWidget
              text={categoryLabel}
              style={{
                color: 'rgba(255, 255, 255, 0.6)',
                fontSize: 10,
                fontWeight: '800',
                letterSpacing: 0.8,
                marginLeft: 8,
              }}
            />
          ) : null}
        </FlexWidget>

        {/* Right Side: Glass Card Cycler [ ‹  1/3  › ] */}
        <FlexWidget
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
            borderRadius: 12,
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.12)',
            paddingHorizontal: 2,
            paddingVertical: 1,
          }}
        >
          {/* Previous Card Button */}
          <FlexWidget
            style={{
              paddingHorizontal: cfg.isMicro ? 5 : 7,
              paddingVertical: cfg.isMicro ? 1 : 3,
            }}
            clickAction="PREV_STACK"
          >
            <TextWidget
              text="‹"
              style={{
                color: '#E2E8F0',
                fontSize: cfg.isMicro ? 11 : 14,
                fontWeight: '900',
              }}
            />
          </FlexWidget>

          {/* Current / Total Stack Indicator */}
          <TextWidget
            text={`${activeIdx + 1}/3`}
            style={{
              color: 'rgba(255, 255, 255, 0.75)',
              fontSize: cfg.isMicro ? 8 : 10,
              fontWeight: '800',
              marginHorizontal: 2,
            }}
          />

          {/* Next Card Button */}
          <FlexWidget
            style={{
              paddingHorizontal: cfg.isMicro ? 5 : 7,
              paddingVertical: cfg.isMicro ? 1 : 3,
            }}
            clickAction="NEXT_STACK"
          >
            <TextWidget
              text="›"
              style={{
                color: '#E2E8F0',
                fontSize: cfg.isMicro ? 11 : 14,
                fontWeight: '900',
              }}
            />
          </FlexWidget>
        </FlexWidget>
      </FlexWidget>
    );
  };

  // ═════════════════════════════════════════════════════════════════════════
  // CARD 1: TODAY'S SCHEDULE (With Up/Down Pagination & Responsive Item Sizing)
  // ═════════════════════════════════════════════════════════════════════════
  if (stackIndex === 1) {
    const schedule = data?.todaySchedule || [];
    const count = schedule.length;
    const pageSize = cfg.scheduleItemsCount;
    const totalPages = Math.max(1, Math.ceil(count / pageSize));
    const rawPage = data?.schedulePage ?? 0;
    const safePage = ((rawPage % totalPages) + totalPages) % totalPages;
    const visibleClasses = schedule.slice(safePage * pageSize, (safePage + 1) * pageSize);

    const badgeText = cfg.isNarrow || cfg.isMicro
      ? `TODAY • ${count}`
      : `TODAY • ${count} ${count === 1 ? 'CLASS' : 'CLASSES'}`;

    return (
      <FlexWidget
        style={{
          height: 'match_parent',
          width: 'match_parent',
          backgroundColor: scheduleBg,
          borderRadius: cfg.borderRadius,
          borderWidth: 1.2,
          borderColor: scheduleBorder,
          paddingHorizontal: cfg.padH,
          paddingVertical: cfg.padV,
          justifyContent: 'space-between',
        }}
        clickAction="OPEN_APP"
      >
        {renderStackHandle()}
        {renderStackHeader(1, badgeText, 'SCHEDULE HUB', scheduleBadgeBg, scheduleBorder, scheduleAccent)}

        {/* Schedule List Items */}
        {count === 0 ? (
          <FlexWidget style={{ alignItems: 'center', justifyContent: 'center', flex: 1 }}>
            <TextWidget
              text="No classes scheduled for today ✓"
              style={{ color: 'rgba(255, 255, 255, 0.75)', fontSize: cfg.titleFontSize - 3, fontWeight: '700' }}
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
                  backgroundColor: item.isOngoing ? 'rgba(16, 185, 129, 0.22)' : 'rgba(255, 255, 255, 0.06)',
                  borderRadius: 8,
                  paddingHorizontal: cfg.isNarrow ? 6 : 8,
                  paddingVertical: cfg.isMicro ? 2 : (cfg.isCompact ? 4 : 5),
                  borderWidth: 1,
                  borderColor: item.isOngoing ? '#10B981' : 'rgba(255, 255, 255, 0.08)',
                  marginBottom: cfg.isMicro ? 2 : 4,
                }}
              >
                {/* Start Time */}
                <TextWidget
                  text={item.time.split('-')[0].trim()}
                  style={{
                    color: item.isOngoing ? '#10B981' : '#E2E8F0',
                    fontSize: cfg.isMicro ? 9 : 11,
                    fontWeight: '800',
                    width: cfg.isNarrow ? 52 : 64,
                  }}
                />
                {/* Subject Name */}
                <FlexWidget style={{ flex: 1, marginHorizontal: 4 }}>
                  <TextWidget
                    text={item.subject}
                    maxLines={1}
                    truncate="END"
                    style={{
                      color: '#FFFFFF',
                      fontSize: cfg.isMicro ? 10 : 12,
                      fontWeight: 'bold',
                    }}
                  />
                </FlexWidget>
                {/* Room */}
                <TextWidget
                  text={item.room ? item.room.replace(/^Room\s*/i, '') : 'TBA'}
                  style={{
                    color: 'rgba(255, 255, 255, 0.8)',
                    fontSize: cfg.isMicro ? 9 : 11,
                    fontWeight: '700',
                  }}
                />
              </FlexWidget>
            ))}
          </FlexWidget>
        )}

        {/* Footer info & Pagination Controls */}
        <FlexWidget
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: 'match_parent',
            marginTop: cfg.isMicro ? 2 : 4,
          }}
        >
          <TextWidget
            text={count > pageSize
              ? `${safePage * pageSize + 1}-${Math.min((safePage + 1) * pageSize, count)} of ${count}`
              : `${count} total classes`}
            style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: cfg.isMicro ? 8 : 10, fontWeight: '600' }}
          />

          {totalPages > 1 ? (
            <FlexWidget style={{ flexDirection: 'row', alignItems: 'center' }}>
              <FlexWidget
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.12)',
                  borderRadius: 6,
                  paddingHorizontal: 7,
                  paddingVertical: 2,
                  marginRight: 4,
                }}
                clickAction="PREV_SCHEDULE_PAGE"
              >
                <TextWidget
                  text="▲"
                  style={{ color: scheduleAccent, fontSize: 9, fontWeight: 'bold' }}
                />
              </FlexWidget>

              <FlexWidget
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.12)',
                  borderRadius: 6,
                  paddingHorizontal: 7,
                  paddingVertical: 2,
                }}
                clickAction="NEXT_SCHEDULE_PAGE"
              >
                <TextWidget
                  text="▼"
                  style={{ color: scheduleAccent, fontSize: 9, fontWeight: 'bold' }}
                />
              </FlexWidget>
            </FlexWidget>
          ) : (
            <TextWidget
              text="ALMS"
              style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: cfg.isMicro ? 8 : 10, fontWeight: 'bold' }}
            />
          )}
        </FlexWidget>
      </FlexWidget>
    );
  }

  // ═════════════════════════════════════════════════════════════════════════
  // CARD 2: ATTENDANCE & STATS (Matching App's Attendance Stack Card)
  // ═════════════════════════════════════════════════════════════════════════
  if (stackIndex === 2) {
    const total = data?.totalClasses ?? 0;
    const attended = data?.attendedClasses ?? 0;
    const cgpa = data?.cgpa || '--';

    const statusBadgeText = isSafe ? 'SAFE' : (isWarning ? 'WARNING' : 'CRITICAL');

    return (
      <FlexWidget
        style={{
          height: 'match_parent',
          width: 'match_parent',
          backgroundColor: attBg,
          borderRadius: cfg.borderRadius,
          borderWidth: 1.2,
          borderColor: attBorder,
          paddingHorizontal: cfg.padH,
          paddingVertical: cfg.padV,
          justifyContent: 'space-between',
        }}
        clickAction="OPEN_APP"
      >
        {renderStackHandle()}
        {renderStackHeader(2, statusBadgeText, 'ACADEMIC ATTENDANCE', attBadgeBg, attBorder, attColor)}

        {/* Subtitle from the app's card */}
        {!cfg.isMicro ? (
          <TextWidget
            text="Live Attendance Tracking"
            style={{
              color: 'rgba(255, 255, 255, 0.85)',
              fontSize: cfg.isCompact ? 10 : 12,
              fontWeight: '700',
              marginBottom: 2,
            }}
          />
        ) : null}

        {/* Big Hero Value Row */}
        <FlexWidget
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: 'match_parent',
            marginVertical: cfg.isMicro ? 1 : 3,
          }}
        >
          {/* Big Percentage Number */}
          <FlexWidget style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
            <TextWidget
              text={`${attPct}`}
              style={{
                color: '#FFFFFF',
                fontSize: cfg.isMicro ? 22 : (cfg.isCompact ? 28 : (cfg.isLarge ? 36 : 32)),
                fontWeight: '900',
                letterSpacing: -1,
              }}
            />
            <TextWidget
              text="%"
              style={{
                color: attColor,
                fontSize: cfg.isMicro ? 12 : 16,
                fontWeight: 'bold',
                marginLeft: 2,
              }}
            />
          </FlexWidget>

          {/* Right Summary Info */}
          <FlexWidget style={{ flexDirection: 'column', alignItems: 'flex-end' }}>
            <TextWidget
              text={`${attended} / ${total} Present`}
              style={{
                color: '#FFFFFF',
                fontSize: cfg.isMicro ? 9 : 11,
                fontWeight: '700',
              }}
            />
            {cgpa && cgpa !== '--' ? (
              <TextWidget
                text={`CGPA: ${cgpa}`}
                style={{
                  color: '#A78BFA',
                  fontSize: cfg.isMicro ? 8 : 10,
                  fontWeight: 'bold',
                  marginTop: 1,
                }}
              />
            ) : null}
          </FlexWidget>
        </FlexWidget>

        {/* Progress Bar (omitted only on micro height) */}
        {!cfg.isMicro ? (
          <FlexWidget
            style={{
              width: 'match_parent',
              height: cfg.isCompact ? 5 : 7,
              backgroundColor: 'rgba(255, 255, 255, 0.12)',
              borderRadius: 4,
              marginVertical: 2,
            }}
          >
            <FlexWidget
              style={{
                width: (Math.max(10, (w - cfg.padH * 2) * Math.min(100, Math.max(0, attPct)) / 100)) as any,
                height: 'match_parent',
                backgroundColor: attColor,
                borderRadius: 4,
              }}
            />
          </FlexWidget>
        ) : null}

        {/* Footer Row */}
        <FlexWidget
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: 'match_parent',
            marginTop: cfg.isMicro ? 1 : 3,
          }}
        >
          <TextWidget
            text={isSafe ? 'Above 75% requirement ✓' : 'Below 75% requirement ⚠️'}
            style={{ color: 'rgba(255, 255, 255, 0.65)', fontSize: cfg.isMicro ? 8 : 10, fontWeight: '600' }}
          />
          <TextWidget
            text="ALMS"
            style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: cfg.isMicro ? 8 : 10, fontWeight: 'bold' }}
          />
        </FlexWidget>
      </FlexWidget>
    );
  }

  // ═════════════════════════════════════════════════════════════════════════
  // NO CLASSES / ALL CAUGHT UP STATE
  // ═════════════════════════════════════════════════════════════════════════
  if (!hasClasses) {
    const badgeText = data?.todayTotalClasses && data.todayTotalClasses > 0
      ? `ALL ${data.todayTotalClasses} CLASSES DONE ✓`
      : 'ALL CAUGHT UP ✓';

    return (
      <FlexWidget
        style={{
          height: 'match_parent',
          width: 'match_parent',
          backgroundColor: '#0A1926',
          borderRadius: cfg.borderRadius,
          borderWidth: 1.2,
          borderColor: '#0284C7',
          paddingHorizontal: cfg.padH,
          paddingVertical: cfg.padV,
          justifyContent: 'space-between',
        }}
        clickAction="OPEN_APP"
      >
        {renderStackHandle()}
        {renderStackHeader(0, badgeText, 'COMPANION', 'rgba(56, 189, 248, 0.22)', '#0284C7', '#38BDF8')}

        <FlexWidget style={{ alignItems: 'center', justifyContent: 'center', flex: 1, marginVertical: 4 }}>
          <TextWidget
            text="No classes scheduled"
            style={{
              color: '#FFFFFF',
              fontSize: cfg.isMicro ? 12 : (cfg.isCompact ? 14 : 17),
              fontWeight: 'bold',
              marginBottom: 2,
            }}
          />
          {!cfg.isMicro ? (
            <TextWidget
              text={attPct > 0 ? `Attendance: ${attPct}% • Safe` : 'Enjoy your day! Tap to open ALMS.'}
              style={{
                color: 'rgba(255, 255, 255, 0.65)',
                fontSize: cfg.isCompact ? 9 : 11,
              }}
            />
          ) : null}
        </FlexWidget>

        <FlexWidget
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: 'match_parent',
          }}
        >
          <TextWidget
            text="ALMS Companion"
            style={{ color: 'rgba(255, 255, 255, 0.45)', fontSize: cfg.isMicro ? 8 : 10 }}
          />
          <TextWidget
            text="Tap to open"
            style={{ color: '#38BDF8', fontSize: cfg.isMicro ? 8 : 10, fontWeight: 'bold' }}
          />
        </FlexWidget>
      </FlexWidget>
    );
  }

  // ═════════════════════════════════════════════════════════════════════════
  // CARD 0: NEXT CLASS / ACTIVE CLASS (Utility Stack Card Design)
  // ═════════════════════════════════════════════════════════════════════════

  // Concise status badge text that never overflows on small widths
  const statusBadgeText = cfg.isNarrow || cfg.isMicro
    ? (isOngoing ? '● ACTIVE' : (isTomorrow ? 'TOMORROW' : 'NEXT'))
    : (data!.statusText || (isOngoing ? '● ACTIVE NOW' : (isTomorrow ? 'TOMORROW' : 'NEXT CLASS')));

  // Category label
  const categoryLabel = isOngoing ? 'LIVE CLASS' : (isTomorrow ? 'UPCOMING' : 'NEXT CLASS');

  // Subtitle (Course Code + Lecture/Lab Type)
  const courseCodeType = data!.subjectCode
    ? `${data!.subjectCode} • ${(data!.type || 'Lecture').toUpperCase()}`
    : (data!.type || 'Lecture').toUpperCase();

  // ── 1. ULTRA-COMPACT (1-cell height, h < 95, e.g. 4x1 or 2x1) ──
  if (cfg.isMicro) {
    return (
      <FlexWidget
        style={{
          height: 'match_parent',
          width: 'match_parent',
          backgroundColor: nextClassBg,
          borderRadius: cfg.borderRadius,
          borderWidth: 1.2,
          borderColor: nextClassBorder,
          paddingHorizontal: cfg.padH,
          paddingVertical: cfg.padV,
          justifyContent: 'space-between',
        }}
        clickAction="OPEN_APP"
      >
        {renderStackHeader(0, statusBadgeText, categoryLabel, nextClassBadgeBg, nextClassBorder, nextClassAccent)}

        {/* Row 2: Subject Title on Left, Room + Time on Right */}
        <FlexWidget
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: 'match_parent',
          }}
        >
          <FlexWidget style={{ flex: 1, marginRight: 6 }}>
            <TextWidget
              text={data!.subject}
              maxLines={1}
              truncate="END"
              style={{
                color: '#FFFFFF',
                fontSize: cfg.titleFontSize,
                fontWeight: 'bold',
              }}
            />
          </FlexWidget>
          <TextWidget
            text={data!.room && data!.room !== 'TBA' ? `📍 ${data!.room.replace(/^Room\s*/i, '')}` : data!.time.split('-')[0].trim()}
            style={{
              color: nextClassAccent,
              fontSize: 10,
              fontWeight: '800',
            }}
          />
        </FlexWidget>
      </FlexWidget>
    );
  }

  // ── 2. COMPACT (Short 2-cell, 95 <= h < 140, e.g. 2x2 or 3x2) ──
  if (cfg.isCompact) {
    return (
      <FlexWidget
        style={{
          height: 'match_parent',
          width: 'match_parent',
          backgroundColor: nextClassBg,
          borderRadius: cfg.borderRadius,
          borderWidth: 1.2,
          borderColor: nextClassBorder,
          paddingHorizontal: cfg.padH,
          paddingVertical: cfg.padV,
          justifyContent: 'space-between',
        }}
        clickAction="OPEN_APP"
      >
        {renderStackHandle()}
        {renderStackHeader(0, statusBadgeText, categoryLabel, nextClassBadgeBg, nextClassBorder, nextClassAccent)}

        {/* Time + Today Progress row */}
        <FlexWidget
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: 'match_parent',
            marginVertical: 1,
          }}
        >
          <TextWidget
            text={`⏰ ${data!.time.split('-')[0].trim()}`}
            style={{
              color: '#CBD5E1',
              fontSize: 11,
              fontWeight: '700',
            }}
          />
          {data?.todayTotalClasses ? (
            <TextWidget
              text={`${data.currentClassIndex ? `${data.currentClassIndex}/${data.todayTotalClasses}` : `${data.todayTotalClasses}`} today`}
              style={{
                color: nextClassAccent,
                fontSize: 9,
                fontWeight: '800',
              }}
            />
          ) : null}
        </FlexWidget>

        {/* Big Hero Subject Title */}
        <TextWidget
          text={data!.subject}
          maxLines={1}
          truncate="END"
          style={{
            color: '#FFFFFF',
            fontSize: cfg.titleFontSize,
            fontWeight: 'bold',
          }}
        />

        {/* Bottom Info Row */}
        <FlexWidget
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: 'match_parent',
          }}
        >
          <TextWidget
            text={data!.room && data!.room !== 'TBA' ? `📍 ${data!.room.replace(/^Room\s*/i, '')}` : '📍 TBA'}
            style={{
              color: 'rgba(255, 255, 255, 0.85)',
              fontSize: 10,
              fontWeight: '700',
            }}
          />
          <TextWidget
            text={(data!.type || 'Lecture').toUpperCase()}
            style={{
              color: nextClassAccent,
              fontSize: 9,
              fontWeight: '800',
            }}
          />
        </FlexWidget>
      </FlexWidget>
    );
  }

  // ── 3. LARGE (Tall widgets, h >= 225, e.g. 4x4, 5x4) ──
  if (cfg.isLarge) {
    const schedule = data?.todaySchedule || [];
    const upcomingList = schedule.filter(s => !s.isPast);

    return (
      <FlexWidget
        style={{
          height: 'match_parent',
          width: 'match_parent',
          backgroundColor: nextClassBg,
          borderRadius: cfg.borderRadius,
          borderWidth: 1.2,
          borderColor: nextClassBorder,
          paddingHorizontal: cfg.padH,
          paddingVertical: cfg.padV,
          justifyContent: 'space-between',
        }}
        clickAction="OPEN_APP"
      >
        {renderStackHandle()}
        {renderStackHeader(0, statusBadgeText, categoryLabel, nextClassBadgeBg, nextClassBorder, nextClassAccent)}

        {/* Hero Card Container */}
        <FlexWidget
          style={{
            width: 'match_parent',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            borderRadius: 16,
            padding: 12,
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.09)',
            marginVertical: 4,
          }}
        >
          {/* Schedule Time & Progress Badge */}
          <FlexWidget
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              width: 'match_parent',
              marginBottom: 6,
            }}
          >
            <TextWidget
              text={`⏰ ${data!.time}`}
              style={{
                color: '#E2E8F0',
                fontSize: 13,
                fontWeight: '800',
              }}
            />
            {data?.todayTotalClasses ? (
              <FlexWidget
                style={{
                  backgroundColor: 'rgba(56, 189, 248, 0.15)',
                  borderRadius: 6,
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderWidth: 1,
                  borderColor: 'rgba(56, 189, 248, 0.3)',
                }}
              >
                <TextWidget
                  text={data.currentClassIndex
                    ? `Class ${data.currentClassIndex} of ${data.todayTotalClasses} Today`
                    : `Today: ${data.todayTotalClasses} Classes`}
                  style={{ color: '#38BDF8', fontSize: 10, fontWeight: 'bold' }}
                />
              </FlexWidget>
            ) : null}
          </FlexWidget>

          {/* Subtitle Course Code */}
          <TextWidget
            text={courseCodeType}
            style={{
              color: nextClassAccent,
              fontSize: 11,
              fontWeight: '800',
              letterSpacing: 0.5,
              marginBottom: 2,
            }}
          />

          {/* Subject Title */}
          <TextWidget
            text={data!.subject}
            maxLines={2}
            truncate="END"
            style={{
              color: '#FFFFFF',
              fontSize: 20,
              fontWeight: '800',
              lineHeight: 24,
              marginBottom: 6,
            }}
          />

          {/* Room Badge */}
          <TextWidget
            text={data!.room && data!.room !== 'TBA'
              ? (data!.room.toLowerCase().startsWith('room') ? `📍 ${data!.room}` : `📍 Room ${data!.room}`)
              : '📍 Room TBA'}
            style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: 11, fontWeight: '700' }}
          />
        </FlexWidget>

        {/* Upcoming Classes Mini Timeline Preview */}
        <FlexWidget style={{ width: 'match_parent', marginVertical: 2 }}>
          <TextWidget
            text="UPCOMING TODAY"
            style={{
              color: 'rgba(255, 255, 255, 0.5)',
              fontSize: 9,
              fontWeight: '800',
              letterSpacing: 0.8,
              marginBottom: 4,
            }}
          />
          {upcomingList.length <= 1 ? (
            <TextWidget
              text="No more classes after this today ✓"
              style={{ color: 'rgba(255, 255, 255, 0.65)', fontSize: 11, fontWeight: '600' }}
            />
          ) : (
            upcomingList.slice(1, 3).map((item, idx) => (
              <FlexWidget
                key={idx}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: 6,
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  marginBottom: 3,
                }}
              >
                <TextWidget
                  text={item.time.split('-')[0].trim()}
                  style={{ color: nextClassAccent, fontSize: 10, fontWeight: '800', width: 62 }}
                />
                <FlexWidget style={{ flex: 1, marginHorizontal: 4 }}>
                  <TextWidget
                    text={item.subject}
                    maxLines={1}
                    truncate="END"
                    style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '600' }}
                  />
                </FlexWidget>
                <TextWidget
                  text={item.room ? item.room.replace(/^Room\s*/i, '') : 'TBA'}
                  style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: 10, fontWeight: '600' }}
                />
              </FlexWidget>
            ))
          )}
        </FlexWidget>

        {/* Footer */}
        <FlexWidget
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: 'match_parent',
          }}
        >
          <TextWidget
            text={attPct > 0 ? `Attendance: ${attPct}% ${isSafe ? '✓' : '⚠️'}` : 'ALMS Companion'}
            style={{ color: attColor, fontSize: 10, fontWeight: '700' }}
          />
          <TextWidget
            text={data?.cgpa ? `CGPA: ${data.cgpa}` : 'ALMS'}
            style={{ color: '#A78BFA', fontSize: 10, fontWeight: 'bold' }}
          />
        </FlexWidget>
      </FlexWidget>
    );
  }

  // ── 4. MEDIUM (Standard 4x2 / 3x2, 140 <= h < 225) — The Core Utility Stack Card ──
  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: nextClassBg,
        borderRadius: cfg.borderRadius,
        borderWidth: 1.2,
        borderColor: nextClassBorder,
        paddingHorizontal: cfg.padH,
        paddingVertical: cfg.padV,
        justifyContent: 'space-between',
      }}
      clickAction="OPEN_APP"
    >
      {/* 1. Top Handle Pill from the app */}
      {renderStackHandle()}

      {/* 2. Top Header Row: Status Badge (with time left/ends at) + Category + [‹ 1/3 ›] */}
      {renderStackHeader(0, statusBadgeText, categoryLabel, nextClassBadgeBg, nextClassBorder, nextClassAccent)}

      {/* 3. Middle Section: Subtitle (Course Code + Type) + Hero Subject Title */}
      <FlexWidget
        style={{
          width: 'match_parent',
          marginVertical: 2,
        }}
      >
        {/* Course Code + Type Tag */}
        <TextWidget
          text={courseCodeType}
          style={{
            color: nextClassAccent,
            fontSize: 10,
            fontWeight: '800',
            letterSpacing: 0.6,
            marginBottom: 2,
          }}
        />

        {/* Big Hero Subject Title */}
        <TextWidget
          text={data!.subject}
          maxLines={cfg.titleMaxLines}
          truncate="END"
          style={{
            color: '#FFFFFF',
            fontSize: cfg.titleFontSize,
            fontWeight: 'bold',
            lineHeight: cfg.titleFontSize + 4,
          }}
        />
      </FlexWidget>

      {/* 4. Footer Info Row (Directly copying the app's stackFooterRow with vertical separators) */}
      <FlexWidget
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          width: 'match_parent',
          paddingTop: 4,
          borderTopWidth: 1,
          borderTopColor: 'rgba(255, 255, 255, 0.08)',
        }}
      >
        {/* Room Info */}
        <TextWidget
          text={data!.room && data!.room !== 'TBA'
            ? (data!.room.toLowerCase().startsWith('room') ? `📍 ${data!.room}` : `📍 Room ${data!.room}`)
            : '📍 Room TBA'}
          style={{
            color: '#FFFFFF',
            fontSize: 11,
            fontWeight: '700',
          }}
        />

        {/* Separator Divider */}
        <FlexWidget
          style={{
            width: 1,
            height: 10,
            backgroundColor: 'rgba(255, 255, 255, 0.25)',
            marginHorizontal: 8,
          }}
        />

        {/* Time Info */}
        <TextWidget
          text={`⏰ ${data!.time}`}
          style={{
            color: 'rgba(255, 255, 255, 0.85)',
            fontSize: 11,
            fontWeight: '600',
          }}
        />

        {/* Separator Divider */}
        {data?.todayTotalClasses ? (
          <FlexWidget
            style={{
              width: 1,
              height: 10,
              backgroundColor: 'rgba(255, 255, 255, 0.25)',
              marginHorizontal: 8,
            }}
          />
        ) : null}

        {/* Today's Count */}
        {data?.todayTotalClasses ? (
          <TextWidget
            text={data.currentClassIndex
              ? `📚 Class ${data.currentClassIndex}/${data.todayTotalClasses}`
              : `📚 ${data.todayTotalClasses} Today`}
            style={{
              color: nextClassAccent,
              fontSize: 11,
              fontWeight: '700',
            }}
          />
        ) : null}
      </FlexWidget>
    </FlexWidget>
  );
}
