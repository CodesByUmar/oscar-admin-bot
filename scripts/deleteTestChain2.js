// O'CHIRADI — dryRunFullTestSweep.js natijasi bo'yicha tasdiqlangan
// yangi "Test" zanjiri: topCategories/47 "Test", categories/103 "Test1",
// products/952 "Test1", products/953 "Test". Shu bilan birga foydalanuvchi
// skrinshotda "TEST" deb yozilgan banner (G1YbLvoMBLlrztaKANuy) ekanini
// tasdiqladi — uni ham o'chiradi.
//
// Ishga tushirish (Railway Console'da, oscar-admin-bot muhitida):
//   node scripts/deleteTestChain2.js
const { db } = require('../config/firebase');

const TOP_CATEGORY_IDS = ['47'];
const CATEGORY_IDS = ['103'];
const PRODUCT_IDS = ['952', '953'];
const BANNER_IDS = ['G1YbLvoMBLlrztaKANuy'];

async function main() {
    for (const id of PRODUCT_IDS) {
        await db.collection('products').doc(id).delete();
        console.log(`✅ O'chirildi: products/${id}`);
    }
    for (const id of CATEGORY_IDS) {
        await db.collection('categories').doc(id).delete();
        console.log(`✅ O'chirildi: categories/${id}`);
    }
    for (const id of TOP_CATEGORY_IDS) {
        await db.collection('topCategories').doc(id).delete();
        console.log(`✅ O'chirildi: topCategories/${id}`);
    }
    for (const id of BANNER_IDS) {
        await db.collection('banners').doc(id).delete();
        console.log(`✅ O'chirildi: banners/${id}`);
    }
    console.log('\nTayyor.');
    process.exit(0);
}

main().catch((err) => {
    console.error('Xato:', err);
    process.exit(1);
});
