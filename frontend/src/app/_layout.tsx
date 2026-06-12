import '../global.css';
import { Feather } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryProvider } from '@/providers/QueryProvider';
import { BRAND } from '@/lib/branding';

SplashScreen.preventAutoHideAsync().catch(() => {});

const screenOptions = {
  headerShown: false,
  contentStyle: { backgroundColor: BRAND.background },
};

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    ...Feather.font,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  // Keep Stack mounted while fonts load — swapping the tree for a splash View
  // breaks expo-router linking ("state update on unmounted component").
  return (
    <SafeAreaProvider>
      <QueryProvider>
      <Stack screenOptions={screenOptions}>
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="group/create" options={{ headerShown: false, presentation: 'modal' }} />
        <Stack.Screen name="group/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="group/edit/[id]" options={{ headerShown: false, presentation: 'modal' }} />
        <Stack.Screen name="group/add-expense" options={{ headerShown: false, presentation: 'modal' }} />
        <Stack.Screen name="group/add-member" options={{ headerShown: false, presentation: 'modal' }} />
        <Stack.Screen name="group/settle" options={{ headerShown: false, presentation: 'modal' }} />
        <Stack.Screen name="group/success" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
        <Stack.Screen name="send" options={{ headerShown: false, presentation: 'modal' }} />
        <Stack.Screen name="send-success" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
        <Stack.Screen name="contacts" options={{ headerShown: false, presentation: 'modal' }} />
        <Stack.Screen name="setup-username" options={{ headerShown: false, presentation: 'modal' }} />
        <Stack.Screen name="feedback" options={{ headerShown: false, presentation: 'modal' }} />
        <Stack.Screen name="legal/view" options={{ headerShown: false, presentation: 'modal' }} />
      </Stack>
      </QueryProvider>
    </SafeAreaProvider>
  );
}
