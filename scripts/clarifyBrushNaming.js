// Bir martalik skript — "Щетка" (cho'tka) oilasida ikkita muammo:
//
// 1) DUBLIKAT (е/ё imlo farqi bilan yashiringan) — 799,801,802,805,807,808
//    aslida 278,280,281,284,286,287'ning aynan bir xil nusxasi (bir xil
//    rasm, bir xil kategoriya, faqat nomda "е" o'rniga "ё"). O'chiriladi.
//
// 2) NOM TO'QNASHUVI (Валик мешок/коробка bilan bir xil turdagi muammo) —
//    "Щетка 2.0\"" kabi nom bitta o'lchamda 2-3 xil, chindan HAR XIL
//    mahsulotda (лак uchun / yog'och dastali / plastik dastali) qaytarilib
//    keladi. Har biriga qadoq/tur qo'shiladi: "(для лака)" / "(деревянная)"
//    / "(пластиковая)".
//
// Ishga tushirish (Railway Console'da, shu servis muhitida):
//   node scripts/clarifyBrushNaming.js
const { db } = require('../config/firebase');

const SUFFIX = {
    lak: { ru: ' (для лака)', uz: ' (lak uchun)', en: ' (for varnish)' },
    wood: { ru: ' (деревянная)', uz: ' (yog\'och)', en: ' (wooden)' },
    plastic: { ru: ' (пластиковая)', uz: ' (plastik)', en: ' (plastic)' },
};

const RENAME_TARGETS = [
    { id: '273', expected: 'Щетка 2.0"', type: 'lak' },
    { id: '274', expected: 'Щетка 3.0"', type: 'lak' },
    { id: '275', expected: 'Щетка 4.0"', type: 'lak' },
    { id: '276', expected: 'Щетка 1.0"', type: 'wood' },
    { id: '277', expected: 'Щетка 1.5"', type: 'wood' },
    { id: '278', expected: 'Щетка 2.0"', type: 'wood' },
    { id: '279', expected: 'Щетка 2.5"', type: 'wood' },
    { id: '280', expected: 'Щетка 3.0"', type: 'wood' },
    { id: '281', expected: 'Щетка 4.0"', type: 'wood' },
    { id: '282', expected: 'Щетка 1.0"', type: 'plastic' },
    { id: '283', expected: 'Щетка 1.5"', type: 'plastic' },
    { id: '284', expected: 'Щетка 2.0"', type: 'plastic' },
    { id: '285', expected: 'Щетка 2.5"', type: 'plastic' },
    { id: '286', expected: 'Щетка 3.0"', type: 'plastic' },
    { id: '287', expected: 'Щетка 4.0"', type: 'plastic' },
];

const DELETE_TARGETS = [
    { id: '799', expected: 'Щётка 2.0"' },
    { id: '801', expected: 'Щётка 3.0"' },
    { id: '802', expected: 'Щётка 4.0"' },
    { id: '805', expected: 'Щётка 2.0"' },
    { id: '807', expected: 'Щётка 3.0"' },
    { id: '808', expected: 'Щётка 4.0"' },
];

async function run() {
    if (!db) {
        console.error('❌ DB ulanmagan.');
        process.exit(1);
    }

    let renamed = 0, deleted = 0;

    console.log('\n--- 1) Nomlarni aniqlashtirish ---');
    for (const { id, expected, type } of RENAME_TARGETS) {
        const ref = db.collection('products').doc(id);
        const snap = await ref.get();
        if (!snap.exists) { console.log(`⚠️  ${id} topilmadi.`); continue; }
        const name = snap.data().name || {};
        if (name.ru !== expected) {
            console.log(`⚠️  ${id}: nom mos kelmadi (kutilgan "${expected}", bazada "${name.ru}") — o'tkazib yuborildi.`);
            continue;
        }
        const suf = SUFFIX[type];
        const updates = {};
        for (const lang of ['ru', 'uz', 'en']) {
            if (name[lang]) updates[`name.${lang}`] = name[lang] + suf[lang];
        }
        await ref.update(updates);
        console.log(`✅ ${id}: "${name.ru}" -> "${updates['name.ru']}"`);
        renamed++;
    }

    console.log("\n--- 2) Dublikatlarni o'chirish (е/ё) ---");
    for (const { id, expected } of DELETE_TARGETS) {
        const ref = db.collection('products').doc(id);
        const snap = await ref.get();
        if (!snap.exists) { console.log(`⚠️  ${id} topilmadi (allaqachon o'chirilgan?).`); continue; }
        const ru = (snap.data().name && snap.data().name.ru) || '';
        if (ru !== expected) {
            console.log(`⚠️  ${id}: kutilmagan nom ("${ru}") — xavfsizlik uchun o'chirilmadi.`);
            continue;
        }
        await ref.delete();
        console.log(`🗑  ${id} o'chirildi ("${ru}")`);
        deleted++;
    }

    console.log(`\nTayyor: ${renamed}/${RENAME_TARGETS.length} nom aniqlashtirildi, ${deleted}/${DELETE_TARGETS.length} dublikat o'chirildi.`);
    process.exit(0);
}

run().catch((err) => {
    console.error('❌ Xato:', err);
    process.exit(1);
});
