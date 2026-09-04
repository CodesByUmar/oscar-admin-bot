// Bir martalik skript: "Валик 64/55/44/38/22" nomli mahsulotlarning
// rasmini yozadi. MUHIM: har bir o'lcham (64,55,44,38) uchun bazada 3
// tadan bir xil nomli dublikat topildi — ikkitasida umumiy/noto'g'ri
// rasm allaqachon bor, faqat bittasi (quyidagi ID'lar) butunlay bo'sh
// edi. Xavfsizlik uchun FAQAT o'sha bo'sh turgan yozuvlarga yangi aniq
// rasm qo'yiladi; mavjud (garchi noto'g'ri bo'lsa ham) rasmli
// dublikatlarga tegilmaydi — dublikatlarni tozalash alohida qaror.
// "Валик 22" uchun bazada faqat bitta yozuv bor edi (umumiy rasm bilan),
// shuning uchun aniq o'lchamli rasm bilan almashtirildi.
//
// Ishga tushirish (Railway Console'da, shu servis muhitida):
//   node scripts/updateValikImages.js
const { db } = require('../config/firebase');

const TARGETS = [
    { id: '768', expected: 'Валик 64', url: 'https://i.ibb.co/sJ3xRLn5/64.png' },
    { id: '769', expected: 'Валик 55', url: 'https://i.ibb.co/LXkcS2rP/55.png' },
    { id: '770', expected: 'Валик 44', url: 'https://i.ibb.co/7xQGL5Yb/44.png' },
    { id: '771', expected: 'Валик 38', url: 'https://i.ibb.co/V02F7D6w/38.jpg' },
    { id: '245', expected: 'Валик 22', url: 'https://i.ibb.co/67nCKbv5/22.jpg' },
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
        console.log(`✅ ${id} (${actualRu}) -> ${url}`);
        updated++;
    }
    console.log(`\nTayyor: ${updated}/${TARGETS.length} yangilandi.`);
    process.exit(0);
}

run().catch((err) => {
    console.error('❌ Xato:', err);
    process.exit(1);
});
