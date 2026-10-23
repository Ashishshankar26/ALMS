import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import type { WidgetInfo, ColorProp } from 'react-native-android-widget';
import {
  ApplePalette,
  getAppleWidgetConfig,
  calculateBunkMargin,
  decodeLpuRoom,
  type WidgetLayoutConfig,
} from './theme';
import { formatAppleTitle } from './NextClassWidget';

export interface QuickStatsWidgetData {
  cgpa: string;
  attendancePercent: number;
  attended: number;
  total: number;
  nextSubject: string;
  nextTime: string;
  nextRoom: string;
  hasClass: boolean;
}

export function QuickStatsWidget({
  data,
  widgetInfo,
}: {
  data?: QuickStatsWidgetData;
  widgetInfo?: WidgetInfo;
}) {
  const cfg = getAppleWidgetConfig(widgetInfo?.width, widgetInfo?.height, widgetInfo?.screenInfo);

  const attended = data?.attended ?? 0;
  const total = data?.total ?? 0;
  const bunkResult = calculateBunkMargin(attended, total, 0.75);
  const pct = data?.attendancePercent ?? bunkResult.percentage;
  const cgpa = data?.cgpa || '--';
  const decodedRoom = decodeLpuRoom(data?.nextRoom || 'TBA');
  const nextSubjectTitle = formatAppleTitle(data?.nextSubject || 'No Upcoming Class');

  // CGPA Color tier
  const cgpaNum = parseFloat(cgpa);
  const cgpaColor: ColorProp = isNaN(cgpaNum)
    ? ApplePalette.purple
    : (cgpaNum >= 9.0 ? ApplePalette.amber : (cgpaNum >= 8.0 ? ApplePalette.mint : ApplePalette.purple));
  const cgpaBg: ColorProp = isNaN(cgpaNum)
    ? ApplePalette.purpleBg
    : (cgpaNum >= 9.0 ? ApplePalette.amberBg : (cgpaNum >= 8.0 ? ApplePalette.mintBg : ApplePalette.purpleBg));
  const cgpaBorder: ColorProp = isNaN(cgpaNum)
    ? ApplePalette.purpleBorder
    : (cgpaNum >= 9.0 ? ApplePalette.amberBorder : (cgpaNum >= 8.0 ? ApplePalette.mintBorder : ApplePalette.purpleBorder));

  // ═════════════════════════════════════════════════════════════════════════
  // NO DATA STATE
  // ═════════════════════════════════════════════════════════════════════════
  if (!data) {
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
          justifyContent: 'center',
          alignItems: 'center',
        }}
        clickAction="OPEN_APP"
      >
        <TextWidget
          text="ALMS Quick Stats"
          style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '800', marginBottom: 3 }}
        />
        <TextWidget
          text="Tap to load student stats"
          style={{ color: ApplePalette.textSecondary, fontSize: 11, fontWeight: '500' }}
        />
      </FlexWidget>
    );
  }

  // ═════════════════════════════════════════════════════════════════════════
  // 1. SMALL 2x2 COMPACT METRICS (Dual Apple Metric Tiles)
  // ═════════════════════════════════════════════════════════════════════════
  if (cfg.isSmall) {
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
        {/* Top: Category Pill */}
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
              borderRadius: 14,
              paddingHorizontal: 7,
              paddingVertical: 3,
              borderWidth: 1,
              borderColor: ApplePalette.purpleBorder,
            }}
            clickAction="REFRESH_WIDGET"
          >
            <TextWidget
              text="STUDENT STATS"
              style={{ color: ApplePalette.purple, fontSize: 8.5, fontWeight: '900', letterSpacing: 0.3 }}
            />
          </FlexWidget>

          <FlexWidget
            style={{
              backgroundColor: bunkResult.bgColor,
              borderRadius: 8,
              paddingHorizontal: 6,
              paddingVertical: 2.5,
            }}
            clickAction="OPEN_URI"
            clickActionData={{ uri: 'alms://(tabs)/attendance' }}
          >
            <TextWidget
              text={bunkResult.label}
              style={{ color: bunkResult.color, fontSize: 8.5, fontWeight: '800' }}
            />
          </FlexWidget>
        </FlexWidget>

        {/* Middle: Side-by-side Hero Tiles */}
        <FlexWidget
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            width: 'match_parent',
            marginVertical: 2,
          }}
        >
          {/* CGPA */}
          <FlexWidget
            style={{ flexDirection: 'column' }}
            clickAction="OPEN_URI"
            clickActionData={{ uri: 'alms://(tabs)/results' }}
          >
            <TextWidget
              text={cgpa}
              style={{ color: '#FFFFFF', fontSize: 24, fontWeight: '900', letterSpacing: -0.5 }}
            />
            <TextWidget
              text="CGPA"
              style={{ color: ApplePalette.purple, fontSize: 9, fontWeight: '800', letterSpacing: 0.5 }}
            />
          </FlexWidget>

          {/* Attendance */}
          <FlexWidget
            style={{ flexDirection: 'column', alignItems: 'flex-end' }}
            clickAction="OPEN_URI"
            clickActionData={{ uri: 'alms://(tabs)/attendance' }}
          >
            <TextWidget
              text={`${pct}%`}
              style={{ color: '#FFFFFF', fontSize: 24, fontWeight: '900', letterSpacing: -0.5 }}
            />
            <TextWidget
              text="ATTENDANCE"
              style={{ color: bunkResult.color, fontSize: 9, fontWeight: '800', letterSpacing: 0.5 }}
            />
          </FlexWidget>
        </FlexWidget>

        {/* Bottom: Next Class Pill */}
        <FlexWidget
          style={{
            backgroundColor: ApplePalette.surfaceSubtle,
            borderRadius: 8,
            paddingHorizontal: 6,
            paddingVertical: 3,
            width: 'match_parent',
          }}
          clickAction="OPEN_URI"
          clickActionData={{ uri: 'alms://timetable' }}
        >
          <TextWidget
            text={data.hasClass ? `Next: ${nextSubjectTitle.slice(0, 16)}` : 'No more classes today'}
            maxLines={1}
            truncate="END"
            style={{ color: ApplePalette.textSecondary, fontSize: 9.5, fontWeight: '600' }}
          />
        </FlexWidget>
      </FlexWidget>
    );
  }

  // ═════════════════════════════════════════════════════════════════════════
  // 2. MEDIUM 4x2 & LARGE 4x4 (Apple Modular Glanceable Dashboard)
  // ═════════════════════════════════════════════════════════════════════════
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
      {/* ── HEADER ROW: Apple System Category & Refresh ── */}
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
            text="ACADEMIC SNAPSHOT"
            style={{
              color: ApplePalette.purple,
              fontSize: cfg.badgeFontSize,
              fontWeight: '900',
              letterSpacing: 0.3,
            }}
          />
        </FlexWidget>

        {/* Bunk Margin Status Pill */}
        <FlexWidget
          style={{
            backgroundColor: bunkResult.bgColor,
            borderRadius: 12,
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderWidth: 1,
            borderColor: bunkResult.borderColor,
          }}
          clickAction="OPEN_URI"
          clickActionData={{ uri: 'alms://(tabs)/attendance' }}
        >
          <TextWidget
            text={bunkResult.pillText}
            style={{ color: bunkResult.color, fontSize: 10, fontWeight: '800' }}
          />
        </FlexWidget>
      </FlexWidget>

      {/* ── MIDDLE: 3 Modular Glanceable Metric Cards ── */}
      <FlexWidget
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          width: 'match_parent',
          flex: 1,
          marginVertical: 4,
        }}
      >
        {/* Card 1: CGPA */}
        <FlexWidget
          style={{
            backgroundColor: ApplePalette.surfaceSubtle,
            borderRadius: 14,
            paddingHorizontal: 10,
            paddingVertical: 7,
            borderWidth: 1,
            borderColor: ApplePalette.border,
            flex: 1,
            marginRight: 4,
            justifyContent: 'space-between',
          }}
          clickAction="OPEN_URI"
          clickActionData={{ uri: 'alms://(tabs)/results' }}
        >
          <TextWidget
            text="CGPA"
            style={{ color: cgpaColor, fontSize: 9, fontWeight: '900', letterSpacing: 0.5 }}
          />
          <TextWidget
            text={cgpa}
            style={{ color: '#FFFFFF', fontSize: 24, fontWeight: '900', letterSpacing: -0.5 }}
          />
          <TextWidget
            text="Cumulative ›"
            style={{ color: ApplePalette.textTertiary, fontSize: 8.5, fontWeight: '600' }}
          />
        </FlexWidget>

        {/* Card 2: Attendance */}
        <FlexWidget
          style={{
            backgroundColor: ApplePalette.surfaceSubtle,
            borderRadius: 14,
            paddingHorizontal: 10,
            paddingVertical: 7,
            borderWidth: 1,
            borderColor: ApplePalette.border,
            flex: 1,
            marginHorizontal: 4,
            justifyContent: 'space-between',
          }}
          clickAction="OPEN_URI"
          clickActionData={{ uri: 'alms://(tabs)/attendance' }}
        >
          <TextWidget
            text="ATTENDANCE"
            style={{ color: bunkResult.color, fontSize: 9, fontWeight: '900', letterSpacing: 0.5 }}
          />
          <TextWidget
            text={`${pct}%`}
            style={{ color: '#FFFFFF', fontSize: 24, fontWeight: '900', letterSpacing: -0.5 }}
          />
          <TextWidget
            text={`${attended}/${total} Held`}
            style={{ color: ApplePalette.textTertiary, fontSize: 8.5, fontWeight: '600' }}
          />
        </FlexWidget>

        {/* Card 3: Next Class */}
        <FlexWidget
          style={{
            backgroundColor: ApplePalette.surfaceSubtle,
            borderRadius: 14,
            paddingHorizontal: 10,
            paddingVertical: 7,
            borderWidth: 1,
            borderColor: ApplePalette.border,
            flex: 1.2,
            marginLeft: 4,
            justifyContent: 'space-between',
          }}
          clickAction="OPEN_URI"
          clickActionData={{ uri: 'alms://timetable' }}
        >
          <TextWidget
            text="NEXT CLASS"
            style={{ color: ApplePalette.blue, fontSize: 9, fontWeight: '900', letterSpacing: 0.5 }}
          />
          <TextWidget
            text={data.hasClass ? nextSubjectTitle : 'All Caught Up'}
            maxLines={1}
            truncate="END"
            style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '800' }}
          />
          <TextWidget
            text={data.hasClass ? `${decodedRoom.shortLabel} • ${data.nextTime.split('–')[0].trim()}` : 'Free time'}
            maxLines={1}
            truncate="END"
            style={{ color: ApplePalette.textTertiary, fontSize: 8.5, fontWeight: '600' }}
          />
        </FlexWidget>
      </FlexWidget>

      {/* ── BOTTOM FOOTER: Deep Links ── */}
      <FlexWidget
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: 'match_parent',
          marginTop: 2,
        }}
      >
        <TextWidget
          text="ALMS Companion • Real-time Sync"
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
          <TextWidget
            text="Open Portal ›"
            style={{ color: ApplePalette.textSecondary, fontSize: 10, fontWeight: '700' }}
          />
        </FlexWidget>
      </FlexWidget>
    </FlexWidget>
  );
}
