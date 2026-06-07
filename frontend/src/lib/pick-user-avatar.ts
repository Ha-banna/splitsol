import * as ImagePicker from 'expo-image-picker';
import { Alert, Platform } from 'react-native';

export type PickedUserAvatar = {
  base64: string;
  mimeType: string;
  previewUri: string;
};

export async function pickUserAvatarImage(): Promise<PickedUserAvatar | null> {
  if (Platform.OS !== 'web') {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow photo library access to set your profile picture.');
      return null;
    }
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.85,
    base64: true,
  });

  if (result.canceled || !result.assets[0]?.base64) {
    return null;
  }

  const asset = result.assets[0];
  return {
    base64: asset.base64!,
    mimeType: asset.mimeType ?? 'image/jpeg',
    previewUri: asset.uri,
  };
}
