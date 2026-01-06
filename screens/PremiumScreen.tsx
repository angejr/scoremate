// ============================================
// screens/PremiumScreen.js
// ============================================

import * as InAppPurchases from 'expo-in-app-purchases';
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
import { auth, db } from '../firebase.config';
import { PREMIUM_PRICE } from '../utils/constants';

const PRODUCT_ID = Platform.OS === 'ios' ? 'com.scoremate.earlyadopter' : 'early_adopter';

export default function PremiumScreen({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [isPurchasing, setIsPurchasing] = useState(false);

  useEffect(() => {
    initializeIAP();

    return () => {
      InAppPurchases.disconnectAsync();
    };
  }, []);

  const initializeIAP = async () => {
    try {
      await InAppPurchases.connectAsync();
      
      const { responseCode, results } = await InAppPurchases.getProductsAsync([PRODUCT_ID]);
      
      if (responseCode === InAppPurchases.IAPResponseCode.OK) {
        setProducts(results);
      }
    } catch (error) {
      console.error('Error initializing IAP:', error);
    }
  };

  const handlePurchase = async () => {
    setIsPurchasing(true);

    try {
      InAppPurchases.setPurchaseListener(({ responseCode, results }) => {
        if (responseCode === InAppPurchases.IAPResponseCode.OK) {
          results?.forEach(async (purchase) => {
            if (!purchase.acknowledged) {
              await unlockPremium();
              await InAppPurchases.finishTransactionAsync(purchase, true);
              
              Alert.alert(
                'Success! 🎉',
                'You are now a premium member! Enjoy all the features.',
                [{ text: 'Awesome!', onPress: () => navigation.goBack() }]
              );
            }
          });
        } else if (responseCode === InAppPurchases.IAPResponseCode.USER_CANCELED) {
          Alert.alert('Cancelled', 'Purchase was cancelled');
        } else {
          Alert.alert('Error', 'Purchase failed. Please try again.');
        }
        setIsPurchasing(false);
      });

      await InAppPurchases.purchaseItemAsync(PRODUCT_ID);
    } catch (error) {
      console.error('Purchase error:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
      setIsPurchasing(false);
    }
  };

  const unlockPremium = async () => {
    try {
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        isPremium: true,
        premiumPurchaseDate: new Date(),
      });
    } catch (error) {
      console.error('Error unlocking premium:', error);
    }
  };

  const handleTestPremium = () => {
    Alert.alert(
      'Test Mode',
      'This will unlock premium for testing. Remove in production!',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Unlock',
          onPress: async () => {
            await unlockPremium();
            Alert.alert('Success', 'Premium unlocked!', [
              { text: 'OK', onPress: () => navigation.goBack() }
            ]);
          }
        }
      ]
    );
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
              Nope! Just a one-time $5 payment for lifetime premium access.
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

        {__DEV__ && (
          <TouchableOpacity
            style={styles.testButton}
            onPress={handleTestPremium}
          >
            <Text style={styles.testButtonText}>Test: Unlock Premium</Text>
          </TouchableOpacity>
        )}

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
    backgroundColor: '#1a1a2e',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 40,
    alignItems: 'center',
    backgroundColor: '#16213e',
  },
  headerEmoji: {
    fontSize: 64,
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffd700',
    marginBottom: 10,
  },
  headerPrice: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#aaa',
  },
  featuresContainer: {
    padding: 20,
  },
  featuresTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
  },
  featureCard: {
    flexDirection: 'row',
    backgroundColor: '#16213e',
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
    color: '#fff',
    marginBottom: 3,
  },
  featureDescription: {
    fontSize: 14,
    color: '#aaa',
  },
  testimonialCard: {
    backgroundColor: '#e9456020',
    padding: 20,
    margin: 20,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#e94560',
  },
  testimonialQuote: {
    fontSize: 16,
    color: '#fff',
    fontStyle: 'italic',
    marginBottom: 10,
  },
  testimonialAuthor: {
    fontSize: 14,
    color: '#aaa',
    textAlign: 'right',
  },
  faqContainer: {
    padding: 20,
  },
  faqTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
  },
  faqItem: {
    marginBottom: 20,
  },
  faqQuestion: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#00d9ff',
    marginBottom: 5,
  },
  faqAnswer: {
    fontSize: 14,
    color: '#aaa',
    lineHeight: 20,
  },
  purchaseContainer: {
    padding: 20,
    backgroundColor: '#16213e',
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  purchaseButton: {
    backgroundColor: '#ffd700',
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
    color: '#888',
    fontSize: 12,
    marginTop: 10,
  },
  testButton: {
    backgroundColor: '#e94560',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  testButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
