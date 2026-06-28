// src/pages/Profile.tsx
import { User } from "lucide-react";
import { Header } from "@/features/header/Header";
import { useI18nStore } from "@/store/i18nStore";

export function Profile() {
  const t = useI18nStore((s) => s.t);
  const lang = useI18nStore((s) => s.lang);

  return (
    <div className="min-h-screen bg-slate-50 pb-[104px]">
      <Header />
      <main className="container pt-6 max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">{t('profile.title')}</h2>
          <p className="text-slate-500 text-sm">
            {t('profile.coming_soon')}
          </p>
        </div>
      </main>
    </div>
  );
}
