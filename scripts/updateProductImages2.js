// Bir martalik skript: aniq rangi ko'rinadigan Duafix aerozol guruh
// fotosini (169.jpg, barcha 6 rang bitta suratda) mos keladigan 5 ta
// mahsulotga yozadi. "23 Scarlet" rangi hozirgi 15 ta DUAFIX kodida
// yo'q, shuning uchun kiritilmagan.
//
// Ishga tushirish (Railway Console'da, shu servis muhitida):
//   node scripts/updateProductImages2.js
const { db } = require('../config/firebase');

const IMAGE_URL = 'https://i.ibb.co/S7v2D54q/169.jpg';

const TARGETS = {
    '433': '35 Аэрозоль gold DUAFIX',
    '439': '21 Аэрозоль голубая средная DUAFIX', // Medium Blue
    '444': '41 Аэрозоль желтая DUAFIX', // Yellow
    '445': '43 Аэрозоль белая крем DUAFIX', // Cream White
    '446': '672 Аэрозоль оранжевая DUAFIX', // Engineering Orange Red
};

async function run() {
    if (!db) {
        console.error('❌ DB ulanmagan.');
        process.exit(1);
    }
    let updated = 0;
    for (const [id, expectedName] of Object.entries(TARGETS)) {
        const ref = db.collection('products').doc(id);
        const snap = await ref.get();
        if (!snap.exists) {
            console.log(`⚠️  ${id} topilmadi.`);
            continue;
        }
        const actualRu = (snap.data().name && snap.data().name.ru) || '';
        if (actualRu !== expectedName) {
            console.log(`⚠️  ${id}: nom mos kelmadi (kutilgan "${expectedName}", bazada "${actualRu}") — o'tkazib yuborildi.`);
            continue;
        }
        await ref.update({ image: IMAGE_URL });
        console.log(`✅ ${id} (${actualRu}) -> ${IMAGE_URL}`);
        updated++;
    }
    console.log(`\nTayyor: ${updated}/${Object.keys(TARGETS).length} yangilandi.`);
    process.exit(0);
}

run().catch((err) => {
    console.error('❌ Xato:', err);
    process.exit(1);
});
