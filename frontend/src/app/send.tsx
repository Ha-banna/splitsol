import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { ScreenHeader } from '@/components/screen-header';
import { UserAvatar } from '@/components/user-avatar';
import { PaymentConfirmModal } from '@/components/payment-confirm-modal';
import { LoadingButton } from '@/components/ui/loading-button';
import {
  useConfirmTransfer,
  useContacts,
  usePrepareTransfer,
  useSearchUsers,
} from '@/hooks/queries';
import { showAppAlert } from '@/lib/app-alert';
import { parsePositiveAmount, sanitizeAmountInput } from '@/lib/amount-input';
import { formatPaymentError, resolvePaymentSignature, type PreparedPayment } from '@/lib/payments';
import { formatUsername, normalizeUsername } from '@/lib/username';
import { useAuthStore } from '@/store/auth';
import type { PublicUserProfile } from '@/types/api';

function paramId(id: string | string[] | undefined): string | undefined {
  if (typeof id === 'string') return id;
  return id?.[0];
}

const amountKeyboardType = Platform.OS === 'ios' ? 'decimal-pad' : 'numeric';

export default function SendScreen() {
  const router = useRouter();
  const walletAddress = useAuthStore((s) => s.user?.wallet_address);
  const { toUserId } = useLocalSearchParams<{ toUserId?: string }>();
  const {
    data: contacts = [],
    isError: contactsError,
    refetch: refetchContacts,
  } = useContacts();
  const preselected = contacts.find((c) => c.user.id === paramId(toUserId))?.user ?? null;
  const [recipientQuery, setRecipientQuery] = useState('');
  const [selected, setSelected] = useState<PublicUserProfile | null>(null);

  useEffect(() => {
    if (preselected) setSelected(preselected);
  }, [preselected?.id]);

  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [preparedPayment, setPreparedPayment] = useState<PreparedPayment | null>(null);
  const [preparingPayment, setPreparingPayment] = useState(false);
  const [prepareError, setPrepareError] = useState<string | null>(null);
  const [signingPayment, setSigningPayment] = useState(false);

  const searchQ = recipientQuery.trim();
  const {
    data: searchResults = [],
    isError: searchError,
    refetch: refetchSearch,
  } = useSearchUsers(searchQ);

  const { mutateAsync: prepareTransferAsync } = usePrepareTransfer();
  const confirmTransfer = useConfirmTransfer();

  const suggestions = useMemo(() => {
    if (selected) return [];
    const q = normalizeUsername(searchQ);
    const fromContacts = contacts
      .map((c) => c.user)
      .filter(
        (u) =>
          !q ||
          u.username?.includes(q) ||
          u.display_name.toLowerCase().includes(q.toLowerCase()),
      );
    const seen = new Set<string>();
    return [...fromContacts, ...searchResults].filter((u) => {
      if (seen.has(u.id)) return false;
      seen.add(u.id);
      return true;
    });
  }, [contacts, searchResults, searchQ, selected]);

  const parsedAmount = parsePositiveAmount(amount);
  const canSend = !!selected && parsedAmount !== null;
  const busy = preparingPayment || signingPayment || confirmTransfer.isPending;

  const recipientLabel =
    selected ? formatUsername(selected.username) || selected.display_name : '';

  const submitPayment = async (prepared: PreparedPayment) => {
    if (!selected || parsedAmount === null) return;

    setSigningPayment(true);
    try {
      const tx = await resolvePaymentSignature(prepared, 'devmock_send', walletAddress ?? undefined);
      await confirmTransfer.mutateAsync({
        to_user_id: selected.id,
        amount_usdc: parsedAmount,
        tx_signature: tx,
        note: note.trim() || undefined,
      });
      router.replace(
        `/send-success?amount=${encodeURIComponent(parsedAmount.toFixed(2))}&to=${encodeURIComponent(recipientLabel)}&tx=${encodeURIComponent(tx)}` as Href,
      );
    } catch (err) {
      const message = formatPaymentError(err);
      setError(message);
      showAppAlert('Transfer failed', message);
    } finally {
      setSigningPayment(false);
    }
  };

  const handleSend = () => {
    if (!selected || parsedAmount === null) return;
    if (preparingPayment || !preparedPayment) return;
    if (prepareError) {
      setError(prepareError);
      showAppAlert('Transfer failed', prepareError);
      return;
    }

    setError(null);
    setConfirmOpen(false);
    void submitPayment(preparedPayment);
  };

  const confirmReady = !!preparedPayment && !preparingPayment && !prepareError;

  const openConfirm = () => {
    if (!canSend || !selected || parsedAmount === null) return;

    setPreparedPayment(null);
    setPrepareError(null);
    setPreparingPayment(true);
    setConfirmOpen(true);

    void prepareTransferAsync({
      to_user_id: selected.id,
      amount_usdc: parsedAmount,
      note: note.trim() || undefined,
    })
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

  return (
    <SafeAreaView className="flex-1 bg-slate-900">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScreenHeader title="Send USDC" variant="close" fallbackHref="/" />

        <ScrollView className="flex-1 px-4 pt-4" keyboardShouldPersistTaps="handled">
          {error ? (
            <View className="bg-rose-500/15 rounded-2xl p-4 mb-4 border border-rose-500/40">
              <Text className="text-rose-300 text-sm leading-5">{error}</Text>
            </View>
          ) : null}

          {contactsError && !selected ? (
            <View className="bg-rose-500/10 rounded-2xl p-4 mb-4 border border-rose-500/30">
              <Text className="text-rose-300 text-sm mb-3">
                Could not load your friends list.
              </Text>
              <TouchableOpacity onPress={() => void refetchContacts()}>
                <Text className="text-rose-200 font-semibold">Try again</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          <Text className="text-white font-medium mb-2 ml-1">To</Text>
          {selected ? (
            <TouchableOpacity
              className="bg-slate-800 rounded-2xl p-4 border border-purple-500/40 flex-row items-center mb-4"
              onPress={() => setSelected(null)}
            >
              <UserAvatar
                avatarUrl={selected.avatar_url}
                displayName={selected.display_name}
                username={selected.username}
                size={44}
              />
              <View className="ml-3 flex-1">
                <Text className="text-white font-bold text-lg">{selected.display_name}</Text>
                {selected.username ? (
                  <Text className="text-purple-400">{formatUsername(selected.username)}</Text>
                ) : null}
              </View>
              <Text className="text-white text-sm">Change</Text>
            </TouchableOpacity>
          ) : (
            <>
              <TextInput
                className="bg-slate-800 text-white rounded-2xl px-4 py-3 border border-slate-700 mb-2"
                placeholder="@username or name"
                placeholderTextColor="#ffffff"
                autoCapitalize="none"
                value={recipientQuery}
                onChangeText={setRecipientQuery}
              />
              {searchQ.length >= 2 && searchError ? (
                <View className="bg-rose-500/10 rounded-xl p-3 mb-2 border border-rose-500/30">
                  <Text className="text-rose-300 text-sm mb-2">Search unavailable right now.</Text>
                  <TouchableOpacity onPress={() => void refetchSearch()}>
                    <Text className="text-rose-200 font-semibold text-sm">Try again</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
              {suggestions.slice(0, 8).map((u) => (
                <TouchableOpacity
                  key={u.id}
                  className="bg-slate-800/80 rounded-xl p-3 mb-2 flex-row items-center border border-slate-700/50"
                  onPress={() => {
                    setSelected(u);
                    setRecipientQuery('');
                  }}
                >
                  <UserAvatar
                    avatarUrl={u.avatar_url}
                    displayName={u.display_name}
                    username={u.username}
                    size={40}
                  />
                  <View className="ml-3 flex-1">
                    <Text className="text-white font-semibold">{u.display_name}</Text>
                    {u.username ? (
                      <Text className="text-white text-sm">{formatUsername(u.username)}</Text>
                    ) : null}
                  </View>
                </TouchableOpacity>
              ))}
            </>
          )}

          <Text className="text-white font-medium mb-2 ml-1 mt-4">Amount (USDC)</Text>
          <TextInput
            className="bg-slate-800 text-white text-2xl font-bold rounded-2xl px-4 py-4 border border-slate-700 mb-4"
            placeholder="0.00"
            placeholderTextColor="#ffffff"
            keyboardType={amountKeyboardType}
            inputMode="decimal"
            value={amount}
            onChangeText={(t) => setAmount(sanitizeAmountInput(t))}
          />

          <Text className="text-white font-medium mb-2 ml-1">Note (optional)</Text>
          <TextInput
            className="bg-slate-800 text-white rounded-2xl px-4 py-3 border border-slate-700 mb-6"
            placeholder="Dinner, rent, thanks..."
            placeholderTextColor="#ffffff"
            value={note}
            onChangeText={setNote}
          />

          {__DEV__ ? (
            <Text className="text-white text-xs mb-4 leading-5">
              Dev: without Solana RPC on the server, sends are recorded without chain transfer. With
              RPC + browser wallet, you sign on-chain and must have enough USDC.
            </Text>
          ) : null}
        </ScrollView>

        <View className="p-4 border-t border-slate-800">
          <LoadingButton
            label="Review & send"
            loading={busy}
            disabled={!canSend}
            onPress={openConfirm}
          />
        </View>

        <PaymentConfirmModal
          visible={confirmOpen}
          title="Confirm send"
          amount={`$${parsedAmount?.toFixed(2) ?? '0.00'} USDC`}
          subtitle={`Send to ${recipientLabel}? You'll sign the transfer in your wallet.`}
          confirmLabel={preparingPayment ? 'Preparing…' : 'Send USDC'}
          loading={busy}
          confirmDisabled={!confirmReady}
          onConfirm={handleSend}
          onCancel={() => setConfirmOpen(false)}
        >
          {note.trim() ? (
            <View className="bg-slate-900/60 rounded-xl px-4 py-3 mb-2 border border-slate-700">
              <Text className="text-white text-xs uppercase font-bold mb-1">Note</Text>
              <Text className="text-white">{note.trim()}</Text>
            </View>
          ) : null}
        </PaymentConfirmModal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
