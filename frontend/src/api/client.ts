import { apiRequest } from '@/lib/api';
import type {
  ApiActivityEvent,
  ApiContact,
  ApiFriendRequest,
  ApiExpense,
  ApiGroup,
  ApiGroupMember,
  ApiUser,
  BalancesResponse,
  GroupDetailResponse,
  PrepareSettlementResponse,
  PrepareTransferResponse,
  PublicUserProfile,
} from '@/types/api';

export const api = {
  getMe: () => apiRequest<ApiUser>('/users/me'),

  updateMe: (body: {
    display_name?: string;
    username?: string | null;
    avatar_url?: string | null;
    push_token?: string;
  }) => apiRequest<ApiUser>('/users/me', { method: 'PATCH', body: JSON.stringify(body) }),

  uploadMyAvatar: (body: { image_base64: string; mime_type: string }) =>
    apiRequest<ApiUser>('/users/me/avatar', { method: 'POST', body: JSON.stringify(body) }),

  checkUsernameAvailable: (username: string) =>
    apiRequest<{ available: boolean; username: string | null; reason?: string }>(
      `/users/username-available?username=${encodeURIComponent(username)}`,
    ),

  getUserByUsername: (username: string) =>
    apiRequest<PublicUserProfile>(`/users/by-username/${encodeURIComponent(username)}`),

  searchUsers: (q: string) =>
    apiRequest<PublicUserProfile[]>(`/users/search?q=${encodeURIComponent(q)}`),

  getContacts: () => apiRequest<{ contacts: ApiContact[] }>('/contacts'),

  getIncomingFriendRequests: () =>
    apiRequest<{ requests: ApiFriendRequest[] }>('/contacts/requests/received'),

  getOutgoingFriendRequests: () =>
    apiRequest<{ requests: ApiFriendRequest[] }>('/contacts/requests/sent'),

  sendFriendRequest: (body: { user_id?: string; username?: string }) =>
    apiRequest<
      | { request: ApiFriendRequest; auto_accepted?: false }
      | { contact: ApiContact; auto_accepted: true }
    >('/contacts/requests', { method: 'POST', body: JSON.stringify(body) }),

  acceptFriendRequest: (requestId: string) =>
    apiRequest<{ contact: ApiContact }>(`/contacts/requests/${requestId}/accept`, {
      method: 'POST',
    }),

  declineFriendRequest: (requestId: string) =>
    apiRequest<void>(`/contacts/requests/${requestId}/decline`, { method: 'POST' }),

  cancelFriendRequest: (requestId: string) =>
    apiRequest<void>(`/contacts/requests/${requestId}`, { method: 'DELETE' }),

  removeContact: (contactUserId: string) =>
    apiRequest<void>(`/contacts/${contactUserId}`, { method: 'DELETE' }),

  prepareTransfer: (body: {
    to_user_id?: string;
    to_username?: string;
    amount_usdc: number;
    note?: string;
  }) =>
    apiRequest<PrepareTransferResponse>('/transfers/prepare', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  confirmTransfer: (body: {
    to_user_id: string;
    amount_usdc: number;
    tx_signature: string;
    note?: string;
  }) =>
    apiRequest<{ transfer: unknown; to_user: PublicUserProfile }>('/transfers/confirm', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  getGroups: () => apiRequest<ApiGroup[]>('/groups'),

  createGroup: (body: { name: string; description?: string }) =>
    apiRequest<ApiGroup>('/groups', { method: 'POST', body: JSON.stringify(body) }),

  getGroup: (id: string) => apiRequest<GroupDetailResponse>(`/groups/${id}`),

  addGroupMember: (groupId: string, userId: string) =>
    apiRequest<ApiGroupMember>(`/groups/${groupId}/members`, {
      method: 'POST',
      body: JSON.stringify({ user_id: userId }),
    }),

  getGroupInviteLink: (groupId: string) =>
    apiRequest<{ invite_url: string; invite_code: string }>(`/groups/${groupId}/invite-link`),

  updateGroup: (
    id: string,
    body: { name?: string; description?: string | null; is_archived?: boolean },
  ) =>
    apiRequest<ApiGroup>(`/groups/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),

  archiveGroup: (id: string) =>
    apiRequest<ApiGroup>(`/groups/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ is_archived: true }),
    }),

  uploadGroupIcon: (id: string, body: { image_base64: string; mime_type: string }) =>
    apiRequest<ApiGroup>(`/groups/${id}/icon`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  getGroupExpenses: (id: string) =>
    apiRequest<{ expenses: ApiExpense[]; total: number }>(`/groups/${id}/expenses`),

  createExpense: (
    groupId: string,
    body: {
      description: string;
      amount: number;
      paid_by_user_id: string;
      split_type: 'equal' | 'exact' | 'percentage' | 'single';
      date?: string;
      note?: string;
      splits?: Array<{ user_id: string; amount?: number; percentage?: number }>;
    },
  ) =>
    apiRequest<ApiExpense>(`/groups/${groupId}/expenses`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  getGroupBalances: (id: string) => apiRequest<BalancesResponse>(`/groups/${id}/balances`),

  prepareSettlement: (groupId: string, payer_wallet_address: string) =>
    apiRequest<PrepareSettlementResponse>(`/groups/${groupId}/settlements/prepare`, {
      method: 'POST',
      body: JSON.stringify({ payer_wallet_address }),
    }),

  confirmSettlement: (groupId: string, tx_signature: string) =>
    apiRequest<{ settlement: unknown; updated_balances: BalancesResponse }>(
      `/groups/${groupId}/settlements/confirm`,
      {
        method: 'POST',
        body: JSON.stringify({ tx_signature }),
      },
    ),

  getActivity: (params?: { limit?: number; offset?: number }) => {
    const search = new URLSearchParams();
    if (params?.limit != null) search.set('limit', String(params.limit));
    if (params?.offset != null) search.set('offset', String(params.offset));
    const qs = search.toString();
    return apiRequest<{ events: ApiActivityEvent[]; total: number; limit: number; offset: number }>(
      `/activity${qs ? `?${qs}` : ''}`,
    );
  },

  submitFeedback: (body: {
    category: 'bug' | 'suggestion' | 'other';
    message: string;
    platform?: string;
    app_version?: string;
  }) =>
    apiRequest<{ id: string; created_at: string }>('/feedback', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
};
