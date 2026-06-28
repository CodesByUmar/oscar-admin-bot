import { ProductCard } from "@/features/products/ProductCard";
import { useProductStore } from "@/store/productStore";
import { useI18nStore } from "@/store/i18nStore";

export function FeaturedCarousel() {
  // Select first 5 products for the featured carousel
  const products = useProductStore((state) => state.products);
  const featuredProducts = products.slice(0, 5);

  const t = useI18nStore((s) => s.t);
  const lang = useI18nStore((s) => s.lang);

  return (
    <div className="w-full mt-2 mb-2 overflow-hidden">
      <div className="px-4 mb-3">
        <h2 className="text-xl font-bold text-slate-800 tracking-tight">
          {t('home.recommended')}
        </h2>
      </div>
      
      <div className="flex w-full ms-4 overflow-x-auto no-scrollbar snap-x snap-mandatory px-4 pb-4 gap-4">
        {featuredProducts.map((product) => (
          <div key={`featured-${product.id}`} className="flex-shrink-0 snap-start w-64 md:w-72">
            <ProductCard product={product} />
          </div>
        ))}
      </div>
    </div>
  );
}
