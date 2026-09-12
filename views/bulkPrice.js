const { bot } = require('../config/adminBot');
const { db } = require('../config/firebase');
const { getMainKeyboard } = require('../keyboards');
const { getStr } = require('../utils/helpers');

// "Mahsulotni yangilash" bilan bir xil "categories" kolleksiyasidan
// kategoriya ro'yxatini ko'rsatadi, lekin tanlangandan keyin BITTA
// mahsulotga emas — o'sha kategoriyadagi BARCHA mahsulotlarga bitta
// narxni birdaniga qo'yish oqimiga olib boradi (masalan X-tra'ning
// hamma rangdagi mahsulotlari bir xil narxda bo'lganda foydali).
async function showBulkPriceCategorySelect(chatId, messageId = null) {
    try {
        const snapshot = await db.collection('categories').get();
        if (snapshot.empty) {
            const text = "Hech qanday subkategoriya topilmadi.";
            if (messageId) bot.editMessageText(text, { chat_id: chatId, message_id: messageId });
            else bot.sendMessage(chatId, text, getMainKeyboard(chatId));
            return;
        }
        const cats = snapshot.docs.map((d) => {
            const x = d.data();
            return { id: x.id, name: getStr(x.name), icon: x.icon || x.icon_url || '📁' };
        });
        const kb = { inline_keyboard: [] };
        for (let i = 0; i < cats.length; i += 2) {
            const label1 = `${cats[i].icon} ${cats[i].name}`.trim();
            const row = [{ text: label1 || '?', callback_data: `bulkprice_cat_${cats[i].id}` }];
            if (i + 1 < cats.length) {
                const label2 = `${cats[i + 1].icon} ${cats[i + 1].name}`.trim();
                row.push({ text: label2 || '?', callback_data: `bulkprice_cat_${cats[i + 1].id}` });
            }
            kb.inline_keyboard.push(row);
        }
        const text = "💰 Narxni ommaviy o'zgartirish\n\nQaysi subkategoriyadagi BARCHA mahsulotlarga bitta narx qo'ymoqchisiz?";
        if (messageId) await bot.editMessageText(text, { chat_id: chatId, message_id: messageId, reply_markup: kb });
        else await bot.sendMessage(chatId, text, { reply_markup: kb });
    } catch (error) {
        console.error('Bulk narx kategoriya ro\'yxati xato:', error);
        bot.sendMessage(chatId, '❌ Xato!', getMainKeyboard(chatId));
    }
}

// Tanlangan kategoriyadagi mahsulotlar sonini va joriy narxlar oralig'ini
// ko'rsatib, qaysi narx turini (dona/karobka) o'zgartirishni so'raydi.
async function showBulkPriceFieldSelect(chatId, categoryName, messageId = null) {
    try {
        const snapshot = await db.collection('products').where('category', '==', categoryName).get();
        const categoryNameStr = getStr(categoryName, '?');
        if (snapshot.empty) {
            const text = `"${categoryNameStr}" subkategoriyasida mahsulot yo'q.`;
            if (messageId) await bot.editMessageText(text, { chat_id: chatId, message_id: messageId });
            else await bot.sendMessage(chatId, text, getMainKeyboard(chatId));
            return;
        }
        const prices = snapshot.docs.map((d) => d.data().pricePiece || 0).filter((p) => p > 0);
        const boxPrices = snapshot.docs.map((d) => d.data().priceBox || 0).filter((p) => p > 0);
        const priceRange = prices.length ? `$${Math.min(...prices)}–$${Math.max(...prices)}` : 'belgilanmagan';
        const boxRange = boxPrices.length ? `$${Math.min(...boxPrices)}–$${Math.max(...boxPrices)}` : 'belgilanmagan';
        const text =
            `"${categoryNameStr}" subkategoriyasida ${snapshot.size} ta mahsulot bor.\n` +
            `Hozirgi narx (dona): ${priceRange}\n` +
            `Hozirgi narx (karobka): ${boxRange}\n\n` +
            `Qaysi narx turini hammasiga birdaniga o'rnatasiz?`;
        const kb = {
            inline_keyboard: [
                [{ text: '💵 Narx (dona, USD)', callback_data: `bulkprice_field_pricePiece` }],
                [{ text: '📦 Narx (karobka, USD)', callback_data: `bulkprice_field_priceBox` }],
                [{ text: "⬅️ Orqaga", callback_data: 'back_to_prev' }],
            ],
        };
        if (messageId) await bot.editMessageText(text, { chat_id: chatId, message_id: messageId, reply_markup: kb });
        else await bot.sendMessage(chatId, text, { reply_markup: kb });
    } catch (error) {
        console.error('Bulk narx maydon tanlashda xato:', error);
        bot.sendMessage(chatId, '❌ Xato!', getMainKeyboard(chatId));
    }
}

module.exports = { showBulkPriceCategorySelect, showBulkPriceFieldSelect };
