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

// Adaptive layout tiers based on widget width and height (dp)
function getLayoutTier(width: number, height: number): 'compact' | 'medium' | 'large' {
  if (width < 200 || height < 115) return 'compact';
  if (height >= 230) return 'large';
  return 'medium';
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
  const tier = getLayoutTier(w, h);

  const isCompact = tier === 'compact';
  const isLarge = tier === 'large';

  const stackIndex = data?.stackIndex ?? 0;
  const hasClasses = Boolean(data && data.status !== 'no_classes' && data.subject);

  // Theme accents based on class status
  const isOngoing = data?.status === 'ongoing';
  const isTomorrow = data?.status === 'tomorrow';
  const isLab = Boolean(
    (data?.type || '').toLowerCase().includes('lab') ||
    (data?.type || '').toLowerCase().includes('practical')
  );

  const accentColor: ColorProp = isOngoing ? '#10B981' : (isTomorrow ? '#A855F7' : (isLab ? '#06B6D4' : '#6366F1'));
  const statusBg: ColorProp = isOngoing ? 'rgba(16, 185, 129, 0.22)' : (isTomorrow ? 'rgba(168, 85, 247, 0.22)' : 'rgba(99, 102, 241, 0.22)');
  const accentLight: ColorProp = isOngoing ? 'rgba(16, 185, 129, 0.15)' : (isTomorrow ? 'rgba(168, 85, 247, 0.15)' : (isLab ? 'rgba(6, 182, 212, 0.15)' : 'rgba(99, 102, 241, 0.15)'));

  const attPct = data?.overallAttendance ?? 0;
  const attColor: ColorProp = attPct >= 80 ? '#10B981' : (attPct >= 75 ? '#F59E0B' : '#EF4444');
  const attBg: ColorProp = attPct >= 80 ? 'rgba(16, 185, 129, 0.2)' : (attPct >= 75 ? 'rgba(245, 158, 11, 0.2)' : 'rgba(239, 68, 68, 0.2)');

  // Full Navigation Bar with Left ‹, Center Status / Refresh, and Right › Stack Navigator
  const renderNavBar = (activeIdx: number, centerPill: React.ReactNode, compact: boolean = false) => {
    const dots = activeIdx === 0 ? '● ○ ○' : (activeIdx === 1 ? '○ ● ○' : '○ ○ ●');
    return (
      <FlexWidget
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: 'match_parent',
        }}
      >
        {/* Left side: Previous Card Arrow + Center Pill */}
        <FlexWidget
          style={{
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          {/* Previous Card ‹ (Simulates Swipe Left) */}
          <FlexWidget
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              borderRadius: 8,
              paddingHorizontal: compact ? 7 : 10,
              paddingVertical: compact ? 3 : 5,
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.15)',
              marginRight: 6,
            }}
            clickAction="PREV_STACK"
          >
            <TextWidget
              text="‹"
              style={{
                color: '#E2E8F0',
                fontSize: compact ? 12 : 15,
                fontWeight: 'bold',
              }}
            />
          </FlexWidget>

          {centerPill}
        </FlexWidget>

        {/* Right side: Dots Indicator + Next Card Arrow › (Simulates Swipe Right) */}
        <FlexWidget
          style={{
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          {/* Dots Indicator */}
          <FlexWidget
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              borderRadius: 8,
              paddingHorizontal: compact ? 6 : 8,
              paddingVertical: compact ? 3 : 5,
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.12)',
              marginRight: 4,
            }}
            clickAction="NEXT_STACK"
          >
            <TextWidget
              text={dots}
              style={{
                color: '#A78BFA',
                fontSize: compact ? 8 : 10,
                fontWeight: 'bold',
                letterSpacing: compact ? 1 : 2,
              }}
            />
          </FlexWidget>

          {/* Next Card › */}
          <FlexWidget
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              borderRadius: 8,
              paddingHorizontal: compact ? 7 : 10,
              paddingVertical: compact ? 3 : 5,
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.15)',
            }}
            clickAction="NEXT_STACK"
          >
            <TextWidget
              text="›"
              style={{
                color: '#E2E8F0',
                fontSize: compact ? 12 : 15,
                fontWeight: 'bold',
              }}
            />
          </FlexWidget>
        </FlexWidget>
      </FlexWidget>
    );
  };

  // ═════════════════════════════════════════════════════════════════════════
  // CARD 1: TODAY'S SCHEDULE VIEW (With Up/Down Pagination & Scroll Support)
  // ═════════════════════════════════════════════════════════════════════════
  if (stackIndex === 1 && !isLarge) {
    const schedule = data?.todaySchedule || [];
    const count = schedule.length;
    const pageSize = isCompact ? 2 : 3;
    const totalPages = Math.max(1, Math.ceil(count / pageSize));
    const rawPage = data?.schedulePage ?? 0;
    const safePage = ((rawPage % totalPages) + totalPages) % totalPages;
    const visibleClasses = schedule.slice(safePage * pageSize, (safePage + 1) * pageSize);

    const schedulePill = (
      <FlexWidget
        style={{
          backgroundColor: 'rgba(56, 189, 248, 0.18)',
          borderRadius: 8,
          paddingHorizontal: isCompact ? 6 : 10,
          paddingVertical: isCompact ? 3 : 5,
          borderWidth: 1,
          borderColor: '#38BDF8',
          flexDirection: 'row',
          alignItems: 'center',
        }}
        clickAction="REFRESH_WIDGET"
      >
        <TextWidget
          text={`TODAY • ${count} ${count === 1 ? 'CLASS' : 'CLASSES'}`}
          style={{
            color: '#38BDF8',
            fontSize: isCompact ? 9 : 11,
            fontWeight: 'bold',
          }}
        />
        <TextWidget
          text=" ↻"
          style={{
            color: '#38BDF8',
            fontSize: isCompact ? 9 : 11,
            fontWeight: 'bold',
          }}
        />
      </FlexWidget>
    );

    return (
      <FlexWidget
        style={{
          height: 'match_parent',
          width: 'match_parent',
          backgroundColor: '#0A0C12',
          borderRadius: isCompact ? 16 : 22,
          borderWidth: 1,
          borderColor: 'rgba(255, 255, 255, 0.12)',
          padding: isCompact ? 10 : 14,
          justifyContent: 'space-between',
        }}
        clickAction="OPEN_APP"
      >
        {/* Navigation Bar */}
        {renderNavBar(1, schedulePill, isCompact)}

        {/* Schedule List Items */}
        {schedule.length === 0 ? (
          <FlexWidget style={{ alignItems: 'center', justifyContent: 'center', flex: 1 }}>
            <TextWidget
              text="No classes scheduled for today ✓"
              style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: isCompact ? 11 : 13, fontWeight: '600' }}
            />
          </FlexWidget>
        ) : (
          <FlexWidget style={{ width: 'match_parent', flexDirection: 'column', marginVertical: 4 }}>
            {visibleClasses.map((item, idx) => (
              <FlexWidget
                key={idx}
                style={{
                  width: 'match_parent',
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: item.isOngoing ? 'rgba(16, 185, 129, 0.18)' : 'rgba(255, 255, 255, 0.06)',
                  borderRadius: 8,
                  paddingHorizontal: isCompact ? 6 : 10,
                  paddingVertical: isCompact ? 4 : 6,
                  borderWidth: 1,
                  borderColor: item.isOngoing ? '#10B981' : 'rgba(255, 255, 255, 0.08)',
                  marginBottom: isCompact ? 4 : 5,
                }}
              >
                <TextWidget
                  text={item.time.split('-')[0].trim()}
                  style={{
                    color: item.isOngoing ? '#10B981' : '#E2E8F0',
                    fontSize: isCompact ? 9 : 11,
                    fontWeight: '700',
                    width: isCompact ? 54 : 68,
                  }}
                />
                <FlexWidget style={{ flex: 1, marginHorizontal: 4 }}>
                  <TextWidget
                    text={item.subject}
                    maxLines={1}
                    truncate="END"
                    style={{
                      color: '#FFFFFF',
                      fontSize: isCompact ? 10 : 12,
                      fontWeight: 'bold',
                    }}
                  />
                </FlexWidget>
                <TextWidget
                  text={item.room ? item.room.replace(/^Room\s*/i, '') : 'TBA'}
                  style={{
                    color: 'rgba(255, 255, 255, 0.75)',
                    fontSize: isCompact ? 9 : 11,
                    fontWeight: '600',
                  }}
                />
              </FlexWidget>
            ))}
          </FlexWidget>
        )}

        {/* Footer info + Up/Down Pagination for scrolling through classes */}
        <FlexWidget
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: 'match_parent',
          }}
        >
          <TextWidget
            text={count > pageSize ? `${safePage * pageSize + 1}-${Math.min((safePage + 1) * pageSize, count)} of ${count} classes` : `${count} total classes`}
            style={{ color: 'rgba(255, 255, 255, 0.55)', fontSize: isCompact ? 8 : 10 }}
          />

          {totalPages > 1 ? (
            <FlexWidget style={{ flexDirection: 'row', alignItems: 'center' }}>
              <FlexWidget
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.12)',
                  borderRadius: 6,
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  marginRight: 4,
                }}
                clickAction="PREV_SCHEDULE_PAGE"
              >
                <TextWidget
                  text="▲ Prev"
                  style={{ color: '#38BDF8', fontSize: isCompact ? 8 : 10, fontWeight: 'bold' }}
                />
              </FlexWidget>

              <FlexWidget
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.12)',
                  borderRadius: 6,
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                }}
                clickAction="NEXT_SCHEDULE_PAGE"
              >
                <TextWidget
                  text="▼ Next"
                  style={{ color: '#38BDF8', fontSize: isCompact ? 8 : 10, fontWeight: 'bold' }}
                />
              </FlexWidget>
            </FlexWidget>
          ) : (
            <TextWidget
              text="ALMS"
              style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: isCompact ? 8 : 10, fontWeight: 'bold' }}
            />
          )}
        </FlexWidget>
      </FlexWidget>
    );
  }

  // ═════════════════════════════════════════════════════════════════════════
  // CARD 2: ATTENDANCE & STATS STACK VIEW
  // ═════════════════════════════════════════════════════════════════════════
  if (stackIndex === 2 && !isLarge) {
    const total = data?.totalClasses ?? 0;
    const attended = data?.attendedClasses ?? 0;
    const cgpa = data?.cgpa || '--';

    const attPill = (
      <FlexWidget
        style={{
          backgroundColor: attBg,
          borderRadius: 8,
          paddingHorizontal: isCompact ? 6 : 10,
          paddingVertical: isCompact ? 3 : 5,
          borderWidth: 1,
          borderColor: attColor,
          flexDirection: 'row',
          alignItems: 'center',
        }}
        clickAction="REFRESH_WIDGET"
      >
        <TextWidget
          text={attPct >= 75 ? 'ATTENDANCE SAFE' : 'ATTENDANCE WARNING'}
          style={{
            color: attColor,
            fontSize: isCompact ? 9 : 11,
            fontWeight: 'bold',
          }}
        />
        <TextWidget
          text=" ↻"
          style={{
            color: attColor,
            fontSize: isCompact ? 9 : 11,
            fontWeight: 'bold',
          }}
        />
      </FlexWidget>
    );

    return (
      <FlexWidget
        style={{
          height: 'match_parent',
          width: 'match_parent',
          backgroundColor: '#0A0C12',
          borderRadius: isCompact ? 16 : 22,
          borderWidth: 1,
          borderColor: 'rgba(255, 255, 255, 0.12)',
          padding: isCompact ? 10 : 14,
          justifyContent: 'space-between',
        }}
        clickAction="OPEN_APP"
      >
        {/* Navigation Bar */}
        {renderNavBar(2, attPill, isCompact)}

        {/* Big percentage & stats row */}
        <FlexWidget
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: 'match_parent',
            marginVertical: 4,
          }}
        >
          <FlexWidget style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TextWidget
              text={`${attPct}`}
              style={{
                color: attColor,
                fontSize: isCompact ? 28 : 36,
                fontWeight: '900',
              }}
            />
            <TextWidget
              text="%"
              style={{
                color: attColor,
                fontSize: isCompact ? 14 : 18,
                fontWeight: 'bold',
                marginLeft: 2,
              }}
            />
          </FlexWidget>

          <FlexWidget style={{ flexDirection: 'column', alignItems: 'flex-end' }}>
            <TextWidget
              text={`${attended} / ${total} Present`}
              style={{
                color: '#FFFFFF',
                fontSize: isCompact ? 10 : 13,
                fontWeight: '700',
              }}
            />
            {cgpa ? (
              <TextWidget
                text={`CGPA: ${cgpa}`}
                style={{
                  color: '#A78BFA',
                  fontSize: isCompact ? 9 : 12,
                  fontWeight: 'bold',
                  marginTop: 2,
                }}
              />
            ) : null}
          </FlexWidget>
        </FlexWidget>

        {/* Progress bar */}
        <FlexWidget
          style={{
            width: 'match_parent',
            height: isCompact ? 6 : 8,
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            borderRadius: 4,
          }}
        >
          <FlexWidget
            style={{
              width: (w * Math.min(100, Math.max(0, attPct)) / 100) as any,
              height: 'match_parent',
              backgroundColor: attColor,
              borderRadius: 4,
            }}
          />
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
            text={attPct >= 75 ? 'Above 75% requirement ✓' : 'Below 75% requirement ⚠️'}
            style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: isCompact ? 8 : 10 }}
          />
          <TextWidget
            text="ALMS"
            style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: isCompact ? 8 : 10, fontWeight: 'bold' }}
          />
        </FlexWidget>
      </FlexWidget>
    );
  }

  // ═════════════════════════════════════════════════════════════════════════
  // NO CLASSES / EMPTY STATE
  // ═════════════════════════════════════════════════════════════════════════
  if (!hasClasses) {
    const emptyPill = (
      <FlexWidget
        style={{
          backgroundColor: 'rgba(16, 185, 129, 0.18)',
          borderRadius: 8,
          paddingHorizontal: isCompact ? 6 : 10,
          paddingVertical: isCompact ? 3 : 5,
          borderWidth: 1,
          borderColor: '#10B981',
          flexDirection: 'row',
          alignItems: 'center',
        }}
        clickAction="REFRESH_WIDGET"
      >
        <TextWidget
          text="ALL CAUGHT UP ✓"
          style={{
            color: '#10B981',
            fontSize: isCompact ? 9 : 11,
            fontWeight: 'bold',
          }}
        />
        <TextWidget
          text=" ↻"
          style={{
            color: '#10B981',
            fontSize: isCompact ? 9 : 11,
            fontWeight: 'bold',
          }}
        />
      </FlexWidget>
    );

    return (
      <FlexWidget
        style={{
          height: 'match_parent',
          width: 'match_parent',
          backgroundColor: '#0A0C12',
          borderRadius: isCompact ? 16 : 22,
          borderWidth: 1,
          borderColor: 'rgba(255, 255, 255, 0.12)',
          padding: isCompact ? 10 : 16,
          justifyContent: 'space-between',
        }}
        clickAction="OPEN_APP"
      >
        {renderNavBar(stackIndex, emptyPill, isCompact)}

        <FlexWidget style={{ alignItems: 'center', justifyContent: 'center', marginVertical: 6 }}>
          <TextWidget
            text="No classes scheduled"
            style={{
              color: '#FFFFFF',
              fontSize: isCompact ? 13 : 16,
              fontWeight: 'bold',
              marginBottom: 4,
            }}
          />
          <TextWidget
            text={attPct > 0 ? `Attendance: ${attPct}% • Safe` : 'Enjoy your day! Tap to open ALMS.'}
            style={{
              color: 'rgba(255, 255, 255, 0.6)',
              fontSize: isCompact ? 10 : 12,
            }}
          />
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
            style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: isCompact ? 8 : 10 }}
          />
          <TextWidget
            text="Tap to open"
            style={{ color: '#10B981', fontSize: isCompact ? 8 : 10, fontWeight: 'bold' }}
          />
        </FlexWidget>
      </FlexWidget>
    );
  }

  // ═════════════════════════════════════════════════════════════════════════
  // COMPACT (2x2) LAYOUT
  // ═════════════════════════════════════════════════════════════════════════
  if (isCompact) {
    const compactPill = (
      <FlexWidget
        style={{
          backgroundColor: statusBg,
          borderRadius: 6,
          paddingHorizontal: 6,
          paddingVertical: 2,
          borderWidth: 1,
          borderColor: accentColor,
          flexDirection: 'row',
          alignItems: 'center',
        }}
        clickAction="REFRESH_WIDGET"
      >
        <TextWidget
          text={isOngoing ? '● ACTIVE' : (isTomorrow ? 'TMR' : 'NEXT')}
          style={{ color: accentColor, fontSize: 8, fontWeight: 'bold' }}
        />
        <TextWidget
          text=" ↻"
          style={{ color: accentColor, fontSize: 8, fontWeight: 'bold' }}
        />
      </FlexWidget>
    );

    return (
      <FlexWidget
        style={{
          height: 'match_parent',
          width: 'match_parent',
          backgroundColor: '#0A0C12',
          borderRadius: 16,
          borderWidth: 1,
          borderColor: 'rgba(255, 255, 255, 0.12)',
          padding: 10,
          justifyContent: 'space-between',
        }}
        clickAction="OPEN_APP"
      >
        {/* Navigation Bar */}
        {renderNavBar(0, compactPill, true)}

        {/* Time display + Today total classes badge */}
        <FlexWidget
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: 'match_parent',
          }}
        >
          <TextWidget
            text={data!.time}
            style={{ color: '#E2E8F0', fontSize: 10, fontWeight: '700' }}
          />
          {data?.todayTotalClasses ? (
            <TextWidget
              text={`${data.currentClassIndex ? `${data.currentClassIndex}/${data.todayTotalClasses}` : `${data.todayTotalClasses}`} today`}
              style={{ color: '#38BDF8', fontSize: 8, fontWeight: '700' }}
            />
          ) : null}
        </FlexWidget>

        {/* Subject Name - Big & bold */}
        <TextWidget
          text={data!.subject}
          maxLines={2}
          truncate="END"
          style={{
            color: '#FFFFFF',
            fontSize: 13,
            fontWeight: 'bold',
            lineHeight: 16,
          }}
        />

        {/* Bottom row: Room + Type full-width pills */}
        <FlexWidget
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            width: 'match_parent',
          }}
        >
          <FlexWidget
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.09)',
              borderRadius: 6,
              paddingHorizontal: 6,
              paddingVertical: 3,
              flex: 1,
              alignItems: 'center',
              marginRight: 4,
            }}
          >
            <TextWidget
              text={data!.room && data!.room !== 'TBA' ? data!.room.replace(/^Room\s*/i, '📍 ') : '📍 TBA'}
              style={{ color: '#FFFFFF', fontSize: 9, fontWeight: 'bold' }}
            />
          </FlexWidget>

          <FlexWidget
            style={{
              backgroundColor: accentLight,
              borderRadius: 6,
              paddingHorizontal: 6,
              paddingVertical: 3,
              borderWidth: 1,
              borderColor: accentColor,
            }}
          >
            <TextWidget
              text={(data!.type || 'LEC').slice(0, 3).toUpperCase()}
              style={{ color: accentColor, fontSize: 8, fontWeight: 'bold' }}
            />
          </FlexWidget>
        </FlexWidget>
      </FlexWidget>
    );
  }

  // ═════════════════════════════════════════════════════════════════════════
  // LARGE (4x4, 4x5, 5x6) LAYOUT — Full Details + Complete Timeline
  // ═════════════════════════════════════════════════════════════════════════
  if (isLarge) {
    const schedule = data?.todaySchedule || [];
    const upcomingList = schedule.filter(s => !s.isPast);

    const largePill = (
      <FlexWidget
        style={{
          backgroundColor: statusBg,
          borderRadius: 12,
          paddingHorizontal: 14,
          paddingVertical: 6,
          borderWidth: 1,
          borderColor: accentColor,
          flexDirection: 'row',
          alignItems: 'center',
        }}
        clickAction="REFRESH_WIDGET"
      >
        <TextWidget
          text={data!.statusText || (isOngoing ? '● LIVE NOW' : (isTomorrow ? 'TOMORROW' : 'NEXT CLASS'))}
          style={{
            color: accentColor,
            fontSize: 13,
            fontWeight: 'bold',
          }}
        />
        <TextWidget
          text=" ↻"
          style={{
            color: accentColor,
            fontSize: 13,
            fontWeight: 'bold',
          }}
        />
      </FlexWidget>
    );

    return (
      <FlexWidget
        style={{
          height: 'match_parent',
          width: 'match_parent',
          backgroundColor: '#0A0C12',
          borderRadius: 24,
          borderWidth: 1,
          borderColor: 'rgba(255, 255, 255, 0.12)',
          padding: 18,
          justifyContent: 'space-between',
        }}
        clickAction="OPEN_APP"
      >
        {/* Navigation Bar */}
        {renderNavBar(stackIndex, largePill, false)}

        {/* Main Hero Card for Current / Next Class */}
        <FlexWidget
          style={{
            width: 'match_parent',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            borderRadius: 16,
            padding: 14,
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.09)',
            marginVertical: 6,
          }}
        >
          {/* Schedule Time Pill */}
          <FlexWidget
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              width: 'match_parent',
              marginBottom: 8,
            }}
          >
            <TextWidget
              text={`⏰ ${data!.time}`}
              style={{
                color: '#E2E8F0',
                fontSize: 14,
                fontWeight: '800',
              }}
            />
            <FlexWidget style={{ flexDirection: 'row', alignItems: 'center' }}>
              {data?.todayTotalClasses ? (
                <FlexWidget
                  style={{
                    backgroundColor: 'rgba(56, 189, 248, 0.15)',
                    borderRadius: 8,
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderWidth: 1,
                    borderColor: 'rgba(56, 189, 248, 0.3)',
                    marginRight: 6,
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
              <FlexWidget
                style={{
                  backgroundColor: accentLight,
                  borderRadius: 8,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderWidth: 1,
                  borderColor: accentColor,
                }}
              >
                <TextWidget
                  text={(data!.type || 'Lecture').toUpperCase()}
                  style={{ color: accentColor, fontSize: 11, fontWeight: 'bold' }}
                />
              </FlexWidget>
            </FlexWidget>
          </FlexWidget>

          {/* Subject Title */}
          <TextWidget
            text={data!.subject}
            maxLines={2}
            truncate="END"
            style={{
              color: '#FFFFFF',
              fontSize: 20,
              fontWeight: '800',
              lineHeight: 25,
              marginBottom: 10,
            }}
          />

          {/* Expanded Info Pills */}
          <FlexWidget
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              width: 'match_parent',
            }}
          >
            <FlexWidget
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.09)',
                borderRadius: 10,
                paddingHorizontal: 12,
                paddingVertical: 7,
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.12)',
                flex: 1.2,
                alignItems: 'center',
                marginRight: 8,
              }}
            >
              <TextWidget
                text={data!.room && data!.room !== 'TBA'
                  ? (data!.room.toLowerCase().startsWith('room') ? `📍 ${data!.room}` : `📍 Room ${data!.room}`)
                  : '📍 Room TBA'}
                style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}
              />
            </FlexWidget>

            {data!.subjectCode ? (
              <FlexWidget
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.09)',
                  borderRadius: 10,
                  paddingHorizontal: 12,
                  paddingVertical: 7,
                  borderWidth: 1,
                  borderColor: 'rgba(255, 255, 255, 0.12)',
                  flex: 1,
                  alignItems: 'center',
                }}
              >
                <TextWidget
                  text={data!.subjectCode}
                  style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: 12, fontWeight: '700' }}
                />
              </FlexWidget>
            ) : null}
          </FlexWidget>
        </FlexWidget>

        {/* Schedule Timeline Section */}
        <FlexWidget
          style={{
            width: 'match_parent',
            flexDirection: 'column',
          }}
        >
          <TextWidget
            text="TODAY'S TIMELINE"
            style={{
              color: 'rgba(255, 255, 255, 0.5)',
              fontSize: 10,
              fontWeight: '800',
              letterSpacing: 1.5,
              marginBottom: 4,
            }}
          />

          {upcomingList.length <= 1 ? (
            <FlexWidget
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.04)',
                borderRadius: 10,
                padding: 10,
                alignItems: 'center',
              }}
            >
              <TextWidget
                text={attPct > 0 ? `Attendance: ${attPct}% • Safe` : 'All other classes complete for today ✓'}
                style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: 12, fontWeight: '600' }}
              />
            </FlexWidget>
          ) : (
            upcomingList.slice(1, 4).map((item, idx) => (
              <FlexWidget
                key={idx}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: 10,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderWidth: 1,
                  borderColor: 'rgba(255, 255, 255, 0.07)',
                  marginBottom: 6,
                }}
              >
                <TextWidget
                  text={item.time.split('-')[0].trim()}
                  style={{ color: '#38BDF8', fontSize: 12, fontWeight: '700', width: 70 }}
                />
                <FlexWidget style={{ flex: 1, marginHorizontal: 6 }}>
                  <TextWidget
                    text={item.subject}
                    maxLines={1}
                    truncate="END"
                    style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '600' }}
                  />
                </FlexWidget>
                <TextWidget
                  text={item.room ? item.room.replace(/^Room\s*/i, '') : 'TBA'}
                  style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: 11, fontWeight: '600' }}
                />
              </FlexWidget>
            ))
          )}
        </FlexWidget>

        {/* Bottom bar: Academic Stats & ALMS branding */}
        <FlexWidget
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: 'match_parent',
            marginTop: 4,
          }}
        >
          <TextWidget
            text={attPct > 0 ? `Attendance: ${attPct}% ${attPct >= 75 ? '✓' : '⚠️'}` : 'ALMS Companion'}
            style={{ color: attColor, fontSize: 11, fontWeight: '700' }}
          />
          <TextWidget
            text={data?.cgpa ? `CGPA: ${data.cgpa}` : 'ALMS'}
            style={{ color: '#A78BFA', fontSize: 11, fontWeight: 'bold' }}
          />
        </FlexWidget>
      </FlexWidget>
    );
  }

  // ═════════════════════════════════════════════════════════════════════════
  // MEDIUM (4x2 / 3x2) LAYOUT — The Standard Default Home Screen Size
  // ═════════════════════════════════════════════════════════════════════════
  const mediumPill = (
    <FlexWidget
      style={{
        backgroundColor: statusBg,
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderWidth: 1,
        borderColor: accentColor,
        flexDirection: 'row',
        alignItems: 'center',
      }}
      clickAction="REFRESH_WIDGET"
    >
      <TextWidget
        text={data!.statusText || (isOngoing ? '● ACTIVE NOW' : (isTomorrow ? 'TOMORROW' : 'NEXT CLASS'))}
        style={{
          color: accentColor,
          fontSize: 11,
          fontWeight: 'bold',
        }}
      />
      <TextWidget
        text=" ↻"
        style={{
          color: accentColor,
          fontSize: 11,
          fontWeight: 'bold',
        }}
      />
    </FlexWidget>
  );

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: '#0A0C12',
        borderRadius: 22,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.12)',
        padding: 14,
        justifyContent: 'space-between',
      }}
      clickAction="OPEN_APP"
    >
      {/* Header Row with Left ‹ and Right › Navigation + Live Refresh */}
      {renderNavBar(0, mediumPill, false)}

      {/* Middle Row: Schedule Time, Today's Class Count & Subject Title */}
      <FlexWidget
        style={{
          width: 'match_parent',
          marginVertical: 4,
        }}
      >
        <FlexWidget
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: 'match_parent',
            marginBottom: 2,
          }}
        >
          <TextWidget
            text={`⏰ ${data!.time}`}
            style={{
              color: '#CBD5E1',
              fontSize: 12,
              fontWeight: '700',
            }}
          />
          {data?.todayTotalClasses ? (
            <FlexWidget
              style={{
                backgroundColor: 'rgba(56, 189, 248, 0.15)',
                borderRadius: 6,
                paddingHorizontal: 7,
                paddingVertical: 2,
                borderWidth: 1,
                borderColor: 'rgba(56, 189, 248, 0.3)',
              }}
            >
              <TextWidget
                text={data.currentClassIndex
                  ? `📚 Class ${data.currentClassIndex} of ${data.todayTotalClasses} Today`
                  : `📚 ${data.todayTotalClasses} Classes Today`}
                style={{
                  color: '#38BDF8',
                  fontSize: 10,
                  fontWeight: '700',
                }}
              />
            </FlexWidget>
          ) : null}
        </FlexWidget>
        <TextWidget
          text={data!.subject}
          maxLines={2}
          truncate="END"
          style={{
            color: '#FFFFFF',
            fontSize: 17,
            fontWeight: 'bold',
            lineHeight: 21,
          }}
        />
      </FlexWidget>

      {/* Bottom Info Pills: EXPANDED across full width to eliminate empty space */}
      <FlexWidget
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          width: 'match_parent',
        }}
      >
        {/* Room Pill */}
        <FlexWidget
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
            borderRadius: 10,
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.12)',
            flex: 1.2,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 6,
          }}
        >
          <TextWidget
            text={data!.room && data!.room !== 'TBA'
              ? (data!.room.toLowerCase().startsWith('room') ? `📍 ${data!.room}` : `📍 Room ${data!.room}`)
              : '📍 Room TBA'}
            style={{
              color: '#FFFFFF',
              fontSize: 12,
              fontWeight: '700',
            }}
          />
        </FlexWidget>

        {/* Subject Code Pill */}
        {data!.subjectCode ? (
          <FlexWidget
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              borderRadius: 10,
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.12)',
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 6,
            }}
          >
            <TextWidget
              text={data!.subjectCode}
              style={{
                color: 'rgba(255, 255, 255, 0.85)',
                fontSize: 12,
                fontWeight: '700',
              }}
            />
          </FlexWidget>
        ) : null}

        {/* Type Pill */}
        <FlexWidget
          style={{
            backgroundColor: accentLight,
            borderRadius: 10,
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderWidth: 1,
            borderColor: accentColor,
            flex: 0.9,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <TextWidget
            text={(data!.type || 'Lecture').toUpperCase()}
            style={{
              color: accentColor,
              fontSize: 11,
              fontWeight: '800',
            }}
          />
        </FlexWidget>
      </FlexWidget>
    </FlexWidget>
  );
}
