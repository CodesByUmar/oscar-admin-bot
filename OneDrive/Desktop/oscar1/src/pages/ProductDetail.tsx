// src/pages/ProductDetail.tsx
import { useState, useMemo, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft, Minus, Plus, ShoppingCart, Box, Package } from "lucide-react";
import { useProductStore } from "@/store/productStore";
import { useCartStore } from "@/store/cartStore";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/features/products/ProductCard";
import { cn } from "@/lib/utils";
import { isDiscountActive, getEffectivePrice } from "@/utils/discount";
import { useSettingsStore } from "@/store/settingsStore";
import { useI18nStore } from "@/store/i18nStore";

export function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const products = useProductStore((state) => state.products);
  const USD_TO_UZS = useSettingsStore((s) => s.usdRate);
  const t = useI18nStore((s) => s.t);
  const lang = useI18nStore((s) => s.lang);
  
  // Force native scroll-to-top immediately upon route hydration
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  const product = products.find((p) => String(p.id) === String(id));
  const addItem = useCartStore((state) => state.addItem);

  const displayName = product ? (product.nameI18n?.[lang] || product.name) : '';
  const displayDescription = product ? (product.descriptionI18n?.[lang] || product.description) : '';
  
  const [unit, setUnit] = useState<'item' | 'box'>('item');
  const [quantity, setQuantity] = useState(1);

  const relatedProducts = useMemo(() => {
    if (!product) return [];
    return products.filter(p => p.category === product.category && p.id !== product.id).slice(0, 5);
  }, [product, products]);

  if (!product) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <h2 className="text-xl font-bold mb-4">{t('product.not_found')}</h2>
        <Button onClick={() => navigate(-1)}>{t('nav.home')}</Button>
      </div>
    );
  }

  // E-commerce math
  const hasBox = typeof product.itemsPerBox === 'number' && product.itemsPerBox > 1;
  const itemsPerBox = product.itemsPerBox || 1;
  
  const baseItemPrice = product.pricePiece || 0;
  const baseBoxPrice = product.priceBox || (baseItemPrice * USD_TO_UZS * itemsPerBox);
  
  const currentItemPriceUSD = getEffectivePrice(product, baseItemPrice);
  const currentBoxPriceUZS = getEffectivePrice(product, baseBoxPrice);
  
  const itemPriceUZS = Math.round(currentItemPriceUSD * USD_TO_UZS);
  const currentBoxPriceUSD = parseFloat((currentBoxPriceUZS / USD_TO_UZS).toFixed(2));
  
  const activePrice = unit === 'item' ? currentItemPriceUSD : currentBoxPriceUZS;
  const activeOriginalPrice = unit === 'item' ? baseItemPrice : baseBoxPrice;
  const totalPrice = unit === 'item' ? parseFloat((activePrice * quantity).toFixed(2)) : (activePrice * quantity);
  
  const hasDiscount = isDiscountActive(product);
  const discountPercent = product.discount || 0;

  // Stock logic
  const maxAllowedQuantity: number = 999999;
  
  const handleQuantityChange = (delta: number) => {
    const newQty = quantity + delta;
    if (newQty >= 1 && newQty <= maxAllowedQuantity) {
      setQuantity(newQty);
    }
  };

  const handleUnitToggle = (selectedUnit: 'item' | 'box') => {
    setUnit(selectedUnit);
    // Reset quantity if switching exceeds stock for that unit
    const newMaxAllowed: number = 999999;
    if (quantity > newMaxAllowed) {
      setQuantity(Math.max(1, newMaxAllowed));
    }
  };

  const handleAddToCart = () => {
    if (quantity > maxAllowedQuantity || quantity < 1) return;
    
    addItem({
      productId: product.id,
      name: displayName,
      price: activePrice,
      originalPrice: activeOriginalPrice,
      discount: discountPercent,
      quantity, // Passing selected quantity here!
      image: product.image,
      unit,
      itemsPerBox: product.itemsPerBox
    });
    navigate("/cart");
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-[160px] relative">
      {/* Floating Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="absolute top-4 left-4 z-50 w-12 h-12 flex items-center justify-center rounded-full bg-white/80 backdrop-blur-md shadow-lg text-slate-800 transition-transform active:scale-95"
      >
        <ChevronLeft className="w-7 h-7" />
      </button>

      <main className="max-w-2xl mx-auto">
        {/* Swipeable Carousel Container */}
        <div className="w-full relative bg-[#ffffff] rounded-b-3xl overflow-hidden pb-8">
           <div className="flex w-full overflow-x-auto snap-x snap-mandatory no-scrollbar relative z-10">
              
              {/* Slide 1: Dominant Product Image */}
              <div className="w-full flex-[0_0_100%] snap-start relative aspect-square flex items-center justify-center pt-8 pb-4 px-8">
                {hasDiscount && (
                   <div className="absolute top-10 right-4 bg-red-500 text-white font-bold px-4 py-1.5 rounded-full shadow-lg z-10">
                     -{discountPercent}%
                   </div>
                )}
                <img
                  src={product.image}
                  alt={displayName}
                  className="w-full h-full object-contain max-w-[100%] transition-transform duration-700 hover:scale-105"
                  onError={(e) => { e.currentTarget.style.display='none'; e.currentTarget.nextElementSibling?.classList.remove('hidden') }}
                />
              </div>

              {/* Slide 2: Product Description */}
              <div className="w-full flex-[0_0_100%] snap-start relative aspect-square flex flex-col justify-center p-8 bg-[#f8f9fa]">
                 <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 shadow-sm border border-slate-100 h-full overflow-y-auto no-scrollbar">
                    <h3 className="font-bold text-slate-800 text-lg mb-3 flex items-center gap-2">
                      <span className="w-2 h-6 bg-primary rounded-full inline-block"></span>
                      {t('product.description')}
                    </h3>
                    <p className="text-slate-600 leading-relaxed text-[15px]">
                      {displayDescription}
                    </p>
                 </div>
              </div>

           </div>
           
           {/* Carousel Indicators */}
           <div className="absolute bottom-10 left-0 right-0 flex justify-center gap-2 z-20 pointer-events-none">
              <div className="w-2.5 h-2.5 rounded-full bg-slate-300"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-slate-300"></div>
           </div>
        </div>

        {/* Product Info Board */}
        <div className="bg-white rounded-t-3xl -mt-6 relative z-30 p-5 shadow-[0_-15px_30px_rgb(0,0,0,0.04)] space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 leading-tight mb-2">
              {displayName}
            </h1>
            <div className="flex flex-col gap-1 mb-2">
              {hasDiscount && (
                <div className="text-sm font-semibold text-slate-400 line-through">
                  {unit === 'item' ? `${(baseItemPrice * USD_TO_UZS).toLocaleString("uz-UZ")} ${lang === 'uz' ? "so'm" : (lang === 'ru' ? 'сум' : 'sum')}` : `${baseBoxPrice.toLocaleString("uz-UZ")} ${lang === 'uz' ? "so'm" : (lang === 'ru' ? 'сум' : 'sum')}`}
                </div>
              )}
              <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
                {unit === 'item' ? `${itemPriceUZS.toLocaleString("uz-UZ")} ${lang === 'uz' ? "so'm" : (lang === 'ru' ? 'сум' : 'sum')}` : `${currentBoxPriceUZS.toLocaleString("uz-UZ")} ${lang === 'uz' ? "so'm" : (lang === 'ru' ? 'сум' : 'sum')}`}
              </div>
              <div className="text-sm font-medium text-slate-500">
                {unit === 'item' 
                  ? `≈ $${currentItemPriceUSD}` 
                  : `≈ $${currentBoxPriceUSD}`}
              </div>
            </div>
            {hasBox && unit === 'box' && (
              <p className="text-sm font-medium text-slate-500 mt-1">
                1 {lang === 'uz' ? 'karobkada' : (lang === 'ru' ? 'в коробке' : 'in box')} {itemsPerBox} {lang === 'uz' ? 'dona' : (lang === 'ru' ? 'шт' : 'items')}
              </p>
            )}
          </div>

          {/* Unit Toggle Container */}
          {hasBox && (
            <div className="space-y-3 pt-2">
              <h3 className="font-semibold text-slate-800 text-sm">{t('product.select_unit')}</h3>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleUnitToggle('item')}
                  className={cn(
                    "flex flex-col items-start justify-center p-3 rounded-2xl border-2 transition-all text-left",
                    unit === 'item' ? "bg-primary/5 border-primary shadow-sm" : "bg-white border-slate-100 hover:border-slate-200"
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Package className={cn("w-4 h-4", unit === 'item' ? "text-primary" : "text-slate-500")} /> 
                    <span className={cn("font-semibold", unit === 'item' ? "text-slate-900" : "text-slate-600")}>{t('product.item')}</span>
                  </div>
                  <span className="text-lg font-bold text-slate-900">{itemPriceUZS.toLocaleString("uz-UZ")} <span className="text-sm font-semibold">{lang === 'uz' ? "so'm" : (lang === 'ru' ? 'сум' : 'sum')}</span></span>
                  <span className="text-xs font-medium text-slate-500 mt-0.5">≈ ${currentItemPriceUSD}</span>
                </button>

                <button
                  onClick={() => handleUnitToggle('box')}
                  className={cn(
                    "flex flex-col items-start justify-center p-3 rounded-2xl border-2 transition-all text-left",
                    unit === 'box' ? "bg-primary/5 border-primary shadow-sm" : "bg-white border-slate-100 hover:border-slate-200"
                  )}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <div className="flex items-center gap-2">
                      <Box className={cn("w-4 h-4", unit === 'box' ? "text-primary" : "text-slate-500")} /> 
                      <span className={cn("font-semibold", unit === 'box' ? "text-slate-900" : "text-slate-600")}>{t('product.box')}</span>
                    </div>
                  </div>
                  <span className="text-lg font-bold text-slate-900">{currentBoxPriceUZS.toLocaleString("uz-UZ")} <span className="text-sm font-semibold">UZS</span></span>
                  <span className="text-xs font-medium text-slate-500 mt-0.5">≈ ${currentBoxPriceUSD}</span>
                </button>
              </div>
            </div>
          )}

          {/* Settings & Quantity */}
          <div className="flex justify-center pt-2">
             <div className="space-y-1.5 flex flex-row justify-between items-center w-full">
                <span className="text-xl font-semibold text-slate-500">{t('product.quantity')}</span>
                <div className="flex items-center bg-slate-100 rounded-full h-[52px] p-1.5 border border-slate-200/60 shadow-inner min-w-[150px]">
                  <button
                    onClick={() => handleQuantityChange(-1)}
                    disabled={quantity <= 1}
                    className="w-10 h-10 flex items-center justify-center bg-slate-200/80 text-slate-700 disabled:opacity-40 hover:bg-slate-300 active:scale-90 rounded-full transition-all duration-200 flex-shrink-0"
                  >
                    <Minus className="w-5 h-5" />
                  </button>
                  <span className="flex-1 text-center text-xl font-extrabold text-slate-900 select-none">{quantity}</span>
                  <button
                    onClick={() => handleQuantityChange(1)}
                    disabled={quantity >= maxAllowedQuantity}
                    className="w-10 h-10 flex items-center justify-center bg-slate-200/80 text-slate-700 disabled:opacity-40 hover:bg-slate-300 active:scale-90 rounded-full transition-all duration-200 flex-shrink-0"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
             </div>
          </div>

          <div className="pt-2 border-t border-slate-50">
             {/* Description moved to Swipeable Carousel Slide 2 */}
          </div>
        </div>

        {/* Related Products Feature */}
        {relatedProducts.length > 0 && (
          <div className="mt-6 mb-8 px-2">
            <div className="px-5 mb-4">
              <h3 className="font-bold text-slate-800 text-lg">{t('product.related')}</h3>
            </div>
            <div className="grid grid-cols-2 w-full overflow-x-auto no-scrollbar snap-x snap-mandatory px-4 gap-4 pb-4">
              {relatedProducts.map((p) => (
                <div key={p.id} className="flex-shrink-0 snap-start w-48 md:w-48 pb-2">
                  <ProductCard product={p} />
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Bottom Sticky CTA */}
      <div className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom))] left-0 right-0 py-4 px-5 bg-white border-t border-slate-200/60 shadow-[0_-10px_40px_rgb(0,0,0,0.05)] max-w-2xl mx-auto z-30">
        <div className="flex items-center gap-4">
          <div className="flex-1 min-w-0">
             <p className="text-xs font-semibold text-slate-500 mb-0.5">{t('cart.total')} ({quantity} {unit === 'item' ? t('product.item') : t('product.box')})</p>
             <p className="text-xl font-extrabold text-slate-900 truncate">
               {unit === 'item' ? `${(totalPrice * USD_TO_UZS).toLocaleString("uz-UZ")} ${lang === 'uz' ? "so'm" : (lang === 'ru' ? 'сум' : 'sum')}` : `${totalPrice.toLocaleString("uz-UZ")} ${lang === 'uz' ? "so'm" : (lang === 'ru' ? 'сум' : 'sum')}`}
             </p>
             <p className="text-xs font-medium text-slate-500 mt-0.5">
               {unit === 'item' ? `≈ $${totalPrice}` : `≈ $${parseFloat((currentBoxPriceUSD * quantity).toFixed(2))}`}
             </p>
          </div>
          <Button 
            className="flex-[1.5] h-14 rounded-2xl text-lg font-semibold flex gap-2 active:scale-95 transition-all shadow-lg shadow-primary/25"
            onClick={handleAddToCart}
            disabled={maxAllowedQuantity === 0}
          >
            <ShoppingCart className="w-5 h-5" />
            {t('product.add_cart')}
          </Button>
        </div>
      </div>
    </div>
  );
}
