import React from 'react';
import { StyleSheet, View, Text, ScrollView, RefreshControl, TouchableOpacity, Dimensions, Platform, Image, Linking, Modal } from 'react-native';

// ... (other imports) ...
import { useScraper } from '../../context/ScraperContext';
import { useAuth } from '../../context/AuthContext';
import { LogOut, Bell, Clock, Award, ChevronRight, CheckCircle2, FileText, UploadCloud, GraduationCap } from 'lucide-react-native';
import { router } from 'expo-router';

const { width } = Dimensions.get('window');

export default function DashboardScreen() {
  const { data, isScraping, refreshData, dumpHtml } = useScraper();
  const { logout } = useAuth();

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
    if (!data.timetable) return null;
    
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const now = new Date();
    const currentDay = days[now.getDay()];
    const currentTimeStr = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
    
    const todayClasses = data.timetable[currentDay];
    if (!todayClasses || todayClasses.length === 0) return { status: 'no_classes' };

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

    const upcoming = todayClasses.filter((c: any) => {
      const startTime = parseTimeTo24h(c.time);
      return startTime ? startTime > currentTimeStr : false;
    });

    if (upcoming.length > 0) {
      upcoming.sort((a: any, b: any) => {
        const tA = parseTimeTo24h(a.time) || '';
        const tB = parseTimeTo24h(b.time) || '';
        return tA.localeCompare(tB);
      });
      const next = upcoming[0];
      const details = next.details || '';
      const subjectMatch = details.match(/C:([A-Z0-9]+)/i);
      const roomMatch = details.match(/R:\s*([A-Z0-9-]+)/i);
      const typeMatch = details.match(/^([^/]+)/);
      return {
        status: 'upcoming',
        time: next.time,
        subject: subjectMatch ? subjectMatch[1] : 'Class',
        room: roomMatch ? roomMatch[1] : 'TBA',
        type: typeMatch ? typeMatch[1].trim() : 'Lecture'
      };
    }
    return { status: 'finished' };
  };

  const nextClassInfo = getNextClass();

  const [showMessages, setShowMessages] = React.useState(false);

  const handleExamsPress = () => {
    router.push('/exams' as any);
  };

  return (
    <View style={{ flex: 1 }}>
    <ScrollView 
      style={styles.container}
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
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.welcomeText}>Welcome back,</Text>
            <Text style={styles.nameLarge}>{profile?.name?.split(' ')[0] || 'Student'}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity style={styles.notificationBtn} onPress={dumpHtml}>
              <Award size={20} color="#FF9500" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.notificationBtn} onPress={() => setShowMessages(true)}>
              <Bell size={20} color="#007AFF" />
              {data.messages && data.messages.length > 0 && (
                <View style={styles.notifBadge}>
                  <Text style={styles.notifText}>{data.messages.length}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
              <LogOut size={18} color="#FF3B30" />
            </TouchableOpacity>
          </View>
        </View>

        {profile && (
          <View style={styles.premiumProfileCard}>
            <View style={styles.profileRow}>
              <Image source={{ uri: profile.avatarUrl }} style={styles.avatarLarge} />
              <View style={styles.profileDetails}>
                <Text style={styles.fullName}>{profile.name}</Text>
                <View style={styles.badgeRow}>
                  <View style={styles.vidBadge}>
                    <Text style={styles.vidText}>{profile.vid}</Text>
                  </View>
                  <View style={styles.sectionBadge}>
                    <Text style={styles.sectionText}>{profile.section}</Text>
                  </View>
                </View>
                <Text style={styles.programText} numberOfLines={1}>{profile.program}</Text>
              </View>
            </View>
            <View style={styles.syncRow}>
              <View style={styles.statusDot} />
              <Text style={styles.syncText}>Last synced: Just now</Text>
            </View>
          </View>
        )}
      </View>

      <View style={styles.content}>
        {/* Simplified Fee Section */}
        <TouchableOpacity 
          style={styles.feeCard} 
          onPress={() => Linking.openURL('https://ums.lpu.in/lpuums/FeeManagement/frmStudentFeeDetail.aspx')}
          activeOpacity={0.8}
        >
          <View style={styles.feeInfo}>
            <View style={styles.feeIconBg}>
              <FileText size={24} color="#5856D6" />
            </View>
            <View>
              <Text style={styles.feeLabel}>Outstanding Fee</Text>
              <Text style={styles.feeValue}>₹ {data.fee || '0'}/-</Text>
            </View>
          </View>
          <View style={styles.payButton}>
            <Text style={styles.payButtonText}>View Details</Text>
            <ChevronRight size={16} color="#5856D6" />
          </View>
        </TouchableOpacity>
        
        {/* Grid and other sections same as before, but Announcements use data.announcements */}
        {/* ... */}
        
        {/* CGPA & Attendance Grid */}
        <View style={styles.gridContainer}>
          <TouchableOpacity 
            style={[styles.gridCard, { backgroundColor: '#007AFF' }]}
            onPress={() => router.push('/results')}
            activeOpacity={0.9}
          >
            <View style={styles.cardGlow} />
            <Award size={28} color="#fff" style={styles.cardIcon} />
            <Text style={styles.gridCardLabel}>Overall CGPA</Text>
            <Text style={styles.gridCardValue}>{data.cgpa || '--'}</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.gridCard, { backgroundColor: '#34C759' }]}
            onPress={() => router.push('/attendance')}
            activeOpacity={0.9}
          >
            <View style={styles.cardGlow} />
            <CheckCircle2 size={28} color="#fff" style={styles.cardIcon} />
            <Text style={styles.gridCardLabel}>Attendance</Text>
            <Text style={styles.gridCardValue}>{overallAttendance}%</Text>
          </TouchableOpacity>
        </View>

        {/* Upcoming Exams Button */}
        <TouchableOpacity style={styles.examsBanner} onPress={handleExamsPress} activeOpacity={0.8}>
          <View style={styles.examsBannerIcon}>
            <GraduationCap size={24} color="#fff" />
          </View>
          <View style={styles.examsBannerTextContainer}>
            <Text style={styles.examsBannerTitle}>Upcoming Exams</Text>
            <Text style={styles.examsBannerSubtitle}>View Conduct & Seating Plan</Text>
          </View>
          <ChevronRight size={20} color="#007AFF" />
        </TouchableOpacity>

        {/* Pending Assignments */}
        <Text style={styles.sectionTitle}>Pending Assignments</Text>
        {data.assignments && data.assignments.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
            {data.assignments.map((assignment, index) => (
              <View key={index} style={styles.assignmentCard}>
                <View style={{ flex: 1 }}>
                  <View style={styles.assignmentHeader}>
                    <FileText size={18} color="#FF9500" />
                    <Text style={styles.assignmentCourse} numberOfLines={1}>{assignment.courseCode}</Text>
                  </View>
                  <Text style={styles.assignmentType} numberOfLines={2}>{assignment.type}</Text>
                </View>
                
                <View style={styles.assignmentFooter}>
                  <Text style={styles.assignmentDate}>Last Date: {assignment.lastDate}</Text>
                  <TouchableOpacity 
                    style={styles.uploadButton}
                    onPress={() => Linking.openURL('https://ums.lpu.in/lpuums/frmstudentassignmentupload.aspx')}
                  >
                    <UploadCloud size={14} color="#007AFF" />
                    <Text style={styles.uploadButtonText}>Upload</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </ScrollView>
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No pending assignments.</Text>
          </View>
        )}

        {/* Next Class Widget */}
        <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Next Class</Text>
        {nextClassInfo.status === 'upcoming' ? (
          <View style={styles.nextClassCard}>
            <View style={styles.nextClassHeader}>
              <View style={styles.timeBadge}>
                <Clock size={14} color="#FF9500" />
                <Text style={styles.timeText}>{nextClassInfo.time}</Text>
              </View>
              <View style={[styles.roomBadge, { flexDirection: 'row', alignItems: 'center' }]}>
                <Text style={{ color: '#007AFF', fontSize: 10, fontWeight: 'bold' }}>Room: </Text>
                <Text style={styles.roomText}>{nextClassInfo.room}</Text>
              </View>
            </View>
            <Text style={styles.subjectText}>{nextClassInfo.subject}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
              <View style={{ backgroundColor: 'rgba(0,122,255,0.1)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 }}>
                <Text style={{ color: '#007AFF', fontSize: 11, fontWeight: '600' }}>{nextClassInfo.type}</Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <CheckCircle2 size={24} color="#34C759" style={{ marginBottom: 8 }} />
            <Text style={styles.emptyText}>
              {nextClassInfo.status === 'no_classes' ? 'No classes scheduled for today.' : 'All classes finished for today! 🎉'}
            </Text>
          </View>
        )}

        {/* Announcements */}
        <Text style={styles.sectionTitle}>Announcements</Text>
        <View style={styles.announcementContainer}>
          {data.announcements && data.announcements.length > 0 ? (
            data.announcements.slice(0, 10).map((item: any, index: number) => (
              <View key={item.id || index} style={styles.announcementCard}>
                <View style={[styles.announcementIndicator, { backgroundColor: item.type === 'urgent' ? '#FF3B30' : '#007AFF' }]} />
                <View style={styles.announcementContent}>
                  <Text style={styles.announcementTitle}>{item.title}</Text>
                  <Text style={styles.announcementDate}>{item.date}</Text>
                </View>
                <ChevronRight size={20} color="#C7C7CC" />
              </View>
            ))
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No new announcements.</Text>
            </View>
          )}
        </View>

      </View>
    </ScrollView>
      {/* Modal for My Messages */}
      <Modal visible={showMessages} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>My Messages</Text>
              <TouchableOpacity onPress={() => setShowMessages(false)} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.messagesList} showsVerticalScrollIndicator={false}>
              {data.messages && data.messages.length > 0 ? (
                data.messages.map((item, idx) => (
                  <View key={item.id || idx} style={styles.messageItem}>
                    <View style={styles.messageMarker} />
                    <View style={styles.messageBody}>
                      <Text style={styles.messageTitle}>{item.title}</Text>
                      <Text style={styles.messageDate}>{item.date}</Text>
                      <Text style={styles.messageContent}>{item.content}</Text>
                    </View>
                  </View>
                ))
              ) : (
                <View style={styles.emptyState}>
                  <Bell size={40} color="#CCC" />
                  <Text style={styles.emptyText}>No personal messages</Text>
                </View>
              )}
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
    backgroundColor: '#F2F2F7', // iOS System Background Color
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
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 30,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 3,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 25,
  },
  welcomeText: {
    color: '#8E8E93',
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  nameLarge: {
    color: '#000',
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -1,
  },
  notificationBtn: {
    backgroundColor: '#F2F2F7',
    padding: 12,
    borderRadius: 22,
    position: 'relative',
  },
  notifBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#FF3B30',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  notifText: {
    color: '#fff',
    fontSize: 10,
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
  nextClassCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
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
    backgroundColor: '#FFF2E5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  timeText: {
    color: '#FF9500',
    fontWeight: '600',
    fontSize: 13,
    marginLeft: 5,
  },
  roomBadge: {
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  roomText: {
    color: '#007AFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  subjectText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  typeText: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500',
  },
  announcementContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  announcementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  announcementIndicator: {
    width: 4,
    height: 40,
    borderRadius: 2,
    marginRight: 15,
  },
  announcementContent: {
    flex: 1,
  },
  announcementTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  announcementDate: {
    fontSize: 13,
    color: '#8E8E93',
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
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    height: '80%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  closeBtn: {
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 15,
  },
  closeBtnText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  messagesList: {
    flex: 1,
  },
  messageItem: {
    flexDirection: 'row',
    marginBottom: 15,
    backgroundColor: '#FAFAFA',
    borderRadius: 15,
    padding: 15,
    borderWidth: 1,
    borderColor: '#F2F2F7',
  },
  messageMarker: {
    width: 4,
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 2,
    marginRight: 12,
  },
  messageBody: {
    flex: 1,
  },
  messageTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  messageDate: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 8,
  },
  messageContent: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 40,
  },
  emptyText: {
    color: '#8E8E93',
    marginTop: 10,
    fontSize: 16,
  },
});
