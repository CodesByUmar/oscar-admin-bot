// FAQAT KO'RISH (o'chirmaydi) — eng oxirgi qo'shilgan topCategories,
// categories va products yozuvlarini (ID bo'yicha eng kattalarini)
// ko'rsatadi — bugungi test qilish paytida qo'shilgan narsalarni
// aniqlash uchun.
//
// Ishga tushirish (Railway Console'da, shu servis muhitida):
//   node scripts/dryRunRecentTestItems.js
const { db } = require('../config/firebase');

function getStr(val, fallback = '') {
    if (val === null || val === undefined) return fallback;
    if (typeof val === 'string') return val;
    if (typeof val === 'object') return val.uz || val.ru || val.en || fallback;
    return String(val);
}

async function showLast(collectionName, n, formatLine) {
    const snap = await db.collection(collectionName).get();
    const docs = snap.docs
        .map((d) => ({ id: d.id, idNum: parseInt(d.data().id) || 0, data: d.data() }))
        .sort((a, b) => b.idNum - a.idNum)
        .slice(0, n);
    console.log(`\n===== Oxirgi ${n} ta "${collectionName}" =====`);
    if (docs.length === 0) console.log('  (bo\'sh)');
    docs.forEach((d) => console.log(`  ${formatLine(d)}`));
}

async function main() {
    await showLast('topCategories', 5, (d) => `[${d.id}] "${getStr(d.data.name)}"`);
    await showLast('categories', 5, (d) => `[${d.id}] "${getStr(d.data.name)}" -> topCategory: "${getStr(d.data.topCategory, '(yo\'q)')}"`);
    await showLast('products', 5, (d) => `[${d.id}] "${getStr(d.data.name)}" | kategoriya: "${getStr(d.data.category)}" | rasm: ${d.data.image ? d.data.image.slice(0, 60) : '(yo\'q)'}`);
    console.log('\nTayyor. Bu FAQAT ko\'rsatish edi — hech narsa o\'zgartirilmadi.');
    process.exit(0);
}

main().catch((err) => {
    console.error('Xato:', err);
    process.exit(1);
});
