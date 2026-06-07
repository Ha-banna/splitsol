import { Image } from 'expo-image';
import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { BRAND, LOGO_IMAGE } from '@/lib/branding';

type AppLogoProps = {
  size?: number;
  showWordmark?: boolean;
  wordmarkSize?: 'sm' | 'md' | 'lg';
  layout?: 'column' | 'row';
  style?: StyleProp<ViewStyle>;
};

const wordmarkSizes = {
  sm: { title: 20, accent: 20 },
  md: { title: 28, accent: 28 },
  lg: { title: 36, accent: 36 },
};

export function AppLogo({
  size = 48,
  showWordmark = false,
  wordmarkSize = 'md',
  layout = 'column',
  style,
}: AppLogoProps) {
  const wm = wordmarkSizes[wordmarkSize];
  const isRow = layout === 'row';

  return (
    <View style={[styles.wrap, isRow && styles.wrapRow, style]}>
      <Image
        source={LOGO_IMAGE}
        style={{ width: size, height: size }}
        contentFit="contain"
        accessibilityLabel="SplitSOL logo"
      />
      {showWordmark ? (
        <Text
          style={[
            styles.wordmark,
            isRow && styles.wordmarkRow,
            { fontSize: wm.title, lineHeight: wm.title + 4 },
          ]}
        >
          Split<Text style={[styles.accent, { fontSize: wm.accent }]}>{BRAND.accent}</Text>
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
  },
  wrapRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  wordmark: {
    marginTop: 12,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  wordmarkRow: {
    marginTop: 0,
    marginLeft: 10,
    textAlign: 'left',
  },
  accent: {
    color: BRAND.purple,
    fontWeight: '800',
  },
});
