import { create } from 'zustand';
import { getAccessToken } from '@/src/api/tokenStorage';

interface AuthState {
  hasToken: boolean;
  isHydrated: boolean;
  setHasToken: (value: boolean) => void;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  hasToken: false,
  isHydrated: false,
  setHasToken: (value) => set({ hasToken: value }),
  hydrate: async () => {
    const token = await getAccessToken();
    set({ hasToken: !!token, isHydrated: true });
  },
}));
