// Botning o'zidan (Railway'ga kirmasdan) yangi admin qo'shish. Istalgan
// hozirgi admin bu buyruqni ishlata oladi — bu ataylab shunday: hozircha
// murakkab "kim kimni qo'sha oladi" tizimi kerak emas, oddiy va tez
// bo'lishi kerak edi.
const { bot, admins, addDynamicAdmin, removeDynamicAdmin } = require('../config/adminBot');
const { db } = require('../config/firebase');
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

// ─── ADMIN O'CHIRISH ────────────────────────────────────────────────
// Faqat botning o'zidan (bot_admins'da) qo'shilgan adminlar ro'yxatda
// chiqadi va o'chirilishi mumkin — ADMIN_IDS orqali (Railway env)
// qo'shilganlarni faqat Railway'dan o'chirish mumkin.
async function showAdminRemoveList(chatId, messageId = null) {
    if (!db) { bot.sendMessage(chatId, "❌ Database ulanmagan."); return; }
    try {
        const snap = await db.collection('bot_admins').get();
        const kb = { inline_keyboard: [] };
        for (const doc of snap.docs) {
            const telegramId = parseInt(doc.id);
            if (isNaN(telegramId) || !admins.includes(telegramId)) continue;
            const userData = await findTelegramUser({ telegramId: String(telegramId) });
            const displayName = buildDisplayName(userData, `ID:${telegramId}`);
            kb.inline_keyboard.push([{ text: `👤 ${displayName} (${telegramId})`, callback_data: `adminremove_select_${telegramId}` }]);
        }
        if (kb.inline_keyboard.length === 0) {
            const text = "Botning o'zidan qo'shilgan adminlar yo'q.\n\n(ADMIN_IDS orqali — Railway'dan qo'shilgan adminlarni faqat shu yerdan, Railway'dan o'chirish mumkin.)";
            if (messageId) bot.editMessageText(text, { chat_id: chatId, message_id: messageId }).catch(() => {});
            else bot.sendMessage(chatId, text, getMainKeyboard(chatId));
            return;
        }
        const text = "🗑 Qaysi adminni o'chirmoqchisiz?";
        if (messageId) bot.editMessageText(text, { chat_id: chatId, message_id: messageId, reply_markup: kb }).catch(() => {});
        else bot.sendMessage(chatId, text, { reply_markup: kb });
    } catch (error) {
        console.error("Admin ro'yxatini olishda xato:", error);
        bot.sendMessage(chatId, "❌ Xato!", getMainKeyboard(chatId));
    }
}

async function handleAdminRemoveSelect(chatId, messageId, telegramId, answerCallback) {
    if (telegramId === chatId) {
        answerCallback("O'zingizni o'chira olmaysiz — buni boshqa admin bajarishi kerak.");
        return;
    }
    try {
        const userData = await findTelegramUser({ telegramId: String(telegramId) });
        const displayName = buildDisplayName(userData, `ID:${telegramId}`);
        userState[chatId] = { step: 'admin_remove_confirm', data: { telegramId, displayName }, steps: [] };
        await bot.editMessageText(
            `🗑 ${displayName} (ID: ${telegramId}) adminlikdan o'chirilsinmi?`,
            {
                chat_id: chatId,
                message_id: messageId,
                reply_markup: {
                    inline_keyboard: [[
                        { text: '✅ Ha', callback_data: 'adminremove_yes' },
                        { text: "❌ Yo'q", callback_data: 'adminremove_no' },
                    ]],
                },
            }
        );
        answerCallback();
    } catch (error) {
        console.error("Admin o'chirish tanlovida xato:", error);
        answerCallback('Xato!');
    }
}

async function handleAdminRemoveConfirm(chatId, messageId, confirmed, answerCallback) {
    const state = userState[chatId];
    const stateData = (state && state.data) || {};
    const { telegramId, displayName } = stateData;
    if (!telegramId) {
        answerCallback("Ma'lumot topilmadi, qaytadan urinib ko'ring.");
        return;
    }
    resetUserState(chatId);
    if (!confirmed) {
        bot.editMessageText('Bekor qilindi.', { chat_id: chatId, message_id: messageId }).catch(() => {});
        answerCallback('Bekor qilindi');
        return;
    }
    try {
        const removed = await removeDynamicAdmin(telegramId);
        const text = removed
            ? `✅ ${displayName} (ID: ${telegramId}) adminlikdan o'chirildi.`
            : `❌ Bu admin ADMIN_IDS (Railway) orqali qo'shilgan — botdan o'chirib bo'lmaydi, Railway'dan o'chiring.`;
        bot.editMessageText(text, { chat_id: chatId, message_id: messageId }).catch(() => {});
        answerCallback();
    } catch (error) {
        console.error("Admin o'chirishda xato:", error);
        answerCallback('Xato!');
    }
}

module.exports = {
    handleAdminAddStep, finishAddAdmin,
    showAdminRemoveList, handleAdminRemoveSelect, handleAdminRemoveConfirm,
};
