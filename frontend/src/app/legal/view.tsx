import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { WebView } from 'react-native-webview';
import { ScreenHeader } from '@/components/screen-header';

function param(value: string | string[] | undefined): string {
  if (typeof value === 'string') return value;
  return value?.[0] ?? '';
}

export default function LegalViewScreen() {
  const params = useLocalSearchParams<{ url?: string; title?: string }>();
  const url = param(params.url);
  const title = param(params.title) || 'Legal';

  return (
    <SafeAreaView className="flex-1 bg-slate-900">
      <ScreenHeader title={title} variant="close" fallbackHref="/(tabs)/profile" />
      {url ? (
        <WebView
          source={{ uri: url }}
          startInLoadingState
          renderLoading={() => (
            <View className="flex-1 items-center justify-center bg-slate-900">
              <ActivityIndicator size="large" color="#a855f7" />
            </View>
          )}
        />
      ) : null}
    </SafeAreaView>
  );
}
