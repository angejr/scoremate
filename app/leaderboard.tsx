// ============================================
// app/leaderboard.tsx - Leaderboard Screen
// ============================================

import { collection, getDocs } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { auth, db } from '../firebase.config';
import { WeeklyData, WeeklyStats } from '../types';
import { COLORS } from '../utils/constants';
import { getWeekNumber } from '../utils/helpers';

export default function LeaderboardScreen() {
  const { userData, partnerData } = useAuth();
  const [weeks, setWeeks] = useState<WeeklyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<WeeklyStats>({ userWins: 0, partnerWins: 0 });

  useEffect(() => {
    loadWeeklyData();
  }, []);

  const loadWeeklyData = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const reportsRef = collection(db, 'reports');
      const snapshot = await getDocs(reportsRef);
      
      const weeklyData: { [key: string]: WeeklyData } = {};
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        const weekKey = `${data.year}-W${data.weekNumber}`;
        
        if (!weeklyData[weekKey]) {
          weeklyData[weekKey] = {
            week: data.weekNumber,
            year: data.year,
            userScore: 0,
            partnerScore: 0,
          };
        }

        if (data.type === 'deed') {
          if (data.userId === currentUser.uid) {
            weeklyData[weekKey].userScore += data.points;
          } else if (data.userId === userData?.partnerId) {
            weeklyData[weekKey].partnerScore += data.points;
          }
        } else if (data.type === 'trigger') {
          if (data.targetId === currentUser.uid) {
            weeklyData[weekKey].userScore += data.points;
          } else if (data.targetId === userData?.partnerId) {
            weeklyData[weekKey].partnerScore += data.points;
          }
        }
      });

      const weeksArray: WeeklyData[] = Object.values(weeklyData)
        .sort((a, b) => {
          if (b.year !== a.year) return b.year - a.year;
          return b.week - a.week;
        })
        .map(week => ({
          ...week,
          winner: week.userScore > week.partnerScore ? 'You' : 
                  week.partnerScore > week.userScore ? 'Partner' : 'Tie'
        }));

      const userWins = weeksArray.filter(w => w.winner === 'You').length;
      const partnerWins = weeksArray.filter(w => w.winner === 'Partner').length;

      setWeeks(weeksArray);
      setStats({ userWins, partnerWins });
    } catch (error) {
      console.error('Error loading weekly data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const currentWeek = getWeekNumber(new Date());
  const currentYear = new Date().getFullYear();
  const overallChampion = stats.userWins > stats.partnerWins ? 'You' :
                          stats.partnerWins > stats.userWins ? (partnerData?.name || 'Partner') : 'Tied';

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.userWins}</Text>
            <Text style={styles.statLabel}>Your Wins</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.partnerWins}</Text>
            <Text style={styles.statLabel}>Partner Wins</Text>
          </View>
        </View>

        {overallChampion !== 'Tied' && (
          <View style={styles.championCard}>
            <Text style={styles.championEmoji}>🏆</Text>
            <Text style={styles.championTitle}>Overall Champion</Text>
            <Text style={styles.championName}>{overallChampion}</Text>
          </View>
        )}

        <View style={styles.historyContainer}>
          <Text style={styles.historyTitle}>Weekly History</Text>
          
          {weeks.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>📊</Text>
              <Text style={styles.emptyText}>No weekly data yet!</Text>
              <Text style={styles.emptySubtext}>Start tracking to see your history</Text>
            </View>
          ) : (
            weeks.map((week) => (
              <View
                key={`${week.year}-${week.week}`}
                style={[
                  styles.weekCard,
                  week.week === currentWeek && week.year === currentYear && styles.weekCardCurrent
                ]}
              >
                <View style={styles.weekHeader}>
                  <Text style={styles.weekLabel}>
                    Week {week.week}, {week.year} {week.week === currentWeek && week.year === currentYear && '(Current)'}
                  </Text>
                  {week.winner !== 'Tie' && (
                    <View style={styles.winnerBadge}>
                      <Text style={styles.winnerEmoji}>👑</Text>
                      <Text style={styles.winnerText}>{week.winner}</Text>
                    </View>
                  )}
                </View>
                
                <View style={styles.weekScores}>
                  <View style={styles.scoreColumn}>
                    <Text style={styles.scoreLabel}>You</Text>
                    <Text style={[
                      styles.scoreValue,
                      week.userScore > week.partnerScore && styles.scoreValueWinning
                    ]}>
                      {week.userScore}
                    </Text>
                  </View>
                  
                  <Text style={styles.scoreVS}>VS</Text>
                  
                  <View style={styles.scoreColumn}>
                    <Text style={styles.scoreLabel}>{partnerData?.name || 'Partner'}</Text>
                    <Text style={[
                      styles.scoreValue,
                      week.partnerScore > week.userScore && styles.scoreValueWinning
                    ]}>
                      {week.partnerScore}
                    </Text>
                  </View>
                </View>

                {week.winner !== 'Tie' && (
                  <Text style={styles.weekMargin}>
                    Won by {Math.abs(week.userScore - week.partnerScore)} points
                  </Text>
                )}
              </View>
            ))
          )}
        </View>
      </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 20,
    backgroundColor: COLORS.cardBackground,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 48,
    fontWeight: 'bold',
    color: COLORS.secondary,
  },
  statLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 5,
  },
  statDivider: {
    width: 1,
    backgroundColor: COLORS.textTertiary,
    marginHorizontal: 20,
  },
  championCard: {
    backgroundColor: COLORS.cardBackground,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 15,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.accent,
  },
  championEmoji: {
    fontSize: 48,
    marginBottom: 10,
  },
  championTitle: {
    fontSize: 16,
    color: COLORS.accent,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  championName: {
    fontSize: 24,
    color: COLORS.text,
    fontWeight: 'bold',
  },
  historyContainer: {
    padding: 20,
  },
  historyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 15,
  },
  weekCard: {
    backgroundColor: COLORS.cardBackground,
    padding: 20,
    borderRadius: 15,
    marginBottom: 15,
  },
  weekCardCurrent: {
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  weekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  weekLabel: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  winnerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${COLORS.accent}20`,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  winnerEmoji: {
    fontSize: 16,
    marginRight: 5,
  },
  winnerText: {
    color: COLORS.accent,
    fontSize: 14,
    fontWeight: 'bold',
  },
  weekScores: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  scoreColumn: {
    flex: 1,
    alignItems: 'center',
  },
  scoreLabel: {
    color: COLORS.textSecondary,
    fontSize: 14,
    marginBottom: 5,
  },
  scoreValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.textTertiary,
  },
  scoreValueWinning: {
    color: COLORS.success,
  },
  scoreVS: {
    fontSize: 20,
    color: COLORS.textTertiary,
    marginHorizontal: 20,
  },
  weekMargin: {
    textAlign: 'center',
    color: COLORS.textTertiary,
    fontSize: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 15,
  },
  emptyText: {
    fontSize: 18,
    color: COLORS.text,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textTertiary,
  },
});
