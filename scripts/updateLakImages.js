// Bir martalik skript: "ЛАК 0,8 ж/б", "Лак Оскар Яхт. 0,8/2,5 ж/б",
// "Лак Экстра 2,5 ж/б" — har biri bazada 2 marta takrorlangan
// (dublikat). Barcha 8 ta nusxaga bitta umumiy Lak butilkasi rasmi
// yoziladi (alohida rasm hali yo'q).
//
// Ishga tushirish (Railway Console'da, shu servis muhitida):
//   node scripts/updateLakImages.js
const { db } = require('../config/firebase');

const IMAGE_URL = 'https://i.ibb.co/pvLQPfXY/lak.png';

const TARGETS = [
    { id: '68', expected: 'ЛАК 0,8 ж/б' },
    { id: '589', expected: 'ЛАК 0,8 ж/б' },
    { id: '69', expected: 'Лак Оскар Яхт. 0,8 ж/б' },
    { id: '590', expected: 'Лак Оскар Яхт. 0,8 ж/б' },
    { id: '70', expected: 'Лак Оскар Яхт. 2,5 ж/б' },
    { id: '591', expected: 'Лак Оскар Яхт. 2,5 ж/б' },
    { id: '71', expected: 'Лак Экстра 2,5 ж/б' },
    { id: '592', expected: 'Лак Экстра 2,5 ж/б' },
];

async function run() {
    if (!db) {
        console.error('❌ DB ulanmagan.');
        process.exit(1);
    }
    let updated = 0;
    for (const { id, expected } of TARGETS) {
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
        await ref.update({ image: IMAGE_URL });
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
