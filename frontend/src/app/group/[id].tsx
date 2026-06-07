import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { GroupAvatar } from '@/components/group-avatar';
import { UserAvatar } from '@/components/user-avatar';
import { ScreenHeader } from '@/components/screen-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton, SkeletonExpenseRow, SkeletonGroupDetail } from '@/components/ui/skeleton';
import { useAuthStore } from '@/store/auth';
import { useGroup, useGroupBalances, useGroupExpenses } from '@/hooks/queries';
import { formatSignedUsdcAmount } from '@/lib/balances';

function paramId(id: string | string[] | undefined): string {
  if (typeof id === 'string') return id;
  return id?.[0] ?? '';
}

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams();
  const groupId = paramId(id);
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'expenses' | 'balances'>('expenses');
  const userId = useAuthStore((s) => s.user?.id);

  const {
    data: detail,
    isLoading: detailLoading,
    isError: detailError,
    refetch: refetchDetail,
  } = useGroup(groupId);
  const {
    data: expenseData,
    isLoading: expensesLoading,
    isError: expensesError,
    refetch: refetchExpenses,
  } = useGroupExpenses(groupId);
  const {
    data: balanceData,
    isLoading: balancesLoading,
    isError: balancesError,
    refetch: refetchBalances,
  } = useGroupBalances(groupId);

  useFocusEffect(
    useCallback(() => {
      if (!groupId) return;
      void refetchDetail();
      void refetchBalances();
      void refetchExpenses();
    }, [groupId, refetchDetail, refetchBalances, refetchExpenses]),
  );

  const group = detail?.group;
  const members = detail?.members ?? [];
  const groupExpenses = expenseData?.expenses ?? [];
  const balanceMembers = balanceData?.members ?? [];

  const myBalance =
    detail?.balances.find((b) => b.user_id === userId)?.net_balance_usdc ??
    balanceMembers.find((b) => b.user_id === userId)?.net_balance_usdc ??
    0;

  const isOwed = myBalance > 0;
  const owes = myBalance < 0;
  const memberCount = members.length;

  const memberProfiles = useMemo(() => {
    const map = new Map<
      string,
      { avatar_url: string | null; display_name: string; username: string | null }
    >();
    for (const m of members) {
      const u = m.user;
      map.set(m.user_id, {
        avatar_url: u?.avatar_url ?? null,
        display_name: u?.display_name ?? 'Member',
        username: u?.username ?? null,
      });
    }
    for (const b of balanceMembers) {
      if (!map.has(b.user_id)) {
        map.set(b.user_id, {
          avatar_url: b.avatar_url ?? null,
          display_name: b.display_name,
          username: b.username ?? null,
        });
      }
    }
    return map;
  }, [members, balanceMembers]);

  if (detailLoading && !group) {
    return (
      <SafeAreaView className="flex-1 bg-slate-900">
        <ScreenHeader title="Group" fallbackHref="/" />
        <SkeletonGroupDetail />
      </SafeAreaView>
    );
  }

  if (detailError && !group) {
    return (
      <SafeAreaView className="flex-1 bg-slate-900">
        <ScreenHeader title="Group" fallbackHref="/" />
        <EmptyState
          icon="alert-circle"
          title="Could not load group"
          description="Check your connection and that the API is running."
          actionLabel="Try again"
          onAction={() => void refetchDetail()}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-900" style={styles.screen}>
      <ScreenHeader
        title={group?.name || 'Group'}
        subtitle={`${memberCount} member${memberCount === 1 ? '' : 's'}`}
        fallbackHref="/"
        rightAction={
          <TouchableOpacity
            style={{ padding: 8 }}
            accessibilityLabel="Edit group"
            onPress={() => router.push(`/group/edit/${groupId}`)}
          >
            <Feather name="settings" size={24} color="#ffffff" />
          </TouchableOpacity>
        }
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator
      >
        <View className="items-center mb-4">
          <GroupAvatar iconUrl={group?.icon_url} name={group?.name} size={88} />
        </View>

        <View className="flex-row flex-wrap justify-center gap-2 mb-6 px-2">
          {members.map((m) => {
            const profile = memberProfiles.get(m.user_id);
            return (
              <View key={m.id} className="items-center" style={{ width: 56 }}>
                <UserAvatar
                  avatarUrl={profile?.avatar_url}
                  displayName={profile?.display_name}
                  username={profile?.username}
                  size={40}
                />
                <Text className="text-white text-[10px] mt-1 text-center" numberOfLines={1}>
                  {m.user_id === userId ? 'You' : profile?.display_name?.split(' ')[0]}
                </Text>
              </View>
            );
          })}
          <TouchableOpacity
            className="items-center"
            style={{ width: 56 }}
            accessibilityLabel="Add member"
            onPress={() => router.push(`/group/add-member?id=${groupId}`)}
          >
            <View className="h-10 w-10 rounded-full bg-slate-800 border border-dashed border-purple-500/50 items-center justify-center">
              <Feather name="user-plus" size={20} color="#a855f7" />
            </View>
            <Text className="text-purple-400 text-[10px] mt-1 text-center font-medium">Add</Text>
          </TouchableOpacity>
        </View>

        {group?.description?.trim() ? (
          <View style={styles.descriptionCard}>
            <View style={styles.descriptionLabelRow}>
              <Feather name="align-left" size={16} color="#ffffff" />
              <Text style={styles.descriptionLabel}>Description</Text>
            </View>
            <Text style={styles.descriptionText}>{group.description.trim()}</Text>
          </View>
        ) : null}

        {detailLoading ? (
          <View className="bg-slate-800 rounded-3xl p-6 mb-6 border border-slate-700">
            <Skeleton width={100} height={12} style={{ alignSelf: 'center', marginBottom: 12 }} />
            <Skeleton width={140} height={36} style={{ alignSelf: 'center', marginBottom: 20 }} />
            <View className="flex-row gap-3">
              <Skeleton height={44} borderRadius={12} style={{ flex: 1 }} />
              <Skeleton height={44} borderRadius={12} style={{ flex: 1 }} />
            </View>
          </View>
        ) : (
          <View className="bg-slate-800 rounded-3xl p-6 mb-6 border border-slate-700 shadow-lg shadow-purple-500/10">
            <Text className="text-white text-sm font-medium mb-2 text-center uppercase tracking-wider">
              Your Balance
            </Text>
            <Text
              className={`text-4xl font-extrabold text-center mb-6 ${isOwed ? 'text-emerald-400' : owes ? 'text-rose-400' : 'text-white'}`}
            >
              {formatSignedUsdcAmount(myBalance)}
            </Text>
            <View className="flex-row gap-3">
              <TouchableOpacity
                className="flex-1 bg-slate-700 py-3 rounded-xl items-center border border-slate-600"
                onPress={() => router.push(`/group/settle?id=${groupId}`)}
              >
                <Text className="text-white font-bold">Settle Up</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 bg-purple-500 py-3 rounded-xl items-center shadow-lg shadow-purple-500/40"
                onPress={() => router.push(`/group/add-expense?id=${groupId}`)}
              >
                <Text className="text-white font-bold">Add Expense</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View className="flex-row bg-slate-800/80 rounded-xl p-1 mb-6 border border-slate-700">
          <TouchableOpacity
            className={`flex-1 py-2 items-center rounded-lg ${activeTab === 'expenses' ? 'bg-slate-700' : ''}`}
            onPress={() => setActiveTab('expenses')}
          >
            <Text className={`font-semibold ${activeTab === 'expenses' ? 'text-white' : 'text-white'}`}>
              Expenses
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`flex-1 py-2 items-center rounded-lg ${activeTab === 'balances' ? 'bg-slate-700' : ''}`}
            onPress={() => setActiveTab('balances')}
          >
            <Text className={`font-semibold ${activeTab === 'balances' ? 'text-white' : 'text-white'}`}>
              Balances
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'expenses' ? (
          expensesLoading ? (
            <>
              <SkeletonExpenseRow />
              <SkeletonExpenseRow />
              <SkeletonExpenseRow />
            </>
          ) : expensesError ? (
            <EmptyState
              icon="alert-circle"
              title="Could not load expenses"
              description="Check your connection and try again."
              actionLabel="Try again"
              onAction={() => void refetchExpenses()}
            />
          ) : groupExpenses.length === 0 ? (
            <EmptyState
              icon="file-text"
              title="No expenses yet"
              description="Add the first expense to start tracking who owes what."
              actionLabel="Add expense"
              onAction={() => router.push(`/group/add-expense?id=${groupId}`)}
            />
          ) : (
            <View className="space-y-4">
              {groupExpenses.map((exp) => {
                const isMe = exp.paid_by === userId;
                const payerName = exp.payer?.display_name ?? (isMe ? 'You' : 'Member');
                const splitAmt = exp.amount_usdc / Math.max(memberCount, 1);
                const youOwe = !isMe ? splitAmt : 0;
                const youLent = isMe ? exp.amount_usdc - splitAmt : 0;

                return (
                  <View
                    key={exp.id}
                    className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50 flex-row items-center justify-between mb-3"
                  >
                    <View className="flex-row items-center flex-1">
                      <View className="mr-3">
                        <UserAvatar
                          avatarUrl={exp.payer?.avatar_url}
                          displayName={payerName}
                          size={40}
                        />
                      </View>
                      <View className="flex-1">
                        <Text className="text-white font-bold text-base mb-0.5">{exp.description}</Text>
                        <Text className="text-white text-xs">
                          {payerName} paid ${exp.amount_usdc.toFixed(2)}
                        </Text>
                      </View>
                    </View>
                    <View className="items-end">
                      {youOwe > 0 && (
                        <Text className="text-rose-400 font-bold">you owe ${youOwe.toFixed(2)}</Text>
                      )}
                      {youLent > 0 && (
                        <Text className="text-emerald-400 font-bold">lent ${youLent.toFixed(2)}</Text>
                      )}
                      {youOwe === 0 && youLent === 0 && (
                        <Text className="text-white font-bold">not involved</Text>
                      )}
                      <Text className="text-white text-xs mt-1">
                        {new Date(exp.date).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )
        ) : balancesLoading ? (
          <>
            <SkeletonExpenseRow />
            <SkeletonExpenseRow />
          </>
        ) : balancesError ? (
          <EmptyState
            icon="alert-circle"
            title="Could not load balances"
            description="Check your connection and try again."
            actionLabel="Try again"
            onAction={() => void refetchBalances()}
          />
        ) : balanceMembers.length === 0 ? (
          <EmptyState
            icon="pie-chart"
            title="No balances"
            description="Balances appear after you add expenses to this group."
          />
        ) : (
          <View className="space-y-4">
            {balanceMembers.map((b) => (
              <View
                key={b.user_id}
                className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50 flex-row items-center justify-between mb-3"
              >
                <View className="flex-row items-center">
                  <View className="mr-3">
                    <UserAvatar
                      avatarUrl={
                        b.avatar_url ?? memberProfiles.get(b.user_id)?.avatar_url
                      }
                      displayName={b.display_name}
                      username={
                        b.username ?? memberProfiles.get(b.user_id)?.username
                      }
                      size={40}
                    />
                  </View>
                  <Text className="text-white font-bold text-base">
                    {b.user_id === userId ? 'You' : b.display_name}
                  </Text>
                </View>
                <Text
                  className={`font-bold ${b.net_balance_usdc > 0 ? 'text-emerald-400' : b.net_balance_usdc < 0 ? 'text-rose-400' : 'text-white'}`}
                >
                  {Math.abs(b.net_balance_usdc) < 0.000001
                    ? 'settled up'
                    : formatSignedUsdcAmount(b.net_balance_usdc)}
                </Text>
              </View>
            ))}
          </View>
        )}

        <View className="h-12" />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    width: '100%',
    maxWidth: '100%',
    overflow: 'hidden',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 12,
    width: '100%',
    maxWidth: '100%',
    alignSelf: 'center',
  },
  descriptionCard: {
    width: '100%',
    maxWidth: '100%',
    alignSelf: 'stretch',
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(51, 65, 85, 0.5)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    overflow: 'hidden',
  },
  descriptionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  descriptionLabel: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  descriptionText: {
    color: '#ffffff',
    fontSize: 16,
    lineHeight: 24,
    width: '100%',
    maxWidth: '100%',
    flexShrink: 1,
    ...(Platform.OS === 'web'
      ? {
          wordBreak: 'break-word',
          overflowWrap: 'break-word',
          whiteSpace: 'pre-wrap',
        }
      : {}),
  },
});
