const { bot } = require('../config/adminBot');
const { db } = require('../config/firebase');
const { getMainKeyboard, isSuperAdmin } = require('../keyboards');
const { formatTimestamp, getStr } = require('../utils/helpers');
const { userState, resetUserState } = require('../state/userState');

async function showProductView(chatId, productId, messageId) {
    try {
        const doc = await db.collection('products').doc(String(productId)).get();
        if (!doc.exists) {
            if (messageId) bot.editMessageText("Mahsulot topilmadi!", { chat_id: chatId, message_id: messageId });
            return;
        }
        const p = doc.data();
        const category = getStr(p.category, 'Yo\'q');
        // Ba'zi eski yozuvlarda name/description oddiy matn bo'lishi mumkin,
        // shuning uchun {uz,ru,en} obyekti kutilganda ehtiyot bo'lib olamiz.
        const nameML = (p.name && typeof p.name === 'object') ? p.name : { uz: getStr(p.name) };
        const descML = (p.description && typeof p.description === 'object') ? p.description : { uz: getStr(p.description) };
        const shortVal = (v) => v ? (v.length > 20 ? v.substring(0, 20) + '…' : v) : 'Yo\'q';
        const price = p.pricePiece || 0;
        const priceBox = p.priceBox || 0;
        const startDateText = formatTimestamp(p.discountStartDate);
        const endDateText = formatTimestamp(p.discountEndDate);
        const inlineRows = [
            [
                { text: `🇺🇿 Nomi: ${shortVal(nameML.uz)}`, callback_data: `update_ml_name_uz_${productId}` },
                { text: `🇷🇺 Nomi: ${shortVal(nameML.ru)}`, callback_data: `update_ml_name_ru_${productId}` },
            ],
            [{ text: `🇬🇧 Nomi: ${shortVal(nameML.en)}`, callback_data: `update_ml_name_en_${productId}` }],
            [{ text: `Narx: $${price} (dona, USD)`, callback_data: `update_field_pricePiece_${productId}` }],
            [{ text: `Narx: $${priceBox} (karobka, USD)`, callback_data: `update_field_priceBox_${productId}` }],
            [{ text: `Chegirma: ${p.discount || 0}%`, callback_data: `update_field_discount_${productId}` }],
            [{ text: `📅 Chegirma boshlanishi: ${startDateText}`, callback_data: `update_field_discountStart_${productId}` }],
            [{ text: `📅 Chegirma tugashi: ${endDateText}`, callback_data: `update_field_discountEnd_${productId}` }],
            [{ text: `Stock: ${(p.stock || 0).toLocaleString()} dona`, callback_data: `update_field_stock_${productId}` }],
            [
                { text: `🇺🇿 Tavsif: ${shortVal(descML.uz)}`, callback_data: `update_ml_description_uz_${productId}` },
                { text: `🇷🇺 Tavsif: ${shortVal(descML.ru)}`, callback_data: `update_ml_description_ru_${productId}` },
            ],
            [{ text: `🇬🇧 Tavsif: ${shortVal(descML.en)}`, callback_data: `update_ml_description_en_${productId}` }],
            [{ text: `Rasm: ${p.image ? 'Bor' : 'Yo\'q'}`, callback_data: `update_field_image_${productId}` }],
            [{ text: `📂 Kategoriya: ${category}`, callback_data: `update_field_category_${productId}` }],
        ];
        // O'chirish tugmasi faqat super adminlarga ko'rinadi — haqiqiy
        // cheklov callback.js'da ham bor, bu shunchaki keraksiz tugmani
        // yashiradi.
        if (isSuperAdmin(chatId)) {
            inlineRows.push([{ text: "🗑 Mahsulotni o'chirish", callback_data: `delete_product_${productId}` }]);
        }
        inlineRows.push([{ text: "⬅️ Orqaga", callback_data: 'back_to_prev' }]);
        const updateKeyboard = { reply_markup: { inline_keyboard: inlineRows } };
        const message =
            `📝 Mahsulot (ID: ${productId})\n` +
            `🇺🇿 ${nameML.uz || 'Yo\'q'}\n` +
            `🇷🇺 ${nameML.ru || 'Yo\'q'}\n` +
            `🇬🇧 ${nameML.en || 'Yo\'q'}\n\n` +
            `• Narx: $${price} (dona, USD)\n` +
            `• Narx: $${priceBox} (karobka, USD)\n` +
            `• Chegirma: ${p.discount || 0}%\n` +
            `• Chegirma boshlanishi: ${startDateText}\n` +
            `• Chegirma tugashi: ${endDateText}\n` +
            `• Stock: ${(p.stock || 0).toLocaleString()} dona\n` +
            `• Kategoriya: ${category}\n` +
            `• Rasm: ${p.image ? 'URL mavjud' : 'Yo\'q'}\n` +
            `Qaysi maydonni yangilashni xohlaysiz?`;
        if (messageId) {
            bot.editMessageText(message, { chat_id: chatId, message_id: messageId, reply_markup: updateKeyboard.reply_markup });
        } else {
            bot.sendMessage(chatId, message, updateKeyboard);
        }
    } catch (error) {
        console.error("Mahsulot view xato:", error);
    }
}

