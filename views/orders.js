// Buyurtmalar ro'yxati — sahifalab ko'rsatish (faqat so'nggi 10 tasi
// emas, "Eskiroq" tugmasi bilan istalgancha eski buyurtmalarga borish
// mumkin). Firestore cursor-based pagination: har bir sahifadagi eng
// eski/eng yangi buyurtma vaqti (createdAt) callback_data'da millisekund
// sifatida yuboriladi.
const { bot } = require('../config/adminBot');
const { db, admin } = require('../config/firebase');
const { formatDateTime } = require('../utils/helpers');

const PAGE_SIZE = 10;

function statusEmoji(status) {
    return status === 'confirmed' ? '✅' : status === 'cancelled' ? '❌' : status === 'delivered' ? '🏁' : '🆕';
}

function orderLine(doc) {
    const o = doc.data();
    const totalStr = (o.totalUZS || 0).toLocaleString('uz-UZ');
    return `${statusEmoji(o.status)} ${o.customerName || o.username || "Noma'lum"} | ${totalStr} so'm | 🕐 ${formatDateTime(o.createdAt)}`;
}

// `createdAt` har doim ham Firestore Timestamp bo'lmasligi mumkin
// (ba'zi buyurtmalar mijoz ilovasi tomonidan boshqacha formatda
// yozilgan bo'lishi ehtimoli bor) — shu sabab .toMillis() to'g'ridan-to'g'ri
// chaqirilmaydi, formatDateTime kabi bir nechta formatni qo'llab-quvvatlaydi.
function toMillisSafe(ts) {
    if (!ts) return Date.now();
    if (typeof ts.toMillis === 'function') return ts.toMillis();
    if (typeof ts.toDate === 'function') return ts.toDate().getTime();
    if (ts instanceof Date) return ts.getTime();
    const parsed = new Date(ts).getTime();
    return Number.isNaN(parsed) ? Date.now() : parsed;
}

// direction: null (birinchi sahifa), 'next' (eskiroq), 'prev' (yangiroq)
async function showOrdersPage(chatId, messageId = null, direction = null, cursorMillis = null, depth = 0) {
    if (!db) { bot.sendMessage(chatId, "❌ Database ulanmagan."); return; }
    try {
        let docs;
        if (direction === 'next' && cursorMillis) {
            const snap = await db.collection('orders')
                .orderBy('createdAt', 'desc')
                .startAfter(admin.firestore.Timestamp.fromMillis(cursorMillis))
                .limit(PAGE_SIZE)
                .get();
            docs = snap.docs;
        } else if (direction === 'prev' && cursorMillis) {
            const snap = await db.collection('orders')
                .orderBy('createdAt', 'asc')
                .startAfter(admin.firestore.Timestamp.fromMillis(cursorMillis))
                .limit(PAGE_SIZE)
                .get();
            docs = snap.docs.reverse();
        } else {
            const snap = await db.collection('orders').orderBy('createdAt', 'desc').limit(PAGE_SIZE).get();
            docs = snap.docs;
        }

        if (docs.length === 0) {
            const text = depth === 0 ? "Buyurtmalar yo'q." : "Boshqa buyurtma yo'q.";
            if (messageId) await bot.editMessageText(text, { chat_id: chatId, message_id: messageId });
            else await bot.sendMessage(chatId, text);
            return;
        }

        const kb = { inline_keyboard: [] };
        docs.forEach((doc) => {
            kb.inline_keyboard.push([{ text: orderLine(doc).slice(0, 64), callback_data: `order_detail_${doc.id}` }]);
        });

        const oldestMillis = toMillisSafe(docs[docs.length - 1].data().createdAt);
        const newestMillis = toMillisSafe(docs[0].data().createdAt);

        const nav = [];
        if (depth > 0) nav.push({ text: '⬅️ Yangiroq', callback_data: `orders_page_prev_${newestMillis}_${depth - 1}` });
        if (docs.length === PAGE_SIZE) nav.push({ text: 'Eskiroq ➡️', callback_data: `orders_page_next_${oldestMillis}_${depth + 1}` });
        if (nav.length) kb.inline_keyboard.push(nav);

        kb.inline_keyboard.push([{ text: "🔙 Bosh menyu", callback_data: "close_orders_list" }]);

        const title = depth === 0
            ? `📦 So'nggi ${docs.length} ta buyurtma:`
            : `📦 Buyurtmalar — ${depth + 1}-sahifa:`;

        if (messageId) {
            await bot.editMessageText(title, { chat_id: chatId, message_id: messageId, reply_markup: kb });
        } else {
            await bot.sendMessage(chatId, title, { reply_markup: kb });
        }
    } catch (error) {
        console.error("Buyurtmalar ro'yxati xato:", error);
        const text = "❌ Xato!";
        if (messageId) bot.editMessageText(text, { chat_id: chatId, message_id: messageId }).catch(() => {});
        else bot.sendMessage(chatId, text);
    }
}

module.exports = { showOrdersPage };
