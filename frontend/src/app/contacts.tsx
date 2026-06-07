import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { ScreenHeader } from '@/components/screen-header';
import { UserAvatar } from '@/components/user-avatar';
import { EmptyState } from '@/components/ui/empty-state';
import {
  useAcceptFriendRequest,
  useCancelFriendRequest,
  useContacts,
  useDeclineFriendRequest,
  useIncomingFriendRequests,
  useOutgoingFriendRequests,
  useRemoveContact,
  useSendFriendRequest,
} from '@/hooks/queries';
import { showAppAlert } from '@/lib/app-alert';
import { showErrorAlert } from '@/lib/errors';
import { formatUsername, normalizeUsername } from '@/lib/username';

type Tab = 'friends' | 'requests';

export default function ContactsScreen() {
  const [tab, setTab] = useState<Tab>('friends');
  const [usernameInput, setUsernameInput] = useState('');

  const {
    data: contacts = [],
    isLoading: loadingFriends,
    isError: friendsError,
    refetch: refetchFriends,
  } = useContacts();
  const {
    data: incoming = [],
    isLoading: loadingIncoming,
    isError: incomingError,
    refetch: refetchIncoming,
  } = useIncomingFriendRequests();
  const {
    data: outgoing = [],
    isLoading: loadingOutgoing,
    isError: outgoingError,
    refetch: refetchOutgoing,
  } = useOutgoingFriendRequests();

  const sendRequest = useSendFriendRequest();
  const acceptRequest = useAcceptFriendRequest();
  const declineRequest = useDeclineFriendRequest();
  const cancelRequest = useCancelFriendRequest();
  const removeContact = useRemoveContact();

  const requestCount = incoming.length;

  const loadingRequests = loadingIncoming || loadingOutgoing;
  const requestsReady = !loadingRequests && !incomingError && !outgoingError;
  const noRequestsAtAll = requestsReady && incoming.length === 0 && outgoing.length === 0;

  const handleSendRequest = async () => {
    const username = normalizeUsername(usernameInput);
    if (!username) return;
    try {
      const result = await sendRequest.mutateAsync({ username });
      setUsernameInput('');
      if ('auto_accepted' in result && result.auto_accepted) {
        setTab('friends');
        showAppAlert('Friends', `You and @${username} are now friends.`);
      } else {
        setTab('requests');
        showAppAlert('Request sent', `Friend request sent to @${username}. Check Sent below.`);
      }
    } catch (err) {
      showErrorAlert(err, 'Could not send request');
    }
  };

  const handleAccept = async (requestId: string) => {
    try {
      await acceptRequest.mutateAsync(requestId);
      setTab('friends');
    } catch (err) {
      showErrorAlert(err, 'Could not accept request');
    }
  };

  const handleDecline = async (requestId: string) => {
    try {
      await declineRequest.mutateAsync(requestId);
    } catch (err) {
      showErrorAlert(err, 'Could not decline request');
    }
  };

  const handleCancel = async (requestId: string) => {
    try {
      await cancelRequest.mutateAsync(requestId);
    } catch (err) {
      showErrorAlert(err, 'Could not cancel request');
    }
  };

  const handleUnfriend = (contactUserId: string, label: string) => {
    Alert.alert(
      'Remove friend?',
      `${label} will be removed from your friends. You'll both stay in groups you're already in, but you won't be able to add each other to new groups until you're friends again.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            void removeContact.mutateAsync(contactUserId).catch((err) => {
              showErrorAlert(err, 'Could not remove friend');
            });
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-900">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScreenHeader title="Friends" variant="close" fallbackHref="/" />

        <View className="flex-row bg-slate-800/80 rounded-xl p-1 mx-4 mb-4 border border-slate-700">
          <TouchableOpacity
            className={`flex-1 py-2 items-center rounded-lg ${tab === 'friends' ? 'bg-slate-700' : ''}`}
            onPress={() => setTab('friends')}
          >
            <Text className={`font-semibold ${tab === 'friends' ? 'text-white' : 'text-white'}`}>
              Friends
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`flex-1 py-2 items-center rounded-lg ${tab === 'requests' ? 'bg-slate-700' : ''}`}
            onPress={() => setTab('requests')}
          >
            <Text className={`font-semibold ${tab === 'requests' ? 'text-white' : 'text-white'}`}>
              Requests{requestCount > 0 ? ` (${requestCount})` : ''}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1 px-4">
          {tab === 'friends' ? (
            <>
              <Text className="text-white mb-2 ml-1 font-medium">Add by username</Text>
              <View className="flex-row items-stretch gap-2 mb-6">
                <View className="flex-1 min-w-0 h-[52px] bg-slate-800 rounded-2xl border border-slate-700 px-4 flex-row items-center">
                  <Text className="text-white text-base mr-1">@</Text>
                  <TextInput
                    className="flex-1 text-white text-base py-0"
                    placeholder="username"
                    placeholderTextColor="#ffffff"
                    autoCapitalize="none"
                    value={usernameInput}
                    onChangeText={(t) => setUsernameInput(t.replace(/^@/, ''))}
                  />
                </View>
                <TouchableOpacity
                  className={`h-[52px] min-w-[96px] px-4 rounded-2xl border items-center justify-center ${
                    !usernameInput.trim() || sendRequest.isPending
                      ? 'bg-slate-800 border-slate-700 opacity-60'
                      : 'bg-purple-600 border-purple-500'
                  }`}
                  disabled={!usernameInput.trim() || sendRequest.isPending}
                  onPress={() => void handleSendRequest()}
                >
                  {sendRequest.isPending ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <Text className="text-white font-semibold text-base">Request</Text>
                  )}
                </TouchableOpacity>
              </View>

              {loadingFriends ? (
                <Text className="text-white text-center py-8">Loading...</Text>
              ) : friendsError ? (
                <EmptyState
                  icon="alert-circle"
                  title="Could not load friends"
                  description="Check your connection and try again."
                  actionLabel="Try again"
                  onAction={() => void refetchFriends()}
                />
              ) : contacts.length === 0 ? (
                <EmptyState
                  icon="users"
                  title="No friends yet"
                  description="Send a friend request by @username. Once they accept, you can add each other to groups and send USDC."
                />
              ) : (
                contacts.map((c) => (
                  <View
                    key={c.id}
                    className="bg-slate-800/80 rounded-2xl p-4 mb-3 border border-slate-700/50 flex-row items-center"
                  >
                    <UserAvatar
                      avatarUrl={c.user.avatar_url}
                      displayName={c.user.display_name}
                      username={c.user.username}
                      size={48}
                    />
                    <View className="flex-1 ml-3">
                      <Text className="text-white font-bold text-base">{c.user.display_name}</Text>
                      {c.user.username ? (
                        <Text className="text-purple-400 text-sm">
                          {formatUsername(c.user.username)}
                        </Text>
                      ) : null}
                    </View>
                    <TouchableOpacity
                      onPress={() =>
                        handleUnfriend(
                          c.contact_user_id,
                          formatUsername(c.user.username) || c.user.display_name,
                        )
                      }
                      accessibilityLabel="Remove friend"
                      className="p-2"
                    >
                      <Feather name="user-minus" size={20} color="#f87171" />
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </>
          ) : noRequestsAtAll ? (
            <EmptyState
              icon="inbox"
              title="No friend requests yet"
              description="Requests you receive or send will show up here. Add someone from the Friends tab with their @username."
              actionLabel="Add a friend"
              onAction={() => setTab('friends')}
            />
          ) : (
            <>
              <Text className="text-white font-bold uppercase tracking-wider text-xs mb-3 ml-1">
                Received
              </Text>
              {loadingIncoming ? (
                <Text className="text-white text-center py-4 mb-4">Loading...</Text>
              ) : incomingError ? (
                <EmptyState
                  compact
                  icon="alert-circle"
                  title="Could not load requests"
                  description="Check your connection and try again."
                  actionLabel="Try again"
                  onAction={() => void refetchIncoming()}
                />
              ) : incoming.length === 0 ? (
                <EmptyState
                  compact
                  icon="user-plus"
                  title="Nothing to review"
                  description="When someone adds you, their request appears here so you can accept or decline."
                />
              ) : (
                incoming.map((r) => (
                  <View
                    key={r.id}
                    className="bg-slate-800/80 rounded-2xl p-4 mb-3 border border-purple-500/30 flex-row items-center"
                  >
                    <UserAvatar
                      avatarUrl={r.user.avatar_url}
                      displayName={r.user.display_name}
                      username={r.user.username}
                      size={48}
                    />
                    <View className="flex-1 ml-3">
                      <Text className="text-white font-bold">{r.user.display_name}</Text>
                      {r.user.username ? (
                        <Text className="text-purple-400 text-sm">
                          {formatUsername(r.user.username)}
                        </Text>
                      ) : null}
                    </View>
                    <TouchableOpacity
                      className="bg-emerald-500/20 p-2 rounded-xl mr-2"
                      disabled={acceptRequest.isPending}
                      onPress={() => void handleAccept(r.id)}
                    >
                      <Feather name="check" size={20} color="#34d399" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      className="bg-rose-500/20 p-2 rounded-xl"
                      disabled={declineRequest.isPending}
                      onPress={() => void handleDecline(r.id)}
                    >
                      <Feather name="x" size={20} color="#fb7185" />
                    </TouchableOpacity>
                  </View>
                ))
              )}

              <Text className="text-white font-bold uppercase tracking-wider text-xs mb-3 ml-1 mt-4">
                Sent
              </Text>
              {loadingOutgoing ? (
                <Text className="text-white text-center py-4 mb-4">Loading...</Text>
              ) : outgoingError ? (
                <EmptyState
                  compact
                  icon="alert-circle"
                  title="Could not load sent requests"
                  description="Check your connection and try again."
                  actionLabel="Try again"
                  onAction={() => void refetchOutgoing()}
                />
              ) : outgoing.length === 0 ? (
                <EmptyState
                  compact
                  icon="send"
                  title="No pending invites"
                  description="Friend requests you send stay here until they accept or you cancel."
                  actionLabel="Send a request"
                  onAction={() => setTab('friends')}
                />
              ) : (
                outgoing.map((r) => (
                  <View
                    key={r.id}
                    className="bg-slate-800/80 rounded-2xl p-4 mb-3 border border-slate-700/50 flex-row items-center"
                  >
                    <UserAvatar
                      avatarUrl={r.user.avatar_url}
                      displayName={r.user.display_name}
                      username={r.user.username}
                      size={48}
                    />
                    <View className="flex-1 ml-3">
                      <Text className="text-white font-bold">{r.user.display_name}</Text>
                      {r.user.username ? (
                        <Text className="text-white text-sm">
                          {formatUsername(r.user.username)} · pending
                        </Text>
                      ) : (
                        <Text className="text-white text-sm">Pending</Text>
                      )}
                    </View>
                    <TouchableOpacity
                      className="p-2"
                      disabled={cancelRequest.isPending}
                      onPress={() => void handleCancel(r.id)}
                    >
                      <Feather name="x-circle" size={22} color="#ffffff" />
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
