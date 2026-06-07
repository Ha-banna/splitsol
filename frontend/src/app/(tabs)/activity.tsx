import React, { useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppLogo } from '@/components/app-logo';
import { UserAvatar } from '@/components/user-avatar';
import { EmptyState } from '@/components/ui/empty-state';
import { SkeletonActivityRow } from '@/components/ui/skeleton';
import { useActivity } from '@/hooks/queries';
import { useAuthStore } from '@/store/auth';
import type { ApiActivityEvent } from '@/types/api';

function ActivityRow({
  item,
  userId,
}: {
  item: ApiActivityEvent;
  userId: string | undefined;
}) {
  const dateStr = new Date(item.created_at).toLocaleDateString();
  const isMe = item.actor_id === userId;
  const actorLabel = isMe ? 'You' : item.actor_name ?? 'Someone';

  if (item.type === 'expense_added') {
    return (
      <Link href={`/group/${item.group_id}`} asChild>
        <TouchableOpacity className="bg-slate-800/80 rounded-2xl p-4 border border-slate-700/50 flex-row items-center active:bg-slate-700/80 mb-3">
          <View className="mr-3">
            <UserAvatar
              avatarUrl={item.actor_avatar_url}
              displayName={item.actor_name ?? undefined}
              size={40}
            />
          </View>
          <View className="flex-1">
            <Text className="text-white text-base">
              <Text className="font-bold">{actorLabel}</Text> added &quot;{item.description}
              &quot; —{' '}
              <Text className="font-bold text-emerald-400">
                ${(item.amount_usdc ?? 0).toFixed(2)}
              </Text>{' '}
              to {item.group_name}
            </Text>
            <Text className="text-white text-sm mt-1">{dateStr}</Text>
          </View>
        </TouchableOpacity>
      </Link>
    );
  }

  return (
    <Link href={`/group/${item.group_id}`} asChild>
      <TouchableOpacity className="bg-slate-800/80 rounded-2xl p-4 border border-slate-700/50 flex-row items-center active:bg-slate-700/80 mb-3">
        <View className="mr-3">
          <UserAvatar
            avatarUrl={item.actor_avatar_url}
            displayName={item.actor_name ?? undefined}
            size={40}
          />
        </View>
        <View className="flex-1">
          <Text className="text-white text-base">
            <Text className="font-bold">{actorLabel}</Text> settled up in {item.group_name} —{' '}
            <Text className="font-bold text-purple-400">
              ${(item.amount_usdc ?? 0).toFixed(2)}
            </Text>
          </Text>
          <Text className="text-white text-sm mt-1">{dateStr}</Text>
        </View>
      </TouchableOpacity>
    </Link>
  );
}

export default function ActivityScreen() {
  const userId = useAuthStore((s) => s.user?.id);
  const {
    data,
    isLoading,
    isError,
    refetch,
    isRefetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
  } = useActivity();

  const events = useMemo(
    () => data?.pages.flatMap((page) => page.events) ?? [],
    [data?.pages],
  );

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const listHeader = (
    <View className="flex-row items-center justify-between mb-8">
      <Text className="text-3xl font-extrabold text-white tracking-tight">Recent Activity</Text>
      <AppLogo size={32} />
    </View>
  );

  const listFooter =
    isFetchNextPageError ? (
      <View className="py-6 items-center px-4">
        <Text className="text-rose-300 text-center mb-3">
          Could not load more activity.
        </Text>
        <TouchableOpacity
          onPress={() => void fetchNextPage()}
          className="bg-rose-500/20 border border-rose-500/40 px-5 py-2.5 rounded-xl"
        >
          <Text className="text-rose-200 font-bold">Try again</Text>
        </TouchableOpacity>
      </View>
    ) : isFetchingNextPage ? (
      <View className="py-6 items-center">
        <ActivityIndicator color="#a855f7" />
      </View>
    ) : (
      <View className="h-24" />
    );

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-slate-900">
        <View className="flex-1 px-4 pt-6">
          {listHeader}
          <SkeletonActivityRow />
          <SkeletonActivityRow />
          <SkeletonActivityRow />
          <SkeletonActivityRow />
        </View>
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView className="flex-1 bg-slate-900">
        <View className="flex-1 px-4 pt-6">
          {listHeader}
          <EmptyState
            icon="alert-circle"
            title="Could not load activity"
            description="Pull down or tap below to try again."
            actionLabel="Retry"
            onAction={() => void refetch()}
          />
        </View>
      </SafeAreaView>
    );
  }

  if (events.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-slate-900">
        <View className="flex-1 px-4 pt-6">
          {listHeader}
          <EmptyState
            icon="activity"
            title="No activity yet"
            description="Expenses and settlements from your groups will show up here."
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-900">
      <FlatList
        className="flex-1 px-4 pt-6"
        data={events}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ActivityRow item={item} userId={userId} />}
        ListHeaderComponent={listHeader}
        ListFooterComponent={listFooter}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.4}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching && !isFetchingNextPage}
            onRefresh={() => void refetch()}
            tintColor="#a855f7"
          />
        }
      />
    </SafeAreaView>
  );
}
