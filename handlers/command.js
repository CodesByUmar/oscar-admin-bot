const { bot } = require('../config/adminBot');
const { db } = require('../config/firebase');
const { mainKeyboard, backKeyboard } = require('../keyboards');
const { userState, resetUserState } = require('../state/userState');
const { getStr } = require('../utils/helpers');
// import qatoringizga formatDateTime qo'shing (mavjud import'ni tekshiring, masalan:)
const { formatDateTime } = require('../utils/helpers');
const { showCategoryUpdateSelect } = require('../views/category');
const { showProductUpdateCategorySelect } = require('../views/product');
const { handleVipStep } = require('./vip');



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

    // ─── MIJOZLAR ──────────────────────────────────────────────────
    // if (text === "👥 Mijoz qo'shish") {
    //     userState[chatId] = { step: 'customer_firstName', data: {}, steps: [] };
    //     bot.sendMessage(chatId, "1/5. Mijozning ismini kiriting:", backKeyboard);
    //     return;
    // }
    // if (text === "👥 Mijozlar ro'yxati") {
    //     try {
    //         const snapshot = await db.collection('customers').orderBy('createdAt', 'desc').limit(20).get();
    //         if (snapshot.empty) { bot.sendMessage(chatId, "Hali mijozlar yo'q.", mainKeyboard); return; }
    //         let msg = `👥 Mijozlar ro'yxati (oxirgi 20):\n\n`;
    //         snapshot.docs.forEach((doc, idx) => {
    //             const c = doc.data();
    //             const tgStatus = c.telegramId ? `✅ TG: ${c.telegramId}` : `⏳ Hali kirmagan`;
    //             msg += `${idx + 1}. ${c.firstName} ${c.lastName}\n`;
    //             msg += `   📞 ${c.phone}\n`;
    //             msg += `   🔑 Login: ${c.login} | Parol: ${c.password}\n`;
    //             msg += `   ${tgStatus}\n`;
    //             msg += `   📦 Buyurtmalar: ${c.totalOrders || 0} ta\n\n`;
    //         });
    //         bot.sendMessage(chatId, msg, mainKeyboard);
    //     } catch (error) {
    //         bot.sendMessage(chatId, "❌ Xato!", mainKeyboard);
    //     }
    //     return;
    // }

    // ─── USD KURS ──────────────────────────────────────────────────
    if (text === "💱 USD kurs") {
        try {
            const doc = await db.collection('settings').doc('usd_rate').get();
            const currentRate = doc.exists ? (doc.data().rate || 0) : 0;
            const currentText = currentRate > 0
                ? `💱 Hozirgi kurs: 1 USD = ${currentRate.toLocaleString('uz-UZ')} so'm\n\n`
                : `💱 Kurs hali o'rnatilmagan.\n\n`;
            userState[chatId] = { step: 'set_usd_rate', data: {}, steps: [] };
            bot.sendMessage(chatId, `${currentText}Yangi kursni kiriting (mas: 12600):`, backKeyboard);
        } catch (error) {
            userState[chatId] = { step: 'set_usd_rate', data: {}, steps: [] };
            bot.sendMessage(chatId, "Yangi USD kursni kiriting (mas: 12600):", backKeyboard);
        }
        return;
    }

    // ─── STATISTIKA ────────────────────────────────────────────────
    if (text === "📊 Statistika") {
        try {
            const [p, c, o, cust, vip, rateDoc] = await Promise.all([
                db.collection('products').get(),
                db.collection('categories').get(),
                db.collection('orders').get(),
                db.collection('customers').get(),
                db.collection('VIP_Clients').get(),
                db.collection('settings').doc('usd_rate').get(),
            ]);
            const rate = rateDoc.exists ? (rateDoc.data().rate || 'Kiritilmagan') : 'Kiritilmagan';
            bot.sendMessage(chatId,
                `📊 Statistika:\n` +
                `🔹 Mahsulotlar: ${p.size}\n` +
                `🔹 Kategoriyalar: ${c.size}\n` +
                `🔹 Buyurtmalar: ${o.size}\n` +
                `🔹 Mijozlar: ${cust.size}\n` +
                `🔹 VIP: ${vip.size}\n` +
                `💱 USD kurs: 1 USD = ${typeof rate === 'number' ? rate.toLocaleString('uz-UZ') : rate} so'm`,
                mainKeyboard
            );
        } catch (error) {
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
                // Manzil qisqa ko'rinishda
                let addressShort = '';
                if (o.deliveryMethod === 'pickup') {
                    addressShort = `🏪 O'zim olib ketaman`;
                } else {
                    const addr = o.deliveryAddress || o.address || '';
                    addressShort = addr ? `📍 ${addr.length > 25 ? addr.substring(0, 25) + '…' : addr}` : `📍 Manzil yo'q`;
                }
                const emoji = o.status === 'confirmed' ? '✅' : o.status === 'cancelled' ? '❌' : o.status === 'delivered' ? '🏁' : '🆕';
                const totalStr = (o.totalUZS || 0).toLocaleString('uz-UZ');
                // YANGI:
                const btn = `${emoji} ${o.customerName || 'Noma\'lum'} | ${totalStr} so'm | 🕐 ${formatDateTime(o.createdAt)}`;
                kb.inline_keyboard.push([{ text: btn, callback_data: `order_detail_${doc.id}` }]);
            });
            bot.sendMessage(chatId, "📦 So'nggi 10 ta buyurtma:", { reply_markup: kb });
        } catch (error) {
            bot.sendMessage(chatId, "❌ Xato!", mainKeyboard);
        }
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
