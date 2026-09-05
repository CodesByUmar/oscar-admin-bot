// Bir martalik skript: bazada umuman rasmsiz qolgan oxirgi 6 ta mahsulotga
// rasm qo'yiladi (Клей МДФ DUAFIX 3 o'lcham, Бутан газ Асос, Клей DAYSON
// серый, Эмаль Нитро 0.8кг темно-синяя).
//
// Xavfsizlik: har bir yozishdan oldin mahsulot nomi kutilgan nom bilan
// solishtiriladi, mos kelmasa o'tkazib yuboriladi.
//
// Ishga tushirish (Railway Console'da, shu servis muhitida):
//   node scripts/updateMissingImages.js
const { db } = require('../config/firebase');

const TARGETS = [
    { id: '197', expected: 'Клей МДФ DUAFIX 500мл', url: 'https://i.ibb.co/gZm3HLXD/DUAFIX-500.jpg' },
    { id: '198', expected: 'Клей МДФ DUAFIX 400мл', url: 'https://i.ibb.co/c7XMCyT/DUAFIX-400.jpg' },
    { id: '199', expected: 'Клей МДФ DUAFIX 200мл', url: 'https://i.ibb.co/zVQ6YNYG/DUAFIX-200.jpg' },
    { id: '331', expected: 'Бутан газ Асос', url: 'https://i.ibb.co/NgZTY95z/image.jpg' },
    { id: '424', expected: 'Клей DAYSON серый', url: 'https://i.ibb.co/cHSx787/DAYSON.png' },
    { id: '950', expected: 'Эмаль Нитро 0.8кг темно-синяя (баклажка)', url: 'https://i.ibb.co/LF3ZfSB/0-8.png' },
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
