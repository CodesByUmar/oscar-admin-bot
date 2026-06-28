// import { useState } from "react";
// import { Header } from "@/features/header/Header";
// import { DiscountCarousel } from "@/features/products/DiscountCarousel";
// import { FeaturedCarousel } from "@/features/products/FeaturedCarousel";
// import { CategoryModal } from "@/features/categories/CategoryModal";
// import { CategoryCarousel } from "@/features/categories/CategoryCarousel";
// import { ProductCard } from "@/features/products/ProductCard";
// import { useCategoryStore } from "@/store/categoryStore";
// import { useProductStore } from "@/store/productStore";

// export function Home() {
//   const [modalOpen, setModalOpen] = useState(false);
//   const selectedCategory = useCategoryStore((state) => state.selectedCategory);
//   const { products, isLoading, error } = useProductStore();

//   const filteredProducts = selectedCategory
//     ? products.filter((p) => p.category === selectedCategory)
//     : products;

//   return (
//     <div className="min-h-screen pb-[104px] bg-slate-50 w-full">
//       <Header />

//       <main className="container pt-3 md:pt-5 max-w-2xl mx-auto pb-6">

//         {/* Promotional Banner */}
//         {!selectedCategory && (
//           <section className="mb-4">
//             <DiscountCarousel />
//           </section>
//         )}

//         {/* Top Categorization */}
//         <section className="mb-2 relative z-10">
//           <CategoryCarousel onOpenModal={() => setModalOpen(true)} />
//         </section>

//         {/* Featured Items */}
//         {!selectedCategory && (
//           <section className="mb-8">
//             <FeaturedCarousel />
//           </section>
//         )}

//         {/* Dynamic Product Grid */}
//         <section className="px-4">
//           <div className="flex items-center justify-between mb-5">
//             <h2 className="text-[22px] font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
//               {selectedCategory ? (
//                 <>
//                   <span className="bg-primary w-2 h-6 rounded-full inline-block"></span>
//                   <span className="line-clamp-1 pr-2">{selectedCategory}</span>
//                 </>
//               ) : (
//                 <>
//                   <span className="bg-slate-300 w-2 h-6 rounded-full inline-block"></span>
//                   <span className="line-clamp-1 pr-2">Barcha mahsulotlar</span>
//                 </>
//               )}
//             </h2>
//             {!isLoading && !error && filteredProducts && (
//               <span className="text-xs font-bold text-slate-500 bg-slate-200/50 px-3 py-1 rounded-full flex-shrink-0 border border-slate-200">
//                 {filteredProducts.length} ta
//               </span>
//             )}
//           </div>

//           {isLoading ? (
//             <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 pb-8 animate-pulse">
//               {[1, 2, 3, 4, 5, 6].map(i => (
//                 <div key={i} className="bg-white rounded-3xl p-3 pb-14 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-50 h-[240px] w-full flex flex-col justify-end">
//                   <div className="bg-slate-100 rounded-2xl w-full h-full mb-3 shadow-inner"></div>
//                   <div className="h-3 bg-slate-100 rounded-full w-3/4 mb-2"></div>
//                   <div className="h-4 bg-slate-100 rounded-full w-1/2"></div>
//                 </div>
//               ))}
//             </div>
//           ) : error ? (
//             <div className="bg-red-50 text-red-500 rounded-3xl p-8 text-center border border-red-100 shadow-sm font-medium">
//               Tizim xatosi: {error}
//             </div>
//           ) : filteredProducts && filteredProducts.length > 0 ? (
//             <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 pb-8">
//               {filteredProducts.map((product) => (
//                 <ProductCard key={`product-${product.id}`} product={product} />
//               ))}
//             </div>
//           ) : (
//             <div className="bg-white rounded-[2rem] p-10 text-center border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col items-center">
//               <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4 shadow-inner border border-slate-100">
//                 <span className="text-3xl opacity-40">🔍</span>
//               </div>
//               <h3 className="text-xl font-extrabold text-slate-800 mb-2">Topilmadi</h3>
//               <p className="text-slate-500 text-sm font-medium leading-relaxed max-w-[200px] mx-auto">
//                 Tanlangan kategoriyada mahsulotlar hozircha yo'q.
//               </p>
//             </div>
//           )}
//         </section>
//       </main>

