// Bir martalik skript: test banner (vU3LP20rGrsmkgdM9ivM, link:
// "/categories/Test" — o'chirilgan test kategoriyaga ishora qilardi)ni
// o'chiradi. Foydalanuvchi tasdiqlagan.
//
// Ishga tushirish (Railway Console'da, shu servis muhitida):
//   node scripts/deleteTestBanner.js
const { db } = require('../config/firebase');

async function main() {
    const ref = db.collection('banners').doc('vU3LP20rGrsmkgdM9ivM');
    const doc = await ref.get();
    if (!doc.exists) {
        console.log('⚠️ Topilmadi, ehtimol allaqachon o\'chirilgan.');
        process.exit(0);
    }
    console.log('Topilgan hujjat:', JSON.stringify(doc.data()));
    await ref.delete();
    console.log('🗑 banners/vU3LP20rGrsmkgdM9ivM — o\'chirildi.');
    process.exit(0);
}

main().catch((err) => {
    console.error('Xato:', err);
    process.exit(1);
});
