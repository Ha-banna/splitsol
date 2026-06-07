import React, { useEffect, useState } from 'react';
import { View, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScreenHeader } from '@/components/screen-header';
import { GroupFormFields } from '@/components/group-form-fields';
import { GroupIconPicker } from '@/components/group-icon-picker';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingButton } from '@/components/ui/loading-button';
import { SkeletonGroupDetail } from '@/components/ui/skeleton';
import { useArchiveGroup, useGroup, useUpdateGroup, useUploadGroupIcon } from '@/hooks/queries';
import { showAppAlert } from '@/lib/app-alert';
import { showErrorAlert } from '@/lib/errors';
import { confirmDestructive } from '@/lib/confirm';
import { pickGroupIconImage, type PickedGroupIcon } from '@/lib/pick-group-icon';

function paramId(id: string | string[] | undefined): string {
  if (typeof id === 'string') return id;
  return id?.[0] ?? '';
}

export default function EditGroupScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const groupId = paramId(id);
  const router = useRouter();
  const { data: detail, isLoading, isError, refetch } = useGroup(groupId);
  const updateGroup = useUpdateGroup(groupId);
  const uploadIcon = useUploadGroupIcon(groupId);
  const archiveGroup = useArchiveGroup();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [pickedIcon, setPickedIcon] = useState<PickedGroupIcon | null>(null);

  useEffect(() => {
    if (detail?.group) {
      setName(detail.group.name);
      setDescription(detail.group.description ?? '');
    }
  }, [detail?.group]);

  const isValid = name.trim().length > 0 && groupId.length > 0;
  const groupHref = `/group/${groupId}` as const;

  const handlePickIcon = async () => {
    if (!groupId) return;
    const picked = await pickGroupIconImage();
    if (!picked) return;
    setPickedIcon(picked);
    try {
      await uploadIcon.mutateAsync({
        image_base64: picked.base64,
        mime_type: picked.mimeType,
      });
      setPickedIcon(null);
    } catch (err) {
      showErrorAlert(err, 'Failed to upload group photo');
    }
  };

  const handleSave = async () => {
    if (!groupId) return;
    try {
      await updateGroup.mutateAsync({
        name: name.trim(),
        description: description.trim() || null,
      });
      router.replace(groupHref);
    } catch (err) {
      showErrorAlert(err, 'Failed to update group');
    }
  };

  const performDelete = async () => {
    if (!groupId) {
      showAppAlert('Error', 'Missing group id');
      return;
    }
    try {
      await archiveGroup.mutateAsync(groupId);
      if (router.canDismiss()) {
        router.dismissAll();
      }
      router.replace('/(tabs)');
    } catch (err) {
      showErrorAlert(err, 'Failed to delete group');
    }
  };

  const handleDelete = () => {
    void confirmDestructive(
      'Delete group?',
      'This will remove the group from your list. Expenses and history are kept in the database.',
    ).then((confirmed) => {
      if (confirmed) void performDelete();
    });
  };

  if (!groupId) {
    return (
      <SafeAreaView className="flex-1 bg-slate-900">
        <ScreenHeader title="Edit Group" variant="close" fallbackHref="/" />
      </SafeAreaView>
    );
  }

  if (isLoading && !detail) {
    return (
      <SafeAreaView className="flex-1 bg-slate-900">
        <ScreenHeader title="Edit Group" variant="close" fallbackHref={groupHref} />
        <SkeletonGroupDetail />
      </SafeAreaView>
    );
  }

  if (isError && !detail) {
    return (
      <SafeAreaView className="flex-1 bg-slate-900">
        <ScreenHeader title="Edit Group" variant="close" fallbackHref={groupHref} />
        <EmptyState
          icon="alert-circle"
          title="Could not load group"
          description="Check your connection and try again."
          actionLabel="Try again"
          onAction={() => void refetch()}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-900">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScreenHeader title="Edit Group" variant="close" fallbackHref={groupHref} />

        <ScrollView className="flex-1 px-4 pt-8">
          <GroupIconPicker
            iconUrl={detail?.group.icon_url}
            preview={pickedIcon}
            name={name}
            onPress={() => void handlePickIcon()}
            loading={uploadIcon.isPending}
            label={detail?.group.icon_url || pickedIcon ? 'Change group photo' : 'Add group photo'}
          />
          <GroupFormFields
            name={name}
            description={description}
            onNameChange={setName}
            onDescriptionChange={setDescription}
          />
        </ScrollView>

        <View className="p-4 bg-slate-900 border-t border-slate-800 gap-3">
          <LoadingButton
            label="Save Changes"
            loading={updateGroup.isPending}
            disabled={!isValid || archiveGroup.isPending || uploadIcon.isPending}
            onPress={() => void handleSave()}
          />
          <LoadingButton
            label="Delete Group"
            variant="danger"
            loading={archiveGroup.isPending}
            disabled={updateGroup.isPending || !groupId}
            onPress={handleDelete}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
