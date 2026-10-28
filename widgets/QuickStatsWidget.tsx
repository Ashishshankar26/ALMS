import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import type { WidgetInfo, ColorProp } from 'react-native-android-widget';
import {
  ApplePalette,
  getAppleWidgetConfig,
  calculateBunkMargin,
  decodeLpuRoom,
} from './theme';

export interface QuickStatsWidgetData {
  cgpa: string;
  termGpa?: string;
  creditsCompleted?: string;
  attendancePercent: number;
  attended: number;
  total: number;
  nextSubject: string;
  nextSubjectCode?: string;
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

  const attended = data?.attended ?? 58;
  const total = data?.total ?? 74;
  const bunkResult = calculateBunkMargin(attended, total, 0.75);
  const pct = data?.attendancePercent ?? (total > 0 ? Math.round((attended / total) * 100) : 78.4);
  const cgpa = data?.cgpa && data.cgpa !== '--' ? data.cgpa : '8.42';
  const termGpa = data?.termGpa || '8.60';
  const credits = data?.creditsCompleted || '36';

  const nextRoomRaw = data?.nextRoom || '34-101';
  const decodedRoom = decodeLpuRoom(nextRoomRaw);
  const roomShort = decodedRoom.shortLabel.replace('Room ', '');
  const subjectCode = data?.nextSubjectCode || (data?.nextSubject ? data.nextSubject.slice(0, 6).toUpperCase() : 'CSE320');
  const classTime = data?.nextTime ? data.nextTime.split('–')[0].split('-')[0].trim() : '09:00 AM';

  // Difference from 75% target threshold
  const targetDiff = (pct - 75).toFixed(1);
  const isSafe = pct >= 75;

