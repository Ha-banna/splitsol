import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { ScreenHeader } from '@/components/screen-header';
import { UserAvatar } from '@/components/user-avatar';
import { EmptyState } from '@/components/ui/empty-state';
import { useAddGroupMember, useContacts, useGroup } from '@/hooks/queries';
import { showAppAlert } from '@/lib/app-alert';
import { showErrorAlert } from '@/lib/errors';
import { formatUsername } from '@/lib/username';
import type { PublicUserProfile } from '@/types/api';

function paramId(id: string | string[] | undefined): string {
  if (typeof id === 'string') return id;
  return id?.[0] ?? '';
}

export default function AddGroupMemberScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const groupId = paramId(id);
  const {
    data: detail,
    isError: groupError,
    refetch: refetchGroup,
  } = useGroup(groupId);
  const {
    data: contacts = [],
    isLoading,
    isError: contactsError,
    refetch: refetchContacts,
  } = useContacts();
  const addMember = useAddGroupMember(groupId);

  const memberIds = useMemo(
    () => new Set((detail?.members ?? []).map((m) => m.user_id)),
    [detail?.members],
  );

  const friendsToAdd = useMemo(
    () => contacts.filter((c) => !memberIds.has(c.user.id)),
    [contacts, memberIds],
  );

  const groupHref = groupId ? (`/group/${groupId}` as const) : ('/' as const);

  const addUser = async (user: PublicUserProfile) => {
    if (!groupId) return;
    try {
      await addMember.mutateAsync(user.id);
      const label = formatUsername(user.username) || user.display_name;
      showAppAlert('Added', `${label} joined the group.`);
      router.replace(groupHref);
    } catch (err) {
      showErrorAlert(err, 'Could not add member');
    }
  };

  if (!groupId) {
    return (
      <SafeAreaView className="flex-1 bg-slate-900">
        <ScreenHeader title="Add member" variant="close" fallbackHref="/" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-900">
      <ScreenHeader
        title="Add to group"
        subtitle={detail?.group.name}
        variant="close"
        fallbackHref={groupHref}
      />

      <ScrollView className="flex-1 px-4 pt-4">
        <Text className="text-white text-sm mb-4 leading-5 px-1">
          Only friends can be added to a group. Send a friend request from Profile → Friends if
          someone is not listed here.
        </Text>

        {groupError ? (
          <EmptyState
            icon="alert-circle"
            title="Could not load group"
            description="Check your connection and try again."
            actionLabel="Try again"
            onAction={() => void refetchGroup()}
          />
        ) : isLoading ? (
          <Text className="text-white text-center py-8">Loading friends...</Text>
        ) : contactsError ? (
          <EmptyState
            icon="alert-circle"
            title="Could not load friends"
            description="Check your connection and try again."
            actionLabel="Try again"
            onAction={() => void refetchContacts()}
          />
        ) : friendsToAdd.length === 0 ? (
          <EmptyState
            icon="user-plus"
            title="No friends to add"
            description={
              contacts.length === 0
                ? 'Add friends by @username first, then come back to invite them to this group.'
                : 'Everyone you are friends with is already in this group.'
            }
            actionLabel={contacts.length === 0 ? 'Go to Friends' : undefined}
            onAction={
              contacts.length === 0
                ? () => router.push('/contacts' as Href)
                : undefined
            }
          />
        ) : (
          friendsToAdd.map((c) => (
            <TouchableOpacity
              key={c.id}
              className="bg-slate-800/80 rounded-2xl p-4 mb-3 border border-slate-700/50 flex-row items-center"
              disabled={addMember.isPending}
              onPress={() => void addUser(c.user)}
            >
              <UserAvatar
                avatarUrl={c.user.avatar_url}
                displayName={c.user.display_name}
                username={c.user.username}
                size={44}
              />
              <View className="flex-1 ml-3">
                <Text className="text-white font-bold text-base">{c.user.display_name}</Text>
                {c.user.username ? (
                  <Text className="text-purple-400 text-sm">{formatUsername(c.user.username)}</Text>
                ) : null}
              </View>
              <Feather name="plus-circle" size={22} color="#a855f7" />
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
