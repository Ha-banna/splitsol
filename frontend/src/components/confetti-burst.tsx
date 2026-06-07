import React, { useEffect, useMemo } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

const COLORS = ['#a855f7', '#10b981', '#f59e0b', '#38bdf8', '#f472b6', '#fbbf24', '#34d399'];

type ParticleSpec = {
  id: number;
  x: number;
  delay: number;
  drift: number;
  size: number;
  color: string;
  spin: number;
};

function Particle({ spec }: { spec: ParticleSpec }) {
  const translateY = useSharedValue(-40);
  const translateX = useSharedValue(spec.x);
  const rotate = useSharedValue(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    translateY.value = withDelay(
      spec.delay,
      withTiming(Dimensions.get('window').height + 80, {
        duration: 2800,
        easing: Easing.out(Easing.quad),
      }),
    );
    translateX.value = withDelay(
      spec.delay,
      withTiming(spec.x + spec.drift, { duration: 2800, easing: Easing.inOut(Easing.sin) }),
    );
    rotate.value = withDelay(
      spec.delay,
      withTiming(spec.spin, { duration: 2800, easing: Easing.linear }),
    );
    opacity.value = withDelay(spec.delay + 2000, withTiming(0, { duration: 600 }));
  }, [opacity, rotate, spec, translateX, translateY]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${rotate.value}deg` },
    ],
  }));

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          width: spec.size,
          height: spec.size * 0.6,
          backgroundColor: spec.color,
          borderRadius: spec.size > 10 ? 2 : 1,
        },
        style,
      ]}
    />
  );
}

export function ConfettiBurst({ active = true }: { active?: boolean }) {
  const width = Dimensions.get('window').width;

  const particles = useMemo<ParticleSpec[]>(() => {
    if (!active) return [];
    return Array.from({ length: 48 }, (_, id) => ({
      id,
      x: Math.random() * width,
      delay: Math.random() * 400,
      drift: (Math.random() - 0.5) * 160,
      size: 6 + Math.random() * 8,
      color: COLORS[id % COLORS.length],
      spin: (Math.random() > 0.5 ? 1 : -1) * (180 + Math.random() * 540),
    }));
  }, [active, width]);

  if (!active) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      {particles.map((spec) => (
        <Particle key={spec.id} spec={spec} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
    overflow: 'hidden',
  },
  particle: {
    position: 'absolute',
    top: 0,
  },
});
