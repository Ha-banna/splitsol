import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, type Href } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { AppLogo } from '@/components/app-logo';
import { LegalConsentText } from '@/components/legal-consent-text';
import { ScreenHeader } from '@/components/screen-header';
import { LoadingButton } from '@/components/ui/loading-button';
import { DISPLAY_NAME_MAX_LENGTH } from '@/lib/constants';
import { confirmAction } from '@/lib/confirm';
import { useUpdateMe, useUsernameAvailable } from '@/hooks/queries';
import { showErrorAlert } from '@/lib/errors';
import { isValidUsername, normalizeUsername } from '@/lib/username';
import { useAuthStore } from '@/store/auth';

function initialDisplayName(current: string | undefined, walletAddress: string): string {
  if (!current?.trim()) return '';
  const short = `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`;
  if (current === short) return '';
  return current;
}

export default function SetupUsernameScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const clearSession = useAuthStore((s) => s.clearSession);
  const updateMe = useUpdateMe();
  const isFirstTimeSetup = !user?.username;

  useEffect(() => {
    if (!token || !user?.wallet_address?.trim()) {
      router.replace('/onboarding');
    }
  }, [token, user?.wallet_address, router]);

  const [displayName, setDisplayName] = useState(() =>
    initialDisplayName(user?.display_name, user?.wallet_address ?? ''),
  );
  const [username, setUsername] = useState(user?.username ?? '');

  const trimmedDisplayName = displayName.trim();
  const displayNameValid =
    trimmedDisplayName.length > 0 && trimmedDisplayName.length <= DISPLAY_NAME_MAX_LENGTH;

  const normalized = normalizeUsername(username);
  const usernameValid = isValidUsername(normalized);
  const {
    data: availability,
    isFetching: checkingAvailability,
    isError: availabilityError,
    refetch: recheckAvailability,
  } = useUsernameAvailable(normalized, usernameValid);

  const availabilityMessage = useMemo(() => {
    if (!normalized) return null;
    if (!usernameValid) return 'Use 3–20 characters: letters, numbers, and underscores only.';
    if (availabilityError) return 'Could not check username. Tap retry below.';
    if (checkingAvailability) return 'Checking availability…';
    if (availability?.available === false) {
      return availability.reason ?? 'This username is already taken.';
    }
    if (availability?.available) return `@${availability.username} is available`;
    return null;
  }, [normalized, usernameValid, checkingAvailability, availability, availabilityError]);

  const canContinue =
    displayNameValid &&
    usernameValid &&
    availability?.available === true &&
    !availabilityError &&
    !updateMe.isPending &&
    !checkingAvailability;

  const handleClose = async () => {
    if (isFirstTimeSetup) {
      const confirmed = await confirmAction(
        'Log out?',
        'You can finish setting up your profile when you sign in again.',
        'Log out',
        true,
      );
      if (!confirmed) return;
      clearSession();
      queryClient.clear();
      router.replace('/onboarding');
      return;
    }

    router.replace('/(tabs)' as Href);
  };

  const handleSave = async () => {
    if (!canContinue) return;
    try {
      await updateMe.mutateAsync({
        display_name: trimmedDisplayName,
        username: normalized,
      });
      router.replace('/(tabs)' as Href);
    } catch (err) {
      showErrorAlert(err, 'Could not save profile');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-900" edges={['top', 'bottom', 'left', 'right']}>
      <ScreenHeader
        variant="close"
        title={isFirstTimeSetup ? 'Set up profile' : 'Edit username'}
        onClose={() => void handleClose()}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'center',
            paddingHorizontal: 20,
            paddingVertical: 32,
          }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="w-full max-w-md self-center">
            <AppLogo size={72} showWordmark wordmarkSize="md" style={{ marginBottom: 24 }} />
            <Text className="text-2xl font-extrabold text-white mb-3 text-center">
              Set up your profile
            </Text>
            <Text className="text-white text-base mb-8 leading-6 text-center px-2">
              Add how friends see you and pick a unique @username for payments.
            </Text>

            <View className="flex-row justify-between items-center mb-2 ml-1">
              <Text className="text-white font-medium">Display name</Text>
              <Text className="text-white text-xs">
                {displayName.length}/{DISPLAY_NAME_MAX_LENGTH}
              </Text>
            </View>
            <TextInput
              className="bg-slate-800 text-white text-lg rounded-2xl px-4 py-3.5 border border-slate-700 mb-6 min-h-[52px]"
              placeholder="Alex, Sam, etc."
              placeholderTextColor="#ffffff"
              autoFocus
              value={displayName}
              onChangeText={(text) =>
                setDisplayName(
                  text.length > DISPLAY_NAME_MAX_LENGTH
                    ? text.slice(0, DISPLAY_NAME_MAX_LENGTH)
                    : text,
                )
              }
              maxLength={DISPLAY_NAME_MAX_LENGTH}
            />

            <Text className="text-white font-medium mb-2 ml-1">Username</Text>
            <View className="bg-slate-800 rounded-2xl border border-slate-700 px-4 py-3.5 flex-row items-center mb-2">
              <Text className="text-white text-lg mr-1">@</Text>
              <TextInput
                className="flex-1 text-white text-lg min-h-[28px]"
                placeholder="yourname"
                placeholderTextColor="#ffffff"
                autoCapitalize="none"
                autoCorrect={false}
                value={username}
                onChangeText={(t) => setUsername(t.replace(/^@+/, ''))}
                maxLength={20}
              />
            </View>

            {availabilityMessage ? (
              <Text
                className={`text-sm mb-2 ml-1 ${
                  availabilityError
                    ? 'text-rose-400'
                    : availability?.available === true
                      ? 'text-emerald-400'
                      : usernameValid
                        ? 'text-rose-400'
                        : 'text-white'
                }`}
              >
                {availabilityMessage}
              </Text>
            ) : (
              <View className="mb-2" />
            )}
            {availabilityError ? (
              <TouchableOpacity
                onPress={() => void recheckAvailability()}
                className="mb-6 ml-1"
              >
                <Text className="text-purple-400 text-sm font-semibold">Retry username check</Text>
              </TouchableOpacity>
            ) : (
              <View className="mb-6" />
            )}

            <LoadingButton
              label="Continue"
              loading={updateMe.isPending}
              disabled={!canContinue}
              onPress={() => void handleSave()}
            />

            <LegalConsentText style={{ marginTop: 16, paddingHorizontal: 4 }} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
