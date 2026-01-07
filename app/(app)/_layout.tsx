// ============================================
// app/(app)/_layout.tsx - App Layout (Authenticated)
// ============================================

import { Stack } from 'expo-router';
import React from 'react';
import { COLORS } from '../../utils/constants';

export default function AppLayout() {
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
