import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const adminServiceMock = vi.hoisted(() => ({
  getAdminStats: vi.fn(),
}));

const feedbackServiceMock = vi.hoisted(() => ({
  listFeedbackForAdmin: vi.fn(),
}));

vi.mock('../src/services/admin.service', () => adminServiceMock);
vi.mock('../src/services/feedback.service', () => feedbackServiceMock);

import { createApp } from '../src/app';

const mockStats = {
  generated_at: '2026-05-20T00:00:00.000Z',
  platform: { wallet_address: 'wallet', fee_per_settlement_usdc: 0.25 },
  revenue: { total_usdc: 1.25, settlement_count: 5, on_chain_settlements: 4, dev_mock_settlements: 1 },
  transactions: {
    total: 10,
    settlements: 5,
    peer_transfers: 5,
    on_chain: 8,
    dev_mock: 2,
    total_volume_usdc: 100,
    settlement_volume_usdc: 80,
    peer_volume_usdc: 20,
  },
  users: {
    total: 20,
    with_username: 18,
    with_push_token: 5,
    active_7d: 8,
    active_30d: 15,
    new_7d: 2,
    new_30d: 6,
  },
  social: { friend_links: 10, mutual_friend_pairs: 5, pending_friend_requests: 1 },
  groups: { total: 4, active: 3, archived: 1, total_memberships: 12 },
  expenses: { total: 30, active: 28, deleted: 2, total_volume_usdc: 500 },
  periods: {
    last_7d: {
      revenue_usdc: 0.5,
      settlements: 2,
      peer_transfers: 1,
      transactions: 3,
      volume_usdc: 40,
      new_users: 1,
      expenses: 5,
      expense_volume_usdc: 100,
    },
    last_30d: {
      revenue_usdc: 1.25,
      settlements: 5,
      peer_transfers: 5,
      transactions: 10,
      volume_usdc: 100,
      new_users: 6,
      expenses: 20,
      expense_volume_usdc: 400,
    },
  },
  recent: [],
  feedback: { total: 3, bugs: 1, suggestions: 2, other: 0, last_7d: 1 },
};

describe('admin routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    adminServiceMock.getAdminStats.mockResolvedValue(mockStats);
    feedbackServiceMock.listFeedbackForAdmin.mockResolvedValue([
      {
        id: 'fb1',
        user_id: 'u1',
        category: 'bug',
        message: 'Settle button does nothing',
        platform: 'android',
        app_version: '1.0.0',
        created_at: '2026-05-20T12:00:00.000Z',
        user: { display_name: 'Alex', username: 'alex', wallet_address: 'wallet1' },
      },
    ]);
    vi.stubEnv('NODE_ENV', 'development');
    delete process.env.ADMIN_ENABLED;
  });

  it('serves admin dashboard HTML in development', async () => {
    const app = createApp({ enableRateLimit: false });
    const res = await request(app).get('/admin');
    expect(res.status).toBe(200);
    expect(res.type).toMatch(/html/);
    expect(res.text).toContain('SplitSOL Admin');
  });

  it('returns admin stats JSON', async () => {
    const app = createApp({ enableRateLimit: false });
    const res = await request(app).get('/admin/stats');
    expect(res.status).toBe(200);
    expect(res.body.revenue.total_usdc).toBe(1.25);
    expect(res.body.users.active_7d).toBe(8);
    expect(res.body.feedback.total).toBe(3);
  });

  it('returns admin feedback JSON', async () => {
    const app = createApp({ enableRateLimit: false });
    const res = await request(app).get('/admin/feedback');
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].category).toBe('bug');
  });

  it('returns 404 in production when ADMIN_ENABLED is not set', async () => {
    vi.doMock('../src/config/env', async () => {
      const actual = await vi.importActual<typeof import('../src/config/env')>('../src/config/env');
      return {
        ...actual,
        isAdminEnabled: () => false,
      };
    });

    vi.resetModules();
    const { createApp: createProdApp } = await import('../src/app');
    const app = createProdApp({ enableRateLimit: false });

    const res = await request(app).get('/admin');
    expect(res.status).toBe(404);

    vi.doUnmock('../src/config/env');
    vi.resetModules();
  });
});
