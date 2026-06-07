import React, { useEffect } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

type SkeletonProps = {
  width?: number | `${number}%`;
  height?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
};

export function Skeleton({ width = '100%', height = 16, borderRadius = 8, style }: SkeletonProps) {
  const opacity = useSharedValue(0.35);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.75, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        { width, height, borderRadius, backgroundColor: '#334155' },
        animatedStyle,
        style,
      ]}
    />
  );
}

export function SkeletonBalanceCard() {
  return (
    <View className="bg-slate-800 rounded-3xl p-6 mb-8 border border-slate-700">
      <Skeleton width={120} height={12} borderRadius={6} style={{ marginBottom: 16 }} />
      <View className="flex-row justify-between">
        <View className="flex-1">
          <Skeleton width={80} height={10} style={{ marginBottom: 8 }} />
          <Skeleton width={100} height={28} />
        </View>
        <View className="h-12 w-px bg-slate-700 mx-4" />
        <View className="flex-1 items-end">
          <Skeleton width={60} height={10} style={{ marginBottom: 8 }} />
          <Skeleton width={90} height={28} />
        </View>
      </View>
    </View>
  );
}

export function SkeletonGroupRow() {
  return (
    <View className="bg-slate-800/80 rounded-2xl p-4 border border-slate-700/50 flex-row items-center mb-3">
      <Skeleton width={48} height={48} borderRadius={12} style={{ marginRight: 16 }} />
      <View className="flex-1">
        <Skeleton width="70%" height={18} style={{ marginBottom: 8 }} />
        <Skeleton width="40%" height={12} />
      </View>
      <Skeleton width={56} height={20} borderRadius={6} />
    </View>
  );
}

export function SkeletonActivityRow() {
  return (
    <View className="bg-slate-800/80 rounded-2xl p-4 border border-slate-700/50 mb-3">
      <Skeleton width="90%" height={14} style={{ marginBottom: 10 }} />
      <Skeleton width="30%" height={12} />
    </View>
  );
}

export function SkeletonExpenseRow() {
  return (
    <View className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50 flex-row items-center mb-3">
      <Skeleton width={40} height={40} borderRadius={20} style={{ marginRight: 12 }} />
      <View className="flex-1">
        <Skeleton width="60%" height={14} style={{ marginBottom: 6 }} />
        <Skeleton width="45%" height={11} />
      </View>
      <Skeleton width={72} height={14} />
    </View>
  );
}

export function SkeletonGroupDetail() {
  return (
    <View className="flex-1 px-4 pt-6">
      <View className="bg-slate-800 rounded-3xl p-6 mb-6 border border-slate-700">
        <Skeleton width={100} height={12} style={{ alignSelf: 'center', marginBottom: 12 }} />
        <Skeleton width={140} height={36} style={{ alignSelf: 'center', marginBottom: 20 }} />
        <View className="flex-row gap-3">
          <Skeleton height={44} borderRadius={12} style={{ flex: 1 }} />
          <Skeleton height={44} borderRadius={12} style={{ flex: 1 }} />
        </View>
      </View>
      <Skeleton height={40} borderRadius={12} style={{ marginBottom: 24 }} />
      <SkeletonExpenseRow />
      <SkeletonExpenseRow />
      <SkeletonExpenseRow />
    </View>
  );
}
