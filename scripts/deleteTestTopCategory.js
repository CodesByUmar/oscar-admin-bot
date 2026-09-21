// O'CHIRADI — dryRunTestTopCategory.js natijasi bo'yicha tasdiqlangan
// "Test" nomli Kategoriya (topCategories/48), uning "Test" nomli
// Subkategoriyasi (categories/104) va ikkita mahsuloti
// (products/952 "Test", products/953 "Test1") o'chiriladi.
//
// Ishga tushirish (Railway Console'da, oscar-admin-bot muhitida):
//   node scripts/deleteTestTopCategory.js
const { db } = require('../config/firebase');

const TOP_CATEGORY_IDS = ['48'];
const CATEGORY_IDS = ['104'];
const PRODUCT_IDS = ['952', '953'];

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
    console.log('\nTayyor.');
    process.exit(0);
}

main().catch((err) => {
    console.error('Xato:', err);
    process.exit(1);
});
