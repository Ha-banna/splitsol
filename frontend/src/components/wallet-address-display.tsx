import { Feather } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { showAppAlert } from '@/lib/app-alert';

type WalletAddressDisplayProps = {
  address: string;
  className?: string;
};

export function WalletAddressDisplay({ address, className }: WalletAddressDisplayProps) {
  const handleCopy = async () => {
    try {
      await Clipboard.setStringAsync(address);
      showAppAlert('Copied', 'Wallet address copied to clipboard');
    } catch {
      showAppAlert('Error', 'Could not copy wallet address');
    }
  };

  return (
    <Pressable
      onPress={() => void handleCopy()}
      accessibilityRole="button"
      accessibilityLabel="Copy wallet address"
      className={`bg-slate-800 rounded-2xl border border-slate-700 px-4 py-3 flex-row items-start gap-3 max-w-full ${className ?? ''}`}
    >
      <Feather name="copy" size={18} color="#ffffff" style={{ marginTop: 2 }} />
      <View className="flex-1 min-w-0">
        <Text className="text-white font-mono text-xs leading-5" selectable>
          {address}
        </Text>
        <Text className="text-white text-xs mt-2">Tap to copy</Text>
      </View>
    </Pressable>
  );
}
