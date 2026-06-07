import { badRequest } from './errors';

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export function parseUserAvatarPayload(
  image_base64: unknown,
  mime_type: unknown,
): { buffer: Buffer; mimeType: string; ext: string } {
  if (typeof image_base64 !== 'string' || !image_base64.trim()) {
    throw badRequest('image_base64 is required');
  }

  const mimeType =
    typeof mime_type === 'string' && MIME_TO_EXT[mime_type] ? mime_type : 'image/jpeg';
  const ext = MIME_TO_EXT[mimeType];

  const base64 = image_base64.replace(/^data:image\/\w+;base64,/, '').trim();
  let buffer: Buffer;
  try {
    buffer = Buffer.from(base64, 'base64');
  } catch {
    throw badRequest('image_base64 is invalid');
  }

  if (buffer.length === 0) throw badRequest('image is empty');
  if (buffer.length > MAX_AVATAR_BYTES) {
    throw badRequest('image must be at most 2MB');
  }

  return { buffer, mimeType, ext };
}
