// Bir martalik skript: "Валик маленький/большой (для наливного пола)"
// ikkalasi bir xil umumiy (noaniq) rasmni bo'lishar edi, endi har biri
// o'ziga xos (ignali/tikanli) rasmga ega bo'ladi.
//
// Ishga tushirish (Railway Console'da, shu servis muhitida):
//   node scripts/updateValikNalivnoy.js
const { db } = require('../config/firebase');

const TARGETS = [
    { id: '486', expected: 'Валик маленький (для наливного пола)', url: 'https://i.ibb.co/gZx5MJS7/image.jpg' },
    { id: '485', expected: 'Валик большой (для наливного пола)', url: 'https://i.ibb.co/xqfBkBJK/image.png' },
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
