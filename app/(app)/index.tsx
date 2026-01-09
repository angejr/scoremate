// ============================================
// app/(app)/index.tsx - Home Screen
// ============================================

import { useRouter } from 'expo-router';
import { collection, getDocs, onSnapshot, query, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { auth, db } from '../../firebase.config';
import { COLORS } from '../../utils/constants';
import { getWeekNumber } from '../../utils/helpers';

interface ReportItem {
  id: string;
  type: 'trigger' | 'deed';
  itemName: string;
  points: number;
  timestamp: Date;
  userId: string;
  targetId: string;
}

export default function HomeScreen() {
  const router = useRouter();
  const { userData, partnerData, refreshUserData } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [weeklyScores, setWeeklyScores] = useState({ user: 0, partner: 0 });
  const [weeklyReports, setWeeklyReports] = useState<ReportItem[]>([]);
  const [scoreSummaryVisible, setScoreSummaryVisible] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<'user' | 'partner'>('user');

  useEffect(() => {
    if (userData) {
      fetchWeeklyData();
      setLoading(false);
    }
    
    const currentWeek = getWeekNumber(new Date());
    const currentYear = new Date().getFullYear();
    const reportsRef = collection(db, 'reports');
    const q = query(
      reportsRef,
      where('weekNumber', '==', currentWeek),
      where('year', '==', currentYear)
    );

    const unsubscribe = onSnapshot(q, () => {
      fetchWeeklyData();
    });

    return () => unsubscribe();
  }, [userData]);

  const fetchWeeklyData = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;
      
      const currentWeek = getWeekNumber(new Date());
      const currentYear = new Date().getFullYear();
      
      const reportsRef = collection(db, 'reports');
      const q = query(
        reportsRef,
        where('weekNumber', '==', currentWeek),
        where('year', '==', currentYear)
      );

      const snapshot = await getDocs(q);
      
      let userScore = 0;
      let partnerScore = 0;
      const reports: ReportItem[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        const report: ReportItem = {
          id: doc.id,
          type: data.type,
          itemName: data.itemName,
          points: data.points,
          timestamp: data.timestamp?.toDate() || new Date(),
          userId: data.userId,
          targetId: data.targetId,
        };
        reports.push(report);

        if (data.type === 'deed') {
          if (data.userId === currentUser.uid) {
            userScore += data.points;
          } else if (data.userId === userData?.partnerId) {
            partnerScore += data.points;
          }
        } else if (data.type === 'trigger') {
          if (data.targetId === currentUser.uid) {
            userScore += data.points;
          } else if (data.targetId === userData?.partnerId) {
            partnerScore += data.points;
          }
        }
      });

      setWeeklyReports(reports);
      setWeeklyScores({ user: userScore, partner: partnerScore });
    } catch (error) {
      console.error('Error fetching weekly data:', error);
    }
  };

  const getReportsForPerson = (person: 'user' | 'partner') => {
    const currentUserId = auth.currentUser?.uid;
    const targetId = person === 'user' ? currentUserId : userData?.partnerId;
    
    return weeklyReports.filter(report => {
      if (report.type === 'deed') {
        return report.userId === targetId;
      } else {
        return report.targetId === targetId;
      }
    }).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  };

  const showScoreSummary = (person: 'user' | 'partner') => {
    setSelectedPerson(person);
    setScoreSummaryVisible(true);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshUserData();
    await fetchWeeklyData();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!userData?.partnerId) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>💔 SCOREMATE 💔</Text>
          <TouchableOpacity onPress={() => router.push('/settings')}>
            <Text style={styles.settingsIcon}>⚙️</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.noPartnerContainer}>
          <Text style={styles.noPartnerEmoji}>💑</Text>
          <Text style={styles.noPartnerTitle}>No Partner Linked</Text>
          <Text style={styles.noPartnerText}>
            Link your account with your partner to start tracking!
          </Text>
          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => router.push('/link-partner')}
          >
            <Text style={styles.linkButtonText}>Link Partner</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const userScore = weeklyScores.user;
  const partnerScore = weeklyScores.partner;
  const leader = userScore > partnerScore ? userData : userScore < partnerScore ? partnerData : null;
  const scoreDiff = Math.abs(userScore - partnerScore);
  const selectedReports = getReportsForPerson(selectedPerson);
  const selectedName = selectedPerson === 'user' ? 'You' : (partnerData?.name || 'Partner');
  const selectedScore = selectedPerson === 'user' ? userScore : partnerScore;

  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>💔 SCOREMATE 💔</Text>
          <TouchableOpacity onPress={() => router.push('/settings')}>
            <Text style={styles.settingsIcon}>⚙️</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.weekLabel}>Week {getWeekNumber(new Date())} • {new Date().getFullYear()}</Text>

        <View style={styles.leaderSection}>
          <Text style={styles.leaderLabel}>👑 CURRENT LEADER 👑</Text>
          <Text style={styles.leaderName}>{leader?.name || 'TIE'}</Text>
          {scoreDiff > 0 && (
            <Text style={styles.leaderDiff}>Leading by {scoreDiff} points</Text>
          )}
        </View>

        <View style={styles.scoreboard}>
          <View style={styles.scoreHeader}>
            <Text style={styles.scoreHeaderText}>YOU</Text>
            <Text style={styles.scoreHeaderText}>{partnerData?.name?.toUpperCase() || 'PARTNER'}</Text>
          </View>
          
          <View style={styles.scoreRow}>
            <TouchableOpacity onPress={() => showScoreSummary('user')}>
              <Text style={[styles.score, styles.scoreClickable, userScore > partnerScore && styles.scoreWinning]}>
                {userScore}
              </Text>
              <Text style={styles.tapHint}>Tap for details</Text>
            </TouchableOpacity>
            <Text style={styles.scoreVS}>VS</Text>
            <TouchableOpacity onPress={() => showScoreSummary('partner')}>
              <Text style={[styles.score, styles.scoreClickable, partnerScore > userScore && styles.scoreWinning]}>
                {partnerScore}
              </Text>
              <Text style={styles.tapHint}>Tap for details</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.buttonTrigger}
            onPress={() => router.push({ pathname: '/report', params: { type: 'trigger' } })}
          >
            <Text style={styles.buttonText}>😤 Report Partner's Mistake</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.buttonDeed}
            onPress={() => router.push({ pathname: '/report', params: { type: 'deed' } })}
          >
            <Text style={styles.buttonTextDark}>✨ Log Your Good Deed</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.buttonLeaderboard}
            onPress={() => router.push('/leaderboard')}
          >
            <Text style={styles.buttonTextBlue}>📊 Weekly Leaderboard</Text>
          </TouchableOpacity>

          {userData?.isPremium && (
            <TouchableOpacity
              style={styles.buttonCustom}
              onPress={() => router.push('/custom-items')}
            >
              <Text style={styles.buttonText}>✏️ Manage Custom Items</Text>
            </TouchableOpacity>
          )}

          {!userData?.isPremium && (
            <TouchableOpacity
              style={styles.buttonPremium}
              onPress={() => router.push('/premium')}
            >
              <Text style={styles.buttonTextDark}>⭐ Upgrade to Premium ($5)</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Score Summary Modal */}
      <Modal
        visible={scoreSummaryVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setScoreSummaryVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedPerson === 'user' ? '📊 Your Score Breakdown' : `📊 ${partnerData?.name}'s Score`}
              </Text>
              <TouchableOpacity onPress={() => setScoreSummaryVisible(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.totalScoreCard}>
              <Text style={styles.totalScoreLabel}>Total Score</Text>
              <Text style={[styles.totalScore, selectedScore >= 0 ? styles.scorePositive : styles.scoreNegative]}>
                {selectedScore >= 0 ? '+' : ''}{selectedScore}
              </Text>
            </View>

            {selectedReports.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyEmoji}>📭</Text>
                <Text style={styles.emptyText}>No activity this week</Text>
              </View>
            ) : (
              <FlatList
                data={selectedReports}
                keyExtractor={(item) => item.id}
                style={styles.reportsList}
                renderItem={({ item }) => (
                  <View style={styles.reportItem}>
                    <View style={styles.reportInfo}>
                      <Text style={styles.reportType}>
                        {item.type === 'deed' ? '✨' : '😤'} {item.itemName}
                      </Text>
                      <Text style={styles.reportDate}>
                        {item.timestamp.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </Text>
                    </View>
                    <Text style={[
                      styles.reportPoints,
                      item.points > 0 ? styles.pointsPositive : styles.pointsNegative
                    ]}>
                      {item.points > 0 ? '+' : ''}{item.points}
                    </Text>
                  </View>
                )}
              />
            )}

            <View style={styles.summaryStats}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {selectedReports.filter(r => r.type === 'deed').length}
                </Text>
                <Text style={styles.statLabel}>Good Deeds</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {selectedReports.filter(r => r.type === 'trigger').length}
                </Text>
                <Text style={styles.statLabel}>Mistakes</Text>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: COLORS.cardBackground,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  settingsIcon: {
    fontSize: 24,
  },
  weekLabel: {
    textAlign: 'center',
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 10,
  },
  leaderSection: {
    padding: 30,
    alignItems: 'center',
  },
  leaderLabel: {
    fontSize: 14,
    color: COLORS.textTertiary,
    marginBottom: 10,
  },
  leaderName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.secondary,
    marginBottom: 5,
  },
  leaderDiff: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  scoreboard: {
    marginHorizontal: 20,
    backgroundColor: COLORS.cardBackground,
    borderRadius: 15,
    padding: 20,
    borderWidth: 2,
    borderColor: COLORS.primary,
    marginBottom: 20,
  },
  scoreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  scoreHeaderText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  score: {
    fontSize: 48,
    fontWeight: 'bold',
    color: COLORS.error,
    textAlign: 'center',
  },
  scoreClickable: {
    textDecorationLine: 'underline',
  },
  scoreWinning: {
    color: COLORS.success,
  },
  tapHint: {
    fontSize: 10,
    color: COLORS.textTertiary,
    textAlign: 'center',
    marginTop: 5,
  },
  scoreVS: {
    fontSize: 24,
    color: COLORS.textTertiary,
  },
  actions: {
    padding: 20,
  },
  buttonTrigger: {
    backgroundColor: COLORS.primary,
    padding: 18,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  buttonDeed: {
    backgroundColor: COLORS.secondary,
    padding: 18,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  buttonLeaderboard: {
    backgroundColor: COLORS.cardBackground,
    padding: 18,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.secondary,
  },
  buttonCustom: {
    backgroundColor: COLORS.cardBackground,
    padding: 18,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.accent,
  },
  buttonPremium: {
    backgroundColor: COLORS.accent,
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: 'bold',
  },
  buttonTextDark: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
  },
  buttonTextBlue: {
    color: COLORS.secondary,
    fontSize: 18,
    fontWeight: 'bold',
  },
  noPartnerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  noPartnerEmoji: {
    fontSize: 80,
    marginBottom: 20,
  },
  noPartnerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 10,
  },
  noPartnerText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 30,
  },
  linkButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 10,
  },
  linkButtonText: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: 'bold',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.cardBackground,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  closeButton: {
    fontSize: 24,
    color: COLORS.textTertiary,
    padding: 5,
  },
  totalScoreCard: {
    backgroundColor: COLORS.background,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  totalScoreLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 5,
  },
  totalScore: {
    fontSize: 42,
    fontWeight: 'bold',
  },
  scorePositive: {
    color: COLORS.success,
  },
  scoreNegative: {
    color: COLORS.error,
  },
  reportsList: {
    maxHeight: 300,
  },
  reportItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: 15,
    borderRadius: 10,
    marginBottom: 8,
  },
  reportInfo: {
    flex: 1,
  },
  reportType: {
    fontSize: 16,
    color: COLORS.text,
    marginBottom: 3,
  },
  reportDate: {
    fontSize: 12,
    color: COLORS.textTertiary,
  },
  reportPoints: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  pointsPositive: {
    color: COLORS.success,
  },
  pointsNegative: {
    color: COLORS.error,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 10,
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: 16,
  },
  summaryStats: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 15,
    marginTop: 15,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 3,
  },
  statDivider: {
    width: 1,
    backgroundColor: COLORS.textTertiary,
    marginHorizontal: 15,
  },
});
