import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { ScreenHeader } from '@/components/screen-header';
import { LoadingButton } from '@/components/ui/loading-button';
import { EmptyState } from '@/components/ui/empty-state';
import { UserAvatar } from '@/components/user-avatar';
import { useAuthStore } from '@/store/auth';
import { useCreateExpense, useGroup } from '@/hooks/queries';
import { showErrorAlert } from '@/lib/errors';
import {
  parseNonNegativeAmount,
  parsePositiveAmount,
  sanitizeAmountInput,
} from '@/lib/amount-input';
import type { ApiGroupMember } from '@/types/api';

function paramId(id: string | string[] | undefined): string {
  if (typeof id === 'string') return id;
  return id?.[0] ?? '';
}

const amountKeyboardType = Platform.OS === 'ios' ? 'decimal-pad' : 'numeric';

type SplitType = 'equal' | 'exact' | 'percentage';

function equalAmountPerMember(total: number, memberCount: number): string {
  if (memberCount <= 0) return '0.00';
  return (total / memberCount).toFixed(2);
}

function equalPercentPerMember(memberCount: number): string {
  if (memberCount <= 0) return '0';
  return (100 / memberCount).toFixed(2);
}

function buildEqualAmountMap(members: ApiGroupMember[], total: number): Record<string, string> {
  const share = equalAmountPerMember(total, members.length);
  return Object.fromEntries(members.map((m) => [m.user_id, share]));
}

function buildEqualPercentMap(members: ApiGroupMember[]): Record<string, string> {
  const share = equalPercentPerMember(members.length);
  return Object.fromEntries(members.map((m) => [m.user_id, share]));
}

function memberLabel(member: ApiGroupMember, userId: string | undefined): string {
  if (member.user_id === userId) return 'You';
  return member.user?.display_name ?? 'Member';
}

const screenStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  flex: {
    flex: 1,
    width: '100%',
  },
  footer: {
    width: '100%',
    alignSelf: 'stretch',
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: '#0f172a',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#1e293b',
  },
});

