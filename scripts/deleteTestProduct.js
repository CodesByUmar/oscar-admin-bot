// Bir martalik skript: topCategory tuzatishini sinash uchun qo'shilgan
// "TEST" mahsulotini (ID 951) o'chirish.
//
// Ishga tushirish (Railway Console'da, shu servis muhitida):
//   node scripts/deleteTestProduct.js
const { db } = require('../config/firebase');

async function run() {
    if (!db) {
        console.error('❌ DB ulanmagan.');
        process.exit(1);
    }
    const ref = db.collection('products').doc('951');
    const snap = await ref.get();
    if (!snap.exists) {
        console.log('⚠️  951 topilmadi (allaqachon o\'chirilgan?).');
        process.exit(0);
    }
    const ru = (snap.data().name && snap.data().name.ru) || '';
    if (ru !== 'TEST') {
        console.log(`⚠️  Kutilmagan nom ("${ru}") — xavfsizlik uchun o'chirilmadi.`);
        process.exit(0);
    }
    await ref.delete();
    console.log('🗑  951 (TEST) o\'chirildi.');
    process.exit(0);
}

run().catch((err) => {
    console.error('❌ Xato:', err);
    process.exit(1);
});
