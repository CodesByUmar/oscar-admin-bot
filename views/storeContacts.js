// Do'kon kontaktlari (telefon + Telegram username) — oscar-ui'ning
// Call Center oynasida ko'rsatiladigan `storeContacts` kolleksiyasini
// botning o'zidan (Railway'ga kirmasdan) tahrirlash uchun.
const { bot } = require('../config/adminBot');
const { db } = require('../config/firebase');
const { getMainKeyboard } = require('../keyboards');

// oscar-ui ham AYNAN shu doc ID'larni kutadi.
const STORE_IDS = ['oscar_150', 'xtra_1036', 'showroom'];

async function getAllStores() {
    const snap = await db.collection('storeContacts').get();
    const byId = new Map(snap.docs.map((d) => [d.id, d.data()]));
    return STORE_IDS.map((id) => ({ id, ...(byId.get(id) || {}) }));
}

async function showStoreContactsList(chatId, messageId = null) {
    if (!db) { bot.sendMessage(chatId, "❌ Database ulanmagan."); return; }
    try {
        const stores = await getAllStores();
        const kb = { inline_keyboard: [] };
        stores.forEach((s) => {
            const label = `${s.name || s.id}${s.phone ? ' — ' + s.phone : ' — (kiritilmagan)'}`;
            kb.inline_keyboard.push([{ text: label.slice(0, 64), callback_data: `storecontact_edit_${s.id}` }]);
        });
        const text = "🏪 Do'kon kontaktlari\n\nTahrirlash uchun do'konni tanlang:";
        if (messageId) await bot.editMessageText(text, { chat_id: chatId, message_id: messageId, reply_markup: kb }).catch(() => {});
        else await bot.sendMessage(chatId, text, { reply_markup: kb });
    } catch (error) {
        console.error("Do'kon kontaktlari ro'yxati xato:", error);
        bot.sendMessage(chatId, '❌ Xato!', getMainKeyboard(chatId));
    }
}

async function showStoreContactEdit(chatId, docId, messageId) {
    try {
        const doc = await db.collection('storeContacts').doc(docId).get();
        const data = doc.exists ? doc.data() : {};
        const text =
            `🏪 ${data.name || docId}\n\n` +
            `📞 Telefon: ${data.phone || '— kiritilmagan'}\n` +
            `✈️ Telegram: ${data.telegramUsername ? '@' + data.telegramUsername : '— kiritilmagan'}\n\n` +
            `Nimani tahrirlaysiz?`;
        const kb = {
            inline_keyboard: [
                [{ text: '📞 Telefonni o\'zgartirish', callback_data: `storecontact_setphone_${docId}` }],
                [{ text: "✈️ Telegram username o'zgartirish", callback_data: `storecontact_settg_${docId}` }],
                [{ text: "⬅️ Ro'yxatga qaytish", callback_data: 'storecontact_back' }],
            ],
        };
        await bot.editMessageText(text, { chat_id: chatId, message_id: messageId, reply_markup: kb });
    } catch (error) {
        console.error("Do'kon kontaktini ko'rsatishda xato:", error);
    }
}

module.exports = { showStoreContactsList, showStoreContactEdit, STORE_IDS };
