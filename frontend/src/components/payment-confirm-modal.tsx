import React from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { LoadingButton } from '@/components/ui/loading-button';

type PaymentConfirmModalProps = {
  visible: boolean;
  title: string;
  amount: string;
  subtitle: string;
  confirmLabel: string;
  loading?: boolean;
  confirmDisabled?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  children?: React.ReactNode;
};

export function PaymentConfirmModal({
  visible,
  title,
  amount,
  subtitle,
  confirmLabel,
  loading = false,
  confirmDisabled = false,
  onConfirm,
  onCancel,
  children,
}: PaymentConfirmModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable
        className="flex-1 bg-black/70 justify-center px-6"
        onPress={loading ? undefined : onCancel}
      >
        <Pressable
          className="bg-slate-800 rounded-3xl border border-slate-700 p-6 shadow-2xl"
          onPress={(e) => e.stopPropagation()}
        >
          <Text className="text-white text-xl font-bold text-center mb-2">{title}</Text>
          <Text className="text-white text-center mb-6 leading-5">{subtitle}</Text>

          <View className="bg-slate-900/80 rounded-2xl border border-purple-500/30 py-6 px-4 mb-4 items-center">
            <Text className="text-white text-xs uppercase font-bold tracking-wider mb-2">
              Total
            </Text>
            <Text className="text-purple-400 text-4xl font-extrabold">{amount}</Text>
          </View>

          {children}

          <View className="gap-3 mt-2">
            <LoadingButton
              label={confirmLabel}
              loading={loading}
              disabled={confirmDisabled || loading}
              onPress={onConfirm}
            />
            <Pressable
              className="py-3 items-center"
              disabled={loading}
              onPress={onCancel}
            >
              <Text className="text-white font-semibold text-base">Cancel</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
