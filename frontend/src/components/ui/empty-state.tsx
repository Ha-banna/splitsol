import { Feather } from '@expo/vector-icons';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

type FeatherIcon = keyof typeof Feather.glyphMap;

type EmptyStateProps = {
  icon: FeatherIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  /** Smaller inline card for lists and sections */
  compact?: boolean;
};

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  compact = false,
}: EmptyStateProps) {
  if (compact) {
    return (
      <View className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-4 mb-4 flex-row items-start gap-3">
        <View className="h-10 w-10 rounded-full bg-slate-900 border border-slate-700 items-center justify-center shrink-0">
          <Feather name={icon} size={18} color="#a855f7" />
        </View>
        <View className="flex-1 min-w-0">
          <Text className="text-white font-semibold text-sm">{title}</Text>
          {description ? (
            <Text className="text-white text-sm leading-5 mt-1">{description}</Text>
          ) : null}
          {actionLabel && onAction ? (
            <Pressable onPress={onAction} className="mt-3 self-start">
              <Text className="text-purple-300 font-semibold text-sm">{actionLabel}</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <View className="items-center justify-center py-16 px-8">
      <View className="h-20 w-20 rounded-full bg-slate-800 border border-slate-700 items-center justify-center mb-5">
        <Feather name={icon} size={36} color="#a855f7" />
      </View>
      <Text className="text-white text-lg font-bold text-center mb-2">{title}</Text>
      {description ? (
        <Text className="text-white text-center text-base leading-6 max-w-[280px]">
          {description}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          className="mt-6 bg-purple-500/20 border border-purple-500/40 px-6 py-3 rounded-xl"
        >
          <Text className="text-purple-300 font-bold">{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
