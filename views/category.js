const { bot } = require('../config/adminBot');
const { db } = require('../config/firebase');
const { getMainKeyboard, isSuperAdmin } = require('../keyboards');
const { getStr } = require('../utils/helpers');

async function showCategoryView(chatId, categoryId, messageId) {
    try {
        const doc = await db.collection('categories').doc(String(categoryId)).get();
        if (!doc.exists) {
            if (messageId) bot.editMessageText("Kategoriya topilmadi!", { chat_id: chatId, message_id: messageId });
            bot.sendMessage(chatId, "Bosh menyu.", getMainKeyboard(chatId));
            return;
        }
        const c = doc.data();
        const name = getStr(c.name, 'Noma\'lum');
        const icon = c.icon || c.icon_url || '';
        const inlineRows = [
            [{ text: `Nomi: ${name}`, callback_data: `cat_update_name_${categoryId}` }],
            [{ text: `Ikonka: ${icon || 'Yo\'q'}`, callback_data: `cat_update_icon_${categoryId}` }],
        ];
        // O'chirish tugmasi faqat super adminlarga ko'rinadi — haqiqiy
        // cheklov callback.js'da ham bor, bu shunchaki keraksiz tugmani
        // yashiradi.
        if (isSuperAdmin(chatId)) {
            inlineRows.push([{ text: "🗑 Kategoriyani o'chirish", callback_data: `delete_category_${categoryId}` }]);
        }
        inlineRows.push([{ text: "⬅️ Orqaga", callback_data: 'back_to_prev' }]);
        const updateKeyboard = { reply_markup: { inline_keyboard: inlineRows } };
        const message = `📝 Kategoriya: ${icon} ${name} (ID: ${categoryId})\nQaysi maydonni yangilashni xohlaysiz?`;
        if (messageId) {
            bot.editMessageText(message, { chat_id: chatId, message_id: messageId, reply_markup: updateKeyboard.reply_markup });
        } else {
            bot.sendMessage(chatId, message, updateKeyboard);
        }
    } catch (error) {
        console.error("Kategoriya view xato:", error);
    }
}

async function showCategoryUpdateSelect(chatId, messageId = null) {
    try {
        const snapshot = await db.collection('categories').get();
        if (snapshot.empty) {
            const text = "Hech qanday kategoriya topilmadi.";
            if (messageId) bot.editMessageText(text, { chat_id: chatId, message_id: messageId });
            bot.sendMessage(chatId, "Bosh menyu.", getMainKeyboard(chatId));
            return;
        }
        const cats = snapshot.docs.map(d => {
            const x = d.data();
            return { id: x.id, name: getStr(x.name), icon: x.icon || x.icon_url || '' };
        });
        const kb = { reply_markup: { inline_keyboard: [] } };
        for (let i = 0; i < cats.length; i += 2) {
            const label1 = `${cats[i].icon} ${cats[i].name}`.trim();
            const row = [{ text: label1 || '?', callback_data: `cat_select_${cats[i].id}` }];
            if (i + 1 < cats.length) {
                const label2 = `${cats[i + 1].icon} ${cats[i + 1].name}`.trim();
                row.push({ text: label2 || '?', callback_data: `cat_select_${cats[i + 1].id}` });
            }
            kb.reply_markup.inline_keyboard.push(row);
        }
        const text = "Qaysi kategoriyani yangilashni xohlaysiz?";
        if (messageId) bot.editMessageText(text, { chat_id: chatId, message_id: messageId, reply_markup: kb.reply_markup });
        else bot.sendMessage(chatId, text, kb);
    } catch (error) {
        console.error("Kategoriyalarni olishda xato:", error);
    }
}

module.exports = { showCategoryView, showCategoryUpdateSelect };
