import { badRequest } from './errors';

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

export function normalizeUsername(input: string): string {
  return input.trim().toLowerCase().replace(/^@+/, '');
}

export function validateUsername(input: string): string {
  const username = normalizeUsername(input);
  if (!USERNAME_RE.test(username)) {
    throw badRequest(
      'username must be 3–20 characters: lowercase letters, numbers, and underscores only',
    );
  }
  return username;
}
