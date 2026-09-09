// Bir martalik skript: @asatilayev (6600096842) dan boshqa DINAMIK
// (bot_admins, Firestore) adminlarni o'chiradi. ADMIN_IDS (Railway env)
// bu yerdan o'zgarmaydi — uni alohida Railway Variables orqali tahrirlash
// kerak.
//
// Ishga tushirish (Railway Console'da, shu servis muhitida):
//   node scripts/removeOtherAdmins.js
const { db } = require('../config/firebase');

const KEEP_ID = '6600096842'; // @asatilayev
const REMOVE_IDS = ['5826308434', '828828217'];

async function main() {
    for (const id of REMOVE_IDS) {
        const ref = db.collection('bot_admins').doc(id);
        const doc = await ref.get();
        if (!doc.exists) {
            console.log(`⚠️ ${id} — bot_admins'da topilmadi, o'tkazib yuborildi.`);
            continue;
        }
        await ref.delete();
        console.log(`🗑 ${id} — o'chirildi.`);
    }
    console.log(`\n✅ Faqat ${KEEP_ID} (@asatilayev) bot_admins'dan tashqarida (ADMIN_IDS'da) qoladi.`);
    process.exit(0);
}

main().catch((err) => {
    console.error('Xato:', err);
    process.exit(1);
});
