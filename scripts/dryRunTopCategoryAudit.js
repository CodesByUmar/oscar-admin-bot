// FAQAT KO'RISH — kategoriyalarning topCategory maydoni to'ldirilganmi
// yo'qmi va admin botda "Kategoriya qo'shish" oqimi topCategory so'raydimi
// yo'qmi tushunish uchun.
//
// Ishga tushirish (Railway Console'da, shu servis muhitida):
//   node scripts/dryRunTopCategoryAudit.js
const { db } = require('../config/firebase');

function getStr(val, fallback = '') {
    if (val === null || val === undefined) return fallback;
    if (typeof val === 'string') return val;
    if (typeof val === 'object') return val.uz || val.ru || val.en || fallback;
    return String(val);
}

async function main() {
    const snapshot = await db.collection('categories').get();
    const cats = snapshot.docs.map((d) => ({ id: d.id, name: getStr(d.data().name, '?'), topCategory: d.data().topCategory || null }));

    const withTop = cats.filter((c) => c.topCategory);
    const withoutTop = cats.filter((c) => !c.topCategory);

    console.log(`Jami kategoriyalar: ${cats.length}`);
    console.log(`topCategory BOR: ${withTop.length}`);
    console.log(`topCategory YO'Q: ${withoutTop.length}\n`);

    console.log('===== topCategory bor bo\'lganlar (namuna, 10 ta) =====');
    withTop.slice(0, 10).forEach((c) => console.log(`  [${c.id}] "${c.name}" -> topCategory: "${getStr(c.topCategory)}"`));

    console.log('\n===== topCategory YO\'Q bo\'lganlar (namuna, 10 ta) =====');
    withoutTop.slice(0, 10).forEach((c) => console.log(`  [${c.id}] "${c.name}"`));

    console.log('\nTayyor.');
    process.exit(0);
}

main().catch((err) => {
    console.error('Xato:', err);
    process.exit(1);
});
