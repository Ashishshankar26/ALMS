import type { ColorProp, WidgetInfo } from 'react-native-android-widget';

// ═════════════════════════════════════════════════════════════════════════════
// APPLE-INSPIRED NATIVE WIDGET DESIGN SYSTEM
// Inspired by Apple iOS 18/26 Native Widgets (Calendar, Weather, Activity, Stack)
// ═════════════════════════════════════════════════════════════════════════════

export const ApplePalette = {
  // ── Surfaces & Materials (iOS Dark Appearance) ──
  surface: '#1C1C1E' as ColorProp,         // Apple System Background Secondary (Obsidian)
  surfaceElevated: '#2C2C2E' as ColorProp, // Apple Secondary Grouped Background (Graphite)
  surfaceSubtle: 'rgba(255, 255, 255, 0.06)' as ColorProp,
  surfacePill: 'rgba(255, 255, 255, 0.08)' as ColorProp,
  border: 'rgba(255, 255, 255, 0.08)' as ColorProp,
  borderLight: 'rgba(255, 255, 255, 0.12)' as ColorProp,
  borderAccent: 'rgba(255, 255, 255, 0.16)' as ColorProp,

  // ── Apple System Tints (Vibrant, Restrained, Meaningful) ──
  blue: '#0A84FF' as ColorProp,     // Apple System Blue (Timetable / Primary)
  blueBg: 'rgba(10, 132, 255, 0.15)' as ColorProp,
  blueBorder: 'rgba(10, 132, 255, 0.30)' as ColorProp,

  mint: '#30D158' as ColorProp,     // Apple System Mint/Green (In-Session / Safe Margin)
  mintBg: 'rgba(48, 209, 88, 0.15)' as ColorProp,
  mintBorder: 'rgba(48, 209, 88, 0.30)' as ColorProp,

  coral: '#FF453A' as ColorProp,    // Apple System Coral/Red (Critical / Attendance Risk)
  coralBg: 'rgba(255, 69, 58, 0.15)' as ColorProp,
  coralBorder: 'rgba(255, 69, 58, 0.30)' as ColorProp,

  amber: '#FF9F0A' as ColorProp,    // Apple System Orange/Amber (Exam / Warning)
  amberBg: 'rgba(255, 159, 10, 0.15)' as ColorProp,
  amberBorder: 'rgba(255, 159, 10, 0.30)' as ColorProp,

  purple: '#BF5AF2' as ColorProp,   // Apple System Purple (Academic Stats / CGPA)
  purpleBg: 'rgba(191, 90, 242, 0.15)' as ColorProp,
  purpleBorder: 'rgba(191, 90, 242, 0.30)' as ColorProp,

  teal: '#64D2FF' as ColorProp,     // Apple System Teal/Sky (Schedule / Room)
  tealBg: 'rgba(100, 210, 255, 0.15)' as ColorProp,
  tealBorder: 'rgba(100, 210, 255, 0.30)' as ColorProp,

  // ── Text Hierarchy (Apple SF Pro Proportions) ──
  textPrimary: '#FFFFFF' as ColorProp,
  textSecondary: 'rgba(255, 255, 255, 0.70)' as ColorProp,
  textTertiary: 'rgba(255, 255, 255, 0.45)' as ColorProp,
  textQuaternary: 'rgba(255, 255, 255, 0.25)' as ColorProp,
};

// ── BUNK MARGIN CALCULATOR (Mathematically Exact for 75% Target) ──
export interface BunkMarginResult {
  status: 'safe' | 'warning' | 'critical' | 'neutral';
  margin: number;
  percentage: number;
  label: string;
  subLabel: string;
  pillText: string;
  color: ColorProp;
  bgColor: ColorProp;
  borderColor: ColorProp;
}

