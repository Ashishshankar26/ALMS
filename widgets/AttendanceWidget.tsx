import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import type { WidgetInfo, ColorProp } from 'react-native-android-widget';
import {
  ApplePalette,
  getAppleWidgetConfig,
  calculateBunkMargin,
} from './theme';

export interface SubjectAttendanceItem {
  subjectCode: string;
  percentage: number;
  attended: number;
  total: number;
  marginText: string;
  color: ColorProp;
}

export interface AttendanceWidgetData {
  overallPercentage: number;
  attended: number;
  total: number;
  dutyLeaves: number;
  bonusAttendance: number;
  subjectCount: number;
  criticalCount: number;
  subjects?: SubjectAttendanceItem[];
}

export function AttendanceWidget({
  data,
  widgetInfo,
}: {
  data?: AttendanceWidgetData;
  widgetInfo?: WidgetInfo;
}) {
  const cfg = getAppleWidgetConfig(widgetInfo?.width, widgetInfo?.height, widgetInfo?.screenInfo);

  const attended = (data?.attended ?? 58) + (data?.dutyLeaves ?? 0) + (data?.bonusAttendance ?? 0);
  const total = data?.total ?? 74;
  const bunkResult = calculateBunkMargin(attended, total, 0.75);
  const pct = data?.overallPercentage ?? (total > 0 ? Math.round((attended / total) * 100) : 78.4);
  const isSafe = pct >= 75;
  const targetDiff = (pct - 75).toFixed(1);

  // Default / Scraped 3 subjects matching Image 2
  const subjects: SubjectAttendanceItem[] = (data?.subjects && data.subjects.length >= 3)
    ? data.subjects.slice(0, 3)
    : [
        {
          subjectCode: 'CSE320',
          percentage: 84.2,
          attended: 32,
          total: 38,
          marginText: '+4 Safe',
          color: '#30D158',
        },
        {
          subjectCode: 'INT219',
          percentage: 76.0,
          attended: 19,
          total: 25,
          marginText: '+1 Safe',
          color: '#FF9F0A',
        },
        {
          subjectCode: 'MTH401',
          percentage: 72.5,
          attended: 29,
          total: 40,
          marginText: 'Need 2',
          color: '#FF453A',
        },
      ];

  // ═════════════════════════════════════════════════════════════════════════
  // 1. SMALL 2x2 COMPACT FOCUS
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
        clickAction="OPEN_URI"
        clickActionData={{ uri: 'alms://(tabs)/attendance' }}
      >
        <FlexWidget style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: 'match_parent' }}>
          <TextWidget
            text="ATTENDANCE"
            style={{ color: '#8E8E93', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 }}
          />
          <FlexWidget
            style={{
              backgroundColor: isSafe ? 'rgba(48, 209, 88, 0.15)' : 'rgba(255, 69, 58, 0.15)',
              borderRadius: 6,
              paddingHorizontal: 5,
              paddingVertical: 2,
              borderWidth: 1,
              borderColor: isSafe ? '#30D158' : '#FF453A',
            }}
          >
            <TextWidget
              text={bunkResult.label}
              style={{ color: bunkResult.color, fontSize: 8.5, fontWeight: '800' }}
            />
          </FlexWidget>
        </FlexWidget>

        <FlexWidget style={{ marginVertical: 2 }}>
          <TextWidget
            text={`${pct}%`}
            style={{
              color: isSafe ? '#30D158' : '#FF453A',
              fontSize: 32,
              fontWeight: '900',
              letterSpacing: -0.5,
            }}
          />
          <TextWidget
            text={`${attended} / ${total} Classes`}
            style={{ color: '#8E8E93', fontSize: 10, fontWeight: '600' }}
          />
        </FlexWidget>

        <FlexWidget
          style={{
            backgroundColor: '#2C2C2E',
            borderRadius: 8,
            paddingHorizontal: 7,
            paddingVertical: 4,
            width: 'match_parent',
          }}
        >
          <TextWidget
            text={isSafe ? `+${targetDiff}% Above 75% Target` : `${Math.abs(Number(targetDiff))}% Below 75%`}
            style={{ color: isSafe ? '#30D158' : '#FF453A', fontSize: 9.5, fontWeight: '700' }}
          />
        </FlexWidget>
      </FlexWidget>
    );
  }

  // ═════════════════════════════════════════════════════════════════════════
  // 2. FLAGSHIP 4x2 PRESENTATION — EXACT CLONE OF USER IMAGE 2
  // ═════════════════════════════════════════════════════════════════════════
  // Dynamic progress track width in dp based on widget size
  const trackWidth = Math.max(200, cfg.w - 32);
  const fillWidth = Math.max(10, Math.min(trackWidth, Math.round((trackWidth * Math.min(100, pct)) / 100)));

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: '#1C1C1E',
        borderRadius: 24,
        borderWidth: 1.5,
        borderColor: '#2C2C2E',
        paddingHorizontal: 16,
        paddingVertical: 14,
        justifyContent: 'space-between',
      }}
      clickAction="OPEN_URI"
      clickActionData={{ uri: 'alms://(tabs)/attendance' }}
    >
      {/* ── TOP HEADER ── */}
      <FlexWidget style={{ flexDirection: 'column', width: 'match_parent' }}>
        <TextWidget
          text="ATTENDANCE & SAFETY"
          style={{
            color: '#8E8E93',
            fontSize: 10,
            fontWeight: '800',
            letterSpacing: 0.8,
          }}
        />
        <TextWidget
          text="University Overall Standing"
          style={{
            color: '#FFFFFF',
            fontSize: 20,
            fontWeight: '800',
            letterSpacing: -0.3,
            marginTop: 2,
          }}
        />
      </FlexWidget>

      {/* ── TOP SECTION: HERO PERCENTAGE & BUNK CALLOUT BOX ── */}
      <FlexWidget
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: 'match_parent',
          marginVertical: 4,
        }}
      >
        {/* Left: Giant Percentage Hero */}
        <FlexWidget style={{ flexDirection: 'column', flex: 1 }}>
          <TextWidget
            text={`${pct}%`}
            style={{
              color: isSafe ? '#30D158' : '#FF453A',
              fontSize: 40,
              fontWeight: '900',
              letterSpacing: -1,
            }}
          />
          <TextWidget
            text={isSafe ? `75% Target Threshold: +${targetDiff}% Margin` : `75% Target Threshold: -${Math.abs(Number(targetDiff))}% Deficit`}
            style={{
              color: '#8E8E93',
              fontSize: 11,
              fontWeight: '600',
              marginTop: 2,
            }}
          />
        </FlexWidget>

        {/* Right: Bunk Margin Highlight Box */}
        <FlexWidget
          style={{
            backgroundColor: isSafe ? 'rgba(48, 209, 88, 0.15)' : 'rgba(255, 69, 58, 0.15)',
            borderWidth: 1.5,
            borderColor: isSafe ? '#30D158' : '#FF453A',
            borderRadius: 18,
            paddingHorizontal: 16,
            paddingVertical: 9,
            alignItems: 'flex-start',
            justifyContent: 'center',
          }}
        >
          <TextWidget
            text={isSafe ? `+${bunkResult.margin} CLASSES` : `NEED ${bunkResult.margin || 1} CLASSES`}
            style={{
              color: isSafe ? '#30D158' : '#FF453A',
              fontSize: 20,
              fontWeight: '900',
              letterSpacing: -0.3,
            }}
          />
          <TextWidget
            text={isSafe ? 'Safe to miss without dropping below 75%' : 'Must attend consecutively to reach 75%'}
            style={{
              color: isSafe ? '#30D158' : '#FF453A',
              fontSize: 9.5,
              fontWeight: '600',
              marginTop: 2,
            }}
          />
        </FlexWidget>
      </FlexWidget>

      {/* ── MIDDLE: PROGRESS BAR SECTION ── */}
      <FlexWidget style={{ flexDirection: 'column', width: 'match_parent', marginVertical: 3 }}>
        <FlexWidget
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: 'match_parent',
            marginBottom: 4,
          }}
        >
          <TextWidget
            text="ATTENDANCE PROGRESS"
            style={{
              color: '#8E8E93',
              fontSize: 10,
              fontWeight: '800',
              letterSpacing: 0.5,
            }}
          />
          <TextWidget
            text={`${attended} / ${total} Classes`}
            style={{
              color: '#FFFFFF',
              fontSize: 10.5,
              fontWeight: '700',
            }}
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
          {pct >= 75 ? (
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
                  flex: Math.max(0.1, pct - 75),
                  backgroundColor: '#30D158',
                }}
              />
              <FlexWidget
                style={{
                  height: 14,
                  flex: Math.max(0.1, 100 - pct),
                  backgroundColor: '#2C2C2E',
                }}
              />
            </>
          ) : (
            <>
              <FlexWidget
                style={{
                  height: 14,
                  flex: Math.max(0.1, pct),
                  backgroundColor: '#FF453A',
                }}
              />
              <FlexWidget
                style={{
                  height: 14,
                  flex: Math.max(0.1, 75 - pct),
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

      {/* ── BOTTOM: 3 SUBJECT CARDS ── */}
      <FlexWidget
        style={{
          flexDirection: 'row',
          width: 'match_parent',
          justifyContent: 'space-between',
          marginTop: 4,
        }}
      >
        {subjects.map((sub, index) => (
          <FlexWidget
            key={sub.subjectCode}
            style={{
              backgroundColor: '#2C2C2E',
              borderRadius: 14,
              borderWidth: 1,
              borderColor: '#38383A',
              paddingHorizontal: 12,
              paddingVertical: 9,
              flex: 1,
              marginRight: index < 2 ? 6 : 0,
              justifyContent: 'space-between',
            }}
          >
            <TextWidget
              text={sub.subjectCode}
              style={{ color: '#FFFFFF', fontSize: 11.5, fontWeight: '800' }}
            />
            <FlexWidget
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'flex-end',
                marginTop: 4,
              }}
            >
              <TextWidget
                text={`${sub.percentage}%`}
                style={{
                  color: sub.color,
                  fontSize: 18,
                  fontWeight: '900',
                  letterSpacing: -0.3,
                }}
              />
              <TextWidget
                text={sub.marginText}
                style={{
                  color: sub.color,
                  fontSize: 10.5,
                  fontWeight: '800',
                }}
              />
            </FlexWidget>
          </FlexWidget>
        ))}
      </FlexWidget>
    </FlexWidget>
  );
}
