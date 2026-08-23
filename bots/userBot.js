const TelegramBot = require('node-telegram-bot-api');

const USER_BOT_TOKEN = process.env.USER_BOT_TOKEN;

let userBotInstance = null;

function getUserBot() {
    return userBotInstance;
}

function startUserBot() {
    if (!USER_BOT_TOKEN) {
        console.warn("⚠️ USER_BOT_TOKEN topilmadi — user bot ishlamaydi.");
        return;
    }

    // MUHIM: bu bot oscar-shop-bot bilan BIR XIL tokenga ega (ataylab, shunda
    // mijoz xabarlarni bitta botdan oladi). Shu sababli bu yerda polling: false
    // bo'lishi SHART — aks holda ikkita process bir vaqtda bir xil tokenga
    // ulanishga urinadi va Telegram "409 Conflict" xatosini beradi.
    const userBot = new TelegramBot(USER_BOT_TOKEN, { polling: false });
    userBotInstance = userBot;
    console.log("✅ User bot ishga tushdi (faqat xabar yuborish uchun, polling o'chirilgan)...");
}

module.exports = { startUserBot, getUserBot };
