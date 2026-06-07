const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

export function normalizeUsername(input: string): string {
  return input.trim().toLowerCase().replace(/^@/, '');
}

export function isValidUsername(input: string): boolean {
  return USERNAME_RE.test(normalizeUsername(input));
}

export function formatUsername(username: string | null | undefined): string {
  if (!username) return '';
  return `@${username}`;
}
