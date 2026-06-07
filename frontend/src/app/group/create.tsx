import React, { useState } from 'react';
import { View, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { ScreenHeader } from '@/components/screen-header';
import { GroupFormFields } from '@/components/group-form-fields';
import { GroupIconPicker } from '@/components/group-icon-picker';
import { LoadingButton } from '@/components/ui/loading-button';
import { queryKeys, useCreateGroup } from '@/hooks/queries';
import { showAppAlert } from '@/lib/app-alert';
import { getErrorMessage, showErrorAlert } from '@/lib/errors';
import { pickGroupIconImage, type PickedGroupIcon } from '@/lib/pick-group-icon';

export default function CreateGroupScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const createGroup = useCreateGroup();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [pickedIcon, setPickedIcon] = useState<PickedGroupIcon | null>(null);
  const [iconUploading, setIconUploading] = useState(false);

  const isValid = name.trim().length > 0;
  const isBusy = createGroup.isPending || iconUploading;

  const handlePickIcon = async () => {
    const picked = await pickGroupIconImage();
    if (picked) setPickedIcon(picked);
  };

  const handleCreate = async () => {
    try {
      const group = await createGroup.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
      });

      if (pickedIcon) {
        setIconUploading(true);
        try {
          await api.uploadGroupIcon(group.id, {
            image_base64: pickedIcon.base64,
            mime_type: pickedIcon.mimeType,
          });
          await queryClient.invalidateQueries({ queryKey: queryKeys.groups });
          await queryClient.invalidateQueries({ queryKey: queryKeys.group(group.id) });
        } catch (err) {
          showAppAlert(
            'Icon upload failed',
            getErrorMessage(err, 'Group created but icon upload failed'),
          );
        } finally {
          setIconUploading(false);
        }
      }

      router.replace(`/group/${group.id}`);
    } catch (err) {
      showErrorAlert(err, 'Failed to create group');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-900">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScreenHeader title="New Group" variant="close" fallbackHref="/" />

        <ScrollView className="flex-1 px-4 pt-8">
          <GroupIconPicker
            preview={pickedIcon}
            name={name}
            onPress={() => void handlePickIcon()}
            loading={iconUploading}
            label={pickedIcon ? 'Change group photo' : 'Add group photo'}
          />

          <GroupFormFields
            name={name}
            description={description}
            onNameChange={setName}
            onDescriptionChange={setDescription}
            nameAutoFocus
          />
        </ScrollView>

        <View className="p-4 bg-slate-900 border-t border-slate-800">
          <LoadingButton
            label="Create Group"
            loading={isBusy}
            disabled={!isValid}
            onPress={() => void handleCreate()}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
