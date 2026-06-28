// src/pages/Location.tsx
import { MapPin, MessageCircle } from "lucide-react";
import { Header } from "@/features/header/Header";
import { Button } from "@/components/ui/button";
import { useI18nStore } from "@/store/i18nStore";

export function LocationPage() {

  const t = useI18nStore((s) => s.t);
  const lang = useI18nStore((s) => s.lang);

  const handleSupportOpen = () => {
    window.open("https://t.me/manager_oscar_tools", "_blank");
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-[104px]">
      <Header />
      <main className="container pt-6 max-w-xl mx-auto px-4 space-y-6">
        {/* Location 1 */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
          <div className="p-5 pb-4 border-b border-slate-50">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center shrink-0">
                <MapPin className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-800">Original Colormix LLC (OSCAR)</h2>
              </div>
            </div>
          </div>
          <div className="w-full h-[220px] bg-slate-100 relative">
            {/* <iframe
              src="https://www.google.com/maps?q=Orikzor+bozori,Tashkent&output=embed"
              className="w-full h-full border-0 absolute inset-0"
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            ></iframe> */}
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2995.1763082705293!2d69.1588695!3d41.348521399999996!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x38ae8fd2de145789%3A0xbcd3702d40da62bc!2sOriginal%20Colormix%20LLC!5e0!3m2!1sru!2s!4v1778621184900!5m2!1sru!2s"
              className="w-full h-full border-0 absolute inset-0"
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            ></iframe>
          </div>
        </div>

        {/* Location 2 */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
          <div className="p-5 pb-4 border-b border-slate-50">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center shrink-0">
                <MapPin className="w-6 h-6 text-primary" />
              </div>
              <div>
                {/* <h2 className="text-base font-bold text-slate-800">2-manzil</h2> */}
                <p className="text-md font-bold text-slate-800">O'rikzor bozori 5-qator 659-do'kon</p>
              </div>
            </div>
          </div>
          <div className="w-full h-[220px] bg-slate-100 relative">
            <iframe
              src="https://www.google.com/maps?q=Orikzor+bozori,Tashkent&output=embed"
              className="w-full h-full border-0 absolute inset-0"
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            ></iframe>
          </div>
        </div>

        {/* Support Card */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 flex items-center gap-5">
          <div className="w-14 h-14 bg-[#0088cc]/10 text-[#0088cc] rounded-2xl flex items-center justify-center shrink-0">
            <MessageCircle className="w-7 h-7" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-slate-800 text-sm mb-1">{t('location.support_title')}</h3>
            <p className="text-xs text-slate-500 font-medium">{t('location.support_desc')}</p>
          </div>
        </div>

        <Button
          variant="outline"
          onClick={handleSupportOpen}
          className="w-full h-14 rounded-2xl text-[15px] font-bold border-2 border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 active:scale-95 transition-all"
        >
          {t('location.support_btn')}
        </Button>
      </main>
    </div>
  );
}
