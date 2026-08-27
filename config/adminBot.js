const TelegramBot = require('node-telegram-bot-api');
const { silenceUnhandledRejections } = require('../utils/botErrorLogging');

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

module.exports = { bot, admins, superAdmins, TOKEN };