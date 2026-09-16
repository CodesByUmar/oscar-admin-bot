const { bot } = require('../config/adminBot');
const { db } = require('../config/firebase');
const { getMainKeyboard, isSuperAdmin } = require('../keyboards');
const { getStr } = require('../utils/helpers');

async function showCategoryView(chatId, categoryId, messageId) {
    try {
        const doc = await db.collection('categories').doc(String(categoryId)).get();
        if (!doc.exists) {
            if (messageId) bot.editMessageText("Subkategoriya topilmadi!", { chat_id: chatId, message_id: messageId });
            bot.sendMessage(chatId, "Bosh menyu.", getMainKeyboard(chatId));
            return;
        }
        const c = doc.data();
        const name = getStr(c.name, 'Noma\'lum');
        const icon = c.icon || c.icon_url || '📁';

        // Shu subkategoriyadagi mahsulotlar — papka ichidagi fayllar kabi,
        // to'g'ridan-to'g'ri shu yerdan ko'rinadi va bosilsa ochiladi.
        const PRODUCT_LIMIT = 40;
        const productsSnap = await db.collection('products').where('category', '==', c.name).limit(PRODUCT_LIMIT + 1).get();
        const products = productsSnap.docs.map((d) => ({ id: d.id, name: getStr(d.data().name, 'Noma\'lum') }));
        const truncated = products.length > PRODUCT_LIMIT;
        const shown = truncated ? products.slice(0, PRODUCT_LIMIT) : products;

        const inlineRows = [];
        for (let i = 0; i < shown.length; i += 2) {
            const row = [{ text: shown[i].name, callback_data: `update_product_${shown[i].id}` }];
            if (i + 1 < shown.length) row.push({ text: shown[i + 1].name, callback_data: `update_product_${shown[i + 1].id}` });
            inlineRows.push(row);
        }
        inlineRows.push([{ text: "➕ Yangi mahsulot qo'shish", callback_data: `browse_new_product_${categoryId}` }]);
        inlineRows.push([{ text: `✏️ Nomini o'zgartirish (${name})`, callback_data: `cat_update_name_${categoryId}` }]);
        // O'chirish tugmasi faqat super adminlarga ko'rinadi — haqiqiy
        // cheklov callback.js'da ham bor, bu shunchaki keraksiz tugmani
        // yashiradi.
        if (isSuperAdmin(chatId)) {
            inlineRows.push([{ text: "🗑 Subkategoriyani o'chirish", callback_data: `delete_category_${categoryId}` }]);
        }
        inlineRows.push([{ text: "⬅️ Orqaga", callback_data: 'back_to_prev' }]);
        const updateKeyboard = { reply_markup: { inline_keyboard: inlineRows } };
        const countText = products.length === 0
            ? "Ichida hali mahsulot yo'q."
            : `Ichida ${truncated ? PRODUCT_LIMIT + '+' : products.length} ta mahsulot bor:`;
        const message = `📁 Subkategoriya: ${icon} ${name}\n${countText}`;
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
            const text = "Hech qanday subkategoriya topilmadi.";
            if (messageId) bot.editMessageText(text, { chat_id: chatId, message_id: messageId });
            bot.sendMessage(chatId, "Bosh menyu.", getMainKeyboard(chatId));
            return;
        }
        const cats = snapshot.docs.map(d => {
            const x = d.data();
            return { id: x.id, name: getStr(x.name), icon: x.icon || x.icon_url || '📁' };
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
        const text = "Qaysi subkategoriyani yangilashni xohlaysiz?";
        if (messageId) bot.editMessageText(text, { chat_id: chatId, message_id: messageId, reply_markup: kb.reply_markup });
        else bot.sendMessage(chatId, text, kb);
    } catch (error) {
        console.error("Kategoriyalarni olishda xato:", error);
    }
}

module.exports = { showCategoryView, showCategoryUpdateSelect };
