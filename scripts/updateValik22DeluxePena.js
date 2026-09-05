// Bir martalik skript:
// - "Валик 22 Deluxe" (258) — eski rasm 38мм o'lchamli valikni ko'rsatib
//   turgan edi (xato), endi to'g'ri 22мм rasm qo'yiladi.
// - "Пена клей Асос 1.0кг" (423) — eski rasm butunlay boshqa mahsulot
//   ("Eurolux ПВА клей") edi, endi to'g'ri ASOS "Клей-Пена" rasmi qo'yiladi.
//
// Ishga tushirish (Railway Console'da, shu servis muhitida):
//   node scripts/updateValik22DeluxePena.js
const { db } = require('../config/firebase');

const TARGETS = [
    { id: '258', expected: 'Валик 22 Deluxe', url: 'https://i.ibb.co/C59JN6hj/22-Deluxe.png' },
    { id: '423', expected: 'Пена клей Асос 1.0кг', url: 'https://i.ibb.co/sJjDs438/1-0.jpg' },
];

async function run() {
    if (!db) {
        console.error('❌ DB ulanmagan.');
        process.exit(1);
    }
    let updated = 0;
    for (const { id, expected, url } of TARGETS) {
        const ref = db.collection('products').doc(id);
        const snap = await ref.get();
        if (!snap.exists) {
            console.log(`⚠️  ${id} topilmadi.`);
            continue;
        }
        const actualRu = (snap.data().name && snap.data().name.ru) || '';
        if (actualRu !== expected) {
            console.log(`⚠️  ${id}: nom mos kelmadi (kutilgan "${expected}", bazada "${actualRu}") — o'tkazib yuborildi.`);
            continue;
        }
        await ref.update({ image: url });
        console.log(`✅ ${id} (${actualRu})`);
        updated++;
    }
    console.log(`\nTayyor: ${updated}/${TARGETS.length} yangilandi.`);
    process.exit(0);
}

run().catch((err) => {
    console.error('❌ Xato:', err);
    process.exit(1);
});
