// Bir martalik skript: "new" papkasidagi qolgan 20 ta Valik rasmini
// mos mahsulotlarga yozadi. Bularning aksariyati hozircha bir nechta
// (10-20 tagacha) turli mahsulot o'rtasida baham ko'rilgan umumiy/xato
// rasmga ega edi ("10-4.jpg", "oscar-Deluxe.jpg" va h.k.) — bu yerda
// har biriga o'ziga xos aniq rasm yoziladi.
//
// Xavfsizlik: har bir yozishdan oldin mahsulot nomi kutilgan nom bilan
// solishtiriladi, mos kelmasa o'tkazib yuboriladi.
//
// Ishga tushirish (Railway Console'da, shu servis muhitida):
//   node scripts/updateValikImages2.js
const { db } = require('../config/firebase');

const TARGETS = [
    { id: '371', expected: 'PRO валик Асос', url: 'https://i.ibb.co/ZpkQK7fk/PRO.png' },
    { id: '246', expected: 'Валик 22 (набор х 5)', url: 'https://i.ibb.co/CKf0dRFT/22x5.jpg' },
    { id: '257', expected: 'Валик 38 Deluxe', url: 'https://i.ibb.co/FktK0Mkp/38-Deluxe.png' },
    { id: '256', expected: 'Валик 44 Deluxe', url: 'https://i.ibb.co/27XgcHFZ/44-Deluxe.png' },
    { id: '255', expected: 'Валик 55 Deluxe', url: 'https://i.ibb.co/Vh95LPz/55-Deluxe.jpg' },
    { id: '253', expected: 'Валик 64 Deluxe сочиқ (NEW type)', url: 'https://i.ibb.co/whMRqZr5/64-Deluxe-NEW-type.jpg' },
    { id: '254', expected: 'Валик 64 Deluxe', url: 'https://i.ibb.co/LX6vGzKX/64-Deluxe.jpg' },
    { id: '266', expected: 'Валик губка 12мм (белый)', url: 'https://i.ibb.co/hFvRJYCV/12.jpg' },
    { id: '267', expected: 'Валик губка 44мм (белый)', url: 'https://i.ibb.co/j9KT4hPM/44.jpg' },
    { id: '259', expected: 'Валик для Обоев', url: 'https://i.ibb.co/WptZgZFh/image.jpg' },
    { id: '260', expected: 'Валик для Углов', url: 'https://i.ibb.co/HLVkjWTm/image.jpg' },
    { id: '264', expected: 'Валик для гидроизоляции 12мм', url: 'https://i.ibb.co/xSkSmmbX/12.jpg' },
    { id: '265', expected: 'Валик для гидроизоляции 38мм', url: 'https://i.ibb.co/vxKw2Yk4/38.jpg' },
    { id: '263', expected: 'Валик для лака 22мм', url: 'https://i.ibb.co/B2Byy1R4/22.jpg' },
    { id: '262', expected: 'Валик для лака 44мм', url: 'https://i.ibb.co/3YLWDvdg/44.png' },
    { id: '261', expected: 'Валик для шпаклевки 44мм', url: 'https://i.ibb.co/cKP6TKF7/44.png' },
    { id: '268', expected: 'Валик малярный 12мм', url: 'https://i.ibb.co/zhCv2N2H/12.jpg' },
    { id: '272', expected: 'Валик мехли 50см', url: 'https://i.ibb.co/zVVzH4ss/50.png' },
    { id: '271', expected: 'Валик тикон 50см', url: 'https://i.ibb.co/YF9HmGSd/50.png' },
    { id: '790', expected: 'Валик фасадный (SPONGE сариқ)', url: 'https://i.ibb.co/jvK7pcDS/SPONGE.png' },
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
