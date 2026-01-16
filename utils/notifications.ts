// ============================================
// utils/notifications.ts - Push Notification Utilities
// ============================================

import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { Platform } from 'react-native';
import { auth, db } from '../firebase.config';

// Check if running in Expo Go (where remote notifications don't work)
const isExpoGo = Constants.appOwnership === 'expo';
const isWeb = Platform.OS === 'web';

// Flag to track if notifications are available
let notificationsAvailable = false;

/**
 * Register for push notifications and get the Expo push token
 * Note: Remote notifications don't work in Expo Go - need a development build
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  // Skip on web platform
  if (isWeb) {
    console.log('[Notifications] Web platform - skipping push registration');
    return null;
  }

  // Skip if running in Expo Go
  if (isExpoGo) {
    console.log('[Notifications] Running in Expo Go - remote notifications not supported');
    console.log('[Notifications] Use a development build for push notifications');
    return null;
  }

  // Try to get push token
  try {
    const Notifications = await import('expo-notifications');
    
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF6B6B',
      });
    }

    if (!Device.isDevice) {
      console.log('[Notifications] Must use physical device for Push Notifications');
      return null;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('[Notifications] Permission not granted');
      return null;
    }

    // Get Expo push token
    const pushToken = await Notifications.getExpoPushTokenAsync({
      projectId: Constants.expoConfig?.extra?.eas?.projectId,
    });
    
    notificationsAvailable = true;
    console.log('[Notifications] Push token:', pushToken.data);
    return pushToken.data;
  } catch (error) {
    console.log('[Notifications] Not available:', error);
    return null;
  }
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
    console.log('[Notifications] Push token saved to Firestore');
  } catch (error) {
    console.error('[Notifications] Error saving push token:', error);
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
      console.log('[Notifications] Target user not found');
      return false;
    }

    const userData = userDoc.data();
    const pushToken = userData.pushToken;

    if (!pushToken) {
      console.log('[Notifications] Target user has no push token');
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
    console.log('[Notifications] Push notification sent:', result);
    return true;
  } catch (error) {
    console.error('[Notifications] Error sending push notification:', error);
    return false;
  }
}

/**
 * Send notification for a new report (trigger or deed)
 * Silently fails if notifications aren't available
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

  // Try to send notification, but don't fail if it doesn't work
  try {
    await sendPushNotification(partnerId, title, body, {
      type: 'report',
      reportType: type,
      itemName,
      points,
    });
  } catch (error) {
    // Silently fail - notifications are nice-to-have
    console.log('[Notifications] Could not send notification (non-critical)');
  }
}

/**
 * Check if notifications are available
 */
export function areNotificationsAvailable(): boolean {
  return notificationsAvailable;
}