export default function AddExpenseScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams();
  const groupId = paramId(id);
  const userId = useAuthStore((s) => s.user?.id);
  const createExpense = useCreateExpense(groupId);
  const { data: groupData, isError: groupError, refetch: refetchGroup } = useGroup(groupId);
  const members = groupData?.members ?? [];
  const memberCount = members.length || 1;

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [splitType, setSplitType] = useState<SplitType>('equal');
  const [splitAmounts, setSplitAmounts] = useState<Record<string, string>>({});
  const [splitPercentages, setSplitPercentages] = useState<Record<string, string>>({});

  const parsedAmount = parsePositiveAmount(amount);
  const groupHref = `/group/${groupId}` as const;

  const handleSplitTypeChange = useCallback(
    (type: SplitType) => {
      setSplitType(type);
      if (type === 'exact' && parsedAmount !== null) {
        setSplitAmounts(buildEqualAmountMap(members, parsedAmount));
      }
      if (type === 'percentage') {
        setSplitPercentages(buildEqualPercentMap(members));
      }
    },
    [members, parsedAmount],
  );

  useEffect(() => {
    if (splitType !== 'exact' || parsedAmount === null || members.length === 0) return;
    setSplitAmounts((prev) => {
      const hasValues = members.every((m) => (prev[m.user_id] ?? '').trim() !== '');
      if (hasValues) return prev;
      return buildEqualAmountMap(members, parsedAmount);
    });
  }, [splitType, parsedAmount, members]);

  useEffect(() => {
    if (splitType !== 'percentage' || members.length === 0) return;
    setSplitPercentages((prev) => {
      const hasValues = members.every((m) => (prev[m.user_id] ?? '').trim() !== '');
      if (hasValues) return prev;
      return buildEqualPercentMap(members);
    });
  }, [splitType, members]);

  const exactTotal = useMemo(() => {
    if (splitType !== 'exact') return 0;
    return members.reduce(
      (sum, m) => sum + (parseNonNegativeAmount(splitAmounts[m.user_id] ?? '') ?? 0),
      0,
    );
  }, [splitType, members, splitAmounts]);

  const percentTotal = useMemo(() => {
    if (splitType !== 'percentage') return 0;
    return members.reduce(
      (sum, m) => sum + (parseNonNegativeAmount(splitPercentages[m.user_id] ?? '') ?? 0),
      0,
    );
  }, [splitType, members, splitPercentages]);

  const isSplitValid = useMemo(() => {
    if (splitType === 'equal') return true;
    if (parsedAmount === null) return false;
    if (splitType === 'exact') {
      return Math.abs(exactTotal - parsedAmount) <= 0.01;
    }
    return Math.abs(percentTotal - 100) <= 0.01;
  }, [splitType, parsedAmount, exactTotal, percentTotal]);

  const isValid =
    description.trim().length > 0 && parsedAmount !== null && !!userId && isSplitValid;

  const handleSave = async () => {
    if (!userId || parsedAmount === null || !isSplitValid) return;

    const body: Parameters<typeof createExpense.mutateAsync>[0] = {
      description: description.trim(),
      amount: parsedAmount,
      paid_by_user_id: userId,
      split_type: splitType,
    };

    if (splitType === 'exact') {
      body.splits = members.map((m) => ({
        user_id: m.user_id,
        amount: parseNonNegativeAmount(splitAmounts[m.user_id] ?? '') ?? 0,
      }));
    } else if (splitType === 'percentage') {
      body.splits = members.map((m) => ({
        user_id: m.user_id,
        percentage: parseNonNegativeAmount(splitPercentages[m.user_id] ?? '') ?? 0,
      }));
    }

    try {
      await createExpense.mutateAsync(body);
      router.replace(groupHref);
    } catch (err) {
      showErrorAlert(err, 'Failed to save expense');
    }
  };

  if (groupError) {
    return (
      <SafeAreaView style={screenStyles.screen}>
        <ScreenHeader title="Add Expense" variant="close" fallbackHref={groupHref} />
        <EmptyState
          icon="alert-circle"
          title="Could not load group"
          description="Check your connection and try again."
          actionLabel="Try again"
          onAction={() => void refetchGroup()}
        />
      </SafeAreaView>
    );
  }

  const exactRemaining =
    parsedAmount !== null && splitType === 'exact' ? parsedAmount - exactTotal : null;
  const percentRemaining = splitType === 'percentage' ? 100 - percentTotal : null;

  const footerBottomPad = Math.max(
    insets.bottom,
    Platform.OS === 'android' ? 28 : 16,
  );

  return (
    <SafeAreaView style={screenStyles.screen} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={screenStyles.flex}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <ScreenHeader title="Add Expense" variant="close" fallbackHref={groupHref} />

        <ScrollView className="flex-1 px-4 pt-6" keyboardShouldPersistTaps="handled">
          <View className="items-center mb-8">
            <Text className="text-white font-medium mb-2">Total Amount (USDC)</Text>
            <View className="flex-row items-center">
              <Text className="text-4xl text-emerald-400 font-bold mr-1">$</Text>
              <TextInput
                className="text-5xl font-extrabold text-white min-w-[120px] text-center"
                placeholder="0.00"
                placeholderTextcolor="#ffffff"
                keyboardType={amountKeyboardType}
                inputMode="decimal"
                value={amount}
                onChangeText={(t) => setAmount(sanitizeAmountInput(t))}
                autoFocus
              />
            </View>
          </View>

          <View className="mb-6">
            <Text className="text-white font-medium mb-2 ml-1">Description</Text>
            <View className="bg-slate-800 rounded-2xl border border-slate-700 px-4 py-3 flex-row items-center">
              <Feather name="align-left" size={20} color="#ffffff" style={{ marginRight: 12 }} />
              <TextInput
                className="flex-1 text-white text-lg"
                placeholder="Dinner, Airbnb, Taxi..."
                placeholderTextcolor="#ffffff"
                value={description}
                onChangeText={setDescription}
              />
            </View>
          </View>

          <View className="mb-6">
            <Text className="text-white font-medium mb-2 ml-1">Paid by</Text>
            <View className="bg-slate-800 rounded-2xl border border-slate-700 px-4 py-4 flex-row items-center">
              <View className="h-8 w-8 rounded-full bg-purple-500 items-center justify-center mr-3">
                <Text className="text-white font-bold text-xs">You</Text>
              </View>
              <Text className="text-white text-lg">You</Text>
            </View>
          </View>

          <View className="mb-6">
            <Text className="text-white font-medium mb-2 ml-1">Split</Text>
            <View className="flex-row bg-slate-800 p-1 rounded-2xl border border-slate-700">
              {(['equal', 'exact', 'percentage'] as const).map((type) => (
                <TouchableOpacity
                  key={type}
                  className={`flex-1 py-3 items-center rounded-xl ${splitType === type ? 'bg-purple-500' : ''}`}
                  onPress={() => handleSplitTypeChange(type)}
                >
                  <Text className={`font-bold ${splitType === type ? 'text-white' : 'text-white'}`}>
                    {type === 'percentage' ? '%' : type.charAt(0).toUpperCase() + type.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {splitType === 'equal' && parsedAmount ? (
            <View className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50 items-center mb-6">
              <Text className="text-white mb-1">{memberCount} people will pay</Text>
              <Text className="text-white font-bold text-xl">
                ${(parsedAmount / memberCount).toFixed(2)} / each
              </Text>
            </View>
          ) : null}

          {splitType === 'exact' ? (
            <View className="mb-6">
              <Text className="text-white font-medium mb-2 ml-1">Split by exact amounts</Text>
              {members.map((member) => (
                <View
                  key={member.user_id}
                  className="bg-slate-800 rounded-2xl border border-slate-700 px-4 py-3 flex-row items-center mb-2"
                >
                  <UserAvatar
                    avatarUrl={member.user?.avatar_url}
                    displayName={member.user?.display_name}
                    username={member.user?.username}
                    size={36}
                  />
                  <Text className="flex-1 text-white text-base ml-3">
                    {memberLabel(member, userId)}
                  </Text>
                  <Text className="text-emerald-400 font-bold mr-1">$</Text>
                  <TextInput
                    className="text-white text-lg font-semibold min-w-[72px] text-right"
                    placeholder="0.00"
                    placeholderTextcolor="#ffffff"
                    keyboardType={amountKeyboardType}
                    inputMode="decimal"
                    value={splitAmounts[member.user_id] ?? ''}
                    onChangeText={(t) =>
                      setSplitAmounts((prev) => ({
                        ...prev,
                        [member.user_id]: sanitizeAmountInput(t),
                      }))
                    }
                  />
                </View>
              ))}
              {parsedAmount !== null ? (
                <Text
                  className={`text-sm mt-2 ml-1 ${exactRemaining !== null && Math.abs(exactRemaining) <= 0.01 ? 'text-emerald-400' : 'text-amber-400'}`}
                >
                  {exactRemaining !== null && Math.abs(exactRemaining) <= 0.01
                    ? 'Amounts add up correctly'
                    : `Remaining: $${Math.abs(exactRemaining ?? 0).toFixed(2)}${(exactRemaining ?? 0) < 0 ? ' over' : ''}`}
                </Text>
              ) : (
                <Text className="text-sm mt-2 ml-1 text-white">Enter a total amount first</Text>
              )}
            </View>
          ) : null}

          {splitType === 'percentage' ? (
            <View className="mb-6">
              <Text className="text-white font-medium mb-2 ml-1">Split by percentage</Text>
              {members.map((member) => (
                <View
                  key={member.user_id}
                  className="bg-slate-800 rounded-2xl border border-slate-700 px-4 py-3 flex-row items-center mb-2"
                >
                  <UserAvatar
                    avatarUrl={member.user?.avatar_url}
                    displayName={member.user?.display_name}
                    username={member.user?.username}
                    size={36}
                  />
                  <Text className="flex-1 text-white text-base ml-3">
                    {memberLabel(member, userId)}
                  </Text>
                  <TextInput
                    className="text-white text-lg font-semibold min-w-[56px] text-right"
                    placeholder="0"
                    placeholderTextcolor="#ffffff"
                    keyboardType={amountKeyboardType}
                    inputMode="decimal"
                    value={splitPercentages[member.user_id] ?? ''}
                    onChangeText={(t) =>
                      setSplitPercentages((prev) => ({
                        ...prev,
                        [member.user_id]: sanitizeAmountInput(t),
                      }))
                    }
                  />
                  <Text className="text-white font-bold ml-1">%</Text>
                </View>
              ))}
              <Text
                className={`text-sm mt-2 ml-1 ${Math.abs(percentRemaining ?? 100) <= 0.01 ? 'text-emerald-400' : 'text-amber-400'}`}
              >
                {Math.abs(percentRemaining ?? 100) <= 0.01
                  ? 'Percentages add up to 100%'
                  : `Remaining: ${Math.abs(percentRemaining ?? 100).toFixed(2)}%${(percentRemaining ?? 0) < 0 ? ' over' : ''}`}
              </Text>
            </View>
          ) : null}

          <View className="h-20" />
        </ScrollView>

        <View style={[screenStyles.footer, { paddingBottom: footerBottomPad }]}>
          <LoadingButton
            label="Save Expense"
            loading={createExpense.isPending}
            disabled={!isValid}
            onPress={handleSave}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
