import { Feather } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { GroupAvatar } from '@/components/group-avatar';
import type { PickedGroupIcon } from '@/lib/pick-group-icon';

type GroupIconPickerProps = {
  iconUrl?: string | null;
  preview?: PickedGroupIcon | null;
  name?: string;
  size?: number;
  loading?: boolean;
  onPress: () => void;
  label?: string;
};

export function GroupIconPicker({
  iconUrl,
  preview,
  name,
  size = 96,
  loading = false,
  onPress,
  label = 'Add group photo',
}: GroupIconPickerProps) {
  const displayUrl = preview?.previewUri ?? iconUrl ?? null;

  return (
    <View className="items-center mb-10">
      <Pressable
        onPress={onPress}
        disabled={loading}
        accessibilityRole="button"
        accessibilityLabel={label}
        className="relative"
      >
        <GroupAvatar iconUrl={displayUrl} name={name} size={size} />
        <View
          className="absolute -bottom-1 -right-1 h-9 w-9 rounded-full bg-purple-500 items-center justify-center border-2 border-slate-900"
          style={{ opacity: loading ? 0.6 : 1 }}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Feather name="camera" size={16} color="#fff" />
          )}
        </View>
      </Pressable>
      <Text className="text-purple-400 font-medium mt-4">{label}</Text>
    </View>
  );
}
