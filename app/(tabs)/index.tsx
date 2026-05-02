import React from 'react';
import { StyleSheet, View, Text, ScrollView, RefreshControl, TouchableOpacity, Dimensions, Platform, Image, Modal, ActivityIndicator } from 'react-native';
import Animated, { FadeInDown, FadeInUp, Layout } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';

// ... (other imports) ...
import { useScraper } from '../../context/ScraperContext';
import { useAuth } from '../../context/AuthContext';
import { LogOut, Bell, Clock, Award, ChevronRight, CheckCircle2, FileText, UploadCloud, GraduationCap, Moon, Sun, User, Lock, Wifi, UserCheck, Tag, MapPin, Coffee } from 'lucide-react-native';
import { useTheme, Typography } from '../../context/ThemeContext';
import { router } from 'expo-router';
import * as Updates from 'expo-updates';
import * as Linking from 'expo-linking';
import Constants from 'expo-constants';
import { updateStickyClassNotification } from '../../utils/notifications';

const { width } = Dimensions.get('window');

export default function DashboardScreen() {
  const { data, isScraping, refreshData, dumpHtml } = useScraper();
  const { logout } = useAuth();
  const { colors, isDark, toggleTheme } = useTheme();

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
    const t = title.toLowerCase();
    if (t.includes('result') || t.includes('mark') || t.includes('grade')) 
      return { color: '#34C759', label: 'ACADEMIC', icon: GraduationCap };
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

  const userColor = getUserColor(profile?.vid || '');
  
  React.useEffect(() => {
    async function syncNotifications() {
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
    if (!data.exams || data.exams.length === 0) return null;
    const now = new Date();
    // Reset time for date-only comparison
    now.setHours(0, 0, 0, 0);
    const futureExams = data.exams.filter((ex: any) => {
      const exDate = new Date(ex.date);
      return exDate >= now;
    });
    if (futureExams.length === 0) return null;
    futureExams.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return futureExams[0];
  })();

  const [showMessages, setShowMessages] = React.useState(false);
  const [expandedMessageIdx, setExpandedMessageIdx] = React.useState<number | null>(null);
  const [showProfileMenu, setShowProfileMenu] = React.useState(false);
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [updateAvailable, setUpdateAvailable] = React.useState(false);
  const version = Constants.expoConfig?.version || '1.0.0';

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
              style={[styles.headerIconBtn]} 
              onPress={toggleTheme}
            >
              {isDark ? <Sun size={22} color={colors.warning} /> : <Moon size={22} color={colors.primary} />}
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
          <View style={[styles.premiumProfileCard, { backgroundColor: isDark ? '#2C2C2E' : '#FAFAFA', borderColor: colors.border }]}>
            <View style={styles.profileRow}>
              <TouchableOpacity onPress={() => setShowProfileMenu(true)} activeOpacity={0.7}>
                <Image source={{ uri: profile.avatarUrl }} style={styles.avatarLarge} />
                <View style={[styles.editBadge, { backgroundColor: userColor }]}>
                  <User size={10} color="#fff" />
                </View>
              </TouchableOpacity>
              <View style={styles.profileDetails}>
                <Text style={[styles.fullName, { color: colors.text }]}>{profile.name}</Text>
                <View style={styles.badgeRow}>
                  <View style={[styles.vidBadge, { backgroundColor: isDark ? 'rgba(10,132,255,0.15)' : '#E5F1FF' }]}>
                    <Text style={[styles.vidText, { color: colors.primary }]}>{profile.vid}</Text>
                  </View>
                  <View style={[styles.sectionBadge, { backgroundColor: isDark ? colors.surface : '#F2F2F7' }]}>
                    <Text style={[styles.sectionText, { color: colors.text }]}>{profile.section}</Text>
                  </View>
                  {profile.rollNo && (
                    <View style={[styles.rollBadge, { backgroundColor: isDark ? 'rgba(255,149,0,0.15)' : '#FFF9E5' }]}>
                      <Text style={[styles.rollText, { color: colors.warning }]}>Roll: {profile.rollNo}</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.programText, { color: colors.textSecondary }]} numberOfLines={2}>{profile.program}</Text>
              </View>
            </View>
            <View style={[styles.syncRow, { borderTopColor: colors.border }]}>
              <View style={styles.statusDot} />
              <Text style={styles.syncText}>
                Last synced: {data.lastUpdated ? new Date(data.lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Never'}
              </Text>
            </View>
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
            style={[styles.gridCard, { backgroundColor: userColor }]}
            onPress={() => router.push('/results')}
            activeOpacity={0.9}
          >
            <View style={styles.cardGlow} />
            <View style={styles.cardHeader}>
              <Award size={20} color="rgba(255,255,255,0.8)" />
              <Text style={styles.gridCardLabel}>Academic Performance</Text>
            </View>
            <View style={styles.valueContainer}>
              <Text style={styles.gridCardValue}>{data.cgpa || '0.00'}</Text>
              <View style={styles.glassBadge}>
                <Text style={styles.glassBadgeText}>CGPA</Text>
              </View>
            </View>
            <View style={styles.cardFooter}>
              <View style={[styles.miniProgress, { width: '85%', backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                <View style={[styles.miniProgressBar, { width: `${(parseFloat(data.cgpa || '0') / 10) * 100}%`, backgroundColor: '#fff' }]} />
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.gridCard, { backgroundColor: '#34C759' }]} // Vibrant Green standard for Attendance
            onPress={() => router.push('/attendance')}
            activeOpacity={0.9}
          >
            <View style={styles.cardGlow} />
            <View style={styles.cardHeader}>
              <CheckCircle2 size={20} color="rgba(255,255,255,0.8)" />
              <Text style={styles.gridCardLabel}>Class Attendance</Text>
            </View>
            <View style={styles.valueContainer}>
              <Text style={styles.gridCardValue}>{overallAttendance}%</Text>
              <View style={styles.glassBadge}>
                <Text style={styles.glassBadgeText}>TOTAL</Text>
              </View>
            </View>
            <View style={styles.cardFooter}>
              <View style={[styles.miniProgress, { width: '85%', backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                <View style={[styles.miniProgressBar, { width: `${overallAttendance}%`, backgroundColor: '#fff' }]} />
              </View>
            </View>
          </TouchableOpacity>
        </Animated.View>

        {/* Next Class Widget - ANIMATED */}
        <Animated.View entering={FadeInDown.delay(400).duration(600).springify()}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Next Class</Text>
          {nextClassInfo.status === 'upcoming' ? (
            <View style={[styles.nextClassCard, { 
              backgroundColor: isDark ? 'rgba(10,132,255,0.12)' : 'rgba(0,122,255,0.08)', 
              borderColor: isDark ? 'rgba(10,132,255,0.2)' : 'rgba(0,122,255,0.1)' 
            }]}>
              <View style={styles.nextClassHeader}>
                <View style={[styles.timeBadge, { backgroundColor: isDark ? 'rgba(255,159,10,0.1)' : 'rgba(255,149,0,0.1)' }]}>
                  <Clock size={12} color={colors.warning} />
                  <Text style={[styles.timeText, { color: colors.warning }]}>{nextClassInfo.time}</Text>
                </View>
                <View style={[styles.typeBadgeWidget, { backgroundColor: isDark ? 'rgba(52,199,89,0.1)' : 'rgba(46,125,50,0.1)' }]}>
                  <Text style={[styles.typeTextWidget, { color: isDark ? '#34C759' : '#2E7D32' }]}>{nextClassInfo.type.toUpperCase()}</Text>
                </View>
              </View>
              
              <Text style={[styles.subjectText, { color: colors.text }]} numberOfLines={2}>{nextClassInfo.subject}</Text>
              
              <View style={styles.nextClassFooter}>
                <View style={styles.footerItem}>
                  <Tag size={12} color={colors.textSecondary} />
                  <Text style={[styles.footerText, { color: colors.textSecondary }]}>{nextClassInfo.subjectCode}</Text>
                </View>
                <View style={[styles.footerDivider, { backgroundColor: colors.border }]} />
                <View style={styles.footerItem}>
                  <MapPin size={12} color={colors.textSecondary} />
                  <Text style={[styles.footerText, { color: colors.textSecondary }]}>{nextClassInfo.room}</Text>
                </View>
              </View>
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

        {/* Utilities Section - ANIMATED */}
        <Animated.View entering={FadeInDown.delay(600).duration(600).springify()}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Utilities</Text>
          
          {/* Fee Card */}
          <TouchableOpacity 
            style={[styles.feeCard, { 
              backgroundColor: isDark ? 'rgba(88,86,214,0.12)' : 'rgba(88,86,214,0.08)', 
              borderColor: isDark ? 'rgba(88,86,214,0.2)' : 'rgba(88,86,214,0.1)' 
            }]} 
            onPress={() => router.push('/fees' as any)}
            activeOpacity={0.8}
          >
            <View style={styles.feeInfo}>
              <View style={[styles.feeIconBg, { backgroundColor: isDark ? 'rgba(88,86,214,0.1)' : '#F2F2F7' }]}>
                <FileText size={24} color={colors.secondary} />
              </View>
              <View>
                <Text style={[styles.feeLabel, { color: colors.textSecondary }]}>Outstanding Fee</Text>
                <Text style={[styles.feeValue, { color: colors.text }]}>₹ {data.fee || '0'}/-</Text>
              </View>
            </View>
            <View style={[styles.payButton, { backgroundColor: isDark ? 'rgba(88,86,214,0.15)' : '#F2F2F7' }]}>
              <Text style={[styles.payButtonText, { color: colors.secondary }]}>View Details</Text>
              <ChevronRight size={16} color={colors.secondary} />
            </View>
          </TouchableOpacity>

          {/* Exams Banner */}
          <TouchableOpacity 
            style={[styles.examsBanner, { 
              backgroundColor: isDark ? 'rgba(255,59,48,0.12)' : 'rgba(255,59,48,0.08)', 
              borderColor: isDark ? 'rgba(255,59,48,0.2)' : 'rgba(255,59,48,0.1)',
              marginTop: 12 
            }]} 
            onPress={handleExamsPress} 
            activeOpacity={0.8}
          >
            <View style={[styles.examsBannerIcon, { backgroundColor: nextExam ? colors.error : colors.primary }]}>
              <GraduationCap size={24} color="#fff" />
            </View>
            <View style={styles.examsBannerTextContainer}>
              <Text style={[styles.examsBannerTitle, { color: colors.text }]}>
                {nextExam ? `Next Exam: ${nextExam.date}` : 'Upcoming Exams'}
              </Text>
              <Text style={[styles.examsBannerSubtitle, { color: colors.textSecondary }]}>
                {nextExam ? `${nextExam.subjectCode} - ${nextExam.room}` : 'View Conduct & Seating Plan'}
              </Text>
            </View>
            <ChevronRight size={20} color={isDark ? colors.textSecondary : colors.primary} />
          </TouchableOpacity>
        </Animated.View>

        {/* Pending Assignments */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Pending Assignments</Text>
        {data.assignments && data.assignments.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
            {data.assignments.map((assignment, index) => {
              const isPractical = assignment.type?.toLowerCase().includes('practical');
              const isCA = assignment.type?.toLowerCase().includes('ca') || assignment.type?.toLowerCase().includes('continuous');
              
              return (
                <View key={index} style={[styles.assignmentCardPremium, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={styles.assignmentHeaderRow}>
                    <View style={[styles.typeIconBg, { backgroundColor: isPractical ? '#FF950015' : isCA ? '#5856D615' : '#007AFF15' }]}>
                      {isPractical ? (
                        <Lock size={16} color="#FF9500" />
                      ) : isCA ? (
                        <Award size={16} color="#5856D6" />
                      ) : (
                        <FileText size={16} color="#007AFF" />
                      )}
                    </View>
                    <View style={styles.courseCol}>
                      <Text style={[styles.courseCodeText, { color: colors.text }]}>{assignment.courseCode}</Text>
                      <Text style={[styles.typeLabel, { color: colors.textSecondary }]}>{assignment.type}</Text>
                    </View>
                  </View>

                  <View style={[styles.dueBadge, { backgroundColor: colors.surface }]}>
                    <Clock size={12} color={colors.error} />
                    <Text style={[styles.dueText, { color: colors.text }]}>Due: {assignment.lastDate}</Text>
                  </View>

                  <TouchableOpacity 
                    style={[styles.submitBtn, { backgroundColor: colors.primary }]}
                    onPress={() => router.push('/assignments_upload' as any)}
                  >
                    <Text style={styles.submitBtnText}>Submit Task</Text>
                    <ChevronRight size={14} color="#fff" />
                  </TouchableOpacity>

                  <View style={[styles.assignmentGlow, { backgroundColor: isPractical ? '#FF950010' : '#007AFF10' }]} />
                </View>
              );
            })}
          </ScrollView>
        ) : (
          <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No pending assignments.</Text>
          </View>
        )}

        {/* Announcements */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Announcements</Text>
        <View style={[styles.announcementContainer, { 
          backgroundColor: isDark ? 'rgba(142,142,147,0.08)' : 'rgba(142,142,147,0.04)', 
          borderColor: isDark ? 'rgba(142,142,147,0.2)' : 'rgba(142,142,147,0.1)' 
        }]}>
          {data.announcements && data.announcements.length > 0 ? (
            data.announcements.slice(0, 10).map((item: any, index: number) => (
              <TouchableOpacity key={item.id || index} style={[styles.announcementCard, { borderBottomColor: colors.border }]}>
                <View style={styles.announcementInner}>
                  <View style={[styles.announcementIndicator, { backgroundColor: colors.primary }]} />
                  <View style={styles.announcementContent}>
                    <Text style={[styles.announcementTitle, { color: colors.text }]} numberOfLines={3}>{item.title}</Text>
                    <Text style={[styles.announcementDate, { color: colors.textSecondary }]}>{item.date}</Text>
                  </View>
                </View>
                <ChevronRight size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            ))
          ) : (
            <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No new announcements.</Text>
            </View>
          )}
          {/* Update Manager */}
        <View style={[styles.updateCard, { backgroundColor: isDark ? 'rgba(10,132,255,0.05)' : '#F0F7FF', borderColor: colors.primary + '30', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }]}>
          <View style={[styles.updateInfo, { marginBottom: 15, flexDirection: 'column', alignItems: 'center' }]}>
            <View style={[styles.versionBadge, { backgroundColor: colors.primary, marginBottom: 8 }]}>
              <Text style={styles.versionText}>v{version}</Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text style={[styles.updateTitle, { color: colors.text, textAlign: 'center' }]}>
                {updateAvailable ? 'New Update Ready! 🚀' : 'App is up to date'}
              </Text>
              <Text style={[styles.updateSub, { color: colors.textSecondary, textAlign: 'center' }]}>
                {updateAvailable ? 'Restart to apply fixes' : 'Check GitHub for releases'}
              </Text>
            </View>
          </View>
          
          <View style={{ flexDirection: 'row', gap: 10, width: '100%', paddingHorizontal: 10 }}>
            <TouchableOpacity 
              onPress={updateAvailable ? handleUpdate : forceUpdate}
              style={[styles.updateBtn, { backgroundColor: colors.primary, flex: 1, opacity: isUpdating ? 0.7 : 1 }]}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.updateBtnText}>
                  {updateAvailable ? 'Update Now' : 'Check Updates'}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => Linking.openURL('https://github.com/Ashishshankar26/ALMS/releases')}
              style={[styles.updateBtn, { backgroundColor: 'transparent', borderColor: colors.primary, borderWidth: 1, flex: 1 }]}
            >
              <Text style={[styles.updateBtnText, { color: colors.primary }]}>
                Download APK
              </Text>
            </TouchableOpacity>
          </View>
        </View>

      </View>

      </View>
    </ScrollView>
      {/* Modal for My Messages - ENHANCED */}
      <Modal visible={showMessages} animationType="slide" transparent={true}>
        <View style={[styles.modalOverlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.6)' }]}>
          <BlurView intensity={20} style={StyleSheet.absoluteFill} tint={isDark ? 'dark' : 'light'} />
          
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHandle} />
            
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>My Messages</Text>
                <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>University Announcements</Text>
              </View>
              <TouchableOpacity onPress={() => setShowMessages(false)} style={[styles.closeBtnCompact, { backgroundColor: colors.primary + '15' }]}>
                <Text style={[styles.closeBtnTextCompact, { color: colors.primary }]}>Done</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.messagesList} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 50, paddingHorizontal: 20 }}>
              {data.messages && data.messages.length > 0 ? (
                data.messages.map((item, idx) => {
                  const isExpanded = expandedMessageIdx === idx;
                  const config = getMessageConfig(item.title);
                  const Icon = config.icon;
                  
                  return (
                    <Animated.View 
                      key={item.id || idx} 
                      layout={Layout.springify()}
                      entering={FadeInDown.delay(idx * 50)}
                    >
                      <TouchableOpacity 
                        onPress={() => setExpandedMessageIdx(isExpanded ? null : idx)}
                        activeOpacity={0.8}
                        style={[styles.messageCardEnhanced, { 
                          backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#fff', 
                          borderColor: isExpanded ? config.color + '40' : colors.border,
                        }]}
                      >
                        <View style={styles.messageHeaderRow}>
                          <View style={[styles.categoryIconBg, { backgroundColor: config.color + '15' }]}>
                            <Icon size={14} color={config.color} />
                          </View>
                          
                          <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                              <Text style={[styles.categoryBadgeText, { color: config.color }]}>{config.label}</Text>
                              <View style={[styles.messageIndicatorGlow, { backgroundColor: config.color }]} />
                            </View>
                            <Text style={[styles.messageTitleEnhanced, { color: colors.text }]} numberOfLines={isExpanded ? undefined : 1}>
                              {item.title}
                            </Text>
                          </View>
                          
                          <View style={[styles.expandIconCircle, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F2F2F7' }]}>
                            <ChevronRight 
                              size={12} 
                              color={colors.primary} 
                              style={{ transform: [{ rotate: isExpanded ? '90deg' : '0deg' }] }} 
                            />
                          </View>
                        </View>
                        
                        {(isExpanded || item.content) && (
                          <Animated.View entering={FadeInUp.duration(300)}>
                            <Text 
                              style={[styles.messageContentEnhanced, { 
                                color: isDark ? colors.textSecondary : '#444',
                              }]}
                              numberOfLines={isExpanded ? undefined : 2}
                            >
                              {item.content}
                            </Text>
                          </Animated.View>
                        )}
                      </TouchableOpacity>
                    </Animated.View>
                  );
                })
              ) : (
                <View style={styles.emptyStateCompact}>
                  <View style={[styles.emptyIconBg, { backgroundColor: colors.primary + '10' }]}>
                    <Bell size={32} color={colors.primary} />
                  </View>
                  <Text style={[styles.emptyTextCompact, { color: colors.textSecondary }]}>No new messages for you</Text>
                </View>
              )}
            </ScrollView>
          </View>
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
    borderRadius: 28,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F2F2F7',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 2,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 18,
    borderWidth: 4,
    borderColor: '#fff',
  },
  profileDetails: {
    flex: 1,
  },
  fullName: {
    color: '#000',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  vidBadge: {
    backgroundColor: '#E5F1FF',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  sectionBadge: {
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
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
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  syncRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 15,
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
});
