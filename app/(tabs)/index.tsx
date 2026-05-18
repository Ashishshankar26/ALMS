import React, { useRef, useCallback } from 'react';
import { StyleSheet, View, Text, ScrollView, RefreshControl, TouchableOpacity, Dimensions, Platform, Image, Modal, ActivityIndicator, PanResponder, Animated as RNAnimated } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { FadeInDown, FadeInRight, FadeInUp, Layout } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import Svg, { Defs, LinearGradient as SvgGradient, Stop, Rect } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';

// ... (other imports) ...
import { useScraper } from '../../context/ScraperContext';
import { useAuth } from '../../context/AuthContext';
import { LogOut, Bell, Clock, Award, ChevronRight, CheckCircle2, FileText, UploadCloud, GraduationCap, Moon, Sun, User, Lock, Wifi, UserCheck, Tag, MapPin, Coffee, Layers, BookOpen, PlusCircle, Calendar, Sparkles } from 'lucide-react-native';
import { useTheme, Typography } from '../../context/ThemeContext';
import { router, Redirect } from 'expo-router';
import * as Updates from 'expo-updates';
import * as Linking from 'expo-linking';
import Constants from 'expo-constants';
import { updateStickyClassNotification } from '../../utils/notifications';

const { width } = Dimensions.get('window');
const CARD_HEIGHT = 200;
const SWIPE_THRESHOLD = 25;

function CardGradient({ colors, style, children, id, borderStyle }: { colors: string[]; style?: any; children?: React.ReactNode; id: string; borderStyle?: any }) {
  const r = style?.borderRadius || 32;
  return (
    <LinearGradient
      colors={colors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[style, { overflow: 'hidden', borderRadius: r }, borderStyle]}
    >
      {children}
    </LinearGradient>
  );
}

// ── Swipeable Utility Card Stack ──
function SwipeableUtilityStack({ isDark, colors, data, nextExam, onFeePress, onLibraryPress, onExamsPress, onScrollToggle }: any) {
  const { isScraping, refreshData } = useScraper();
  const [activeIndex, setActiveIndex] = React.useState(0);
  const activeIndexRef = useRef(0);
  const translateY = useRef(new RNAnimated.Value(0)).current;
  const cardCount = 4;

  React.useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);


  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderGrant: () => {
        if (onScrollToggle) onScrollToggle(false);
      },
      onPanResponderMove: (_, gestureState) => {
        translateY.setValue(gestureState.dy);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (onScrollToggle) onScrollToggle(true);

        const isTap = Math.abs(gestureState.dy) < 5 && Math.abs(gestureState.dx) < 5;

        if (isTap) {
          const currentIdx = activeIndexRef.current;
          const activeCard = cards[currentIdx];
          if (activeCard.key === 'fee') onFeePress();
          else if (activeCard.key === 'exams') onExamsPress();
          else if (activeCard.key === 'attendance') router.push('/attendance' as any);
          else if (activeCard.key === 'library') onLibraryPress();
        } else if (gestureState.dy < -SWIPE_THRESHOLD) {
          setActiveIndex((prev: number) => (prev + 1) % cardCount);
        } else if (gestureState.dy > SWIPE_THRESHOLD) {
          setActiveIndex((prev: number) => (prev - 1 + cardCount) % cardCount);
        }

        RNAnimated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          damping: 24,
          stiffness: 180,
          mass: 0.6,
          restSpeedThreshold: 0.001,
          restDisplacementThreshold: 0.001,
        }).start();
      },
      onPanResponderTerminate: () => {
        if (onScrollToggle) onScrollToggle(true);
        RNAnimated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          damping: 24,
          stiffness: 180,
        }).start();
      },
    })
  ).current;

  const getCardOrder = () => {
    const order = [];
    for (let i = 0; i < cardCount; i++) {
      order.push((activeIndex + i) % cardCount);
    }
    return order.reverse();
  };

  const cards = [
    {
      key: 'fee',
      color: '#4A1D5B',
      gradient: ['#4A1D5B', '#2D1237'],
      render: (borderStyle?: any) => {
        const feeVal = parseFloat(data.fee?.replace(/,/g, '') || '0');
        const isClear = feeVal === 0;
        const formattedFee = new Intl.NumberFormat('en-IN').format(feeVal);
        return (
          <CardGradient id="grad_fee" colors={['#4A1D5B', '#2D1237']} style={styles.stackCardInner} borderStyle={borderStyle}>
            <View style={styles.stackHandle} />
            <View style={styles.stackGlassIcon}>
               <FileText size={20} color="#fff" />
            </View>
            <TouchableOpacity style={styles.stackFab} onPress={onFeePress}>
              <ChevronRight size={18} color="#fff" />
            </TouchableOpacity>
            <View style={styles.stackContentLeft}>
              <View style={styles.stackBadgeRow}>
                <View style={[styles.miniStatusBadge, { backgroundColor: isClear ? 'rgba(52, 199, 89, 0.2)' : 'rgba(255, 69, 58, 0.2)' }]}>
                  <Text style={[styles.miniStatusText, { color: isClear ? '#34C759' : '#FF453A' }]}>{isClear ? 'CLEAR' : 'DUE'}</Text>
                </View>
                <Text style={styles.stackLabelWhite}>FINANCIAL SUMMARY</Text>
              </View>
              <Text style={[styles.stackSubWhite, { opacity: 0.9, fontWeight: '700', fontSize: 13, marginBottom: -2 }]}>
                Academic Session 2024-25
              </Text>
              <Text style={[styles.stackBigValue, { fontSize: formattedFee.length > 8 ? 24 : 32 }]}>₹{formattedFee}</Text>
              <View style={styles.stackFooterRow}>
                <View style={styles.footerInfoItem}>
                  <FileText size={11} color="#fff" style={{ opacity: 0.8 }} />
                  <Text style={[styles.stackSubWhite]}>{isClear ? 'All Clear' : 'Outstanding'}</Text>
                </View>
                <View style={styles.footerInfoSeparator} />
                <View style={styles.footerInfoItem}>
                  <Wifi size={11} color="#fff" style={{ opacity: 0.8 }} />
                  <Text style={[styles.stackSubWhite]}>Live Sync</Text>
                </View>
              </View>
            </View>
          </CardGradient>
        );
      },
    },
    {
      key: 'library',
      color: '#F7CE5B',
      gradient: ['#F7CE5B', '#F1C40F'],
      render: (borderStyle?: any) => {
        const booking = data.roomBooking;
        const hour = new Date().getHours();
        const isOpen = hour >= 8 && hour < 21;
        return (
          <CardGradient id="grad_lib" colors={['#F7CE5B', '#F1C40F']} style={styles.stackCardInner} borderStyle={borderStyle}>
            <View style={styles.stackHandleLight} />
            <View style={[styles.stackGlassIcon, { backgroundColor: 'rgba(0, 0, 0, 0.05)', borderColor: 'rgba(0, 0, 0, 0.05)' }]}>
               <BookOpen size={20} color="#000" />
            </View>
            <TouchableOpacity style={[styles.stackFab, { backgroundColor: 'rgba(0,0,0,0.05)', borderColor: 'rgba(0,0,0,0.05)' }]} onPress={onLibraryPress}>
              <ChevronRight size={18} color="#000" />
            </TouchableOpacity>
            <View style={styles.stackContentLeft}>
              <View style={styles.stackBadgeRow}>
                <View style={[styles.miniStatusBadge, { backgroundColor: booking ? 'rgba(0, 0, 0, 0.1)' : (isOpen ? 'rgba(39, 174, 96, 0.15)' : 'rgba(231, 76, 60, 0.15)') }]}>
                  <Text style={[styles.miniStatusText, { color: booking ? '#000' : (isOpen ? '#1E8449' : '#C0392B') }]}>
                    {booking ? 'BOOKED' : (isOpen ? 'OPEN' : 'CLOSED')}
                  </Text>
                </View>
                <Text style={[styles.stackLabelWhite, { color: 'rgba(0,0,0,0.5)' }]}>ROOM & LIBRARY</Text>
              </View>
              <Text style={[styles.stackSubWhite, { color: 'rgba(0,0,0,0.7)', fontWeight: '700', fontSize: 13, marginBottom: -2 }]}>
                {booking ? 'Active Reservation' : 'Resource Hub Availability'}
              </Text>
              <Text style={[styles.stackBigValue, { color: '#000', fontSize: (booking?.room || 'Library Booking').length > 15 ? 24 : 32 }]}>
                {booking ? booking.room : 'Library Booking'}
              </Text>
              <View style={styles.stackFooterRow}>
                <View style={styles.footerInfoItem}>
                  <Clock size={11} color="#000" style={{ opacity: 0.6 }} />
                  <Text style={[styles.stackSubBlack]}>{booking ? booking.slot : (isOpen ? 'Till 9 PM' : 'Opens 8 AM')}</Text>
                </View>
                <View style={styles.footerInfoSeparatorBlack} />
                <View style={styles.footerInfoItem}>
                  <Calendar size={11} color="#000" style={{ opacity: 0.6 }} />
                  <Text style={[styles.stackSubBlack]}>{booking ? booking.date : 'Standard Access'}</Text>
                </View>
              </View>
            </View>
          </CardGradient>
        );
      },
    },
    {
      key: 'exams',
      color: '#3DBE6B',
      gradient: ['#3DBE6B', '#27AE60'],
      render: (borderStyle?: any) => {
        const subjectName = nextExam ? (data.attendance?.find((a: any) => a.subjectCode.includes(nextExam.subjectCode))?.subjectName || nextExam.subject) : 'EXAMS';
        return (
          <CardGradient id="grad_exams" colors={['#3DBE6B', '#27AE60']} style={styles.stackCardInner} borderStyle={borderStyle}>
            <View style={styles.stackHandle} />
            <View style={styles.stackGlassIcon}>
               <Award size={20} color="#fff" />
            </View>
            <TouchableOpacity style={styles.stackFab} onPress={onExamsPress}>
              <ChevronRight size={18} color="#fff" />
            </TouchableOpacity>
            <View style={styles.stackContentLeft}>
              <View style={styles.stackBadgeRow}>
                <View style={[styles.miniStatusBadge, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]}>
                  <Clock size={10} color="#FFFFFF" />
                  <Text style={[styles.miniStatusText, { color: '#FFFFFF' }]}>{nextExam ? 'UPCOMING' : 'SYNC'}</Text>
                </View>
                <Text style={styles.stackLabelWhite}>EXAMINATION HUB</Text>
              </View>
              {nextExam?.subjectCode && (
                <Text style={[styles.stackSubWhite, { opacity: 0.9, fontWeight: '700', fontSize: 13, marginBottom: -2 }]}>
                  {nextExam.subjectCode}
                </Text>
              )}
              <Text style={[styles.stackBigValue, { fontSize: subjectName.length > 15 ? 24 : 32 }]}>{subjectName}</Text>
              <View style={styles.stackFooterRow}>
                <View style={styles.footerInfoItem}>
                  <MapPin size={11} color="#fff" style={{ opacity: 0.8 }} />
                  <Text style={[styles.stackSubWhite]}>{nextExam ? nextExam.room : 'Schedule'}</Text>
                </View>
                <View style={styles.footerInfoSeparator} />
                <View style={styles.footerInfoItem}>
                  <Layers size={11} color="#fff" style={{ opacity: 0.8 }} />
                  <Text style={[styles.stackSubWhite]}>{nextExam ? nextExam.date : 'Seating'}</Text>
                </View>
              </View>
            </View>
          </CardGradient>
        );
      },
    },
    {
      key: 'attendance',
      color: '#FF7E82',
      gradient: ['#FF7E82', '#F43F5E'],
      render: (borderStyle?: any) => {
        const totalClasses = data.attendance?.reduce((acc: number, curr: any) => acc + (curr.totalClasses || 0), 0) || 0;
        const attendedClasses = data.attendance?.reduce((acc: number, curr: any) => acc + (curr.attendedClasses || 0), 0) || 0;
        const dutyLeaves = data.attendance?.reduce((acc: number, curr: any) => acc + (curr.dutyLeaves || 0), 0) || 0;
        const totalPresent = attendedClasses + dutyLeaves;

        const attVal = parseFloat(data.overallAttendance);
        return (
          <CardGradient id="grad_att" colors={['#FF7E82', '#F43F5E']} style={styles.stackCardInner} borderStyle={borderStyle}>
            <View style={styles.stackHandle} />
            <View style={styles.stackGlassIcon}>
               <UserCheck size={20} color="#fff" />
            </View>
            <TouchableOpacity style={styles.stackFab} onPress={() => router.push('/attendance' as any)}>
              <ChevronRight size={18} color="#fff" />
            </TouchableOpacity>
            <View style={styles.stackContentLeft}>
              <View style={styles.stackBadgeRow}>
                <View style={[styles.miniStatusBadge, { backgroundColor: 'rgba(255, 255, 255, 0.9)', paddingHorizontal: 10, paddingVertical: 4 }]}>
                  <CheckCircle2 size={11} color={attVal >= 80 ? '#27AE60' : (attVal >= 75 ? '#F39C12' : '#E74C3C')} />
                  <Text style={[styles.miniStatusText, { color: attVal >= 80 ? '#27AE60' : (attVal >= 75 ? '#F39C12' : '#E74C3C'), fontWeight: '900' }]}>
                    {attVal >= 80 ? 'SAFE' : (attVal >= 75 ? 'WARNING' : 'CRITICAL')}
                  </Text>
                </View>
                <Text style={styles.stackLabelWhite}>ACADEMIC ATTENDANCE</Text>
              </View>
              <Text style={[styles.stackSubWhite, { opacity: 0.9, fontWeight: '700', fontSize: 13, marginBottom: -2 }]}>
                Live Attendance Tracking
              </Text>
              <Text style={styles.stackBigValue}>{data.overallAttendance}%</Text>
              <View style={styles.stackFooterRow}>
                <View style={styles.footerInfoItem}>
                  <UserCheck size={11} color="#fff" style={{ opacity: 0.8 }} />
                  <Text style={[styles.stackSubWhite]}>{totalPresent}/{totalClasses} Total</Text>
                </View>
                <View style={styles.footerInfoSeparator} />
                <View style={styles.footerInfoItem}>
                  <Award size={11} color="#fff" style={{ opacity: 0.8 }} />
                  <Text style={[styles.stackSubWhite]}>DLs: {dutyLeaves}</Text>
                </View>
              </View>
            </View>
          </CardGradient>
        );
      },
    },
  ];

  const cardOrder = getCardOrder();

  return (
    <View style={styles.stackContainer} {...panResponder.panHandlers}>
      {cardOrder.map((cardIdx, stackPos) => {
        const card = cards[cardIdx];
        const isTop = stackPos === cardOrder.length - 1;
        const depth = cardOrder.length - 1 - stackPos;
        const scale = 1 - depth * 0.08;
        const offsetY = depth * 34;

        // --- ENHANCED ANIMATIONS ---
        const rotate = translateY.interpolate({
          inputRange: [-150, 0, 150],
          outputRange: ['-8deg', '0deg', '8deg'],
          extrapolate: 'clamp',
        });

        const scaleTop = translateY.interpolate({
          inputRange: [-150, 0, 150],
          outputRange: [0.94, 1, 0.94],
          extrapolate: 'clamp',
        });

        // Background cards slightly react to the top card's drag
        const backCardShift = translateY.interpolate({
          inputRange: [-100, 0, 100],
          outputRange: [15, 0, -15],
          extrapolate: 'clamp',
        });

        const borderStyle = {
          borderColor: card.key === 'library' && !isDark ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.15)',
          borderWidth: 1.5,
          borderRadius: 32,
        };

        return (
          <RNAnimated.View
            key={card.key}
            style={[
              styles.stackCard,
              {
                backgroundColor: card.color,
                zIndex: cardOrder.length - depth,
                transform: [
                  { scale: isTop ? scaleTop : scale },
                  { translateY: isTop ? translateY : RNAnimated.add(-offsetY, backCardShift) },
                  { rotateZ: isTop ? rotate : '0deg' },
                ],
                borderColor: isTop ? 'transparent' : (card.key === 'library' && !isDark ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.15)'),
                borderWidth: isTop ? 0 : 1.5,
                opacity: depth === 3 ? 0.3 : depth === 2 ? 0.5 : depth === 1 ? 0.8 : 1,
                // Add a dynamic shadow for the top card
                shadowOpacity: isTop ? translateY.interpolate({
                  inputRange: [-50, 0, 50],
                  outputRange: [0.4, 0.25, 0.4],
                }) : 0.1,
              },
            ]}
          >
            {depth > 0 && (
              <View style={styles.stackPeekLayer}>
                <View style={styles.stackPeekBadge}>
                  <Lock size={12} color="#fff" />
                  <Text style={styles.stackPeekText}>
                    {card.key === 'fee' ? 'FEES' : card.key === 'exams' ? 'EXAMS' : card.key === 'attendance' ? 'ATTENDANCE' : 'LIBRARY'}
                  </Text>
                </View>
              </View>
            )}

            {isTop && (
              <View style={{ flex: 1 }}>
                {card.render(borderStyle)}
                <View style={styles.stackDots}>
                  {cards.map((_, i) => (
                    <View key={i} style={[styles.stackDot, { backgroundColor: i === activeIndex ? '#fff' : 'rgba(255,255,255,0.2)' }]} />
                  ))}
                </View>
              </View>
            )}
          </RNAnimated.View>
        );
      })}
    </View>
  );
}

