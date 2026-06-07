import React, { useState } from 'react';
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
import Constants from 'expo-constants';
import { useRouter, type Href } from 'expo-router';
import { ScreenHeader } from '@/components/screen-header';
import { LoadingButton } from '@/components/ui/loading-button';
import { useSubmitFeedback } from '@/hooks/queries';
import { showAppAlert } from '@/lib/app-alert';
import { showErrorAlert } from '@/lib/errors';

type FeedbackCategory = 'bug' | 'suggestion' | 'other';

const CATEGORIES: { id: FeedbackCategory; label: string; description: string }[] = [
  { id: 'bug', label: 'Bug', description: 'Something is broken or not working' },
  { id: 'suggestion', label: 'Suggestion', description: 'An idea to improve SplitSOL' },
  { id: 'other', label: 'Other', description: 'General feedback or questions' },
];

const MIN_MESSAGE = 10;
const MAX_MESSAGE = 2000;

function getAppVersion(): string | undefined {
  return Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? undefined;
}

export default function FeedbackScreen() {
  const router = useRouter();
  const submitFeedback = useSubmitFeedback();
  const [category, setCategory] = useState<FeedbackCategory>('bug');
  const [message, setMessage] = useState('');

  const trimmed = message.trim();
  const canSubmit = trimmed.length >= MIN_MESSAGE && trimmed.length <= MAX_MESSAGE;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    try {
      await submitFeedback.mutateAsync({
        category,
        message: trimmed,
        platform: Platform.OS,
        app_version: getAppVersion(),
      });
      showAppAlert('Thank you', 'Your feedback was sent. We appreciate you helping us improve SplitSOL.');
      router.replace('/(tabs)/profile' as Href);
    } catch (err) {
      showErrorAlert(err, 'Could not send feedback');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-900">
      <ScreenHeader title="Send feedback" fallbackHref="/(tabs)/profile" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          className="flex-1 px-4 pt-6"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 32 }}
        >
          <Text className="text-white text-base mb-6 leading-6">
            Report a bug or share a suggestion. We read every message in the admin dashboard.
          </Text>

          <Text className="text-white font-bold uppercase tracking-wider text-xs mb-3 ml-1">
            Category
          </Text>
          <View className="gap-3 mb-6">
            {CATEGORIES.map((item) => {
              const selected = category === item.id;
              return (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => setCategory(item.id)}
                  className={`rounded-2xl border p-4 ${
                    selected
                      ? 'border-purple-500 bg-purple-500/10'
                      : 'border-slate-700 bg-slate-800'
                  }`}
                >
                  <Text className={`text-lg font-semibold ${selected ? 'text-purple-300' : 'text-white'}`}>
                    {item.label}
                  </Text>
                  <Text className="text-white mt-1">{item.description}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View className="flex-row justify-between items-center mb-2 ml-1">
            <Text className="text-white font-bold uppercase tracking-wider text-xs">Message</Text>
            <Text className="text-white text-xs">
              {trimmed.length}/{MAX_MESSAGE}
            </Text>
          </View>
          <TextInput
            className="bg-slate-800 text-white rounded-2xl px-4 py-3 border border-slate-700 min-h-[160px] mb-2"
            placeholder="Describe what happened or what you'd like to see…"
            placeholderTextcolor="#ffffff"
            value={message}
            onChangeText={setMessage}
            multiline
            textAlignVertical="top"
            maxLength={MAX_MESSAGE}
          />
          {trimmed.length > 0 && trimmed.length < MIN_MESSAGE ? (
            <Text className="text-amber-400 text-sm mb-4 ml-1">
              Please enter at least {MIN_MESSAGE} characters.
            </Text>
          ) : (
            <View className="mb-4" />
          )}

          <LoadingButton
            label="Submit feedback"
            loading={submitFeedback.isPending}
            disabled={!canSubmit}
            onPress={() => void handleSubmit()}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
