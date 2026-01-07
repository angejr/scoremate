// ============================================
// app/(auth)/_layout.tsx - Auth Layout
// ============================================

import { Stack } from 'expo-router';
import React from 'react';
import { COLORS } from '../../utils/constants';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: COLORS.background,
        },
      }}
    >
      <Stack.Screen name="index" />
    </Stack>
  );
}
