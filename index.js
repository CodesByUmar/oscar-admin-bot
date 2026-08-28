require('dotenv').config();
const { db } = require('./config/firebase');
const { bot: adminBotInstance, loadDynamicAdmins } = require('./config/adminBot');
const { bot: orderBotInstance } = require('./config/orderBot');
const { loadPersistedStates, persistAllStates } = require('./state/userState');

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

loadDynamicAdmins(); // Firestore'dan qo'shilgan adminlarni operativ xotiraga yuklaydi
registerOrderListener();
registerOrderBotCallbacks();
registerMessageHandler();
registerPhotoHandler();
registerCallbackHandler();
registerVipCommands();
startUserBot();
const httpServer = startServer();

// Oldingi (deploy'dan oldingi) konteynerda tugallanmagan admin
// jarayonlarini tiklaymiz (pastdagi gracefulShutdown ularni saqlab
// ketgan bo'ladi).
loadPersistedStates(db);

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

    // Firestore yoki server yopilishi osilib qolsa ham, konteyner cheksiz
    // kutib qolmasligi uchun umumiy "so'nggi chora" vaqti — nechta amal
    // bajarilishidan qat'iy nazar, process shu vaqtda albatta tugaydi.
    const failsafe = setTimeout(() => process.exit(0), 8000);
    failsafe.unref();

    await Promise.allSettled([
        adminBotInstance && adminBotInstance.stopPolling(),
        orderBotInstance && orderBotInstance.stopPolling(),
        persistAllStates(db),
    ]);

    if (httpServer) {
        httpServer.close(() => process.exit(0));
    } else {
        process.exit(0);
    }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
