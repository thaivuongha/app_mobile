import { create } from 'zustand';

export interface CartItem {
  productId: string;
  name: string;
  price: string;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  addItem: (productId: string, name: string, price: string, quantity: number) => void;
  updateQuantity: (productId: string, delta: number) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
  getTotal: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  addItem: (productId, name, price, quantity) =>
    set((state) => {
      const existing = state.items.find((i) => i.productId === productId);
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.productId === productId
              ? { ...i, quantity: i.quantity + quantity }
              : i
          ),
        };
      }
      return { items: [...state.items, { productId, name, price, quantity }] };
    }),
  updateQuantity: (productId, delta) =>
    set((state) => {
      const next = state.items
        .map((i) =>
          i.productId === productId ? { ...i, quantity: i.quantity + delta } : i
        )
        .filter((i) => i.quantity > 0);
      return { items: next };
    }),
  removeItem: (productId) =>
    set((state) => ({ items: state.items.filter((i) => i.productId !== productId) })),
  clearCart: () => set({ items: [] }),
  getTotal: () =>
    get().items.reduce((sum, i) => sum + Number(i.price) * i.quantity, 0),
}));
