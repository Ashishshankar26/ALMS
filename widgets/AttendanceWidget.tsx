import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import type { WidgetInfo, ColorProp } from 'react-native-android-widget';
import {
  ApplePalette,
  getAppleWidgetConfig,
  calculateBunkMargin,
  type WidgetLayoutConfig,
} from './theme';

export interface AttendanceWidgetData {
  overallPercentage: number;
  attended: number;
  total: number;
  dutyLeaves: number;
  bonusAttendance: number;
  subjectCount: number;
  criticalCount: number; // subjects below 75%
}

export function AttendanceWidget({
  data,
  widgetInfo,
}: {
  data?: AttendanceWidgetData;
  widgetInfo?: WidgetInfo;
}) {
  const cfg = getAppleWidgetConfig(widgetInfo?.width, widgetInfo?.height, widgetInfo?.screenInfo);

  const attended = (data?.attended ?? 0) + (data?.dutyLeaves ?? 0) + (data?.bonusAttendance ?? 0);
  const total = data?.total ?? 0;
  const bunkResult = calculateBunkMargin(attended, total, 0.75);
  const pct = data?.overallPercentage ?? bunkResult.percentage;

  // ═════════════════════════════════════════════════════════════════════════
  // NO DATA / NOT LOGGED IN STATE
  // ═════════════════════════════════════════════════════════════════════════
  if (!data || total === 0) {
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
        clickAction="OPEN_URI"
        clickActionData={{ uri: 'alms://(tabs)/attendance' }}
      >
        <TextWidget
          text="ALMS Attendance"
          style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '800', marginBottom: 3 }}
        />
        <TextWidget
          text="Tap to synchronize attendance"
          style={{ color: ApplePalette.textSecondary, fontSize: 11, fontWeight: '500' }}
        />
      </FlexWidget>
    );
  }

  // ═════════════════════════════════════════════════════════════════════════
  // 1. SMALL 2x2 WIDGET VARIANT (Apple Glanceable Focus)
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
        {/* Top: Apple Activity Badge */}
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
            clickAction="REFRESH_WIDGET"
          >
            <TextWidget
              text={bunkResult.label}
              style={{ color: bunkResult.color, fontSize: 8.5, fontWeight: '900' }}
            />
          </FlexWidget>

          <FlexWidget
            style={{
              width: 7,
              height: 7,
              borderRadius: 3.5,
              backgroundColor: bunkResult.color,
            }}
          />
        </FlexWidget>

        {/* Hero: Huge Percentage */}
        <FlexWidget
          style={{ flexDirection: 'column', marginVertical: 2 }}
          clickAction="OPEN_URI"
          clickActionData={{ uri: 'alms://(tabs)/attendance' }}
        >
          <TextWidget
            text={`${pct}%`}
            style={{
              color: '#FFFFFF',
              fontSize: 28,
              fontWeight: '900',
              letterSpacing: -0.8,
            }}
          />
          <TextWidget
            text={`${attended}/${total} Classes`}
            style={{ color: ApplePalette.textSecondary, fontSize: 10, fontWeight: '600' }}
          />
        </FlexWidget>

        {/* Bottom Progress Bar */}
        <FlexWidget
          style={{
            width: 'match_parent',
            height: 5,
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
            borderRadius: 2.5,
          }}
          clickAction="OPEN_URI"
          clickActionData={{ uri: 'alms://(tabs)/attendance' }}
        >
          <FlexWidget
            style={{
              width: (Math.max(6, (cfg.w - cfg.padH * 2) * Math.min(100, Math.max(0, pct)) / 100)) as any,
              height: 'match_parent',
              backgroundColor: bunkResult.color,
              borderRadius: 2.5,
            }}
          />
        </FlexWidget>
      </FlexWidget>
    );
  }

  // ═════════════════════════════════════════════════════════════════════════
  // 2. MEDIUM 4x2 & LARGE 4x4 (Apple Activity Flagship)
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
      {/* ── HEADER ROW: Status Badge on Left, Bunk Margin Pill on Right ── */}
      <FlexWidget
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: 'match_parent',
          marginBottom: 4,
        }}
      >
        {/* Apple Status Category */}
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

        {/* Bunk Margin Callout Badge */}
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
            style={{
              color: bunkResult.color,
              fontSize: 10.5,
              fontWeight: '800',
            }}
          />
        </FlexWidget>
      </FlexWidget>

      {/* ── MIDDLE HERO: Large Percentage & Progress Track ── */}
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
              text={`${pct}%`}
              style={{
                color: '#FFFFFF',
                fontSize: cfg.isLarge ? 38 : 34,
                fontWeight: '900',
                letterSpacing: -1,
              }}
            />
            <TextWidget
              text=" OVERALL"
              style={{
                color: ApplePalette.textTertiary,
                fontSize: 10.5,
                fontWeight: '800',
                letterSpacing: 0.8,
                marginLeft: 6,
                marginBottom: 4,
              }}
            />
          </FlexWidget>

          <TextWidget
            text={`${attended}/${total} Classes Held`}
            style={{
              color: ApplePalette.textSecondary,
              fontSize: 11,
              fontWeight: '700',
            }}
          />
        </FlexWidget>

        {/* Apple Smooth Progress Bar */}
        <FlexWidget
          style={{
            width: 'match_parent',
            height: 6,
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
            borderRadius: 3,
            marginVertical: 4,
          }}
        >
          <FlexWidget
            style={{
              width: (Math.max(10, (cfg.w - cfg.padH * 2) * Math.min(100, Math.max(0, pct)) / 100)) as any,
              height: 'match_parent',
              backgroundColor: bunkResult.color,
              borderRadius: 3,
            }}
          />
        </FlexWidget>
      </FlexWidget>

      {/* ── BOTTOM ROW: Context Deep Links & Risk Stats ── */}
      <FlexWidget
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: 'match_parent',
          marginTop: 4,
        }}
      >
        <FlexWidget style={{ flexDirection: 'row', alignItems: 'center' }}>
          {/* Duty Leaves Chip */}
          {data.dutyLeaves > 0 ? (
            <FlexWidget
              style={{
                backgroundColor: ApplePalette.surfacePill,
                borderRadius: 9,
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderWidth: 1,
                borderColor: ApplePalette.border,
                marginRight: 6,
              }}
              clickAction="OPEN_URI"
              clickActionData={{ uri: 'alms://(tabs)/attendance' }}
            >
              <TextWidget
                text={`DL: +${data.dutyLeaves}`}
                style={{ color: ApplePalette.teal, fontSize: 10, fontWeight: '800' }}
              />
            </FlexWidget>
          ) : null}

          {/* Critical Risk Warning Chip */}
          {data.criticalCount > 0 ? (
            <FlexWidget
              style={{
                backgroundColor: ApplePalette.coralBg,
                borderRadius: 9,
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderWidth: 1,
                borderColor: ApplePalette.coralBorder,
                marginRight: 6,
              }}
              clickAction="OPEN_URI"
              clickActionData={{ uri: 'alms://(tabs)/attendance' }}
            >
              <TextWidget
                text={`⚠️ ${data.criticalCount} Below 75%`}
                style={{ color: ApplePalette.coral, fontSize: 10, fontWeight: '800' }}
              />
            </FlexWidget>
          ) : (
            <FlexWidget
              style={{
                backgroundColor: ApplePalette.mintBg,
                borderRadius: 9,
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderWidth: 1,
                borderColor: ApplePalette.mintBorder,
                marginRight: 6,
              }}
              clickAction="OPEN_URI"
              clickActionData={{ uri: 'alms://(tabs)/attendance' }}
            >
              <TextWidget
                text="✓ All Courses Safe"
                style={{ color: ApplePalette.mint, fontSize: 10, fontWeight: '800' }}
              />
            </FlexWidget>
          )}
        </FlexWidget>

        {/* View All Details Link */}
        <FlexWidget
          style={{
            backgroundColor: ApplePalette.surfacePill,
            borderRadius: 9,
            paddingHorizontal: 9,
            paddingVertical: 4,
          }}
          clickAction="OPEN_URI"
          clickActionData={{ uri: 'alms://(tabs)/attendance' }}
        >
          <TextWidget
            text="Breakdown ›"
            style={{ color: ApplePalette.textSecondary, fontSize: 10.5, fontWeight: '700' }}
          />
        </FlexWidget>
      </FlexWidget>
    </FlexWidget>
  );
}
