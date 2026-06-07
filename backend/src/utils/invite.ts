import { randomBytes } from 'crypto';

export function generateInviteCode(): string {
  return randomBytes(6).toString('hex');
}
