// ============================================
// app/link-partner.tsx - Link Partner Screen
// ============================================

import { useRouter } from 'expo-router';
import { collection, doc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { auth, db } from '../firebase.config';
import { COLORS } from '../utils/constants';

export default function LinkPartnerScreen() {
  const router = useRouter();
  const { refreshUserData } = useAuth();
  const [partnerEmail, setPartnerEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const myLinkCode = auth.currentUser?.uid.slice(0, 8) || '';

  const handleLinkByEmail = async () => {
    if (!partnerEmail) {
      Alert.alert('Error', 'Please enter your partner\'s email');
      return;
    }

    setLoading(true);

    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', partnerEmail.toLowerCase().trim()));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        Alert.alert('Not Found', 'No user found with this email. Make sure they\'ve signed up!');
        setLoading(false);
        return;
      }

      const partnerDoc = querySnapshot.docs[0];
      const partnerId = partnerDoc.id;
      const currentUserId = auth.currentUser?.uid;

      if (!currentUserId) {
        Alert.alert('Error', 'You must be logged in');
        setLoading(false);
        return;
      }

      if (partnerId === currentUserId) {
        Alert.alert('Error', 'You cannot link with yourself! 😅');
        setLoading(false);
        return;
      }

      const partnerData = partnerDoc.data();
      if (partnerData.partnerId && partnerData.partnerId !== currentUserId) {
        Alert.alert('Error', 'This user is already linked with someone else!');
        setLoading(false);
        return;
      }

      await Promise.all([
        updateDoc(doc(db, 'users', currentUserId), {
          partnerId: partnerId,
        }),
        updateDoc(doc(db, 'users', partnerId), {
          partnerId: currentUserId,
        })
      ]);

      await refreshUserData();

      Alert.alert(
        'Success! 💑',
        'You are now linked with your partner. Let the games begin!',
        [{ text: 'Start Competing', onPress: () => router.back() }]
      );
    } catch (error) {
      console.error('Error linking partner:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.emoji}>💑</Text>
          <Text style={styles.title}>Link Your Partner</Text>
          <Text style={styles.subtitle}>
            Connect with your partner to start tracking!
          </Text>
        </View>

        <View style={styles.codeCard}>
          <Text style={styles.codeLabel}>Your Link Code</Text>
          <View style={styles.codeBox}>
            <Text style={styles.codeText}>{myLinkCode}</Text>
          </View>
          <Text style={styles.codeInstruction}>
            Share this code with your partner
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Link by Email</Text>
          <TextInput
            style={styles.input}
            placeholder="partner@example.com"
            placeholderTextColor={COLORS.textTertiary}
            value={partnerEmail}
            onChangeText={setPartnerEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLinkByEmail}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.text} />
            ) : (
              <Text style={styles.buttonText}>Link Partner</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoIcon}>ℹ️</Text>
          <Text style={styles.infoText}>
            Both you and your partner need to create accounts before linking.
            Once linked, you can start tracking triggers and good deeds!
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginVertical: 30,
  },
  emoji: {
    fontSize: 64,
    marginBottom: 15,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  codeCard: {
    backgroundColor: COLORS.cardBackground,
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    marginBottom: 30,
    borderWidth: 2,
    borderColor: COLORS.secondary,
  },
  codeLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 10,
  },
  codeBox: {
    backgroundColor: COLORS.background,
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  codeText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.secondary,
    letterSpacing: 4,
  },
  codeInstruction: {
    fontSize: 12,
    color: COLORS.textTertiary,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 10,
  },
  input: {
    backgroundColor: COLORS.cardBackground,
    color: COLORS.text,
    padding: 15,
    borderRadius: 10,
    fontSize: 16,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: COLORS.textTertiary,
  },
  button: {
    backgroundColor: COLORS.primary,
    padding: 18,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: 'bold',
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.cardBackground,
    padding: 15,
    borderRadius: 10,
    marginTop: 30,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.secondary,
  },
  infoIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  infoText: {
    flex: 1,
    color: COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
});
