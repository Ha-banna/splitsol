import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React from 'react';
import { Text, View } from 'react-native';

type UserAvatarProps = {
  avatarUrl?: string | null;
  displayName?: string;
  username?: string | null;
  size?: number;
};

function placeholderInitial(displayName?: string, username?: string | null): string {
  const fromName = displayName?.trim();
  if (fromName) return fromName[0]?.toUpperCase() ?? '';
  const fromUser = username?.trim();
  if (fromUser) return fromUser[0]?.toUpperCase() ?? '';
  return '';
}

export function UserAvatar({
  avatarUrl,
  displayName,
  username,
  size = 48,
}: UserAvatarProps) {
  const radius = size / 2;
  const initial = placeholderInitial(displayName, username);

  if (avatarUrl) {
    return (
      <Image
        source={{ uri: avatarUrl }}
        style={{ width: size, height: size, borderRadius: radius }}
        contentFit="cover"
        accessibilityLabel={displayName ? `${displayName} avatar` : 'User avatar'}
      />
    );
  }

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        backgroundColor: '#1e293b',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#475569',
      }}
      accessibilityLabel={displayName ? `${displayName} avatar placeholder` : 'User avatar placeholder'}
    >
      {initial ? (
        <Text style={{ color: '#ffffff', fontSize: size * 0.38, fontWeight: '700' }}>{initial}</Text>
      ) : (
        <Feather name="user" size={size * 0.42} color="#ffffff" />
      )}
    </View>
  );
}
