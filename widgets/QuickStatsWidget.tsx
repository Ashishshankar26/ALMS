import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import type { WidgetInfo, ColorProp } from 'react-native-android-widget';

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

function getLayoutTier(
  rawWidth?: number,
  rawHeight?: number,
  screenInfo?: WidgetInfo['screenInfo']
): 'compact' | 'medium' | 'large' {
  const screenW = screenInfo?.screenWidthDp && screenInfo.screenWidthDp > 0 ? screenInfo.screenWidthDp : 380;
  const hasValidDims = Boolean(rawWidth && rawWidth > 0 && rawHeight && rawHeight > 0);
  const w = hasValidDims ? (rawWidth as number) : 175;
  const h = hasValidDims ? (rawHeight as number) : 140;
  const widthRatio = w / screenW;

  if (!hasValidDims || widthRatio <= 0.62 || w < 240 || (h < 132 && w < 290)) return 'compact';
  if (h >= 215 && w >= 240) return 'large';
  return 'medium';
}

export function QuickStatsWidget({ data, widgetInfo }: { data?: QuickStatsWidgetData; widgetInfo?: WidgetInfo }) {
  const hasValidDims = Boolean(widgetInfo?.width && widgetInfo.width > 0 && widgetInfo?.height && widgetInfo.height > 0);
  const w = hasValidDims ? (widgetInfo!.width) : 175;
  const h = hasValidDims ? (widgetInfo!.height) : 140;
  const tier = getLayoutTier(widgetInfo?.width, widgetInfo?.height, widgetInfo?.screenInfo);

  const isCompact = tier === 'compact';
  const isLarge = tier === 'large';
  const pad = isCompact ? 8 : (isLarge ? 20 : 14);
  const radius = isCompact ? 16 : 22;

  const pct = data?.attendancePercent ?? 0;
  const attColor: ColorProp = pct >= 80 ? '#10B981' : (pct >= 75 ? '#F59E0B' : '#EF4444');
  const attBg: ColorProp = pct >= 80 ? 'rgba(16, 185, 129, 0.15)' : (pct >= 75 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)');

  const cgpaVal = parseFloat(data?.cgpa || '0');
  const cgpaColor: ColorProp = cgpaVal >= 9 ? '#F59E0B' : (cgpaVal >= 8 ? '#10B981' : (cgpaVal >= 7 ? '#3B82F6' : '#8B5CF6'));
  const cgpaBg: ColorProp = cgpaVal >= 9 ? 'rgba(245, 158, 11, 0.15)' : (cgpaVal >= 8 ? 'rgba(16, 185, 129, 0.15)' : (cgpaVal >= 7 ? 'rgba(59, 130, 246, 0.15)' : 'rgba(139, 92, 246, 0.15)'));

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
          text="ALMS • Quick Stats"
          style={{ color: '#6366F1', fontSize: 13, fontWeight: 'bold', marginBottom: 4 }}
        />
        <TextWidget
          text="Open app to sync data"
          style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: 11 }}
        />
      </FlexWidget>
    );
  }

  // ── COMPACT: CGPA + Attendance side-by-side ──
  if (isCompact) {
    return (
      <FlexWidget
        style={{
          height: 'match_parent',
          width: 'match_parent',
          backgroundColor: '#0F1117',
          borderRadius: radius,
          borderWidth: 1.2,
          borderColor: 'rgba(255, 255, 255, 0.1)',
          padding: 8,
          justifyContent: 'space-between',
          alignItems: 'center',
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
          <TextWidget
            text="ALMS STATS"
            style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: 8.5, fontWeight: '800' }}
          />
          <TextWidget
            text="ALMS"
            style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: 8, fontWeight: 'bold' }}
          />
        </FlexWidget>

        {/* Center: CGPA and Attendance */}
        <FlexWidget
          style={{
            flexDirection: 'row',
            justifyContent: 'space-around',
            alignItems: 'center',
            width: 'match_parent',
          }}
        >
          <FlexWidget style={{ alignItems: 'center' }}>
            <TextWidget
              text={data.cgpa || '--'}
              style={{ color: cgpaColor, fontSize: 22, fontWeight: '900' }}
            />
            <TextWidget
              text="CGPA"
              style={{ color: 'rgba(255, 255, 255, 0.55)', fontSize: 8, fontWeight: '700', marginTop: 1 }}
            />
          </FlexWidget>

          <FlexWidget style={{ width: 1, height: 26, backgroundColor: 'rgba(255, 255, 255, 0.12)' }} />

          <FlexWidget style={{ alignItems: 'center' }}>
            <TextWidget
              text={`${pct}%`}
              style={{ color: attColor, fontSize: 22, fontWeight: '900' }}
            />
            <TextWidget
              text="ATTENDANCE"
              style={{ color: 'rgba(255, 255, 255, 0.55)', fontSize: 8, fontWeight: '700', marginTop: 1 }}
            />
          </FlexWidget>
        </FlexWidget>

        {/* Bottom */}
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
            text={data.hasClass ? (data.nextTime ? `Next: ${data.nextTime.split('-')[0].trim()}` : 'Class scheduled') : 'All done ✓'}
            maxLines={1}
            truncate="END"
            style={{ color: '#38BDF8', fontSize: 8.5, fontWeight: '700' }}
          />
        </FlexWidget>
      </FlexWidget>
    );
  }

  // ── LARGE: CGPA + Attendance + Next Class ──
  if (isLarge) {
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
          justifyContent: 'space-between',
        }}
        clickAction="OPEN_APP"
      >
        {/* Header branding */}
        <FlexWidget
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: 'match_parent',
          }}
        >
          <TextWidget
            text="ALMS DASHBOARD"
            style={{ color: 'rgba(255, 255, 255, 0.35)', fontSize: 11, fontWeight: '800', letterSpacing: 1.5 }}
          />
          <FlexWidget
            style={{
              backgroundColor: 'rgba(99, 102, 241, 0.15)',
              borderRadius: 8,
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderWidth: 1,
              borderColor: 'rgba(99, 102, 241, 0.25)',
            }}
          >
            <TextWidget
              text="LIVE"
              style={{ color: '#6366F1', fontSize: 10, fontWeight: 'bold' }}
            />
          </FlexWidget>
        </FlexWidget>

        {/* Two cards side by side: CGPA + Attendance */}
        <FlexWidget
          style={{
            flexDirection: 'row',
            width: 'match_parent',
          }}
        >
          {/* CGPA Card */}
          <FlexWidget
            style={{
              flex: 1,
              backgroundColor: cgpaBg,
              borderRadius: 16,
              padding: 14,
              borderWidth: 1,
              borderColor: cgpaColor,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 8,
            }}
          >
            <TextWidget
              text={data.cgpa || '--'}
              style={{ color: cgpaColor, fontSize: 32, fontWeight: '900' }}
            />
            <TextWidget
              text="CURRENT CGPA"
              style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: 9, fontWeight: '700', letterSpacing: 1, marginTop: 4 }}
            />
          </FlexWidget>

          {/* Attendance Card */}
          <FlexWidget
            style={{
              flex: 1,
              backgroundColor: attBg,
              borderRadius: 16,
              padding: 14,
              borderWidth: 1,
              borderColor: attColor,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <TextWidget
              text={`${pct}%`}
              style={{ color: attColor, fontSize: 32, fontWeight: '900' }}
            />
            <TextWidget
              text="ATTENDANCE"
              style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: 9, fontWeight: '700', letterSpacing: 1, marginTop: 4 }}
            />
          </FlexWidget>
        </FlexWidget>

        {/* Next Class preview if available */}
        {data.hasClass ? (
          <FlexWidget
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              borderRadius: 12,
              padding: 12,
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.08)',
              width: 'match_parent',
            }}
          >
            <TextWidget
              text="UPCOMING CLASS"
              style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: 9, fontWeight: '700', letterSpacing: 1 }}
            />
            <TextWidget
              text={data.nextSubject}
              maxLines={1}
              truncate="END"
              style={{ color: '#FFFFFF', fontSize: 13, fontWeight: 'bold', marginTop: 2 }}
            />
            <TextWidget
              text={`${data.nextTime} • ${data.nextRoom ? `Room ${data.nextRoom}` : 'Room TBA'}`}
              style={{ color: 'rgba(255, 255, 255, 0.65)', fontSize: 11, marginTop: 2 }}
            />
          </FlexWidget>
        ) : (
          <FlexWidget
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
              borderRadius: 12,
              padding: 12,
              alignItems: 'center',
              width: 'match_parent',
            }}
          >
            <TextWidget
              text="All Caught Up ✓"
              style={{ color: 'rgba(255, 255, 255, 0.65)', fontSize: 12, fontWeight: '600' }}
            />
          </FlexWidget>
        )}
      </FlexWidget>
    );
  }

  // ── MEDIUM: CGPA and Attendance side by side ──
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
        <TextWidget
          text="ALMS"
          style={{ color: 'rgba(255, 255, 255, 0.35)', fontSize: 10, fontWeight: '800', letterSpacing: 1.5 }}
        />
      </FlexWidget>

      {/* Two values side by side */}
      <FlexWidget
        style={{
          flexDirection: 'row',
          width: 'match_parent',
        }}
      >
        {/* CGPA */}
        <FlexWidget
          style={{
            flex: 1,
            alignItems: 'center',
          }}
        >
          <TextWidget
            text={data.cgpa || '--'}
            style={{ color: cgpaColor, fontSize: 28, fontWeight: '900' }}
          />
          <TextWidget
            text="CGPA"
            style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: 10, fontWeight: '700', letterSpacing: 0.5, marginTop: 2 }}
          />
        </FlexWidget>

        {/* Divider */}
        <FlexWidget
          style={{
            width: 1,
            height: 'match_parent',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
          }}
        />

        {/* Attendance */}
        <FlexWidget
          style={{
            flex: 1,
            alignItems: 'center',
          }}
        >
          <TextWidget
            text={`${pct}%`}
            style={{ color: attColor, fontSize: 28, fontWeight: '900' }}
          />
          <TextWidget
            text="ATT"
            style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: 10, fontWeight: '700', letterSpacing: 0.5, marginTop: 2 }}
          />
        </FlexWidget>
      </FlexWidget>

      {/* Bottom progress bars */}
      <FlexWidget style={{ width: 'match_parent' }}>
        <FlexWidget style={{ width: 'match_parent', height: 4, backgroundColor: 'rgba(255, 255, 255, 0.08)', borderRadius: 2, marginBottom: 4 }}>
          <FlexWidget style={{ width: (Math.max(10, (w - pad * 2)) * Math.min((cgpaVal / 10), 1)) as any, height: 'match_parent', backgroundColor: cgpaColor, borderRadius: 2 }} />
        </FlexWidget>
        <FlexWidget style={{ width: 'match_parent', height: 4, backgroundColor: 'rgba(255, 255, 255, 0.08)', borderRadius: 2 }}>
          <FlexWidget style={{ width: (Math.max(10, (w - pad * 2)) * Math.min(pct, 100) / 100) as any, height: 'match_parent', backgroundColor: attColor, borderRadius: 2 }} />
        </FlexWidget>
      </FlexWidget>
    </FlexWidget>
  );
}
