// Papka-kabi ichma-ich navigatsiya: Kategoriya -> Subkategoriya -> Mahsulot.
// Bu — "📂 Kategoriyalar" tugmasi bosilganda ochiladigan ENG YUQORI
// (root) ro'yxat. Har bir kategoriyaga kirilganda uning subkategoriyalari
// (views/topCategory.js: showTopCategoryView), har bir subkategoriyaga
// kirilganda uning mahsulotlari (views/category.js: showCategoryView)
// ko'rsatiladi — shu tariqa uch bosqich bir-biriga tabiiy bog'lanadi.
const { bot } = require('../config/adminBot');
const { db } = require('../config/firebase');
const { getStr } = require('../utils/helpers');

async function showCategoriesRoot(chatId, messageId = null) {
    try {
        const snapshot = await db.collection('topCategories').get();
        const tops = snapshot.docs
            .map((d) => ({ id: d.id, name: getStr(d.data().name) }))
            .sort((a, b) => a.name.localeCompare(b.name));
        const kb = { inline_keyboard: [] };
        for (let i = 0; i < tops.length; i += 2) {
            const row = [{ text: tops[i].name || '?', callback_data: `topcat_select_${tops[i].id}` }];
            if (i + 1 < tops.length) row.push({ text: tops[i + 1].name || '?', callback_data: `topcat_select_${tops[i + 1].id}` });
            kb.inline_keyboard.push(row);
        }
        kb.inline_keyboard.push([{ text: "➕ Yangi kategoriya", callback_data: 'browse_new_top' }]);
        const text = tops.length
            ? "📂 Kategoriyalar — birini tanlang, yoki yangisini qo'shing:"
            : "Hali kategoriya yo'q. Birinchisini qo'shing:";
        if (messageId) bot.editMessageText(text, { chat_id: chatId, message_id: messageId, reply_markup: kb });
        else bot.sendMessage(chatId, text, { reply_markup: kb });
    } catch (error) {
        console.error("Kategoriyalar ro'yxatida xato:", error);
    }
}

module.exports = { showCategoriesRoot };
