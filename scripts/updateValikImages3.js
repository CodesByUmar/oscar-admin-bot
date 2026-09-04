// Bir martalik skript:
// - "Валик 38 (Лак)" (251) — alohida rasm topilmagani uchun "Валик для
//   лака 44мм" rasmi bilan bir xil qilib qo'yiladi.
// - "PRO валик" (270) — "PRO валик Асос" (371) allaqachon olgan OSCAR
//   brendli rasm bilan bir xil (foydalanuvchi ikkalasiga ham shu
//   rasmni xohladi).
//
// Ishga tushirish (Railway Console'da, shu servis muhitida):
//   node scripts/updateValikImages3.js
const { db } = require('../config/firebase');

const TARGETS = [
    { id: '251', expected: 'Валик 38 (Лак)', url: 'https://i.ibb.co/3YLWDvdg/44.png' },
    { id: '270', expected: 'PRO валик', url: 'https://i.ibb.co/ZpkQK7fk/PRO.png' },
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
