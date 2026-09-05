// Bir martalik skript: "Валик 64/55/44/38" — "мешок" (qop) va "коробка"
// (karobka) turlari bir xil nomga ega bo'lgani uchun mijoz ham, admin
// ham ularni bir-biridan ajrata olmas edi (faqat narxi bilan farqlanardi).
// Endi nomiga qadoq turi qo'shiladi: "Валик 64 (мешок)" / "Валик 64
// (коробка)" — barcha 3 tilda (ru/uz/en).
//
// Ishga tushirish (Railway Console'da, shu servis muhitida):
//   node scripts/clarifyValikPackaging.js
const { db } = require('../config/firebase');

const TARGETS = [
    { id: '241', expected: 'Валик 64', suffix: { ru: ' (мешок)', uz: ' (qop)', en: ' (bag)' } },
    { id: '247', expected: 'Валик 64', suffix: { ru: ' (коробка)', uz: ' (karobka)', en: ' (box)' } },
    { id: '242', expected: 'Валик 55', suffix: { ru: ' (мешок)', uz: ' (qop)', en: ' (bag)' } },
    { id: '248', expected: 'Валик 55', suffix: { ru: ' (коробка)', uz: ' (karobka)', en: ' (box)' } },
    { id: '243', expected: 'Валик 44', suffix: { ru: ' (мешок)', uz: ' (qop)', en: ' (bag)' } },
    { id: '249', expected: 'Валик 44', suffix: { ru: ' (коробка)', uz: ' (karobka)', en: ' (box)' } },
    { id: '244', expected: 'Валик 38', suffix: { ru: ' (мешок)', uz: ' (qop)', en: ' (bag)' } },
    { id: '250', expected: 'Валик 38', suffix: { ru: ' (коробка)', uz: ' (karobka)', en: ' (box)' } },
];

async function run() {
    if (!db) {
        console.error('❌ DB ulanmagan.');
        process.exit(1);
    }
    let updated = 0;
    for (const { id, expected, suffix } of TARGETS) {
        const ref = db.collection('products').doc(id);
        const snap = await ref.get();
        if (!snap.exists) { console.log(`⚠️  ${id} topilmadi.`); continue; }
        const name = snap.data().name || {};
        if (name.ru !== expected) {
            console.log(`⚠️  ${id}: nom mos kelmadi (kutilgan "${expected}", bazada "${name.ru}") — o'tkazib yuborildi.`);
            continue;
        }
        const updates = {};
        for (const lang of ['ru', 'uz', 'en']) {
            if (name[lang]) updates[`name.${lang}`] = name[lang] + suffix[lang];
        }
        await ref.update(updates);
        console.log(`✅ ${id}: "${name.ru}" -> "${updates['name.ru']}"`);
        updated++;
    }
    console.log(`\nTayyor: ${updated}/${TARGETS.length} nom aniqlashtirildi.`);
    process.exit(0);
}

run().catch((err) => {
    console.error('❌ Xato:', err);
    process.exit(1);
});
