import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import { api } from '@/api/client';
import { ACTIVITY_PAGE_SIZE } from '@/lib/constants';
import { loginWithWallet } from '@/lib/wallet-auth';
import { useAuthStore } from '@/store/auth';
import type { ApiContact, ApiFriendRequest } from '@/types/api';

const friendQueryOptions = { staleTime: 0, gcTime: 5 * 60_000 };

export const queryKeys = {
  me: ['me'] as const,
  groups: ['groups'] as const,
  group: (id: string) => ['group', id] as const,
  expenses: (id: string) => ['expenses', id] as const,
  balances: (id: string) => ['balances', id] as const,
  activity: ['activity'] as const,
  contacts: ['contacts'] as const,
  friendRequestsReceived: ['contacts', 'requests', 'received'] as const,
  friendRequestsSent: ['contacts', 'requests', 'sent'] as const,
  userSearch: (q: string) => ['users', 'search', q] as const,
};

export function useMe() {
  const token = useAuthStore((s) => s.token);
  return useQuery({
    queryKey: queryKeys.me,
    queryFn: () => api.getMe(),
    enabled: !!token,
  });
}

export function useGroups() {
  const token = useAuthStore((s) => s.token);
  return useQuery({
    queryKey: queryKeys.groups,
    queryFn: () => api.getGroups(),
    enabled: !!token,
    staleTime: 0,
  });
}

export function useGroup(id: string) {
  const token = useAuthStore((s) => s.token);
  return useQuery({
    queryKey: queryKeys.group(id),
    queryFn: () => api.getGroup(id),
    enabled: !!token && !!id,
    staleTime: 0,
  });
}

export function useGroupExpenses(groupId: string) {
  const token = useAuthStore((s) => s.token);
  return useQuery({
    queryKey: queryKeys.expenses(groupId),
    queryFn: () => api.getGroupExpenses(groupId),
    enabled: !!token && !!groupId,
    staleTime: 0,
  });
}

export function useGroupBalances(groupId: string) {
  const token = useAuthStore((s) => s.token);
  return useQuery({
    queryKey: queryKeys.balances(groupId),
    queryFn: () => api.getGroupBalances(groupId),
    enabled: !!token && !!groupId,
    staleTime: 0,
  });
}

export function useActivity() {
  const token = useAuthStore((s) => s.token);
  return useInfiniteQuery({
    queryKey: queryKeys.activity,
    queryFn: ({ pageParam }) =>
      api.getActivity({ limit: ACTIVITY_PAGE_SIZE, offset: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, _allPages, lastPageParam) => {
      const nextOffset = lastPageParam + lastPage.events.length;
      if (lastPage.events.length === 0 || nextOffset >= lastPage.total) {
        return undefined;
      }
      return nextOffset;
    },
    enabled: !!token,
  });
}

export function useContacts() {
  const token = useAuthStore((s) => s.token);
  return useQuery({
    queryKey: queryKeys.contacts,
    queryFn: async () => {
      const res = await api.getContacts();
      return res.contacts;
    },
    enabled: !!token,
    ...friendQueryOptions,
  });
}

export function useIncomingFriendRequests() {
  const token = useAuthStore((s) => s.token);
  return useQuery({
    queryKey: queryKeys.friendRequestsReceived,
    queryFn: async () => {
      const res = await api.getIncomingFriendRequests();
      return res.requests;
    },
    enabled: !!token,
    ...friendQueryOptions,
  });
}

export function useOutgoingFriendRequests() {
  const token = useAuthStore((s) => s.token);
  return useQuery({
    queryKey: queryKeys.friendRequestsSent,
    queryFn: async () => {
      const res = await api.getOutgoingFriendRequests();
      return res.requests;
    },
    enabled: !!token,
    ...friendQueryOptions,
  });
}

async function syncFriendQueries(queryClient: QueryClient) {
  await Promise.all([
    queryClient.refetchQueries({ queryKey: queryKeys.contacts, type: 'active' }),
    queryClient.refetchQueries({ queryKey: queryKeys.friendRequestsReceived, type: 'active' }),
    queryClient.refetchQueries({ queryKey: queryKeys.friendRequestsSent, type: 'active' }),
  ]);
}

function prependContact(prev: ApiContact[] | undefined, contact: ApiContact): ApiContact[] {
  const list = prev ?? [];
  if (list.some((c) => c.contact_user_id === contact.contact_user_id)) return list;
  return [contact, ...list];
}

function prependOutgoingRequest(
  prev: ApiFriendRequest[] | undefined,
  request: ApiFriendRequest,
): ApiFriendRequest[] {
  const list = prev ?? [];
  if (list.some((r) => r.id === request.id)) return list;
  return [request, ...list];
}

export function useSendFriendRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { user_id?: string; username?: string }) => api.sendFriendRequest(body),
    onSuccess: async (result) => {
      if ('auto_accepted' in result && result.auto_accepted) {
        queryClient.setQueryData<ApiContact[]>(queryKeys.contacts, (prev) =>
          prependContact(prev, result.contact),
        );
      } else if ('request' in result) {
        queryClient.setQueryData<ApiFriendRequest[]>(queryKeys.friendRequestsSent, (prev) =>
          prependOutgoingRequest(prev, result.request),
        );
      }
      await syncFriendQueries(queryClient);
    },
  });
}

