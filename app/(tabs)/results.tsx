import React, { useEffect, useRef, useState } from 'react';
import { Dimensions, Linking, Modal, PanResponder, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp, Layout } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowDownToLine, Award, GraduationCap, RotateCcw, X } from 'lucide-react-native';
import { useScraper } from '../../context/ScraperContext';
import { useTheme } from '../../context/ThemeContext';

const { width, height } = Dimensions.get('window');
const SCREEN_WIDTH = Math.min(width, 500);
const CARD_WIDTH = Math.min(328, SCREEN_WIDTH - 54);
const CARD_HEIGHT = 192;
const STACK_STEP = 42;

const PAGE = {
  bg: '#F5F4EF',
  ink: '#111111',
  muted: '#91918A',
  paper: '#FFFFFF',
  line: 'rgba(17,17,17,0.09)',
};

const CARD_THEMES: [string, string, string][] = [
  ['#E9E5DA', '#ED432F', '#111111'],
  ['#F7506B', '#B9F55E', '#101010'],
  ['#AAB9FF', '#EDE7D4', '#111111'],
  ['#DAD7C4', '#69D08C', '#101010'],
  ['#F4FF62', '#92D980', '#101010'],
  ['#B4EFE9', '#C85CFF', '#111111'],
];

type TabType = 'REGULAR' | 'BACKLOG';

