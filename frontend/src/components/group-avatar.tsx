import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React from 'react';
import { Text, View } from 'react-native';

type GroupAvatarProps = {
  iconUrl?: string | null;
  name?: string;
  size?: number;
};

function placeholderInitial(name?: string): string {
  const trimmed = name?.trim();
  if (!trimmed) return '';
  return trimmed[0]?.toUpperCase() ?? '';
}

export function GroupAvatar({ iconUrl, name, size = 48 }: GroupAvatarProps) {
  const radius = size >= 80 ? size / 2 : size * 0.25;
  const initial = placeholderInitial(name);

  if (iconUrl) {
    return (
      <Image
        source={{ uri: iconUrl }}
        style={{ width: size, height: size, borderRadius: radius }}
        contentFit="cover"
        accessibilityLabel={name ? `${name} icon` : 'Group icon'}
      />
    );
  }

  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor: 'rgba(168, 85, 247, 0.2)',
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: 'rgba(168, 85, 247, 0.35)',
        },
      ]}
      accessibilityLabel={name ? `${name} placeholder icon` : 'Group placeholder icon'}
    >
      {initial ? (
        <Text style={{ color: '#c4b5fd', fontSize: size * 0.38, fontWeight: '700' }}>
          {initial}
        </Text>
      ) : (
        <Feather name="users" size={size * 0.45} color="#a855f7" />
      )}
    </View>
  );
}
