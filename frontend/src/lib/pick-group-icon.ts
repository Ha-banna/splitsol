import * as ImagePicker from 'expo-image-picker';
import { Alert, Platform } from 'react-native';

export type PickedGroupIcon = {
  base64: string;
  mimeType: string;
  previewUri: string;
};

export async function pickGroupIconImage(): Promise<PickedGroupIcon | null> {
  if (Platform.OS !== 'web') {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        'Permission needed',
        'Allow access to your photo library to set a group icon.',
      );
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

  if (result.canceled || !result.assets[0]) {
    return null;
  }

  const asset = result.assets[0];
  if (!asset.base64) {
    Alert.alert('Error', 'Could not read the selected image. Try another photo.');
    return null;
  }

  const mimeType = asset.mimeType ?? 'image/jpeg';
  return {
    base64: asset.base64,
    mimeType,
    previewUri: asset.uri,
  };
}
