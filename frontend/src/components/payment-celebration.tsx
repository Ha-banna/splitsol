import { Feather } from '@expo/vector-icons';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { ConfettiBurst } from '@/components/confetti-burst';
import { shortenWallet } from '@/lib/mappers';

type PaymentCelebrationProps = {
  title: string;
  subtitle: string;
  amountLabel?: string;
  amount?: string;
  tx?: string;
  actionLabel: string;
  onAction: () => void;
  accent?: 'emerald' | 'purple';
};

export function PaymentCelebration({
  title,
  subtitle,
  amountLabel,
  amount,
  tx,
  actionLabel,
  onAction,
  accent = 'emerald',
}: PaymentCelebrationProps) {
  const isPurple = accent === 'purple';
  const ringClass = isPurple
    ? 'bg-purple-500/20 border-purple-500 shadow-purple-500/40'
    : 'bg-emerald-500/20 border-emerald-500 shadow-emerald-500/40';
  const iconColor = isPurple ? '#a855f7' : '#10b981';
  const amountClass = isPurple ? 'text-purple-400' : 'text-emerald-400';

  return (
    <View className="flex-1">
      <ConfettiBurst active />
      <View className="flex-1 items-center justify-center p-6">
        <View
          className={`h-24 w-24 rounded-full items-center justify-center mb-8 border-4 shadow-lg ${ringClass}`}
        >
          <Feather name="check" size={48} color={iconColor} />
        </View>

        <Text className="text-3xl font-extrabold text-white mb-2 text-center">{title}</Text>
        <Text className="text-white text-center mb-6 leading-6 px-4">{subtitle}</Text>

        {amount ? (
          <View className="mb-8 items-center">
            {amountLabel ? (
              <Text className="text-white text-xs uppercase font-bold tracking-wider mb-1">
                {amountLabel}
              </Text>
            ) : null}
            <Text className={`text-4xl font-extrabold ${amountClass}`}>{amount}</Text>
          </View>
        ) : null}

        {tx ? (
          <View className="bg-slate-800 w-full rounded-2xl p-4 border border-slate-700 mb-8">
            <Text className="text-white text-xs mb-1 uppercase font-bold tracking-wider">
              Transaction
            </Text>
            <Text className="text-purple-400 font-mono text-center">{shortenWallet(tx, 6)}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          className="bg-purple-500 py-4 w-full rounded-2xl items-center shadow-lg shadow-purple-500/30"
          onPress={onAction}
        >
          <Text className="text-white text-lg font-bold">{actionLabel}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
