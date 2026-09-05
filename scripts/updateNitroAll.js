// Bir martalik skript: "Эмаль Нитро" oilasining qolgan barcha o'lcham/rang
// guruhlariga foydalanuvchi ko'rsatgan umumiy rasmlarni qo'yadi:
// - 20кг (7 rang) — yangi Oscar Нитра 20кг idish rasmi
// - 2кг ж/б (6 rang) — yangi Oscar Нитра 2кг banka rasmi
// - 0.85кг ж/б (5 rang) — 0.8кг bilan bir xil rasm (foydalanuvchi ko'rsatmasi)
// - 0.8кг baklajka (7 rang) — mavjud Oscar Нитра baklajka rasmi
//
// Ishga tushirish (Railway Console'da, shu servis muhitida):
//   node scripts/updateNitroAll.js
const { db } = require('../config/firebase');

const NITRO_20 = 'https://i.ibb.co/GQSWdDSd/20.png';
const NITRO_2KG = 'https://i.ibb.co/RTRJWdqK/2.png';
const NITRO_08 = 'https://i.ibb.co/LF3ZfSB/0-8.png';

const TARGETS = [
    { id: '395', expected: 'Эмаль Нитро белая 20кг', url: NITRO_20 },
    { id: '396', expected: 'Эмаль Нитро желтая 20кг', url: NITRO_20 },
    { id: '397', expected: 'Эмаль Нитро зелёная 20кг', url: NITRO_20 },
    { id: '398', expected: 'Эмаль Нитро красная 20кг', url: NITRO_20 },
    { id: '399', expected: 'Эмаль Нитро серая 20кг', url: NITRO_20 },
    { id: '400', expected: 'Эмаль Нитро черная 20кг', url: NITRO_20 },
    { id: '401', expected: 'Эмаль Нитро темно-синяя 20кг', url: NITRO_20 },
    { id: '453', expected: 'Эмаль Нитро белая 2кг (ж/б)', url: NITRO_2KG },
    { id: '454', expected: 'Эмаль Нитро зелёная 2кг (ж/б)', url: NITRO_2KG },
    { id: '455', expected: 'Эмаль Нитро красная 2кг (ж/б)', url: NITRO_2KG },
    { id: '456', expected: 'Эмаль Нитро серая 2кг (ж/б)', url: NITRO_2KG },
    { id: '457', expected: 'Эмаль Нитро темно-синяя 2кг (ж/б)', url: NITRO_2KG },
    { id: '458', expected: 'Эмаль Нитро черная 2кг (ж/б)', url: NITRO_2KG },
    { id: '459', expected: 'Эмаль Нитро белая 0.85кг (ж/б)', url: NITRO_08 },
    { id: '460', expected: 'Эмаль Нитро зелёная 0.85кг (ж/б)', url: NITRO_08 },
    { id: '461', expected: 'Эмаль Нитро красная 0.85кг (ж/б)', url: NITRO_08 },
    { id: '462', expected: 'Эмаль Нитро серая 0.85кг (ж/б)', url: NITRO_08 },
    { id: '463', expected: 'Эмаль Нитро черная 0.85кг (ж/б)', url: NITRO_08 },
    { id: '464', expected: 'Эмаль Нитро 0.8кг белая (баклажка)', url: NITRO_08 },
    { id: '465', expected: 'Эмаль Нитро 0.8кг желтая (баклажка)', url: NITRO_08 },
    { id: '466', expected: 'Эмаль Нитро 0.8кг зелёная (баклажка)', url: NITRO_08 },
    { id: '467', expected: 'Эмаль Нитро 0.8кг красная (баклажка)', url: NITRO_08 },
    { id: '468', expected: 'Эмаль Нитро 0.8кг серая (баклажка)', url: NITRO_08 },
    { id: '469', expected: 'Эмаль Нитро 0.8кг черная (баклажка)', url: NITRO_08 },
    { id: '470', expected: 'Эмаль Нитро 0.8кг чоко (баклажка)', url: NITRO_08 },
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
