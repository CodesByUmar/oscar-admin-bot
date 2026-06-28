import { create } from 'zustand';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Category translation mapping
const categoryTranslations: Record<string, Record<string, string>> = {
  'Razbavitel': { uz: 'Suyultirgich', ru: 'Разбавитель', en: 'Thinner' },
  'Lak': { uz: 'Lak', ru: 'Лак', en: 'Varnish' },
  'Har hil turdagi Bitum Laklar': { uz: 'Har hil turdagi Bitum Laklar', ru: 'Различные битумные лаки', en: 'Various Bitum Varnishes' },
  'Olifa': { uz: 'Olifa', ru: 'Олифа', en: 'Drying Oil' },
  'Gruntovka': { uz: 'Gruntovka', ru: 'Грунтовка', en: 'Primer' },
  'Har hil turdagi Serpyankalar': { uz: 'Har hil turdagi Serpyankalar', ru: 'Различные виды серпянки', en: 'Serpyanka Mesh Tapes' },
  'Kafel uchun fuga va boshqalar': { uz: 'Kafel uchun fuga va boshqalar', ru: 'Фуга для плитки и др.', en: 'Tile Grouts & Accessories' },
  'Plastik mahsulotlar': { uz: 'Plastik mahsulotlar', ru: 'Пластиковые изделия', en: 'Plastic Goods' },
  'Steklahost va Kley': { uz: 'Steklahost va Kley', ru: 'Стеклахост и Клей', en: 'Fiberglass Mesh & Glue' },
  'Steklohost va Kley': { uz: 'Steklohost va Kley', ru: 'Стеклохост и Клей', en: 'Fiberglass Mesh & Glue' },
  'Bo`yoqlar': { uz: "Bo'yoqlar", ru: 'Краски', en: 'Paints & Coatings' },
  "Bo'yoqlar": { uz: "Bo'yoqlar", ru: 'Краски', en: 'Paints & Coatings' },
  'Asortiment skotchlar': { uz: 'Asortiment skotchlar', ru: 'Ассортимент скотча', en: 'Tape Collection' },
  'Boshqalar': { uz: 'Boshqalar', ru: 'Другое', en: 'Other' },
};

// Normalize a category key for fuzzy matching (case-insensitive, quote-normalized)
const normalizeKey = (s: string) => s.trim().toLowerCase().replace(/[`']/g, "'");

const translateCategory = (category: string, lang: string): string => {
  const key = category.trim();
  // Direct match
  if (categoryTranslations[key]?.[lang]) return categoryTranslations[key][lang];
  // Normalized match (handles quote/case differences)
  const normKey = normalizeKey(key);
  const foundKey = Object.keys(categoryTranslations).find(k => normalizeKey(k) === normKey);
  if (foundKey) return categoryTranslations[foundKey][lang] || category;
  return category;
};

export interface Product {
  id: number | string;
  name: string;
  nameI18n?: Record<string, string>;
  pricePiece: number; // USD
  priceBox: number;   // UZS
  category: string;
  categoryKey: string; // canonical UZ form, used for filtering & remapping
  categoryI18n?: Record<string, string>;
  image: string;
  description: string;
  descriptionI18n?: Record<string, string>;
  discount?: number;
  discountStartDate?: any;
  discountEndDate?: any;
  stock: number;
  itemsPerBox?: number;
}

interface ProductState {
  products: Product[];
  isLoading: boolean;
  error: string | null;
  fetchProducts: () => Promise<void>;
  remapForLang: (lang: string) => void;
}

export function resolveI18n(value: any, lang: string, fallback = ''): string {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'string') return value || fallback;
  if (typeof value === 'object' && !Array.isArray(value)) {
    return value[lang] || value['uz'] || value['ru'] || value['en'] || fallback;
  }
  return fallback;
}

function isI18nObject(value: any): value is Record<string, string> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export const useProductStore = create<ProductState>((set, get) => ({
  products: [],
  isLoading: false,
  error: null,
  fetchProducts: async () => {
    if (get().products.length > 0) return;

    set({ isLoading: true, error: null });
    try {
      const lang = (localStorage.getItem('oscar_lang') as string) || 'uz';
      const querySnapshot = await getDocs(collection(db, "products"));
      const productsList: Product[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        let rawCategory: string;
        let parsedCategoryI18n: Record<string, string> | undefined;
        if (isI18nObject(data.category)) {
          parsedCategoryI18n = data.category;
          rawCategory = data.category.uz || data.category.ru || data.category.en || 'Boshqalar';
        } else {
          rawCategory = (typeof data.category === 'string' ? data.category : '') || 'Boshqalar';
          parsedCategoryI18n = undefined;
        }
        productsList.push({
          id: doc.id,
          name: resolveI18n(data.name, lang),
          nameI18n: isI18nObject(data.name) ? data.name : undefined,
          pricePiece: Number(data.pricePiece || data.price || data.cost) || 0,
          priceBox: Number(data.priceBox) || 0,
          categoryKey: rawCategory,
          category: parsedCategoryI18n ? resolveI18n(parsedCategoryI18n, lang, rawCategory) : translateCategory(rawCategory, lang),
          categoryI18n: parsedCategoryI18n,
          image: data.image || '',
          description: resolveI18n(data.description, lang),
          descriptionI18n: isI18nObject(data.description) ? data.description : undefined,
          discount: Number(data.discount) || 0,
          discountStartDate: data.discountStartDate || null,
          discountEndDate: data.discountEndDate || null,
          stock: Number(data.stock) || 0,
          itemsPerBox: typeof data.boxCapacity !== 'undefined' ? Number(data.boxCapacity) : (typeof data.itemsPerBox !== 'undefined' ? Number(data.itemsPerBox) : undefined),
        });
      });

      set({ products: productsList, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },
  remapForLang: (lang: string) => {
    set((state) => ({
      products: state.products.map((p) => ({
        ...p,
        name: p.nameI18n ? resolveI18n(p.nameI18n, lang, p.name) : p.name,
        description: p.descriptionI18n ? resolveI18n(p.descriptionI18n, lang, p.description) : p.description,
        category: p.categoryI18n ? resolveI18n(p.categoryI18n, lang, p.category) : translateCategory(p.categoryKey || p.category, lang),
      })),
    }));
  },
}));
