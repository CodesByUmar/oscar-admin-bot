// Bir martalik skript: hozirgi "categories" hujjatlaridagi topCategory
// qiymatlaridan yangi "topCategories" kolleksiyasini to'ldiradi (faqat
// QO'SHADI — hech narsani o'chirmaydi/o'zgartirmaydi). Bu — admin botga
// qo'shilgan alohida "Top-kategoriya qo'shish" tugmasi to'g'ri ishlashi
// uchun kerak (ro'yxat bo'sh bo'lib qolmasligi uchun).
//
// Ishga tushirish (Railway Console'da, shu servis muhitida):
//   node scripts/seedTopCategoriesCollection.js
const { db } = require('../config/firebase');

function getStr(val, fallback = '') {
    if (val === null || val === undefined) return fallback;
    if (typeof val === 'string') return val;
    if (typeof val === 'object') return val.uz || val.ru || val.en || fallback;
    return String(val);
}

async function main() {
    const catsSnap = await db.collection('categories').get();
    const names = new Set();
    catsSnap.docs.forEach((d) => {
        const top = getStr(d.data().topCategory, '').trim();
        if (top) names.add(top);
    });

    const existingSnap = await db.collection('topCategories').get();
    const existingNames = new Set(existingSnap.docs.map((d) => getStr(d.data().name).toLowerCase().trim()));

    let lastIdNum = 0;
    existingSnap.docs.forEach((d) => {
        const parsed = parseInt(d.data().id);
        if (!isNaN(parsed) && parsed > lastIdNum) lastIdNum = parsed;
    });

    let added = 0;
    for (const name of [...names].sort()) {
        if (existingNames.has(name.toLowerCase())) continue;
        lastIdNum++;
        await db.collection('topCategories').doc(String(lastIdNum)).set({ id: lastIdNum, name });
        console.log(`+ [${lastIdNum}] "${name}"`);
        added++;
    }

    console.log(`\nJami topilgan noyob nom: ${names.size}`);
    console.log(`Yangi qo'shildi: ${added}`);
    console.log(`Oldin mavjud edi: ${names.size - added}`);
    console.log('\nTayyor.');
    process.exit(0);
}

main().catch((err) => {
    console.error('Xato:', err);
    process.exit(1);
});
