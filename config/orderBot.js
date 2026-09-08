const TelegramBot = require('node-telegram-bot-api');
const { silenceUnhandledRejections } = require('../utils/botErrorLogging');

const TOKEN = process.env.ORDER_BOT_TOKEN;
const admins = (process.env.ORDER_ADMIN_IDS || process.env.ADMIN_IDS || '')
    .split(',')
    .map(id => parseInt(id.trim()))
    .filter(id => !isNaN(id));

// Yangi buyurtmalar va ular bo'yicha amallar (tasdiqlash/bekor/yetkazish)
// bitta umumiy Telegram guruhga ham yuborilishi uchun. Guruh ID'sini olish:
// botni guruhga qo'shing, guruhda "/chatid" deb yozing — bot javob beradi.
const GROUP_CHAT_ID = process.env.ORDER_GROUP_CHAT_ID ? parseInt(process.env.ORDER_GROUP_CHAT_ID) : null;

let bot = null;
if (TOKEN) {
    bot = new TelegramBot(TOKEN, { polling: true });
    bot.on('polling_error', (error) => {
        console.error('orderBot polling xatosi:', error.code, error.message);
    });
    silenceUnhandledRejections(bot, 'orderBot');
    bot.on('message', (msg) => {
        if (msg.text === '/chatid') {
            bot.sendMessage(msg.chat.id, `Chat ID: ${msg.chat.id}`);
        }
    });
    console.log("✅ Order bot (3-bot) ishga tushdi...");
} else {
    console.warn("⚠️ ORDER_BOT_TOKEN topilmadi — buyurtma boti ishlamaydi.");
}

module.exports = { bot, admins, GROUP_CHAT_ID };