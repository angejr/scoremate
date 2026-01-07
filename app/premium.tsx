// ============================================
// app/premium.tsx - Premium Screen
// ============================================

import { useRouter } from 'expo-router';
import { doc, updateDoc } from 'firebase/firestore';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { auth, db } from '../firebase.config';
import { COLORS, PREMIUM_PRICE } from '../utils/constants';

// Note: expo-in-app-purchases may need additional setup for production
// For now, we'll implement a test mode that can be replaced with real IAP

export default function PremiumScreen() {
  const router = useRouter();
  const { refreshUserData } = useAuth();
  const [isPurchasing, setIsPurchasing] = useState(false);

  const unlockPremium = async () => {
    try {
      if (!auth.currentUser) return;
      
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        isPremium: true,
        premiumPurchaseDate: new Date(),
      });
      await refreshUserData();
    } catch (error) {
      console.error('Error unlocking premium:', error);
      throw error;
    }
  };

  const handlePurchase = async () => {
    setIsPurchasing(true);

    try {
      // In production, integrate with expo-in-app-purchases or RevenueCat
      // For development/testing, we'll simulate the purchase
      
      if (__DEV__) {
        // Development mode - simulate purchase
        Alert.alert(
          'Development Mode',
          'In production, this will connect to Apple/Google for payment. For now, simulating purchase...',
          [
            { text: 'Cancel', style: 'cancel', onPress: () => setIsPurchasing(false) },
            {
              text: 'Simulate Purchase',
              onPress: async () => {
                try {
                  await unlockPremium();
                  Alert.alert(
                    'Success! 🎉',
                    'You are now a premium member! Enjoy all the features.',
                    [{ text: 'Awesome!', onPress: () => router.back() }]
                  );
                } catch (error) {
                  Alert.alert('Error', 'Failed to unlock premium. Please try again.');
                }
                setIsPurchasing(false);
              }
            }
          ]
        );
      } else {
        // Production mode - implement real IAP here
        // This would integrate with expo-in-app-purchases or RevenueCat
        Alert.alert(
          'Coming Soon',
          'In-app purchases will be available when the app is published to the stores.',
          [{ text: 'OK', onPress: () => setIsPurchasing(false) }]
        );
      }
    } catch (error) {
      console.error('Purchase error:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
      setIsPurchasing(false);
    }
  };

  const features = [
    {
      icon: '✏️',
      title: 'Custom Triggers & Deeds',
      description: 'Create your own unique items tailored to your relationship',
    },
    {
      icon: '📸',
      title: 'Photo Evidence',
      description: 'Attach photos to prove your partner\'s crimes (or your good deeds)',
    },
    {
      icon: '📝',
      title: 'Add Notes',
      description: 'Include detailed descriptions with each report',
    },
    {
      icon: '🎯',
      title: 'Future Features',
      description: 'Get lifetime access to all upcoming premium features',
    },
    {
      icon: '🏆',
      title: 'Early Adopter Badge',
      description: 'Show off your special status to your partner',
    },
    {
      icon: '💰',
      title: 'One-Time Payment',
      description: 'No subscription, no recurring charges, just $5 forever',
    },
  ];

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.headerEmoji}>👑</Text>
          <Text style={styles.headerTitle}>Early Adopter</Text>
          <Text style={styles.headerPrice}>${PREMIUM_PRICE}</Text>
          <Text style={styles.headerSubtitle}>One-time payment • Lifetime access</Text>
        </View>

        <View style={styles.featuresContainer}>
          <Text style={styles.featuresTitle}>Premium Features</Text>
          
          {features.map((feature, index) => (
            <View key={index} style={styles.featureCard}>
              <Text style={styles.featureIcon}>{feature.icon}</Text>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDescription}>{feature.description}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.testimonialCard}>
          <Text style={styles.testimonialQuote}>
            "This app saved our relationship... by making it more competitive!"
          </Text>
          <Text style={styles.testimonialAuthor}>- Beta Tester Couple</Text>
        </View>

        <View style={styles.faqContainer}>
          <Text style={styles.faqTitle}>Frequently Asked Questions</Text>
          
          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>Is this a subscription?</Text>
            <Text style={styles.faqAnswer}>
              Nope! Just a one-time ${PREMIUM_PRICE} payment for lifetime premium access.
            </Text>
          </View>

          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>Does my partner need premium too?</Text>
            <Text style={styles.faqAnswer}>
              No, but they'll definitely be jealous of your custom triggers 😏
            </Text>
          </View>

          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>Can I get a refund?</Text>
            <Text style={styles.faqAnswer}>
              Refunds handled through Apple/Google within 48 hours of purchase.
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.purchaseContainer}>
        <TouchableOpacity
          style={[styles.purchaseButton, isPurchasing && styles.purchaseButtonDisabled]}
          onPress={handlePurchase}
          disabled={isPurchasing}
        >
          {isPurchasing ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.purchaseButtonText}>
              Unlock Premium - ${PREMIUM_PRICE}
            </Text>
          )}
        </TouchableOpacity>

        <Text style={styles.purchaseNote}>
          Secure payment processed by {Platform.OS === 'ios' ? 'Apple' : 'Google'}
        </Text>
      </View>
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
  header: {
    padding: 40,
    alignItems: 'center',
    backgroundColor: COLORS.cardBackground,
  },
  headerEmoji: {
    fontSize: 64,
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.accent,
    marginBottom: 10,
  },
  headerPrice: {
    fontSize: 48,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  featuresContainer: {
    padding: 20,
  },
  featuresTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 15,
  },
  featureCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.cardBackground,
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  featureIcon: {
    fontSize: 32,
    marginRight: 15,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 3,
  },
  featureDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  testimonialCard: {
    backgroundColor: `${COLORS.primary}20`,
    padding: 20,
    margin: 20,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  testimonialQuote: {
    fontSize: 16,
    color: COLORS.text,
    fontStyle: 'italic',
    marginBottom: 10,
  },
  testimonialAuthor: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'right',
  },
  faqContainer: {
    padding: 20,
  },
  faqTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 15,
  },
  faqItem: {
    marginBottom: 20,
  },
  faqQuestion: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.secondary,
    marginBottom: 5,
  },
  faqAnswer: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  purchaseContainer: {
    padding: 20,
    backgroundColor: COLORS.cardBackground,
    borderTopWidth: 1,
    borderTopColor: COLORS.textTertiary,
  },
  purchaseButton: {
    backgroundColor: COLORS.accent,
    padding: 18,
    borderRadius: 10,
    alignItems: 'center',
  },
  purchaseButtonDisabled: {
    opacity: 0.5,
  },
  purchaseButtonText: {
    color: '#000',
    fontSize: 20,
    fontWeight: 'bold',
  },
  purchaseNote: {
    textAlign: 'center',
    color: COLORS.textTertiary,
    fontSize: 12,
    marginTop: 10,
  },
});
