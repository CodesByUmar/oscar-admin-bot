const TelegramBot = require('node-telegram-bot-api');

const TOKEN = process.env.ORDER_BOT_TOKEN;
const admins = (process.env.ORDER_ADMIN_IDS || process.env.ADMIN_IDS || '')
    .split(',')
    .map(id => parseInt(id.trim()))
    .filter(id => !isNaN(id));

let bot = null;
if (TOKEN) {
    bot = new TelegramBot(TOKEN, { polling: true });
    bot.on('polling_error', (error) => {
        console.error('orderBot polling xatosi:', error.code, error.message);
    });
    console.log("✅ Order bot (3-bot) ishga tushdi...");
} else {
    console.warn("⚠️ ORDER_BOT_TOKEN topilmadi — buyurtma boti ishlamaydi.");
}

module.exports = { bot, admins };