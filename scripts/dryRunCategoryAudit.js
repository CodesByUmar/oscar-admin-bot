// FAQAT KO'RISH (o'chirmaydi) — 2 narsani tekshiradi:
//   1) "test" nomli kategoriyalar (yangi qo'shilganlarini topish uchun)
//   2) Bir xil nomli (duplicate) kategoriyalar — bular mahsulot qo'shishda
//      "boshqa kategoriyaga tushib ketish" xatosining sababi bo'lishi mumkin,
//      chunki Telegram tugmasi faqat matnni yuboradi, ID'ni emas — bir xil
//      nomli 2 ta kategoriya bo'lsa, bot qaysi birini bosganingizni
//      ajrata olmaydi.
//
// Ishga tushirish (Railway Console'da, shu servis muhitida):
//   node scripts/dryRunCategoryAudit.js
const { db } = require('../config/firebase');

function getStr(val, fallback = '') {
    if (val === null || val === undefined) return fallback;
    if (typeof val === 'string') return val;
    if (typeof val === 'object') return val.uz || val.ru || val.en || fallback;
    return String(val);
}

async function main() {
    const snapshot = await db.collection('categories').get();
    const cats = snapshot.docs.map((d) => ({ id: d.id, name: getStr(d.data().name, '?') }));

    console.log(`Jami kategoriyalar: ${cats.length}\n`);

    console.log('===== "test" so\'zi bor nomlar =====');
    const testLike = cats.filter((c) => c.name.toLowerCase().includes('test'));
    if (testLike.length === 0) console.log('  (topilmadi)');
    testLike.forEach((c) => console.log(`  [${c.id}] "${c.name}"`));

    console.log('\n===== Bir xil nomli (duplicate) kategoriyalar =====');
    const byName = {};
    cats.forEach((c) => {
        const key = c.name.toLowerCase().trim();
        if (!byName[key]) byName[key] = [];
        byName[key].push(c);
    });
    let dupCount = 0;
    for (const key in byName) {
        if (byName[key].length > 1) {
            dupCount++;
            console.log(`  "${byName[key][0].name}" — ${byName[key].length} marta: ${byName[key].map((c) => `[${c.id}]`).join(', ')}`);
        }
    }
    if (dupCount === 0) console.log('  (topilmadi)');

    console.log('\nTayyor. Bu FAQAT ko\'rsatish edi — hech narsa o\'zgartirilmadi.');
    process.exit(0);
}

main().catch((err) => {
    console.error('Xato:', err);
    process.exit(1);
});
