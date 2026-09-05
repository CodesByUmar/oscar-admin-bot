// Bir martalik skript: "Эмаль Нитро ... 20кг" (7 ta rang) uchun
// foydalanuvchi ko'rsatmasiga ko'ra, mavjud rangga xos rasmlar o'rniga
// "new" papkadagi umumiy Oscar Нитра idish rasmi qo'yiladi (foydalanuvchi
// oldindan ogohlantirilgan, lekin baribir shu rasmni qo'yishni tasdiqladi).
//
// Ishga tushirish (Railway Console'da, shu servis muhitida):
//   node scripts/updateNitro20kg.js
const { db } = require('../config/firebase');

const NITRO_IMAGE = 'https://i.ibb.co/LF3ZfSB/0-8.png';

const TARGETS = [
    { id: '395', expected: 'Эмаль Нитро белая 20кг' },
    { id: '396', expected: 'Эмаль Нитро желтая 20кг' },
    { id: '397', expected: 'Эмаль Нитро зелёная 20кг' },
    { id: '398', expected: 'Эмаль Нитро красная 20кг' },
    { id: '399', expected: 'Эмаль Нитро серая 20кг' },
    { id: '400', expected: 'Эмаль Нитро черная 20кг' },
    { id: '401', expected: 'Эмаль Нитро темно-синяя 20кг' },
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
        await ref.update({ image: NITRO_IMAGE });
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
