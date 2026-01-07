// ============================================
// app/(app)/index.tsx - Home Screen
// ============================================

import { useRouter } from 'expo-router';
import { collection, getDocs, onSnapshot, query, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
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

export default function HomeScreen() {
  const router = useRouter();
  const { userData, partnerData, refreshUserData } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [weeklyScores, setWeeklyScores] = useState({ user: 0, partner: 0 });

  useEffect(() => {
    if (userData) {
      calculateWeeklyScores();
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
      calculateWeeklyScores();
    });

    return () => unsubscribe();
  }, [userData]);

  const calculateWeeklyScores = async () => {
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

      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.type === 'deed') {
          if (data.userId === currentUser.uid) {
            userScore += data.points;
          } else if (data.userId === userData?.partnerId) {
            partnerScore += data.points;
          }
        } else if (data.type === 'trigger') {
          // Triggers affect the target (partnerId in the report)
          if (data.targetId === currentUser.uid) {
            userScore += data.points; // negative points
          } else if (data.targetId === userData?.partnerId) {
            partnerScore += data.points; // negative points
          }
        }
      });

      setWeeklyScores({ user: userScore, partner: partnerScore });
    } catch (error) {
      console.error('Error calculating scores:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshUserData();
    await calculateWeeklyScores();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  // No partner linked
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
            <Text style={[styles.score, userScore > partnerScore && styles.scoreWinning]}>
              {userScore}
            </Text>
            <Text style={styles.scoreVS}>VS</Text>
            <Text style={[styles.score, partnerScore > userScore && styles.scoreWinning]}>
              {partnerScore}
            </Text>
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
  },
  scoreWinning: {
    color: COLORS.success,
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
});
