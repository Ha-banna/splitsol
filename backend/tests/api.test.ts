import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockGroup, mockUser, authHeader } from './helpers/fixtures';

const mocks = vi.hoisted(() => ({
  authServiceMock: {
    createWalletChallenge: vi.fn(),
    authenticateWallet: vi.fn(),
    authenticatePrivy: vi.fn(),
  },
  userServiceMock: {
    getUserById: vi.fn(),
    getUserByUsername: vi.fn(),
    isUsernameAvailable: vi.fn(),
    updateUser: vi.fn(),
    searchUsers: vi.fn(),
    getUserByWallet: vi.fn(),
    toPublicProfile: vi.fn((u: typeof mockUser) => ({
      id: u.id,
      username: u.username,
      display_name: u.display_name,
      avatar_url: u.avatar_url,
      wallet_address: u.wallet_address,
    })),
  },
  contactServiceMock: {
    listContacts: vi.fn(),
    listIncomingFriendRequests: vi.fn(),
    listOutgoingFriendRequests: vi.fn(),
    sendFriendRequest: vi.fn(),
    acceptFriendRequest: vi.fn(),
    declineFriendRequest: vi.fn(),
    cancelFriendRequest: vi.fn(),
    removeContact: vi.fn(),
    assertAreFriends: vi.fn(),
    areFriends: vi.fn(),
  },
  transferServiceMock: {
    preparePeerTransfer: vi.fn(),
    confirmPeerTransfer: vi.fn(),
  },
  userAvatarServiceMock: {
    uploadUserAvatar: vi.fn(),
  },
  groupServiceMock: {
    listGroupsForUser: vi.fn(),
    createGroup: vi.fn(),
    getGroupDetail: vi.fn(),
    updateGroup: vi.fn(),
    addMemberByWallet: vi.fn(),
    addGroupMember: vi.fn(),
    removeMember: vi.fn(),
    getInviteLink: vi.fn(),
    joinGroupByInvite: vi.fn(),
    assertGroupMember: vi.fn(),
  },
  expenseServiceMock: {
    listExpenses: vi.fn(),
    createExpense: vi.fn(),
    getExpenseById: vi.fn(),
    updateExpense: vi.fn(),
    deleteExpense: vi.fn(),
  },
  balanceServiceMock: {
    getGroupBalances: vi.fn(),
    getSimplifiedDebtsForGroup: vi.fn(),
    getUserSummaryBalances: vi.fn(),
  },
  settlementServiceMock: {
    prepareSettlement: vi.fn(),
    confirmSettlement: vi.fn(),
    listSettlements: vi.fn(),
  },
  activityServiceMock: {
    getActivityFeed: vi.fn(),
  },
  feedbackServiceMock: {
    submitFeedback: vi.fn(),
  },
}));

vi.mock('../src/services/auth.service', () => mocks.authServiceMock);
vi.mock('../src/services/user.service', () => mocks.userServiceMock);
vi.mock('../src/services/contact.service', () => mocks.contactServiceMock);
vi.mock('../src/services/transfer.service', () => mocks.transferServiceMock);
vi.mock('../src/services/userAvatar.service', () => mocks.userAvatarServiceMock);
vi.mock('../src/services/group.service', () => mocks.groupServiceMock);
vi.mock('../src/services/expense.service', () => mocks.expenseServiceMock);
vi.mock('../src/services/balance.service', () => mocks.balanceServiceMock);
vi.mock('../src/services/settlement.service', () => mocks.settlementServiceMock);
vi.mock('../src/services/activity.service', () => mocks.activityServiceMock);
vi.mock('../src/services/feedback.service', () => mocks.feedbackServiceMock);

import { createApp } from '../src/app';

const app = createApp();

