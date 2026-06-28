import { Link } from "react-router-dom";
import { useProductStore } from "@/store/productStore";
import { isDiscountActive, getEffectivePrice } from "@/utils/discount";
import { useI18nStore } from "@/store/i18nStore";

export function DiscountCarousel() {
  const products = useProductStore((state) => state.products);
  const discountProducts = products.filter(isDiscountActive);
  const t = useI18nStore((s) => s.t);
  const lang = useI18nStore((s) => s.lang);

  if (discountProducts.length === 0) return null;

  return (
    <div className="mt-4 mb-4">
      <div className="px-4 mb-3">
        <h2 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
          <span className="bg-red-500 w-2 h-6 rounded-full inline-block"></span>
          {t('discountCarousel.discount')}
        </h2>
      </div>

      <div className="flex w-full overflow-x-auto no-scrollbar snap-x snap-mandatory px-4 pb-6 gap-4">
        {discountProducts.map((product) => {
          const useBoxPrice = product.priceBox && product.priceBox > 0;
          const originalPriceUzs = useBoxPrice ? product.priceBox : 0;
          const originalPriceUsd = product.pricePiece;
          
          const discountedPriceUzs = useBoxPrice ? getEffectivePrice(product, originalPriceUzs) : 0;
          const discountedPriceUsd = parseFloat(getEffectivePrice(product, originalPriceUsd).toFixed(2));

          return (
            <Link 
              key={`discount-${product.id}`}
              to={`/product/${product.id}`}
              className="flex-shrink-0 snap-center w-[85vw] max-w-[320px] rounded-3xl bg-white shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-slate-50/50 p-4 transition-all duration-300 hover:shadow-[0_8px_30px_rgb(200,0,0,0.08)] hover:-translate-y-1 block relative overflow-hidden"
            >
              <div className="aspect-[16/9] w-full relative mb-4 overflow-hidden rounded-2xl from-slate-100 to-white flex items-center justify-center p-4">
                {product.discount && (
                   <div className="absolute bottom-2 left-2 bg-red-500 text-white font-black px-2 py-0.5 rounded-lg text-[11px] shadow-sm z-10">
                     -{product.discount}%
                   </div>
                )}
                <img
                  src={product.image}
                  alt={product.name}
                  className="object-contain h-full w-full transition-transform duration-500 hover:scale-110"
                  onError={(e) => { e.currentTarget.style.display='none'; e.currentTarget.nextElementSibling?.classList.remove('hidden') }}
                />
                <div className="hidden absolute inset-0 bg-slate-200"></div>
              </div>

              <div className="space-y-1.5 flex flex-col justify-between px-1">
                <h3 className="font-semibold text-slate-700 line-clamp-1 text-sm md:text-base leading-snug">
                  {product.name}
                </h3>
                <div className="flex flex-col gap-0.5 pt-1">
                  <div className="flex items-center gap-2">
                    <p className="font-extrabold text-red-600 text-base md:text-lg tracking-tight leading-none">
                      {useBoxPrice ? `${discountedPriceUzs.toLocaleString("uz-UZ")} ${lang === 'uz' ? "so'm" : (lang === 'ru' ? 'сум' : 'sum')}` : `$${discountedPriceUsd}`}
                    </p>
                    <p className="font-semibold text-slate-400 text-xs md:text-sm line-through leading-none">
                      {useBoxPrice ? `${originalPriceUzs.toLocaleString("uz-UZ")} ${lang === 'uz' ? "so'm" : (lang === 'ru' ? 'сум' : 'sum')}` : `$${originalPriceUsd}`}
                    </p>
                  </div>
                  <p className="font-semibold text-slate-400 text-[11px] leading-none tracking-wide mt-1">
                    {useBoxPrice && originalPriceUsd > 0 
                      ? `≈ $${discountedPriceUsd} / ${t('discountCarousel.piece')}` 
                      : (useBoxPrice ? t('discountCarousel.box') : t('discountCarousel.piece'))}
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
