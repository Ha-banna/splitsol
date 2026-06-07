import { getSupabase } from '../lib/supabase';
import { User } from '../types';
import { notFound } from '../utils/errors';
import { parseUserAvatarPayload } from '../utils/userAvatar';

const BUCKET = 'user-avatars';

function rowToUser(row: Record<string, unknown>): User {
  return row as unknown as User;
}

export async function uploadUserAvatar(
  userId: string,
  imageBase64: string,
  mimeType: string,
): Promise<User> {
  const { buffer, mimeType: resolvedMime, ext } = parseUserAvatarPayload(imageBase64, mimeType);
  const storagePath = `${userId}/avatar.${ext}`;

  const db = getSupabase();
  const { error: uploadError } = await db.storage.from(BUCKET).upload(storagePath, buffer, {
    contentType: resolvedMime,
    upsert: true,
  });

  if (uploadError) {
    throw new Error(
      `Failed to upload avatar (${uploadError.message}). Ensure Supabase bucket "${BUCKET}" exists.`,
    );
  }

  const { data: urlData } = db.storage.from(BUCKET).getPublicUrl(storagePath);

  const { data, error } = await db
    .from('users')
    .update({ avatar_url: urlData.publicUrl, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select('*')
    .single();

  if (error || !data) throw notFound('User not found');
  return rowToUser(data);
}
