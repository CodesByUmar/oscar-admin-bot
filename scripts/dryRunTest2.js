// FAQAT KO'RISH (o'chirmaydi) — "test" yoki "tes1" so'zi bor
// kategoriya/mahsulotlarni ko'rsatadi (UZ/RU/EN, katta-kichik harf farqisiz).
//
// Ishga tushirish (Railway Console'da, shu servis muhitida):
//   node scripts/dryRunTest2.js
const { db } = require('../config/firebase');

function getStr(val, fallback = '') {
    if (val === null || val === undefined) return fallback;
    if (typeof val === 'string') return val;
    if (typeof val === 'object') return val.uz || val.ru || val.en || fallback;
    return String(val);
}

function allNameVariants(val) {
    if (val === null || val === undefined) return [];
    if (typeof val === 'string') return [val];
    if (typeof val === 'object') return [val.uz, val.ru, val.en].filter(Boolean);
    return [];
}

function looksLikeTest(nameField) {
    return allNameVariants(nameField).some((n) => {
        const low = n.toLowerCase();
        return low.includes('test') || low.includes('tes1');
    });
}

async function main() {
    console.log('===== "test"/"tes1" nomli KATEGORIYALAR =====');
    const catsSnap = await db.collection('categories').get();
    let catCount = 0;
    catsSnap.docs.forEach((d) => {
        const data = d.data();
        if (looksLikeTest(data.name)) {
            catCount++;
            console.log(`  [${d.id}] ${getStr(data.name)}`);
        }
    });
    if (catCount === 0) console.log('  (topilmadi)');

    console.log('\n===== "test"/"tes1" nomli MAHSULOTLAR =====');
    const prodSnap = await db.collection('products').get();
    let prodCount = 0;
    prodSnap.docs.forEach((d) => {
        const data = d.data();
        if (looksLikeTest(data.name)) {
            prodCount++;
            console.log(`  [${d.id}] ${getStr(data.name)} | kategoriya: ${getStr(data.category)}`);
        }
    });
    if (prodCount === 0) console.log('  (topilmadi)');

    console.log('\nTayyor. Bu FAQAT ko\'rsatish edi — hech narsa o\'chirilmadi.');
    process.exit(0);
}

main().catch((err) => {
    console.error('Xato:', err);
    process.exit(1);
});
