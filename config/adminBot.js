const TelegramBot = require('node-telegram-bot-api');

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const admins = (process.env.ADMIN_IDS || '').split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
const bot = new TelegramBot(TOKEN, { polling: true });

bot.on('polling_error', (error) => {
    console.error('adminBot polling xatosi:', error.code, error.message);
});

module.exports = { bot, admins, TOKEN };