import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useEffect, useState } from 'react';
import { Platform, View, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { usePatient } from '@/hooks/use-patient';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  // First-launch guard removed from root to prevent layout mounting race conditions

  // ── Remove browser default yellow focus ring (web only, client-side) ──
  useEffect(() => {
    if (Platform.OS === 'web') {
      const style = document.createElement('style');
      style.textContent = `
        input:focus, textarea:focus, [contenteditable]:focus,
        input:focus-visible, textarea:focus-visible {
          outline: none !important;
          box-shadow: none !important;
          -webkit-appearance: none;
        }
        input, textarea {
          caret-color: #2563EB;
        }
      `;
      document.head.appendChild(style);
      return () => { document.head.removeChild(style); };
    }
  }, []);

  const MedRefLight = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      primary: '#2563EB',
      background: '#F0F4FF',
      card: '#FFFFFF',
      text: '#111827',
      border: '#E5E7EB',
    },
  };

  const MedRefDark = {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      primary: '#3B82F6',
      background: '#0A0F1A',
      card: '#1A2035',
      text: '#F9FAFB',
      border: '#1E293B',
    },
  };

  // Splash screen logic removed

  return (
    <ThemeProvider value={colorScheme === 'dark' ? MedRefDark : MedRefLight}>
      <View style={{ flex: 1 }}>
        <Stack>
          <Stack.Screen name="register" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="hospital/results"
            options={{ title: 'Hospital Rankings', headerBackTitle: 'Back', presentation: 'card' }}
          />
          <Stack.Screen
            name="hospital/[id]"
            options={{ title: 'Hospital Details', headerBackTitle: 'Back', presentation: 'card' }}
          />
          <Stack.Screen
            name="emergency/summary"
            options={{ title: 'Emergency Summary', headerBackTitle: 'Back', presentation: 'modal' }}
          />
          <Stack.Screen
            name="emergency/consent"
            options={{ title: 'Approve & Send', headerBackTitle: 'Back', presentation: 'modal' }}
          />
          <Stack.Screen
            name="share/qr-checkin"
            options={{ title: 'Check-In QR', headerBackTitle: 'Back', presentation: 'modal' }}
          />
          <Stack.Screen
            name="share/qr-records"
            options={{ title: 'Share Records', headerBackTitle: 'Back', presentation: 'modal' }}
          />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>
      </View>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
