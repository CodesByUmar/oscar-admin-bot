const userState = {};

function resetUserState(chatId) {
    userState[chatId] = { step: 'none', data: {}, steps: [] };
}

// Railway har bir deploy'da konteynerni qayta ishga tushiradi — userState
// esa faqat operativ xotirada saqlanganligi uchun, admin biror ko'p
// bosqichli jarayonning (mahsulot qo'shish, tahrirlash va h.k.) o'rtasida
// bo'lsa, deploy paytida uning jarayoni hech qanday ogohlantirishsiz
// yo'qolib qolar edi.
//
// Bu muammoni butun kodni (har bir handlerda userState'ga sinxron
// murojaat qilinadigan joylarni) qayta yozmasdan hal qilish uchun:
// operativ xotiradagi obyekt xuddi avvalgidek ishlatiladi (hech qanday
// handler o'zgartirilmaydi), faqat SIGTERM kelganda (index.js'dagi
// graceful shutdown) joriy holatlar Firestore'ga saqlanadi, keyingi
// ishga tushishda esa qaytadan yuklanadi.

async function loadPersistedStates(db) {
    if (!db) return;
    try {
        const snap = await db.collection('admin_sessions').get();
        snap.docs.forEach((doc) => {
            const d = doc.data();
            userState[doc.id] = { step: d.step, data: d.data || {}, steps: d.steps || [] };
        });
        if (!snap.empty) console.log(`✅ ${snap.size} ta admin sessiyasi tiklandi.`);
    } catch (error) {
        console.error('Admin sessiyalarini yuklashda xato:', error.message);
    }
}

async function persistAllStates(db) {
    if (!db) return;
    try {
        const chatIds = Object.keys(userState);
        await Promise.all(chatIds.map((chatId) => {
            const state = userState[chatId];
            const ref = db.collection('admin_sessions').doc(String(chatId));
            // "Bo'sh" (jarayonsiz) holatlarni saqlashning hojati yo'q —
            // collection faqat haqiqatan ham davom etayotgan jarayonlarni
            // saqlaydi.
            if (!state || state.step === 'none') {
                return ref.delete().catch(() => {});
            }
            // Firestore `undefined` qiymatlarni qabul qilmaydi — JSON orqali
            // xavfsiz tozalanadi (funksiyalar/undefined maydonlar tushib qoladi).
            const safeData = JSON.parse(JSON.stringify(state.data || {}));
            return ref.set({ step: state.step, data: safeData, steps: state.steps || [] }).catch((err) => {
                console.error(`Sessiya (${chatId}) saqlanmadi:`, err.message);
            });
        }));
        if (chatIds.length > 0) console.log(`✅ ${chatIds.length} ta admin sessiyasi saqlandi.`);
    } catch (error) {
        console.error('Admin sessiyalarini saqlashda xato:', error.message);
    }
}

module.exports = { userState, resetUserState, loadPersistedStates, persistAllStates };
