# ALMS - Home Screen Widget & OTA Release Summary

**Date & Time**: 2026-10-22 13:10 IST  
**Repository**: [Ashishshankar26/ALMS](https://github.com/Ashishshankar26/ALMS)  
**Git Commit**: `2fc953306162bf11ea98c29b2314b338940d1385`  
**EAS Update Group ID**: `0a04e5e9-ecba-4916-a05d-9e09f30cdefb`  
**Runtime Version**: `1.0.3`

---

## 1. Problem Statement & User Requirements
1. **Responsive / Auto-Adjusting Home Screen Widget**:
   - The Android home screen widget must adjust to any screen size and support multiple grid configurations: **2x2, 4x2, 4x4, 4x5, 5x6**, etc.
2. **Space Utilization & Larger Info Pills**:
   - The info pills (Room, Subject Code, Lecture/Lab Type) were previously small and left unused empty space. They needed to be enlarged, bolder, and stretched across the full width.
3. **iOS-Style Multi-Widget Stack**:
   - Support stacking multiple widgets or switching between cards (Next Class, Today's Timetable, Attendance).
4. **Offline & Live Timetable Look-Ahead**:
   - Store the complete week's timetable in local storage.
   - Live real-time minute countdowns (`STARTS IN 25m`, `LIVE NOW • 18m left`).
   - Forward look-ahead to Tomorrow or Monday morning when daily classes are completed.
   - Automatically update the widget whenever the app opens and new data is scraped.
5. **Preserve Internal App UI**:
   - Only modify widget-related files without altering the internal UI of the app.

---

## 2. Changes & File Modifications

### A. Manifest & Grid Constraints (`app.json`)
- Updated `react-native-android-widget` configuration:
  - `minWidth`: `"110dp"` (down from 250dp to allow 2x2 compact grids)
  - `minHeight`: `"100dp"` (down from 110dp to allow 2x2 compact grids)
  - `maxResizeWidth`: `"500dp"`
  - `maxResizeHeight`: `"650dp"`
  - `resizeMode`: `"horizontal|vertical"`
- Registered three complementary widgets with matching dimensions for native launcher stacking:
  1. `NextClassWidget` ("Next Class & Schedule")
  2. `AttendanceWidget` ("Attendance Status")
  3. `QuickStatsWidget` ("Quick Stats")

### B. Adaptive Sizing & Multi-Card Stack (`widgets/NextClassWidget.tsx`)
- **Dynamic Tier Detection**: Reads `widgetInfo.width` and `height` in dp:
  - **Compact (2x2)**: Status badge, time, bold subject name, room, and type chips.
  - **Medium (4x2 / 3x2)**: Full-width info pills, bold class title, live time range, and status pill.
  - **Large (4x4, 4x5, 5x6)**: Hero card for Next Class, large pills, plus a **Today's Timeline** section with upcoming classes and academic summary footer.
- **Interactive iOS-Style Stack (3 Cards)**:
  - Built-in stack indicator `[ ● ○ ○ ↻ ]` in top-right with `clickAction="CYCLE_STACK"`.
  - **Card 0**: Next Class (Live / upcoming details)
  - **Card 1**: Today's Schedule (Chronological timeline of all today's classes)
  - **Card 2**: Attendance & CGPA (Large percentage, safe/warning status, attended count, and progress bar)

### C. Background Task Handler (`widgets/widget-task-handler.tsx`)
- Passes `widgetInfo` into all render calls on `WIDGET_ADDED`, `WIDGET_UPDATE`, and `WIDGET_RESIZED`.
- Handles `WIDGET_CLICK` with `CYCLE_STACK`: advances active stack card index in AsyncStorage (`@widget_stack_${widgetId}`) and immediately triggers re-render on the user's home screen.
- Routes all 3 widget types (`NextClassWidget`, `AttendanceWidget`, `QuickStatsWidget`).

### D. Multi-Day Look-Ahead & Auto-Sync (`widgets/widget-sync.ts`)
- **7-Day Forward Look-Ahead**: Scans up to 7 days ahead across the stored week's timetable so Saturday afternoons and Sundays automatically display Monday morning's first class.
- **Real-Time Timers**: Live calculation of remaining minutes (`LIVE NOW • Xm left` / `STARTS IN Xm`).
- **`initWidgetAutoSync()`**:
  - `AppState` listener triggers immediate widget re-sync whenever app enters the foreground.
  - 60-second timer keeps countdowns ticking accurately while app is open.
- **`getWidgetClassData()`**: Extracts timetable, makeup classes, overall attendance, attendance breakdown, and CGPA from `@scraped_data`.

### E. Standalone Companion Widgets
- `widgets/AttendanceWidget.tsx`: Progress bar, attendance %, attended/total count, and critical at-risk badges.
- `widgets/QuickStatsWidget.tsx`: Side-by-side CGPA + Attendance with dual progress bars and upcoming class preview.

### F. App Integration (`app/(tabs)/index.tsx`)
- Initialized `initWidgetAutoSync()` in dashboard `useEffect` triggered on timetable, attendance, and CGPA updates.

---

## 3. Apple-Level Redesign Release (2026-10-23)

### A. Authentic Apple Design System (`widgets/theme.ts`)
- **Obsidian Dark Surface Palette**: Clean `#1C1C1E` squircle background, `#2C2C2E` subtle surface, `#3A3A3C` elevated chips, and `#38383A` 1px borders.
- **Apple System Tints**:
  - Apple Mint (`#30D158`): Safe attendance, live class indicator dot, positive margin.
  - Apple Blue (`#0A84FF`): Timetable deep link chips, next classes.
  - Apple Amber (`#FF9F0A`): Attention warning, close to 75% attendance margin.
  - Apple Coral (`#FF453A`): Danger/critical, below 75% target threshold.
  - Apple Purple (`#BF5AF2`): Cumulative GPA metrics.
  - Apple Teal (`#64D2FF`): Campus building and room decoded location.
- **Continuous Squircle Geometry**: 24dp corner radii, generous padding, balanced typographic proportions.

### B. Mathematical 75% Bunk Margin Calculator (`calculateBunkMargin`)
- Exact discrete integer calculation based on $A$ (attended) and $T$ (total) classes:
  - If $A/T \ge 0.75$: Maximum classes skippable $m = \lfloor (4A - 3T)/3 \rfloor \implies \text{"+}m\text{ Can Skip"}$ (Apple Mint).
  - If $A/T < 0.75$: Minimum consecutive classes required $n = \max(1, 3T - 4A) \implies \text{"Need }n\text{ classes"}$ (Apple Coral / Amber).
- Displayed prominently across all widgets with visual badge indicators.

### C. Apple Smart Stack (`widgets/NextClassWidget.tsx`)
- **Vertical Navigation Indicators**: Capsule pill indicator aligned along the right edge (`• • • •`), synchronizing in real time with the active card index.
- **Cycling Controls**: Bidirectional navigation (`UP_STACK`, `DOWN_STACK`, `CYCLE_STACK`) with cyclic modulo indexing.
- **Card 0 (Live / Next Class)**: Live pulsing mint dot, bold time hero, decoded room badge (`Block 34 • 1st Floor`), subject code, room pill, and Bunk Margin status.
- **Card 1 (Attendance & Bunk Margin)**: Giant Apple Activity percentage hero (`78.4%`), horizontal progress bar with 75% threshold marker, and Bunk Margin badge.
- **Card 2 (Today's Schedule Timeline)**: Chronological lecture timeline with active class highlight, room pills, and deep links.
- **Card 3 (Exam Countdown)**: Contextual exam countdown card activated when MTE/ETE is within 14 days, detailing days remaining, room, and seat.
- **Card 4 (Academic Overview)**: 3-tile glanceable summary with CGPA, attendance safety, and upcoming lecture.
- **2×2 Compact Variant**: Intelligent minimal layout displaying course code, room number, class time, and live timer.

### D. Standalone Apple Widgets
- `widgets/AttendanceWidget.tsx`: Apple Activity aesthetics with large percentage hero, attended counter, progress bar, and Bunk Margin badge.
- `widgets/QuickStatsWidget.tsx`: Apple Modular 3-tile grid for CGPA (`8.42`), Overall Attendance (`78.4%`), and Next Class (`34-101`).

### E. Android Widget Picker Previews (`assets/widgets/`)
- Pre-rendered pixel-perfect preview PNGs matching the Apple design language:
  - `assets/widgets/smart_stack_preview.png`: 4×2 preview for "Smart Class Stack".
  - `assets/widgets/attendance_preview.png`: 4×2 preview for "Attendance & Bunk Margin".
  - `assets/widgets/quick_stats_preview.png`: 4×2 preview for "Academic Overview".
- Configured in `app.json` with `previewImage` and human-readable metadata for discovery in the Android widget drawer.

---

## 4. Deployment & Release Records

### Git Commit & Push
- **Commit**: `171e8b564e59871ca8a062e5670a861c26612ab3`
- **Branch**: `main` -> `origin/main`
- **Repo URL**: `https://github.com/Ashishshankar26/ALMS`

### EAS OTA Update
- **Branch / Channel**: `production`
- **Runtime Version**: `1.0.3`
- **Update Group ID**: `4273968a-877a-4070-a2f4-bb6881a2e678`
- **Android Update ID**: `01a167f5-4c15-74c2-9fda-4231e19d7c37`
- **iOS Update ID**: `01a167f5-4c15-71dd-9a2b-771f107dbe0a`
- **EAS Dashboard**: `https://expo.dev/accounts/ashish_26/projects/lpu-app/updates/4273968a-877a-4070-a2f4-bb6881a2e678`

