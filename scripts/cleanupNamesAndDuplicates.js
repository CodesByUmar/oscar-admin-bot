// Bir martalik skript — 3 xil tozalash. Foydalanuvchi tasdig'i bilan
// (dublikatlarni o'chirish qismi alohida so'ralib, tasdiqlangan):
//
// 1) RAQAM PREFIKSINI OLIB TASHLASH — "35 Аэрозоль gold DUAFIX",
//    "01 Фуга Дуафикс 2х Bright and white" kabi nomlar boshida turgan
//    ichki katalog raqami mijoz uchun keraksiz — ru/uz/en barchasidan
//    olib tashlanadi.
//
// 2) IMLO XATOSINI TUZATISH (dublikat YO'Q joylarda) — "двустронний"/
//    "двустронный" (harf tushib qolgan, to'g'risi "двусторонний")
//    — bu o'lchamlar uchun boshqa nusxa yo'q, shuning uchun faqat nom
//    tuzatiladi, hech narsa o'chirilmaydi.
//
// 3) DUBLIKATNI O'CHIRISH — "SACA двустронный скотч" (352-358) va
//    "Двустронная тканевая лента" (369-370) — bularning har biri
//    xuddi shu o'lchamdagi TO'G'RI yozilgan nusxasiga ega (mos ravishda
//    138-144 va 155-156), demak bular — import paytida yuzaga kelgan
//    aniq dublikatlar. Rasm fayllari solishtirilib tekshirildi (352-358
//    138-144 bilan bir xil rasmni bo'lishadi — hech narsa yo'qolmaydi).
//
// Ishga tushirish (Railway Console'da, shu servis muhitida):
//   node scripts/cleanupNamesAndDuplicates.js
const { db } = require('../config/firebase');

const STRIP_NUMBER_IDS = [
    // Аэрозоль ... DUAFIX
    '433', '434', '435', '436', '437', '438', '439', '440', '441', '442', '443', '444', '445', '446', '447',
    // NN Фуга Дуафикс 2х ...
    '210', '211', '212', '213', '214', '215', '216', '217', '218', '219',
    '220', '221', '222', '223', '224', '225', '226', '227', '228', '229',
];

const TYPO_FIX_IDS = [
    '348', '350', '351', // Двустронний скотч -> Двусторонний скотч
    '359', '360', '361', '362', '363', '364', '365', '366', '367', '368', // М3 двустронный -> двусторонний
];

const DELETE_IDS = [
    '369', '370', // Двустронная тканевая лента (dublikat: 155, 156)
    '352', '353', '354', '355', '356', '357', '358', // SACA двустронный скотч (dublikat: 138-144)
];

const NUM_PREFIX_RE = /^\d+\s+/;

function fixTypo(str) {
    return str
        .replace(/Двустронний/g, 'Двусторонний')
        .replace(/двустронний/g, 'двусторонний')
        .replace(/Двустронный/g, 'Двусторонний')
        .replace(/двустронный/g, 'двусторонний')
        .replace(/Двустронная/g, 'Двусторонняя')
        .replace(/двустронная/g, 'двусторонняя');
}

async function run() {
    if (!db) {
        console.error('❌ DB ulanmagan.');
        process.exit(1);
    }

    let renamed = 0, typofixed = 0, deleted = 0;

    console.log('\n--- 1) Raqam prefiksini olib tashlash ---');
    for (const id of STRIP_NUMBER_IDS) {
        const ref = db.collection('products').doc(id);
        const snap = await ref.get();
        if (!snap.exists) { console.log(`⚠️  ${id} topilmadi.`); continue; }
        const name = snap.data().name || {};
        if (typeof name !== 'object' || !NUM_PREFIX_RE.test(name.ru || '')) {
            console.log(`⚠️  ${id}: raqam prefiksi kutilmagan (bazada "${name.ru}") — o'tkazib yuborildi.`);
            continue;
        }
        const updates = {};
        for (const lang of ['ru', 'uz', 'en']) {
            if (name[lang]) updates[`name.${lang}`] = name[lang].replace(NUM_PREFIX_RE, '');
        }
        await ref.update(updates);
        console.log(`✅ ${id}: "${name.ru}" -> "${updates['name.ru']}"`);
        renamed++;
    }

    console.log("\n--- 2) Imlo xatosini tuzatish ---");
    for (const id of TYPO_FIX_IDS) {
        const ref = db.collection('products').doc(id);
        const snap = await ref.get();
        if (!snap.exists) { console.log(`⚠️  ${id} topilmadi.`); continue; }
        const ru = (snap.data().name && snap.data().name.ru) || '';
        const fixed = fixTypo(ru);
        if (fixed === ru) {
            console.log(`⚠️  ${id}: xato so'z topilmadi (bazada "${ru}") — o'tkazib yuborildi.`);
            continue;
        }
        await ref.update({ 'name.ru': fixed });
        console.log(`✅ ${id}: "${ru}" -> "${fixed}"`);
        typofixed++;
    }

    console.log("\n--- 3) Dublikatlarni o'chirish (foydalanuvchi tasdiqlagan) ---");
    for (const id of DELETE_IDS) {
        const ref = db.collection('products').doc(id);
        const snap = await ref.get();
        if (!snap.exists) { console.log(`⚠️  ${id} topilmadi (allaqachon o'chirilgan?).`); continue; }
        const ru = (snap.data().name && snap.data().name.ru) || '';
        if (!/двустронн/i.test(ru)) {
            console.log(`⚠️  ${id}: kutilmagan nom ("${ru}") — xavfsizlik uchun o'chirilmadi.`);
            continue;
        }
        await ref.delete();
        console.log(`🗑  ${id} o'chirildi ("${ru}")`);
        deleted++;
    }

    console.log(`\nTayyor: ${renamed}/${STRIP_NUMBER_IDS.length} nom tuzatildi (raqam), ${typofixed}/${TYPO_FIX_IDS.length} nom tuzatildi (imlo), ${deleted}/${DELETE_IDS.length} dublikat o'chirildi.`);
    process.exit(0);
}

run().catch((err) => {
    console.error('❌ Xato:', err);
    process.exit(1);
});
