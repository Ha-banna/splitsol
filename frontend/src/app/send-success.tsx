import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, type Href } from 'expo-router';
import { ScreenHeader } from '@/components/screen-header';
import { PaymentCelebration } from '@/components/payment-celebration';

function param(value: string | string[] | undefined): string {
  if (typeof value === 'string') return value;
  return value?.[0] ?? '';
}

export default function SendSuccessScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const amount = param(params.amount) || '0.00';
  const to = param(params.to) || 'your friend';
  const tx = param(params.tx);

  return (
    <SafeAreaView className="flex-1 bg-slate-900">
      <ScreenHeader title="Sent!" variant="close" fallbackHref="/(tabs)" />
      <PaymentCelebration
        title="Money sent! 🎉"
        subtitle={`${to} received your USDC. You're awesome.`}
        amountLabel="Amount sent"
        amount={`$${amount} USDC`}
        tx={tx || undefined}
        actionLabel="Done"
        onAction={() => router.replace('/(tabs)' as Href)}
        accent="purple"
      />
    </SafeAreaView>
  );
}
