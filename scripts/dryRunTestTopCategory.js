// FAQAT KO'RISH (o'chirmaydi) — "test" va "test1" nomli topCategory
// (Kategoriya), ularga tegishli categories (Subkategoriya) va products
// (Mahsulot)larni ko'rsatadi.
//
// Ishga tushirish (Railway Console'da, oscar-admin-bot muhitida):
//   node scripts/dryRunTestTopCategory.js
const { db } = require('../config/firebase');

function getStr(val, fallback = '') {
    if (val === null || val === undefined) return fallback;
    if (typeof val === 'string') return val;
    if (typeof val === 'object') return val.uz || val.ru || val.en || fallback;
    return String(val);
}

const TARGET_NAMES = ['test', 'test1'];

function matchesTarget(name) {
    const n = getStr(name).trim().toLowerCase();
    return TARGET_NAMES.includes(n);
}

async function main() {
    console.log('===== 1) "test"/"test1" nomli KATEGORIYALAR (topCategories) =====');
    const topSnap = await db.collection('topCategories').get();
    const matchedTops = topSnap.docs.filter((d) => matchesTarget(d.data().name));
    matchedTops.forEach((d) => console.log(`  [topCategories/${d.id}] "${getStr(d.data().name)}"`));
    if (matchedTops.length === 0) console.log('  (topilmadi)');
    const matchedTopNames = matchedTops.map((d) => getStr(d.data().name));

    console.log('\n===== 2) "test"/"test1" nomli yoki shu Kategoriyaga tegishli SUBKATEGORIYALAR (categories) =====');
    const catSnap = await db.collection('categories').get();
    const matchedCats = catSnap.docs.filter((d) => {
        const data = d.data();
        return matchesTarget(data.name) || matchedTopNames.includes(getStr(data.topCategory));
    });
    matchedCats.forEach((d) => {
        const data = d.data();
        console.log(`  [categories/${d.id}] "${getStr(data.name)}" | topCategory: "${getStr(data.topCategory)}"`);
    });
    if (matchedCats.length === 0) console.log('  (topilmadi)');
    const matchedCatNames = matchedCats.map((d) => getStr(d.data().name));

    console.log('\n===== 3) Shu Kategoriya/Subkategoriyalarga tegishli MAHSULOTLAR (products) =====');
    const prodSnap = await db.collection('products').get();
    const matchedProds = prodSnap.docs.filter((d) => {
        const data = d.data();
        return matchedCatNames.includes(getStr(data.category)) || matchedTopNames.includes(getStr(data.topCategory));
    });
    matchedProds.forEach((d) => {
        const data = d.data();
        console.log(`  [products/${d.id}] "${getStr(data.name)}" | kategoriya: "${getStr(data.category)}" | topCategory: "${getStr(data.topCategory)}"`);
    });
    if (matchedProds.length === 0) console.log('  (topilmadi)');

    console.log(`\nJami: ${matchedTops.length} ta Kategoriya, ${matchedCats.length} ta Subkategoriya, ${matchedProds.length} ta Mahsulot.`);
    console.log('Tayyor. Bu FAQAT ko\'rsatish edi — hech narsa o\'chirilmadi.');
    process.exit(0);
}

main().catch((err) => {
    console.error('Xato:', err);
    process.exit(1);
});
