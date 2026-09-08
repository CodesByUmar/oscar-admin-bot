// Bir martalik skript: 3 ta do'konning boshlang'ich telefon raqamlarini
// `storeContacts` kolleksiyasiga yozadi (oscar-ui'ning Call Center oynasi
// va bot orqali tahrirlash shu kolleksiyani ishlatadi). Telegram username'lar
// hali kiritilmagan — keyinroq bot orqali ("🏪 Do'kon kontaktlari") qo'shiladi.
// Mavjud hujjatlarga tegmaydi (merge: true) — qayta ishga tushirish xavfsiz.
//
// Ishga tushirish (Railway Console'da, shu servis muhitida):
//   node scripts/seedStoreContacts.js
const { db, admin } = require('../config/firebase');

// lat/lng — Manzil sahifasida xarita va Yandex Navigator yo'nalishi uchun
// (150-151 OSCAR va 10-36 X-TRA — O'rikzor bozori "Stroy gorod" qismida,
// bitta nuqtada; SHOWROOM — Original Colormix LLC, alohida manzil).
const STORES = [
    { id: 'oscar_150', name: '150-151 OSCAR', phone: '+998900471150', order: 1, lat: 41.2866446, lng: 69.1498683 },
    { id: 'xtra_1036', name: '10-36 X-TRA', phone: '+998774441036', order: 2, lat: 41.2866446, lng: 69.1498683 },
    { id: 'showroom', name: 'SHOWROOM', phone: '+998981110809', order: 3, lat: 41.3485214, lng: 69.1588695 },
];

async function main() {
    for (const store of STORES) {
        const { id, ...fields } = store;
        await db.collection('storeContacts').doc(id).set(
            { ...fields, updatedAt: admin.firestore.FieldValue.serverTimestamp() },
            { merge: true }
        );
        console.log(`✅ ${id} (${fields.name}) — ${fields.phone}`);
    }
    console.log('Tayyor.');
    process.exit(0);
}

main().catch((err) => {
    console.error('Xato:', err);
    process.exit(1);
});
