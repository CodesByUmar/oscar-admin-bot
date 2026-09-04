// Bir martalik skript: "Валик 64/55/44/38" har biri bazada 3 marta
// takrorlangan (bir xil nom, turli ID). Avval faqat bo'sh turgan
// nusxasiga (768-771) rasm yozilgan edi, lekin admin botda boshqa
// nusxalar (241-244, 247-250) ko'rinib, ular hali eski umumiy rasmda
// qolganini ko'rsatdi. Endi barcha nusxalarga bir xil to'g'ri rasm
// yoziladi — mijoz/qaysi yozuvni ko'rishidan qat'iy nazar to'g'ri
// rasm chiqishi uchun.
//
// Ishga tushirish (Railway Console'da, shu servis muhitida):
//   node scripts/updateValikDuplicates.js
const { db } = require('../config/firebase');

const TARGETS = [
    { id: '241', expected: 'Валик 64', url: 'https://i.ibb.co/sJ3xRLn5/64.png' },
    { id: '247', expected: 'Валик 64', url: 'https://i.ibb.co/sJ3xRLn5/64.png' },
    { id: '242', expected: 'Валик 55', url: 'https://i.ibb.co/LXkcS2rP/55.png' },
    { id: '248', expected: 'Валик 55', url: 'https://i.ibb.co/LXkcS2rP/55.png' },
    { id: '243', expected: 'Валик 44', url: 'https://i.ibb.co/7xQGL5Yb/44.png' },
    { id: '249', expected: 'Валик 44', url: 'https://i.ibb.co/7xQGL5Yb/44.png' },
    { id: '244', expected: 'Валик 38', url: 'https://i.ibb.co/V02F7D6w/38.jpg' },
    { id: '250', expected: 'Валик 38', url: 'https://i.ibb.co/V02F7D6w/38.jpg' },
    // "22 (набор х 3)" uchun alohida rasm topilmagani uchun, foydalanuvchi
    // ko'rsatmasiga ko'ra "22 (набор х 5)" rasmi ishlatiladi (ikkalasi ham
    // bir xil turdagi to'plam, faqat soni farq qiladi).
    { id: '252', expected: 'Валик 22 (набор х 3)', url: 'https://i.ibb.co/CKf0dRFT/22x5.jpg' },
    { id: '773', expected: 'Валик 22 (набор х 3)', url: 'https://i.ibb.co/CKf0dRFT/22x5.jpg' },
    // "Валик фасадный" ikkinchi nusxasi (birinchisiga — 790 — avvalroq yozilgan edi).
    { id: '269', expected: 'Валик фасадный (SPONGE сариқ)', url: 'https://i.ibb.co/jvK7pcDS/SPONGE.png' },
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
