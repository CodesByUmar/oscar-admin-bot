// FAQAT KO'RISH (o'chirmaydi) — "Test"/"Tes1"/"test"/"Test2" kategoriyalari
// ostida qancha mahsulot borligini ko'rsatadi (kategoriya o'chirilsa,
// bu mahsulotlar "egasiz" qolib ketmasin deb, oldin bilib olamiz).
//
// Ishga tushirish (Railway Console'da, shu servis muhitida):
//   node scripts/dryRunTestCategoryProducts.js
const { db } = require('../config/firebase');

function getStr(val, fallback = '') {
    if (val === null || val === undefined) return fallback;
    if (typeof val === 'string') return val;
    if (typeof val === 'object') return val.uz || val.ru || val.en || fallback;
    return String(val);
}

const TARGET_IDS = ['103', '104', '105', '106'];

async function main() {
    for (const id of TARGET_IDS) {
        const doc = await db.collection('categories').doc(id).get();
        if (!doc.exists) { console.log(`[${id}] topilmadi.`); continue; }
        const name = doc.data().name;
        const nameStr = getStr(name, '?');
        const prodSnap = await db.collection('products').where('category', '==', name).get();
        console.log(`[${id}] "${nameStr}" — ${prodSnap.size} ta mahsulot`);
        prodSnap.docs.forEach((p) => console.log(`    - [${p.id}] ${getStr(p.data().name)}`));
    }
    console.log('\nTayyor. Bu FAQAT ko\'rsatish edi — hech narsa o\'zgartirilmadi.');
    process.exit(0);
}

main().catch((err) => {
    console.error('Xato:', err);
    process.exit(1);
});
