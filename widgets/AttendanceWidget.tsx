import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import type { WidgetInfo, ColorProp } from 'react-native-android-widget';

export interface AttendanceWidgetData {
  overallPercentage: number;
  attended: number;
  total: number;
  dutyLeaves: number;
  bonusAttendance: number;
  subjectCount: number;
  criticalCount: number; // subjects below 75%
}

function getLayoutTier(width: number, height: number): 'compact' | 'medium' | 'large' {
  if (width < 200 || height < 115) return 'compact';
  if (height >= 230) return 'large';
  return 'medium';
}

export function AttendanceWidget({ data, widgetInfo }: { data?: AttendanceWidgetData; widgetInfo?: WidgetInfo }) {
  const w = widgetInfo?.width ?? 320;
  const h = widgetInfo?.height ?? 160;
  const tier = getLayoutTier(w, h);

  const isCompact = tier === 'compact';
  const isLarge = tier === 'large';
  const pad = isCompact ? 10 : (isLarge ? 20 : 14);
  const radius = isCompact ? 16 : 22;

  const pct = data?.overallPercentage ?? 0;
  const isSafe = pct >= 80;
  const isWarning = pct >= 75 && pct < 80;

  const statusColor: ColorProp = isSafe ? '#10B981' : (isWarning ? '#F59E0B' : '#EF4444');
  const statusBg: ColorProp = isSafe ? 'rgba(16, 185, 129, 0.18)' : (isWarning ? 'rgba(245, 158, 11, 0.18)' : 'rgba(239, 68, 68, 0.18)');
  const statusText = isSafe ? 'SAFE' : (isWarning ? 'WARNING' : 'CRITICAL');
  const bgColor: ColorProp = isSafe ? '#0B1A14' : (isWarning ? '#1A1508' : '#1A0B0B');

  if (!data) {
    return (
      <FlexWidget
        style={{
          height: 'match_parent',
          width: 'match_parent',
          backgroundColor: '#0F1117',
          borderRadius: radius,
          borderWidth: 1,
          borderColor: 'rgba(255, 255, 255, 0.1)',
          padding: pad,
          justifyContent: 'center',
          alignItems: 'center',
        }}
        clickAction="OPEN_APP"
      >
        <TextWidget
          text="ALMS • Attendance"
          style={{ color: statusColor, fontSize: 13, fontWeight: 'bold', marginBottom: 4 }}
        />
        <TextWidget
          text="Sync to load data"
          style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: 11 }}
        />
      </FlexWidget>
    );
  }

  // ── COMPACT ──
  if (isCompact) {
    return (
      <FlexWidget
        style={{
          height: 'match_parent',
          width: 'match_parent',
          backgroundColor: bgColor,
          borderRadius: radius,
          borderWidth: 1,
          borderColor: statusBg,
          padding: pad,
          justifyContent: 'center',
          alignItems: 'center',
        }}
        clickAction="OPEN_APP"
      >
        <TextWidget
          text={`${pct}%`}
          style={{ color: statusColor, fontSize: 28, fontWeight: '900' }}
        />
        <TextWidget
          text={statusText}
          style={{ color: 'rgba(255, 255, 255, 0.65)', fontSize: 9, fontWeight: '700', marginTop: 2 }}
        />
      </FlexWidget>
    );
  }

  // ── LARGE ──
  if (isLarge) {
    const totalPresent = (data.attended || 0) + (data.dutyLeaves || 0) + (data.bonusAttendance || 0);
    return (
      <FlexWidget
        style={{
          height: 'match_parent',
          width: 'match_parent',
          backgroundColor: bgColor,
          borderRadius: radius,
          borderWidth: 1,
          borderColor: statusBg,
          padding: pad,
          justifyContent: 'space-between',
        }}
        clickAction="OPEN_APP"
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
              backgroundColor: statusBg,
              borderRadius: 10,
              paddingHorizontal: 12,
              paddingVertical: 5,
              borderWidth: 1,
              borderColor: statusColor,
            }}
          >
            <TextWidget
              text={`● ${statusText}`}
              style={{ color: statusColor, fontSize: 12, fontWeight: 'bold' }}
            />
          </FlexWidget>
          <TextWidget
            text="ALMS"
            style={{ color: 'rgba(255, 255, 255, 0.35)', fontSize: 11, fontWeight: '800', letterSpacing: 2 }}
          />
        </FlexWidget>

        {/* Big Percentage */}
        <FlexWidget style={{ width: 'match_parent', alignItems: 'center' }}>
          <TextWidget
            text={`${pct}%`}
            style={{ color: statusColor, fontSize: 52, fontWeight: '900' }}
          />
          <TextWidget
            text="OVERALL ATTENDANCE"
            style={{ color: 'rgba(255, 255, 255, 0.55)', fontSize: 11, fontWeight: '700', letterSpacing: 1, marginTop: 2 }}
          />
        </FlexWidget>

        {/* Progress Bar */}
        <FlexWidget style={{ width: 'match_parent' }}>
          <FlexWidget
            style={{
              width: 'match_parent',
              height: 8,
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              borderRadius: 4,
            }}
          >
            <FlexWidget
              style={{
                width: (w * Math.min(pct, 100) / 100) as any,
                height: 'match_parent',
                backgroundColor: statusColor,
                borderRadius: 4,
              }}
            />
          </FlexWidget>
        </FlexWidget>

        {/* Stats Row */}
        <FlexWidget
          style={{
            flexDirection: 'row',
            width: 'match_parent',
          }}
        >
          <FlexWidget
            style={{
              flex: 1,
              backgroundColor: 'rgba(255, 255, 255, 0.06)',
              borderRadius: 12,
              paddingVertical: 10,
              paddingHorizontal: 10,
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.08)',
              alignItems: 'center',
              marginRight: 6,
            }}
          >
            <TextWidget
              text={`${totalPresent}/${data.total}`}
              style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '800' }}
            />
            <TextWidget
              text="PRESENT"
              style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: 9, fontWeight: '700', marginTop: 2 }}
            />
          </FlexWidget>

          <FlexWidget
            style={{
              flex: 1,
              backgroundColor: 'rgba(255, 255, 255, 0.06)',
              borderRadius: 12,
              paddingVertical: 10,
              paddingHorizontal: 10,
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.08)',
              alignItems: 'center',
              marginRight: 6,
            }}
          >
            <TextWidget
              text={`${data.dutyLeaves}`}
              style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '800' }}
            />
            <TextWidget
              text="DUTY LEAVES"
              style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: 9, fontWeight: '700', marginTop: 2 }}
            />
          </FlexWidget>

          {data.criticalCount > 0 ? (
            <FlexWidget
              style={{
                flex: 1,
                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                borderRadius: 12,
                paddingVertical: 10,
                paddingHorizontal: 10,
                borderWidth: 1,
                borderColor: 'rgba(239, 68, 68, 0.25)',
                alignItems: 'center',
              }}
            >
              <TextWidget
                text={`${data.criticalCount}`}
                style={{ color: '#EF4444', fontSize: 16, fontWeight: '800' }}
              />
              <TextWidget
                text="AT RISK"
                style={{ color: 'rgba(239, 68, 68, 0.8)', fontSize: 9, fontWeight: '700', marginTop: 2 }}
              />
            </FlexWidget>
          ) : (
            <FlexWidget
              style={{
                flex: 1,
                backgroundColor: 'rgba(255, 255, 255, 0.06)',
                borderRadius: 12,
                paddingVertical: 10,
                paddingHorizontal: 10,
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.08)',
                alignItems: 'center',
              }}
            >
              <TextWidget
                text={`${data.subjectCount}`}
                style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '800' }}
              />
              <TextWidget
                text="SUBJECTS"
                style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: 9, fontWeight: '700', marginTop: 2 }}
              />
            </FlexWidget>
          )}
        </FlexWidget>
      </FlexWidget>
    );
  }

  // ── MEDIUM (default) ──
  const totalPresent = (data.attended || 0) + (data.dutyLeaves || 0) + (data.bonusAttendance || 0);
  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: bgColor,
        borderRadius: radius,
        borderWidth: 1,
        borderColor: statusBg,
        padding: pad,
        justifyContent: 'space-between',
      }}
      clickAction="OPEN_APP"
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
            backgroundColor: statusBg,
            borderRadius: 8,
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderWidth: 1,
            borderColor: statusColor,
          }}
        >
          <TextWidget
            text={`● ${statusText}`}
            style={{ color: statusColor, fontSize: 10, fontWeight: 'bold' }}
          />
        </FlexWidget>
        <TextWidget
          text={`${totalPresent}/${data.total} Present`}
          style={{ color: 'rgba(255, 255, 255, 0.75)', fontSize: 11, fontWeight: '700' }}
        />
      </FlexWidget>

      {/* Main value */}
      <FlexWidget
        style={{
          width: 'match_parent',
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <TextWidget
          text={`${pct}%`}
          style={{ color: statusColor, fontSize: 36, fontWeight: '900', marginRight: 6 }}
        />
        <TextWidget
          text="ATTENDANCE"
          style={{ color: 'rgba(255, 255, 255, 0.45)', fontSize: 10, fontWeight: '700', letterSpacing: 1 }}
        />
      </FlexWidget>

      {/* Progress bar */}
      <FlexWidget
        style={{
          width: 'match_parent',
          height: 6,
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          borderRadius: 3,
        }}
      >
        <FlexWidget
          style={{
            width: (w * Math.min(pct, 100) / 100) as any,
            height: 'match_parent',
            backgroundColor: statusColor,
            borderRadius: 3,
          }}
        />
      </FlexWidget>
    </FlexWidget>
  );
}
