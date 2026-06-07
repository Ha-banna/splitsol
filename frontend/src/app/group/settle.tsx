import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { ScreenHeader } from '@/components/screen-header';
import { UserAvatar } from '@/components/user-avatar';
import { PaymentConfirmModal } from '@/components/payment-confirm-modal';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingButton } from '@/components/ui/loading-button';
import { Skeleton, SkeletonExpenseRow } from '@/components/ui/skeleton';
import { useAuthStore } from '@/store/auth';
import {
  useConfirmSettlement,
  useGroupBalances,
  usePrepareSettlement,
} from '@/hooks/queries';
import { showAppAlert } from '@/lib/app-alert';
import { formatPaymentError, resolvePaymentSignature, type PreparedPayment } from '@/lib/payments';

const PLATFORM_FEE = 0.25;

function paramId(id: string | string[] | undefined): string {
  if (typeof id === 'string') return id;
  return id?.[0] ?? '';
}

export default function SettleUpScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const groupId = paramId(id);
  const userId = useAuthStore((s) => s.user?.id);
  const walletAddress = useAuthStore((s) => s.user?.wallet_address);
  const { data: balances, isLoading, isError, refetch } = useGroupBalances(groupId);
  const { mutateAsync: prepareSettlementAsync } = usePrepareSettlement(groupId);
  const confirmSettlement = useConfirmSettlement(groupId);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [preparedPayment, setPreparedPayment] = useState<PreparedPayment | null>(null);
  const [preparingPayment, setPreparingPayment] = useState(false);
  const [prepareError, setPrepareError] = useState<string | null>(null);
  const [signingPayment, setSigningPayment] = useState(false);

  const myDebts = useMemo(() => {
    if (!balances || !userId) return [];
    return balances.simplified_debts.filter((d) => d.from_user_id === userId);
  }, [balances, userId]);

  const memberById = useMemo(() => {
    const map = new Map<
      string,
      { display_name: string; avatar_url: string | null; username: string | null }
    >();
    balances?.members.forEach((m) =>
      map.set(m.user_id, {
        display_name: m.display_name,
        avatar_url: m.avatar_url ?? null,
        username: m.username ?? null,
      }),
    );
    return map;
  }, [balances]);

  const debtTotal = myDebts.reduce((sum, d) => sum + d.amount_usdc, 0);
  const total = debtTotal + (myDebts.length > 0 ? PLATFORM_FEE : 0);
  const groupHref = `/group/${groupId}` as const;
  const busy = preparingPayment || signingPayment || confirmSettlement.isPending;

  const fail = (title: string, message: string) => {
    setError(message);
    showAppAlert(title, message);
  };

  const submitPayment = async (prepared: PreparedPayment) => {
    if (!walletAddress?.trim()) return;

    setSigningPayment(true);
    try {
      const tx = await resolvePaymentSignature(prepared, 'devmock', walletAddress);
      await confirmSettlement.mutateAsync(tx);
      router.replace(
        `/group/success?id=${groupId}&tx=${encodeURIComponent(tx)}&total=${total.toFixed(2)}`,
      );
    } catch (err) {
      const message = formatPaymentError(err);
      fail('Settlement failed', message);
    } finally {
      setSigningPayment(false);
    }
  };

  const handleConfirm = () => {
    setError(null);

    if (myDebts.length === 0) {
      fail('Nothing to settle', 'You have no outstanding debts in this group.');
      return;
    }
    if (!walletAddress?.trim()) {
      fail('Wallet required', 'Connect a wallet before settling.');
      return;
    }
    if (preparingPayment || !preparedPayment) {
      return;
    }
    if (prepareError) {
      fail('Could not prepare payment', prepareError);
      return;
    }

    setConfirmOpen(false);
    void submitPayment(preparedPayment);
  };

  const openConfirm = () => {
    if (myDebts.length === 0 || isLoading || isError) return;
    if (!walletAddress?.trim()) {
      fail('Wallet required', 'Connect a wallet before settling.');
      return;
    }
    setPreparedPayment(null);
    setPrepareError(null);
    setPreparingPayment(true);
    setConfirmOpen(true);

    void prepareSettlementAsync(walletAddress)
      .then((prepared) => {
        setPreparedPayment(prepared);
      })
      .catch((err) => {
        setPrepareError(formatPaymentError(err));
      })
      .finally(() => {
        setPreparingPayment(false);
      });
  };

  const confirmReady = !!preparedPayment && !preparingPayment && !prepareError;

  return (
    <SafeAreaView className="flex-1 bg-slate-900">
      <ScreenHeader title="Settle Up" variant="close" fallbackHref={groupHref} />

      <ScrollView className="flex-1 px-4 pt-6">
        {error ? (
          <View className="bg-rose-500/15 rounded-2xl p-4 mb-4 border border-rose-500/40 flex-row gap-3">
            <Feather name="alert-circle" size={22} color="#fb7185" style={{ marginTop: 2 }} />
            <Text className="text-rose-300 flex-1 text-sm leading-5">{error}</Text>
          </View>
        ) : null}

        <Text className="text-white font-medium mb-4 uppercase tracking-wider">
          You are settling
        </Text>

        {isLoading ? (
          <View className="bg-slate-800 rounded-3xl p-4 mb-6 border border-slate-700">
            <SkeletonExpenseRow />
            <SkeletonExpenseRow />
            <Skeleton width="100%" height={48} borderRadius={12} style={{ marginTop: 12 }} />
          </View>
        ) : isError ? (
          <EmptyState
            icon="alert-circle"
            title="Could not load balances"
            description="We could not load what you owe. Check your connection and try again."
            actionLabel="Try again"
            onAction={() => void refetch()}
          />
        ) : myDebts.length === 0 ? (
          <EmptyState
            icon="check-circle"
            title="All settled up"
            description="You do not owe anyone in this group right now."
          />
        ) : (
          <View className="bg-slate-800 rounded-3xl p-4 mb-6 border border-slate-700 shadow-lg">
            {myDebts.map((debt, index) => {
              const member = memberById.get(debt.to_user_id);
              return (
                <View
                  key={debt.to_user_id}
                  className={`flex-row justify-between items-center py-3 ${index < myDebts.length - 1 ? 'border-b border-slate-700/50' : ''}`}
                >
                  <View className="flex-row items-center flex-1 mr-3">
                    <UserAvatar
                      avatarUrl={member?.avatar_url}
                      displayName={member?.display_name}
                      username={member?.username}
                      size={36}
                    />
                    <Text className="text-white font-bold text-lg ml-3 flex-1" numberOfLines={1}>
                      {member?.display_name ?? 'Member'}
                    </Text>
                  </View>
                  <Text className="text-white text-lg font-bold">
                    {debt.amount_usdc.toFixed(2)} USDC
                  </Text>
                </View>
              );
            })}

            <View className="flex-row justify-between items-center py-4">
              <Text className="text-white font-medium">Platform Fee</Text>
              <Text className="text-white font-medium">{PLATFORM_FEE.toFixed(2)} USDC</Text>
            </View>

            <View className="flex-row justify-between items-center pt-4 border-t border-slate-700 border-dashed">
              <Text className="text-white font-bold text-xl">Total</Text>
              <Text className="text-purple-400 font-extrabold text-2xl">{total.toFixed(2)} USDC</Text>
            </View>
          </View>
        )}

        {__DEV__ ? (
          <View className="bg-amber-500/10 rounded-2xl p-4 border border-amber-500/20 mb-8 flex-row items-center">
            <Feather name="info" size={20} color="#fbbf24" style={{ marginRight: 12 }} />
            <Text className="text-amber-200/90 flex-1 text-sm">
              Dev mode: without Solana RPC, settlement is recorded locally. With RPC + wallet,
              you need enough USDC for the total above plus a small amount of SOL for fees.
            </Text>
          </View>
        ) : null}
      </ScrollView>

      <View className="p-4 bg-slate-900 border-t border-slate-800">
        <LoadingButton
          label="Review & pay"
          loading={busy}
          disabled={myDebts.length === 0 || isLoading || isError}
          onPress={openConfirm}
        />
      </View>

      <PaymentConfirmModal
        visible={confirmOpen}
        title="Confirm settlement"
        amount={`$${total.toFixed(2)} USDC`}
        subtitle={`Pay ${myDebts.length} ${myDebts.length === 1 ? 'person' : 'people'} in this group, including the platform fee.`}
        confirmLabel={preparingPayment ? 'Preparing…' : 'Confirm & pay'}
        loading={busy}
        confirmDisabled={!confirmReady}
        onConfirm={handleConfirm}
        onCancel={() => setConfirmOpen(false)}
      >
        {prepareError ? (
          <View className="bg-rose-500/10 rounded-xl px-4 py-3 mb-2 border border-rose-500/30">
            <Text className="text-rose-300 text-sm">{prepareError}</Text>
          </View>
        ) : null}
        <View className="bg-slate-900/60 rounded-xl px-4 py-3 mb-2 border border-slate-700 gap-2">
          {myDebts.map((debt) => {
            const member = memberById.get(debt.to_user_id);
            return (
              <View key={debt.to_user_id} className="flex-row justify-between items-center">
                <Text className="text-white flex-1 mr-2" numberOfLines={1}>
                  {member?.display_name ?? 'Member'}
                </Text>
                <Text className="text-white font-semibold">
                  ${debt.amount_usdc.toFixed(2)}
                </Text>
              </View>
            );
          })}
          <View className="border-t border-slate-700 pt-2 flex-row justify-between">
            <Text className="text-white">Platform fee</Text>
            <Text className="text-white">${PLATFORM_FEE.toFixed(2)}</Text>
          </View>
        </View>
      </PaymentConfirmModal>
    </SafeAreaView>
  );
}
