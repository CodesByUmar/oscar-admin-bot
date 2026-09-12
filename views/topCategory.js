const { bot } = require('../config/adminBot');
const { db } = require('../config/firebase');
const { getMainKeyboard } = require('../keyboards');
const { getStr } = require('../utils/helpers');

async function showTopCategoryView(chatId, topCategoryId, messageId) {
    try {
        const doc = await db.collection('topCategories').doc(String(topCategoryId)).get();
        if (!doc.exists) {
            if (messageId) bot.editMessageText("Kategoriya topilmadi!", { chat_id: chatId, message_id: messageId });
            bot.sendMessage(chatId, "Bosh menyu.", getMainKeyboard(chatId));
            return;
        }
        const name = getStr(doc.data().name, 'Noma\'lum');
        const inlineRows = [
            [{ text: `Nomi: ${name}`, callback_data: `topcat_update_name_${topCategoryId}` }],
            [{ text: "⬅️ Orqaga", callback_data: 'back_to_prev' }],
        ];
        const message = `📝 Kategoriya: 🗂 ${name} (ID: ${topCategoryId})\nQaysi maydonni yangilashni xohlaysiz?`;
        if (messageId) {
            bot.editMessageText(message, { chat_id: chatId, message_id: messageId, reply_markup: { inline_keyboard: inlineRows } });
        } else {
            bot.sendMessage(chatId, message, { reply_markup: { inline_keyboard: inlineRows } });
        }
    } catch (error) {
        console.error("Top-kategoriya view xato:", error);
    }
}

async function showTopCategoryUpdateSelect(chatId, messageId = null) {
    try {
        const snapshot = await db.collection('topCategories').get();
        if (snapshot.empty) {
            const text = "Hech qanday kategoriya topilmadi.";
            if (messageId) bot.editMessageText(text, { chat_id: chatId, message_id: messageId });
            bot.sendMessage(chatId, "Bosh menyu.", getMainKeyboard(chatId));
            return;
        }
        const tops = snapshot.docs
            .map((d) => ({ id: d.id, name: getStr(d.data().name) }))
            .sort((a, b) => a.name.localeCompare(b.name));
        const kb = { inline_keyboard: [] };
        for (let i = 0; i < tops.length; i += 2) {
            const row = [{ text: tops[i].name || '?', callback_data: `topcat_select_${tops[i].id}` }];
            if (i + 1 < tops.length) row.push({ text: tops[i + 1].name || '?', callback_data: `topcat_select_${tops[i + 1].id}` });
            kb.inline_keyboard.push(row);
        }
        const text = "Qaysi kategoriyani yangilashni xohlaysiz?";
        if (messageId) bot.editMessageText(text, { chat_id: chatId, message_id: messageId, reply_markup: kb });
        else bot.sendMessage(chatId, text, { reply_markup: kb });
    } catch (error) {
        console.error("Kategoriyalarni olishda xato:", error);
    }
}

// Kategoriya nomi o'zgartirilganda, uni ishlatgan barcha subkategoriya
// va mahsulotlardagi topCategory qiymatini ham yangilaydi — aks holda
// eski nom bilan "osilib" qolib, mijoz ilovasida ko'rinmay qoladi.
async function cascadeTopCategoryRename(oldName, newName) {
    if (oldName === newName) return;
    const catsSnap = await db.collection('categories').where('topCategory', '==', oldName).get();
    const prodsSnap = await db.collection('products').where('topCategory', '==', oldName).get();
    const allDocs = [...catsSnap.docs, ...prodsSnap.docs];
    for (let i = 0; i < allDocs.length; i += 400) {
        const batch = db.batch();
        allDocs.slice(i, i + 400).forEach((doc) => batch.update(doc.ref, { topCategory: newName }));
        await batch.commit();
    }
}

module.exports = { showTopCategoryView, showTopCategoryUpdateSelect, cascadeTopCategoryRename };
