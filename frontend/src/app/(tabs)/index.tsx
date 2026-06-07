import React, { useCallback, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Link, useRouter, type Href } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppLogo } from '@/components/app-logo';
import { GroupAvatar } from '@/components/group-avatar';
import { EmptyState } from '@/components/ui/empty-state';
import { SkeletonBalanceCard, SkeletonGroupRow } from '@/components/ui/skeleton';
import { useGroups } from '@/hooks/queries';
import { useAuthStore } from '@/store/auth';
import { UserAvatar } from '@/components/user-avatar';
import { formatUsdcAmount, formatSignedUsdcAmount, sumGroupBalances } from '@/lib/balances';
import { toUiUser } from '@/lib/mappers';

export default function HomeScreen() {
  const router = useRouter();
  const authUser = useAuthStore((s) => s.user);
  const uiUser = authUser ? toUiUser(authUser) : null;
  const { data: groups = [], isLoading, isError, refetch } = useGroups();

  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch]),
  );

  const { totalOwedToMe, totalIOwe } = useMemo(() => sumGroupBalances(groups), [groups]);

  return (
    <SafeAreaView className="flex-1 bg-slate-900">
      <ScrollView className="flex-1 px-4 pt-6">
        <View style={styles.homeHeader} className="mb-8">
          <AppLogo size={36} showWordmark wordmarkSize="sm" layout="row" />
          <View className="flex-row items-center gap-2">
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/profile' as Href)}
              accessibilityLabel="Profile"
            >
              <UserAvatar
                avatarUrl={uiUser?.avatarUrl}
                displayName={uiUser?.name}
                username={uiUser?.username}
                size={40}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push('/send' as Href)}
              className="h-11 w-11 rounded-full bg-purple-500/20 border border-purple-500/40 items-center justify-center"
              accessibilityLabel="Send USDC"
            >
              <Feather name="send" size={20} color="#a855f7" />
            </TouchableOpacity>
          </View>
        </View>

        {isLoading ? (
          <SkeletonBalanceCard />
        ) : isError ? (
          <View className="bg-rose-500/10 rounded-3xl p-6 mb-8 border border-rose-500/30 items-center">
            <Text className="text-rose-300 text-center mb-4">
              Could not load your balances. Check your connection and try again.
            </Text>
            <TouchableOpacity
              onPress={() => void refetch()}
              className="bg-rose-500/20 border border-rose-500/40 px-5 py-2.5 rounded-xl"
            >
              <Text className="text-rose-200 font-bold">Try again</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View className="bg-slate-800 rounded-3xl p-6 mb-8 border border-slate-700 shadow-lg shadow-purple-500/20">
            <Text className="text-white text-sm font-medium mb-4 uppercase tracking-wider">
              Total Balance
            </Text>
            <View style={styles.balanceRow}>
              <View style={styles.balanceCol}>
                <Text className="text-emerald-400 text-sm mb-1 font-medium">You are owed</Text>
                <Text className="text-2xl font-bold text-emerald-400" numberOfLines={1}>
                  {formatUsdcAmount(totalOwedToMe)}
                </Text>
              </View>
              <View style={styles.balanceDivider} />
              <View style={styles.balanceCol}>
                <Text className="text-rose-400 text-sm mb-1 font-medium text-right">You owe</Text>
                <Text
                  className="text-2xl font-bold text-rose-400 text-right"
                  numberOfLines={1}
                >
                  {formatUsdcAmount(totalIOwe)}
                </Text>
              </View>
            </View>
          </View>
        )}

        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-xl font-bold text-white">Your Groups</Text>
        </View>

        {isLoading ? (
          <>
            <SkeletonGroupRow />
            <SkeletonGroupRow />
            <SkeletonGroupRow />
          </>
        ) : isError ? (
          <EmptyState
            icon="alert-circle"
            title="Could not load groups"
            description="Check your connection and that the API is running."
            actionLabel="Try again"
            onAction={() => refetch()}
          />
        ) : groups.length === 0 ? (
          <EmptyState
            icon="users"
            title="No groups yet"
            description="Create a group to start splitting expenses with friends."
            actionLabel="Create group"
            onAction={() => router.push('/group/create')}
          />
        ) : (
          <View className="space-y-4">
            {groups.map((group) => {
              const myBalance = Number(group.my_balance_usdc ?? 0);
              return (
                <Link key={group.id} href={`/group/${group.id}`} asChild>
                  <TouchableOpacity className="bg-slate-800/80 rounded-2xl p-4 border border-slate-700/50 flex-row items-center justify-between active:bg-slate-700/80 mb-3">
                    <View className="flex-row items-center flex-1">
                      <View className="mr-4">
                        <GroupAvatar iconUrl={group.icon_url} name={group.name} size={48} />
                      </View>
                      <View className="flex-1">
                        <Text className="text-white font-bold text-lg mb-1">{group.name}</Text>
                        {group.description ? (
                          <Text className="text-white text-sm" numberOfLines={1}>
                            {group.description}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                    <View className="items-end">
                      <Text
                        className={`font-bold ${myBalance > 0 ? 'text-emerald-400' : myBalance < 0 ? 'text-rose-400' : 'text-white'}`}
                      >
                        {formatSignedUsdcAmount(myBalance)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </Link>
              );
            })}
          </View>
        )}

        <View className="h-24" />
      </ScrollView>

      <Link href="/group/create" asChild>
        <TouchableOpacity className="absolute bottom-6 right-6 h-16 w-16 bg-purple-500 rounded-full items-center justify-center shadow-lg shadow-purple-500/40">
          <Feather name="plus" size={32} color="white" />
        </TouchableOpacity>
      </Link>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  homeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  balanceCol: {
    flex: 1,
    minWidth: 0,
  },
  balanceDivider: {
    width: 1,
    height: 48,
    backgroundColor: '#334155',
    marginHorizontal: 16,
  },
});
