import { Linking, Platform } from 'react-native';
import { router } from 'expo-router';

export const LEGAL = {
  termsOfServiceUrl:
    'https://app.notion.com/p/Terms-Of-Service-3770de16de1a80a7a793f14eb61fd895',
  privacyPolicyUrl:
    'https://app.notion.com/p/privacy-policy-3770de16de1a80ae9ac7fa25e46cf958',
} as const;

const LEGAL_TITLES: Record<string, string> = {
  [LEGAL.termsOfServiceUrl]: 'Terms of Service',
  [LEGAL.privacyPolicyUrl]: 'Privacy Policy',
};

export function openLegalUrl(url: string): void {
  if (Platform.OS === 'web') {
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }
  router.push({
    pathname: '/legal/view',
    params: {
      url,
      title: LEGAL_TITLES[url] ?? 'Legal',
    },
  });
}

/** Fallback if navigation fails on some devices. */
export async function openLegalUrlSafe(url: string): Promise<void> {
  try {
    openLegalUrl(url);
  } catch {
    await Linking.openURL(url);
  }
}
