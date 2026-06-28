import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCategoryStore } from "@/store/categoryStore";
import { useProductStore } from "@/store/productStore";
import { useI18nStore } from "@/store/i18nStore";

interface CategoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CategoryModal({ open, onOpenChange }: CategoryModalProps) {
  const setSelectedCategory = useCategoryStore((state) => state.setSelectedCategory);
  const products = useProductStore((state) => state.products);
  const t = useI18nStore((s) => s.t);

  const dynamicCategories = Array.from(new Set(products.map(p => p.categoryKey))).filter(Boolean);

  // Build display name and image maps from products (p.category is already translated)
  const categoryDisplayMap: Record<string, string> = {};
  const categoryImageMap: Record<string, string> = {};
  products.forEach(product => {
    if (product.categoryKey) {
      if (!categoryDisplayMap[product.categoryKey]) {
        categoryDisplayMap[product.categoryKey] = product.category;
      }
      if (!categoryImageMap[product.categoryKey] && product.image) {
        categoryImageMap[product.categoryKey] = product.image;
      }
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl max-h-[85vh] overflow-y-auto no-scrollbar pt-6 px-4 pb-8 border-none mt-auto sm:mt-0 transition-transform">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-xl font-bold">{t('categoryModal.title')}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-3 gap-4">
          <div
            onClick={() => {
              setSelectedCategory(null);
              onOpenChange(false);
            }}
            className="flex flex-col items-center justify-start gap-2 cursor-pointer p-2 rounded-xl transition-colors hover:bg-slate-100 touch-manipulation active:bg-slate-200"
          >
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center p-2 shadow-sm border border-slate-100 text-3xl">
               🌍
            </div>
            <span className="text-xs font-medium text-center leading-tight">{t('categoryModal.all')}</span>
          </div>

          {dynamicCategories.map((catKey) => (
            <div
              key={catKey}
              onClick={() => {
                setSelectedCategory(catKey);
                onOpenChange(false);
              }}
              className="flex flex-col items-center justify-start gap-2 cursor-pointer p-2 rounded-xl transition-colors hover:bg-slate-100 touch-manipulation active:bg-slate-200"
            >
              <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center p-1.5 shadow-sm shadow-slate-200/50 border border-slate-100 text-3xl overflow-hidden">
                {categoryImageMap[catKey] ? (
                  <img src={categoryImageMap[catKey]} alt={catKey} className="w-full h-full object-cover rounded-xl" />
                ) : (
                  "📁"
                )}
              </div>
              <span className="text-xs font-medium text-center text-slate-700 leading-tight line-clamp-2">
                {categoryDisplayMap[catKey] || catKey}
              </span>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
