import { badRequest } from './errors';

export const GROUP_NAME_MAX_LENGTH = 80;
export const GROUP_DESCRIPTION_MAX_LENGTH = 280;

export function validateGroupName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) throw badRequest('name is required');
  if (trimmed.length > GROUP_NAME_MAX_LENGTH) {
    throw badRequest(`name must be at most ${GROUP_NAME_MAX_LENGTH} characters`);
  }
  return trimmed;
}

export function validateGroupDescription(description: string | undefined | null): string | null {
  if (description == null || description === '') return null;
  const trimmed = description.trim();
  if (!trimmed) return null;
  if (trimmed.length > GROUP_DESCRIPTION_MAX_LENGTH) {
    throw badRequest(`description must be at most ${GROUP_DESCRIPTION_MAX_LENGTH} characters`);
  }
  return trimmed;
}
