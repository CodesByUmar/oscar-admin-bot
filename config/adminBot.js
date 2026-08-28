const TelegramBot = require('node-telegram-bot-api');
const { silenceUnhandledRejections } = require('../utils/botErrorLogging');
const { db } = require('./firebase');

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const admins = (process.env.ADMIN_IDS || '').split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));

// Ikki darajali ruxsat: barcha ADMIN_IDS botdan foydalana oladi, lekin
// faqat SUPER_ADMIN_IDS'dagilar xavfli/muhim amallarni (o'chirish, VIP,
// buyurtma tasdiqlash, USD kurs, statistika) bajara oladi. SUPER_ADMIN_IDS
// sozlanmagan bo'lsa — orqaga moslik uchun hammasi super admin hisoblanadi.
const superAdminIdsRaw = process.env.SUPER_ADMIN_IDS;
const superAdmins = superAdminIdsRaw
    ? superAdminIdsRaw.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id))
    : admins;

const bot = new TelegramBot(TOKEN, { polling: true });

bot.on('polling_error', (error) => {
    console.error('adminBot polling xatosi:', error.code, error.message);
});

silenceUnhandledRejections(bot, 'adminBot');

// Railway'ga kirmasdan, botning o'zidan admin qo'shish uchun: qo'shimcha
// adminlar ADMIN_IDS'dan tashqari Firestore'ning bot_admins collection'ida
// saqlanadi. Ishga tushishda shu yerdan yuklanadi, qo'shilganda esa
// bir vaqtning o'zida ham shu yerga, ham operativ xotiradagi `admins`
// massiviga (restart shart bo'lmasin deb) yoziladi.
//
// MUHIM: `admins` massivi shu yerda push() bilan TO'LDIRILADI, qayta
// yaratilmaydi — chunki boshqa fayllar buni destructuring orqali
// (`const { admins } = require(...)`) bir marta olib qo'yishgan; agar
// bu yerda `admins = [...]` deb qayta tayinlansa, ular hali ham ESKI
// (bo'sh/to'liqsiz) massivga ishora qilib qolar edi.
async function loadDynamicAdmins() {
    if (!db) return;
    try {
        const snap = await db.collection('bot_admins').get();
        snap.docs.forEach((doc) => {
            const id = parseInt(doc.id);
            if (!isNaN(id) && !admins.includes(id)) admins.push(id);
        });
        if (!snap.empty) console.log(`✅ ${snap.size} ta qo'shimcha admin Firestore'dan yuklandi.`);
    } catch (error) {
        console.error('Dinamik adminlarni yuklashda xato:', error.message);
    }
}

async function addDynamicAdmin(telegramId, addedBy) {
    if (!db) throw new Error("DB ulanmagan");
    await db.collection('bot_admins').doc(String(telegramId)).set({
        addedBy: addedBy || null,
        addedAt: new Date().toISOString(),
    });
    if (!admins.includes(telegramId)) admins.push(telegramId);
}

module.exports = { bot, admins, superAdmins, TOKEN, loadDynamicAdmins, addDynamicAdmin };