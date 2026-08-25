const { bot } = require('../config/adminBot');
const { db } = require('../config/firebase');
const { mainKeyboard, backKeyboard, mainBackKeyboard, bulkListKeyboard } = require('../keyboards');
const { userState, resetUserState } = require('../state/userState');
const { getStr } = require('../utils/helpers');
const { formatDateTime } = require('../utils/helpers');
const { showCategoryUpdateSelect } = require('../views/category');
const { showProductUpdateCategorySelect } = require('../views/product');
const { handleVipStep } = require('./vip');



async function handleCommand(chatId, text) {
    const current = userState[chatId];
    if (text !== "❌ Bekor qilish" && current && current.step && current.step !== 'none') {
        bot.sendMessage(
            chatId,
            "⚠️ Siz hozir boshqa jarayon o'rtasidasiz (masalan mahsulot yoki kategoriya qo'shish).\n\n" +
            "Avval uni tugating yoki \"❌ Bekor qilish\" tugmasini bosing — aks holda kiritgan ma'lumotlaringiz yo'qoladi.",
            mainBackKeyboard
        );
        return;
    }
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
        const categoryNames = snapshot.docs.map(d => ({ label: getStr(d.data().name), full: d.data().name, topCategory: d.data().topCategory || "Boshqa (turli mahsulotlar)" }));
        if (categoryNames.length === 0) { bot.sendMessage(chatId, "Avval kategoriya qo'shing.", mainKeyboard); return; }
        userState[chatId] = { step: 'product_name_uz', data: { categoryNames }, steps: [] };
        bot.sendMessage(chatId, "1a. Mahsulot nomini UZ tilida kiriting:", backKeyboard);
        return;
    }

    // ─── ROʻYXAT ORQALI OMMAVIY QOʻSHISH ───────────────────────────
    if (text === "📋 Ro'yxat orqali qo'shish") {
        const snapshot = await db.collection('categories').get();
        const categoryNames = snapshot.docs.map(d => ({ label: getStr(d.data().name), full: d.data().name, topCategory: d.data().topCategory || "Boshqa (turli mahsulotlar)" }));
        userState[chatId] = { step: 'bulk_paste', data: { categoryNames, bulkQueue: [], bulkCreated: [], bulkIndex: 0, bulkMode: 'create' }, steps: [] };
        bot.sendMessage(chatId,
            "📋 Ro'yxat orqali qo'shish\n\n" +
            "Excel'dan IKKITA ustunni birga belgilang — \"Turkum\" (kategoriya) va \"Nomi\" — va nusxa olib shu yerga joylashtiring. Excel ularni avtomatik TAB bilan ajratib qo'yadi, bot esa har qatorni \"kategoriya + nom\" deb o'qiydi.\n\n" +
            "Bir nechta xabarga bo'lib yuborsangiz ham bo'ladi (mas: butun ro'yxatni bir yo'la tashlasangiz, Telegram o'zi bir necha xabarga bo'lib yuboradi — muammo emas). Mavjud bo'lmagan kategoriyalar avtomatik yaratiladi.\n\n" +
            "Hammasini yuborib bo'lgach, \"✅ Barchasi tayyor\" tugmasini bosing.",
            bulkListKeyboard
        );
        return;
    }

    // ─── DRAFT MAHSULOTLARGA RASM+NARX TO'LDIRISH ──────────────────
    if (text === "📸 Draftlarni to'ldirish") {
        const snap = await db.collection('products').where('draft', '==', true).get();
        if (snap.empty) { bot.sendMessage(chatId, "Draft holatidagi (rasm/narxi yo'q) mahsulot yo'q.", mainKeyboard); return; }
        const bulkQueue = snap.docs
            .map(d => ({ productId: d.id, id: d.data().id, name: getStr(d.data().name) }))
            .sort((a, b) => a.id - b.id);
        userState[chatId] = { step: 'bulk_item_image', data: { bulkQueue, bulkCreated: [], bulkIndex: 0, bulkMode: 'fill' }, steps: [] };
        bot.sendMessage(chatId, `📸 ${bulkQueue.length} ta mahsulotda rasm/narx yo'q. Ketma-ket to'ldiramiz.`, mainBackKeyboard);
        bot.sendMessage(chatId, `📦 1/${bulkQueue.length}: ${bulkQueue[0].name}\n\nShu mahsulot uchun rasm yuboring:`);
        return;
    }

    // ─── RASM HAVOLASI O'LIK MAHSULOTLARNI TUZATISH ────────────────
    if (text === "🖼 Buzilgan rasmlarni tuzatish") {
        const snap = await db.collection('products').where('imageBroken', '==', true).get();
        if (snap.empty) { bot.sendMessage(chatId, "Buzilgan rasmli mahsulot yo'q.", mainKeyboard); return; }
        const bulkQueue = snap.docs
            .map(d => ({ productId: d.id, id: d.data().id, name: getStr(d.data().name) }))
            .sort((a, b) => a.id - b.id);
        userState[chatId] = { step: 'fix_image_item', data: { bulkQueue, bulkFixed: [], bulkIndex: 0 }, steps: [] };
        bot.sendMessage(chatId, `🖼 ${bulkQueue.length} ta mahsulotning rasm havolasi o'lik. Ketma-ket yangilaymiz — faqat rasm kerak, narxga tegilmaydi.`, mainBackKeyboard);
        bot.sendMessage(chatId, `📦 1/${bulkQueue.length}: ${bulkQueue[0].name}\n\nShu mahsulot uchun yangi rasm yuboring:`);
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
            const [p, c, o, vip, rateDoc] = await Promise.all([
                db.collection('products').get(),
                db.collection('categories').get(),
                db.collection('orders').get(),
                db.collection('VIP_Clients').get(),
                db.collection('settings').doc('usd_rate').get(),
            ]);
            const rate = rateDoc.exists ? (rateDoc.data().rate || 'Kiritilmagan') : 'Kiritilmagan';

            const uniqueCustomers = new Set();
            o.docs.forEach(doc => {
                const od = doc.data();
                const key = od.telegramChatId || od.customerPhone;
                if (key) uniqueCustomers.add(String(key));
            });

            bot.sendMessage(chatId,
                `📊 Statistika:\n` +
                `🔹 Mahsulotlar: ${p.size}\n` +
                `🔹 Kategoriyalar: ${c.size}\n` +
                `🔹 Buyurtmalar: ${o.size}\n` +
                `🔹 Mijozlar: ${uniqueCustomers.size}\n` +
                `🔹 VIP: ${vip.size}\n` +
                `💱 USD kurs: 1 USD = ${typeof rate === 'number' ? rate.toLocaleString('uz-UZ') : rate} so'm`,
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
                const totalStr = (o.totalUZS || 0).toLocaleString('uz-UZ');
                const btn = `${emoji} ${o.customerName || o.username || 'Noma\'lum'} | ${totalStr} so'm | 🕐 ${formatDateTime(o.createdAt)}`;
                kb.inline_keyboard.push([{ text: btn, callback_data: `order_detail_${doc.id}` }]);
            });
            kb.inline_keyboard.push([{ text: "🔙 Bosh menyu", callback_data: "close_orders_list" }]);
            bot.sendMessage(chatId, "📦 So'nggi 10 ta buyurtma:", { reply_markup: kb });
        } catch (error) {
            bot.sendMessage(chatId, "❌ Xato!", mainKeyboard);
        }
        return;
    }

    // ─── BANNER QO'SHISH ─────────────────────────────────────────
    if (text === "🖼 Banner qo'shish") {
        userState[chatId] = { step: 'banner_image', data: {}, steps: [] };
        bot.sendMessage(chatId, "🖼 Yangi banner rasmini yuboring (photo formatida):", backKeyboard);
        return;
    }

    // ─── BANNERNI O'CHIRISH ──────────────────────────────────────
    if (text === "🗑 Bannerni o'chirish") {
        try {
            const snapshot = await db.collection('banners').orderBy('order', 'asc').get();
            if (snapshot.empty) { bot.sendMessage(chatId, "Bannerlar yo'q.", mainKeyboard); return; }
            const kb = { inline_keyboard: [] };
            snapshot.docs.forEach((doc, i) => {
                kb.inline_keyboard.push([{ text: `🖼 Banner ${i + 1}`, callback_data: `delete_banner_${doc.id}` }]);
            });
            bot.sendMessage(chatId, "🗑 O'chirmoqchi bo'lgan bannerni tanlang:", { reply_markup: kb });
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