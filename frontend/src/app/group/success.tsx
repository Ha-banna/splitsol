import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ScreenHeader } from '@/components/screen-header';
import { PaymentCelebration } from '@/components/payment-celebration';

function param(value: string | string[] | undefined): string {
  if (typeof value === 'string') return value;
  return value?.[0] ?? '';
}

export default function SettlementSuccessScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const id = param(params.id);
  const tx = param(params.tx);
  const total = param(params.total) || '0.00';

  return (
    <SafeAreaView className="flex-1 bg-slate-900">
      <ScreenHeader title="Settlement" variant="close" fallbackHref={`/group/${id}`} />
      <PaymentCelebration
        title="All settled! 🎉"
        subtitle="Your group balances are updated. Nice work clearing the books."
        amountLabel="You paid"
        amount={`$${total} USDC`}
        tx={tx || undefined}
        actionLabel="Back to group"
        onAction={() => router.replace(`/group/${id}`)}
        accent="emerald"
      />
    </SafeAreaView>
  );
}
