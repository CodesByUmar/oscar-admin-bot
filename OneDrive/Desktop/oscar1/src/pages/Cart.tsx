// import { useNavigate } from "react-router-dom";
// import { ChevronLeft, ShoppingBag } from "lucide-react";
// import { useCartStore } from "@/store/cartStore";
// import { CartItem } from "@/features/cart/CartItem";
// import { Button } from "@/components/ui/button";
// import { useSettingsStore } from "@/store/settingsStore";

// export function Cart() {
//   const navigate = useNavigate();
//   const { items } = useCartStore();

//   const totalQuantity = items.reduce((acc, item) => acc + item.quantity, 0);

//   const USD_TO_UZS = useSettingsStore((s) => s.usdRate);
//   const totalUSD = items.reduce((acc, item) => {
//     const itemPriceUSD = item.unit === 'item' ? item.price : (item.price / USD_TO_UZS);
//     return acc + (itemPriceUSD * item.quantity);
//   }, 0);
//   const totalUZS = totalUSD * USD_TO_UZS;

//   return (
//     <div className="min-h-screen bg-slate-50 flex flex-col pb-[160px]">
//       <div className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-md border-b shadow-sm">
//         <div className="container flex h-14 items-center px-4 max-w-2xl mx-auto">
//           <button
//             onClick={() => navigate(-1)}
//             className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-50 hover:bg-slate-100 transition-colors -ml-2"
//           >
//             <ChevronLeft className="w-6 h-6" />
//           </button>
//           <h1 className="ml-2 font-semibold text-lg flex-1">Savatcha</h1>
//           {items.length > 0 && (
//             <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-bold">
//               {items.length} tur
//             </span>
//           )}
//         </div>
//       </div>

//       <main className="flex-1 container px-4 pt-6 pb-14 max-w-2xl mx-auto">
//         {items.length > 0 ? (
//           <div className="space-y-4">
//             {items.map((item) => (
//               <CartItem key={item.cartItemId} item={item} />
//             ))}
//           </div>
//         ) : (
//           <div className="h-[60vh] flex flex-col items-center justify-center text-slate-500 space-y-5">
//             <div className="w-24 h-24 bg-gradient-to-tr from-slate-100 to-slate-200 rounded-full flex items-center justify-center mb-2 shadow-inner">
//               <ShoppingBag className="w-10 h-10 text-slate-400" />
//             </div>
//             <h2 className="text-xl font-bold text-slate-700">Savatcha bo'sh</h2>
//             <p className="text-slate-500 text-center px-8 text-sm leading-relaxed mb-4">
//               Xaridni boshlash uchun mahsulotlar sahifasiga o'ting va kerakli tovarlarni savatga qo'shing.
//             </p>
//             <Button onClick={() => navigate("/")} className="rounded-2xl h-12 px-8 font-semibold shadow-md active:scale-95 transition-all">
//               Xaridni boshlash
//             </Button>
//           </div>
//         )}
//       </main>

//       {items.length > 0 && (
//         <div className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom))] left-0 right-0 py-4 px-5 bg-white border-t border-slate-200/60 shadow-[0_-10px_40px_rgb(0,0,0,0.05)] max-w-2xl mx-auto z-30">
//           <div className="flex items-center justify-between mb-4 px-1">
//              <span className="text-slate-700 font-bold text-xl mt-1">Jami ({totalQuantity} ta):</span>
//              <div className="flex flex-col items-end gap-0.5">
//                <span className="text-2xl font-extrabold text-slate-900 tracking-tight">
//                  {totalUZS.toLocaleString("uz-UZ")} <span className="text-sm font-bold text-slate-500">so'm</span>
//                </span>
//                <span className="text-sm font-medium text-slate-500">
//                  ≈ ${totalUSD.toFixed(2)}
//                </span>
//              </div>
//           </div>
//           <Button 
//             className="w-full h-14 rounded-2xl text-lg font-bold shadow-lg shadow-primary/25 active:scale-95 transition-all"
//             onClick={() => navigate("/checkout")}
//           >
//             To'lovga o'tish
//           </Button>
//         </div>
//       )}
//     </div>
//   );
// }


