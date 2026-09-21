// O'CHIRADI — Oyatillo'ni (Telegram ID 5019943928, bot_admins'ga
// botning o'zidan qo'shilgan dinamik admin) admin ro'yxatidan chiqaradi.
// Foydalanuvchi tasdiqladi: bot_admins'dagi yagona dinamik admin shu ID.
//
// Ishga tushirish (Railway Console'da, oscar-admin-bot muhitida):
//   node scripts/removeOyatilloAdmin.js
const { db } = require('../config/firebase');

const ADMIN_ID = '5019943928';

async function main() {
    const docRef = db.collection('bot_admins').doc(ADMIN_ID);
    const doc = await docRef.get();
    if (!doc.exists) {
        console.log(`⚠️ bot_admins/${ADMIN_ID} topilmadi — allaqachon o'chirilgan bo'lishi mumkin.`);
        process.exit(0);
    }
    await docRef.delete();
    console.log(`✅ O'chirildi: bot_admins/${ADMIN_ID} (Oyatillo)`);
    console.log('\nTayyor. Bot qayta ishga tushirilmasa ham, u endi admin buyruqlaridan foydalana olmaydi.');
    process.exit(0);
}

main().catch((err) => {
    console.error('Xato:', err);
    process.exit(1);
});
