// ============================================
// app/settings.tsx - Settings Screen
// ============================================

import { useRouter } from 'expo-router';
import { signOut } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import React, { useState } from 'react';
import {
    Alert,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { auth, db } from '../firebase.config';
import { COLORS } from '../utils/constants';

export default function SettingsScreen() {
  const router = useRouter();
  const { userData, refreshUserData } = useAuth();
  const [notifications, setNotifications] = useState(true);

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
              const currentUserId = auth.currentUser?.uid;
              const partnerId = userData?.partnerId;

              if (!currentUserId) return;

              const updates = [
                updateDoc(doc(db, 'users', currentUserId), {
                  partnerId: null,
                })
              ];

              if (partnerId) {
                updates.push(
                  updateDoc(doc(db, 'users', partnerId), {
                    partnerId: null,
                  })
                );
              }

              await Promise.all(updates);
              await refreshUserData();
              Alert.alert('Success', 'Partner unlinked successfully');
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
              const currentUserId = auth.currentUser?.uid;
              const partnerId = userData?.partnerId;

              if (!currentUserId) return;

              const updates = [
                updateDoc(doc(db, 'users', currentUserId), {
                  currentWeekScore: 0,
                })
              ];

              if (partnerId) {
                updates.push(
                  updateDoc(doc(db, 'users', partnerId), {
                    currentWeekScore: 0,
                  })
                );
              }

              await Promise.all(updates);
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
            <View style={[styles.profileRow, { borderBottomWidth: 0 }]}>
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
                onPress={() => router.push('/link-partner')}
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
              onPress={() => router.push('/premium')}
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

        {userData?.isPremium && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Premium Features</Text>
            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push('/custom-items')}
            >
              <Text style={styles.cardText}>✏️ Manage Custom Items</Text>
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
                trackColor={{ false: COLORS.textTertiary, true: COLORS.primary }}
                thumbColor={notifications ? COLORS.text : COLORS.textTertiary}
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
            onPress={() => router.push('/leaderboard')}
          >
            <Text style={styles.actionButtonText}>View Leaderboard</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.dangerButtonOutline]}
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
    backgroundColor: COLORS.background,
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
    color: COLORS.text,
    marginBottom: 12,
  },
  profileCard: {
    backgroundColor: COLORS.cardBackground,
    padding: 20,
    borderRadius: 12,
  },
  profileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.background,
  },
  profileLabel: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  profileValue: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '500',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusEmoji: {
    fontSize: 14,
    marginRight: 4,
  },
  statusTextPremium: {
    color: COLORS.accent,
    fontSize: 14,
    fontWeight: 'bold',
  },
  statusTextFree: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  card: {
    backgroundColor: COLORS.cardBackground,
    padding: 20,
    borderRadius: 12,
  },
  cardText: {
    color: COLORS.text,
    fontSize: 16,
    marginBottom: 15,
    textAlign: 'center',
  },
  premiumCard: {
    backgroundColor: COLORS.cardBackground,
    padding: 20,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.accent,
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
    color: COLORS.accent,
    marginBottom: 3,
  },
  premiumSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  premiumPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.accent,
  },
  preferenceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  preferenceLabel: {
    fontSize: 16,
    color: COLORS.text,
  },
  actionButton: {
    backgroundColor: COLORS.cardBackground,
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  actionButtonText: {
    color: COLORS.secondary,
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '500',
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    padding: 15,
    borderRadius: 10,
  },
  primaryButtonText: {
    color: COLORS.text,
    fontSize: 16,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  dangerButton: {
    backgroundColor: `${COLORS.primary}20`,
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  dangerButtonOutline: {
    backgroundColor: `${COLORS.primary}20`,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  dangerButtonText: {
    color: COLORS.primary,
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '500',
  },
  appInfo: {
    padding: 20,
    alignItems: 'center',
  },
  appInfoText: {
    color: COLORS.textTertiary,
    fontSize: 12,
    marginBottom: 2,
  },
});
