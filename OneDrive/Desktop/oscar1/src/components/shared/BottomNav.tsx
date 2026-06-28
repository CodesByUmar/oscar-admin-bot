// import { NavLink, useLocation } from "react-router-dom";
// import { Home, LayoutGrid, ShoppingCart, MapPin } from "lucide-react";
// import { useCartStore } from "@/store/cartStore";
// import { cn } from "@/lib/utils";

// export function BottomNav() {
//   const { items } = useCartStore();
//   const location = useLocation();

//   const navLinks = [
//     { name: "Asosiy", to: "/", icon: Home },
//     { name: "Katalog", to: "/categories", icon: LayoutGrid },
//     { name: "Savatcha", to: "/cart", icon: ShoppingCart },
//     { name: "Manzil", to: "/location", icon: MapPin },
//   ];

//   const totalCartBadge = items.reduce((acc, item) => acc + item.quantity, 0);

//   return (
//     <div className="w-full fixed bottom-0 left-0 right-0 max-w-2xl mx-auto z-50 bg-white/80 backdrop-blur-xl border-t border-slate-200/60 pb-[env(safe-area-inset-bottom)] shadow-[0_-10px_40px_rgb(0,0,0,0.06)]">
//       <nav className="flex justify-around items-center h-16">
//         {navLinks.map((link) => {
//           const Icon = link.icon;
//           const isActive = location.pathname === link.to;

//           return (
//             <NavLink
//               key={link.to}
//               to={link.to}
//               className="relative flex flex-col items-center justify-center w-full h-full text-slate-500 hover:text-slate-800 transition-colors"
//             >
//               {isActive && (
//                 <div className="absolute top-0 w-8 h-1 bg-primary rounded-b-full shadow-[0_2px_15px_rgb(from_var(--primary)_r_g_b_0.6)]" />
//               )}
              
//               <div className="relative mt-1">
//                 <Icon
//                   className={cn(
//                     "w-6 h-6 transition-transform duration-300",
//                     isActive ? "text-primary scale-110 drop-shadow-sm" : "text-slate-400"
//                   )}
//                 />
                
//                 {/* Cart Badge */}
//                 {link.name === "Savatcha" && totalCartBadge > 0 && (
//                   <div className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center shadow-sm z-10 border-2 border-white scale-125 origin-bottom-left">
//                     {totalCartBadge}
//                   </div>
//                 )}
//               </div>
              
//               <span 
//                 className={cn(
//                   "text-[10px] mt-1 font-semibold transition-colors duration-300",
//                   isActive ? "text-primary" : "text-slate-500"
//                 )}
//               >
//                 {link.name}
//               </span>
//             </NavLink>
//           );
//         })}
//       </nav>
//     </div>
//   );
// }


import { NavLink, useLocation } from "react-router-dom";
import { Home, LayoutGrid, ShoppingCart, MapPin } from "lucide-react";
import { useCartStore } from "@/store/cartStore";
import { useI18nStore } from "@/store/i18nStore";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const { items } = useCartStore();
  const location = useLocation();
  const t = useI18nStore((s) => s.t);
  const lang = useI18nStore((s) => s.lang);

  const navLinks = [
    { key: "nav.home", to: "/", icon: Home },
    { key: "nav.catalog", to: "/categories", icon: LayoutGrid },
    { key: "nav.cart", to: "/cart", icon: ShoppingCart },
    { key: "nav.location", to: "/location", icon: MapPin },
  ];

  const totalCartBadge = items.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <div className="w-full fixed bottom-0 left-0 right-0 max-w-2xl mx-auto z-50 bg-white/80 backdrop-blur-xl border-t border-slate-200/60 pb-[env(safe-area-inset-bottom)] shadow-[0_-10px_40px_rgb(0,0,0,0.06)]">
      <nav className="flex justify-around items-center h-16">
        {navLinks.map((link) => {
          const Icon = link.icon;
          const isActive = location.pathname === link.to;

          return (
            <NavLink
              key={link.to}
              to={link.to}
              className="relative flex flex-col items-center justify-center w-full h-full text-slate-500 hover:text-slate-800 transition-colors"
            >
              {isActive && (
                <div className="absolute top-0 w-8 h-1 bg-primary rounded-b-full" />
              )}
              
              <div className="relative mt-1">
                <Icon
                  className={cn(
                    "w-6 h-6 transition-transform duration-300",
                    isActive ? "text-primary scale-110 drop-shadow-sm" : "text-slate-400"
                  )}
                />
                
                {link.key === "nav.cart" && totalCartBadge > 0 && (
                  <div className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center shadow-sm z-10 border-2 border-white scale-125 origin-bottom-left">
                    {totalCartBadge}
                  </div>
                )}
              </div>
              
              <span className={cn(
                "text-[10px] mt-1 font-semibold transition-colors duration-300",
                isActive ? "text-primary" : "text-slate-500"
              )}>
                {t(link.key)}
              </span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}