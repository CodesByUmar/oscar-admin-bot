const TelegramBot = require('node-telegram-bot-api');
const { silenceUnhandledRejections } = require('../utils/botErrorLogging');

const TOKEN = process.env.ORDER_BOT_TOKEN;
const admins = (process.env.ORDER_ADMIN_IDS || process.env.ADMIN_IDS || '')
    .split(',')
    .map(id => parseInt(id.trim()))
    .filter(id => !isNaN(id));

// Har bir buyurtma checkout'da tanlangan do'kon nomini (oscar-ui'dagi
// ORDER_SOURCE_OPTIONS: "150-151 OSCAR", "10-36 X-TRA", "SHOWROOM", "Online")
// orderSource maydonida olib keladi — shu asosda buyurtma o'sha do'konning
// o'z Telegram guruhiga yuboriladi (alohida bot emas, bitta bot — turli
// guruhlarga). Guruh ID'sini olish: botni guruhga qo'shing, guruhda
// "/chatid" deb yozing — bot javob beradi.
function parseGroupId(val) {
    if (!val) return null;
    const n = parseInt(val, 10);
    return isNaN(n) ? null : n;
}
const STORE_GROUP_MAP = {
    "150-151 OSCAR": parseGroupId(process.env.ORDER_GROUP_150_OSCAR),
    "10-36 X-TRA": parseGroupId(process.env.ORDER_GROUP_1036_XTRA),
    "SHOWROOM": parseGroupId(process.env.ORDER_GROUP_SHOWROOM),
    "Online": parseGroupId(process.env.ORDER_GROUP_ONLINE),
};
function getGroupForOrder(orderSource) {
    return STORE_GROUP_MAP[orderSource] || null;
}
function getAllGroupIds() {
    return Object.values(STORE_GROUP_MAP).filter(Boolean);
}

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

module.exports = { bot, admins, getGroupForOrder, getAllGroupIds };