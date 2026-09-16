// FAQAT KO'RISH (o'chirmaydi) — topCategory'si YO'Q subkategoriyalarni
// ko'rsatadi. Bular hierarxik navigatsiyada ("Kategoriya -> Subkategoriya")
// hech qaysi kategoriyaning ichida ko'rinmaydi — shuning uchun
// "Mahsulotni yangilash"ni hierarxiyaga o'tkazishdan oldin bularni bilib
// olish kerak.
//
// Ishga tushirish (Railway Console'da, shu servis muhitida):
//   node scripts/dryRunOrphanSubcategories.js
const { db } = require('../config/firebase');

function getStr(val, fallback = '') {
    if (val === null || val === undefined) return fallback;
    if (typeof val === 'string') return val;
    if (typeof val === 'object') return val.uz || val.ru || val.en || fallback;
    return String(val);
}

async function main() {
    const snap = await db.collection('categories').get();
    const orphans = snap.docs.filter((d) => !getStr(d.data().topCategory).trim());
    console.log(`Jami subkategoriyalar: ${snap.size}`);
    console.log(`topCategory'siz (orphan): ${orphans.length}\n`);
    orphans.forEach((d) => console.log(`  [${d.id}] "${getStr(d.data().name)}"`));
    console.log('\nTayyor. Bu FAQAT ko\'rsatish edi — hech narsa o\'zgartirilmadi.');
    process.exit(0);
}

main().catch((err) => {
    console.error('Xato:', err);
    process.exit(1);
});
