import { getSupabase } from '../lib/supabase';
import { Group } from '../types';
import { notFound } from '../utils/errors';
import { parseGroupIconPayload } from '../utils/groupIcon';
import { assertGroupMember } from './group.service';

function rowToGroup(row: Record<string, unknown>): Group {
  return row as unknown as Group;
}

const BUCKET = 'group-icons';

export async function uploadGroupIcon(
  groupId: string,
  userId: string,
  imageBase64: string,
  mimeType: string,
): Promise<Group> {
  await assertGroupMember(groupId, userId);

  const { buffer, mimeType: resolvedMime, ext } = parseGroupIconPayload(imageBase64, mimeType);
  const storagePath = `${groupId}/icon.${ext}`;

  const db = getSupabase();
  const { error: uploadError } = await db.storage.from(BUCKET).upload(storagePath, buffer, {
    contentType: resolvedMime,
    upsert: true,
  });

  if (uploadError) {
    throw new Error(
      `Failed to upload group icon (${uploadError.message}). Ensure Supabase bucket "${BUCKET}" exists and is public.`,
    );
  }

  const { data: urlData } = db.storage.from(BUCKET).getPublicUrl(storagePath);
  const iconUrl = urlData.publicUrl;

  const { data, error } = await db
    .from('groups')
    .update({ icon_url: iconUrl, updated_at: new Date().toISOString() })
    .eq('id', groupId)
    .select('*')
    .single();

  if (error || !data) throw notFound('Group not found');
  return rowToGroup(data);
}
