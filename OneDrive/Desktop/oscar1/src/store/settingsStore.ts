import { create } from "zustand";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface SettingsStore {
    usdRate: number;
    fetchUsdRate: () => Promise<void>;
}

export const useSettingsStore = create<SettingsStore>((set) => ({
    usdRate: 12000,
    fetchUsdRate: async () => {
        try {
            const snap = await getDoc(doc(db, "settings", "usd_rate"));
            if (snap.exists() && snap.data().rate) {
                set({ usdRate: snap.data().rate });
            }
        } catch (e) {
            console.error("Kursni olishda xato:", e);
        }
    },
}));