import { useNavigate } from "react-router-dom";
import { ChevronLeft, ShoppingBag } from "lucide-react";
import { useCartStore } from "@/store/cartStore";
import { CartItem } from "@/features/cart/CartItem";
import { Button } from "@/components/ui/button";
import { useSettingsStore } from "@/store/settingsStore";
import { useI18nStore } from "@/store/i18nStore";

export function Cart() {
  const navigate = useNavigate();
  const { items } = useCartStore();
  const t = useI18nStore((s) => s.t);
  const lang = useI18nStore((s) => s.lang);

  const totalQuantity = items.reduce((acc, item) => acc + item.quantity, 0);

  const USD_TO_UZS = useSettingsStore((s) => s.usdRate);
  const totalUSD = items.reduce((acc, item) => {
    const itemPriceUSD = item.unit === 'item' ? item.price : (item.price / USD_TO_UZS);
    return acc + (itemPriceUSD * item.quantity);
  }, 0);
  const totalUZS = totalUSD * USD_TO_UZS;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-[160px]">
      <div className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-md border-b shadow-sm">
        <div className="container flex h-14 items-center px-4 max-w-2xl mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-50 hover:bg-slate-100 transition-colors -ml-2"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="ml-2 font-semibold text-lg flex-1">{t('cart.title')}</h1>
          {items.length > 0 && (
            <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-bold">
              {items.length} {lang === 'uz' ? 'tur' : (lang === 'ru' ? 'вид' : 'types')}
            </span>
          )}
        </div>
      </div>

      <main className="flex-1 container px-4 pt-6 pb-14 max-w-2xl mx-auto">
        {items.length > 0 ? (
          <div className="space-y-4">
            {items.map((item) => (
              <CartItem key={item.cartItemId} item={item} />
            ))}
          </div>
        ) : (
          <div className="h-[60vh] flex flex-col items-center justify-center text-slate-500 space-y-5">
            <div className="w-24 h-24 bg-gradient-to-tr from-slate-100 to-slate-200 rounded-full flex items-center justify-center mb-2 shadow-inner">
              <ShoppingBag className="w-10 h-10 text-slate-400" />
            </div>
            <h2 className="text-xl font-bold text-slate-700">{t('cart.empty')}</h2>
            <p className="text-slate-500 text-center px-8 text-sm leading-relaxed mb-4">
              {t('cart.empty_desc')}
            </p>
            <Button onClick={() => navigate("/")} className="rounded-2xl h-12 px-8 font-semibold shadow-md active:scale-95 transition-all">
              {t('cart.shop')}
            </Button>
          </div>
        )}
      </main>

      {items.length > 0 && (
        <div className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom))] left-0 right-0 py-4 px-5 bg-white border-t border-slate-200/60 shadow-[0_-10px_40px_rgb(0,0,0,0.05)] max-w-2xl mx-auto z-30">
          <div className="flex items-center justify-between mb-4 px-1">
            <span className="text-slate-700 font-bold text-xl mt-1">{t('cart.total')} ({totalQuantity} {lang === 'uz' ? 'ta' : (lang === 'ru' ? 'шт' : 'items')}):</span>
            <div className="flex flex-col items-end gap-0.5">
              <span className="text-2xl font-extrabold text-slate-900 tracking-tight">
                {totalUZS.toLocaleString("uz-UZ")} <span className="text-sm font-bold text-slate-500">{lang === 'uz' ? "so'm" : (lang === 'ru' ? 'сум' : 'sum')}</span>
              </span>
              <span className="text-sm font-medium text-slate-500">
                ≈ ${totalUSD.toFixed(2)}
              </span>
            </div>
          </div>
          <Button
            className="w-full h-14 rounded-2xl text-lg font-bold shadow-lg shadow-primary/25 active:scale-95 transition-all"
            onClick={() => navigate("/checkout")}
          >
            {t('cart.checkout')}
          </Button>
        </div>
      )}
    </div>
  );
}