// ============================================
// screens/SettingsScreen.js
// ============================================

import { signOut } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { auth, db } from '../firebase.config';

export default function SettingsScreen({ navigation }) {
  const [userData, setUserData] = useState(null);
  const [notifications, setNotifications] = useState(true);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
      if (userDoc.exists()) {
        setUserData(userDoc.data());
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut(auth);
            } catch (error) {
              console.error('Error signing out:', error);
              Alert.alert('Error', 'Failed to sign out');
            }
          }
        }
      ]
    );
  };

  const handleUnlinkPartner = () => {
    Alert.alert(
      'Unlink Partner',
      'Are you sure? This will remove the link between you and your partner.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unlink',
          style: 'destructive',
          onPress: async () => {
            try {
              const currentUserId = auth.currentUser.uid;
              const partnerId = userData.partnerId;

              await Promise.all([
                updateDoc(doc(db, 'users', currentUserId), {
                  partnerId: null,
                }),
                partnerId ? updateDoc(doc(db, 'users', partnerId), {
                  partnerId: null,
                }) : Promise.resolve()
              ]);

              Alert.alert('Success', 'Partner unlinked successfully');
              loadUserData();
            } catch (error) {
              console.error('Error unlinking partner:', error);
              Alert.alert('Error', 'Failed to unlink partner');
            }
          }
        }
      ]
    );
  };

  const handleResetWeeklyScore = () => {
    Alert.alert(
      'Reset Weekly Score',
      'This will reset both your and your partner\'s weekly scores to 0.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          onPress: async () => {
            try {
              const currentUserId = auth.currentUser.uid;
              const partnerId = userData.partnerId;

              await Promise.all([
                updateDoc(doc(db, 'users', currentUserId), {
                  currentWeekScore: 0,
                }),
                partnerId ? updateDoc(doc(db, 'users', partnerId), {
                  currentWeekScore: 0,
                }) : Promise.resolve()
              ]);

              Alert.alert('Success', 'Weekly scores reset to 0');
            } catch (error) {
              console.error('Error resetting scores:', error);
              Alert.alert('Error', 'Failed to reset scores');
            }
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile</Text>
          <View style={styles.profileCard}>
            <View style={styles.profileRow}>
              <Text style={styles.profileLabel}>Name</Text>
              <Text style={styles.profileValue}>{userData?.name || 'Loading...'}</Text>
            </View>
            <View style={styles.profileRow}>
              <Text style={styles.profileLabel}>Email</Text>
              <Text style={styles.profileValue}>{userData?.email || 'Loading...'}</Text>
            </View>
            <View style={styles.profileRow}>
              <Text style={styles.profileLabel}>Status</Text>
              <View style={styles.statusBadge}>
                {userData?.isPremium ? (
                  <>
                    <Text style={styles.statusEmoji}>⭐</Text>
                    <Text style={styles.statusTextPremium}>Premium</Text>
                  </>
                ) : (
                  <Text style={styles.statusTextFree}>Free</Text>
                )}
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Partner</Text>
          {userData?.partnerId ? (
            <View style={styles.card}>
              <Text style={styles.cardText}>
                You are linked with your partner 💑
              </Text>
              <TouchableOpacity
                style={styles.dangerButton}
                onPress={handleUnlinkPartner}
              >
                <Text style={styles.dangerButtonText}>Unlink Partner</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.card}>
              <Text style={styles.cardText}>
                No partner linked
              </Text>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => navigation.navigate('LinkPartner')}
              >
                <Text style={styles.primaryButtonText}>Link Partner</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {!userData?.isPremium && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Premium</Text>
            <TouchableOpacity
              style={styles.premiumCard}
              onPress={() => navigation.navigate('Premium')}
            >
              <Text style={styles.premiumEmoji}>⭐</Text>
              <View style={styles.premiumContent}>
                <Text style={styles.premiumTitle}>Upgrade to Premium</Text>
                <Text style={styles.premiumSubtitle}>
                  Unlock custom items, photos, and more!
                </Text>
              </View>
              <Text style={styles.premiumPrice}>$5</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          <View style={styles.card}>
            <View style={styles.preferenceRow}>
              <Text style={styles.preferenceLabel}>Notifications</Text>
              <Switch
                value={notifications}
                onValueChange={setNotifications}
                trackColor={{ false: '#333', true: '#e94560' }}
                thumbColor={notifications ? '#fff' : '#888'}
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions</Text>
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleResetWeeklyScore}
          >
            <Text style={styles.actionButtonText}>Reset Weekly Score</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Leaderboard')}
          >
            <Text style={styles.actionButtonText}>View Leaderboard</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.dangerButton]}
            onPress={handleSignOut}
          >
            <Text style={styles.dangerButtonText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.appInfo}>
          <Text style={styles.appInfoText}>Scoremate v1.0.0</Text>
          <Text style={styles.appInfoText}>The Toxic Chore Tracker 💔</Text>
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
  scrollView: {
    flex: 1,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  profileCard: {
    backgroundColor: '#16213e',
    padding: 20,
    borderRadius: 12,
  },
  profileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a2e',
  },
  profileLabel: {
    fontSize: 16,
    color: '#aaa',
  },
  profileValue: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusEmoji: {
    fontSize: 14,
    marginRight: 4,
  },
  statusTextPremium: {
    color: '#ffd700',
    fontSize: 14,
    fontWeight: 'bold',
  },
  statusTextFree: {
    color: '#aaa',
    fontSize: 14,
  },
  card: {
    backgroundColor: '#16213e',
    padding: 20,
    borderRadius: 12,
  },
  cardText: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 15,
    textAlign: 'center',
  },
  premiumCard: {
    backgroundColor: '#16213e',
    padding: 20,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffd700',
  },
  premiumEmoji: {
    fontSize: 32,
    marginRight: 15,
  },
  premiumContent: {
    flex: 1,
  },
  premiumTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffd700',
    marginBottom: 3,
  },
  premiumSubtitle: {
    fontSize: 14,
    color: '#aaa',
  },
  premiumPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffd700',
  },
  preferenceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  preferenceLabel: {
    fontSize: 16,
    color: '#fff',
  },
  actionButton: {
    backgroundColor: '#16213e',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  actionButtonText: {
    color: '#00d9ff',
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '500',
  },
  primaryButton: {
    backgroundColor: '#e94560',
    padding: 15,
    borderRadius: 10,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  dangerButton: {
    backgroundColor: '#e9456020',
    borderWidth: 1,
    borderColor: '#e94560',
  },
  dangerButtonText: {
    color: '#e94560',
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '500',
  },
  appInfo: {
    padding: 20,
    alignItems: 'center',
  },
  appInfoText: {
    color: '#666',
    fontSize: 12,
    marginBottom: 2,
  },
});
