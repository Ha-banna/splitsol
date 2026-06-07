import { getSupabase } from '../lib/supabase';
import { badRequest } from '../utils/errors';

export type FeedbackCategory = 'bug' | 'suggestion' | 'other';

export type FeedbackItem = {
  id: string;
  user_id: string;
  category: FeedbackCategory;
  message: string;
  platform: string | null;
  app_version: string | null;
  created_at: string;
  user: {
    display_name: string;
    username: string | null;
    wallet_address: string;
  };
};

const VALID_CATEGORIES = new Set<FeedbackCategory>(['bug', 'suggestion', 'other']);

export async function submitFeedback(
  userId: string,
  input: {
    category: string;
    message: string;
    platform?: string;
    app_version?: string;
  },
): Promise<{ id: string; created_at: string }> {
  const category = input.category as FeedbackCategory;
  if (!VALID_CATEGORIES.has(category)) {
    throw badRequest('category must be bug, suggestion, or other');
  }

  const message = input.message?.trim() ?? '';
  if (message.length < 10) {
    throw badRequest('message must be at least 10 characters');
  }
  if (message.length > 2000) {
    throw badRequest('message must be at most 2000 characters');
  }

  const { data, error } = await getSupabase()
    .from('user_feedback')
    .insert({
      user_id: userId,
      category,
      message,
      platform: input.platform?.trim().slice(0, 32) || null,
      app_version: input.app_version?.trim().slice(0, 32) || null,
    })
    .select('id, created_at')
    .single();

  if (error) throw error;
  return data as { id: string; created_at: string };
}

export async function listFeedbackForAdmin(limit = 100): Promise<FeedbackItem[]> {
  const { data, error } = await getSupabase()
    .from('user_feedback')
    .select(
      'id, user_id, category, message, platform, app_version, created_at, user:users(display_name, username, wallet_address)',
    )
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (data ?? []).map((row) => {
    const nested = row.user as
      | { display_name: string; username: string | null; wallet_address: string }
      | { display_name: string; username: string | null; wallet_address: string }[];
    const userRow = Array.isArray(nested) ? nested[0] : nested;
    return {
      id: row.id as string,
      user_id: row.user_id as string,
      category: row.category as FeedbackCategory,
      message: row.message as string,
      platform: row.platform as string | null,
      app_version: row.app_version as string | null,
      created_at: row.created_at as string,
      user: userRow,
    };
  });
}

export async function getFeedbackSummary(): Promise<{
  total: number;
  bugs: number;
  suggestions: number;
  other: number;
  last_7d: number;
}> {
  const db = getSupabase();
  const since = new Date();
  since.setDate(since.getDate() - 7);
  const sinceIso = since.toISOString();

  const [total, bugs, suggestions, other, recent] = await Promise.all([
    db.from('user_feedback').select('*', { count: 'exact', head: true }),
    db.from('user_feedback').select('*', { count: 'exact', head: true }).eq('category', 'bug'),
    db
      .from('user_feedback')
      .select('*', { count: 'exact', head: true })
      .eq('category', 'suggestion'),
    db.from('user_feedback').select('*', { count: 'exact', head: true }).eq('category', 'other'),
    db
      .from('user_feedback')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', sinceIso),
  ]);

  return {
    total: total.count ?? 0,
    bugs: bugs.count ?? 0,
    suggestions: suggestions.count ?? 0,
    other: other.count ?? 0,
    last_7d: recent.count ?? 0,
  };
}
