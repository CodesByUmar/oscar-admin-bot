const { bot } = require('../config/adminBot');
const { db } = require('../config/firebase');
const { getMainKeyboard } = require('../keyboards');

const PAGE_SIZE = 8;

// Banner bosilganda mini-appda qaysi sahifaga o'tishini tanlash uchun
// mavjud top-kategoriyalar ro'yxati (products'dan hisoblanadi — oscar-ui'ning
// Categories.tsx qilgani kabi, alohida kolleksiya yo'q).
async function getTopCategoryKeys() {
    const snapshot = await db.collection('products').get();
    const set = new Set();
    snapshot.forEach((doc) => {
        const top = doc.data().topCategory;
        const key = typeof top === 'string' ? top.trim() : '';
        if (key) set.add(key);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
}

async function showBannerManageList(chatId, messageId = null) {
    try {
        const snapshot = await db.collection('banners').orderBy('order', 'asc').get();
        if (snapshot.empty) {
            const text = "Bannerlar yo'q.";
            if (messageId) await bot.editMessageText(text, { chat_id: chatId, message_id: messageId });
            else await bot.sendMessage(chatId, text, getMainKeyboard(chatId));
            return;
        }
        const kb = { inline_keyboard: [] };
        snapshot.docs.forEach((doc, i) => {
            const status = doc.data().link ? '🔗' : '⭕';
            kb.inline_keyboard.push([{ text: `${status} Banner ${i + 1}`, callback_data: `banner_link_page_${doc.id}_0` }]);
        });
        const text = "🔗 Havolasini o'rnatmoqchi bo'lgan bannerni tanlang:\n\n🔗 — havola bor, ⭕ — havola yo'q.";
        if (messageId) await bot.editMessageText(text, { chat_id: chatId, message_id: messageId, reply_markup: kb });
        else await bot.sendMessage(chatId, text, { reply_markup: kb });
    } catch (error) {
        console.error("Banner ro'yxatini olishda xato:", error);
        bot.sendMessage(chatId, '❌ Xato!', getMainKeyboard(chatId));
    }
}

async function showBannerLinkPicker(chatId, bannerId, messageId = null, page = 0) {
    try {
        const [keys, bannerDoc] = await Promise.all([
            getTopCategoryKeys(),
            db.collection('banners').doc(bannerId).get(),
        ]);
        if (!bannerDoc.exists) {
            const text = "Bu banner topilmadi (o'chirilgan bo'lishi mumkin).";
            if (messageId) await bot.editMessageText(text, { chat_id: chatId, message_id: messageId });
            else await bot.sendMessage(chatId, text, getMainKeyboard(chatId));
            return;
        }
        const currentLink = bannerDoc.data().link || null;
        const totalPages = Math.max(1, Math.ceil(keys.length / PAGE_SIZE));
        const safePage = Math.min(Math.max(page, 0), totalPages - 1);
        const pageItems = keys.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

        const kb = { inline_keyboard: [] };
        pageItems.forEach((key) => {
            const globalIndex = keys.indexOf(key);
            const isCurrent = currentLink === `/categories/${encodeURIComponent(key)}`;
            const label = `${isCurrent ? '✅' : '🗂'} ${key}`.slice(0, 60);
            kb.inline_keyboard.push([{ text: label, callback_data: `banner_link_setcat_${bannerId}_${globalIndex}` }]);
        });
        const navRow = [];
        if (safePage > 0) navRow.push({ text: '⬅️ Oldingi', callback_data: `banner_link_page_${bannerId}_${safePage - 1}` });
        if (safePage < totalPages - 1) navRow.push({ text: 'Keyingi ➡️', callback_data: `banner_link_page_${bannerId}_${safePage + 1}` });
        if (navRow.length) kb.inline_keyboard.push(navRow);
        kb.inline_keyboard.push([{ text: "🔗 Qo'lda havola kiritish", callback_data: `banner_link_manual_${bannerId}` }]);
        if (currentLink) kb.inline_keyboard.push([{ text: "🗑 Havolani o'chirish", callback_data: `banner_link_clear_${bannerId}` }]);
        kb.inline_keyboard.push([{ text: "⬅️ Bannerlar ro'yxatiga", callback_data: 'banner_link_back' }]);

        const text =
            "🔗 Banner uchun havola tanlang (bosilganda shu kategoriyaga o'tadi):\n" +
            `Sahifa ${safePage + 1}/${totalPages}\n\n` +
            (currentLink ? `Hozirgi havola: ${currentLink}` : "Hozircha havola yo'q.");

        if (messageId) await bot.editMessageText(text, { chat_id: chatId, message_id: messageId, reply_markup: kb });
        else await bot.sendMessage(chatId, text, { reply_markup: kb });
    } catch (error) {
        console.error('Banner havola tanlashda xato:', error);
        bot.sendMessage(chatId, '❌ Xato!', getMainKeyboard(chatId));
    }
}

module.exports = { showBannerManageList, showBannerLinkPicker, getTopCategoryKeys };
