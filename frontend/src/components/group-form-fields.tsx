import { Feather } from '@expo/vector-icons';
import React from 'react';
import { View, Text, TextInput } from 'react-native';
import {
  GROUP_DESCRIPTION_MAX_LENGTH,
  GROUP_NAME_MAX_LENGTH,
} from '@/lib/constants';

type GroupFormFieldsProps = {
  name: string;
  description: string;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  nameAutoFocus?: boolean;
};

function clamp(value: string, max: number): string {
  return value.length > max ? value.slice(0, max) : value;
}

export function GroupFormFields({
  name,
  description,
  onNameChange,
  onDescriptionChange,
  nameAutoFocus,
}: GroupFormFieldsProps) {
  return (
    <>
      <View className="mb-8">
        <View className="flex-row justify-between items-center mb-2 ml-1">
          <Text className="text-white font-medium">Group Name</Text>
          <Text className="text-white text-xs">
            {name.length}/{GROUP_NAME_MAX_LENGTH}
          </Text>
        </View>
        <View className="bg-slate-800 rounded-2xl border border-slate-700 px-4 py-3 flex-row items-center">
          <Feather name="users" size={20} color="#ffffff" style={{ marginRight: 12 }} />
          <TextInput
            className="flex-1 text-white text-lg"
            placeholder="Trip to Paris, Apartment 4B..."
            placeholderTextColor="#ffffff"
            value={name}
            onChangeText={(text) => onNameChange(clamp(text, GROUP_NAME_MAX_LENGTH))}
            maxLength={GROUP_NAME_MAX_LENGTH}
            autoFocus={nameAutoFocus}
          />
        </View>
      </View>

      <View className="mb-8">
        <View className="flex-row justify-between items-center mb-2 ml-1">
          <Text className="text-white font-medium">Description (optional)</Text>
          <Text className="text-white text-xs">
            {description.length}/{GROUP_DESCRIPTION_MAX_LENGTH}
          </Text>
        </View>
        <View className="bg-slate-800 rounded-2xl border border-slate-700 px-4 py-3">
          <TextInput
            className="text-white text-base min-h-[80px]"
            placeholder="Trip notes, apartment details..."
            placeholderTextColor="#ffffff"
            value={description}
            onChangeText={(text) => onDescriptionChange(clamp(text, GROUP_DESCRIPTION_MAX_LENGTH))}
            maxLength={GROUP_DESCRIPTION_MAX_LENGTH}
            multiline
            textAlignVertical="top"
          />
        </View>
      </View>
    </>
  );
}
