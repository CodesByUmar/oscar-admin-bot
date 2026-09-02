const { bot } = require('../config/adminBot');
const { db } = require('../config/firebase');
const { getMainKeyboard } = require('../keyboards');

const PAGE_SIZE = 8;

// `categoryTranslations` kolleksiyasidagi hujjat ID'si — kalit
// (topCategory/category'ning o'zbekcha qiymati) "/" kabi Firestore doc ID'da
// taqiqlangan belgilarni o'z ichiga olishi mumkin (masalan
// "Suyuq mixlar/Tomchi yelim"), shuning uchun ID'ni shu funksiya orqali
// deterministik ravishda hosil qilamiz. oscar-ui ham AYNAN shu mantiqni
// ishlatadi (ikkalasi ham bir xil ID'ga kelishi kerak).
function keyToDocId(key) {
    return encodeURIComponent(key).replace(/%/g, '_');
}

// products kolleksiyasidan barcha noyob topCategory (🗂) va category (📁)
// qiymatlarini yig'ib chiqadi — bular uchun markazlashtirilgan alohida
// kolleksiya yo'q, shuning uchun har safar mahsulotlardan hisoblanadi
// (oscar-ui'ning Categories.tsx/SubcategoryList.tsx qilgani kabi).
async function collectCategoryKeys() {
    const snapshot = await db.collection('products').get();
    const map = new Map(); // docId -> { key, type }
    snapshot.forEach((doc) => {
        const d = doc.data();
        const top = typeof d.topCategory === 'string' ? d.topCategory.trim() : '';
        if (top) {
            const id = keyToDocId(top);
            if (!map.has(id)) map.set(id, { key: top, type: 'top' });
        }
        const cat = typeof d.category === 'string' ? d.category.trim() : '';
        if (cat) {
            const id = keyToDocId(cat);
            if (!map.has(id)) map.set(id, { key: cat, type: 'sub' });
        }
    });
    return Array.from(map.entries()).map(([docId, v]) => ({ docId, ...v }));
}

async function showCategoryTranslationList(chatId, messageId = null, page = 0) {
    try {
        const [keys, trSnap] = await Promise.all([
            collectCategoryKeys(),
            db.collection('categoryTranslations').get(),
        ]);
        const translated = new Set(trSnap.docs.filter((d) => d.data().ru).map((d) => d.id));

        // Tarjimasi hali yo'qlar ro'yxat boshida — admin ishini tezlashtirish uchun.
        keys.sort((a, b) => {
            const at = translated.has(a.docId) ? 1 : 0;
            const bt = translated.has(b.docId) ? 1 : 0;
            if (at !== bt) return at - bt;
            if (a.type !== b.type) return a.type === 'top' ? -1 : 1;
            return a.key.localeCompare(b.key);
        });

        const totalPages = Math.max(1, Math.ceil(keys.length / PAGE_SIZE));
        const safePage = Math.min(Math.max(page, 0), totalPages - 1);
        const pageItems = keys.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

        const kb = { inline_keyboard: [] };
        pageItems.forEach((item) => {
            const status = translated.has(item.docId) ? '✅' : '❌';
            const typeIcon = item.type === 'top' ? '🗂' : '📁';
            const label = `${status} ${typeIcon} ${item.key}`.slice(0, 60);
            kb.inline_keyboard.push([{ text: label, callback_data: `cattr_edit_${item.docId}` }]);
        });

        const navRow = [];
        if (safePage > 0) navRow.push({ text: '⬅️ Oldingi', callback_data: `cattr_page_${safePage - 1}` });
        if (safePage < totalPages - 1) navRow.push({ text: 'Keyingi ➡️', callback_data: `cattr_page_${safePage + 1}` });
        if (navRow.length) kb.inline_keyboard.push(navRow);
        kb.inline_keyboard.push([{ text: '🏠 Bosh menyu', callback_data: 'close_cattr_list' }]);

        const doneCount = keys.filter((k) => translated.has(k.docId)).length;
        const text =
            `🌐 Kategoriya tarjimalari (${doneCount}/${keys.length} to'ldirilgan)\n` +
            `Sahifa ${safePage + 1}/${totalPages}\n\n` +
            `🗂 — top-kategoriya, 📁 — subkategoriya. Tahrirlash uchun tanlang:`;

        if (messageId) {
            await bot.editMessageText(text, { chat_id: chatId, message_id: messageId, reply_markup: kb });
        } else {
            await bot.sendMessage(chatId, text, { reply_markup: kb });
        }
    } catch (error) {
        console.error("Kategoriya tarjimalari ro'yxati xato:", error);
        bot.sendMessage(chatId, '❌ Xato yuz berdi.', getMainKeyboard(chatId));
    }
}

async function findCategoryKeyItem(docId) {
    const keys = await collectCategoryKeys();
    return keys.find((k) => k.docId === docId) || null;
}

async function showCategoryTranslationEdit(chatId, docId, messageId) {
    try {
        const [keys, doc] = await Promise.all([
            collectCategoryKeys(),
            db.collection('categoryTranslations').doc(docId).get(),
        ]);
        const item = keys.find((k) => k.docId === docId);
        if (!item) {
            await bot.editMessageText('Bu kategoriya endi mahsulotlarda topilmadi (o\'chirilgan bo\'lishi mumkin).', { chat_id: chatId, message_id: messageId });
            return;
        }
        const trData = doc.exists ? doc.data() : {};
        const typeLabel = item.type === 'top' ? 'Top-kategoriya' : 'Subkategoriya';
        const text =
            `✏️ ${typeLabel}: ${item.key}\n\n` +
            `🇷🇺 RU: ${trData.ru || '— kiritilmagan'}\n` +
            `🇬🇧 EN: ${trData.en || '— kiritilmagan'}\n\n` +
            `Nimani tahrirlaysiz?`;
        const kb = {
            inline_keyboard: [
                [{ text: '🇷🇺 RU nomni kiritish', callback_data: `cattr_setru_${docId}` }],
                [{ text: '🇬🇧 EN nomni kiritish', callback_data: `cattr_seten_${docId}` }],
                [{ text: "⬅️ Ro'yxatga qaytish", callback_data: 'cattr_page_0' }],
            ],
        };
        await bot.editMessageText(text, { chat_id: chatId, message_id: messageId, reply_markup: kb });
    } catch (error) {
        console.error('Kategoriya tarjimasini ko\'rishda xato:', error);
    }
}

module.exports = { showCategoryTranslationList, showCategoryTranslationEdit, findCategoryKeyItem, keyToDocId };