function setupDefaultMocks() {
  mocks.authServiceMock.createWalletChallenge.mockResolvedValue({
    message: 'SplitSOL Authentication\nNonce: abc\nTimestamp: 1',
    nonce: 'abc',
    timestamp: 1,
  });
  mocks.authServiceMock.authenticateWallet.mockResolvedValue({
    token: 'mock-token',
    user: mockUser,
  });
  mocks.authServiceMock.authenticatePrivy.mockResolvedValue({
    token: 'mock-token',
    user: mockUser,
  });
  mocks.userServiceMock.getUserById.mockResolvedValue(mockUser);
  mocks.userServiceMock.updateUser.mockImplementation((_id: string, updates: object) =>
    Promise.resolve({ ...mockUser, ...updates }),
  );
  mocks.userServiceMock.getUserByUsername.mockResolvedValue(mockUser);
  mocks.userServiceMock.isUsernameAvailable.mockResolvedValue(true);
  mocks.userServiceMock.searchUsers.mockResolvedValue([mockUser]);
  mocks.contactServiceMock.listContacts.mockResolvedValue([]);
  mocks.contactServiceMock.listIncomingFriendRequests.mockResolvedValue([]);
  mocks.contactServiceMock.listOutgoingFriendRequests.mockResolvedValue([]);
  mocks.contactServiceMock.sendFriendRequest.mockResolvedValue({
    id: 'fr1',
    from_user_id: mockUser.id,
    to_user_id: 'other-user-id',
    status: 'pending',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    user: mockUser,
  });
  mocks.contactServiceMock.acceptFriendRequest.mockResolvedValue({
    id: 'c1',
    contact_user_id: 'other-user-id',
    created_at: '2026-01-01T00:00:00Z',
    user: mockUser,
  });
  mocks.contactServiceMock.declineFriendRequest.mockResolvedValue(undefined);
  mocks.contactServiceMock.cancelFriendRequest.mockResolvedValue(undefined);
  mocks.contactServiceMock.removeContact.mockResolvedValue(undefined);
  mocks.contactServiceMock.assertAreFriends.mockResolvedValue(undefined);
  mocks.contactServiceMock.areFriends.mockResolvedValue(true);
  mocks.transferServiceMock.preparePeerTransfer.mockResolvedValue({
    to_user: mockUser,
    amount_usdc: 5,
    note: null,
    total_usdc: 5,
    serialized_transaction: 'base64tx',
  });
  mocks.transferServiceMock.confirmPeerTransfer.mockResolvedValue({
    transfer: { id: 't1' },
    to_user: mockUser,
  });
  mocks.userAvatarServiceMock.uploadUserAvatar.mockResolvedValue(mockUser);
  mocks.groupServiceMock.listGroupsForUser.mockResolvedValue([
    { ...mockGroup, my_balance_usdc: 0 },
  ]);
  mocks.groupServiceMock.createGroup.mockResolvedValue(mockGroup);
  mocks.groupServiceMock.getGroupDetail.mockResolvedValue({
    group: mockGroup,
    members: [],
    balances: [],
  });
  mocks.groupServiceMock.updateGroup.mockResolvedValue(mockGroup);
  mocks.groupServiceMock.addMemberByWallet.mockResolvedValue({ id: 'm1', user: mockUser });
  mocks.groupServiceMock.addGroupMember.mockResolvedValue({ id: 'm1', user: mockUser });
  mocks.groupServiceMock.removeMember.mockResolvedValue(undefined);
  mocks.groupServiceMock.getInviteLink.mockResolvedValue({
    invite_url: 'http://localhost/join/abc123',
    invite_code: 'abc123',
  });
  mocks.groupServiceMock.joinGroupByInvite.mockResolvedValue({
    group: mockGroup,
    members: [],
    balances: [],
  });
  mocks.expenseServiceMock.listExpenses.mockResolvedValue({
    expenses: [],
    total: 0,
    limit: 20,
    offset: 0,
  });
  mocks.expenseServiceMock.createExpense.mockResolvedValue({
    id: 'exp-1',
    group_id: mockGroup.id,
    description: 'Lunch',
    amount: 10,
    amount_usdc: 10,
    paid_by: mockUser.id,
    split_type: 'equal',
    date: '2026-01-01',
    note: null,
    created_by: mockUser.id,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    deleted_at: null,
  });
  mocks.expenseServiceMock.updateExpense.mockResolvedValue({
    id: 'exp-1',
    description: 'Updated',
  });
  mocks.expenseServiceMock.deleteExpense.mockResolvedValue(undefined);
  mocks.balanceServiceMock.getGroupBalances.mockResolvedValue({
    members: [
      {
        user_id: mockUser.id,
        display_name: mockUser.display_name,
        wallet_address: mockUser.wallet_address,
        net_balance_usdc: -10,
      },
    ],
    simplified_debts: [],
  });
  mocks.settlementServiceMock.prepareSettlement.mockResolvedValue({
    debts: [],
    platform_fee_usdc: 0.25,
    total_usdc: 0.25,
    serialized_transaction: 'base64tx',
  });
  mocks.settlementServiceMock.confirmSettlement.mockResolvedValue({
    settlement: { id: 'set-1', tx_signature: 'sig123' },
    updated_balances: { members: [], simplified_debts: [] },
  });
  mocks.settlementServiceMock.listSettlements.mockResolvedValue([]);
  mocks.activityServiceMock.getActivityFeed.mockResolvedValue({
    events: [],
    total: 0,
    limit: 20,
    offset: 0,
  });
  mocks.feedbackServiceMock.submitFeedback.mockResolvedValue({
    id: 'fb1',
    created_at: '2026-05-20T12:00:00.000Z',
  });
}

