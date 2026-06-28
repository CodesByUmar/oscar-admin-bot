import { Grid2X2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCategoryStore } from "@/store/categoryStore";
import { useProductStore } from "@/store/productStore";
import { useI18nStore } from "@/store/i18nStore";

interface CategoryCarouselProps {
  onOpenModal: () => void;
}

export function CategoryCarousel({ onOpenModal }: CategoryCarouselProps) {
  const { selectedCategory, setSelectedCategory } = useCategoryStore();
  const products = useProductStore((state) => state.products);
  const t = useI18nStore((s) => s.t);

  const dynamicCategories = Array.from(new Set(products.map((p) => p.categoryKey))).filter(Boolean);

  // Build display name map: categoryKey → current-language translated name
  const categoryDisplayMap: Record<string, string> = {};
  products.forEach((p) => {
    if (p.categoryKey && !categoryDisplayMap[p.categoryKey]) {
      categoryDisplayMap[p.categoryKey] = p.category;
    }
  });

  return (
    <div className="overflow-hidden mb-6 ps-3">
      <div className="flex w-full overflow-x-auto no-scrollbar snap-x snap-mandatory px-4 pb-4 gap-3 pt-1">
        <button
          onClick={() => setSelectedCategory(null)}
          className={cn(
             "flex-shrink-0 snap-start flex items-center gap-2 h-12 px-5 rounded-2xl whitespace-nowrap transition-all touch-manipulation hover:scale-105 active:scale-95 shadow-sm border",
             selectedCategory === null
               ? "bg-primary text-primary-foreground border-primary shadow-primary/20 shadow-md"
               : "bg-white text-slate-700 border-slate-100 hover:bg-slate-50"
           )}
         >
           <span className="font-semibold text-sm tracking-wide">{t('home.all')}</span>
         </button>

         {dynamicCategories.map((catKey) => (
           <button
             key={catKey}
             onClick={() => setSelectedCategory(catKey)}
             className={cn(
               "flex-shrink-0 snap-start flex items-center gap-2 h-12 px-5 rounded-2xl whitespace-nowrap transition-all touch-manipulation hover:scale-105 active:scale-95 shadow-sm border",
               selectedCategory === catKey
                 ? "bg-primary text-primary-foreground border-primary shadow-primary/20 shadow-md"
                 : "bg-white text-slate-700 border-slate-100 hover:bg-slate-50"
             )}
           >
             <span className="font-semibold text-sm tracking-wide">{categoryDisplayMap[catKey] || catKey}</span>
           </button>
         ))}

        <button
          onClick={onOpenModal}
          className="flex-shrink-0 snap-start flex items-center justify-center gap-2 h-12 px-5 rounded-2xl bg-white text-slate-700 border border-slate-100 shadow-sm transition-all touch-manipulation hover:scale-105 active:scale-95 hover:bg-slate-50"
        >
          <Grid2X2 className="w-5 h-5 text-primary" />
        </button>
      </div>
    </div>
  );
}
