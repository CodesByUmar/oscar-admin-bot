require('dotenv').config();
require('./config/firebase');
const { bot: adminBotInstance } = require('./config/adminBot');
const { bot: orderBotInstance } = require('./config/orderBot');

const { registerOrderListener } = require('./listeners/orders');
const { registerOrderBotCallbacks } = require('./handlers/orderBotCallback');
const { registerMessageHandler } = require('./handlers/message');
const { registerPhotoHandler } = require('./handlers/photo');
const { registerCallbackHandler } = require('./handlers/callback');
const { registerVipCommands } = require('./handlers/vip');
const { startUserBot } = require('./bots/userBot');
const { startServer } = require('./server');

// Kutilmagan xatolar butun botni o'chirib qo'ymasligi uchun himoya.
// Bular yo'q bo'lganda, masalan bitta sendMessage'dagi noto'g'ri parametr
// yoki tarmoq xatosi butun process'ni yiqitib, bot "jim qolib" qolishi mumkin edi.
process.on('unhandledRejection', (reason) => {
    console.error('❌ Unhandled Rejection:', reason);
});
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
});

registerOrderListener();
registerOrderBotCallbacks();
registerMessageHandler();
registerPhotoHandler();
registerCallbackHandler();
registerVipCommands();
startUserBot();
const httpServer = startServer();

console.log("Bot ishga tushdi va polling boshlandi...");

// Railway har bir deploy'da eski konteynerga SIGTERM yuboradi. Buni
// tinglamasak, eski konteyner Telegram bilan uzoq-polling ulanishini
// ochiq qoldirib, majburan o'chirilguncha kutadi — shu oraliqda yangi
// konteyner ham ulanib, ikkalasi bir tokenga bog'lanib "409 Conflict"
// xatosiga olib kelardi. Endi signal kelishi bilan pollingni o'zimiz
// yopamiz — yangisi boshlanguncha eskisi allaqachon joy bo'shatgan bo'ladi.
let isShuttingDown = false;
async function gracefulShutdown(signal) {
    if (isShuttingDown) return;
    isShuttingDown = true;
    console.log(`${signal} qabul qilindi — botlar tartibli to'xtatilmoqda...`);

    await Promise.allSettled([
        adminBotInstance && adminBotInstance.stopPolling(),
        orderBotInstance && orderBotInstance.stopPolling(),
    ]);

    if (httpServer) {
        httpServer.close(() => process.exit(0));
        setTimeout(() => process.exit(0), 5000).unref();
    } else {
        process.exit(0);
    }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
