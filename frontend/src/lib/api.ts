import { API_URL } from './config';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

export function getAuthToken() {
  return authToken ?? readTokenFromAuthStore();
}

/** Zustand may hydrate before the module-level token is set — read store at request time. */
function readTokenFromAuthStore(): string | null {
  try {
    // Lazy require avoids a circular import with store/auth at module load.
    const { useAuthStore } = require('@/store/auth') as typeof import('@/store/auth');
    const fromStore = useAuthStore.getState().token;
    if (fromStore) {
      authToken = fromStore;
    }
    return fromStore;
  } catch {
    return null;
  }
}

function clearSessionOnUnauthorized(): void {
  try {
    const { useAuthStore } = require('@/store/auth') as typeof import('@/store/auth');
    useAuthStore.getState().clearSession();
  } catch {
    setAuthToken(null);
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  const token = getAuthToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401) {
      clearSessionOnUnauthorized();
    }
    throw new ApiError(
      response.status,
      (body as { error?: string }).error ?? response.statusText,
      (body as { code?: string }).code,
    );
  }

  return body as T;
}
