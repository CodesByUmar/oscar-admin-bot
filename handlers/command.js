const { bot } = require('../config/adminBot');
const { db } = require('../config/firebase');
const { mainKeyboard, backKeyboard } = require('../keyboards');
const { userState, resetUserState } = require('../state/userState');
const { getStr } = require('../utils/helpers');
const { formatDateTime } = require('../utils/helpers');
const { showCategoryUpdateSelect } = require('../views/category');
const { showProductUpdateCategorySelect } = require('../views/product');
const { handleVipStep } = require('./vip');

// ====================== YANGI O'ZGARISHLAR ======================
// 1. USD kurs o'rnatish O'CHIRILDI (faqat UZS)
// 2. Statistika dan USD kurs olib tashlandi
// 3. Call Center raqami qo'shildi (🆘 Yordam bo'limida)
// 4. Barcha narxlar UZS formatda

async function handleCommand(chatId, text) {
    resetUserState(chatId);
    if (!db) { bot.sendMessage(chatId, "❌ Database ulanmagan.", mainKeyboard); return; }

    // ─── VIP ──────────────────────────────────────────────────────────
    if (text === "⭐ VIP qo'shish") {
        userState[chatId] = { step: 'vip_add_id', data: {}, steps: [] };
        bot.sendMessage(chatId, "👤 VIP qo'shish\n\nTelegram ID yoki @username kiriting:", backKeyboard);
        return;
    }
    if (text === "🗑 VIP o'chirish") {
        userState[chatId] = { step: 'vip_remove_id', data: {}, steps: [] };
        bot.sendMessage(chatId, "🗑 VIP o'chirish\n\nTelegram ID yoki @username kiriting:", backKeyboard);
        return;
    }

    // ─── MAHSULOT QO'SHISH ─────────────────────────────────────────
    if (text === "🛍 Mahsulot qo'shish") {
        const snapshot = await db.collection('categories').get();
        const categoryNames = snapshot.docs.map(d => ({ label: getStr(d.data().name), full: d.data().name }));
        if (categoryNames.length === 0) { bot.sendMessage(chatId, "Avval kategoriya qo'shing.", mainKeyboard); return; }
        userState[chatId] = { step: 'product_name_uz', data: { categoryNames }, steps: [] };
        bot.sendMessage(chatId, "1a. Mahsulot nomini UZ tilida kiriting:", backKeyboard);
        return;
    }

    // ─── KATEGORIYA ────────────────────────────────────────────────
    if (text === "📂 Kategoriya qo'shish") {
        userState[chatId] = { step: 'category_name', data: {}, steps: [] };
        bot.sendMessage(chatId, "1/2. Kategoriya nomini kiriting:", backKeyboard);
        return;
    }
    if (text === "📂 Kategoriya yangilash") {
        userState[chatId] = { step: 'category_update_select', data: {}, steps: [] };
        await showCategoryUpdateSelect(chatId);
        return;
    }
    if (text === "🔄 Mahsulotni yangilash") {
        userState[chatId] = { step: 'product_update_category_select', data: {}, steps: [] };
        await showProductUpdateCategorySelect(chatId);
        return;
    }

    // ❌ USD KURS O'CHIRILDI (3-4-O'ZGARISH)
    // Endi faqat UZS ishlatiladi

    // ─── STATISTIKA ────────────────────────────────────────────────
    if (text === "📊 Statistika") {
        try {
            const [p, c, o, vip] = await Promise.all([
                db.collection('products').get(),
                db.collection('categories').get(),
                db.collection('orders').get(),
                db.collection('VIP_Clients').get(),
            ]);

            const uniqueCustomers = new Set();
            o.docs.forEach(doc => {
                const od = doc.data();
                const key = od.telegramChatId || od.customerPhone;
                if (key) uniqueCustomers.add(String(key));
            });

            // 🔥 USD kurs olib tashlandi
            bot.sendMessage(chatId,
                `📊 Statistika:\n` +
                `🔹 Mahsulotlar: ${p.size}\n` +
                `🔹 Kategoriyalar: ${c.size}\n` +
                `🔹 Buyurtmalar: ${o.size}\n` +
                `🔹 Mijozlar: ${uniqueCustomers.size}\n` +
                `🔹 VIP: ${vip.size}`,
                mainKeyboard
            );
        } catch (error) {
            console.error("Statistika xato:", error);
            bot.sendMessage(chatId, "❌ Xato!", mainKeyboard);
        }
        return;
    }

    // ─── BUYURTMALAR RO'YXATI ───────────────────────────────────────
    if (text === "📦 Buyurtmalar") {
        try {
            const snapshot = await db.collection('orders').orderBy('createdAt', 'desc').limit(10).get();
            if (snapshot.empty) { bot.sendMessage(chatId, "Buyurtmalar yo'q.", mainKeyboard); return; }
            const kb = { inline_keyboard: [] };
            snapshot.docs.forEach(doc => {
                const o = doc.data();
                let addressShort = '';
                if (o.deliveryMethod === 'pickup') {
                    addressShort = `🏪 O'zim olib ketaman`;
                } else {
                    const addr = o.deliveryAddress || o.address || '';
                    addressShort = addr ? `📍 ${addr.length > 25 ? addr.substring(0, 25) + '…' : addr}` : `📍 Manzil yo'q`;
                }
                const emoji = o.status === 'confirmed' ? '✅' : o.status === 'cancelled' ? '❌' : o.status === 'delivered' ? '🏁' : '🆕';
                // 🔥 totalUZS → total (UZS)
                const totalStr = (o.total || o.totalUZS || 0).toLocaleString('uz-UZ');
                const btn = `${emoji} ${o.customerName || o.username || 'Noma\'lum'} | ${totalStr} UZS | 🕐 ${formatDateTime(o.createdAt)}`;
                kb.inline_keyboard.push([{ text: btn, callback_data: `order_detail_${doc.id}` }]);
            });
            kb.inline_keyboard.push([{ text: "🔙 Bosh menyu", callback_data: "close_orders_list" }]);
            bot.sendMessage(chatId, "📦 So'nggi 10 ta buyurtma:", { reply_markup: kb });
        } catch (error) {
            bot.sendMessage(chatId, "❌ Xato!", mainKeyboard);
        }
        return;
    }

    // ─── 🆘 YORDAM (YANGI: Call Center qo'shildi) ──────────────────
    if (text === "🆘 Yordam") {
        bot.sendMessage(chatId,
            `📞 Yordam xizmati:\n\n` +
            `📱 Call Center: +998 55 511 11 66\n` +
            `🕐 Ish vaqti: 24/7\n\n` +
            `Savolingizni yozing yoki qo'ng'iroq qiling.`,
            mainKeyboard
        );
        return;
    }

    // ─── BEKOR QILISH ──────────────────────────────────────────────
    if (text === "❌ Bekor qilish") {
        resetUserState(chatId);
        bot.sendMessage(chatId, "Bekor qilindi.", mainKeyboard);
        return;
    }

    bot.sendMessage(chatId, "Tugmalardan tanlang:", mainKeyboard);
}

module.exports = { handleCommand, handleVipStep };