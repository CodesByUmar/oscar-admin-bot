import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  cartItemId: string; // Composite key: `${productId}-${unit}`
  productId: number | string;
  name: string;
  price: number;
  originalPrice: number;
  discount: number;
  quantity: number;
  image: string;
  unit: 'item' | 'box';
  itemsPerBox?: number;
}

interface CartState {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'cartItemId'>) => void;
  removeItem: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
  clearCart: () => void;
  getTotals: () => { totalUSD: number; totalUZS: number };
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (newItem) => {
        set((state) => {
          // Graceful fallback for old schema where items lacked cartItemId
          const validItems = state.items.map(item => ({
            ...item,
            cartItemId: item.cartItemId || `${item.productId}-${item.unit || 'item'}`,
            unit: item.unit || 'item'
          }));

          const cartItemId = `${newItem.productId}-${newItem.unit}`;
          const existingItem = validItems.find(item => item.cartItemId === cartItemId);
          
          if (existingItem) {
            return {
              items: validItems.map(item =>
                item.cartItemId === cartItemId
                  ? { ...item, quantity: item.quantity + newItem.quantity }
                  : item
              )
            };
          }
          return {
            items: [...validItems, { ...newItem, cartItemId, quantity: newItem.quantity }]
          };
        });
      },
      removeItem: (cartItemId) => {
        set((state) => ({
          items: state.items.filter(item => (item.cartItemId || `${item.productId}-${item.unit || 'item'}`) !== cartItemId)
        }));
      },
      updateQuantity: (cartItemId, quantity) => {
        set((state) => ({
          items: state.items.map(item =>
            (item.cartItemId || `${item.productId}-${item.unit || 'item'}`) === cartItemId
              ? { ...item, quantity: Math.max(1, quantity) }
              : item
          )
        }));
      },
      clearCart: () => set({ items: [] }),
      getTotals: () => {
        return get().items.reduce(
          (acc, item) => {
            if (item.unit === 'item') {
              acc.totalUSD += item.price * item.quantity;
            } else {
              acc.totalUZS += item.price * item.quantity;
            }
            return acc;
          },
          { totalUSD: 0, totalUZS: 0 }
        );
      }
    }),
    {
      name: 'cart-storage',
    }
  )
);
