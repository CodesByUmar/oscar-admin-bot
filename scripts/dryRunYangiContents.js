// FAQAT KO'RISH (o'chirmaydi) — "yangi" nomli Kategoriya (topCategories/47)
// ICHIDAGI barcha subkategoriya va mahsulotlarni (topCategory="yangi"
// bo'yicha, katta-kichik harf farqisiz) ko'rsatadi.
//
// Ishga tushirish (Railway Console'da, shu servis muhitida):
//   node scripts/dryRunYangiContents.js
const { db } = require('../config/firebase');

function getStr(val, fallback = '') {
    if (val === null || val === undefined) return fallback;
    if (typeof val === 'string') return val;
    if (typeof val === 'object') return val.uz || val.ru || val.en || fallback;
    return String(val);
}

async function main() {
    const topSnap = await db.collection('topCategories').get();
    const tops = topSnap.docs.filter((d) => getStr(d.data().name).trim().toLowerCase() === 'yangi');
    console.log(`===== "yangi" nomli Kategoriya(lar) =====`);
    tops.forEach((d) => console.log(`  [topCategories/${d.id}] "${getStr(d.data().name)}"`));
    if (tops.length === 0) { console.log('  (topilmadi)'); process.exit(0); }

    const catSnap = await db.collection('categories').get();
    const cats = catSnap.docs.filter((d) => getStr(d.data().topCategory).trim().toLowerCase() === 'yangi');
    console.log(`\n===== Ichidagi SUBKATEGORIYALAR (${cats.length} ta) =====`);
    if (cats.length === 0) console.log('  (topilmadi)');
    cats.forEach((d) => console.log(`  [categories/${d.id}] "${getStr(d.data().name)}"`));
    const catNames = cats.map((d) => getStr(d.data().name));

    const prodSnap = await db.collection('products').get();
    const prods = prodSnap.docs.filter((d) => {
        const data = d.data();
        return getStr(data.topCategory).trim().toLowerCase() === 'yangi' || catNames.includes(getStr(data.category));
    });
    console.log(`\n===== Ichidagi MAHSULOTLAR (${prods.length} ta) =====`);
    if (prods.length === 0) console.log('  (topilmadi)');
    prods.forEach((d) => {
        const data = d.data();
        console.log(`  [products/${d.id}] "${getStr(data.name)}" | kategoriya: "${getStr(data.category)}" | topCategory: "${getStr(data.topCategory)}"`);
    });

    console.log(`\nJami: ${tops.length} ta Kategoriya, ${cats.length} ta Subkategoriya, ${prods.length} ta Mahsulot.`);
    console.log('Tayyor. Bu FAQAT ko\'rsatish edi — hech narsa o\'chirilmadi.');
    process.exit(0);
}

main().catch((err) => {
    console.error('Xato:', err);
    process.exit(1);
});