export function useAcceptFriendRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (requestId: string) => api.acceptFriendRequest(requestId),
    onSuccess: async (data, requestId) => {
      queryClient.setQueryData<ApiFriendRequest[]>(queryKeys.friendRequestsReceived, (prev) =>
        (prev ?? []).filter((r) => r.id !== requestId),
      );
      queryClient.setQueryData<ApiContact[]>(queryKeys.contacts, (prev) =>
        prependContact(prev, data.contact),
      );
      await syncFriendQueries(queryClient);
    },
  });
}

export function useDeclineFriendRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (requestId: string) => api.declineFriendRequest(requestId),
    onSuccess: async (_data, requestId) => {
      queryClient.setQueryData<ApiFriendRequest[]>(queryKeys.friendRequestsReceived, (prev) =>
        (prev ?? []).filter((r) => r.id !== requestId),
      );
      await syncFriendQueries(queryClient);
    },
  });
}

export function useCancelFriendRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (requestId: string) => api.cancelFriendRequest(requestId),
    onSuccess: async (_data, requestId) => {
      queryClient.setQueryData<ApiFriendRequest[]>(queryKeys.friendRequestsSent, (prev) =>
        (prev ?? []).filter((r) => r.id !== requestId),
      );
      await syncFriendQueries(queryClient);
    },
  });
}

export function useRemoveContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (contactUserId: string) => api.removeContact(contactUserId),
    onSuccess: async (_data, contactUserId) => {
      queryClient.setQueryData<ApiContact[]>(queryKeys.contacts, (prev) =>
        (prev ?? []).filter((c) => c.contact_user_id !== contactUserId),
      );
      await syncFriendQueries(queryClient);
    },
  });
}

export function useSearchUsers(q: string) {
  const token = useAuthStore((s) => s.token);
  const trimmed = q.trim();
  return useQuery({
    queryKey: queryKeys.userSearch(trimmed),
    queryFn: () => api.searchUsers(trimmed),
    enabled: !!token && trimmed.length >= 2,
  });
}

export function useUsernameAvailable(username: string, enabled = true) {
  const token = useAuthStore((s) => s.token);
  const normalized = username.trim().toLowerCase().replace(/^@+/, '');
  return useQuery({
    queryKey: ['username-available', normalized] as const,
    queryFn: () => api.checkUsernameAvailable(normalized),
    enabled: !!token && enabled && normalized.length >= 3,
    staleTime: 10_000,
  });
}

