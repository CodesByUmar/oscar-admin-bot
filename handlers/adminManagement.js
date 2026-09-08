// Botning o'zidan (Railway'ga kirmasdan) yangi admin qo'shish. Istalgan
// hozirgi admin bu buyruqni ishlata oladi — bu ataylab shunday: hozircha
// murakkab "kim kimni qo'sha oladi" tizimi kerak emas, oddiy va tez
// bo'lishi kerak edi.
const { bot, admins, addDynamicAdmin } = require('../config/adminBot');
const { userState, resetUserState } = require('../state/userState');
const { getMainKeyboard } = require('../keyboards');
const { findTelegramUser, buildDisplayName } = require('./vip');

async function handleAdminAddStep(chatId, text) {
    const state = userState[chatId];
    if (!state) return false;

    // Tasdiqlash bosqichida oddiy matn kutilmaydi — faqat inline
    // tugmalar (✅ Ha / ❌ Yo'q) orqali javob berilishi kerak.
    if (state.step === 'admin_add_confirm') {
        bot.sendMessage(chatId, "Iltimos, yuqoridagi tugmalardan birini bosing (✅ yoki ❌).");
        return true;
    }

    if (state.step !== 'admin_add_id') return false;

    const input = text.trim();

    if (!/^\d+$/.test(input)) {
        bot.sendMessage(chatId, "❌ Noto'g'ri format! Faqat Telegram ID (raqam) kiriting.");
        return true;
    }

    const telegramId = parseInt(input);
    if (admins.includes(telegramId)) {
        bot.sendMessage(chatId, `⚠️ Bu foydalanuvchi allaqachon admin.`, getMainKeyboard(chatId));
        resetUserState(chatId);
        return true;
    }
    const userData = await findTelegramUser({ telegramId: String(telegramId) });
    const displayName = buildDisplayName(userData, `ID:${telegramId}`);

    state.step = 'admin_add_confirm';
    state.data = { telegramId, userData };

    bot.sendMessage(
        chatId,
        `➕ Yangi admin qo'shilsinmi?\n\n👤 ${displayName}\n🆔 Telegram ID: ${telegramId}`,
        {
            reply_markup: {
                inline_keyboard: [[
                    { text: '✅ Ha', callback_data: 'adminadd_yes' },
                    { text: "❌ Yo'q", callback_data: 'adminadd_no' },
                ]],
            },
        }
    );
    return true;
}

async function finishAddAdmin(chatId, telegramId, userData) {
    try {
        await addDynamicAdmin(telegramId, chatId);
        const displayName = buildDisplayName(userData, `ID:${telegramId}`);
        bot.sendMessage(
            chatId,
            `✅ Yangi admin qo'shildi!\n\n👤 ${displayName}\n🆔 Telegram ID: ${telegramId}`,
            getMainKeyboard(chatId)
        );
        resetUserState(chatId);

        // Yangi adminga o'zi orqali xabar berishga harakat qilamiz — agar u
        // hali admin-botga /start bosmagan bo'lsa, Telegram bu xabarni rad
        // etadi (kutilgan holat, xatolik emas).
        try {
            await bot.sendMessage(telegramId, "🎉 Sizga admin huquqi berildi!\n\nBotdan foydalanish uchun /start bosing.");
        } catch (err) {
            console.log(`Yangi adminga (${telegramId}) xabar yuborib bo'lmadi (ehtimol hali /start bosmagan):`, err.message);
        }
    } catch (error) {
        console.error("Admin qo'shishda xato:", error);
        bot.sendMessage(chatId, "❌ Admin qo'shishda xato yuz berdi!", getMainKeyboard(chatId));
        resetUserState(chatId);
    }
}

module.exports = { handleAdminAddStep, finishAddAdmin };
