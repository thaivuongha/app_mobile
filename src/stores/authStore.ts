import { create } from 'zustand';
import { getAccessToken, getSessionRole, type SessionRole } from '@/src/api/tokenStorage';

interface AuthState {
  hasToken: boolean;
  /** 'owner' → vào (tabs); 'staff' → vào (staff) (xem phiên chia sẻ, không có tabs). */
  role: SessionRole | null;
  isHydrated: boolean;
  /** @deprecated dùng setSession — giữ lại vì nhiều màn cũ (owner) còn gọi setHasToken(true/false) */
  setHasToken: (value: boolean) => void;
  setSession: (role: SessionRole | null) => void;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  hasToken: false,
  role: null,
  isHydrated: false,
  setHasToken: (value) => set({ hasToken: value, role: value ? 'owner' : null }),
  setSession: (role) => set({ hasToken: !!role, role }),
  hydrate: async () => {
    const [token, role] = await Promise.all([getAccessToken(), getSessionRole()]);
    set({ hasToken: !!token, role: token ? role : null, isHydrated: true });
  },
}));
