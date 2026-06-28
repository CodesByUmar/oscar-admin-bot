// src/pages/Categories.tsx
import { Header } from "@/features/header/Header";
import { useCategoryStore } from "@/store/categoryStore";
import { useProductStore } from "@/store/productStore";
import { ProductCard } from "@/features/products/ProductCard";
import { cn } from "@/lib/utils";
import { useI18nStore } from "@/store/i18nStore";

export function Categories() {
  const { selectedCategory, setSelectedCategory } = useCategoryStore();
  const { products, isLoading, error } = useProductStore();
  const t = useI18nStore((s) => s.t);
  const lang = useI18nStore((s) => s.lang);

  const dynamicCategories = Array.from(new Set(products.map((p) => p.categoryKey))).filter(Boolean);

  // Build display name and image maps from products (p.category is already in current language)
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

  const handleSelect = (catKey: string | null) => {
    setSelectedCategory(catKey);
  };

  const filteredProducts = selectedCategory
    ? products.filter((p) => p.categoryKey === selectedCategory)
    : products;

  const selectedCategoryDisplay = selectedCategory
    ? categoryDisplayMap[selectedCategory] || selectedCategory
    : null;

  return (
    <div className="min-h-screen bg-slate-50 pb-[104px]">
      <Header />
      <main className="container pt-6 max-w-2xl mx-auto px-4">

        {/* Categories Control Panel */}
        <h2 className="text-xl font-bold text-slate-800 mb-4 px-2">{t('nav.catalog')}</h2>

        <div className="bg-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 p-5 sm:p-6 mb-8">
          <div className="grid grid-cols-3 gap-y-5 gap-x-3">
            <div
              onClick={() => handleSelect(null)}
              className={cn(
                "flex flex-col items-center justify-start gap-2 cursor-pointer group transition-all rounded-2xl p-2",
                selectedCategory === null ? "bg-primary/10 shadow-inner" : "hover:bg-slate-50"
              )}
            >
              <div className={cn(
                "w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center p-2.5 transition-all group-active:scale-95 text-2xl",
                selectedCategory === null ? "bg-white shadow-sm border border-primary/20" : "bg-slate-50 shadow-sm border border-slate-100"
              )}>
                 🌍
              </div>
              <span className={cn("text-[11px] sm:text-xs font-bold text-center leading-tight", selectedCategory === null ? "text-primary" : "text-slate-600")}>{t('home.all')}</span>
            </div>

            {dynamicCategories.map((catKey) => (
              <div
                key={catKey}
                onClick={() => handleSelect(catKey)}
                className={cn(
                  "flex flex-col items-center justify-start gap-2 cursor-pointer group transition-all rounded-2xl p-2",
                  selectedCategory === catKey ? "bg-primary/10 shadow-inner" : "hover:bg-slate-50"
                )}
              >
                <div className={cn(
                  "w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center p-1.5 transition-all group-active:scale-95 text-2xl overflow-hidden",
                  selectedCategory === catKey ? "bg-white shadow-sm border border-primary/20" : "bg-slate-50 shadow-sm shadow-slate-200/50 border border-slate-100"
                )}>
                  {categoryImageMap[catKey] ? (
                    <img src={categoryImageMap[catKey]} alt={catKey} className="w-full h-full object-cover rounded-xl" />
                  ) : (
                    "📁"
                  )}
                </div>
                <span className={cn("text-[11px] sm:text-xs font-bold text-center leading-tight line-clamp-2", selectedCategory === catKey ? "text-primary" : "text-slate-600")}>
                  {categoryDisplayMap[catKey] || catKey}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Filtered Products Output */}
        <div className="flex items-center justify-between mb-4 px-2">
           <h3 className="text-xl font-bold text-slate-800 line-clamp-1 flex-1 pr-2">
              {selectedCategoryDisplay ?? t('home.all_products')}
           </h3>
           <span className="text-sm font-semibold text-slate-500">{filteredProducts.length} {lang === 'uz' ? 'ta' : (lang === 'ru' ? 'шт' : 'items')}</span>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pb-8 animate-pulse">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="bg-white rounded-3xl p-3 pb-14 shadow-sm border border-slate-50 h-48 w-full">
                <div className="bg-slate-100 rounded-2xl w-full h-24 mb-4"></div>
                <div className="h-3 bg-slate-100 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-slate-100 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="bg-red-50 text-red-500 rounded-3xl p-8 text-center border border-red-100 shadow-sm">
            {t('home.system_error')}: {error}
          </div>
        ) : filteredProducts.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pb-8">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-8 text-center border border-slate-100 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 mb-2">{t('product.not_found')}</h3>
            <p className="text-slate-500 text-sm">{t('home.no_products')}</p>
          </div>
        )}

      </main>
    </div>
  );
}
