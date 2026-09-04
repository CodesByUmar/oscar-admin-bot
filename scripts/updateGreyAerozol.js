// Bir martalik skript: "Аэрозоль термостойкая серая" (324) hali
// umuman rasmsiz edi. Foydalanuvchi ko'rsatmasiga ko'ra, hozircha
// (aniq kulrang rasm topilguncha) Duafix 6-rang guruh fotosi vaqtincha
// qo'yiladi.
//
// Ishga tushirish (Railway Console'da, shu servis muhitida):
//   node scripts/updateGreyAerozol.js
const { db } = require('../config/firebase');

const TARGET = { id: '324', expected: 'Аэрозоль термостойкая серая', url: 'https://i.ibb.co/S7v2D54q/169.jpg' };

async function run() {
    if (!db) {
        console.error('❌ DB ulanmagan.');
        process.exit(1);
    }
    const ref = db.collection('products').doc(TARGET.id);
    const snap = await ref.get();
    if (!snap.exists) {
        console.log(`⚠️  ${TARGET.id} topilmadi.`);
        process.exit(0);
    }
    const actualRu = (snap.data().name && snap.data().name.ru) || '';
    if (actualRu !== TARGET.expected) {
        console.log(`⚠️  nom mos kelmadi (kutilgan "${TARGET.expected}", bazada "${actualRu}") — o'tkazib yuborildi.`);
        process.exit(0);
    }
    await ref.update({ image: TARGET.url });
    console.log(`✅ ${TARGET.id} (${actualRu})`);
    process.exit(0);
}

run().catch((err) => {
    console.error('❌ Xato:', err);
    process.exit(1);
});
