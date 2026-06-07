import '../global.css';
import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryProvider } from '@/providers/QueryProvider';
import { BRAND, LOGO_IMAGE } from '@/lib/branding';

SplashScreen.preventAutoHideAsync().catch(() => {});

const screenOptions = {
  headerShown: false,
  contentStyle: { backgroundColor: BRAND.background },
};

const splashStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BRAND.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 140,
    height: 140,
  },
});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    ...Feather.font,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return (
      <View style={splashStyles.container}>
        <Image
          source={LOGO_IMAGE}
          style={splashStyles.logo}
          contentFit="contain"
          accessibilityLabel="SplitSOL"
        />
      </View>
    );
  }

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
