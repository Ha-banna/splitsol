import React from 'react';
import { StyleSheet, Text, type StyleProp, type TextStyle } from 'react-native';
import { BRAND } from '@/lib/branding';
import { LEGAL, openLegalUrlSafe } from '@/lib/legal';

type LegalConsentTextProps = {
  style?: StyleProp<TextStyle>;
};

export function LegalConsentText({ style }: LegalConsentTextProps) {
  return (
    <Text style={[styles.text, style]}>
      By signing up, you agree to our{' '}
      <Text style={styles.link} onPress={() => void openLegalUrlSafe(LEGAL.termsOfServiceUrl)}>
        Terms of Service
      </Text>{' '}
      and{' '}
      <Text style={styles.link} onPress={() => void openLegalUrlSafe(LEGAL.privacyPolicyUrl)}>
        Privacy Policy
      </Text>
      .
    </Text>
  );
}

const styles = StyleSheet.create({
  text: {
    color: '#ffffff',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  link: {
    color: BRAND.purple,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
