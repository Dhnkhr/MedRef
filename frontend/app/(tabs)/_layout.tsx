import { Tabs, Redirect } from 'expo-router';
import React from 'react';
import { Platform, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { HapticTab } from '@/components/haptic-tab';
import { Colors, FontWeights, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { usePatient } from '@/hooks/use-patient';
import { ActivityIndicator } from 'react-native';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

interface TabIconProps {
  name: IoniconsName;
  focusedName: IoniconsName;
  color: string;
  focused: boolean;
  accentColor?: string;
}

function TabIcon({ name, focusedName, color, focused, accentColor }: TabIconProps) {
  const activeColor = accentColor ?? color;
  return (
    <View style={styles.iconWrap}>
      {focused && <View style={[styles.activePill, { backgroundColor: `${activeColor}18` }]} />}
      <Ionicons
        name={focused ? focusedName : name}
        size={23}
        color={focused ? activeColor : color}
      />
    </View>
  );
}

export default function TabLayout() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const isDark = colorScheme === 'dark';
  const { patientId, loading } = usePatient();

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: isDark ? '#0A0F1A' : '#F0F4FF', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!patientId) {
    return <Redirect href="/register" />;
  }


  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)',
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: isDark ? '#111827' : '#FFFFFF',
          borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)',
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 88 : 65,
          paddingTop: 6,
          paddingBottom: Platform.OS === 'ios' ? 28 : 8,
          ...Shadows.sm,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: FontWeights.semibold,
          marginTop: 1,
          letterSpacing: 0.3,
        },
        tabBarShowLabel: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name="home-outline"
              focusedName="home"
              color={color}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="emergency"
        options={{
          title: 'Emergency',
          tabBarActiveTintColor: '#EF4444',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name="pulse-outline"
              focusedName="pulse"
              color={color}
              focused={focused}
              accentColor="#EF4444"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="documents"
        options={{
          title: 'Records',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name="document-text-outline"
              focusedName="document-text"
              color={color}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name="time-outline"
              focusedName="time"
              color={color}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name="person-outline"
              focusedName="person"
              color={color}
              focused={focused}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 32,
  },
  activePill: {
    position: 'absolute',
    width: 44,
    height: 28,
    borderRadius: 14,
  },
});
