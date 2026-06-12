import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Pressable,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/store/auth';
import { useRouter, type Href } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { toUiUser } from '@/lib/mappers';
import { WalletAddressDisplay } from '@/components/wallet-address-display';
import { useQueryClient } from '@tanstack/react-query';
import { AppLogo } from '@/components/app-logo';
import { UserAvatar } from '@/components/user-avatar';
import { LoadingButton } from '@/components/ui/loading-button';
import { useDeleteAccount, useUpdateMe, useUploadMyAvatar, useUsernameAvailable } from '@/hooks/queries';
import { showAppAlert } from '@/lib/app-alert';
import { ApiError } from '@/lib/api';
import { confirmDestructive } from '@/lib/confirm';
import { showErrorAlert } from '@/lib/errors';
import { pickUserAvatarImage, type PickedUserAvatar } from '@/lib/pick-user-avatar';
import { formatUsername, isValidUsername, normalizeUsername } from '@/lib/username';
import { syncPushTokenWithBackend } from '@/lib/push-notifications';
import { LEGAL, openLegalUrlSafe } from '@/lib/legal';

export default function ProfileScreen() {
  const user = useAuthStore((s) => s.user);
  const clearSession = useAuthStore((s) => s.clearSession);
  const router = useRouter();
  const queryClient = useQueryClient();
  const uiUser = user ? toUiUser(user) : null;
  const updateMe = useUpdateMe();
  const uploadAvatar = useUploadMyAvatar();
  const deleteAccount = useDeleteAccount();

  const [displayName, setDisplayName] = useState(user?.display_name ?? '');
  const [username, setUsername] = useState(user?.username ?? '');
  const [avatarPreview, setAvatarPreview] = useState<PickedUserAvatar | null>(null);

  useEffect(() => {
    if (user) {
      setDisplayName(user.display_name);
      setUsername(user.username ?? '');
    }
  }, [user]);

  const handlePickAvatar = async () => {
    const picked = await pickUserAvatarImage();
    if (!picked) return;
    setAvatarPreview(picked);
    try {
      await uploadAvatar.mutateAsync({
        image_base64: picked.base64,
        mime_type: picked.mimeType,
      });
      setAvatarPreview(null);
    } catch (err) {
      showErrorAlert(err, 'Failed to upload photo');
    }
  };

  const normalizedUsername = normalizeUsername(username);
  const usernameValid = !username.trim() || isValidUsername(normalizedUsername);
  const usernameChanged = normalizedUsername !== (user?.username ?? '');
  const { data: usernameAvailability, isFetching: checkingUsername, isError: usernameCheckError, refetch: recheckUsername } = useUsernameAvailable(
    normalizedUsername,
    usernameChanged && isValidUsername(normalizedUsername),
  );
  const usernameOk =
    !username.trim() ||
    (isValidUsername(normalizedUsername) &&
      (!usernameChanged ||
        (usernameAvailability?.available === true && !usernameCheckError)));

  const handleSaveProfile = async () => {
    if (username.trim() && !isValidUsername(normalizedUsername)) {
      showAppAlert(
        'Invalid username',
        'Use 3–20 characters: lowercase letters, numbers, and underscores only.',
      );
      return;
    }
    if (username.trim() && usernameChanged && usernameAvailability?.available === false) {
      showAppAlert('Username taken', 'Choose a different username.');
      return;
    }
    try {
      const body: { display_name: string; username?: string } = {
        display_name: displayName.trim(),
      };
      if (username.trim()) {
        body.username = normalizedUsername;
      }
      await updateMe.mutateAsync(body);
      showAppAlert('Saved', 'Profile updated.');
    } catch (err) {
      showErrorAlert(err, 'Failed to update profile');
    }
  };

  const handleLogout = () => {
    clearSession();
    queryClient.clear();
    router.replace('/onboarding');
  };

  const handleDeleteAccount = async () => {
    const confirmed = await confirmDestructive(
      'Delete account?',
      'This removes your profile, friends, and group memberships. Expense history in shared groups may remain for other members. This cannot be undone.',
    );
    if (!confirmed) return;

    try {
      await deleteAccount.mutateAsync();
      router.replace('/onboarding');
      showAppAlert('Account deleted', 'Your account has been removed.');
    } catch (err) {
      const message =
        err instanceof ApiError && err.status === 404
          ? 'Account deletion is not available on the server yet. Redeploy the latest backend to Railway, then try again.'
          : undefined;
      showErrorAlert(err, message ?? 'Could not delete account');
    }
  };

  const handleEnableNotifications = async () => {
    try {
      const pushToken = await syncPushTokenWithBackend();
      if (pushToken) {
        showAppAlert('Notifications enabled', 'You will receive alerts for friend requests, expenses, and payments.');
      } else {
        showAppAlert(
          'Notifications blocked',
          'Allow notifications for SplitSOL in your device settings, then tap this again.',
        );
      }
    } catch (err) {
      showErrorAlert(err, 'Could not enable notifications');
    }
  };

  const avatarUri = avatarPreview?.previewUri ?? uiUser?.avatarUrl ?? null;

  return (
    <SafeAreaView className="flex-1 bg-slate-900">
      <ScrollView className="flex-1 px-4 pt-6">
        <View className="flex-row items-center justify-between mb-8">
          <Text className="text-3xl font-extrabold text-white tracking-tight">Profile</Text>
          <AppLogo size={32} />
        </View>

        <View className="items-center mb-8">
          <Pressable onPress={() => void handlePickAvatar()} className="relative mb-4">
            <UserAvatar
              avatarUrl={avatarUri}
              displayName={displayName}
              username={username}
              size={112}
            />
            <View className="absolute -bottom-1 -right-1 h-9 w-9 rounded-full bg-purple-500 items-center justify-center border-2 border-slate-900">
              {uploadAvatar.isPending ? (
                <Feather name="loader" size={16} color="#fff" />
              ) : (
                <Feather name="camera" size={16} color="#fff" />
              )}
            </View>
          </Pressable>
          <Text className="text-2xl font-bold text-white mb-1">{displayName || 'User'}</Text>
          {username ? (
            <Text className="text-purple-400 font-medium text-lg mb-2">
              {formatUsername(username)}
            </Text>
          ) : (
            <TouchableOpacity onPress={() => router.push('/setup-username' as Href)}>
              <Text className="text-amber-400 font-medium mb-2">Set a username to receive sends</Text>
            </TouchableOpacity>
          )}
          {user?.wallet_address ? (
            <View className="w-full mt-2 px-1">
              <WalletAddressDisplay address={user.wallet_address} />
            </View>
          ) : null}
        </View>

        <Text className="text-white font-bold uppercase tracking-wider text-xs mb-3 ml-1">
          Edit profile
        </Text>
        <View className="bg-slate-800 rounded-3xl border border-slate-700/50 p-4 mb-6 gap-4">
          <View>
            <Text className="text-white text-sm mb-2 ml-1">Display name</Text>
            <TextInput
              className="bg-slate-900 text-white rounded-xl px-4 py-3 border border-slate-700"
              value={displayName}
              onChangeText={setDisplayName}
            />
          </View>
          <View>
            <Text className="text-white text-sm mb-2 ml-1">Username</Text>
            <View className="flex-row items-center bg-slate-900 rounded-xl border border-slate-700 px-4 py-3">
              <Text className="text-white mr-1">@</Text>
              <TextInput
                className="flex-1 text-white"
                value={username}
                onChangeText={(t) => setUsername(t.replace(/^@+/, ''))}
                autoCapitalize="none"
                placeholder="yourname"
                placeholderTextColor="#ffffff"
                maxLength={20}
              />
            </View>
            {username.trim() && usernameChanged && isValidUsername(normalizedUsername) ? (
              <Text
                className={`text-xs mt-2 ml-1 ${
                  usernameCheckError
                    ? 'text-rose-400'
                    : checkingUsername
                      ? 'text-white'
                      : usernameAvailability?.available
                        ? 'text-emerald-400'
                        : 'text-rose-400'
                }`}
              >
                {usernameCheckError
                  ? 'Could not check username — tap to retry'
                  : checkingUsername
                    ? 'Checking availability…'
                    : usernameAvailability?.available
                      ? 'Username is available'
                      : 'Username is already taken'}
              </Text>
            ) : null}
            {usernameCheckError ? (
              <TouchableOpacity onPress={() => void recheckUsername()} className="mt-1 ml-1">
                <Text className="text-purple-400 text-xs font-semibold">Retry username check</Text>
              </TouchableOpacity>
            ) : null}
          </View>
          <LoadingButton
            label="Save profile"
            loading={updateMe.isPending}
            disabled={!displayName.trim() || !usernameOk || checkingUsername}
            onPress={() => void handleSaveProfile()}
          />
        </View>

        <Text className="text-white font-bold uppercase tracking-wider text-xs mb-3 ml-1">
          People
        </Text>
        <View className="bg-slate-800 rounded-3xl border border-slate-700/50 mb-8 overflow-hidden">
          <TouchableOpacity
            onPress={() => router.push('/send' as Href)}
            className="p-4 flex-row justify-between items-center border-b border-slate-700/50"
          >
            <View className="flex-row items-center">
              <View className="h-8 w-8 rounded-full bg-purple-500/20 items-center justify-center mr-3">
                <Feather name="send" size={16} color="#a855f7" />
              </View>
              <Text className="text-white text-lg font-medium">Send USDC</Text>
            </View>
            <Feather name="chevron-right" size={20} color="#ffffff" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/contacts' as Href)}
            className="p-4 flex-row justify-between items-center"
          >
            <View className="flex-row items-center">
              <View className="h-8 w-8 rounded-full bg-slate-700 items-center justify-center mr-3">
                <Feather name="user-plus" size={16} color="#ffffff" />
              </View>
              <Text className="text-white text-lg font-medium">Friends</Text>
            </View>
            <Feather name="chevron-right" size={20} color="#ffffff" />
          </TouchableOpacity>
        </View>

        <Text className="text-white font-bold uppercase tracking-wider text-xs mb-3 ml-1">
          Support
        </Text>
        <View className="bg-slate-800 rounded-3xl border border-slate-700/50 mb-8 overflow-hidden">
          {Platform.OS !== 'web' ? (
            <TouchableOpacity
              onPress={() => void handleEnableNotifications()}
              className="p-4 flex-row justify-between items-center border-b border-slate-700/50"
            >
              <View className="flex-row items-center flex-1 mr-3">
                <View className="h-8 w-8 rounded-full bg-purple-500/20 items-center justify-center mr-3">
                  <Feather name="bell" size={16} color="#a855f7" />
                </View>
                <View className="flex-1">
                  <Text className="text-white text-lg font-medium">Notifications</Text>
                  <Text className="text-white text-sm">
                    {user?.push_token ? 'Enabled on this device' : 'Tap to enable push alerts'}
                  </Text>
                </View>
              </View>
              <Feather name="chevron-right" size={20} color="#ffffff" />
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            onPress={() => router.push('/feedback' as Href)}
            className="p-4 flex-row justify-between items-center"
          >
            <View className="flex-row items-center">
              <View className="h-8 w-8 rounded-full bg-amber-500/20 items-center justify-center mr-3">
                <Feather name="message-circle" size={16} color="#f59e0b" />
              </View>
              <View>
                <Text className="text-white text-lg font-medium">Send feedback</Text>
                <Text className="text-white text-sm">Report bugs or share suggestions</Text>
              </View>
            </View>
            <Feather name="chevron-right" size={20} color="#ffffff" />
          </TouchableOpacity>
        </View>

        <Text className="text-white font-bold uppercase tracking-wider text-xs mb-3 ml-1">
          Legal
        </Text>
        <View className="bg-slate-800 rounded-3xl border border-slate-700/50 mb-8 overflow-hidden">
          <TouchableOpacity
            onPress={() => void openLegalUrlSafe(LEGAL.termsOfServiceUrl)}
            className="p-4 flex-row justify-between items-center border-b border-slate-700/50"
          >
            <View className="flex-row items-center">
              <View className="h-8 w-8 rounded-full bg-slate-700 items-center justify-center mr-3">
                <Feather name="file-text" size={16} color="#ffffff" />
              </View>
              <Text className="text-white text-lg font-medium">Terms of Service</Text>
            </View>
            <Feather name="external-link" size={18} color="#ffffff" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => void openLegalUrlSafe(LEGAL.privacyPolicyUrl)}
            className="p-4 flex-row justify-between items-center"
          >
            <View className="flex-row items-center">
              <View className="h-8 w-8 rounded-full bg-slate-700 items-center justify-center mr-3">
                <Feather name="shield" size={16} color="#ffffff" />
              </View>
              <Text className="text-white text-lg font-medium">Privacy Policy</Text>
            </View>
            <Feather name="external-link" size={18} color="#ffffff" />
          </TouchableOpacity>
        </View>

        <Text className="text-white font-bold uppercase tracking-wider text-xs mb-3 ml-1">
          Security
        </Text>
        <View className="bg-slate-800 rounded-3xl border border-slate-700/50 mb-8 overflow-hidden">
          <TouchableOpacity
            className="p-4 flex-row justify-between items-center border-b border-slate-700/50"
            onPress={handleLogout}
          >
            <View className="flex-row items-center">
              <View className="h-8 w-8 rounded-full bg-rose-500/20 items-center justify-center mr-3">
                <Feather name="log-out" size={16} color="#f43f5e" />
              </View>
              <Text className="text-rose-400 text-lg font-bold">Log out</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            className="p-4 flex-row justify-between items-center"
            onPress={() => void handleDeleteAccount()}
            disabled={deleteAccount.isPending}
          >
            <View className="flex-row items-center flex-1 mr-3">
              <View className="h-8 w-8 rounded-full bg-rose-500/20 items-center justify-center mr-3">
                <Feather name="trash-2" size={16} color="#f43f5e" />
              </View>
              <View className="flex-1">
                <Text className="text-rose-400 text-lg font-bold">Delete account</Text>
                <Text className="text-white text-sm">
                  Permanently remove your profile and data
                </Text>
              </View>
            </View>
            {deleteAccount.isPending ? (
              <Feather name="loader" size={18} color="#f43f5e" />
            ) : null}
          </TouchableOpacity>
        </View>

        <View className="h-12" />
      </ScrollView>
    </SafeAreaView>
  );
}
