import { beforeEach, describe, expect, it, vi } from 'vitest';

const supabaseMock = vi.hoisted(() => ({
  from: vi.fn(),
}));

vi.mock('../src/lib/supabase', () => ({
  getSupabase: () => supabaseMock,
}));

vi.mock('../src/services/user.service', () => ({
  getUserById: vi.fn(async (id: string) => ({
    id,
    display_name: 'Test User',
    username: 'testuser',
    wallet_address: 'wallet',
    avatar_url: null,
    push_token: null,
    email: null,
    privy_id: null,
    sol_domain: null,
    created_at: '',
    updated_at: '',
  })),
}));

import {
  isExpoPushToken,
  sendPushToUserIds,
} from '../src/services/notification.service';

describe('notification.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, text: async () => '' }),
    );
  });

  it('validates Expo push token format', () => {
    expect(isExpoPushToken('ExponentPushToken[abc]')).toBe(true);
    expect(isExpoPushToken('ExpoPushToken[abc]')).toBe(true);
    expect(isExpoPushToken('not-a-token')).toBe(false);
  });

  it('sends push to users with valid tokens', async () => {
    supabaseMock.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        in: vi.fn().mockResolvedValue({
          data: [
            { id: 'user-1', push_token: 'ExponentPushToken[token1]' },
            { id: 'user-2', push_token: null },
          ],
          error: null,
        }),
      }),
    });

    await sendPushToUserIds(['user-1', 'user-2'], {
      title: 'Hi',
      body: 'Hello',
      data: { type: 'test' },
    });

    expect(fetch).toHaveBeenCalledTimes(1);
    const [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      RequestInit,
    ];
    const body = JSON.parse(init.body as string) as { to: string; title: string }[];
    expect(body).toHaveLength(1);
    expect(body[0].to).toBe('ExponentPushToken[token1]');
    expect(body[0].title).toBe('Hi');
  });

  it('excludes actor from recipients', async () => {
    supabaseMock.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        in: vi.fn().mockResolvedValue({
          data: [{ id: 'actor', push_token: 'ExponentPushToken[actor]' }],
          error: null,
        }),
      }),
    });

    await sendPushToUserIds(['actor'], { title: 'T', body: 'B' }, { excludeUserId: 'actor' });

    expect(fetch).not.toHaveBeenCalled();
  });
});