export function calculateBunkMargin(attended: number, total: number, target: number = 0.75): BunkMarginResult {
  if (total <= 0) {
    return {
      status: 'neutral',
      margin: 0,
      percentage: 0,
      label: 'No Classes',
      subLabel: 'Term starting',
      pillText: '0 classes held',
      color: ApplePalette.textTertiary,
      bgColor: ApplePalette.surfaceSubtle,
      borderColor: ApplePalette.border,
    };
  }

  const safeAttended = Math.min(attended, total);
  const currentRatio = safeAttended / total;
  const percentage = Math.round(currentRatio * 100);

  // Case A: Safe (Current attendance >= 75%)
  // Formula: A / (T + m) >= 0.75  =>  m <= (4A - 3T) / 3
  if (currentRatio >= target) {
    const margin = Math.floor((4 * safeAttended - 3 * total) / 3);
    if (margin > 0) {
      return {
        status: 'safe',
        margin,
        percentage,
        label: `+${margin} Can Skip`,
        subLabel: `Safe above ${Math.round(target * 100)}%`,
        pillText: `+${margin} Bunk Margin`,
        color: ApplePalette.mint,
        bgColor: ApplePalette.mintBg,
        borderColor: ApplePalette.mintBorder,
      };
    } else {
      return {
        status: 'warning',
        margin: 0,
        percentage,
        label: 'On Threshold',
        subLabel: 'Cannot skip next class',
        pillText: '0 Skip Margin',
        color: ApplePalette.amber,
        bgColor: ApplePalette.amberBg,
        borderColor: ApplePalette.amberBorder,
      };
    }
  }

  // Case B: Below Threshold (Current attendance < 75%)
  // Formula: (A + n) / (T + n) >= 0.75  =>  n >= 3T - 4A
  const needed = Math.max(1, Math.ceil(3 * total - 4 * safeAttended));
  const isCritical = percentage < 70;

  return {
    status: isCritical ? 'critical' : 'warning',
    margin: needed,
    percentage,
    label: `Attend +${needed}`,
    subLabel: `To restore ${Math.round(target * 100)}%`,
    pillText: `Need +${needed} to 75%`,
    color: isCritical ? ApplePalette.coral : ApplePalette.amber,
    bgColor: isCritical ? ApplePalette.coralBg : ApplePalette.amberBg,
    borderColor: isCritical ? ApplePalette.coralBorder : ApplePalette.amberBorder,
  };
}

// ── CAMPUS ROOM & FLOOR DECODER ──
// LPU Room syntax: e.g. "34-101", "38-602", "14-304"
export interface DecodedRoom {
  block: string;
  floor: string;
  shortLabel: string;
  fullLabel: string;
}

export function decodeLpuRoom(rawRoom: string): DecodedRoom {
  if (!rawRoom || rawRoom === 'TBA') {
    return {
      block: 'TBA',
      floor: 'TBA',
      shortLabel: 'Room TBA',
      fullLabel: 'Room TBA',
    };
  }

  const cleaned = rawRoom.replace(/^Room\s*/i, '').trim();
  const match = cleaned.match(/^(\d{1,2})-(\d{1,4})[A-Za-z]?$/);

  if (match) {
    const blockNum = match[1];
    const roomNum = match[2];

    let floorText = 'Ground Floor';
    if (roomNum.length >= 3) {
      const floorDigit = parseInt(roomNum.slice(0, roomNum.length - 2), 10);
      if (floorDigit === 0) floorText = 'Ground Floor';
      else if (floorDigit === 1) floorText = '1st Floor';
      else if (floorDigit === 2) floorText = '2nd Floor';
      else if (floorDigit === 3) floorText = '3rd Floor';
      else floorText = `${floorDigit}th Floor`;
    }

    return {
      block: `Block ${blockNum}`,
      floor: floorText,
      shortLabel: `B${blockNum} • ${floorText}`,
      fullLabel: `Block ${blockNum}, Room ${cleaned}`,
    };
  }

  return {
    block: cleaned,
    floor: '',
    shortLabel: cleaned.startsWith('Room') ? cleaned : `Room ${cleaned}`,
    fullLabel: cleaned.startsWith('Room') ? cleaned : `Room ${cleaned}`,
  };
}

// ── EXAM COUNTDOWN PARSER ──
export interface UpcomingExamInfo {
  subject: string;
  courseTitle?: string;
  subjectCode: string;
  courseCode?: string;
  type: string;
  dateStr: string;
  date?: string;
  timeStr: string;
  time?: string;
  daysRemaining: number;
  countdownLabel: string;
  room: string;
  seat?: string;
  seatNo?: string;
  isApproaching: boolean; // within 14 days
}

export type ExamCountdownData = UpcomingExamInfo;

