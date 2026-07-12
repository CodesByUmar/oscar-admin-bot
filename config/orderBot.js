const TelegramBot = require('node-telegram-bot-api');

// Uchinchi bot: faqat yangi buyurtmalar keladi, Tasdiqlash/Bekor/Yetkazildi shu yerda boshqariladi.
const TOKEN = process.env.ORDER_BOT_TOKEN;
// Agar alohida ORDER_ADMIN_IDS berilmasa, asosiy ADMIN_IDS'dan foydalanadi.
const admins = (process.env.ORDER_ADMIN_IDS || process.env.ADMIN_IDS || '')
    .split(',')
    .map(id => parseInt(id.trim()))
    .filter(id => !isNaN(id));

let bot = null;
if (TOKEN) {
    bot = new TelegramBot(TOKEN, { polling: true });
    console.log("✅ Order bot (3-bot) ishga tushdi...");
} else {
    console.warn("⚠️ ORDER_BOT_TOKEN topilmadi — buyurtma boti ishlamaydi.");
}

module.exports = { bot, admins };