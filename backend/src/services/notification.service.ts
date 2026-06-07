import { env } from '../config/env';
import { getSupabase } from '../lib/supabase';
import { getUserById } from './user.service';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

export type PushData = Record<string, string>;

type PushMessage = {
  to: string;
  title: string;
  body: string;
  data?: PushData;
  sound: 'default';
};

export function isExpoPushToken(token: string): boolean {
  return (
    /^ExponentPushToken\[[^\]]+\]$/.test(token) || /^ExpoPushToken\[[^\]]+\]$/.test(token)
  );
}

async function getPushTokensForUserIds(userIds: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(userIds.filter(Boolean))];
  if (unique.length === 0) return new Map();

  const { data, error } = await getSupabase()
    .from('users')
    .select('id, push_token')
    .in('id', unique);

  if (error) {
    console.warn('[push] Failed to load push tokens', error.message);
    return new Map();
  }

  const map = new Map<string, string>();
  for (const row of data ?? []) {
    const token = row.push_token as string | null;
    if (token && isExpoPushToken(token)) {
      map.set(row.id as string, token);
    }
  }
  return map;
}

async function sendExpoPushChunk(messages: PushMessage[]): Promise<void> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  if (env.expoAccessToken) {
    headers.Authorization = `Bearer ${env.expoAccessToken}`;
  }

  const res = await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify(messages),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.warn('[push] Expo API error', res.status, text);
  }
}

/** Sends push notifications; never throws (logs warnings instead). */
export async function sendPushToUserIds(
  userIds: string[],
  payload: { title: string; body: string; data?: PushData },
  options?: { excludeUserId?: string },
): Promise<void> {
  try {
    const targets = options?.excludeUserId
      ? userIds.filter((id) => id !== options.excludeUserId)
      : [...userIds];
    if (targets.length === 0) return;

    const tokenMap = await getPushTokensForUserIds(targets);
    const messages: PushMessage[] = [];

    for (const userId of targets) {
      const token = tokenMap.get(userId);
      if (!token) continue;
      messages.push({
        to: token,
        title: payload.title,
        body: payload.body,
        data: payload.data,
        sound: 'default',
      });
    }

    if (messages.length === 0) return;

    for (let i = 0; i < messages.length; i += 100) {
      await sendExpoPushChunk(messages.slice(i, i + 100));
    }
  } catch (err) {
    console.warn('[push] send failed', err);
  }
}

async function displayName(userId: string): Promise<string> {
  const user = await getUserById(userId);
  return user.display_name?.trim() || user.username?.trim() || 'Someone';
}

async function groupMemberIds(groupId: string): Promise<string[]> {
  const { data } = await getSupabase()
    .from('group_members')
    .select('user_id')
    .eq('group_id', groupId);
  return (data ?? []).map((r) => r.user_id as string);
}

async function groupName(groupId: string): Promise<string> {
  const { data } = await getSupabase().from('groups').select('name').eq('id', groupId).maybeSingle();
  return (data?.name as string) || 'a group';
}

export function notifyFriendRequestReceived(
  toUserId: string,
  fromUserId: string,
  requestId: string,
): void {
  void (async () => {
    const from = await displayName(fromUserId);
    await sendPushToUserIds([toUserId], {
      title: 'New friend request',
      body: `${from} wants to connect on SplitSOL`,
      data: { type: 'friend_request_received', request_id: requestId },
    });
  })();
}

export function notifyFriendRequestAccepted(fromUserId: string, acceptedByUserId: string): void {
  void (async () => {
    const accepter = await displayName(acceptedByUserId);
    await sendPushToUserIds([fromUserId], {
      title: "You're friends now",
      body: `${accepter} accepted your friend request`,
      data: { type: 'friend_request_accepted', user_id: acceptedByUserId },
    });
  })();
}

export function notifyExpenseAdded(
  groupId: string,
  actorUserId: string,
  description: string,
  amountUsdc: number,
): void {
  void (async () => {
    const [name, actor, memberIds] = await Promise.all([
      groupName(groupId),
      displayName(actorUserId),
      groupMemberIds(groupId),
    ]);
    const amount = amountUsdc.toFixed(2);
    await sendPushToUserIds(memberIds, {
      title: `New expense · ${name}`,
      body: `${actor} added "${description}" · $${amount} USDC`,
      data: { type: 'expense_added', group_id: groupId },
    }, { excludeUserId: actorUserId });
  })();
}

export function notifyGroupMemberAdded(
  groupId: string,
  addedUserId: string,
  addedByUserId: string,
): void {
  void (async () => {
    const [name, adder] = await Promise.all([groupName(groupId), displayName(addedByUserId)]);
    await sendPushToUserIds([addedUserId], {
      title: `Added to ${name}`,
      body: `${adder} added you to this group`,
      data: { type: 'group_member_added', group_id: groupId },
    });
  })();
}

export function notifyGroupJoined(
  groupId: string,
  joinerUserId: string,
): void {
  void (async () => {
    const [name, joiner, memberIds] = await Promise.all([
      groupName(groupId),
      displayName(joinerUserId),
      groupMemberIds(groupId),
    ]);
    await sendPushToUserIds(memberIds, {
      title: `New member · ${name}`,
      body: `${joiner} joined your group`,
      data: { type: 'group_joined', group_id: groupId },
    }, { excludeUserId: joinerUserId });
  })();
}

export function notifyPeerTransferReceived(
  toUserId: string,
  fromUserId: string,
  amountUsdc: number,
): void {
  void (async () => {
    const sender = await displayName(fromUserId);
    const amount = amountUsdc.toFixed(2);
    await sendPushToUserIds([toUserId], {
      title: 'USDC received',
      body: `${sender} sent you $${amount}`,
      data: { type: 'peer_transfer_received', user_id: fromUserId },
    });
  })();
}

export function notifySettlementReceived(
  groupId: string,
  creditorUserId: string,
  payerUserId: string,
  amountUsdc: number,
): void {
  void (async () => {
    const [name, payer] = await Promise.all([groupName(groupId), displayName(payerUserId)]);
    const amount = amountUsdc.toFixed(2);
    await sendPushToUserIds([creditorUserId], {
      title: `Settlement · ${name}`,
      body: `${payer} paid you $${amount} USDC`,
      data: { type: 'settlement_received', group_id: groupId },
    });
  })();
}
