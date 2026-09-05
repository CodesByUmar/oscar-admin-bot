// Bir martalik skript: "Каустическая сода" — avval 3 o'lcham (150/350/750гр)
// bitta umumiy rasmni bo'lishar edi, endi har biri o'ziga xos o'lcham
// yozilgan rasmga ega bo'ladi.
//
// Ishga tushirish (Railway Console'da, shu servis muhitida):
//   node scripts/updateSodaSizes.js
const { db } = require('../config/firebase');

const TARGETS = [
    { id: '487', expected: 'Каустическая сода 150гр', url: 'https://i.ibb.co/jk82pFPF/150.png' },
    { id: '488', expected: 'Каустическая сода 350гр', url: 'https://i.ibb.co/FbhTtg8p/350.png' },
    { id: '489', expected: 'Каустическая сода 750гр', url: 'https://i.ibb.co/Kj2T16nS/750.png' },
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