//       <CategoryModal
//         open={modalOpen}
//         onOpenChange={setModalOpen}
//       />
//     </div>
//   );
// }


import { useState } from "react";
import { Header } from "@/features/header/Header";
import { DiscountCarousel } from "@/features/products/DiscountCarousel";
import { FeaturedCarousel } from "@/features/products/FeaturedCarousel";
import { CategoryModal } from "@/features/categories/CategoryModal";
import { CategoryCarousel } from "@/features/categories/CategoryCarousel";
import { ProductCard } from "@/features/products/ProductCard";
import { useCategoryStore } from "@/store/categoryStore";
import { useProductStore } from "@/store/productStore";
import { useI18nStore } from "@/store/i18nStore";

export function Home() {
  const [modalOpen, setModalOpen] = useState(false);
  const selectedCategory = useCategoryStore((state) => state.selectedCategory);
  const { products, isLoading, error } = useProductStore();
  const t = useI18nStore((s) => s.t);
  const lang = useI18nStore((s) => s.lang);

  // Get translated display name for the selected category from the products
  const selectedCategoryDisplay = selectedCategory
    ? products.find((p) => p.categoryKey === selectedCategory)?.category || selectedCategory
    : null;

  const filteredProducts = selectedCategory
    ? products.filter((p) => p.categoryKey === selectedCategory)
    : products;

  return (
    <div className="min-h-screen pb-[104px] bg-slate-50 w-full">
      <Header />

      <main className="container pt-3 md:pt-5 max-w-2xl mx-auto pb-6">

        {!selectedCategory && (
          <section className="mb-4">
            <DiscountCarousel />
          </section>
        )}

        <section className="mb-2 relative z-10">
          <CategoryCarousel onOpenModal={() => setModalOpen(true)} />
        </section>

        {!selectedCategory && (
          <section className="mb-8">
            <FeaturedCarousel />
          </section>
        )}

        <section className="px-4">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-[22px] font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              {selectedCategory ? (
                <>
                  <span className="bg-primary w-2 h-6 rounded-full inline-block"></span>
                  <span className="line-clamp-1 pr-2">{selectedCategoryDisplay}</span>
                </>
              ) : (
                <>
                  <span className="bg-slate-300 w-2 h-6 rounded-full inline-block"></span>
                  <span className="line-clamp-1 pr-2">{t('home.all_products')}</span>
                </>
              )}
            </h2>
            {!isLoading && !error && filteredProducts && (
              <span className="text-xs font-bold text-slate-500 bg-slate-200/50 px-3 py-1 rounded-full flex-shrink-0 border border-slate-200">
                {filteredProducts.length} {lang === 'uz' ? 'ta' : (lang === 'ru' ? 'шт' : 'items')}
              </span>
            )}
          </div>

          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 pb-8 animate-pulse">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="bg-white rounded-3xl p-3 pb-14 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-50 h-[240px] w-full flex flex-col justify-end">
                  <div className="bg-slate-100 rounded-2xl w-full h-full mb-3 shadow-inner"></div>
                  <div className="h-3 bg-slate-100 rounded-full w-3/4 mb-2"></div>
                  <div className="h-4 bg-slate-100 rounded-full w-1/2"></div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="bg-red-50 text-red-500 rounded-3xl p-8 text-center border border-red-100 shadow-sm font-medium">
              {t('home.system_error')}: {error}
            </div>
          ) : filteredProducts && filteredProducts.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 pb-8">
              {filteredProducts.map((product) => (
                <ProductCard key={`product-${product.id}`} product={product} />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-[2rem] p-10 text-center border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col items-center">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4 shadow-inner border border-slate-100">
                <span className="text-3xl opacity-40">🔍</span>
              </div>
              <h3 className="text-xl font-extrabold text-slate-800 mb-2">{t('home.not_found')}</h3>
              <p className="text-slate-500 text-sm font-medium leading-relaxed max-w-[200px] mx-auto">
                {t('home.selected_category_no_products')}
              </p>
            </div>
          )}
        </section>
      </main>

      <CategoryModal open={modalOpen} onOpenChange={setModalOpen} />
    </div>
  );
}