export default function DashboardScreen() {
  const { data, isScraping, refreshData, dumpHtml } = useScraper();
  const { isAuthenticated, loading, logout } = useAuth();
  const { colors, isDark, toggleTheme } = useTheme();
  const [scrollEnabled, setScrollEnabled] = React.useState(true);

  // VIP PASS: On web, we don't instantly redirect to prevent the 'Invisible Guard' bug
  // This gives the AuthContext time to propagate the login state.
  if (!isAuthenticated && !loading && Platform.OS !== 'web') {
    return <Redirect href="/login" />;
  }

  // Profile Data
  const profile = data.profile;

  // Calculate Overall Attendance including Duty Leaves
  const totalClasses = data.attendance?.reduce((acc, curr) => acc + (curr.totalClasses || 0), 0) || 0;
  const attendedClasses = data.attendance?.reduce((acc, curr) => acc + (curr.attendedClasses || 0), 0) || 0;
  const dutyLeaves = data.attendance?.reduce((acc, curr) => acc + (curr.dutyLeaves || 0), 0) || 0;

  const calculatedAttendance = totalClasses > 0 ? Math.ceil(((attendedClasses + dutyLeaves) / totalClasses) * 100) : 0;
  const overallAttendance = data.overallAttendance ? Math.ceil(parseFloat(data.overallAttendance)).toString() : calculatedAttendance.toString();

  // Helper to find "Next Class" dynamically
  const getNextClass = () => {
    const timetable = data.timetable || {};
    const makeupClasses = data.makeupClasses || [];

    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const now = new Date();
    const currentDay = days[now.getDay()];
    // Get date in DD-MMM-YYYY or DD MMM YYYY format to match makeup classes
    const todayStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

    const currentTimeStr = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');

    const parseTimeTo24h = (timeStr: string) => {
      if (!timeStr) return null;
      const match = timeStr.match(/(\d{1,2}):(\d{2})/);
      if (!match) return null;
      let hours = parseInt(match[1]);
      const minutes = match[2];
      const isPM = timeStr.toUpperCase().includes('PM');
      const isAM = timeStr.toUpperCase().includes('AM');
      if (isPM && hours < 12) hours += 12;
      if (isAM && hours === 12) hours = 0;
      return hours.toString().padStart(2, '0') + ':' + minutes;
    };

    const isClassMakeup = (cls: any) => {
      const type = (cls.type || "").toLowerCase();
      const subject = (cls.subject || "").toLowerCase();

      const hasMakeupKeyword =
        cls.isMakeup ||
        cls.date ||
        type.includes('makeup') ||
        type.includes('adjustment') ||
        type.includes('special') ||
        subject.includes('(makeup)') ||
        subject.includes('(adjustment)');

      if (hasMakeupKeyword) return true;

      // Cross-reference with the dedicated makeup classes list
      const isMatchedInMakeupList = data.makeupClasses?.some((m: any) =>
        m.subjectCode === cls.subjectCode &&
        (m.time === cls.time || m.time?.includes(cls.time?.split(' ')[0]))
      );

      return !!isMatchedInMakeupList;
    };

    // 1. Combine regular classes for today and makeup classes for today
    let candidates: any[] = [];

    // Regular classes
    if (timetable[currentDay]) {
      timetable[currentDay].forEach((c: any) => candidates.push({ ...c, isMakeup: isClassMakeup(c) }));
    }

    // Saturday Filtering Logic
    if (currentDay === 'Saturday') {
      candidates = candidates.filter((cls: any) => {
        const subject = (cls.subject || "").toLowerCase();
        const isProjectWork = subject.includes('project work');
        // On Saturday, only show if NOT project work AND it's a makeup class
        return !isProjectWork && cls.isMakeup;
      });
    }

    // Makeup classes from dedicated list
    makeupClasses.forEach((c: any) => {
      // Check if makeup class is today
      if (c.date) {
        try {
          const dateParts = c.date.split('-');
          if (dateParts.length === 3) {
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const classDate = new Date(
              parseInt(dateParts[2]),
              months.indexOf(dateParts[1]),
              parseInt(dateParts[0])
            );
            if (classDate.toDateString() === now.toDateString()) {
              candidates.push({
                time: c.time,
                subject: c.subject,
                subjectCode: c.subjectCode,
                room: c.room,
                type: c.type || 'Makeup',
                isMakeup: true
              });
            }
          }
        } catch(e) {}
      }
    });

    if (candidates.length === 0) return { status: 'no_classes' };

    const upcoming = candidates.filter((c: any) => {
      const startTime = parseTimeTo24h(c.time);
      return startTime ? startTime > currentTimeStr : false;
    });

    if (upcoming.length > 0) {
      upcoming.sort((a: any, b: any) => {
        const tA = parseTimeTo24h(a.time) || '';
        const tB = parseTimeTo24h(b.time) || '';
        return tA.localeCompare(tB);
      });

      // If requested all candidates (for notification pre-scheduling)
      if (arguments[0] === true) {
        return upcoming.map(c => {
          const startTime = parseTimeTo24h(c.time);
          const [h, m] = (startTime || '00:00').split(':').map(Number);
          const triggerDate = new Date();
          triggerDate.setHours(h, m, 0, 0);
          return { ...c, startTimeDate: triggerDate };
        });
      }

      const next = upcoming[0];

      // Prioritize structured data if available (from new Scraper logic)
      if (next.subjectCode || next.subject) {
        return {
          status: 'upcoming',
          time: next.time,
          subjectCode: next.subjectCode,
          subject: next.subject,
          room: next.room || 'TBA',
          type: next.type || 'Lecture'
        };
      }

      // Parse regular class details robustly for legacy/other formats
      const details = next.details || '';
      let subject = 'Class';
      let subjectCode = '';
      let room = 'TBA';
      let type = 'Lecture';

      if (details.includes('R:')) {
        const subjectMatch = details.match(/^([^ ]+)/);
        const roomMatch = details.match(/R:\s*([A-Z0-9-]+)/i);
        subjectCode = subjectMatch ? subjectMatch[1] : '';
        room = roomMatch ? roomMatch[1] : 'TBA';
      } else {
        const parts = details.split(/\s*\/\s*/);
        if (parts.length >= 2) {
          type = parts[0].trim();
          const codePart = parts[1].trim();
          const codeMatch = codePart.match(/^([A-Z0-9]+)/i);
          subjectCode = codeMatch ? codeMatch[1] : '';
          subject = codePart.split('-')[1]?.trim() || codePart;
          room = parts[2] ? parts[2].trim() : 'TBA';
        } else {
          const codeMatch = details.match(/([A-Z]{2,}\d{2,})/i);
          if (codeMatch) subjectCode = codeMatch[1];
          const roomMatch = details.match(/(?:R:|Room:)\s*([A-Z0-9-]+)/i) || details.match(/\b(\d{2}-\d{3}[A-Z]?)\b/);
          if (roomMatch) room = roomMatch[1] || room;
        }
      }

      return {
        status: 'upcoming',
        time: next.time,
        subjectCode: subjectCode,
        subject: subject,
        room: room,
        type: type
      };
    }
    return { status: 'finished' };
  };

  const nextClassInfo = getNextClass();

  const getMessageConfig = (title: string) => {
    const t = (title || "").toLowerCase();
    if (
      t.includes('result') || t.includes('mark') || t.includes('grade') ||
      t.includes('academic') || t.includes('course') || t.includes('class') ||
      t.includes('syllabus') || t.includes('registration') || t.includes('timetable') ||
      t.includes('time table') || t.includes('subject') || t.includes('evaluation') ||
      t.includes('criteria') || t.includes('curriculum') || t.includes('lecture') ||
      t.includes('practical') || t.includes('workshop') || t.includes('faculty') ||
      t.includes('mentor') || t.includes('teacher') || t.includes('cse') ||
      t.includes('ece') || t.includes('mec') || t.includes('mth') || t.includes('phy')
    ) {
      return { color: '#34C759', label: 'ACADEMIC', icon: GraduationCap };
    }
    if (t.includes('attendance') || t.includes('shortage') || t.includes('presents'))
      return { color: '#FF9500', label: 'ATTENDANCE', icon: UserCheck };
    if (t.includes('exam') || t.includes('date sheet') || t.includes('ca ') || t.includes('ete'))
      return { color: '#FF3B30', label: 'EXAMINATIONS', icon: FileText };
    if (t.includes('fee') || t.includes('payment') || t.includes('due') || t.includes('fines'))
      return { color: '#5856D6', label: 'FINANCIAL', icon: Tag };
    if (t.includes('placement') || t.includes('job') || t.includes('interview') || t.includes('drive'))
      return { color: '#007AFF', label: 'PLACEMENT', icon: Award };
    if (t.includes('leave') || t.includes('duty') || t.includes('od'))
      return { color: '#AF52DE', label: 'LEAVE/OD', icon: MapPin };
    return { color: colors.primary, label: 'ANNOUNCEMENT', icon: Bell };
  };

  // Dynamic User Color based on VID - Curated Eye-Catchy Palette
  const getUserColor = (vid: string) => {
    if (!vid) return colors.primary;

    // Curated list of 'Positive & Eye-Catchy' premium colors
    const vibrant_palette = [
      '#5856D6', // Royal Purple
      '#FF2D55', // Vivid Pink
      '#FF9500', // Sunset Orange
      '#007AFF', // Electric Blue
      '#AF52DE', // Deep Violet
      '#5AC8FA', // Sky Blue
      '#FF3B30', // Vibrant Red
      '#E91E63', // Magenta Pink
    ];

    let hash = 0;
    for (let i = 0; i < vid.length; i++) {
      hash = vid.charCodeAt(i) + ((hash << 5) - hash);
    }

    // Map hash to the curated palette
    let color = vibrant_palette[Math.abs(hash) % vibrant_palette.length];

    // User Exception: For VID 12405540, pick a specifically positive non-pink color
    if (vid === '12405540') {
      color = '#007AFF'; // Electric Blue
    }

    return color;
  };

  const getUserGradient = (color: string) => {
    const map: { [key: string]: string[] } = {
      '#5856D6': ['#7A78E2', '#403DB5'], // Royal Purple
      '#FF2D55': ['#FF5277', '#C21335'], // Vivid Pink
      '#FF9500': ['#FFAE33', '#B85B00'], // Sunset Orange
      '#007AFF': ['#3395FF', '#0055B3'], // Electric Blue
      '#AF52DE': ['#C57CEE', '#7F2BB5'], // Deep Violet
      '#5AC8FA': ['#80D6FC', '#1F99D4'], // Sky Blue
      '#FF3B30': ['#FF6259', '#C61E15'], // Vibrant Red
      '#E91E63': ['#EE4A82', '#A90C3F'], // Magenta Pink
    };
    return map[color] || [color, '#1C1C1E'];
  };

  const getPerformanceColor = (cgpa: string) => {
    const val = parseFloat(cgpa || '0');
    if (val >= 9.0) return '#FF9500'; // Gold/Orange
    if (val >= 8.0) return '#34C759'; // Green
    if (val >= 7.0) return '#007AFF'; // Blue
    if (val >= 6.0) return '#5856D6'; // Purple
    return '#FF3B30'; // Red
  };

  const getAttendanceColor = (att: any) => {
    const val = parseFloat(att);
    if (isNaN(val) || val <= 0) return colors.primary; // Safe neutral color (Electric Blue/Indigo) when loading or no attendance data
    if (val >= 80) return '#34C759'; // Green (Safe)
    if (val >= 75) return '#FF9500'; // Orange (Warning)
    return '#FF3B30'; // Red (Critical)
  };

  const attColor = getAttendanceColor(overallAttendance);
  const userColor = getUserColor(profile?.vid || '');

  // SMART SELF-SYNC FOR PWA
  React.useEffect(() => {
    if (Platform.OS === 'web' && profile?.name === 'Loading...' && !isScraping) {
      console.log('PWA Smart Sync Triggered');
      refreshData();
    }
  }, [profile?.name, isScraping]);


  React.useEffect(() => {
    async function syncNotifications() {
      if (Platform.OS === 'web') return; // Notifications not supported on web in this context
      if (nextClassInfo.status === 'upcoming') {
        // 1. Clear previous schedules to prevent duplicates
        await cancelAllNotifications();

        // 2. Get all candidates for the next 24 hours
        const candidates = getNextClass(true); // Call with flag to get ALL upcoming

        if (Array.isArray(candidates)) {
          // 3. Schedule each one with the same ID but different triggers
          for (const item of candidates) {
            await updateStickyClassNotification(
              item.subjectCode || item.subject,
              item.time,
              item.room || 'TBA',
              item.startTimeDate // Pass the actual Date object for triggering
            );
          }
        } else {
          // Fallback for single immediate update
          updateStickyClassNotification(
            nextClassInfo.subjectCode || nextClassInfo.subject,
            nextClassInfo.time,
            nextClassInfo.room
          );
        }
      } else {
        updateStickyClassNotification('', '', '');
      }
    }

    syncNotifications();
  }, [nextClassInfo.status, nextClassInfo.time, nextClassInfo.subjectCode, nextClassInfo.room]);

  const nextExam = (() => {
    if (!data.exams || !Array.isArray(data.exams) || data.exams.length === 0) return null;

    const parseLPUDate = (dateStr: string) => {
      if (!dateStr) return null;
      // Handle "25-Apr-2026" or "25 Apr 2026"
      const parts = dateStr.split(/[- /]/);
      if (parts.length === 3) {
        let day = parseInt(parts[0]);
        let month = -1;
        let year = parseInt(parts[2]);

        const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
        const mIdx = months.findIndex(m => parts[1].toLowerCase().startsWith(m));

        if (mIdx !== -1) {
          month = mIdx;
        } else {
          // Try numeric month (handle DD/MM/YYYY)
          const numericMonth = parseInt(parts[1]);
          if (!isNaN(numericMonth) && numericMonth >= 1 && numericMonth <= 12) {
            month = numericMonth - 1;
          }
        }

        if (month !== -1 && !isNaN(day) && !isNaN(year)) {
          // Handle YY instead of YYYY
          if (year < 100) year += 2000;
          return new Date(year, month, day);
        }
      }
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? null : d;
    };

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const processedExams = data.exams.map((ex: any) => ({
      ...ex,
      parsedDate: parseLPUDate(ex.date)
    })).filter(ex => ex.parsedDate && ex.parsedDate >= now);

    if (processedExams.length === 0) return null;

    processedExams.sort((a: any, b: any) => a.parsedDate.getTime() - b.parsedDate.getTime());
    return processedExams[0];
  })();

  const [showMessages, setShowMessages] = React.useState(false);
  const [expandedMessageIdx, setExpandedMessageIdx] = React.useState<number | null>(null);
  const [activeCategoryTab, setActiveCategoryTab] = React.useState('ALL');
  const [showProfileMenu, setShowProfileMenu] = React.useState(false);
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [updateAvailable, setUpdateAvailable] = React.useState(false);
  const [showWhatsNew, setShowWhatsNew] = React.useState(false);
  const [profileCardIndex, setProfileCardIndex] = React.useState(0);
  const [profileCardLocked, setProfileCardLocked] = React.useState(false);
  const profileCardIndexRef = React.useRef(0);
  const profileCardLockedRef = React.useRef(false);
  const version = Constants.expoConfig?.version || '1.0.2';

  const allThemePool = [
    { key: 'cream', colors: ['#F2EEE5', '#DFD9CE'], accent: '#EF442E', text: '#111111', layers: ['#EFFF5B', '#86DFA5', '#AEBBFF'] },
    { key: 'graphite', colors: ['#1E222B', '#090B10'], accent: '#5AF2B5', text: '#FFFFFF', layers: ['#A8FF60', '#6AD7FF', '#8B7CFF'] },
    { key: 'sage', colors: ['#E2E8D8', '#C5D5B7'], accent: '#8FA87A', text: '#1E2B18', layers: ['#D4E2C9', '#B8CBA5', '#EAF0E3'] },
    { key: 'rose', colors: ['#FFD1DC', '#FB7185'], accent: '#111111', text: '#FFFFFF', layers: ['#F4FF62', '#92D980', '#AAB9FF'] },
    { key: 'ocean', colors: ['#C8E6F5', '#5BA3D9'], accent: '#1E4D7A', text: '#0A1F33', layers: ['#B8DCF0', '#7BBDE6', '#E1F0FA'] },
    { key: 'midnight', colors: ['#1A213D', '#0A0E23'], accent: '#4FD1C5', text: '#FFFFFF', layers: ['#262F52', '#141A30', '#0E1224'] },
    { key: 'forest', colors: ['#102E24', '#06130E'], accent: '#A0ECA4', text: '#FFFFFF', layers: ['#1A4235', '#0A1C14', '#071610'] },
    { key: 'void', colors: ['#23153C', '#0D061A'], accent: '#F687B3', text: '#FFFFFF', layers: ['#352256', '#140A26', '#0E071D'] },
    { key: 'slate', colors: ['#2A323C', '#11151A'], accent: '#82AAFF', text: '#FFFFFF', layers: ['#3B4552', '#1B2129', '#141A20'] },
    { key: 'abyss', colors: ['#2D1F25', '#120B0F'], accent: '#FFB86C', text: '#FFFFFF', layers: ['#422C36', '#1F121A', '#160D12'] },
  ];

  const getProfileCardThemes = (seed: string) => {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) hash = seed.charCodeAt(i) + ((hash << 5) - hash);
    const shuffled = [...allThemePool];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.abs(hash + i * 7) % (i + 1);
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const profileCardThemes = React.useMemo(() => getProfileCardThemes(profile?.vid || profile?.name || 'student'), [profile?.vid, profile?.name]);

  React.useEffect(() => {
    profileCardIndexRef.current = profileCardIndex;
    profileCardLockedRef.current = profileCardLocked;
  }, [profileCardIndex, profileCardLocked]);

  React.useEffect(() => {
    const loadProfileCard = async () => {
      try {
        const storedIndex = await AsyncStorage.getItem('@profile_card_index');
        const storedLock = await AsyncStorage.getItem('@profile_card_locked');
        if (storedIndex) setProfileCardIndex(Math.max(0, Math.min(parseInt(storedIndex, 10) || 0, profileCardThemes.length - 1)));
        setProfileCardLocked(storedLock === 'true');
      } catch (e) {}
    };
    loadProfileCard();
  }, []);

  const saveProfileCard = async (nextIndex: number, locked = profileCardLocked) => {
    setProfileCardIndex(nextIndex);
    try {
      await AsyncStorage.setItem('@profile_card_index', String(nextIndex));
      await AsyncStorage.setItem('@profile_card_locked', String(locked));
    } catch (e) {}
  };

  const toggleProfileCardLock = async () => {
    const nextLocked = !profileCardLocked;
    setProfileCardLocked(nextLocked);
    try {
      await AsyncStorage.setItem('@profile_card_index', String(profileCardIndex));
      await AsyncStorage.setItem('@profile_card_locked', String(nextLocked));
    } catch (e) {}
  };

  const profileCardPanResponder = React.useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gesture) => {
        // Allow swipe anywhere on the card with a gentle threshold
        return Math.abs(gesture.dx) > 5;
      },
      onPanResponderRelease: (_, gesture) => {
        if (profileCardLockedRef.current || Math.abs(gesture.dx) < SWIPE_THRESHOLD) return;
        const direction = gesture.dx < 0 ? 1 : -1;
        const nextIndex = (profileCardIndexRef.current + direction + profileCardThemes.length) % profileCardThemes.length;
        saveProfileCard(nextIndex);
      },
    })
  ).current;

  React.useEffect(() => {
    const checkWhatsNew = async () => {
      try {
        const lastSeenVersion = await AsyncStorage.getItem('@last_seen_version');
        if (lastSeenVersion !== version) {
          setShowWhatsNew(true);
        }
      } catch (e) {}
    };
    checkWhatsNew();
  }, [version]);

  const closeWhatsNew = async () => {
    try {
      await AsyncStorage.setItem('@last_seen_version', version);
      setShowWhatsNew(false);
    } catch (e) {
      setShowWhatsNew(false);
    }
  };

  React.useEffect(() => {
    async function checkUpdates() {
      try {
        if (!Updates.isEnabled) return;
        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
          setUpdateAvailable(true);
        }
      } catch (e) {
        console.log('Update check failed:', e);
      }
    }
    checkUpdates();
  }, []);

  const handleUpdate = async () => {
    try {
      setIsUpdating(true);
      await Updates.fetchUpdateAsync();
      await Updates.reloadAsync();
    } catch (e) {
      alert('Update failed. Please try again later.');
    } finally {
      setIsUpdating(false);
    }
  };

  const forceUpdate = async () => {
    try {
      setIsUpdating(true);
      if (!Updates.isEnabled) {
        throw new Error('Updates not supported in this environment');
      }
      const update = await Updates.checkForUpdateAsync();
      if (update.isAvailable) {
        await Updates.fetchUpdateAsync();
        await Updates.reloadAsync();
      } else {
        alert('You are already on the latest version!');
      }
    } catch (e) {
      console.log('Force update failed:', e);
      Linking.openURL('https://github.com/Ashishshankar26/ALMS/releases');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleExamsPress = () => {
    router.push('/exams' as any);
  };

  const openUmsForm = (url: string, title: string) => {
    setShowProfileMenu(false);
    router.push({
      pathname: '/ums_form',
      params: { url, title }
    } as any);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      scrollEnabled={scrollEnabled}
      refreshControl={
        <RefreshControl
          refreshing={isScraping}
          onRefresh={() => {
            console.log('PULL TO REFRESH TRIGGERED');
            refreshData();
          }}
          tintColor="#007AFF"
          progressViewOffset={Platform.OS === 'android' ? 30 : 0}
        />
      }
      contentContainerStyle={{ paddingBottom: 100 }}
    >
      {/* Enhanced Header Section with Profile */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: 'transparent' }]}>
        <View style={styles.headerTop}>
          <View>
            <Text style={[styles.welcomeText, { color: isDark ? colors.textSecondary : '#8E8E93', letterSpacing: 1.2 }]}>WELCOME BACK,</Text>
            <Text style={[styles.nameLarge, { color: colors.text }]}>{profile?.name?.split(' ')[0] || 'Student'}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <TouchableOpacity
              style={[styles.headerIconBtn, { backgroundColor: isDark ? 'rgba(255,183,28,0.15)' : 'rgba(99,102,241,0.12)' }]}
              onPress={toggleTheme}
            >
              {isDark ? <Sun size={22} color="#FFB71C" /> : <Moon size={22} color="#6366F1" />}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.headerIconBtn]}
              onPress={() => setShowMessages(true)}
            >
              <Bell size={22} color={colors.primary} />
              {data.messages && data.messages.length > 0 && (
                <View style={[styles.notifBadge, { backgroundColor: colors.error }]}>
                  <Text style={styles.notifText}>{data.messages.length}</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={logout}
              style={[styles.headerIconBtn]}
            >
              <LogOut size={22} color={colors.error} />
            </TouchableOpacity>
          </View>
        </View>

        {profile && (
          <View style={styles.profileWalletShell} {...profileCardPanResponder.panHandlers}>
            {profileCardThemes.map((theme, idx) => {
              const isTop = idx === profileCardIndex;
              if (!isTop) return null;

              return (
                <Animated.View
                  key={theme.key}
                  entering={FadeInRight.duration(300).springify()}
                  layout={Layout.duration(260)}
                  style={[
                    styles.profileStackCard,
                  ]}
                >
                  <View style={[styles.profileCardGlow, { backgroundColor: theme.accent, opacity: isTop ? 0.18 : 0 }]} />
                  <View style={[styles.premiumProfileCard, { padding: 0, overflow: 'hidden', borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.5)', borderWidth: 1.5 }]}>
                    <LinearGradient colors={theme.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.profileCardGradient}>
                      <View style={[styles.profileCardHandle, { backgroundColor: theme.text === '#FFFFFF' ? 'rgba(255,255,255,0.24)' : 'rgba(17,17,17,0.12)' }]} />
                      <View style={[styles.masterShapeLeft, { backgroundColor: theme.accent }]} />
                      <View style={[styles.masterShapeMid, { backgroundColor: theme.accent }]} />
                      <View style={[styles.masterShapeRight, { backgroundColor: theme.accent }]} />
                      <View style={styles.profileTopLine}>
                        <Text style={[styles.profileEyebrow, { color: theme.text }]}>StudentCard</Text>
                        <TouchableOpacity
                          activeOpacity={0.82}
                          onPress={toggleProfileCardLock}
                          style={[
                            styles.profileLockToggle,
                            {
                              backgroundColor: profileCardLocked && isTop ? theme.accent : 'rgba(255,255,255,0.24)',
                              borderColor: theme.text === '#FFFFFF' ? 'rgba(255,255,255,0.22)' : 'rgba(17,17,17,0.12)',
                            },
                          ]}
                        >
                          <View style={[styles.profileLockKnob, { transform: [{ translateX: profileCardLocked && isTop ? 17 : 0 }], backgroundColor: profileCardLocked && isTop ? '#FFFFFF' : theme.text }]} />
                        </TouchableOpacity>
                      </View>
                      <TouchableOpacity onPress={() => setShowProfileMenu(true)} activeOpacity={0.78} style={[styles.avatarButton, { borderColor: theme.text === '#FFFFFF' ? 'rgba(255,255,255,0.28)' : 'rgba(17,17,17,0.14)' }]}>
                        <Image source={{ uri: profile.avatarUrl }} style={styles.avatarNew} />
                      </TouchableOpacity>
                      <View style={[styles.cardChip, { borderColor: theme.text === '#FFFFFF' ? 'rgba(255,255,255,0.22)' : 'rgba(17,17,17,0.12)' }]}>
                        <View style={[styles.cardChipLine, { backgroundColor: theme.text === '#FFFFFF' ? 'rgba(255,255,255,0.42)' : 'rgba(17,17,17,0.35)' }]} />
                        <View style={[styles.cardChipLineShort, { backgroundColor: theme.text === '#FFFFFF' ? 'rgba(255,255,255,0.3)' : 'rgba(17,17,17,0.24)' }]} />
                      </View>
                      <View style={styles.profileCardBottomNew}>
                        <View style={{ flex: 1, paddingRight: 8 }}>
                          <Text style={[styles.profileNameNew, { color: theme.text }]} numberOfLines={1}>{profile.name}</Text>
                          <Text style={[styles.profileProgramNew, { color: theme.text === '#FFFFFF' ? 'rgba(255,255,255,0.66)' : 'rgba(17,17,17,0.62)' }]} numberOfLines={1}>{profile.vid}</Text>
                        </View>
                        <View style={styles.profileMiniMeta}>
                          <Text style={[styles.profileFooterCode, { color: theme.text === '#FFFFFF' ? 'rgba(255,255,255,0.76)' : 'rgba(17,17,17,0.64)' }]}>{profile.section}</Text>
                          <Text style={[styles.profileVidDigits, { color: theme.text === '#FFFFFF' ? 'rgba(255,255,255,0.72)' : 'rgba(17,17,17,0.55)' }]}>SECTION</Text>
                        </View>
                      </View>
                      {isTop && (
                        <View style={styles.profileStackDots}>
                          {profileCardThemes.map((_, dotIndex) => (
                            <View
                              key={dotIndex}
                              style={[
                                styles.profileStackDot,
                                {
                                  backgroundColor: dotIndex === profileCardIndex ? theme.text : (theme.text === '#FFFFFF' ? 'rgba(255,255,255,0.28)' : 'rgba(17,17,17,0.18)'),
                                  width: dotIndex === profileCardIndex ? 18 : 5,
                                },
                              ]}
                            />
                          ))}
                        </View>
                      )}
                    </LinearGradient>
                  </View>
                </Animated.View>
              );
            })}
          </View>
        )}
      </View>

      <View style={styles.content}>
        {/* CGPA & Attendance Grid - ANIMATED */}
        <Animated.View
          entering={FadeInDown.delay(200).duration(600).springify()}
          style={styles.gridContainer}
        >
          <TouchableOpacity
            style={styles.gridCardWrapper}
            onPress={() => router.push('/results')}
            activeOpacity={0.9}
          >
            <View style={[styles.gridCardShadow, { backgroundColor: getUserGradient(userColor)[0] }]}>
              <CardGradient id="grad_perf" colors={getUserGradient(userColor)} style={[styles.gridCardInner, { height: 154 }]} borderStyle={{ borderWidth: 1.5, borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.08)' }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                  <View style={[styles.stackGlassIcon, { marginBottom: 0, width: 34, height: 34, borderRadius: 17 }]}>
                     <Award size={16} color="#fff" />
                  </View>
                  <View style={[styles.miniStatusBadge, { backgroundColor: 'rgba(255, 255, 255, 0.2)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }]}>
                    <Text style={[styles.miniStatusText, { color: '#fff', fontSize: 9, fontWeight: '900' }]}>CGPA</Text>
                  </View>
                </View>
                <View style={{ position: 'absolute', bottom: 16, left: 16, right: 16 }}>
                  <Text style={[styles.stackLabelWhite, { fontSize: 11, opacity: 0.85, letterSpacing: 0.5, marginBottom: 2 }]}>ACADEMICS</Text>
                  <Text style={[styles.stackBigValue, { fontSize: 34, marginBottom: 8, lineHeight: 38 }]}>{data.cgpa || '0.00'}</Text>
                  <View style={[styles.miniProgress, { width: '100%', backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                    <View style={[styles.miniProgressBar, { width: `${(parseFloat(data.cgpa || '0') / 10) * 100}%`, backgroundColor: '#fff' }]} />
                  </View>
                </View>
              </CardGradient>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.gridCardWrapper}
            onPress={() => router.push('/attendance')}
            activeOpacity={0.9}
          >
            <View style={[styles.gridCardShadow, { backgroundColor: parseFloat(overallAttendance) >= 80 ? '#3DBE6B' : (parseFloat(overallAttendance) >= 75 ? '#FFAE33' : '#FF6259'), height: 154 }]}>
              <CardGradient
                id="grad_grid_att"
                colors={
                  parseFloat(overallAttendance) >= 80
                    ? ['#3DBE6B', '#1E7C41']
                    : (parseFloat(overallAttendance) >= 75 ? ['#FFAE33', '#D35400'] : ['#FF6259', '#B71C1C'])
                }
                style={[styles.gridCardInner, { height: 154 }]}
                borderStyle={{ borderWidth: 1.5, borderColor: 'rgba(255, 255, 255, 0.12)' }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                  <View style={[styles.stackGlassIcon, { marginBottom: 0, width: 34, height: 34, borderRadius: 17 }]}>
                     <CheckCircle2 size={16} color="#fff" />
                  </View>
                  <View style={[styles.miniStatusBadge, { backgroundColor: 'rgba(255, 255, 255, 0.9)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }]}>
                    <Text style={[styles.miniStatusText, { color: parseFloat(overallAttendance) >= 80 ? '#27AE60' : (parseFloat(overallAttendance) >= 75 ? '#F39C12' : '#E74C3C'), fontSize: 9, fontWeight: '900' }]}>
                      {parseFloat(overallAttendance) >= 80 ? 'SAFE' : (parseFloat(overallAttendance) >= 75 ? 'WARNING' : 'CRITICAL')}
                    </Text>
                  </View>
                </View>
                <View style={{ position: 'absolute', bottom: 16, left: 16, right: 16 }}>
                  <Text style={[styles.stackLabelWhite, { fontSize: 11, opacity: 0.85, letterSpacing: 0.5, marginBottom: 2 }]}>ATTENDANCE</Text>
                  <Text style={[styles.stackBigValue, { fontSize: 34, marginBottom: 8, lineHeight: 38 }]}>{overallAttendance}%</Text>
                  <View style={[styles.miniProgress, { width: '100%', backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                    <View style={[styles.miniProgressBar, { width: `${overallAttendance}%`, backgroundColor: '#fff' }]} />
                  </View>
                </View>
              </CardGradient>
            </View>
          </TouchableOpacity>
        </Animated.View>

        {/* Next Class Widget - ANIMATED */}
        <Animated.View entering={FadeInDown.delay(400).duration(600).springify()}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Next Class</Text>
          {nextClassInfo.status === 'upcoming' ? (
            <View style={[styles.nextClassCardShadow, { backgroundColor: '#1D4ED8', borderRadius: 24, overflow: 'hidden' }]}>
              <CardGradient
                id="grad_next_class"
                colors={['#1D4ED8', '#6D28D9']}
                style={styles.nextClassCardInner}
                borderStyle={{ borderWidth: 1.5, borderColor: 'rgba(255, 255, 255, 0.15)' }}
              >
                <View style={[styles.cardDecorCircle, { bottom: -30, right: -30, backgroundColor: 'rgba(255, 255, 255, 0.08)', width: 120, height: 120, borderRadius: 60 }]} />
                <View style={styles.nextClassHeader}>
                  <View style={[styles.timeBadge, { backgroundColor: 'rgba(255, 255, 255, 0.25)', flexDirection: 'row', alignItems: 'center' }]}>
                    <Clock size={12} color="#ffffff" />
                    <Text style={[styles.timeText, { color: '#ffffff' }]}>{nextClassInfo.time}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={[styles.pulseDot, { backgroundColor: '#ffffff' }]} />
                    <View style={[styles.typeBadgeWidget, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]}>
                      <Text style={[styles.typeTextWidget, { color: '#ffffff', fontWeight: '800' }]}>{nextClassInfo.type.toUpperCase()}</Text>
                    </View>
                  </View>
                </View>

                <Text style={[styles.subjectText, { color: '#ffffff', fontWeight: '800' }]} numberOfLines={2}>{nextClassInfo.subject}</Text>

                <View style={[styles.nextClassFooter, { borderTopColor: 'rgba(255, 255, 255, 0.2)' }]}>
                  <View style={styles.footerItem}>
                    <Tag size={12} color="rgba(255, 255, 255, 0.85)" />
                    <Text style={[styles.footerText, { color: 'rgba(255, 255, 255, 0.85)', fontWeight: '600' }]}>{nextClassInfo.subjectCode}</Text>
                  </View>
                  <View style={[styles.footerDivider, { backgroundColor: 'rgba(255, 255, 255, 0.25)' }]} />
                  <View style={styles.footerItem}>
                    <MapPin size={12} color="rgba(255, 255, 255, 0.85)" />
                    <Text style={[styles.footerText, { color: 'rgba(255, 255, 255, 0.85)', fontWeight: '600' }]}>{nextClassInfo.room}</Text>
                  </View>
                </View>
              </CardGradient>
            </View>
          ) : (
            <View style={[styles.emptyCardPremium, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.emptyIconBg, { backgroundColor: '#34C75915' }]}>
                <Coffee size={28} color="#34C759" />
              </View>
              <View style={styles.emptyTextContainer}>
                <Text style={[styles.emptyTitlePremium, { color: colors.text }]}>All Caught Up!</Text>
                <Text style={[styles.emptySubPremium, { color: colors.textSecondary }]}>
                  {nextClassInfo.status === 'no_classes' ? 'No more classes for today. Enjoy your free time!' : 'Your schedule is currently clear.'}
                </Text>
              </View>
              <View style={[styles.emptyGlow, { backgroundColor: '#34C75910' }]} />
            </View>
          )}
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(600).duration(600).springify()}
          style={{ marginBottom: 25 }} // Add space before Pending Assignments
        >
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Utilities</Text>
          <SwipeableUtilityStack
            isDark={isDark}
            colors={colors}
            data={data}
            nextExam={nextExam}
            onFeePress={() => router.push('/fees' as any)}
            onLibraryPress={() => openUmsForm('https://ums.lpu.in/lpuums/frmRoomBooking.aspx', 'Room Booking')}
            onExamsPress={handleExamsPress}
            onScrollToggle={setScrollEnabled}
          />
        </Animated.View>

        {/* Pending Assignments */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Pending Assignments</Text>
        {data.assignments && data.assignments.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
            {data.assignments.map((assignment, index) => {
              const isPractical = assignment.type?.toLowerCase().includes('practical');
              const isCA = assignment.type?.toLowerCase().includes('ca') || assignment.type?.toLowerCase().includes('continuous');

              return (
                <View key={index} style={[styles.assignmentCardPremium, {
                  padding: 0,
                  overflow: 'hidden',
                  borderColor: 'rgba(255, 255, 255, 0.15)',
                  borderWidth: 1.5,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.1,
                  shadowRadius: 16,
                  elevation: 4
                }]}>
                  <LinearGradient
                    colors={['#0E7490', '#1D4ED8']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{ padding: 20, flex: 1, justifyContent: 'space-between' }}
                  >
                    <View style={styles.assignmentHeaderRow}>
                      <View style={[styles.typeIconBg, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]}>
                        {isPractical ? (
                          <Lock size={16} color="#ffffff" />
                        ) : isCA ? (
                          <Award size={16} color="#ffffff" />
                        ) : (
                          <FileText size={16} color="#ffffff" />
                        )}
                      </View>
                      <View style={styles.courseCol}>
                        <Text style={[styles.courseCodeText, { color: '#ffffff', fontWeight: '800' }]}>{assignment.courseCode}</Text>
                        <Text style={[styles.typeLabel, { color: 'rgba(255, 255, 255, 0.85)', fontWeight: '600' }]}>{assignment.type}</Text>
                      </View>
                    </View>

                    <View style={[styles.dueBadge, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]}>
                      <Clock size={12} color="#ffffff" />
                      <Text style={[styles.dueText, { color: '#ffffff', fontWeight: '700' }]}>Due: {assignment.lastDate}</Text>
                    </View>

                    <TouchableOpacity
                      style={[styles.submitBtn, { backgroundColor: 'rgba(255, 255, 255, 0.25)' }]}
                      onPress={() => router.push('/assignments_upload' as any)}
                    >
                      <Text style={[styles.submitBtnText, { color: '#ffffff', fontWeight: '800' }]}>Submit Task</Text>
                      <ChevronRight size={14} color="#fff" />
                    </TouchableOpacity>

                    <View style={[styles.assignmentGlow, { backgroundColor: 'rgba(255, 255, 255, 0.08)' }]} />
                  </LinearGradient>
                </View>
              );
            })}
          </ScrollView>
        ) : (
          <View style={[styles.emptyCardPremium, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.emptyIconBg, { backgroundColor: colors.primary + '15' }]}>
              <Sparkles size={28} color={colors.primary} />
            </View>
            <View style={styles.emptyTextContainer}>
              <Text style={[styles.emptyTitlePremium, { color: colors.text }]}>Zero Pending Tasks!</Text>
              <Text style={[styles.emptySubPremium, { color: colors.textSecondary }]}>
                You've completed all your assignments. Great job staying ahead!
              </Text>
            </View>
            <View style={[styles.emptyGlow, { backgroundColor: colors.primary + '10' }]} />
          </View>
        )}

        {/* Announcements */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Announcements</Text>
        <View style={[styles.announcementContainer, {
          padding: 0,
          overflow: 'hidden',
          borderColor: 'rgba(255, 255, 255, 0.15)',
          borderWidth: 1.5,
          borderRadius: 24,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.1,
          shadowRadius: 16,
          elevation: 4,
          maxHeight: 280, // Show roughly 3.5 items
        }]}>
          <LinearGradient
            colors={['#4A1D5B', '#2D1237']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ flex: 1 }}
          >
            {data.announcements && data.announcements.length > 0 ? (
              <ScrollView nestedScrollEnabled={true} showsVerticalScrollIndicator={true}>
                {data.announcements.map((item: any, index: number) => (
                  <TouchableOpacity key={item.id || index} style={[styles.announcementCard, { borderBottomColor: 'rgba(255, 255, 255, 0.15)', width: '100%', marginRight: 0 }]}>
                    <View style={styles.announcementInner}>
                      <View style={[styles.announcementIndicator, { backgroundColor: 'rgba(255, 255, 255, 0.45)' }]} />
                      <View style={styles.announcementContent}>
                        <Text style={[styles.announcementTitle, { color: '#ffffff', fontWeight: '800' }]} numberOfLines={2}>{item.title}</Text>
                        <Text style={[styles.announcementDate, { color: 'rgba(255, 255, 255, 0.8)', fontWeight: '600' }]}>{item.date}</Text>
                      </View>
                    </View>
                    <ChevronRight size={18} color="#ffffff" />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : (
              <View style={[styles.emptyCard, { backgroundColor: 'transparent', margin: 15 }]}>
                <Text style={[styles.emptyText, { color: 'rgba(255, 255, 255, 0.8)' }]}>No new announcements.</Text>
              </View>
            )}
          </LinearGradient>
        </View>
          {/* Update Manager */}
          <View style={[styles.updateCard, { padding: 0, overflow: 'hidden', borderColor: 'rgba(255, 255, 255, 0.15)', borderWidth: 1.5, borderRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 16, elevation: 4, marginTop: 20 }]}>
            <LinearGradient
              colors={['#2D2D2D', '#1A1A1A']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ padding: 18, width: '100%', flexDirection: 'column', alignItems: 'center' }}
            >
              <View style={[styles.updateInfo, { marginBottom: 15, flexDirection: 'column', alignItems: 'center' }]}>
                <View style={[styles.versionBadge, { backgroundColor: 'rgba(255, 255, 255, 0.25)', marginBottom: 8 }]}>
                  <Text style={[styles.versionText, { color: '#ffffff', fontWeight: '800' }]}>v{version}</Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <Text style={[styles.updateTitle, { color: '#ffffff', textAlign: 'center', fontWeight: '800' }]}>
                    {updateAvailable ? 'New Update Ready! 🚀' : 'App is up to date'}
                  </Text>
                  <Text style={[styles.updateSub, { color: 'rgba(255, 255, 255, 0.85)', textAlign: 'center', fontWeight: '600' }]}>
                    {updateAvailable ? 'Restart to apply fixes' : 'Check GitHub for releases'}
                  </Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 10, width: '100%', paddingHorizontal: 10 }}>
                <TouchableOpacity
                  onPress={updateAvailable ? handleUpdate : forceUpdate}
                  style={[styles.updateBtn, { backgroundColor: 'rgba(255, 255, 255, 0.25)', flex: 1, opacity: isUpdating ? 0.7 : 1 }]}
                  disabled={isUpdating}
                >
                  {isUpdating ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={[styles.updateBtnText, { color: '#ffffff', fontWeight: '800' }]}>
                      {updateAvailable ? 'Update Now' : 'Check Updates'}
                    </Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => Linking.openURL('https://github.com/Ashishshankar26/ALMS/releases')}
                  style={[styles.updateBtn, { backgroundColor: 'transparent', borderColor: 'rgba(255, 255, 255, 0.35)', borderWidth: 1, flex: 1 }]}
                >
                  <Text style={[styles.updateBtnText, { color: '#ffffff', fontWeight: '800' }]}>
                    Download APK
                  </Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>

      </View>
    </ScrollView>
      {/* Modal for My Messages - WORLD-CLASS PASTEL MINIMAL REMAKE */}
      <Modal visible={showMessages} animationType="slide" transparent={true} onRequestClose={() => setShowMessages(false)}>
        <View style={[styles.modalOverlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.85)' : 'rgba(0,0,0,0.6)' }]}>
          <BlurView intensity={35} style={StyleSheet.absoluteFill} tint={isDark ? 'dark' : 'light'} />

          <View style={[styles.modalContent, { backgroundColor: isDark ? '#14161A' : '#F7F7F9' }]}>
            <View style={styles.modalHandle} />

            <View style={[styles.modalHeader, { borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', borderBottomWidth: 1 }]}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>My Messages</Text>
                <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>University Announcements & Alerts</Text>
              </View>
              <TouchableOpacity onPress={() => setShowMessages(false)} style={[styles.closeBtnCompact, { backgroundColor: colors.primary + '15' }]}>
                <Text style={[styles.closeBtnTextCompact, { color: colors.primary }]}>Done</Text>
              </TouchableOpacity>
            </View>

            {(() => {
              // High-end pastel theme mapper matching the uploaded UI design exactly
              const getCardTheme = (label: string) => {
                switch (label) {
                  case 'ACADEMIC':
                    return {
                      bg: isDark ? '#142517' : '#E8F5E9',
                      text: isDark ? '#A5D6A7' : '#0B5D2E',
                      textSecondary: isDark ? 'rgba(165, 214, 167, 0.7)' : 'rgba(11, 93, 46, 0.7)',
                      accent: '#34C759'
                    };
                  case 'ATTENDANCE':
                    return {
                      bg: isDark ? '#2E1E12' : '#FFF3E0',
                      text: isDark ? '#FFE0B2' : '#5D360B',
                      textSecondary: isDark ? 'rgba(255, 224, 178, 0.7)' : 'rgba(93, 54, 11, 0.7)',
                      accent: '#FF9500'
                    };
                  case 'EXAMINATIONS':
                    return {
                      bg: isDark ? '#2D1A1A' : '#FFEBEE',
                      text: isDark ? '#FFCDD2' : '#B71C1C',
                      textSecondary: isDark ? 'rgba(255, 205, 210, 0.7)' : 'rgba(183, 28, 28, 0.7)',
                      accent: '#FF3B30'
                    };
                  case 'FINANCIAL':
                    return {
                      bg: isDark ? '#112A2E' : '#E0F7FA',
                      text: isDark ? '#B2EBF2' : '#006064',
                      textSecondary: isDark ? 'rgba(178, 235, 242, 0.7)' : 'rgba(0, 96, 100, 0.7)',
                      accent: '#5856D6'
                    };
                  case 'PLACEMENT':
                    return {
                      bg: isDark ? '#161B2E' : '#E8EAF6',
                      text: isDark ? '#C5CAE9' : '#1A237E',
                      textSecondary: isDark ? 'rgba(197, 202, 233, 0.7)' : 'rgba(26, 35, 126, 0.7)',
                      accent: '#007AFF'
                    };
                  case 'LEAVE/OD':
                    return {
                      bg: isDark ? '#231A2D' : '#F3E5F5',
                      text: isDark ? '#E1BEE7' : '#4A148C',
                      textSecondary: isDark ? 'rgba(225, 190, 231, 0.7)' : 'rgba(74, 20, 140, 0.7)',
                      accent: '#AF52DE'
                    };
                  default: // ANNOUNCEMENT / OTHERS
                    return {
                      bg: isDark ? '#1D2226' : '#ECEFF1',
                      text: isDark ? '#CFD8DC' : '#263238',
                      textSecondary: isDark ? 'rgba(207, 216, 220, 0.7)' : 'rgba(38, 50, 56, 0.7)',
                      accent: colors.primary
                    };
                }
              };

              return (
                <>
                  {/* Premium Category Filter Tabs */}
                  <View style={{ paddingTop: 14, paddingBottom: 6 }}>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
                    >
                      {[
                        { key: 'ALL', label: 'All' },
                        { key: 'ACADEMIC', label: 'Academics' },
                        { key: 'EXAMINATIONS', label: 'Exams' },
                        { key: 'ATTENDANCE', label: 'Attendance' },
                        { key: 'FINANCIAL', label: 'Financial' },
                        { key: 'PLACEMENT', label: 'Placement' },
                        { key: 'LEAVE/OD', label: 'Leaves' },
                        { key: 'ANNOUNCEMENT', label: 'Announcements' },
                      ].map((tab) => {
                        const count = (() => {
                          if (!data.messages) return 0;
                          if (tab.key === 'ALL') return data.messages.length;
                          return data.messages.filter((item: any) => getMessageConfig(item.title).label === tab.key).length;
                        })();

                        if (count === 0 && tab.key !== 'ALL') return null; // Hide empty filters
                        const isActive = activeCategoryTab === tab.key;
                        const tabTheme = getCardTheme(tab.key);

                        return (
                          <TouchableOpacity
                            key={tab.key}
                            activeOpacity={0.8}
                            onPress={() => {
                              setActiveCategoryTab(tab.key);
                              setExpandedMessageIdx(null);
                            }}
                            style={[
                              {
                                flexDirection: 'row',
                                alignItems: 'center',
                                paddingHorizontal: 16,
                                paddingVertical: 8,
                                borderRadius: 20,
                                borderWidth: 1,
                                gap: 6,
                              },
                              isActive
                                ? { 
                                    backgroundColor: tabTheme.bg,
                                    borderColor: tabTheme.text + '25',
                                  }
                                : {
                                    backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                                    borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                                  },
                            ]}
                          >
                            <Text
                              style={[
                                {
                                  fontSize: 13,
                                  fontWeight: '700',
                                },
                                { color: isActive ? tabTheme.text : colors.textSecondary },
                              ]}
                            >
                              {tab.label}
                            </Text>
                            <View
                              style={[
                                {
                                  paddingHorizontal: 6,
                                  paddingVertical: 1.5,
                                  borderRadius: 10,
                                  minWidth: 18,
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                },
                                isActive
                                  ? { backgroundColor: tabTheme.text + '18' }
                                  : { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' },
                              ]}
                            >
                              <Text
                                style={[
                                  {
                                    fontSize: 10,
                                    fontWeight: '800',
                                  },
                                  { color: isActive ? tabTheme.text : colors.textSecondary },
                                ]}
                              >
                                {count}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>

                  <ScrollView 
                    style={styles.messagesList} 
                    showsVerticalScrollIndicator={false} 
                    contentContainerStyle={{ paddingBottom: 60, paddingHorizontal: 20 }}
                  >
                    {(() => {
                      const filtered = (data.messages || []).filter((item: any) => {
                        if (activeCategoryTab === 'ALL') return true;
                        return getMessageConfig(item.title).label === activeCategoryTab;
                      });

                      if (filtered.length > 0) {
                        return filtered.map((item, idx) => {
                          const isExpanded = expandedMessageIdx === idx;
                          const config = getMessageConfig(item.title);
                          const Icon = config.icon;
                          const cardTheme = getCardTheme(config.label);

                          const titleParts = (item.title || "").split(/[-:]/);

                          // Extract sender from By/By: or split title
                          const getSenderName = () => {
                            const txt = (item.content || '') + ' ' + (item.title || '');
                            
                            // Check for explicit "By: Name" or "By Name" (case-insensitive)
                            const byPatterns = [
                              /\bBy\s*:\s*([A-Za-z\s\.\,\-]+)/i,
                              /\bBy\s+([A-Za-z\s\.\,\-]+)/i
                            ];

                             for (const pattern of byPatterns) {
                              const match = txt.match(pattern);
                              if (match && match[1]) {
                                const name = match[1].trim().split(/[\n\r]/)[0].trim();
                                // Clean brackets, parentheses, unclosed enclosures and trailing punctuation
                                const cleaned = name
                                  .replace(/\([^)]*\)/g, '')
                                  .replace(/\[[^\]]*\]/g, '')
                                  .replace(/\([^\)]*$/, '')
                                  .replace(/\[[^\]]*$/, '')
                                  .replace(/[\:\-\.\,\s]+$/, '')
                                  .trim();
                                if (cleaned.length > 2 && 
                                    !cleaned.toLowerCase().startsWith('http') &&
                                    !['announcement', 'important', 'recently', 'today', 'notification'].some(w => cleaned.toLowerCase() === w)) {
                                  return cleaned;
                                }
                              }
                            }

                            // Fallback to title parsing
                            return titleParts.length > 1 ? titleParts[0].trim() : (config.label || "LPU UMS");
                          };

                          const rawSender = getSenderName();
                          const sender = rawSender
                            .toLowerCase()
                            .replace('exmamination', 'examination')
                            .split(' ')
                            .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
                            .join(' ');

                          const cleanTitle = titleParts.length > 1 ? titleParts.slice(1).join('-').trim() : item.title;

                          // Extract proper date mentioned inside the message content/title robustly
                          const extractProperDate = (txt: string, fallback: string) => {
                            if (!txt) return fallback;
                            // 1) 18-May-2026 or 18/05/2026 or 18-05-2026
                            const match1 = txt.match(/(\d{1,2})[\/\-\s]([A-Za-z]{3,9}|\d{1,2})[\/\-\s](\d{4})/i);
                            if (match1) return match1[0];
                            
                            // 2) May 18, 2026 or May 18 2026
                            const match2 = txt.match(/([A-Za-z]{3,9})\s+(\d{1,2}),?\s+(\d{4})/i);
                            if (match2) return match2[0];

                            // 3) 18th May 2026
                            const match3 = txt.match(/(\d{1,2})(?:st|nd|rd|th)\s+([A-Za-z]{3,9})\s+(\d{4})/i);
                            if (match3) return match3[0];

                            if (fallback === 'Recently' || !fallback) return '18 May 2026';
                            return fallback;
                          };

                          // Extract parenthesis date right after By/By: [Name] (e.g. By Sami Anand (May 05, 2026))
                          const extractParenthesisDate = (txt: string) => {
                            if (!txt) return null;
                            const match = txt.match(/\bBy\s*(?:\:\s*)?[A-Za-z\s\.\,\-]+\(\s*([A-Za-z0-9\s\,\-\/]{4,20})/i);
                            if (match && match[1]) {
                              const d = match[1].trim().replace(/\)$/, '').trim();
                              if (d.match(/\d{4}/) && (d.match(/[0-9]/) || d.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i))) {
                                return d;
                              }
                            }
                            return null;
                          };

                          const pDate = extractParenthesisDate((item.content || '') + ' ' + (item.title || ''));
                          const properDate = pDate || extractProperDate((item.content || '') + ' ' + (item.title || ''), item.date);

                          return (
                            <Animated.View
                              key={item.id || idx}
                              layout={Layout.springify()}
                              entering={FadeInDown.delay(idx * 50)}
                            >
                              <TouchableOpacity
                                onPress={() => setExpandedMessageIdx(isExpanded ? null : idx)}
                                activeOpacity={0.92}
                                style={[
                                  {
                                    borderRadius: 24,
                                    marginBottom: 14,
                                    overflow: 'hidden',
                                    position: 'relative',
                                    padding: 20,
                                    shadowColor: cardTheme.accent,
                                    shadowOffset: { width: 0, height: 6 },
                                    shadowOpacity: isExpanded ? (isDark ? 0.2 : 0.08) : 0,
                                    shadowRadius: 12,
                                    elevation: isExpanded ? 3 : 0,
                                  },
                                  {
                                    backgroundColor: cardTheme.bg,
                                  }
                                ]}
                              >
                                {/* Top Category / Label Row */}
                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                    <Icon size={12} color={cardTheme.text} style={{ opacity: 0.85 }} />
                                    <Text 
                                      style={{ 
                                        fontSize: 11.5, 
                                        fontWeight: '700', 
                                        color: cardTheme.text, 
                                        opacity: 0.85, 
                                        letterSpacing: 0.2,
                                        textTransform: 'capitalize' 
                                      }}
                                    >
                                      {config.label.toLowerCase().replace('/', ' / ')}
                                    </Text>
                                  </View>

                                  <View 
                                    style={{ 
                                      width: 22, 
                                      height: 22, 
                                      borderRadius: 11, 
                                      alignItems: 'center', 
                                      justifyContent: 'center', 
                                      backgroundColor: cardTheme.text + '10'
                                    }}
                                  >
                                    <ChevronRight
                                      size={11}
                                      color={cardTheme.text}
                                      style={{ 
                                        opacity: 0.85,
                                        transform: [{ rotate: isExpanded ? '90deg' : '0deg' }] 
                                      }}
                                    />
                                  </View>
                                </View>

                                {/* Middle Bold Title matching image style exactly */}
                                <Text 
                                  style={{ 
                                    fontSize: 18, 
                                    fontWeight: '800', 
                                    lineHeight: 24, 
                                    color: cardTheme.text,
                                    marginTop: 16,
                                    marginBottom: 16,
                                    letterSpacing: -0.2
                                  }} 
                                  numberOfLines={isExpanded ? undefined : 2}
                                >
                                  {cleanTitle}
                                </Text>

                                {/* Expandable Content */}
                                {(isExpanded || item.content) && (
                                  <Animated.View entering={FadeInUp.duration(300)}>
                                    <View 
                                      style={{ 
                                        height: 1, 
                                        backgroundColor: cardTheme.text + '15', 
                                        marginBottom: 14 
                                      }} 
                                    />
                                    <Text
                                      style={{ 
                                        fontSize: 13.5, 
                                        lineHeight: 21, 
                                        color: cardTheme.text, 
                                        opacity: 0.9,
                                        marginBottom: 16
                                      }}
                                      numberOfLines={isExpanded ? undefined : 2}
                                    >
                                      {item.content}
                                    </Text>
                                    {isExpanded && (
                                      <View style={{ flexDirection: 'row', marginBottom: 14, gap: 10 }}>
                                        <TouchableOpacity 
                                          activeOpacity={0.7}
                                          onPress={() => {
                                            const { Clipboard } = require('react-native');
                                            Clipboard.setString(item.title + '\n\n' + item.content);
                                          }}
                                          style={{ 
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            gap: 6,
                                            paddingHorizontal: 12, 
                                            paddingVertical: 6, 
                                            borderRadius: 8, 
                                            backgroundColor: cardTheme.text + '15',
                                            borderWidth: 1,
                                            borderColor: cardTheme.text + '25'
                                          }}
                                        >
                                          <Text style={{ fontSize: 11, fontWeight: '700', color: cardTheme.text }}>Copy Alert</Text>
                                        </TouchableOpacity>
                                      </View>
                                    )}
                                  </Animated.View>
                                )}

                                {/* Bottom Metadata Row (By Name Left / Date Right) */}
                                <View 
                                  style={{ 
                                    flexDirection: 'row', 
                                    alignItems: 'center', 
                                    justifyContent: 'space-between',
                                    marginTop: 4
                                  }}
                                >
                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, marginRight: 12 }}>
                                    {/* Circle Initials Avatar matching User UI layout */}
                                    <View 
                                      style={{ 
                                        width: 18, 
                                        height: 18, 
                                        borderRadius: 9, 
                                        backgroundColor: cardTheme.text + '18',
                                        alignItems: 'center', 
                                        justifyContent: 'center' 
                                      }}
                                    >
                                      <Text style={{ fontSize: 9, fontWeight: '800', color: cardTheme.text }}>
                                        {sender.charAt(0).toUpperCase()}
                                      </Text>
                                    </View>

                                    <Text 
                                      style={{ 
                                        fontSize: 11.5, 
                                        fontWeight: '700', 
                                        color: cardTheme.text,
                                        opacity: 0.85
                                      }} 
                                      numberOfLines={1}
                                    >
                                      {sender}
                                    </Text>
                                  </View>

                                  <Text style={{ fontSize: 11.5, fontWeight: '600', color: cardTheme.textSecondary }}>
                                    {properDate}
                                  </Text>
                                </View>
                              </TouchableOpacity>
                            </Animated.View>
                          );
                        });
                      } else {
                        return (
                          <View style={styles.emptyStateCompact}>
                            <View style={[styles.emptyIconBg, { backgroundColor: colors.primary + '10' }]}>
                              <Bell size={32} color={colors.primary} />
                            </View>
                            <Text style={[styles.emptyTextCompact, { color: colors.textSecondary }]}>No new alerts in this section</Text>
                          </View>
                        );
                      }
                    })()}
                  </ScrollView>
                </>
              );
            })()}
          </View>
        </View>
      </Modal>

      {/* What's New Modal */}
      <Modal visible={showWhatsNew} animationType="fade" transparent={true}>
        <View style={styles.whatsNewOverlay}>
          <Animated.View entering={FadeInUp.springify()} style={[styles.whatsNewContent, { backgroundColor: colors.card }]}>
            <View style={[styles.whatsNewHeader, { backgroundColor: colors.primary }]}>
              <Text style={styles.whatsNewTitle}>What's New in v{version}</Text>
              <Text style={styles.whatsNewSubtitle}>We've made ALMS even better for you!</Text>
            </View>

            <ScrollView style={styles.whatsNewScroll} showsVerticalScrollIndicator={false}>
              <View style={styles.whatsNewItem}>
                <View style={[styles.whatsNewIcon, { backgroundColor: colors.primary + '15' }]}>
                  <Layers size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.whatsNewItemTitle, { color: colors.text }]}>Compact High-Density Design</Text>
                  <Text style={[styles.whatsNewItemDesc, { color: colors.textSecondary }]}>Redesigned headers to save 35% screen space. More data, less scrolling!</Text>
                </View>
              </View>

              <View style={styles.whatsNewItem}>
                <View style={[styles.whatsNewIcon, { backgroundColor: '#5856D615' }]}>
                  <BlurView intensity={20} style={StyleSheet.absoluteFill} />
                  <Bell size={20} color="#5856D6" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.whatsNewItemTitle, { color: colors.text }]}>Glassmorphism Messaging</Text>
                  <Text style={[styles.whatsNewItemDesc, { color: colors.textSecondary }]}>New translucent message portal with intelligent color-coding and spring animations.</Text>
                </View>
              </View>

              <View style={styles.whatsNewItem}>
                <View style={[styles.whatsNewIcon, { backgroundColor: '#34C75915' }]}>
                  <Award size={20} color="#34C759" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.whatsNewItemTitle, { color: colors.text }]}>Account Settings Hub</Text>
                  <Text style={[styles.whatsNewItemDesc, { color: colors.textSecondary }]}>Manage your university credentials and profile settings directly from the dashboard.</Text>
                </View>
              </View>

              <View style={styles.whatsNewItem}>
                <View style={[styles.whatsNewIcon, { backgroundColor: colors.warning + '15' }]}>
                  <Sun size={20} color={colors.warning} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.whatsNewItemTitle, { color: colors.text }]}>Enhanced Dark Mode</Text>
                  <Text style={[styles.whatsNewItemDesc, { color: colors.textSecondary }]}>New 'Lite-Tint' backgrounds for metric cards to improve visibility and depth.</Text>
                </View>
              </View>
            </ScrollView>

            <TouchableOpacity style={[styles.whatsNewButton, { backgroundColor: colors.primary }]} onPress={closeWhatsNew}>
              <Text style={styles.whatsNewButtonText}>Let's Go!</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>

      {/* Modal for Profile Options */}
      <Modal visible={showProfileMenu} animationType="fade" transparent={true} onRequestClose={() => setShowProfileMenu(false)}>
        <TouchableOpacity
          style={styles.profileModalOverlay}
          activeOpacity={1}
          onPress={() => setShowProfileMenu(false)}
        >
          <View style={[styles.profileMenuContent, { backgroundColor: colors.card }]}>
            <View style={[styles.profileMenuHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.profileMenuTitle, { color: colors.text }]}>Account Settings</Text>
            </View>

            <TouchableOpacity style={styles.menuItem} onPress={() => openUmsForm('frmchangepassword.aspx', 'Change Password')}>
              <Text style={[styles.menuItemText, { color: colors.text }]}>Change Password</Text>
              <Lock size={18} color={colors.primary} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={() => openUmsForm('frmAdPassword.aspx', 'Wifi Password')}>
              <Text style={[styles.menuItemText, { color: colors.text }]}>Wifi Password</Text>
              <Wifi size={18} color={colors.primary} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={() => openUmsForm('openapp.aspx?from=ums&toApp=nextproject&pagename=dashboard/user-profile', 'Profile Update')}>
              <Text style={[styles.menuItemText, { color: colors.text }]}>Profile Update</Text>
              <UserCheck size={18} color={colors.primary} />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.menuItem, { borderBottomWidth: 0 }]} onPress={() => { setShowProfileMenu(false); logout(); }}>
              <Text style={[styles.menuItemText, { color: colors.error }]}>Sign out</Text>
              <LogOut size={18} color={colors.error} />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 25,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#C7C7CC',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : Constants.statusBarHeight,
    paddingHorizontal: 20,
    paddingBottom: 15,
    backgroundColor: '#fff',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  welcomeText: {
    fontSize: 12.5,
    fontWeight: '800',
    textTransform: 'uppercase',
    opacity: 0.7,
    letterSpacing: 0.5,
  },
  nameLarge: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -1,
    marginTop: -4,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notifBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  notifText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: 'bold',
  },
  logoutBtn: {
    backgroundColor: '#FFF2F2',
    padding: 12,
    borderRadius: 22,
  },
  premiumProfileCard: {
    backgroundColor: '#FAFAFA',
    borderRadius: 32,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F2F2F7',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.18,
    shadowRadius: 30,
    elevation: 12,
  },
  profileCardShell: {
    position: 'relative',
    marginTop: 4,
  },
  profileWalletShell: {
    position: 'relative',
    marginTop: 10,
    height: 208,
  },
  profileStackCard: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
  },
  profileStackLayer: {
    position: 'absolute',
    left: 42,
    right: 42,
    height: 58,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(17,17,17,0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 5,
  },
  profileStackLayerOne: {
    top: 0,
    backgroundColor: '#EFFF5B',
  },
  profileStackLayerTwo: {
    top: 14,
    backgroundColor: '#86DFA5',
  },
  profileStackLayerThree: {
    top: 28,
    backgroundColor: '#AEBBFF',
  },
  profileCircularOverlay: {
    position: 'absolute',
    left: 16,
    right: 16,
    top: 16,
    bottom: -16,
  },
  profileCardGlow: {
    position: 'absolute',
    left: 16,
    right: 16,
    top: 16,
    bottom: -16,
    borderRadius: 36,
  },
  headerCardGlow: {
    position: 'absolute',
    left: 16,
    right: 16,
    top: 8,
    bottom: -8,
    borderRadius: 24,
  },
  profileCardGradient: {
    height: 188,
    padding: 16,
    borderRadius: 28,
  },
  profileCardHandle: {
    position: 'absolute',
    top: 10,
    alignSelf: 'center',
    width: 34,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(17,17,17,0.12)',
  },
  profileCardOrb: {
    position: 'absolute',
    right: -44,
    bottom: -52,
    width: 170,
    height: 170,
    borderRadius: 85,
  },
  masterShapeLeft: {
    position: 'absolute',
    left: 22,
    top: 58,
    width: 74,
    height: 82,
    borderTopLeftRadius: 42,
    borderBottomLeftRadius: 42,
  },
  masterShapeMid: {
    position: 'absolute',
    left: 72,
    top: 58,
    width: 78,
    height: 82,
    borderTopLeftRadius: 42,
    borderBottomLeftRadius: 42,
  },
  masterShapeRight: {
    position: 'absolute',
    right: 28,
    top: 58,
    width: 84,
    height: 84,
    borderRadius: 42,
  },
  profileContactless: {
    position: 'absolute',
    right: 18,
    bottom: 38,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactlessArc: {
    width: 14,
    height: 14,
    borderRightWidth: 3,
    borderColor: '#111111',
    borderRadius: 8,
  },
  contactlessArcTwo: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 12,
    opacity: 0.6,
  },
  profileTopLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 0,
    paddingLeft: 52,
    paddingRight: 0,
  },
  profileTitleBlock: {
    flex: 1,
    paddingRight: 14,
  },
  profileEyebrow: {
    color: '#111111',
    fontSize: 17,
    fontWeight: '500',
    letterSpacing: -0.4,
    marginBottom: 5,
  },
  profileNameNew: {
    color: '#111111',
    fontSize: 18,
    lineHeight: 20,
    fontWeight: '900',
    letterSpacing: -1,
  },
  avatarButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 48,
    height: 48,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(17,17,17,0.14)',
    backgroundColor: 'rgba(255,255,255,0.28)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 14,
    elevation: 6,
  },
  avatarNew: {
    width: '100%',
    height: '100%',
    borderRadius: 15,
  },
  avatarEditMark: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileProgramNew: {
    color: 'rgba(17,17,17,0.62)',
    fontSize: 16,
    lineHeight: 18,
    fontWeight: '800',
    marginTop: 3,
    maxWidth: 190,
  },
  profileCardBottomNew: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  profileLockToggle: {
    width: 44,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    padding: 3,
    justifyContent: 'center',
  },
  profileLockKnob: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  profileMiniMeta: {
    alignItems: 'flex-end',
  },
  profileFooterCode: {
    color: 'rgba(17,17,17,0.5)',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  profileVidDigits: {
    color: 'rgba(17,17,17,0.55)',
    fontSize: 8,
    fontWeight: '800',
    marginTop: 3,
  },
  cardChip: {
    position: 'absolute',
    left: 16,
    top: 76,
    width: 44,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.34)',
    borderWidth: 1,
    borderColor: 'rgba(17,17,17,0.12)',
    justifyContent: 'center',
    paddingHorizontal: 8,
    gap: 5,
  },
  cardChipLine: {
    height: 3,
    width: 24,
    borderRadius: 2,
    backgroundColor: 'rgba(17,17,17,0.35)',
  },
  cardChipLineShort: {
    height: 3,
    width: 16,
    borderRadius: 2,
    backgroundColor: 'rgba(17,17,17,0.24)',
  },
  profileStackDots: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  profileStackDot: {
    height: 5,
    borderRadius: 3,
  },
  avatarLarge: {
    width: 76,
    height: 76,
    borderRadius: 38,
    marginRight: 18,
    borderWidth: 4,
    borderColor: '#fff',
  },
  profileDetails: {
    flex: 1,
  },
  fullName: {
    color: '#000',
    fontSize: 23,
    fontWeight: '900',
    marginBottom: 6,
    letterSpacing: -0.7,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  vidBadge: {
    backgroundColor: '#E5F1FF',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  sectionBadge: {
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  vidText: {
    color: '#007AFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  sectionText: {
    color: '#333',
    fontSize: 12,
    fontWeight: 'bold',
  },
  programText: {
    color: '#8E8E93',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 19,
  },
  syncRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#34C759',
    marginRight: 8,
  },
  syncText: {
    color: '#34C759',
    fontSize: 12,
    fontWeight: '600',
  },
  feeCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F2F2F7',
  },
  feeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  feeIconBg: {
    width: 50,
    height: 50,
    borderRadius: 15,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  feeLabel: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  feeValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#000',
    marginTop: 2,
  },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 4,
  },
  payButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#5856D6',
  },
  content: {
    padding: 20,
  },
  gridContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  gridCard: {
    width: (width - 55) / 2,
    padding: 20,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  cardIcon: {
    marginBottom: 15,
    opacity: 0.9,
  },
  gridCardLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontWeight: '600',
  },
  gridCardValue: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: 5,
  },
  examsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E5F1FF',
    padding: 15,
    borderRadius: 16,
    marginBottom: 25,
    borderWidth: 1,
    borderColor: '#CCE0FF',
  },
  examsBannerIcon: {
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 12,
    marginRight: 15,
  },
  examsBannerTextContainer: {
    flex: 1,
  },
  examsBannerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 2,
  },
  examsBannerSubtitle: {
    fontSize: 13,
    color: '#005BB5',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 15,
    letterSpacing: -0.5,
  },
  horizontalScroll: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
    paddingBottom: 10, // Shadow clipping
  },
  assignmentCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 15,
    width: 190,
    minHeight: 160,
    marginRight: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    justifyContent: 'space-between',
  },
  assignmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  assignmentCourse: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#000',
    marginLeft: 6,
    flex: 1,
  },
  assignmentType: {
    fontSize: 13,
    color: '#8E8E93',
    lineHeight: 18,
  },
  assignmentFooter: {
    marginTop: 10,
  },
  assignmentDate: {
    fontSize: 12,
    color: '#FF3B30',
    fontWeight: '600',
    marginBottom: 8,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F2F2F7',
    paddingVertical: 8,
    borderRadius: 8,
  },
  uploadButtonText: {
    color: '#007AFF',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
  emptyCardPremium: {
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
    gap: 15,
  },
  emptyIconBg: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTextContainer: {
    flex: 1,
  },
  emptyTitlePremium: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  emptySubPremium: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  emptyGlow: {
    position: 'absolute',
    right: -20,
    bottom: -20,
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  nextClassCardShadow: {
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
    marginBottom: 25,
  },
  nextClassCardInner: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  nextClassCard: {
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
    marginBottom: 25,
  },
  nextClassHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  timeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  typeBadgeWidget: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  typeTextWidget: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  subjectText: {
    fontSize: 19,
    fontWeight: '800',
    lineHeight: 24,
    marginBottom: 15,
    paddingHorizontal: 2,
  },
  nextClassFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 15,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footerText: {
    fontSize: 12,
    fontWeight: '600',
  },
  footerDivider: {
    width: 1,
    height: 12,
    marginHorizontal: 15,
  },
  announcementContainer: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    marginBottom: 40,
  },
  announcementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  announcementInner: {
    flex: 1,
    flexDirection: 'row',
  },
  announcementIndicator: {
    width: 3.5,
    borderRadius: 10,
    marginRight: 15,
    marginVertical: 4,
  },
  announcementContent: {
    flex: 1,
    paddingRight: 10,
  },
  announcementTitle: {
    ...Typography.bodyBold,
    fontSize: 15.5,
    lineHeight: 20,
    marginBottom: 2,
  },
  announcementDate: {
    ...Typography.body,
    fontSize: 12,
    opacity: 0.75,
    marginTop: 0,
  },
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 25,
  },
  emptyText: {
    color: '#8E8E93',
    fontSize: 15,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  profileModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    height: '85%',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 25,
    paddingBottom: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalHandle: {
    width: 40,
    height: 5,
    backgroundColor: 'rgba(142, 142, 147, 0.3)',
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  modalSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  closeBtnCompact: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  closeBtnTextCompact: {
    fontSize: 14,
    fontWeight: '700',
  },
  messagesList: {
    flex: 1,
    marginTop: 20,
  },
  messageCardEnhanced: {
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  messageHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  messageIndicatorGlow: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  categoryIconBg: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  messageTitleEnhanced: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  messageDateEnhanced: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 6,
    opacity: 0.6,
  },
  expandIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  whatsNewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 25,
  },
  whatsNewContent: {
    width: '100%',
    maxHeight: '80%',
    borderRadius: 32,
    overflow: 'hidden',
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  whatsNewHeader: {
    padding: 25,
    alignItems: 'center',
  },
  whatsNewTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
  },
  whatsNewSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 5,
    textAlign: 'center',
  },
  whatsNewScroll: {
    padding: 20,
  },
  whatsNewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    marginBottom: 25,
  },
  whatsNewIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  whatsNewItemTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 2,
  },
  whatsNewItemDesc: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  whatsNewButton: {
    margin: 20,
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  whatsNewButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  messageContentEnhanced: {
    fontSize: 13.5,
    lineHeight: 20,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(142, 142, 147, 0.2)',
  },
  emptyStateCompact: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyIconBg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTextCompact: {
    fontSize: 15,
    fontWeight: '600',
  },
  content: {
    padding: 20,
    paddingTop: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
    marginTop: 12,
    letterSpacing: -0.3,
  },
  gridContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 0,
  },
  gridCardShadow: {
    flex: 1,
    borderRadius: 32,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
  },
  gridCardInner: {
    flex: 1,
    padding: 16,
    borderRadius: 32,
    minHeight: 154,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  gridCard: {
    flex: 1,
    padding: 16,
    borderRadius: 24,
    minHeight: 140,
    justifyContent: 'space-between',
    position: 'relative',
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  gridCardLabel: {
    color: 'rgba(255,255,255,0.95)',
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
    letterSpacing: 0.2,
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginVertical: 4,
  },
  gridCardValue: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '800',
  },
  glassBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  glassBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
  },
  cardFooter: {
    width: '100%',
    marginTop: 5,
  },
  miniProgress: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  miniProgressBar: {
    height: '100%',
    borderRadius: 2,
  },
  cardGlow: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  feeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 0,
  },
  examsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 24,
    borderWidth: 1,
    marginTop: 12,
  },
  // ── Utility Grid (side-by-side square cards) ──
  utilityGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  utilitySquareCard: {
    flex: 1,
    aspectRatio: 0.95,
    borderRadius: 28,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 4,
  },
  utilityCardInner: {
    flex: 1,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  utilityIconContainer: {
    position: 'relative',
    marginBottom: 4,
  },
  utilityIconBg: {
    width: 60,
    height: 60,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  utilityIconBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  utilityIconBadgeText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
    marginTop: -1,
  },
  utilityCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 20,
    letterSpacing: -0.3,
  },
  utilityActionBtn: {
    paddingHorizontal: 28,
    paddingVertical: 10,
    borderRadius: 14,
    width: '100%',
    alignItems: 'center',
  },
  utilityActionBtnText: {
    fontSize: 14,
    fontWeight: '800',
  },
  // ── Wallet Stack (Fee Card) ──
  utilitySquareCardWrapper: {
    flex: 1,
    aspectRatio: 0.95,
    position: 'relative',
  },
  walletLayerBack: {
    position: 'absolute',
    top: 0,
    left: 6,
    right: 6,
    height: 32,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 12,
    paddingTop: 6,
    zIndex: 1,
  },
  walletLayerMid: {
    position: 'absolute',
    top: 14,
    left: 3,
    right: 3,
    height: 32,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 12,
    paddingTop: 6,
    zIndex: 2,
  },
  walletLayerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  walletLayerBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
  },
  walletFrontCard: {
    position: 'absolute',
    top: 30,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 24,
    padding: 16,
    zIndex: 3,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  walletHandle: {
    width: 36,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 8,
  },
  walletFab: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 4,
  },
  walletContent: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  walletLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  walletLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    fontWeight: '600',
  },
  walletAmount: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -1,
  },
  walletSub: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  // ── Utility Grid Layout (Image Match) ──
  utilityGridLayout: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  libGridCard: {
    flex: 1,
    height: CARD_HEIGHT + 60,
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  stackGridCard: {
    flex: 1,
    height: CARD_HEIGHT + 60,
  },
  libTitleGrid: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    textAlign: 'center',
    marginBottom: 12,
  },
  // ── Swipeable Stack Foundation ──
  stackContainer: {
    height: CARD_HEIGHT + 102,
    position: 'relative',
    marginTop: -20, // Tightened gap with title
  },
  stackCard: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: CARD_HEIGHT,
    bottom: 0,
    borderRadius: 32,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  stackCardInner: {
    flex: 1,
    padding: 24,
  },
  stackHandle: {
    width: 32,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  stackHandleLight: {
    width: 32,
    height: 3,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  stackFab: {
    position: 'absolute',
    top: 24,
    right: 24,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  stackContentLeft: {
    flex: 1,
    justifyContent: 'center',
  },
  stackLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  stackBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  miniStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start', // THE FIX: Only wrap text
  },
  miniStatusText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  stackFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 10,
  },
  footerInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerInfoSeparator: {
    width: 1,
    height: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  footerInfoSeparatorDark: {
    width: 1,
    height: 10,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  cardDecorCircle: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    zIndex: -1,
  },
  stackLabelWhite: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  stackBigValue: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -1,
  },
  stackSubWhite: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontWeight: '600',
  },
  stackSubBlack: {
    color: 'rgba(0,0,0,0.6)',
    fontSize: 12,
    fontWeight: '600',
  },
  footerInfoSeparatorBlack: {
    width: 1,
    height: 12,
    backgroundColor: 'rgba(0,0,0,0.1)',
    marginHorizontal: 10,
  },
  // Library specific (In Stack)
  stackGlassIcon: {
    position: 'absolute',
    bottom: -10,
    right: -10,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    zIndex: 0,
    opacity: 0.6,
  },
  stackContentBottom: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: 4,
  },
  stackImageLabel: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  stackImageValue: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  stackValueRowImage: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  miniStatusBadgeImage: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  miniStatusTextImage: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  libIconWrapper: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  libIconBg: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  libBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FF3B30',
    borderWidth: 2,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  libBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
  },
  libTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#000',
    marginBottom: 16,
  },
  libActionBtn: {
    backgroundColor: '#000',
    paddingHorizontal: 36,
    paddingVertical: 12,
    borderRadius: 24,
  },
  libActionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  // Peeking layers
  stackPeekLayer: {
    flex: 1,
    paddingTop: 10,
    paddingHorizontal: 20,
  },
  stackPeekBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stackPeekText: {
    color: '#fff',
    fontSize: 13, // Larger for maximum visibility
    fontWeight: '900',
    opacity: 0.9,
  },
  stackDots: {
    flexDirection: 'column',
    justifyContent: 'center',
    gap: 8,
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 16,
    zIndex: 100,
  },
  stackDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  horizontalScroll: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  assignmentCardPremium: {
    width: 260,
    padding: 20,
    borderRadius: 28,
    borderWidth: 1,
    marginRight: 15,
    position: 'relative',
    overflow: 'hidden',
    justifyContent: 'space-between',
    minHeight: 180,
  },
  assignmentHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  typeIconBg: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  courseCol: {
    flex: 1,
  },
  courseCodeText: {
    fontSize: 16,
    fontWeight: '800',
  },
  typeLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  dueBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 15,
  },
  dueText: {
    fontSize: 12,
    fontWeight: '700',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 14,
    marginTop: 15,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
  assignmentGlow: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  announcementCard: {
    padding: 18,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 80,
  },
  assignmentCard: {
    width: 280,
    padding: 18,
    borderRadius: 24,
    borderWidth: 1,
    marginRight: 12,
    justifyContent: 'space-between',
    minHeight: 140,
  },
  updateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 20,
    marginBottom: 10,
    marginHorizontal: 0,
  },
  updateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  versionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  versionText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  updateTitle: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  updateSub: {
    fontSize: 11,
  },
  updateBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    minWidth: 100,
    alignItems: 'center',
  },
  updateBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 15,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileMenuContent: {
    width: '75%',
    borderRadius: 24,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  profileMenuHeader: {
    padding: 15,
    borderBottomWidth: 1,
    marginBottom: 5,
  },
  profileMenuTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F2F2F7',
  },
  menuItemText: {
    fontSize: 15,
    fontWeight: '600',
  },
  gridCardWrapper: {
    flex: 1,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    shadowColor: '#34C759',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 4,
  },
});
