
// ============================================
// screens/HomeScreen.js
// ============================================

import { collection, doc, getDoc, getDocs, onSnapshot, query, where } from 'firebase/firestore';
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
import { auth, db } from '../firebase.config';
import { getWeekNumber } from '../utils/helpers';

export default function HomeScreen({ navigation } : any) {
  const [userData, setUserData] = useState(null);
  const [partnerData, setPartnerData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [weeklyScores, setWeeklyScores] = useState({ user: 0, partner: 0 });

  useEffect(() => {
    fetchUserData();
    
    const currentWeek = getWeekNumber(new Date());
    const reportsRef = collection(db, 'reports');
    const q = query(
      reportsRef,
      where('weekNumber', '==', currentWeek)
    );

    const unsubscribe = onSnapshot(q, () => {
      calculateWeeklyScores();
    });

    return () => unsubscribe();
  }, []);

  const fetchUserData = async () => {
    try {
      const currentUser = auth.currentUser;


      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      
      if (userDoc.exists()) {
        const data = userDoc.data();
        setUserData({ id: currentUser?.uid, ...data });

        if (data.partnerId) {
          const partnerDoc = await getDoc(doc(db, 'users', data.partnerId));
          if (partnerDoc.exists()) {
            setPartnerData({ id: data.partnerId, ...partnerDoc.data() });
          }
        }
      }

      await calculateWeeklyScores();
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateWeeklyScores = async () => {
    try {
      const currentUser = auth.currentUser;
      const currentWeek = getWeekNumber(new Date());
      
      const reportsRef = collection(db, 'reports');
      const q = query(
        reportsRef,
        where('weekNumber', '==', currentWeek)
      );

      const snapshot = await getDocs(q);
      
      let userScore = 0;
      let partnerScore = 0;

      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.type === 'deed') {
          if (data.userId === currentUser.uid) {
            userScore += data.points;
          } else {
            partnerScore += data.points;
          }
        } else if (data.type === 'trigger') {
          if (data.partnerId === currentUser.uid) {
            userScore += data.points;
          } else {
            partnerScore += data.points;
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
    await fetchUserData();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#e94560" />
      </View>
    );
  }

  if (!userData?.partnerId) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>💔 SCOREMATE 💔</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Settings')}>
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
            onPress={() => navigation.navigate('LinkPartner')}
          >
            <Text style={styles.linkButtonText}>Link Partner</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const userScore = weeklyScores.user;
  const partnerScore = weeklyScores.partner;
  const leader = userScore > partnerScore ? userData : partnerData;
  const scoreDiff = Math.abs(userScore - partnerScore);

  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#e94560" />
        }
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>💔 SCOREMATE 💔</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Settings')}>
            <Text style={styles.settingsIcon}>⚙️</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.weekLabel}>Week {getWeekNumber(new Date())} • 2024</Text>

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
            <Text style={styles.scoreHeaderText}>{partnerData?.name.toUpperCase()}</Text>
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
            onPress={() => navigation.navigate('Report', { type: 'trigger' })}
          >
            <Text style={styles.buttonText}>😤 Report Partner's Mistake</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.buttonDeed}
            onPress={() => navigation.navigate('Report', { type: 'deed' })}
          >
            <Text style={styles.buttonTextDark}>✨ Log Your Good Deed</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.buttonLeaderboard}
            onPress={() => navigation.navigate('Leaderboard')}
          >
            <Text style={styles.buttonTextBlue}>📊 Weekly Leaderboard</Text>
          </TouchableOpacity>

          {!userData?.isPremium && (
            <TouchableOpacity
              style={styles.buttonPremium}
              onPress={() => navigation.navigate('Premium')}
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
    backgroundColor: '#1a1a2e',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 20,
    backgroundColor: '#16213e',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#e94560',
  },
  settingsIcon: {
    fontSize: 24,
  },
  weekLabel: {
    textAlign: 'center',
    color: '#aaa',
    fontSize: 12,
    marginTop: 10,
  },
  leaderSection: {
    padding: 30,
    alignItems: 'center',
  },
  leaderLabel: {
    fontSize: 14,
    color: '#888',
    marginBottom: 10,
  },
  leaderName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#00d9ff',
    marginBottom: 5,
  },
  leaderDiff: {
    fontSize: 16,
    color: '#aaa',
  },
  scoreboard: {
    marginHorizontal: 20,
    backgroundColor: '#16213e',
    borderRadius: 15,
    padding: 20,
    borderWidth: 2,
    borderColor: '#e94560',
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
    color: '#fff',
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  score: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#ff6b6b',
  },
  scoreWinning: {
    color: '#00ff88',
  },
  scoreVS: {
    fontSize: 24,
    color: '#666',
  },
  actions: {
    padding: 20,
  },
  buttonTrigger: {
    backgroundColor: '#e94560',
    padding: 18,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  buttonDeed: {
    backgroundColor: '#00d9ff',
    padding: 18,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  buttonLeaderboard: {
    backgroundColor: '#16213e',
    padding: 18,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#00d9ff',
  },
  buttonPremium: {
    backgroundColor: '#ffd700',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  buttonTextDark: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
  },
  buttonTextBlue: {
    color: '#00d9ff',
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
    color: '#fff',
    marginBottom: 10,
  },
  noPartnerText: {
    fontSize: 16,
    color: '#aaa',
    textAlign: 'center',
    marginBottom: 30,
  },
  linkButton: {
    backgroundColor: '#e94560',
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 10,
  },
  linkButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});