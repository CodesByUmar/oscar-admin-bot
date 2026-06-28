import { create } from 'zustand';

interface CategoryState {
  selectedCategory: string | null;
  setSelectedCategory: (category: string | null) => void;
}

export const useCategoryStore = create<CategoryState>((set) => ({
  selectedCategory: null,
  setSelectedCategory: (category) => set({ selectedCategory: category }),
}));