export function useUpdateMe() {
  const setSession = useAuthStore((s) => s.setSession);
  const token = useAuthStore((s) => s.token);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: {
      display_name?: string;
      username?: string | null;
      avatar_url?: string | null;
    }) => api.updateMe(body),
    onSuccess: (user) => {
      if (token) setSession(token, user);
      queryClient.invalidateQueries({ queryKey: queryKeys.me });
    },
  });
}

export function useDeleteAccount() {
  const clearSession = useAuthStore((s) => s.clearSession);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => api.deleteMyAccount(),
    onSuccess: () => {
      clearSession();
      queryClient.clear();
    },
  });
}

export function useUploadMyAvatar() {
  const setSession = useAuthStore((s) => s.setSession);
  const token = useAuthStore((s) => s.token);

  return useMutation({
    mutationFn: (body: { image_base64: string; mime_type: string }) => api.uploadMyAvatar(body),
    onSuccess: (user) => {
      if (token) setSession(token, user);
    },
  });
}

export function usePrepareTransfer() {
  return useMutation({
    mutationFn: (body: {
      to_user_id?: string;
      to_username?: string;
      amount_usdc: number;
      note?: string;
    }) => api.prepareTransfer(body),
  });
}

export function useConfirmTransfer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      to_user_id: string;
      amount_usdc: number;
      tx_signature: string;
      note?: string;
    }) => api.confirmTransfer(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.activity });
    },
  });
}

export function useWalletLogin() {
  const setSession = useAuthStore((s) => s.setSession);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: loginWithWallet,
    onSuccess: (data) => {
      if (!data.user?.wallet_address?.trim()) {
        throw new Error('Sign-in requires a linked Solana wallet');
      }
      setSession(data.token, data.user);
      queryClient.clear();
    },
  });
}

export function useCreateGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; description?: string }) => api.createGroup(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.groups });
    },
  });
}

export function useUploadGroupIcon(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { image_base64: string; mime_type: string }) =>
      api.uploadGroupIcon(groupId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.group(groupId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.groups });
    },
  });
}

export function useAddGroupMember(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => api.addGroupMember(groupId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.group(groupId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.balances(groupId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.groups });
      queryClient.invalidateQueries({ queryKey: queryKeys.activity });
    },
  });
}

export function useUpdateGroup(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { name?: string; description?: string | null }) =>
      api.updateGroup(groupId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.group(groupId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.groups });
    },
  });
}

export function useArchiveGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (groupId: string) => api.archiveGroup(groupId),
    onSuccess: (_data, groupId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.groups });
      queryClient.invalidateQueries({ queryKey: queryKeys.activity });
      queryClient.removeQueries({ queryKey: queryKeys.group(groupId) });
    },
  });
}

export function useCreateExpense(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      description: string;
      amount: number;
      paid_by_user_id: string;
      split_type: 'equal' | 'exact' | 'percentage' | 'single';
      splits?: Array<{ user_id: string; amount?: number; percentage?: number }>;
    }) => api.createExpense(groupId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.group(groupId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses(groupId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.balances(groupId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.groups });
      queryClient.invalidateQueries({ queryKey: queryKeys.activity });
    },
  });
}

export function usePrepareSettlement(groupId: string) {
  return useMutation({
    mutationFn: (payer_wallet_address: string) =>
      api.prepareSettlement(groupId, payer_wallet_address),
  });
}

export function useConfirmSettlement(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (tx_signature: string) => api.confirmSettlement(groupId, tx_signature),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.group(groupId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.balances(groupId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.groups });
      queryClient.invalidateQueries({ queryKey: queryKeys.activity });
    },
  });
}

export function useSubmitFeedback() {
  return useMutation({
    mutationFn: (body: {
      category: 'bug' | 'suggestion' | 'other';
      message: string;
      platform?: string;
      app_version?: string;
    }) => api.submitFeedback(body),
  });
}