export function getUpcomingExam(exams: any[] = []): UpcomingExamInfo | null {
  if (!Array.isArray(exams) || exams.length === 0) return null;

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const parseDate = (dStr: string): Date | null => {
    if (!dStr) return null;
    const parts = dStr.split(/[- /]/);
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      let month = -1;
      let year = parseInt(parts[2], 10);
      const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
      const mIdx = months.findIndex(m => parts[1].toLowerCase().startsWith(m));
      if (mIdx !== -1) month = mIdx;
      else {
        const numMonth = parseInt(parts[1], 10);
        if (!isNaN(numMonth) && numMonth >= 1 && numMonth <= 12) month = numMonth - 1;
      }
      if (month !== -1 && !isNaN(day) && !isNaN(year)) {
        if (year < 100) year += 2000;
        return new Date(year, month, day);
      }
    }
    const d = new Date(dStr);
    return isNaN(d.getTime()) ? null : d;
  };

  const processed = exams
    .map(ex => ({
      ...ex,
      parsedDate: parseDate(ex.date),
    }))
    .filter(ex => ex.parsedDate && ex.parsedDate >= now)
    .sort((a, b) => a.parsedDate!.getTime() - b.parsedDate!.getTime());

  if (processed.length === 0) return null;

  const next = processed[0];
  const diffMs = next.parsedDate!.getTime() - now.getTime();
  const days = Math.round(diffMs / (1000 * 60 * 60 * 24));

  let countdownLabel = `${days} DAYS LEFT`;
  if (days === 0) countdownLabel = 'TODAY';
  else if (days === 1) countdownLabel = 'TOMORROW';

  return {
    subject: next.subject || 'University Examination',
    courseTitle: next.subject || 'University Examination',
    subjectCode: next.subjectCode || 'EXAM',
    courseCode: next.subjectCode || 'EXAM',
    type: (next.type || 'MTE EXAM').toUpperCase(),
    dateStr: next.date || '',
    date: next.date || '',
    timeStr: next.time || '',
    time: next.time || '',
    daysRemaining: days,
    countdownLabel,
    room: next.room ? (next.room.startsWith('Room') ? next.room : `Room ${next.room}`) : 'Room TBA',
    seat: next.seat || next.seatNo || undefined,
    seatNo: next.seat || next.seatNo || undefined,
    isApproaching: days <= 14,
  };
}

// ── RESPONSIVE WIDGET SIZING SYSTEM ──
export type WidgetLayoutTier = 'micro' | 'small' | 'medium' | 'large';

export interface WidgetLayoutConfig {
  w: number;
  h: number;
  tier: WidgetLayoutTier;
  isSmall: boolean;    // 2x2
  isMedium: boolean;   // 4x2
  isLarge: boolean;    // 4x4
  isMicro: boolean;    // 4x1
  padH: number;
  padV: number;
  borderRadius: number;
  titleFontSize: number;
  badgeFontSize: number;
}

export function getAppleWidgetConfig(
  rawWidth?: number,
  rawHeight?: number,
  screenInfo?: WidgetInfo['screenInfo']
): WidgetLayoutConfig {
  const screenW = screenInfo?.screenWidthDp && screenInfo.screenWidthDp > 0 ? screenInfo.screenWidthDp : 380;
  const hasValidDims = Boolean(rawWidth && rawWidth > 0 && rawHeight && rawHeight > 0);
  const w = hasValidDims ? (rawWidth as number) : 320;
  const h = hasValidDims ? (rawHeight as number) : 150;
  const widthRatio = w / screenW;

  const isMicro = h < 95;
  const isSmall = !isMicro && hasValidDims && (w < 215 || widthRatio <= 0.52);
  const isLarge = !isMicro && !isSmall && h >= 210;
  const isMedium = !isMicro && !isSmall && !isLarge;

  let tier: WidgetLayoutTier = 'medium';
  if (isMicro) tier = 'micro';
  else if (isSmall) tier = 'small';
  else if (isLarge) tier = 'large';

  return {
    w,
    h,
    tier,
    isSmall,
    isMedium,
    isLarge,
    isMicro,
    padH: isSmall ? 10 : 14,
    padV: isSmall ? 8 : 12,
    borderRadius: isSmall ? 20 : 24, // Apple continuous corner radius
    titleFontSize: isSmall ? 14 : (isLarge ? 20 : 18),
    badgeFontSize: isSmall ? 9 : 10.5,
  };
}
