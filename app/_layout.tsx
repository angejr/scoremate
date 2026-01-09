// ============================================
// app/_layout.tsx - Root Layout with Authentication
// ============================================

import { Slot, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import 'react-native-reanimated';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { COLORS } from '../utils/constants';
import { registerForPushNotificationsAsync, savePushToken } from '../utils/notifications';

function RootLayoutNav() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  // Register for push notifications when user is authenticated
  useEffect(() => {
    if (user) {
      registerForPushNotificationsAsync().then((token) => {
        if (token) {
          savePushToken(token);
        }
      });
    }
  }, [user]);

  // Handle auth navigation
  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';

    console.log('[RootLayout] User:', user?.email || 'null', 'inAuthGroup:', inAuthGroup);

    if (!user && !inAuthGroup) {
      console.log('[RootLayout] Redirecting to auth...');
      router.replace('/(auth)');
    } else if (user && inAuthGroup) {
      console.log('[RootLayout] Redirecting to app...');
      router.replace('/(app)');
    }
  }, [user, loading, segments]);

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: COLORS.background,
        }}
      >
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return <Slot />;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="light" />
      <RootLayoutNav />
    </AuthProvider>
  );
}
