import { Minus, Plus, Trash2 } from "lucide-react";
import { type CartItem as CartItemType, useCartStore } from "@/store/cartStore";
import { useProductStore } from "@/store/productStore";
import { useI18nStore } from "@/store/i18nStore";

interface CartItemProps {
  item: CartItemType;
}

export function CartItem({ item }: CartItemProps) {
  const { updateQuantity, removeItem } = useCartStore();
  const products = useProductStore((state) => state.products);
  const t = useI18nStore((s) => s.t);
  const lang = useI18nStore((s) => s.lang);

  const product = products.find(p => String(p.id) === String(item.productId));
  const isBox = item.unit === 'box';
  const unitLabel = isBox ? (lang === 'uz' ? 'Karobka' : (lang === 'ru' ? 'Коробка' : 'Box')) : (lang === 'uz' ? 'Dona' : (lang === 'ru' ? 'Шт' : 'Item'));
  const itemsPerBox = item.itemsPerBox || 1;
  
  const stockLimit = product ? 999999 : 0;

  return (
    <div className="flex gap-4 p-4 bg-white rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-100 items-center transition-all hover:shadow-[0_8px_30px_rgb(0,200,255,0.06)] relative touch-manipulation">
      {/* Product Image */}
      <div className="w-24 h-24 bg-white rounded-2xl overflow-hidden flex-shrink-0 flex items-center justify-center p-2 relative border border-slate-50">
        <img
          src={item.image || undefined}
          alt={item.name}
          className="object-contain w-full h-full drop-shadow-sm"
          onError={(e) => { e.currentTarget.style.display='none'; e.currentTarget.nextElementSibling?.classList.remove('hidden') }}
        />
        <div className="hidden absolute inset-0 bg-slate-200"></div>
      </div>
      
      {/* Details */}
      <div className="flex-1 min-w-0 pr-1 flex items-center justify-between gap-2">
        <div className="flex flex-col flex-1 min-w-0 py-1">
          <h4 className="font-semibold text-slate-800 text-[14px] mb-1.5 leading-snug line-clamp-2">
            {item.name}
          </h4>
          
          <div className="flex flex-col gap-0.5">
             <div className="text-slate-900 font-extrabold text-[15px] tracking-tight">
               {item.unit === 'item' ? `$${item.price}` : `${item.price.toLocaleString("uz-UZ")} UZS`}
             </div>
             
             <div className="flex items-center mt-1 flex-wrap gap-1.5">
                <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md uppercase tracking-wider">
                  1 x {unitLabel} {isBox && `(${itemsPerBox} ${lang === 'uz' ? 'dona' : (lang === 'ru' ? 'шт' : 'items')})`}
                </span>
                {item.discount > 0 && (
                  <span className="text-[10px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                    {t('cart.discount')}: {item.discount}%
                  </span>
                )}
             </div>
          </div>
        </div>

        {/* Quantity Controls on the Right */}
        <div className="flex flex-col items-end flex-shrink-0">
          <div className="flex items-center bg-slate-100 rounded-full h-10 p-1 border border-slate-200/60 shadow-inner">
            <button
              onClick={() => updateQuantity(item.cartItemId, item.quantity - 1)}
              disabled={item.quantity <= 1}
              className="w-8 h-8 flex items-center justify-center bg-white text-slate-700 disabled:opacity-40 hover:bg-slate-50 active:scale-90 rounded-full shadow-sm transition-all flex-shrink-0"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="w-8 text-center text-[15px] font-extrabold text-slate-900 select-none">{item.quantity}</span>
            <button
              onClick={() => updateQuantity(item.cartItemId, item.quantity + 1)}
              disabled={item.quantity >= stockLimit}
              className="w-8 h-8 flex items-center justify-center bg-white text-slate-700 disabled:opacity-40 hover:bg-slate-50 active:scale-90 rounded-full shadow-sm transition-all flex-shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Delete Trigger */}
      <button
        className="absolute -top-2 -right-2 bg-white text-slate-400 hover:text-red-500 shadow-md border border-slate-100 rounded-full w-8 h-8 flex items-center justify-center transition-transform hover:scale-110 active:scale-95"
        onClick={() => removeItem(item.cartItemId)}
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}