describe('Health & API root', () => {
  it('GET /health returns ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('GET /v1 returns API info', async () => {
    const res = await request(app).get('/v1');
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('SplitSOL API');
  });
});

describe('Auth routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDefaultMocks();
  });

  it('POST /v1/auth/wallet/challenge', async () => {
    const res = await request(app)
      .post('/v1/auth/wallet/challenge')
      .send({ wallet_address: mockUser.wallet_address });
    expect(res.status).toBe(200);
    expect(res.body.message).toContain('SplitSOL Authentication');
  });

  it('POST /v1/auth/wallet/challenge rejects missing wallet', async () => {
    const res = await request(app).post('/v1/auth/wallet/challenge').send({});
    expect(res.status).toBe(400);
  });

  it('POST /v1/auth/wallet', async () => {
    const res = await request(app).post('/v1/auth/wallet').send({
      wallet_address: mockUser.wallet_address,
      signed_message: 'msg',
      signature: 'sig',
    });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  it('POST /v1/auth/email', async () => {
    const res = await request(app).post('/v1/auth/email').send({ privy_token: 'privy-jwt' });
    expect(res.status).toBe(200);
  });
});

describe('Users routes', () => {
  beforeEach(() => setupDefaultMocks());

  it('GET /v1/users/me requires auth', async () => {
    const res = await request(app).get('/v1/users/me');
    expect(res.status).toBe(401);
  });

  it('GET /v1/users/me returns profile', async () => {
    const res = await request(app).get('/v1/users/me').set('Authorization', authHeader());
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(mockUser.id);
  });

  it('PATCH /v1/users/me updates profile', async () => {
    const res = await request(app)
      .patch('/v1/users/me')
      .set('Authorization', authHeader())
      .send({ display_name: 'Updated' });
    expect(res.status).toBe(200);
  });

  it('DELETE /v1/users/me requires auth', async () => {
    const res = await request(app).delete('/v1/users/me');
    expect(res.status).toBe(401);
  });

  it('GET /app-icon.png is served for MWA identity', async () => {
    const res = await request(app).get('/app-icon.png');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/image\/png/);
  });

  it('GET /v1/users/search requires query', async () => {
    const res = await request(app).get('/v1/users/search').set('Authorization', authHeader());
    expect(res.status).toBe(400);
  });

  it('GET /v1/users/search returns users', async () => {
    const res = await request(app)
      .get('/v1/users/search?q=test')
      .set('Authorization', authHeader());
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe('Groups routes', () => {
  const gid = mockGroup.id;

  beforeEach(() => setupDefaultMocks());

  it('GET /v1/groups lists groups', async () => {
    const res = await request(app).get('/v1/groups').set('Authorization', authHeader());
    expect(res.status).toBe(200);
  });

  it('POST /v1/groups creates group', async () => {
    const res = await request(app)
      .post('/v1/groups')
      .set('Authorization', authHeader())
      .send({ name: 'Trip' });
    expect(res.status).toBe(201);
  });

  it('POST /v1/groups rejects empty name', async () => {
    const res = await request(app)
      .post('/v1/groups')
      .set('Authorization', authHeader())
      .send({ name: '  ' });
    expect(res.status).toBe(400);
  });

  it('GET /v1/groups/:id returns detail', async () => {
    const res = await request(app).get(`/v1/groups/${gid}`).set('Authorization', authHeader());
    expect(res.status).toBe(200);
    expect(res.body.group).toBeDefined();
  });

  it('PATCH /v1/groups/:id updates group', async () => {
    const res = await request(app)
      .patch(`/v1/groups/${gid}`)
      .set('Authorization', authHeader())
      .send({ name: 'Renamed' });
    expect(res.status).toBe(200);
  });

  it('POST /v1/groups/:id/members adds member by user_id', async () => {
    const res = await request(app)
      .post(`/v1/groups/${gid}/members`)
      .set('Authorization', authHeader())
      .send({ user_id: 'other-user-id' });
    expect(res.status).toBe(201);
  });

  it('POST /v1/groups/:id/members requires user_id', async () => {
    const res = await request(app)
      .post(`/v1/groups/${gid}/members`)
      .set('Authorization', authHeader())
      .send({});
    expect(res.status).toBe(400);
  });

  it('POST /v1/groups/:id/members rejects wallet_address', async () => {
    const res = await request(app)
      .post(`/v1/groups/${gid}/members`)
      .set('Authorization', authHeader())
      .send({ wallet_address: 'OtherWallet1111111111111111111111111111' });
    expect(res.status).toBe(400);
  });

  it('DELETE /v1/groups/:id/members/:userId removes member', async () => {
    const res = await request(app)
      .delete(`/v1/groups/${gid}/members/other-user`)
      .set('Authorization', authHeader());
    expect(res.status).toBe(204);
  });

  it('GET /v1/groups/:id/invite-link', async () => {
    const res = await request(app)
      .get(`/v1/groups/${gid}/invite-link`)
      .set('Authorization', authHeader());
    expect(res.status).toBe(200);
    expect(res.body.invite_url).toBeDefined();
  });

  it('POST /v1/groups/join', async () => {
    const res = await request(app)
      .post('/v1/groups/join')
      .set('Authorization', authHeader())
      .send({ invite_code: 'abc123' });
    expect(res.status).toBe(200);
  });
});

describe('Expenses routes', () => {
  const gid = mockGroup.id;

  beforeEach(() => setupDefaultMocks());

  it('GET /v1/groups/:id/expenses', async () => {
    const res = await request(app)
      .get(`/v1/groups/${gid}/expenses`)
      .set('Authorization', authHeader());
    expect(res.status).toBe(200);
  });

  it('POST /v1/groups/:id/expenses creates expense', async () => {
    const res = await request(app)
      .post(`/v1/groups/${gid}/expenses`)
      .set('Authorization', authHeader())
      .send({
        description: 'Dinner',
        amount: 40,
        paid_by_user_id: mockUser.id,
        split_type: 'equal',
      });
    expect(res.status).toBe(201);
  });

  it('PATCH /v1/groups/:id/expenses/:expenseId', async () => {
    const res = await request(app)
      .patch(`/v1/groups/${gid}/expenses/exp-1`)
      .set('Authorization', authHeader())
      .send({ description: 'Updated' });
    expect(res.status).toBe(200);
  });

  it('DELETE /v1/groups/:id/expenses/:expenseId', async () => {
    const res = await request(app)
      .delete(`/v1/groups/${gid}/expenses/exp-1`)
      .set('Authorization', authHeader());
    expect(res.status).toBe(204);
  });
});

describe('Balances routes', () => {
  beforeEach(() => setupDefaultMocks());

  it('GET /v1/groups/:id/balances', async () => {
    const res = await request(app)
      .get(`/v1/groups/${mockGroup.id}/balances`)
      .set('Authorization', authHeader());
    expect(res.status).toBe(200);
    expect(res.body.members).toBeDefined();
  });
});

describe('Settlements routes', () => {
  const gid = mockGroup.id;

  beforeEach(() => setupDefaultMocks());

  it('GET /v1/groups/:id/settlements', async () => {
    const res = await request(app)
      .get(`/v1/groups/${gid}/settlements`)
      .set('Authorization', authHeader());
    expect(res.status).toBe(200);
  });

  it('POST /v1/groups/:id/settlements/prepare', async () => {
    const res = await request(app)
      .post(`/v1/groups/${gid}/settlements/prepare`)
      .set('Authorization', authHeader())
      .send({ payer_wallet_address: mockUser.wallet_address });
    expect(res.status).toBe(200);
    expect(res.body.serialized_transaction).toBeDefined();
  });

  it('POST /v1/groups/:id/settlements/confirm', async () => {
    const res = await request(app)
      .post(`/v1/groups/${gid}/settlements/confirm`)
      .set('Authorization', authHeader())
      .send({ tx_signature: '5'.repeat(88) });
    expect(res.status).toBe(200);
  });
});

describe('Activity routes', () => {
  beforeEach(() => setupDefaultMocks());

  it('GET /v1/activity', async () => {
    const res = await request(app).get('/v1/activity').set('Authorization', authHeader());
    expect(res.status).toBe(200);
    expect(res.body.events).toBeDefined();
  });
});

describe('Feedback routes', () => {
  beforeEach(() => setupDefaultMocks());

  it('POST /v1/feedback submits feedback', async () => {
    const res = await request(app)
      .post('/v1/feedback')
      .set('Authorization', authHeader())
      .send({
        category: 'bug',
        message: 'The settle screen freezes on Android',
        platform: 'android',
        app_version: '1.0.0',
      });
    expect(res.status).toBe(201);
    expect(res.body.id).toBe('fb1');
    expect(mocks.feedbackServiceMock.submitFeedback).toHaveBeenCalledWith(
      mockUser.id,
      expect.objectContaining({
        category: 'bug',
        message: 'The settle screen freezes on Android',
      }),
    );
  });

  it('POST /v1/feedback requires auth', async () => {
    const res = await request(app).post('/v1/feedback').send({
      category: 'suggestion',
      message: 'Add dark mode toggle in settings please',
    });
    expect(res.status).toBe(401);
  });
});
