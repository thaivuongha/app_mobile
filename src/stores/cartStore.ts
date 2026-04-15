import { create } from 'zustand';

export interface CartItem {
  productId: string;
  name: string;
  /** Giá gốc (vốn) — số tiền ký quỹ bị giam khi đặt hàng */
  price: string;
  /** Hoa hồng tính theo cấp đối tác */
  commissionAmount: string;
  /** Giá bán = price + commissionAmount */
  sellingPrice: string;
  imageUrl: string | null;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  addItem: (
    productId: string,
    name: string,
    price: string,
    commissionAmount: string,
    sellingPrice: string,
    imageUrl: string | null,
    quantity: number
  ) => void;
  updateQuantity: (productId: string, delta: number) => void;
  setQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
  /** Tổng tiền gốc (vốn bị giam khi đặt hàng) */
  getTotalCost: () => number;
  /** Tổng hoa hồng ước tính */
  getTotalCommission: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  addItem: (productId, name, price, commissionAmount, sellingPrice, imageUrl, quantity) =>
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
      return {
        items: [
          ...state.items,
          { productId, name, price, commissionAmount, sellingPrice, imageUrl, quantity },
        ],
      };
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
  setQuantity: (productId, quantity) =>
    set((state) => {
      if (quantity <= 0) {
        return { items: state.items.filter((i) => i.productId !== productId) };
      }
      return {
        items: state.items.map((i) =>
          i.productId === productId ? { ...i, quantity } : i
        ),
      };
    }),
  removeItem: (productId) =>
    set((state) => ({ items: state.items.filter((i) => i.productId !== productId) })),
  clearCart: () => set({ items: [] }),
  getTotalCost: () =>
    get().items.reduce((sum, i) => sum + Number(i.price) * i.quantity, 0),
  getTotalCommission: () =>
    get().items.reduce((sum, i) => sum + Number(i.commissionAmount) * i.quantity, 0),
}));
