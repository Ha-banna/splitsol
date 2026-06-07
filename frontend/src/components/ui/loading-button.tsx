import React from 'react';
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type TouchableOpacityProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

type LoadingButtonProps = Omit<TouchableOpacityProps, 'style'> & {
  label: string;
  loading?: boolean;
  variant?: 'primary' | 'danger' | 'secondary';
  containerStyle?: StyleProp<ViewStyle>;
};

export function LoadingButton({
  label,
  loading = false,
  variant = 'primary',
  disabled,
  containerStyle,
  ...props
}: LoadingButtonProps) {
  const isDisabled = disabled || loading;

  const faceStyle = [
    buttonStyles.face,
    variantStyles[variant].face,
    isDisabled && variant === 'primary' ? buttonStyles.disabledPrimaryFace : null,
    isDisabled && variant !== 'primary' ? buttonStyles.disabledFace : null,
  ];

  const labelStyle = [
    buttonStyles.label,
    variantStyles[variant].label,
    isDisabled ? buttonStyles.disabledLabel : null,
  ];

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      disabled={isDisabled}
      style={[buttonStyles.touchable, containerStyle]}
      {...props}
    >
      <View style={faceStyle}>
        {loading ? (
          <ActivityIndicator color={variant === 'danger' ? '#fb7185' : '#ffffff'} />
        ) : (
          <Text style={labelStyle}>{label}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const buttonStyles = StyleSheet.create({
  touchable: {
    alignSelf: 'stretch',
    width: '100%',
  },
  face: {
    minHeight: 56,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledFace: {
    opacity: 0.65,
  },
  disabledPrimaryFace: {
    backgroundColor: '#312e81',
    borderWidth: 1,
    borderColor: '#4338ca',
  },
  label: {
    fontSize: 17,
    fontWeight: Platform.OS === 'android' ? 'bold' : '700',
    letterSpacing: 0.2,
    textAlign: 'center',
    includeFontPadding: false,
  },
  disabledLabel: {
    color: '#ffffff',
  },
});

const variantStyles = {
  primary: StyleSheet.create({
    face: {
      backgroundColor: '#a855f7',
      ...Platform.select({
        android: { elevation: 4 },
        default: {
          shadowColor: '#a855f7',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.35,
          shadowRadius: 10,
        },
      }),
    },
    label: {
      color: '#ffffff',
    },
  }),
  danger: StyleSheet.create({
    face: {
      backgroundColor: 'rgba(244, 63, 94, 0.2)',
      borderWidth: 1,
      borderColor: 'rgba(244, 63, 94, 0.5)',
    },
    label: {
      color: '#fb7185',
    },
  }),
  secondary: StyleSheet.create({
    face: {
      backgroundColor: '#334155',
      borderWidth: 1,
      borderColor: '#475569',
    },
    label: {
      color: '#ffffff',
    },
  }),
};
