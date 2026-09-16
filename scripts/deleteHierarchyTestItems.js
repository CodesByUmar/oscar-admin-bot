// Bir martalik skript: dryRunRecentTestItems.js orqali topilgan test
// yozuvlarni o'chiradi (foydalanuvchi tasdiqlagan):
//   Mahsulotlar:   [951] "t1", [952] "Test1"
//   Subkategoriya: [103] "1", [104] "Test1"
//   Kategoriya:    [47] "Test"
//
// Ishga tushirish (Railway Console'da, shu servis muhitida):
//   node scripts/deleteHierarchyTestItems.js
const { db } = require('../config/firebase');

function getStr(val, fallback = '') {
    if (val === null || val === undefined) return fallback;
    if (typeof val === 'string') return val;
    if (typeof val === 'object') return val.uz || val.ru || val.en || fallback;
    return String(val);
}

async function deleteVerified(collectionName, id, expectedName) {
    const ref = db.collection(collectionName).doc(id);
    const doc = await ref.get();
    if (!doc.exists) { console.log(`⚠️ [${collectionName}/${id}] topilmadi, o'tkazib yuborildi.`); return; }
    const nameStr = getStr(doc.data().name);
    if (nameStr !== expectedName) {
        console.log(`⚠️ [${collectionName}/${id}] nomi kutilganidek emas ("${nameStr}" != "${expectedName}"), o'tkazib yuborildi.`);
        return;
    }
    await ref.delete();
    console.log(`🗑 [${collectionName}/${id}] "${nameStr}" — o'chirildi.`);
}

async function main() {
    console.log('--- Mahsulotlar ---');
    await deleteVerified('products', '951', 't1');
    await deleteVerified('products', '952', 'Test1');

    console.log('\n--- Subkategoriyalar ---');
    await deleteVerified('categories', '103', '1');
    await deleteVerified('categories', '104', 'Test1');

    console.log('\n--- Kategoriya ---');
    await deleteVerified('topCategories', '47', 'Test');

    console.log('\nTayyor.');
    process.exit(0);
}

main().catch((err) => {
    console.error('Xato:', err);
    process.exit(1);
});
