import { Feather } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type ScreenHeaderProps = {
  title?: string;
  subtitle?: string;
  /** When true, subtitle wraps to multiple lines instead of truncating */
  subtitleMultiline?: boolean;
  variant?: 'back' | 'close';
  fallbackHref?: Href;
  rightAction?: React.ReactNode;
  /** When set, back/close uses this instead of router navigation */
  onClose?: () => void;
};

export function ScreenHeader({
  title,
  subtitle,
  subtitleMultiline = false,
  variant = 'back',
  fallbackHref = '/',
  rightAction,
  onClose,
}: ScreenHeaderProps) {
  const router = useRouter();
  const iconName = variant === 'close' ? 'x' : 'chevron-left';

  const handleBack = () => {
    if (onClose) {
      onClose();
      return;
    }
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace(fallbackHref);
  };

  return (
    <View style={styles.container}>
      <Pressable
        style={styles.backButton}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        onPress={handleBack}
      >
        <Feather name={iconName} size={28} color="#ffffff" />
      </Pressable>

      <View style={styles.center}>
        {title ? <Text style={styles.title} numberOfLines={1}>{title}</Text> : null}
        {subtitle ? (
          <Text
            style={[styles.subtitle, subtitleMultiline && styles.subtitleMultiline]}
            numberOfLines={subtitleMultiline ? undefined : 1}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>

      <View style={styles.right}>{rightAction ?? <View style={styles.placeholder} />}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -8,
    flexShrink: 0,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    minWidth: 0,
  },
  title: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    color: '#ffffff',
    fontSize: 12,
    marginTop: 2,
    textAlign: 'center',
  },
  subtitleMultiline: {
    alignSelf: 'stretch',
    width: '100%',
  },
  right: {
    width: 44,
    alignItems: 'flex-end',
    justifyContent: 'center',
    flexShrink: 0,
  },
  placeholder: {
    width: 28,
    height: 28,
  },
});
