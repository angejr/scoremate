// ============================================
// app/premium.tsx - Premium Screen with RevenueCat IAP
// ============================================

import { useRouter } from 'expo-router';
import { doc, updateDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
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
import Purchases, { PurchasesPackage } from 'react-native-purchases';
import { useAuth } from '../context/AuthContext';
import { auth, db } from '../firebase.config';
import { COLORS, PREMIUM_PRICE } from '../utils/constants';

// RevenueCat API Keys - Replace with your actual keys from RevenueCat dashboard
const REVENUECAT_API_KEY_IOS = 'appl_YOUR_IOS_KEY_HERE';
const REVENUECAT_API_KEY_ANDROID = 'goog_KOnxYqOlADdqEnAcXLxTZhoPQwj';
const PRODUCT_ID = 'scoremate_premium_early_adopter';

export default function PremiumScreen() {
  const router = useRouter();
  const { refreshUserData } = useAuth();
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [premiumPackage, setPremiumPackage] = useState<PurchasesPackage | null>(null);
  const [isConfigured, setIsConfigured] = useState(false);

  useEffect(() => {
    initializePurchases();
  }, []);

  const initializePurchases = async () => {
    try {
      // Only initialize on native platforms
      if (Platform.OS === 'web') {
        setIsLoading(false);
        return;
      }

      const apiKey = Platform.OS === 'ios' ? REVENUECAT_API_KEY_IOS : REVENUECAT_API_KEY_ANDROID;

      // Skip initialization in dev mode if keys aren't set
      if (apiKey.includes('YOUR_')) {
        console.log('[Premium] RevenueCat not configured - using development mode');
        setIsLoading(false);
        return;
      }

      // Configure RevenueCat
      Purchases.configure({ apiKey });

      // Link with Firebase user
      if (auth.currentUser) {
        await Purchases.logIn(auth.currentUser.uid);
      }

      // Fetch available packages
      const offerings = await Purchases.getOfferings();
      if (offerings.current?.availablePackages.length) {
        const pkg = offerings.current.availablePackages.find(
          (p) => p.product.identifier === PRODUCT_ID
        );
        setPremiumPackage(pkg || offerings.current.availablePackages[0]);
      }

      setIsConfigured(true);
      setIsLoading(false);
    } catch (error) {
      console.error('[Premium] Error initializing purchases:', error);
      setIsLoading(false);
    }
  };

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
      // Web platform - show message
      if (Platform.OS === 'web') {
        Alert.alert(
          'Purchase on Mobile',
          'In-app purchases are only available on iOS and Android. Please use the mobile app to upgrade.',
          [{ text: 'OK', onPress: () => setIsPurchasing(false) }]
        );
        return;
      }

      // Development mode or RevenueCat not configured
      if (!isConfigured || __DEV__) {
        Alert.alert(
          __DEV__ ? 'Development Mode' : 'Coming Soon',
          __DEV__
            ? 'In production, this will connect to Apple/Google for payment. For now, simulating purchase...'
            : 'In-app purchases will be available when the app is published.',
          [
            { text: 'Cancel', style: 'cancel', onPress: () => setIsPurchasing(false) },
            {
              text: __DEV__ ? 'Simulate Purchase' : 'OK',
              onPress: async () => {
                if (__DEV__) {
                  try {
                    await unlockPremium();
                    Alert.alert('Success! 🎉', 'You are now a premium member!', [
                      { text: 'Awesome!', onPress: () => router.back() },
                    ]);
                  } catch {
                    Alert.alert('Error', 'Failed to unlock premium.');
                  }
                }
                setIsPurchasing(false);
              },
            },
          ]
        );
        return;
      }

      // Production purchase flow with RevenueCat
      if (premiumPackage) {
        const { customerInfo } = await Purchases.purchasePackage(premiumPackage);

        // Check if purchase was successful
        if (customerInfo.entitlements.active['premium'] !== undefined) {
          await unlockPremium();
          Alert.alert('Success! 🎉', 'You are now a premium member! Enjoy all the features.', [
            { text: 'Awesome!', onPress: () => router.back() },
          ]);
        }
      } else {
        Alert.alert('Error', 'Unable to load purchase options. Please try again later.');
      }
    } catch (error: any) {
      if (error.userCancelled) {
        console.log('User cancelled purchase');
      } else {
        console.error('Purchase error:', error);
        Alert.alert('Error', 'Something went wrong with the purchase. Please try again.');
      }
    } finally {
      setIsPurchasing(false);
    }
  };

  const restorePurchases = async () => {
    setIsPurchasing(true);
    try {
      if (Platform.OS === 'web' || !isConfigured) {
        Alert.alert('Restore', 'Purchase restoration is only available on mobile devices.');
        setIsPurchasing(false);
        return;
      }

      const customerInfo = await Purchases.restorePurchases();

      if (customerInfo.entitlements.active['premium'] !== undefined) {
        await unlockPremium();
        Alert.alert('Restored!', 'Your premium access has been restored.', [
          { text: 'Great!', onPress: () => router.back() },
        ]);
      } else {
        Alert.alert('No Purchases Found', 'No previous premium purchases were found.');
      }
    } catch (error) {
      console.error('Restore error:', error);
      Alert.alert('Error', 'Failed to restore purchases. Please try again.');
    } finally {
      setIsPurchasing(false);
    }
  };

  const features = [
    {
      icon: '♾️',
      title: 'Unlimited Custom Items',
      description: 'Create unlimited triggers & deeds (free tier: 2 each)',
    },
    {
      icon: '📸',
      title: 'Unlimited Photo Evidence',
      description: 'Add photos to every report (free tier: 5/week)',
    },
    {
      icon: '📝',
      title: 'Unlimited Notes',
      description: 'Add notes to every report (free tier: 5/week)',
    },
    {
      icon: '🎯',
      title: 'Future Features',
      description: 'Get lifetime access to all upcoming premium features',
    },
    {
      icon: '💰',
      title: 'One-Time Payment',
      description: 'No subscription, no recurring charges, pay once forever',
    },
    {
      icon: '💝',
      title: 'Support Development',
      description: 'Help us keep building features for toxic couples!',
    },
  ];

  const displayPrice = premiumPackage?.product.priceString || `$${PREMIUM_PRICE}`;

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.headerEmoji}>👑</Text>
          <Text style={styles.headerTitle}>Early Adopter</Text>
          <Text style={styles.headerPrice}>{displayPrice}</Text>
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
              Nope! Just a one-time {displayPrice} payment for lifetime premium access.
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
            <Text style={styles.purchaseButtonText}>Unlock Premium - {displayPrice}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.restoreButton} onPress={restorePurchases}>
          <Text style={styles.restoreButtonText}>Restore Purchases</Text>
        </TouchableOpacity>

        <Text style={styles.purchaseNote}>
          Secure payment processed by {Platform.OS === 'ios' ? 'Apple' : Platform.OS === 'android' ? 'Google' : 'App Store'}
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
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: COLORS.text,
    marginTop: 10,
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
  restoreButton: {
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  restoreButtonText: {
    color: COLORS.secondary,
    fontSize: 14,
  },
  purchaseNote: {
    textAlign: 'center',
    color: COLORS.textTertiary,
    fontSize: 12,
    marginTop: 5,
  },
});
