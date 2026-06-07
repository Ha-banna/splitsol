import { Tabs, useRouter, type Href } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { setAuthToken } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { UserAvatar } from '@/components/user-avatar';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import { toUiUser } from '@/lib/mappers';

function LoadingScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: '#0f172a', alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color="#a855f7" size="large" />
    </View>
  );
}

export default function TabLayout() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const uiUser = user ? toUiUser(user) : null;
  const [hydrated, setHydrated] = useState(
    () => typeof window === 'undefined' || useAuthStore.persist.hasHydrated(),
  );

  usePushNotifications();

  useEffect(() => {
    const finishHydration = () => {
      const t = useAuthStore.getState().token;
      setAuthToken(t);
      setHydrated(true);
    };
    if (useAuthStore.persist.hasHydrated()) {
      finishHydration();
      return;
    }
    return useAuthStore.persist.onFinishHydration(finishHydration);
  }, []);

  useEffect(() => {
    if (hydrated && token) {
      setAuthToken(token);
    }
  }, [hydrated, token]);

  useEffect(() => {
    if (hydrated && !token) {
      router.replace('/onboarding');
      return;
    }
    if (hydrated && token && user && !user.wallet_address?.trim()) {
      useAuthStore.getState().clearSession();
      router.replace('/onboarding');
    }
  }, [hydrated, token, user, router]);

  useEffect(() => {
    if (hydrated && token && user && !user.username) {
      router.replace('/setup-username' as Href);
    }
  }, [hydrated, token, user, router]);

  if (!hydrated) {
    return <LoadingScreen />;
  }

  if (!token) {
    return <LoadingScreen />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0f172a',
          borderTopColor: '#334155',
          borderTopWidth: 1,
        },
        tabBarActiveTintColor: '#a855f7',
        tabBarInactiveTintColor: '#64748b',
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <Feather size={24} style={{ marginBottom: -3 }} name="home" color={color} />,
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          title: 'Activity',
          tabBarIcon: ({ color }) => <Feather size={24} style={{ marginBottom: -3 }} name="activity" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: () => (
            <View style={{ marginBottom: -3 }}>
              <UserAvatar
                avatarUrl={uiUser?.avatarUrl}
                displayName={uiUser?.name}
                username={uiUser?.username}
                size={26}
              />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}
