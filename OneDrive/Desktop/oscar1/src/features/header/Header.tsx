// import { useState } from "react";
// import { Bell, Search } from "lucide-react";
// import { Link } from "react-router-dom";
// import { useNotificationStore } from "@/store/notificationStore";
// import { NotificationModal } from "@/features/notifications/NotificationModal";
// import { SearchModal } from "@/features/search/SearchModal";

// export function Header() {
//   const unreadCount = useNotificationStore((state) => state.unreadCount());
//   const [notificationOpen, setNotificationOpen] = useState(false);
//   const [searchOpen, setSearchOpen] = useState(false);

//   return (
//     <>
//       <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm">
//         <div className="container flex h-16 items-center justify-between px-4 max-w-2xl mx-auto">
//           <Link to="/" className="flex items-center gap-2">
//             <span className="text-xl font-bold uppercase tracking-wider text-primary">
//               <img src="/image.png" alt="Oscar" className="w-full h-[35px]" />
//             </span>
//             {/* <span className="text-sm font-semibold tracking-wider text-muted-foreground hidden sm:inline-block">Store</span> */}
//           </Link>
//           <nav className="flex items-center gap-1">
//             <button 
//               onClick={() => setSearchOpen(true)}
//               className="relative flex items-center justify-center p-2 rounded-full hover:bg-slate-100 transition-colors"
//             >
//               <Search className="h-6 w-6 text-slate-700" />
//             </button>
//             <button 
//               onClick={() => setNotificationOpen(true)}
//               className="relative flex items-center justify-center p-2 rounded-full hover:bg-slate-100 transition-colors"
//             >
//               <Bell className="h-6 w-6 text-slate-700" />
//               {unreadCount > 0 && (
//                 <span className="absolute top-1 right-1 inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold text-white bg-primary rounded-full">
//                   {unreadCount}
//                 </span>
//               )}
//             </button>
//           </nav>
//         </div>
//       </header>
//       <NotificationModal open={notificationOpen} onOpenChange={setNotificationOpen} />
//       <SearchModal open={searchOpen} onOpenChange={setSearchOpen} />
//     </>
//   );
// }


// src/features/header/Header.tsx
import { useState } from "react";
import { Bell, Search, LogOut, LogIn } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useNotificationStore } from "@/store/notificationStore";
import { NotificationModal } from "@/features/notifications/NotificationModal";
import { SearchModal } from "@/features/search/SearchModal";
import { useI18nStore } from "@/store/i18nStore";
import { useAuth } from "@/context/AuthContext";  // ✅ to'g'ri import

export function Header() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();  // ✅ useAuth ishlatiladi
  const unreadCount = useNotificationStore((state) => state.unreadCount());
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { lang, setLang } = useI18nStore();

  const langs = ['uz', 'ru', 'en'] as const;

  const handleAuthClick = async () => {
    if (user?.isVip) {
      await signOut();
      navigate("/");
    } else {
      navigate("/signin");  // ✅ SignIn sahifasiga yo'naltirish
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm">
        <div className="container flex h-16 items-center justify-between px-4 max-w-2xl mx-auto">
          <Link to="/" className="flex items-center gap-2">
            <img src="/image.png" alt="Oscar" className="w-full h-[35px]" />
          </Link>
          <nav className="flex items-center gap-1">
            {/* Til tanlash */}
            <div className="flex items-center bg-slate-100 rounded-full p-0.5 mr-1">
              {langs.map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase transition-all ${lang === l
                      ? 'bg-white text-primary shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                  {l}
                </button>
              ))}
            </div>

            <button
              onClick={() => setSearchOpen(true)}
              className="p-2 rounded-full hover:bg-slate-100"
            >
              <Search className="h-6 w-6 text-slate-700" />
            </button>

            <button
              onClick={() => setNotificationOpen(true)}
              className="relative p-2 rounded-full hover:bg-slate-100"
            >
              <Bell className="h-6 w-6 text-slate-700" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 text-[10px] font-bold text-white bg-primary rounded-full">
                  {unreadCount}
                </span>
              )}
            </button>

            <button
              onClick={handleAuthClick}
              className={`flex items-center justify-center p-2 rounded-full ${user?.isVip
                  ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                  : 'bg-primary/10 text-primary hover:bg-primary/20'
                }`}
            >
              {user?.isVip ? (
                <LogOut className="w-5 h-5" />
              ) : (
                <LogIn className="w-5 h-5" />
              )}
            </button>
          </nav>
        </div>
      </header>
      <NotificationModal open={notificationOpen} onOpenChange={setNotificationOpen} />
      <SearchModal open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}