// Bir martalik skript: dryRunCategoryAudit.js va
// dryRunTestCategoryProducts.js orqali topilgan test kategoriya/
// mahsulotlarni o'chiradi (foydalanuvchi tasdiqlagan):
//   Kategoriyalar: [103] "Test", [104] "Tes1", [105] "test", [106] "Test2"
//   Mahsulotlar:   [951] "test1", [952] "sd" (ikkalasi ham [103] "Test" ichida)
//
// Ishga tushirish (Railway Console'da, shu servis muhitida):
//   node scripts/deleteTestCategoriesAndProducts.js
const { db } = require('../config/firebase');

function getStr(val, fallback = '') {
    if (val === null || val === undefined) return fallback;
    if (typeof val === 'string') return val;
    if (typeof val === 'object') return val.uz || val.ru || val.en || fallback;
    return String(val);
}

const CATEGORY_TARGETS = [
    { id: '103', expectedName: 'Test' },
    { id: '104', expectedName: 'Tes1' },
    { id: '105', expectedName: 'test' },
    { id: '106', expectedName: 'Test2' },
];

const PRODUCT_TARGETS = [
    { id: '951', expectedName: 'test1' },
    { id: '952', expectedName: 'sd' },
];

async function main() {
    console.log('--- Mahsulotlar ---');
    for (const { id, expectedName } of PRODUCT_TARGETS) {
        const ref = db.collection('products').doc(id);
        const doc = await ref.get();
        if (!doc.exists) { console.log(`⚠️ [${id}] topilmadi, o'tkazib yuborildi.`); continue; }
        const nameStr = getStr(doc.data().name);
        if (nameStr !== expectedName) {
            console.log(`⚠️ [${id}] nomi kutilganidek emas ("${nameStr}" != "${expectedName}"), o'tkazib yuborildi.`);
            continue;
        }
        await ref.delete();
        console.log(`🗑 [${id}] "${nameStr}" — o'chirildi.`);
    }

    console.log('\n--- Kategoriyalar ---');
    for (const { id, expectedName } of CATEGORY_TARGETS) {
        const ref = db.collection('categories').doc(id);
        const doc = await ref.get();
        if (!doc.exists) { console.log(`⚠️ [${id}] topilmadi, o'tkazib yuborildi.`); continue; }
        const nameStr = getStr(doc.data().name);
        if (nameStr !== expectedName) {
            console.log(`⚠️ [${id}] nomi kutilganidek emas ("${nameStr}" != "${expectedName}"), o'tkazib yuborildi.`);
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
