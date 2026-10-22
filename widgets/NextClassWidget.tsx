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

// ── INTELLIGENT AUTO-RESIZING LAYOUT ENGINE ──
// Detects smartphone screen ratios, launcher cell widths/heights, and orientation
// to eliminate cramping and clipping across ALL Android phones and launchers.
export function getWidgetLayoutConfig(
  rawWidth?: number,
  rawHeight?: number,
  screenInfo?: WidgetInfo['screenInfo']
) {
  const screenW = screenInfo?.screenWidthDp && screenInfo.screenWidthDp > 0 ? screenInfo.screenWidthDp : 380;
  const screenH = screenInfo?.screenHeightDp && screenInfo.screenHeightDp > 0 ? screenInfo.screenHeightDp : 800;

  const hasValidDims = Boolean(rawWidth && rawWidth > 0 && rawHeight && rawHeight > 0);
  // Default to compact 2x2 dimensions (175 x 140) if launcher hasn't supplied dimensions yet.
  // This guarantees that initial placement NEVER overflows or renders a clipped 4x2 card into a 2x2 cell!
  const w = hasValidDims ? (rawWidth as number) : 175;
  const h = hasValidDims ? (rawHeight as number) : 140;

  // Fraction of phone screen width occupied by this widget (e.g. 2 cols on 4-col launcher ≈ 0.46)
  const widthRatio = w / screenW;

  // 1. Ultra-compact 1-row height strip (e.g. 4x1 horizontal bar, or 2x1)
  const isMicro = h < 98;

  // 2. Small Box / 2x2 detection:
  // - Occupies ≤ 62% of screen width (2 columns on any launcher)
  // - OR absolute width is < 240dp
  // - OR height is constrained (h < 132dp) and width < 290dp
  // - OR initial cold-start before launcher measures
  const isSmallBox = !isMicro && (!hasValidDims || widthRatio <= 0.62 || w < 240 || (h < 132 && w < 290));

  // 3. Large multi-row expanded card (e.g. 4x3, 4x4, 5x4)
  const isLarge = !isMicro && !isSmallBox && h >= 215 && w >= 240;

  // 4. Medium (3x2 or compact 4x2 where height or width is intermediate)
  const isMedium = !isMicro && !isSmallBox && !isLarge && (w < 310 || h < 145);

  // 5. Full Standard 4x2 desktop utility card (w >= 310 && h >= 145)
  const isFull = !isMicro && !isSmallBox && !isLarge && !isMedium;

  return {
    w,
    h,
    isSmallBox,
    isMicro,
    isMedium,
    isFull,
    isLarge,
    // Dynamic paddings tailored to size
    padH: isSmallBox ? 8 : (isMicro ? 10 : (isMedium ? 12 : 14)),
    padV: isSmallBox ? 6 : (isMicro ? 5 : (isMedium ? 8 : 10)),
    borderRadius: isSmallBox ? 16 : (isMicro ? 14 : 20),
    // Typography
    titleFontSize: isSmallBox ? 12 : (isMicro ? 12 : (isMedium ? 14 : 17)),
    badgeFontSize: isSmallBox || isMicro ? 8 : 9.5,
    // Max schedule items to display without vertical overflow
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

  // Formatted timer labels
  const timerBadgeText = isOngoing
    ? (data?.timeUntilOrLeft ? `● ${data.timeUntilOrLeft}` : '● ACTIVE NOW')
    : (data?.timeUntilOrLeft ? `● ${data.timeUntilOrLeft}` : (isTomorrow ? 'TOMORROW' : '● NEXT'));

  // Course Code fallback (e.g. "CSE316")
  const courseCodeDisplay = data?.subjectCode || (data?.subject && data.subject.length > 8 ? data.subject.slice(0, 7) + '..' : (data?.subject || 'CLASS'));

  // Top Handle Pill (rendered only on standard full & large heights where space permits)
  const renderStackHandle = () => {
    if (cfg.isSmallBox || cfg.isMicro || cfg.isMedium) return null;
    return (
      <FlexWidget
        style={{
          width: 'match_parent',
          alignItems: 'center',
          marginBottom: 4,
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
          marginBottom: cfg.isMicro ? 2 : (cfg.isSmallBox ? 3 : 4),
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
              paddingHorizontal: cfg.isSmallBox || cfg.isMicro ? 6 : 8,
              paddingVertical: cfg.isMicro ? 2 : 2.5,
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
                letterSpacing: 0.4,
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

          {/* Category label shown only when width permits (full or large) */}
          {(cfg.isFull || cfg.isLarge) ? (
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
            borderRadius: 8,
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.12)',
            paddingHorizontal: 2,
            paddingVertical: 1,
          }}
        >
          {/* Previous Card Button */}
          <FlexWidget
            style={{
              paddingHorizontal: cfg.isMicro || cfg.isSmallBox ? 4 : 5,
              paddingVertical: 1,
            }}
            clickAction="PREV_STACK"
          >
            <TextWidget
              text="‹"
              style={{
                color: '#E2E8F0',
                fontSize: cfg.isMicro || cfg.isSmallBox ? 11 : 12,
                fontWeight: '900',
              }}
            />
          </FlexWidget>

          {/* Current / Total Stack Indicator */}
          <TextWidget
            text={`${activeIdx + 1}/3`}
            style={{
              color: 'rgba(255, 255, 255, 0.75)',
              fontSize: cfg.isMicro || cfg.isSmallBox ? 8 : 9,
              fontWeight: '800',
              marginHorizontal: 1,
            }}
          />

          {/* Next Card Button */}
          <FlexWidget
            style={{
              paddingHorizontal: cfg.isMicro || cfg.isSmallBox ? 4 : 5,
              paddingVertical: 1,
            }}
            clickAction="NEXT_STACK"
          >
            <TextWidget
              text="›"
              style={{
                color: '#E2E8F0',
                fontSize: cfg.isMicro || cfg.isSmallBox ? 11 : 12,
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

    const badgeText = cfg.isSmallBox || cfg.isMicro
      ? `TODAY (${count})`
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
              text="No classes today ✓"
              style={{ color: 'rgba(255, 255, 255, 0.75)', fontSize: cfg.isSmallBox ? 11 : 13, fontWeight: '700' }}
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
                  borderRadius: 6,
                  paddingHorizontal: 6,
                  paddingVertical: cfg.isSmallBox ? 2.5 : 3.5,
                  borderWidth: 1,
                  borderColor: item.isOngoing ? '#10B981' : 'rgba(255, 255, 255, 0.08)',
                  marginBottom: cfg.isSmallBox ? 2 : 3,
                }}
              >
                {/* Course Code or Start Time */}
                <TextWidget
                  text={cfg.isSmallBox ? (item.subjectCode || item.time.split('-')[0].trim()) : item.time.split('-')[0].trim()}
                  style={{
                    color: item.isOngoing ? '#10B981' : '#E2E8F0',
                    fontSize: cfg.isSmallBox ? 9.5 : 10.5,
                    fontWeight: '800',
                    width: cfg.isSmallBox ? 50 : 62,
                  }}
                />
                {/* Subject Name / Time */}
                <FlexWidget style={{ flex: 1, marginHorizontal: 3 }}>
                  <TextWidget
                    text={cfg.isSmallBox ? item.time.split('-')[0].trim() : item.subject}
                    maxLines={1}
                    truncate="END"
                    style={{
                      color: '#FFFFFF',
                      fontSize: cfg.isSmallBox ? 9.5 : 11,
                      fontWeight: 'bold',
                    }}
                  />
                </FlexWidget>
                {/* Room */}
                <TextWidget
                  text={item.room ? item.room.replace(/^Room\s*/i, '') : 'TBA'}
                  style={{
                    color: 'rgba(255, 255, 255, 0.8)',
                    fontSize: cfg.isSmallBox ? 8.5 : 10,
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
            marginTop: 1,
          }}
        >
          <TextWidget
            text={count > pageSize
              ? `${safePage * pageSize + 1}-${Math.min((safePage + 1) * pageSize, count)} of ${count}`
              : `${count} classes`}
            style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: 8.5, fontWeight: '600' }}
          />

          {totalPages > 1 ? (
            <FlexWidget style={{ flexDirection: 'row', alignItems: 'center' }}>
              <FlexWidget
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.12)',
                  borderRadius: 5,
                  paddingHorizontal: 5,
                  paddingVertical: 1,
                  marginRight: 3,
                }}
                clickAction="PREV_SCHEDULE_PAGE"
              >
                <TextWidget
                  text="▲"
                  style={{ color: scheduleAccent, fontSize: 8.5, fontWeight: 'bold' }}
                />
              </FlexWidget>

              <FlexWidget
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.12)',
                  borderRadius: 5,
                  paddingHorizontal: 5,
                  paddingVertical: 1,
                }}
                clickAction="NEXT_SCHEDULE_PAGE"
              >
                <TextWidget
                  text="▼"
                  style={{ color: scheduleAccent, fontSize: 8.5, fontWeight: 'bold' }}
                />
              </FlexWidget>
            </FlexWidget>
          ) : (
            <TextWidget
              text="ALMS"
              style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: 8, fontWeight: 'bold' }}
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

        {/* Subtitle from the app's card (hidden on small box) */}
        {!cfg.isSmallBox && !cfg.isMicro ? (
          <TextWidget
            text="Live Attendance Tracking"
            style={{
              color: 'rgba(255, 255, 255, 0.85)',
              fontSize: 10.5,
              fontWeight: '700',
              marginBottom: 1,
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
            marginVertical: 1,
          }}
        >
          {/* Big Percentage Number */}
          <FlexWidget style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
            <TextWidget
              text={`${attPct}`}
              style={{
                color: '#FFFFFF',
                fontSize: cfg.isSmallBox ? 25 : (cfg.isLarge ? 34 : 28),
                fontWeight: '900',
                letterSpacing: -1,
              }}
            />
            <TextWidget
              text="%"
              style={{
                color: attColor,
                fontSize: cfg.isSmallBox ? 12 : 15,
                fontWeight: 'bold',
                marginLeft: 2,
              }}
            />
          </FlexWidget>

          {/* Right Summary Info */}
          <FlexWidget style={{ flexDirection: 'column', alignItems: 'flex-end' }}>
            <TextWidget
              text={`${attended}/${total}`}
              style={{
                color: '#FFFFFF',
                fontSize: cfg.isSmallBox ? 9.5 : 11,
                fontWeight: '700',
              }}
            />
            {cgpa && cgpa !== '--' && !cfg.isSmallBox ? (
              <TextWidget
                text={`CGPA: ${cgpa}`}
                style={{
                  color: '#A78BFA',
                  fontSize: 8.5,
                  fontWeight: 'bold',
                  marginTop: 1,
                }}
              />
            ) : null}
          </FlexWidget>
        </FlexWidget>

        {/* Progress Bar (rendered when space allows) */}
        {!cfg.isMicro ? (
          <FlexWidget
            style={{
              width: 'match_parent',
              height: 4,
              backgroundColor: 'rgba(255, 255, 255, 0.12)',
              borderRadius: 2,
              marginVertical: 1.5,
            }}
          >
            <FlexWidget
              style={{
                width: (Math.max(8, (cfg.w - cfg.padH * 2) * Math.min(100, Math.max(0, attPct)) / 100)) as any,
                height: 'match_parent',
                backgroundColor: attColor,
                borderRadius: 2,
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
            marginTop: 1,
          }}
        >
          <TextWidget
            text={isSafe ? 'Above 75% ✓' : 'Below 75% ⚠️'}
            style={{ color: 'rgba(255, 255, 255, 0.65)', fontSize: 8.5, fontWeight: '600' }}
          />
          <TextWidget
            text="ALMS"
            style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: 8, fontWeight: 'bold' }}
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
      ? `ALL ${data.todayTotalClasses} DONE ✓`
      : 'CAUGHT UP ✓';

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

        <FlexWidget style={{ alignItems: 'center', justifyContent: 'center', flex: 1, marginVertical: 2 }}>
          <TextWidget
            text="No classes scheduled"
            style={{
              color: '#FFFFFF',
              fontSize: cfg.isSmallBox ? 12 : 15,
              fontWeight: 'bold',
              marginBottom: 1,
            }}
          />
          {!cfg.isSmallBox ? (
            <TextWidget
              text={attPct > 0 ? `Attendance: ${attPct}% • Safe` : 'Enjoy your free time!'}
              style={{
                color: 'rgba(255, 255, 255, 0.65)',
                fontSize: 9.5,
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
            style={{ color: 'rgba(255, 255, 255, 0.45)', fontSize: 8 }}
          />
          <TextWidget
            text="Tap to open"
            style={{ color: '#38BDF8', fontSize: 8, fontWeight: 'bold' }}
          />
        </FlexWidget>
      </FlexWidget>
    );
  }

  // ═════════════════════════════════════════════════════════════════════════
  // CARD 0: NEXT CLASS / ACTIVE CLASS
  // ═════════════════════════════════════════════════════════════════════════

  // ── 1. SMALL BOX / 2x2 LAYOUT (Strictly Course Code, Room, Class Time & Timer) ──
  // Per user instruction: in 2x2 only show course code, room no, class time and the timer (not full name)
  if (cfg.isSmallBox) {
    return (
      <FlexWidget
        style={{
          height: 'match_parent',
          width: 'match_parent',
          backgroundColor: nextClassBg,
          borderRadius: cfg.borderRadius,
          borderWidth: 1.2,
          borderColor: nextClassBorder,
          paddingHorizontal: 8,
          paddingVertical: 7,
          justifyContent: 'space-between',
        }}
        clickAction="OPEN_APP"
      >
        {/* Row 1: Status Timer Badge on left + Cycler [‹ 1/3 ›] on right */}
        {renderStackHeader(0, timerBadgeText, 'LIVE', nextClassBadgeBg, nextClassBorder, nextClassAccent)}

        {/* Row 2: Big Bold Course Code (NOT full name) + Type Tag */}
        <FlexWidget
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: 'match_parent',
            marginVertical: 1,
          }}
        >
          <TextWidget
            text={courseCodeDisplay}
            style={{
              color: '#FFFFFF',
              fontSize: cfg.w < 160 ? 17 : 20,
              fontWeight: '900',
              letterSpacing: -0.5,
            }}
          />
          <FlexWidget
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              borderRadius: 5,
              paddingHorizontal: 5,
              paddingVertical: 1.5,
            }}
          >
            <TextWidget
              text={(data!.type || 'LEC').slice(0, 3).toUpperCase()}
              style={{
                color: nextClassAccent,
                fontSize: 8.5,
                fontWeight: '800',
              }}
            />
          </FlexWidget>
        </FlexWidget>

        {/* Row 3: Class Time + Room Number */}
        <FlexWidget
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: 'match_parent',
          }}
        >
          <TextWidget
            text={`⏰ ${data!.time.split('-')[0].trim()}`}
            style={{
              color: '#CBD5E1',
              fontSize: 9.5,
              fontWeight: '700',
            }}
          />
          <TextWidget
            text={data!.room && data!.room !== 'TBA' ? `📍 ${data!.room.replace(/^Room\s*/i, '')}` : '📍 TBA'}
            style={{
              color: '#FFFFFF',
              fontSize: 9.5,
              fontWeight: '800',
            }}
          />
        </FlexWidget>

        {/* Row 4: Class Progress indicator & ALMS mark (only rendered when height allows) */}
        {cfg.h >= 130 ? (
          <FlexWidget
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              width: 'match_parent',
              paddingTop: 2,
              borderTopWidth: 1,
              borderTopColor: 'rgba(255, 255, 255, 0.08)',
            }}
          >
            <TextWidget
              text={data?.todayTotalClasses
                ? (data.currentClassIndex ? `Class ${data.currentClassIndex}/${data.todayTotalClasses}` : `${data.todayTotalClasses} today`)
                : 'ALMS Companion'}
              style={{
                color: nextClassAccent,
                fontSize: 8,
                fontWeight: '800',
              }}
            />
            <TextWidget
              text="ALMS"
              style={{
                color: 'rgba(255, 255, 255, 0.4)',
                fontSize: 8,
                fontWeight: 'bold',
              }}
            />
          </FlexWidget>
        ) : null}
      </FlexWidget>
    );
  }

  // ── 2. ULTRA-COMPACT (1-cell height horizontal strip, h < 98, e.g. 4x1) ──
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
        {renderStackHeader(0, timerBadgeText, 'LIVE', nextClassBadgeBg, nextClassBorder, nextClassAccent)}

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
              text={data!.subjectCode ? `${data!.subjectCode} • ${data!.subject}` : data!.subject}
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
            text={data!.room && data!.room !== 'TBA' ? `📍 ${data!.room.replace(/^Room\s*/i, '')} • ${data!.time.split('-')[0].trim()}` : data!.time.split('-')[0].trim()}
            style={{
              color: nextClassAccent,
              fontSize: 9.5,
              fontWeight: '800',
            }}
          />
        </FlexWidget>
      </FlexWidget>
    );
  }

  // ── 3. LARGE EXPANDED (Tall widgets, h >= 215, e.g. 4x3, 4x4, 5x4) ──
  if (cfg.isLarge) {
    const schedule = data?.todaySchedule || [];
    const upcomingList = schedule.filter(s => !s.isPast);
    const categoryLabel = isOngoing ? 'LIVE CLASS' : (isTomorrow ? 'UPCOMING' : 'NEXT CLASS');
    const courseCodeType = data!.subjectCode
      ? `${data!.subjectCode} • ${(data!.type || 'Lecture').toUpperCase()}`
      : (data!.type || 'Lecture').toUpperCase();

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
        {renderStackHeader(0, data!.statusText || timerBadgeText, categoryLabel, nextClassBadgeBg, nextClassBorder, nextClassAccent)}

        {/* Hero Card Container */}
        <FlexWidget
          style={{
            width: 'match_parent',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            borderRadius: 14,
            padding: 10,
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.09)',
            marginVertical: 3,
          }}
        >
          {/* Schedule Time & Progress Badge */}
          <FlexWidget
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              width: 'match_parent',
              marginBottom: 3,
            }}
          >
            <TextWidget
              text={`⏰ ${data!.time}`}
              style={{
                color: '#E2E8F0',
                fontSize: 12,
                fontWeight: '800',
              }}
            />
            {data?.todayTotalClasses ? (
              <TextWidget
                text={data.currentClassIndex ? `Class ${data.currentClassIndex}/${data.todayTotalClasses}` : `${data.todayTotalClasses} Today`}
                style={{
                  color: nextClassAccent,
                  fontSize: 10,
                  fontWeight: '700',
                }}
              />
            ) : null}
          </FlexWidget>

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

          {/* Full Subject Name */}
          <TextWidget
            text={data!.subject}
            maxLines={2}
            truncate="END"
            style={{
              color: '#FFFFFF',
              fontSize: 16,
              fontWeight: '900',
              lineHeight: 20,
              marginBottom: 3,
            }}
          />

          {/* Room Location */}
          <TextWidget
            text={data!.room && data!.room !== 'TBA'
              ? (data!.room.toLowerCase().startsWith('room') ? `📍 ${data!.room}` : `📍 Room ${data!.room}`)
              : '📍 Room TBA'}
            style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: 10.5, fontWeight: '700' }}
          />
        </FlexWidget>

        {/* Upcoming Classes Mini Timeline Preview */}
        <FlexWidget style={{ width: 'match_parent', marginVertical: 2 }}>
          <TextWidget
            text="UPCOMING TODAY"
            style={{
              color: 'rgba(255, 255, 255, 0.5)',
              fontSize: 8.5,
              fontWeight: '800',
              letterSpacing: 0.8,
              marginBottom: 2,
            }}
          />
          {upcomingList.length <= 1 ? (
            <TextWidget
              text="No more classes after this today ✓"
              style={{ color: 'rgba(255, 255, 255, 0.65)', fontSize: 10.5, fontWeight: '600' }}
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
                  paddingVertical: 2.5,
                  marginBottom: 2,
                }}
              >
                <TextWidget
                  text={item.time.split('-')[0].trim()}
                  style={{ color: nextClassAccent, fontSize: 9.5, fontWeight: '800', width: 58 }}
                />
                <FlexWidget style={{ flex: 1, marginHorizontal: 3 }}>
                  <TextWidget
                    text={item.subject}
                    maxLines={1}
                    truncate="END"
                    style={{ color: '#FFFFFF', fontSize: 10.5, fontWeight: '600' }}
                  />
                </FlexWidget>
                <TextWidget
                  text={item.room ? item.room.replace(/^Room\s*/i, '') : 'TBA'}
                  style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: 9.5, fontWeight: '600' }}
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
            style={{ color: attColor, fontSize: 9.5, fontWeight: '700' }}
          />
          <TextWidget
            text={data?.cgpa ? `CGPA: ${data.cgpa}` : 'ALMS'}
            style={{ color: '#A78BFA', fontSize: 9.5, fontWeight: 'bold' }}
          />
        </FlexWidget>
      </FlexWidget>
    );
  }

  // ── 4. MEDIUM (3x2 or Compact 4x2, w < 310 or h < 145) ──
  // Shows 1-line subject title, course code, room and time without overflowing
  if (cfg.isMedium) {
    const mediumStatusBadge = data!.statusText || timerBadgeText;
    const courseCodeType = data!.subjectCode
      ? `${data!.subjectCode} • ${(data!.type || 'Lecture').toUpperCase()}`
      : (data!.type || 'Lecture').toUpperCase();

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
        {renderStackHeader(0, mediumStatusBadge, 'NEXT CLASS', nextClassBadgeBg, nextClassBorder, nextClassAccent)}

        {/* Middle Section: Course Code + 1-Line Subject Title */}
        <FlexWidget
          style={{
            width: 'match_parent',
            marginVertical: 1,
          }}
        >
          <TextWidget
            text={courseCodeType}
            style={{
              color: nextClassAccent,
              fontSize: 9.5,
              fontWeight: '800',
              letterSpacing: 0.5,
              marginBottom: 1,
            }}
          />
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

        {/* Clean Footer Row */}
        <FlexWidget
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: 'match_parent',
            paddingTop: 2,
            borderTopWidth: 1,
            borderTopColor: 'rgba(255, 255, 255, 0.08)',
          }}
        >
          <TextWidget
            text={data!.room && data!.room !== 'TBA' ? `📍 ${data!.room.replace(/^Room\s*/i, '')}` : '📍 TBA'}
            style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '700' }}
          />
          <TextWidget
            text={`⏰ ${data!.time}`}
            style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: 10, fontWeight: '600' }}
          />
          {data?.todayTotalClasses ? (
            <TextWidget
              text={data.currentClassIndex ? `📚 ${data.currentClassIndex}/${data.todayTotalClasses}` : `📚 ${data.todayTotalClasses}`}
              style={{ color: nextClassAccent, fontSize: 10, fontWeight: '700' }}
            />
          ) : null}
        </FlexWidget>
      </FlexWidget>
    );
  }

  // ── 5. FULL STANDARD 4x2 EXPANDED LAYOUT ──
  // The full utility stack card: shows full course title (2 lines), room, time, and progress dividers
  const fullStatusBadge = data!.statusText || (isOngoing ? '● ACTIVE NOW' : (isTomorrow ? 'TOMORROW' : 'NEXT CLASS'));
  const categoryLabel = isOngoing ? 'LIVE CLASS' : (isTomorrow ? 'UPCOMING' : 'NEXT CLASS');
  const courseCodeType = data!.subjectCode
    ? `${data!.subjectCode} • ${(data!.type || 'Lecture').toUpperCase()}`
    : (data!.type || 'Lecture').toUpperCase();

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

      {/* 2. Top Header Row: Status Badge + Category + [‹ 1/3 ›] */}
      {renderStackHeader(0, fullStatusBadge, categoryLabel, nextClassBadgeBg, nextClassBorder, nextClassAccent)}

      {/* 3. Middle Section: Subtitle (Course Code + Type) + FULL Subject Title */}
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

        {/* Full Subject Title */}
        <TextWidget
          text={data!.subject}
          maxLines={2}
          truncate="END"
          style={{
            color: '#FFFFFF',
            fontSize: cfg.titleFontSize,
            fontWeight: 'bold',
            lineHeight: cfg.titleFontSize + 4,
          }}
        />
      </FlexWidget>

      {/* 4. Footer Info Row with Clean Dividers */}
      <FlexWidget
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          width: 'match_parent',
          paddingTop: 3,
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
            fontSize: 10.5,
            fontWeight: '700',
          }}
        />

        {/* Separator Divider */}
        <FlexWidget
          style={{
            width: 1,
            height: 9,
            backgroundColor: 'rgba(255, 255, 255, 0.25)',
            marginHorizontal: 6,
          }}
        />

        {/* Time Info */}
        <TextWidget
          text={`⏰ ${data!.time}`}
          style={{
            color: 'rgba(255, 255, 255, 0.85)',
            fontSize: 10.5,
            fontWeight: '600',
          }}
        />

        {/* Separator Divider */}
        {data?.todayTotalClasses ? (
          <FlexWidget
            style={{
              width: 1,
              height: 9,
              backgroundColor: 'rgba(255, 255, 255, 0.25)',
              marginHorizontal: 6,
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
              fontSize: 10.5,
              fontWeight: '700',
            }}
          />
        ) : null}
      </FlexWidget>
    </FlexWidget>
  );
}
