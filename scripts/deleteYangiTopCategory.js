// O'CHIRADI — dryRunYangiContents.js natijasi bo'yicha tasdiqlangan
// "yangi" Kategoriya (topCategories/47), uning "nom" Subkategoriyasi
// (categories/103) va "uz" mahsuloti (products/951) o'chiriladi.
//
// Ishga tushirish (Railway Console'da, oscar-admin-bot muhitida):
//   node scripts/deleteYangiTopCategory.js
const { db } = require('../config/firebase');

const TOP_CATEGORY_IDS = ['47'];
const CATEGORY_IDS = ['103'];
const PRODUCT_IDS = ['951'];

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