  // ═════════════════════════════════════════════════════════════════════════
  // 1. SMALL 2x2 COMPACT VARIANT
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
      >
        <FlexWidget style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: 'match_parent' }}>
          <TextWidget
            text="PORTAL"
            style={{ color: '#8E8E93', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 }}
          />
          <FlexWidget
            style={{
              backgroundColor: 'rgba(48, 209, 88, 0.15)',
              borderRadius: 6,
              paddingHorizontal: 5,
              paddingVertical: 2,
              borderWidth: 1,
              borderColor: '#30D158',
            }}
          >
            <TextWidget
              text={`${pct}%`}
              style={{ color: '#30D158', fontSize: 9, fontWeight: '800' }}
            />
          </FlexWidget>
        </FlexWidget>

        <FlexWidget style={{ marginVertical: 2 }} clickAction="OPEN_URI" clickActionData={{ uri: 'alms://(tabs)/results' }}>
          <TextWidget
            text={cgpa}
            style={{ color: '#BF5AF2', fontSize: 26, fontWeight: '900', letterSpacing: -0.5 }}
          />
          <TextWidget
            text={`CGPA • ${credits} Credits`}
            style={{ color: '#8E8E93', fontSize: 9.5, fontWeight: '600' }}
          />
        </FlexWidget>

        <FlexWidget
          style={{
            backgroundColor: '#2C2C2E',
            borderRadius: 8,
            paddingHorizontal: 7,
            paddingVertical: 3.5,
            width: 'match_parent',
          }}
          clickAction="OPEN_URI"
          clickActionData={{ uri: 'alms://timetable' }}
        >
          <TextWidget
            text={`📍 ${roomShort} • ${classTime}`}
            maxLines={1}
            truncate="END"
            style={{ color: '#0A84FF', fontSize: 9.5, fontWeight: '700' }}
          />
        </FlexWidget>
      </FlexWidget>
    );
  }

  const cleanRoomNumber = nextRoomRaw.includes('-')
    ? nextRoomRaw
    : (decodedRoom.roomNumber ? `${decodedRoom.blockNumber || 'B'}-${decodedRoom.roomNumber}` : nextRoomRaw.slice(0, 7));

  // 4x2 launcher widgets on Android report h ~130-220dp; >= 240dp indicates expanded 3+ rows
  const isCompactHeight = cfg.h < 240;
  const rootPadV = isCompactHeight ? 6 : 12;
  const rootPadH = cfg.w < 300 ? 10 : 14;

  // Adaptive tile dimensions (fits in ~122dp with zero clipping)
  const headerSubSize = isCompactHeight ? 15 : 18;
  const headerMarginB = isCompactHeight ? 3 : 6;
  const tilePadV = isCompactHeight ? 5 : 9;
  const tilePadH = isCompactHeight ? 6 : 10;
  const tileHeroSize = isCompactHeight ? 20 : 28;
  const tileHeroMarginV = isCompactHeight ? 1 : 3;
  const tileLine2Size = isCompactHeight ? 9.5 : 11;
  const tileLine3Size = isCompactHeight ? 8 : 9;
  const tileBtnPadV = isCompactHeight ? 3.5 : 5;
  const tileBtnMarginT = isCompactHeight ? 3 : 5;
  const tileBtnFontSize = isCompactHeight ? 8 : 9;

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: '#1C1C1E',
        borderRadius: 24,
        borderWidth: 1.5,
        borderColor: '#2C2C2E',
        paddingHorizontal: rootPadH,
        paddingVertical: rootPadV,
        justifyContent: 'flex-start',
      }}
    >
      {/* ── TOP HEADER ── */}
      <FlexWidget style={{ flexDirection: 'column', width: 'match_parent', marginBottom: headerMarginB }}>
        <TextWidget
          text="ACADEMIC OVERVIEW"
          style={{
            color: '#8E8E93',
            fontSize: isCompactHeight ? 8.5 : 10,
            fontWeight: '800',
            letterSpacing: 0.8,
          }}
        />
        <TextWidget
          text="Student Portal Glance"
          maxLines={1}
          truncate="END"
          style={{
            color: '#FFFFFF',
            fontSize: headerSubSize,
            fontWeight: '800',
            letterSpacing: -0.3,
            marginTop: 1,
          }}
        />
      </FlexWidget>

      {/* ── 3 MODULAR TILES ── */}
      <FlexWidget
        style={{
          flexDirection: 'row',
          width: 'match_parent',
          flex: 1,
          justifyContent: 'space-between',
        }}
      >
        {/* TILE 1: CUMULATIVE GPA */}
        <FlexWidget
          style={{
            backgroundColor: '#2C2C2E',
            borderRadius: 14,
            borderWidth: 1,
            borderColor: '#38383A',
            paddingHorizontal: tilePadH,
            paddingVertical: tilePadV,
            flex: 1,
            marginRight: isCompactHeight ? 3 : 5,
            justifyContent: 'space-between',
          }}
          clickAction="OPEN_URI"
          clickActionData={{ uri: 'alms://(tabs)/results' }}
        >
          <FlexWidget style={{ flexDirection: 'column' }}>
            <TextWidget
              text="CUMULATIVE GPA"
              maxLines={1}
              truncate="END"
              style={{ color: '#8E8E93', fontSize: isCompactHeight ? 7.5 : 9, fontWeight: '800', letterSpacing: 0.2 }}
            />
            <TextWidget
              text={cgpa}
              maxLines={1}
              style={{
                color: '#BF5AF2',
                fontSize: tileHeroSize,
                fontWeight: '900',
                letterSpacing: -0.5,
                marginVertical: tileHeroMarginV,
              }}
            />
            <TextWidget
              text={`Term GPA: ${termGpa}`}
              maxLines={1}
              truncate="END"
              style={{ color: '#FFFFFF', fontSize: tileLine2Size, fontWeight: '700', marginBottom: 1 }}
            />
            <TextWidget
              text={`${credits} Credits Completed`}
              maxLines={1}
              truncate="END"
              style={{ color: '#8E8E93', fontSize: tileLine3Size, fontWeight: '500' }}
            />
          </FlexWidget>

          {/* Action button */}
          <FlexWidget
            style={{
              backgroundColor: '#3A3A3C',
              borderRadius: 10,
              paddingVertical: tileBtnPadV,
              paddingHorizontal: 4,
              alignItems: 'center',
              justifyContent: 'center',
              width: 'match_parent',
              marginTop: tileBtnMarginT,
            }}
          >
            <TextWidget
              text="View Grade Details ›"
              maxLines={1}
              truncate="END"
              style={{ color: '#BF5AF2', fontSize: tileBtnFontSize, fontWeight: '800' }}
            />
          </FlexWidget>
        </FlexWidget>

        {/* TILE 2: OVERALL ATTENDANCE */}
        <FlexWidget
          style={{
            backgroundColor: '#2C2C2E',
            borderRadius: 14,
            borderWidth: 1,
            borderColor: '#38383A',
            paddingHorizontal: tilePadH,
            paddingVertical: tilePadV,
            flex: 1,
            marginHorizontal: isCompactHeight ? 3 : 5,
            justifyContent: 'space-between',
          }}
          clickAction="OPEN_URI"
          clickActionData={{ uri: 'alms://(tabs)/attendance' }}
        >
          <FlexWidget style={{ flexDirection: 'column' }}>
            <TextWidget
              text="OVERALL ATTENDANCE"
              maxLines={1}
              truncate="END"
              style={{ color: '#8E8E93', fontSize: isCompactHeight ? 7.5 : 9, fontWeight: '800', letterSpacing: 0.2 }}
            />
            <TextWidget
              text={`${pct}%`}
              maxLines={1}
              style={{
                color: isSafe ? '#30D158' : '#FF453A',
                fontSize: tileHeroSize,
                fontWeight: '900',
                letterSpacing: -0.5,
                marginVertical: tileHeroMarginV,
              }}
            />
            <TextWidget
              text={bunkResult.label}
              maxLines={1}
              truncate="END"
              style={{
                color: bunkResult.color,
                fontSize: tileLine2Size,
                fontWeight: '800',
                marginBottom: 1,
              }}
            />
            <TextWidget
              text={`${attended} / ${total} Classes`}
              maxLines={1}
              truncate="END"
              style={{ color: '#8E8E93', fontSize: tileLine3Size, fontWeight: '500' }}
            />
          </FlexWidget>

          {/* Action button */}
          <FlexWidget
            style={{
              backgroundColor: isSafe ? 'rgba(48, 209, 88, 0.15)' : 'rgba(255, 69, 58, 0.15)',
              borderWidth: 1,
              borderColor: isSafe ? '#30D158' : '#FF453A',
              borderRadius: 10,
              paddingVertical: tileBtnPadV,
              paddingHorizontal: 4,
              alignItems: 'center',
              justifyContent: 'center',
              width: 'match_parent',
              marginTop: tileBtnMarginT,
            }}
          >
            <TextWidget
              text={isSafe ? `✓ Safe (+${targetDiff}%)` : `⚠️ Need (${Math.abs(Number(targetDiff))}%)`}
              maxLines={1}
              truncate="END"
              style={{ color: isSafe ? '#30D158' : '#FF453A', fontSize: tileBtnFontSize, fontWeight: '800' }}
            />
          </FlexWidget>
        </FlexWidget>

        {/* TILE 3: UPCOMING CLASS */}
        <FlexWidget
          style={{
            backgroundColor: '#2C2C2E',
            borderRadius: 14,
            borderWidth: 1,
            borderColor: '#38383A',
            paddingHorizontal: tilePadH,
            paddingVertical: tilePadV,
            flex: 1,
            marginLeft: isCompactHeight ? 3 : 5,
            justifyContent: 'space-between',
          }}
          clickAction="OPEN_URI"
          clickActionData={{ uri: 'alms://timetable' }}
        >
          <FlexWidget style={{ flexDirection: 'column' }}>
            <TextWidget
              text="UPCOMING CLASS"
              maxLines={1}
              truncate="END"
              style={{ color: '#8E8E93', fontSize: isCompactHeight ? 7.5 : 9, fontWeight: '800', letterSpacing: 0.2 }}
            />
            <TextWidget
              text={cleanRoomNumber}
              maxLines={1}
              truncate="END"
              style={{
                color: '#0A84FF',
                fontSize: tileHeroSize,
                fontWeight: '900',
                letterSpacing: -0.5,
                marginVertical: tileHeroMarginV,
              }}
            />
            <TextWidget
              text={`${classTime} • ${subjectCode}`}
              maxLines={1}
              truncate="END"
              style={{ color: '#FFFFFF', fontSize: tileLine2Size, fontWeight: '700', marginBottom: 1 }}
            />
            <TextWidget
              text={`${decodedRoom.block} • ${decodedRoom.floor}`}
              maxLines={1}
              truncate="END"
              style={{ color: '#64D2FF', fontSize: tileLine3Size, fontWeight: '600' }}
            />
          </FlexWidget>

          {/* Action button */}
          <FlexWidget
            style={{
              backgroundColor: '#3A3A3C',
              borderRadius: 10,
              paddingVertical: tileBtnPadV,
              paddingHorizontal: 4,
              alignItems: 'center',
              justifyContent: 'center',
              width: 'match_parent',
              marginTop: tileBtnMarginT,
            }}
          >
            <TextWidget
              text="Open Timetable ›"
              maxLines={1}
              truncate="END"
              style={{ color: '#0A84FF', fontSize: tileBtnFontSize, fontWeight: '800' }}
            />
          </FlexWidget>
        </FlexWidget>
      </FlexWidget>
    </FlexWidget>
  );
}
