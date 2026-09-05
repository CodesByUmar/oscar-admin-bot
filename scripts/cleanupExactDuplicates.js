// Bir martalik skript — foydalanuvchi tasdiqlagan aniq dublikatlarni
// (bir xil nom VA bir xil kategoriya) o'chirish. Har biri qoladigan
// nusxa bilan solishtirilib, rasm mos yoki to'g'irlanganidan keyin
// o'chiriladi:
// - Валик 64/55/44/38/22(х3) "коробка" dublikatlari — asl nusxa: 247,248,249,250,252
// - Решетка для валиков — asl nusxa: 232
// - Валик фасадный (SPONGE) — asl nusxa: 269
// - ЛАК (4 xil nom) dublikatlari — asl nusxa: 68,69,70,71
// - Серпянка 1м х 10м (5х5мм) — ID 205'ning rasmi XATO edi ("Серпянка 90"
//   rasmi), ID 726'niki TO'G'RI (haqiqiy 1m x 10m rulon) — shuning uchun
//   726 EMAS, 205 o'chiriladi.
// - Аэрозоль silver DUAFIX — foydalanuvchi tasdiqladi: bitta mahsulot,
//   441 o'chiriladi, 434 qoladi.
//
// Ishga tushirish (Railway Console'da, shu servis muhitida):
//   node scripts/cleanupExactDuplicates.js
const { db } = require('../config/firebase');

const TARGETS = [
    { id: '768', expected: 'Валик 64' },
    { id: '769', expected: 'Валик 55' },
    { id: '770', expected: 'Валик 44' },
    { id: '771', expected: 'Валик 38' },
    { id: '773', expected: 'Валик 22 (набор х 3)' },
    { id: '753', expected: 'Решетка для валиков' },
    { id: '790', expected: 'Валик фасадный (SPONGE сариқ)' },
    { id: '589', expected: 'ЛАК 0,8 ж/б' },
    { id: '590', expected: 'Лак Оскар Яхт. 0,8 ж/б' },
    { id: '591', expected: 'Лак Оскар Яхт. 2,5 ж/б' },
    { id: '592', expected: 'Лак Экстра 2,5 ж/б' },
    { id: '205', expected: 'Серпянка 1м х 10м (5 х 5мм)' },
    { id: '441', expected: 'Аэрозоль silver DUAFIX' },
];

async function run() {
    if (!db) {
        console.error('❌ DB ulanmagan.');
        process.exit(1);
    }
    let deleted = 0;
    for (const { id, expected } of TARGETS) {
        const ref = db.collection('products').doc(id);
        const snap = await ref.get();
        if (!snap.exists) { console.log(`⚠️  ${id} topilmadi (allaqachon o'chirilgan?).`); continue; }
        const ru = (snap.data().name && snap.data().name.ru) || '';
        if (ru !== expected) {
            console.log(`⚠️  ${id}: nom mos kelmadi (kutilgan "${expected}", bazada "${ru}") — xavfsizlik uchun o'chirilmadi.`);
            continue;
        }
        await ref.delete();
        console.log(`🗑  ${id} o'chirildi ("${ru}")`);
        deleted++;
    }
    console.log(`\nTayyor: ${deleted}/${TARGETS.length} dublikat o'chirildi.`);
    process.exit(0);
}

run().catch((err) => {
    console.error('❌ Xato:', err);
    process.exit(1);
});
