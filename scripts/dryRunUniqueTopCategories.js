// FAQAT KO'RISH — categories kolleksiyasidagi NOYOB topCategory
// qiymatlarini va nechta kategoriya har biriga tegishli ekanini
// ko'rsatadi (yangi kategoriya qo'shish oqimiga top-kategoriya
// tanlovini qo'shish uchun ro'yxat kerak).
//
// Ishga tushirish (Railway Console'da, shu servis muhitida):
//   node scripts/dryRunUniqueTopCategories.js
const { db } = require('../config/firebase');

function getStr(val, fallback = '') {
    if (val === null || val === undefined) return fallback;
    if (typeof val === 'string') return val;
    if (typeof val === 'object') return val.uz || val.ru || val.en || fallback;
    return String(val);
}

async function main() {
    const snapshot = await db.collection('categories').get();
    const counts = new Map();
    snapshot.docs.forEach((d) => {
        const top = getStr(d.data().topCategory, '').trim();
        if (!top) return;
        counts.set(top, (counts.get(top) || 0) + 1);
    });
    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    console.log(`Noyob topCategory soni: ${sorted.length}\n`);
    sorted.forEach(([name, count]) => console.log(`  "${name}" — ${count} ta kategoriya`));
    console.log('\nTayyor.');
    process.exit(0);
}

main().catch((err) => {
    console.error('Xato:', err);
    process.exit(1);
});