export default function ResultsScreen() {
  const { data } = useScraper();
  const { colors, isDark } = useTheme();
  const resultsData = data.results && data.results.length > 0 ? data.results : [];
  const palette = {
    bg: isDark ? '#0D0E10' : '#F5F4EF',
    ink: isDark ? '#F7F4EA' : PAGE.ink,
    ghost: isDark ? '#4D5056' : '#A8A8A2',
    paper: isDark ? '#17191D' : PAGE.paper,
    panel: isDark ? '#1D2026' : '#F7F5EE',
    rail: isDark ? '#1A1C21' : '#E9E6DC',
    muted: isDark ? '#8F949C' : PAGE.muted,
    line: isDark ? 'rgba(255,255,255,0.1)' : PAGE.line,
  };

  const isBacklog = (term: string) => {
    const cleaned = term.replace(/Term/i, '').replace(/Semester/i, '').replace(/Id/i, '').replace(/:/g, '').trim().toUpperCase();
    const romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
    if (romanNumerals.includes(cleaned)) return false;
    if (/^\d+$/.test(cleaned)) return false;
    return /[A-Z]/.test(cleaned);
  };

  const regularResults = resultsData.filter((sem: any) => !isBacklog(sem.semester));
  const backlogResults = resultsData.filter((sem: any) => isBacklog(sem.semester));

  const [activeTab, setActiveTab] = useState<TabType>('REGULAR');
  const [activeSemIndex, setActiveSemIndex] = useState(0);
  const [openedIndex, setOpenedIndex] = useState<number | null>(null);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);
  const swipeLock = useRef(false);
  const modalScrollRef = useRef<ScrollView>(null);

  const displayData = activeTab === 'REGULAR' ? regularResults : backlogResults;
  const openedSemester = openedIndex !== null ? displayData[Math.min(openedIndex, Math.max(displayData.length - 1, 0))] : null;
  const openedSubjects = openedSemester?.subjects || [];

  useEffect(() => {
    setActiveSemIndex(0);
    setOpenedIndex(null);
    setExpandedSubject(null);
  }, [activeTab, displayData.length]);

  const getSemesterTitle = (semester: string, index: number) => {
    if (activeTab === 'BACKLOG') return semester || 'Reappear';
    const cleaned = semester.replace(/Term/i, '').replace(/Semester/i, '').replace(/Id/i, '').replace(/:/g, '').trim();
    return cleaned ? `Semester ${cleaned}` : `Semester ${index + 1}`;
  };

  const getCardTheme = (index: number): [string, string, string] => {
    if (activeTab === 'BACKLOG') return ['#FFB23F', '#FF4662', '#111111'];
    return CARD_THEMES[index % CARD_THEMES.length];
  };

  const getGradeGradient = (grade?: string): [string, string] => {
    const normalized = (grade || '').trim().toUpperCase();
    if (['O', 'A+', 'A'].includes(normalized)) return ['#B8F86F', '#4FC878'];
    if (['B+', 'B'].includes(normalized)) return ['#A9BCFF', '#58D4EE'];
    if (['C+', 'C'].includes(normalized)) return ['#FFF06C', '#FFB24B'];
    if (['D', 'E', 'F', 'R'].includes(normalized)) return ['#FF7B8B', '#EF3D42'];
    return ['#E8E6DC', '#CFCFC7'];
  };

  const getGradeScore = (grade?: string) => {
    const normalized = (grade || '').trim().toUpperCase();
    if (normalized === 'O') return 10;
    if (normalized === 'A+') return 9;
    if (normalized === 'A') return 8;
    if (normalized === 'B+') return 7;
    if (normalized === 'B') return 6;
    if (normalized === 'C+' || normalized === 'C') return 5;
    if (normalized === 'D') return 4;
    return 2;
  };

  const escapeHtml = (value: any) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[char] || char));

  const buildResultHtml = (semester: any, index: number) => {
    const title = getSemesterTitle(semester.semester, index);
    const subjects = semester.subjects || [];
    const rows = subjects.map((sub: any, subjectIndex: number) => {
      const marks = (sub.marksDetails || []).map((mark: any) => `
        <tr>
          <td>${escapeHtml(mark.type)}</td>
          <td>${escapeHtml(mark.marks)}</td>
          <td>${escapeHtml(mark.weightage)}</td>
        </tr>
      `).join('');

      return `
        <section class="subject">
          <div class="subject-head">
            <div class="count">${subjectIndex + 1}</div>
            <div>
              <h2>${escapeHtml(sub.name)}</h2>
              <p>${escapeHtml(sub.code)}</p>
            </div>
            ${activeTab === 'BACKLOG' ? '' : `<strong>${escapeHtml(sub.grade || '--')}</strong>`}
          </div>
          ${marks ? `<table><thead><tr><th>Component</th><th>Marks</th><th>Weightage</th></tr></thead><tbody>${marks}</tbody></table>` : '<p class="empty">No marks available</p>'}
        </section>
      `;
    }).join('');

    return `
      <!doctype html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>${escapeHtml(title)} Results</title>
          <style>
            body { margin: 0; padding: 32px; font-family: Arial, sans-serif; background: #f5f4ef; color: #111; }
            .sheet { max-width: 760px; margin: auto; background: #fff; border-radius: 28px; padding: 28px; }
            h1 { margin: 0; font-size: 34px; }
            .meta { display: flex; gap: 12px; margin: 20px 0 26px; }
            .tile { flex: 1; background: #f1efe6; border-radius: 18px; padding: 16px; }
            .tile b { display: block; font-size: 28px; }
            .tile span { color: #666; font-size: 12px; font-weight: 700; text-transform: uppercase; }
            .subject { page-break-inside: avoid; border-radius: 18px; padding: 16px; margin: 12px 0; background: #f7f5ee; }
            .subject-head { display: flex; align-items: center; gap: 12px; }
            .count { width: 38px; height: 38px; border-radius: 19px; display: grid; place-items: center; background: #111; color: white; font-weight: 900; }
            h2 { flex: 1; margin: 0; font-size: 17px; }
            p { margin: 4px 0 0; color: #666; font-size: 12px; }
            strong { margin-left: auto; font-size: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 12px; }
            th, td { text-align: left; padding: 9px; border-top: 1px solid #ddd; }
            .empty { color: #777; }
          </style>
        </head>
        <body>
          <main class="sheet">
            <h1>${escapeHtml(title)}</h1>
            <div class="meta">
              <div class="tile"><b>${escapeHtml(activeTab === 'BACKLOG' ? subjects.length : (semester.sgpa || '--'))}</b><span>${activeTab === 'BACKLOG' ? 'Backlogs' : 'TGPA'}</span></div>
              <div class="tile"><b>${subjects.length}</b><span>Total Subjects</span></div>
            </div>
            ${rows}
          </main>
          <script>setTimeout(function(){ window.print && window.print(); }, 300);</script>
        </body>
      </html>
    `;
  };

  const downloadResultPdf = async (semester: any, index: number) => {
    const html = buildResultHtml(semester, index);
    const title = getSemesterTitle(semester.semester, index);
    const fileName = `${title.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'result'}-${activeTab.toLowerCase()}-results.pdf`;
    if (Platform.OS === 'web') {
      const win = (globalThis as any).window?.open('', '_blank');
      if (win) {
        win.document.write(html);
        win.document.close();
      }
      return;
    }
    try {
      const Print = await import('expo-print');
      const FileSystem = await import('expo-file-system');
      const Sharing = await import('expo-sharing');
      const printed = await Print.printToFileAsync({ html, base64: false });
      const source = new FileSystem.File(printed.uri);
      const destination = new FileSystem.File(FileSystem.Paths.document, fileName);

      if (destination.exists) {
        destination.delete();
      }
      source.copy(destination);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(destination.uri, {
          mimeType: 'application/pdf',
          dialogTitle: fileName,
          UTI: 'com.adobe.pdf',
        });
      } else {
        await Linking.openURL(destination.uri);
      }
    } catch (error) {
      console.error('Failed to save result PDF', error);
    }
  };

  const resultRowColors = ['#EBC8FF', '#DFFF78', '#BDEBFF', '#FFA4A7', '#C9FFE0', '#FFC0D9'];

  const moveStack = (direction: 1 | -1) => {
    setActiveSemIndex((current) => Math.max(0, Math.min(current + direction, displayData.length - 1)));
  };

  const resetResultsView = () => {
    setActiveTab('REGULAR');
    setActiveSemIndex(0);
    setOpenedIndex(null);
    setExpandedSubject(null);
    setDownloadOpen(false);
  };

  const stackPan = PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 12 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
    onPanResponderMove: (_, gesture) => {
      if (swipeLock.current || Math.abs(gesture.dy) < 42) return;
      swipeLock.current = true;
      moveStack(gesture.dy < 0 ? 1 : -1);
    },
    onPanResponderRelease: () => {
      swipeLock.current = false;
    },
    onPanResponderTerminate: () => {
      swipeLock.current = false;
    },
  });

  if (resultsData.length === 0) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: palette.bg }]}>
        <View style={styles.emptyIconContainer}>
          <GraduationCap size={48} color={colors.primary} />
        </View>
        <Text style={styles.emptyText}>No results found yet.</Text>
        <Text style={styles.emptySubtext}>Pull to refresh on the home screen to sync your semester-wise grades.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: palette.bg }]}>
      <View style={styles.content}>
        <Animated.View entering={FadeInUp.delay(60).duration(480).springify()} style={styles.header}>
          <View>
            <Text style={[styles.heroTitle, { color: palette.ink }]}>Manage</Text>
            <Text style={[styles.heroGhost, { color: palette.ghost }]}>Your Results</Text>
          </View>
          <LinearGradient
            colors={isDark ? ['rgba(255,255,255,0.18)', 'rgba(255,255,255,0.05)'] : ['rgba(255,255,255,0.95)', 'rgba(218,223,234,0.62)']}
            style={[styles.cgpaPlate, { borderColor: palette.line }]}
          >
            <Text style={[styles.cgpaValue, { color: palette.ink }]}>{data.cgpa || '0.00'}</Text>
          </LinearGradient>
        </Animated.View>

        {displayData.length === 0 ? (
          <View style={styles.emptyRecordCard}>
            <Award size={28} color={PAGE.ink} />
            <Text style={styles.emptyRecordTitle}>Clear Record</Text>
            <Text style={styles.emptyRecordSub}>You have no reappear or backlog subjects.</Text>
          </View>
        ) : (
          <>
            <View style={styles.stackStage}>
              <View
                {...stackPan.panHandlers}
                style={[styles.stackDeck, { height: Math.min(height * 0.5, CARD_HEIGHT + Math.max(displayData.length - 1, 0) * STACK_STEP + 88) }]}
              >
                {displayData.map((sem: any, index: number) => {
                  const [base, accent, ink] = getCardTheme(index);
                  const subjectCount = sem.subjects?.length || 0;
                  const isActive = index === activeSemIndex;
                  const relative = index - activeSemIndex;
                  const visibleOffset = relative * STACK_STEP;
                  const top = 36 + visibleOffset;

                  return (
                    <Animated.View
                      key={`${sem.semester}-${index}`}
                      entering={FadeInDown.delay(70 + index * 45).duration(420)}
                      layout={Layout.duration(360)}
                      style={{
                        position: 'absolute',
                        left: 0,
                        width: CARD_WIDTH,
                        zIndex: isActive ? displayData.length + 4 : displayData.length - index,
                        top,
                      }}
                    >
                      <Animated.View
                        style={[
                          styles.cardWrap,
                          {
                            position: 'relative',
                            top: 0,
                            shadowColor: isActive ? accent : '#111111',
                            shadowOpacity: isActive ? 0.5 : 0.24,
                            shadowRadius: isActive ? 42 : 28,
                            elevation: isActive ? 20 : 12,
                            opacity: relative < -2 || relative > 5 ? 0 : 1,
                            transform: [
                              { translateY: isActive ? -8 : Math.abs(relative) * 1.5 },
                              { scale: isActive ? 1 : 0.97 - Math.min(Math.abs(relative), 5) * 0.008 },
                            ],
                          },
                        ]}
                      >
                      {Platform.OS === 'android' ? (
                        <>
                          <View style={[styles.semCardGlow, { backgroundColor: accent, opacity: isActive ? 0.08 : 0.03, transform: [{ scale: isActive ? 1.15 : 1.04 }], borderRadius: 42 }]} />
                          <View style={[styles.semCardGlow, { backgroundColor: accent, opacity: isActive ? 0.15 : 0.06, transform: [{ scale: isActive ? 1.08 : 1.00 }], borderRadius: 38 }]} />
                          <View style={[styles.semCardGlow, { backgroundColor: accent, opacity: isActive ? 0.25 : 0.1, transform: [{ scale: isActive ? 1.02 : 0.96 }], borderRadius: 34 }]} />
                        </>
                      ) : (
                        <View
                          style={[
                            styles.semCardGlow,
                            {
                              backgroundColor: accent,
                              opacity: isActive ? 0.22 : 0.1,
                              transform: [{ scale: isActive ? 1.02 : 0.96 }],
                            },
                          ]}
                        />
                      )}
                      <TouchableOpacity
                        activeOpacity={0.92}
                        onPress={() => {
                          setActiveSemIndex(index);
                          setOpenedIndex(index);
                          setExpandedSubject(null);
                        }}
                      >
                        <LinearGradient
                          colors={[base, accent]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={[
                            styles.semCard,
                            {
                              borderColor: isActive
                                ? 'rgba(255,255,255,0.34)'
                                : isDark
                                  ? 'rgba(255,255,255,0.15)'
                                  : 'rgba(17,17,17,0.1)',
                            },
                          ]}
                        >
                          <View style={[styles.neonEdge, { borderColor: accent }]} />
                          <View style={[styles.stackHandle, { backgroundColor: ink === '#111111' || ink === '#101010' ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.25)' }]} />
                          <View style={[styles.shapeCircle, { backgroundColor: accent }]} />
                          <View style={[styles.shapeHalf, { backgroundColor: accent }]} />
                          <View style={styles.stripeGroup}>
                            <View style={[styles.stripe, { backgroundColor: ink }]} />
                            <View style={[styles.stripe, { backgroundColor: ink }]} />
                            <View style={[styles.stripe, { backgroundColor: ink }]} />
                            <View style={[styles.stripe, { backgroundColor: ink }]} />
                          </View>
                          <View style={styles.cardTop}>
                            <Text style={[styles.cardTitle, { color: ink }]}>{getSemesterTitle(sem.semester, index)}</Text>
                            <View style={[styles.cardMark, { backgroundColor: ink }]}>
                              <Text style={[styles.cardMarkText, { color: base }]}>ALMS</Text>
                            </View>
                          </View>
                          <View style={styles.cardScoreRow}>
                            <Text style={[styles.cardScore, { color: ink }]}>{activeTab === 'BACKLOG' ? subjectCount : (sem.sgpa || '--')}</Text>
                            <Text style={[styles.cardScoreUnit, { color: ink }]}>{activeTab === 'BACKLOG' ? 'items' : 'tgpa'}</Text>
                          </View>
                          <View style={styles.cardBottom}>
                            <Text style={[styles.cardMeta, { color: ink }]}>{subjectCount} subjects</Text>
                            <Text style={[styles.cardMeta, { color: ink }]}>.... {String(index + 1).padStart(4, '0')}</Text>
                          </View>
                        </LinearGradient>
                      </TouchableOpacity>
                      </Animated.View>
                    </Animated.View>
                  );
                })}
              </View>
            </View>

            <Animated.View
              entering={FadeInUp.delay(140).duration(460).springify()}
              style={[
                styles.bottomActions,
                {
                  backgroundColor: isDark ? 'rgba(15, 18, 22, 0.78)' : 'rgba(244, 244, 239, 0.84)',
                  borderColor: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.82)',
                },
              ]}
            >
              <TouchableOpacity activeOpacity={0.75} onPress={() => setDownloadOpen(true)} style={styles.sideAction}>
                <ArrowDownToLine size={21} color={isDark ? '#FFFFFF' : '#111111'} strokeWidth={2.6} />
              </TouchableOpacity>
              <LinearGradient
                colors={isDark ? ['rgba(255,255,255,0.16)', 'rgba(255,255,255,0.05)'] : ['rgba(255,255,255,0.9)', 'rgba(230,232,238,0.56)']}
                style={[styles.bottomToggle, { borderColor: palette.line }]}
              >
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setActiveTab('REGULAR')}
                  style={[styles.bottomToggleItem, activeTab === 'REGULAR' && { backgroundColor: palette.ink }]}
                >
                  <Text style={[styles.bottomToggleText, { color: activeTab === 'REGULAR' ? palette.bg : palette.ink }]}>Sem</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setActiveTab('BACKLOG')}
                  style={[styles.bottomToggleItem, activeTab === 'BACKLOG' && { backgroundColor: palette.ink }]}
                >
                  <Text style={[styles.bottomToggleText, { color: activeTab === 'BACKLOG' ? palette.bg : palette.ink }]}>Back</Text>
                </TouchableOpacity>
              </LinearGradient>
              <TouchableOpacity
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityLabel="Reset results stack"
                onPress={resetResultsView}
                style={styles.sideAction}
              >
                <RotateCcw size={21} color={isDark ? '#FFFFFF' : '#111111'} strokeWidth={2.6} />
              </TouchableOpacity>
            </Animated.View>
          </>
        )}
      </View>

      <Modal visible={!!openedSemester} transparent animationType="fade" onRequestClose={() => setOpenedIndex(null)}>
        <View style={styles.modalBackdrop}>
          {openedSemester ? (
            <Animated.View
              key={`${activeTab}-${openedIndex}`}
              entering={FadeInUp.duration(280)}
              style={[styles.floatingWindow, { backgroundColor: palette.paper, borderColor: isDark ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.76)' }]}
            >
              <LinearGradient colors={isDark ? ['#202329', '#14161A'] : ['#FFFFFF', '#F5F4EF']} style={styles.windowGradient}>
                <View style={styles.windowTop}>
                  <View>
                    <Text style={[styles.windowEyebrow, { color: palette.muted }]}>Opened Semester</Text>
                    <Text style={[styles.windowTitle, { color: palette.ink }]}>{getSemesterTitle(openedSemester.semester, openedIndex || 0)}</Text>
                  </View>
                  <TouchableOpacity activeOpacity={0.78} onPress={() => setOpenedIndex(null)} style={[styles.closeButton, { backgroundColor: palette.rail, borderColor: palette.line }]}>
                    <X size={18} color={palette.ink} />
                  </TouchableOpacity>
                </View>

                  <View style={styles.metrics}>
                  <View style={[styles.metricTile, { backgroundColor: isDark ? '#F7F5EE' : '#F1EFE6', borderColor: 'rgba(255,255,255,0.62)' }]}>
                    <Text style={[styles.metricValue, { color: PAGE.ink }]}>{activeTab === 'BACKLOG' ? openedSubjects.length : (openedSemester.sgpa || '--')}</Text>
                    <Text style={[styles.metricLabel, { color: 'rgba(17,17,17,0.62)' }]}>{activeTab === 'BACKLOG' ? 'Backlogs' : 'Sem TGPA'}</Text>
                  </View>
                  <View style={[styles.metricTile, { backgroundColor: isDark ? '#F7F5EE' : '#F1EFE6', borderColor: 'rgba(255,255,255,0.62)' }]}>
                    <Text style={[styles.metricValue, { color: PAGE.ink }]}>{openedSubjects.length}</Text>
                    <Text style={[styles.metricLabel, { color: 'rgba(17,17,17,0.62)' }]}>Total Subjects</Text>
                  </View>
                  </View>

                <ScrollView ref={modalScrollRef} showsVerticalScrollIndicator={false} style={styles.modalScroll} contentContainerStyle={styles.subjectList}>
                  {openedSubjects.map((sub: any, subIndex: number) => {
                    const subjectKey = `${openedIndex}-${subIndex}`;
                    const isSubExpanded = expandedSubject === subjectKey;
                    const hasMarks = sub.marksDetails && sub.marksDetails.length > 0;

                    const score = getGradeScore(activeTab === 'BACKLOG' ? 'R' : sub.grade);
                    const rowColor = resultRowColors[subIndex % resultRowColors.length];

                    return (
                      <View key={subjectKey} style={[styles.resultRowCard, { backgroundColor: rowColor, borderColor: 'rgba(255,255,255,0.62)' }]}>
                        <TouchableOpacity
                          activeOpacity={0.78}
                          onPress={() => {
                            setExpandedSubject(isSubExpanded ? null : subjectKey);
                            if (!isSubExpanded) {
                              setTimeout(() => {
                                modalScrollRef.current?.scrollTo({
                                  y: Math.max(0, subIndex * 78 - 18),
                                  animated: true,
                                });
                              }, 80);
                            }
                          }}
                          style={styles.subjectRow}
                        >
                          <View style={styles.resultIndex}>
                            <Text style={styles.resultIndexText}>{subIndex + 1}</Text>
                          </View>
                          <View style={styles.subjectInfo}>
                            <Text style={[styles.subjectTitle, { color: PAGE.ink }]} numberOfLines={1}>{sub.name}</Text>
                            <View style={styles.progressTrack}>
                              <View style={[styles.progressFill, { width: `${score * 10}%` as any }]} />
                            </View>
                            <Text style={[styles.subjectSub, { color: 'rgba(17,17,17,0.62)' }]} numberOfLines={1}>{sub.code}{hasMarks ? ' / marks' : ''}</Text>
                          </View>
                          {activeTab === 'BACKLOG' ? (
                            <Text style={styles.backlogTag}>Backlog</Text>
                          ) : (
                            <View style={styles.gradeBox}>
                              <Text style={[styles.gradeMain, { color: PAGE.ink }]}>{sub.grade || '--'}</Text>
                              <Text style={[styles.gradeScore, { color: 'rgba(17,17,17,0.62)' }]}>{score}/10</Text>
                            </View>
                          )}
                        </TouchableOpacity>

                        {isSubExpanded && hasMarks && (
                            <View style={styles.marksPanel}>
                            {sub.marksDetails.map((mark: any, markIndex: number) => {
                              let displayType = mark.type;
                              const tLower = displayType.toLowerCase();
                              if (tLower.includes('continuous assessment')) displayType = 'CA';
                              else if (tLower.includes('mid term')) displayType = 'Mid Term';
                              else if (tLower.includes('end term')) displayType = 'End Term';
                              else if (tLower.includes('attendance')) displayType = 'Attendance';

                              return (
                                <View key={markIndex} style={[styles.markRow, { borderTopColor: palette.line }]}>
                                  <Text style={[styles.markType, { color: PAGE.ink }]} numberOfLines={2}>{displayType}</Text>
                                  <Text style={[styles.markValue, { color: PAGE.ink }]}>{mark.marks}</Text>
                                  <Text style={[styles.markWeight, { color: 'rgba(17,17,17,0.62)' }]}>{mark.weightage}</Text>
                                </View>
                              );
                            })}
                            </View>
                          )}
                      </View>
                    );
                  })}
                </ScrollView>
              </LinearGradient>
            </Animated.View>
          ) : null}
        </View>
      </Modal>

      <Modal visible={downloadOpen} transparent animationType="fade" onRequestClose={() => setDownloadOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.downloadSheet, { backgroundColor: palette.paper }]}>
            <View style={styles.windowTop}>
              <View>
                <Text style={[styles.windowEyebrow, { color: palette.muted }]}>Download PDF</Text>
                <Text style={[styles.downloadTitle, { color: palette.ink }]}>{activeTab === 'REGULAR' ? 'Semester Results' : 'Backlog Results'}</Text>
              </View>
              <TouchableOpacity activeOpacity={0.78} onPress={() => setDownloadOpen(false)} style={[styles.closeButton, { backgroundColor: palette.rail }]}>
                <X size={18} color={palette.ink} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.downloadList}>
              {displayData.map((sem: any, index: number) => (
                <TouchableOpacity
                  key={`${sem.semester}-${index}-download`}
                  activeOpacity={0.82}
                  style={[styles.downloadRow, { backgroundColor: palette.panel, borderColor: palette.line }]}
                  onPress={() => downloadResultPdf(sem, index)}
                >
                  <View>
                    <Text style={[styles.downloadRowTitle, { color: palette.ink }]}>{getSemesterTitle(sem.semester, index)}</Text>
                    <Text style={[styles.downloadRowSub, { color: palette.muted }]}>{sem.subjects?.length || 0} subjects with marks</Text>
                  </View>
                  <ArrowDownToLine size={18} color={palette.ink} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PAGE.bg,
  },
  content: {
    flex: 1,
    paddingTop: 54,
    paddingBottom: 24,
  },
  header: {
    paddingHorizontal: 26,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  heroTitle: {
    fontSize: 44,
    lineHeight: 44,
    fontWeight: '900',
    letterSpacing: -1.2,
  },
  heroGhost: {
    fontSize: 40,
    lineHeight: 40,
    fontWeight: '900',
    letterSpacing: -1.1,
  },
  cgpaPlate: {
    minWidth: 84,
    minHeight: 56,
    paddingHorizontal: 16,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    shadowColor: '#C4C0B8',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
    elevation: 8,
  },
  cgpaLabel: {
    color: PAGE.muted,
    fontSize: 10,
    fontWeight: '900',
  },
  cgpaValue: {
    fontSize: 25,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  toggleShell: {
    marginTop: 24,
    marginHorizontal: 26,
    padding: 5,
    borderRadius: 23,
    backgroundColor: '#E9E6DC',
    flexDirection: 'row',
  },
  toggleItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 19,
  },
  toggleActive: {
    backgroundColor: PAGE.paper,
    shadowColor: '#C4C0B8',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 14,
    elevation: 5,
  },
  toggleText: {
    color: PAGE.muted,
    fontSize: 13,
    fontWeight: '900',
  },
  toggleTextActive: {
    color: PAGE.ink,
  },
  cardRail: {
    paddingTop: 44,
    paddingBottom: 34,
    paddingHorizontal: 26,
    minHeight: CARD_HEIGHT + 84,
  },
  stackDeck: {
    alignSelf: 'center',
    width: CARD_WIDTH,
  },
  stackStage: {
    flex: 1,
    minHeight: CARD_HEIGHT + 190,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 6,
  },
  cardWrap: {
    position: 'absolute',
    left: 0,
    width: CARD_WIDTH,
    shadowColor: '#111111',
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.24,
    shadowRadius: 28,
    elevation: 12,
  },
  semCardGlow: {
    position: 'absolute',
    left: 12,
    right: 12,
    top: 18,
    bottom: -18,
    borderRadius: 32,
  },
  semCard: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 32,
    padding: 18,
    overflow: 'hidden',
    borderWidth: 1.5,
  },
  neonEdge: {
    position: 'absolute',
    left: 1,
    right: 1,
    top: 1,
    bottom: 1,
    borderRadius: 31,
    borderWidth: 1,
    opacity: 0.36,
  },
  stackHandle: {
    position: 'absolute',
    top: 12,
    alignSelf: 'center',
    width: 32,
    height: 3,
    borderRadius: 2,
    zIndex: 2,
  },
  shapeCircle: {
    position: 'absolute',
    right: -24,
    top: 48,
    width: 164,
    height: 164,
    borderRadius: 82,
    opacity: 0.92,
  },
  shapeHalf: {
    position: 'absolute',
    left: 116,
    top: 56,
    width: 112,
    height: 112,
    borderTopLeftRadius: 56,
    borderBottomLeftRadius: 56,
    opacity: 0.74,
  },
  stripeGroup: {
    position: 'absolute',
    right: 38,
    top: 42,
    gap: 4,
    width: 60,
    opacity: 0.82,
  },
  stripe: {
    height: 3,
    borderRadius: 2,
    transform: [{ rotate: '10deg' }],
  },
  cardTop: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '500',
  },
  cardMark: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  cardMarkText: {
    fontSize: 9,
    fontWeight: '900',
  },
  cardScoreRow: {
    position: 'absolute',
    left: 18,
    bottom: 36,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  cardScore: {
    fontSize: 42,
    fontWeight: '900',
    letterSpacing: -1.1,
  },
  cardScoreUnit: {
    fontSize: 13,
    fontWeight: '900',
    marginLeft: 4,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  cardBottom: {
    position: 'absolute',
    left: 18,
    right: 18,
    bottom: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardMeta: {
    fontSize: 12,
    fontWeight: '900',
    opacity: 0.72,
  },
  dots: {
    marginTop: -8,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 7,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#D2D0C7',
  },
  dotActive: {
    width: 24,
    backgroundColor: PAGE.ink,
  },
  bottomActions: {
    alignSelf: 'center',
    // Increased bottom margin for safe‑area clearance
    marginTop: 0,
    marginBottom: 100,
    minWidth: 270,
    // Slightly slimmer bar for a premium feel
    height: 64,
    paddingHorizontal: 12,
    borderRadius: 32,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.13)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    shadowColor: '#111111',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.16,
    shadowRadius: 20,
    elevation: 8,
  },
  sideAction: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.32)',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
  },
  bottomToggle: {
    minWidth: 118,
    height: 54,
    borderRadius: 27,
    borderWidth: 1,
    padding: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#111111',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.12,
    shadowRadius: 22,
    elevation: 7,
    overflow: 'hidden',
  },
  bottomToggleItem: {
    minWidth: 52,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  bottomToggleText: {
    fontSize: 12,
    fontWeight: '900',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.42)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
  },
  floatingWindow: {
    width: '100%',
    maxWidth: 386,
    maxHeight: '74%',
    borderRadius: 30,
    backgroundColor: PAGE.paper,
    overflow: 'hidden',
    borderWidth: 1,
    shadowColor: '#111111',
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.18,
    shadowRadius: 34,
    elevation: 14,
  },
  windowGradient: {
    padding: 14,
  },
  windowTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  windowEyebrow: {
    color: PAGE.muted,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  windowTitle: {
    color: PAGE.ink,
    fontSize: 23,
    fontWeight: '900',
    marginTop: 2,
    letterSpacing: -0.5,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EFEDE5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    shadowColor: '#111111',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  metrics: {
    marginTop: 14,
    marginBottom: 8,
    flexDirection: 'row',
    gap: 12,
  },
  metricTile: {
    flex: 1,
    minHeight: 70,
    borderRadius: 19,
    backgroundColor: '#F1EFE6',
    padding: 12,
    justifyContent: 'space-between',
    overflow: 'hidden',
    borderWidth: 1,
    shadowColor: '#111111',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 5,
  },
  metricValue: {
    color: PAGE.ink,
    fontSize: 24,
    fontWeight: '900',
  },
  metricLabel: {
    color: 'rgba(17,17,17,0.62)',
    fontSize: 11,
    fontWeight: '900',
  },
  subjectList: {
    marginTop: 12,
    gap: 8,
    paddingBottom: 26,
  },
  modalScroll: {
    maxHeight: Math.min(height * 0.42, 390),
  },
  resultRowCard: {
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    shadowColor: '#111111',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 4,
  },
  resultIndex: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(17,17,17,0.78)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultIndexText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
  },
  progressTrack: {
    marginTop: 8,
    height: 4,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.72)',
    overflow: 'hidden',
  },
  progressFill: {
    height: 4,
    borderRadius: 4,
    backgroundColor: '#25272C',
  },
  gradeBox: {
    minWidth: 58,
    alignItems: 'flex-end',
  },
  gradeMain: {
    fontSize: 21,
    fontWeight: '900',
  },
  gradeScore: {
    fontSize: 10,
    fontWeight: '900',
    marginTop: 1,
  },
  backlogTag: {
    color: PAGE.ink,
    fontSize: 12,
    fontWeight: '900',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.56)',
    overflow: 'hidden',
  },
  downloadSheet: {
    width: '100%',
    maxWidth: 386,
    maxHeight: '72%',
    borderRadius: 30,
    padding: 16,
    shadowColor: '#111111',
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.18,
    shadowRadius: 34,
    elevation: 14,
  },
  downloadTitle: {
    fontSize: 23,
    fontWeight: '900',
    marginTop: 2,
    letterSpacing: -0.5,
  },
  downloadList: {
    marginTop: 16,
    gap: 10,
    paddingBottom: 10,
  },
  downloadRow: {
    minHeight: 70,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  downloadRowTitle: {
    fontSize: 15,
    fontWeight: '900',
  },
  downloadRowSub: {
    fontSize: 11,
    fontWeight: '800',
    marginTop: 3,
  },
  subjectCard: {
    borderRadius: 22,
    backgroundColor: '#F7F5EE',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: PAGE.line,
  },
  subjectRow: {
    minHeight: 62,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  subjectIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subjectInfo: {
    flex: 1,
  },
  subjectTitle: {
    color: PAGE.ink,
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'capitalize',
  },
  subjectSub: {
    color: PAGE.muted,
    fontSize: 10,
    fontWeight: '800',
    marginTop: 3,
  },
  gradePill: {
    minWidth: 48,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  gradeText: {
    color: PAGE.ink,
    fontSize: 13,
    fontWeight: '900',
  },
  marksPanel: {
    paddingHorizontal: 14,
    paddingBottom: 12,
  },
  markRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: PAGE.line,
  },
  markType: {
    flex: 1,
    color: PAGE.ink,
    fontSize: 12,
    fontWeight: '800',
    paddingRight: 8,
  },
  markValue: {
    width: 82,
    color: PAGE.ink,
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'center',
  },
  markWeight: {
    width: 82,
    color: PAGE.muted,
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'right',
  },
  emptyRecordCard: {
    margin: 28,
    padding: 30,
    borderRadius: 30,
    backgroundColor: PAGE.paper,
    alignItems: 'center',
  },
  emptyRecordTitle: {
    color: PAGE.ink,
    fontSize: 18,
    fontWeight: '900',
    marginTop: 12,
  },
  emptyRecordSub: {
    color: PAGE.muted,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 6,
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    backgroundColor: PAGE.bg,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    backgroundColor: PAGE.paper,
  },
  emptyText: {
    color: PAGE.ink,
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
  },
  emptySubtext: {
    color: PAGE.muted,
    fontSize: 15,
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 22,
  },
});
