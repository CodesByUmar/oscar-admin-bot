// Bir martalik skript: "Test" [103] va "Tes1" [104] kategoriyalarni
// o'chiradi (dryRunTest2.js orqali topilgan, foydalanuvchi tasdiqlagan).
//
// Ishga tushirish (Railway Console'da, shu servis muhitida):
//   node scripts/deleteTestCategories2.js
const { db } = require('../config/firebase');

const TARGETS = [
    { id: '103', expectedName: 'Test' },
    { id: '104', expectedName: 'Tes1' },
];

async function main() {
    for (const { id, expectedName } of TARGETS) {
        const ref = db.collection('categories').doc(id);
        const doc = await ref.get();
        if (!doc.exists) {
            console.log(`⚠️ [${id}] topilmadi, o'tkazib yuborildi.`);
            continue;
        }
        const name = doc.data().name;
        const nameStr = typeof name === 'string' ? name : (name?.uz || name?.ru || name?.en || '');
        if (nameStr !== expectedName) {
            console.log(`⚠️ [${id}] nomi kutilganidek emas ("${nameStr}" != "${expectedName}"), xavfsizlik uchun o'tkazib yuborildi.`);
            continue;
        }
        await ref.delete();
        console.log(`🗑 [${id}] "${nameStr}" — o'chirildi.`);
    }
    console.log('\nTayyor.');
    process.exit(0);
}

main().catch((err) => {
    console.error('Xato:', err);
    process.exit(1);
});
