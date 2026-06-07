import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { setAuthToken } from '@/lib/api';
import { clearMwaAuthToken } from '@/lib/mobile-wallet';
import type { ApiUser } from '@/types/api';

interface AuthState {
  token: string | null;
  user: ApiUser | null;
  setSession: (token: string, user: ApiUser) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setSession: (token, user) => {
        setAuthToken(token);
        set({ token, user });
      },
      clearSession: () => {
        setAuthToken(null);
        set({ token: null, user: null });
        void clearMwaAuthToken();
      },
    }),
    {
      name: 'splitsol-auth',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        if (state?.token) {
          setAuthToken(state.token);
        }
      },
    },
  ),
);