async function showProductUpdateCategorySelect(chatId, messageId = null) {
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
            const row = [{ text: label1 || '?', callback_data: `select_category_${cats[i].id}` }];
            if (i + 1 < cats.length) {
                const label2 = `${cats[i + 1].icon} ${cats[i + 1].name}`.trim();
                row.push({ text: label2 || '?', callback_data: `select_category_${cats[i + 1].id}` });
            }
            kb.reply_markup.inline_keyboard.push(row);
        }
        const text = "Qaysi kategoriyadagi mahsulotni yangilashni xohlaysiz?";
        if (messageId) bot.editMessageText(text, { chat_id: chatId, message_id: messageId, reply_markup: kb.reply_markup });
        else bot.sendMessage(chatId, text, kb);
    } catch (error) {
        console.error("Xato:", error);
    }
}

async function showProductsInCategory(chatId, categoryName, messageId = null) {
    try {
        const snapshot = await db.collection('products').where('category', '==', categoryName).get();
        const categoryNameStr = getStr(categoryName, '?');
        if (snapshot.empty) {
            const text = `"${categoryNameStr}" kategoriyasida mahsulot yo'q.`;
            if (messageId) {
                bot.editMessageText(text, { chat_id: chatId, message_id: messageId });
            } else {
                bot.sendMessage(chatId, text, getMainKeyboard(chatId));
            }
            resetUserState(chatId);
            return;
        }
        const products = snapshot.docs.map(d => {
            const x = d.data();
            return { id: d.id, name: getStr(x.name, 'Noma\'lum') };
        });
        const kb = { reply_markup: { inline_keyboard: [] } };
        for (let i = 0; i < products.length; i += 2) {
            const row = [{ text: products[i].name, callback_data: `update_product_${products[i].id}` }];
            if (i + 1 < products.length) row.push({ text: products[i + 1].name, callback_data: `update_product_${products[i + 1].id}` });
            kb.reply_markup.inline_keyboard.push(row);
        }
        kb.reply_markup.inline_keyboard.push([{ text: "⬅️ Orqaga", callback_data: 'back_to_prev' }]);
        const text = `"${categoryNameStr}" kategoriyasidagi mahsulotlar:`;
        if (messageId) bot.editMessageText(text, { chat_id: chatId, message_id: messageId, reply_markup: kb.reply_markup });
        else bot.sendMessage(chatId, text, kb);
        const state = userState[chatId];
        if (state) state.data.selectedCategory = categoryName;
    } catch (error) {
        console.error("Xato:", error);
    }
}

async function getProductsInCategory(categoryName) {
    if (!db) return 0;
    try {
        const snapshot = await db.collection('products').where('category', '==', categoryName).get();
        return snapshot.size;
    } catch (error) {
        return 0;
    }
}

module.exports = { showProductView, showProductUpdateCategorySelect, showProductsInCategory, getProductsInCategory };
