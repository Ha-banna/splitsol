import React, { useState } from 'react';
import {
  View,
  Text,
  Alert,
  Platform,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import { AppLogo } from '@/components/app-logo';
import { LoadingButton } from '@/components/ui/loading-button';
import { useWalletLogin } from '@/hooks/queries';
import { ApiError } from '@/lib/api';
import { API_URL } from '@/lib/config';
import { isSeekerDevice } from '@/lib/device';
import { getWalletLoginHint, getWalletLoginMode, isWalletLoginAvailable } from '@/lib/wallet-auth';

function showError(title: string, message: string) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.alert(`${title}\n\n${message}`);
    return;
  }
  Alert.alert(title, message);
}

export default function OnboardingScreen() {
  const router = useRouter();
  const walletLogin = useWalletLogin();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const walletAvailable = isWalletLoginAvailable();
  const walletMode = getWalletLoginMode();
  const connectLabel =
    walletMode.type === 'unavailable'
      ? 'Wallet required'
      : walletMode.type === 'mobile'
        ? isSeekerDevice()
          ? 'Connect Seeker Wallet'
          : 'Connect Solana Wallet'
        : walletMode.type === 'browser'
          ? `Connect ${walletMode.name}`
          : walletMode.type === 'dev'
            ? 'Sign in (dev wallet)'
            : 'Connect Wallet';

  const connectWallet = async () => {
    if (busy || !walletAvailable) return;
    setError(null);
    setBusy(true);
    try {
      const result = await walletLogin.mutateAsync();
      if (!result?.token) {
        throw new Error('No session token returned from server');
      }
      router.replace('/(tabs)');
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Could not connect. Is the API running?';
      setError(message);
      showError('Connection failed', `${message}\n\nAPI: ${API_URL}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
      <View style={styles.container}>
        <Animated.View entering={FadeInUp.duration(700).delay(100)} style={styles.hero}>
          <AppLogo size={120} showWordmark wordmarkSize="lg" />
          <Text style={styles.tagline}>
            Split expenses with friends. Settle on Solana in seconds.
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(700).delay(280)} style={styles.footer}>
          <LoadingButton
            label={connectLabel}
            loading={busy}
            disabled={!walletAvailable}
            onPress={connectWallet}
            containerStyle={styles.buttonWrap}
          />

          {error ? (
            <Animated.Text entering={FadeIn.duration(300)} style={styles.error}>
              {error}
            </Animated.Text>
          ) : null}

          <Text style={styles.hint}>{getWalletLoginHint()}</Text>
          <Text style={styles.powered}>Powered by Solana</Text>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  container: {
    flex: 1,
    paddingHorizontal: 28,
    paddingVertical: 32,
    justifyContent: 'space-between',
  },
  hero: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 48,
    zIndex: 1,
    gap: 8,
  },
  tagline: {
    fontSize: 17,
    lineHeight: 26,
    color: '#ffffff',
    textAlign: 'center',
    maxWidth: 300,
    marginTop: 8,
  },
  footer: {
    width: '100%',
    paddingBottom: 8,
    zIndex: 1,
  },
  buttonWrap: {
    width: '100%',
  },
  error: {
    marginTop: 14,
    color: '#fb7185',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  hint: {
    marginTop: 16,
    color: '#ffffff',
    fontSize: 11,
    textAlign: 'center',
  },
  powered: {
    marginTop: 8,
    color: '#ffffff',
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '500',
  },
});
