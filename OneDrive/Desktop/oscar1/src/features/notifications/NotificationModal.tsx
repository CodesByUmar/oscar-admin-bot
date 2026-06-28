// import { Bell, Tag, Zap, Percent, X } from "lucide-react";
// import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
// import { Button } from "@/components/ui/button";
// import { useNotificationStore } from "@/store/notificationStore";

// interface NotificationModalProps {
//   open: boolean;
//   onOpenChange: (open: boolean) => void;
// }

// export function NotificationModal({ open, onOpenChange }: NotificationModalProps) {
//   const { notifications, markAsRead, markAllAsRead, unreadCount } = useNotificationStore();

//   const getIcon = (type: string) => {
//     switch (type) {
//       case 'discount': return <Percent className="w-5 h-5 text-indigo-500" />;
//       case 'new_product': return <Zap className="w-5 h-5 text-yellow-500" />;
//       case 'promotion': return <Tag className="w-5 h-5 text-green-500" />;
//       default: return <Bell className="w-5 h-5 text-slate-500" />;
//     }
//   };

//   return (
//     <Dialog open={open} onOpenChange={onOpenChange}>
//       <DialogContent className="w-[calc(100%-2rem)] sm:w-full sm:max-w-md bg-white rounded-3xl max-h-[85vh] flex flex-col overflow-hidden p-0 border-none">
//         <DialogHeader className="p-5 border-b border-slate-100 flex-shrink-0 bg-white z-10 shadow-sm relative">
//           <div className="flex items-center justify-between">
//             <DialogTitle className="text-xl font-bold text-slate-800">Xabarnomalar</DialogTitle>
//             <div className="flex items-center gap-1">
//               {unreadCount() > 0 && (
//                 <Button 
//                   variant="ghost" 
//                   size="sm" 
//                   onClick={markAllAsRead}
//                   className="text-primary hover:text-primary/80 font-medium h-8"
//                 >
//                   Barchasini o'qish
//                 </Button>
//               )}
//               <Button
//                 variant="ghost"
//                 size="icon"
//                 onClick={() => onOpenChange(false)}
//                 className="h-8 w-8 text-slate-500 hover:text-slate-800 rounded-full"
//               >
//                 <X className="w-5 h-5" />
//               </Button>
//             </div>
//           </div>
//         </DialogHeader>
        
//         <div className="overflow-y-auto no-scrollbar p-5 pb-8 space-y-4 bg-slate-50">
//           {notifications.length === 0 ? (
//             <div className="text-center py-12 text-slate-500">
//               <Bell className="w-12 h-12 mx-auto mb-3 text-slate-300" />
//               <p>Yangi xabarlar yo'q</p>
//             </div>
//           ) : (
//             notifications.map((notification) => (
//               <div 
//                 key={notification.id}
//                 onClick={() => markAsRead(notification.id)}
//                 className={`flex gap-4 p-4 rounded-2xl transition-all cursor-pointer border ${notification.read ? 'bg-white border-transparent' : 'bg-primary/5 border-primary/10 shadow-sm'}`}
//               >
//                 <div className={`mt-1 flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${notification.read ? 'bg-slate-100' : 'bg-white shadow-sm'}`}>
//                   {getIcon(notification.type || '')}
//                 </div>
//                 <div className="flex-1">
//                   <div className="flex items-start justify-between gap-2">
//                     <h4 className={`text-sm font-semibold mb-1 ${notification.read ? 'text-slate-700' : 'text-slate-900'}`}>
//                       {notification.title}
//                     </h4>
//                     {!notification.read && (
//                       <span className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0"></span>
//                     )}
//                   </div>
//                   <p className={`text-sm leading-snug ${notification.read ? 'text-slate-500' : 'text-slate-600'}`}>
//                     {notification.message}
//                   </p>
//                 </div>
//               </div>
//             ))
//           )}
//         </div>
//       </DialogContent>
//     </Dialog>
//   );
// }


import { Bell, Tag, Zap, Percent, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useNotificationStore } from "@/store/notificationStore";
import { useI18nStore } from "@/store/i18nStore";

interface NotificationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NotificationModal({ open, onOpenChange }: NotificationModalProps) {
  const { notifications, markAsRead, markAllAsRead, unreadCount } = useNotificationStore();
  const t = useI18nStore((s) => s.t);
  const lang = useI18nStore((s) => s.lang);

  const getIcon = (type: string) => {
    switch (type) {
      case 'discount': return <Percent className="w-5 h-5 text-indigo-500" />;
      case 'new_product': return <Zap className="w-5 h-5 text-yellow-500" />;
      case 'promotion': return <Tag className="w-5 h-5 text-green-500" />;
      default: return <Bell className="w-5 h-5 text-slate-500" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] sm:w-full sm:max-w-md bg-white rounded-3xl max-h-[85vh] flex flex-col overflow-hidden p-0 border-none">
        <DialogHeader className="p-5 border-b border-slate-100 flex-shrink-0 bg-white z-10 shadow-sm relative">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold text-slate-800">{t('notif.title')}</DialogTitle>
            <div className="flex items-center gap-1">
              {unreadCount() > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  className="text-primary hover:text-primary/80 font-medium h-8"
                >
                  {t('notif.read_all')}
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
                className="h-8 w-8 text-slate-500 hover:text-slate-800 rounded-full"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="overflow-y-auto no-scrollbar p-5 pb-8 space-y-4 bg-slate-50">
          {notifications.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Bell className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p>{t('notif.empty')}</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                onClick={() => markAsRead(notification.id)}
                className={`flex gap-4 p-4 rounded-2xl transition-all cursor-pointer border ${notification.read ? 'bg-white border-transparent' : 'bg-primary/5 border-primary/10 shadow-sm'}`}
              >
                <div className={`mt-1 flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${notification.read ? 'bg-slate-100' : 'bg-white shadow-sm'}`}>
                  {getIcon(notification.type || '')}
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className={`text-sm font-semibold mb-1 ${notification.read ? 'text-slate-700' : 'text-slate-900'}`}>
                      {notification.title}
                    </h4>
                    {!notification.read && (
                      <span className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0"></span>
                    )}
                  </div>
                  <p className={`text-sm leading-snug ${notification.read ? 'text-slate-500' : 'text-slate-600'}`}>
                    {notification.message}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}