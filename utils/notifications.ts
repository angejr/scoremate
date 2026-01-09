// ============================================
// utils/notifications.ts - Push Notification Utilities
// ============================================

import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { Platform } from 'react-native';
import { auth, db } from '../firebase.config';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Register for push notifications and get the Expo push token
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  let token = null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF6B6B',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return null;
    }
    
    try {
      const pushToken = await Notifications.getExpoPushTokenAsync({
        projectId: 'scoremate-9389e', // Your Expo project ID
      });
      token = pushToken.data;
      console.log('Push token:', token);
    } catch (error) {
      console.error('Error getting push token:', error);
    }
  } else {
    console.log('Must use physical device for Push Notifications');
  }

  return token;
}

/**
 * Save push token to Firestore for the current user
 */
export async function savePushToken(token: string): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser) return;

  try {
    await updateDoc(doc(db, 'users', currentUser.uid), {
      pushToken: token,
      pushTokenUpdatedAt: new Date(),
    });
    console.log('Push token saved to Firestore');
  } catch (error) {
    console.error('Error saving push token:', error);
  }
}

/**
 * Send a push notification to a specific user
 */
export async function sendPushNotification(
  targetUserId: string,
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<boolean> {
  try {
    // Get the target user's push token from Firestore
    const userDoc = await getDoc(doc(db, 'users', targetUserId));
    
    if (!userDoc.exists()) {
      console.log('Target user not found');
      return false;
    }

    const userData = userDoc.data();
    const pushToken = userData.pushToken;

    if (!pushToken) {
      console.log('Target user has no push token');
      return false;
    }

    // Send the notification via Expo's push notification service
    const message = {
      to: pushToken,
      sound: 'default',
      title,
      body,
      data: data || {},
    };

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    const result = await response.json();
    console.log('Push notification sent:', result);
    return true;
  } catch (error) {
    console.error('Error sending push notification:', error);
    return false;
  }
}

/**
 * Send notification for a new report (trigger or deed)
 */
export async function sendReportNotification(
  partnerId: string,
  reporterName: string,
  type: 'trigger' | 'deed',
  itemName: string,
  points: number
): Promise<void> {
  let title: string;
  let body: string;

  if (type === 'trigger') {
    title = '😤 Uh oh! You lost points!';
    body = `${reporterName} reported: ${itemName} (${points} pts)`;
  } else {
    title = '✨ Your partner did something good!';
    body = `${reporterName} logged: ${itemName} (+${points} pts)`;
  }

  await sendPushNotification(partnerId, title, body, {
    type: 'report',
    reportType: type,
    itemName,
    points,
  });
}
