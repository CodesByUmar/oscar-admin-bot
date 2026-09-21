const { bot } = require('../config/adminBot');
const { db } = require('../config/firebase');
const { getMainKeyboard, isSuperAdmin } = require('../keyboards');
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

        // Shu kategoriyaga tegishli subkategoriyalar — papka ichidagi
        // papkalar kabi, to'g'ridan-to'g'ri shu yerdan ko'rinadi va
        // bosilsa ichiga kiriladi (views/category.js: showCategoryView).
        const subsSnap = await db.collection('categories').where('topCategory', '==', name).get();
        const subs = subsSnap.docs
            .map((d) => ({ id: d.id, name: getStr(d.data().name) }))
            .sort((a, b) => a.name.localeCompare(b.name));

        const inlineRows = [];
        for (let i = 0; i < subs.length; i += 2) {
            const row = [{ text: `📁 ${subs[i].name}` || '?', callback_data: `cat_select_${subs[i].id}` }];
            if (i + 1 < subs.length) row.push({ text: `📁 ${subs[i + 1].name}`, callback_data: `cat_select_${subs[i + 1].id}` });
            inlineRows.push(row);
        }
        inlineRows.push([{ text: "➕ Yangi subkategoriya", callback_data: `browse_new_sub_${topCategoryId}` }]);
        inlineRows.push([{ text: `✏️ Nomini o'zgartirish (${name})`, callback_data: `topcat_update_name_${topCategoryId}` }]);
        if (subs.length === 0 && isSuperAdmin(chatId)) {
            inlineRows.push([{ text: "🗑 Kategoriyani o'chirish", callback_data: `browse_delete_top_${topCategoryId}` }]);
        }
        inlineRows.push([{ text: "⬅️ Orqaga", callback_data: 'back_to_prev' }]);

        const subsText = subs.length
            ? `Ichida ${subs.length} ta subkategoriya bor:`
            : "Ichida hali subkategoriya yo'q.";
        const message = `📂 Kategoriya: ${name}\n${subsText}`;
        if (messageId) {
            bot.editMessageText(message, { chat_id: chatId, message_id: messageId, reply_markup: { inline_keyboard: inlineRows } });
        } else {
            bot.sendMessage(chatId, message, { reply_markup: { inline_keyboard: inlineRows } });
        }
    } catch (error) {
        console.error("Top-kategoriya view xato:", error);
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

module.exports = { showTopCategoryView, cascadeTopCategoryRename };
