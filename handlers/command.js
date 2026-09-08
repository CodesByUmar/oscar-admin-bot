const { bot } = require('../config/adminBot');
const { db } = require('../config/firebase');
const { mainKeyboard, backKeyboard, mainBackKeyboard, isSuperAdmin, getMainKeyboard, getMainBackKeyboard } = require('../keyboards');
const { userState, resetUserState } = require('../state/userState');
const { getStr } = require('../utils/helpers');
const { showCategoryUpdateSelect } = require('../views/category');
const { showCategoryTranslationList } = require('../views/categoryTranslation');
const { showBannerManageList } = require('../views/banner');
const { showStatisticsMenu } = require('../views/statistics');
const { showOrdersPage } = require('../views/orders');
const { showBulkPriceCategorySelect } = require('../views/bulkPrice');
const { showProductUpdateCategorySelect } = require('../views/product');
const { handleVipStep } = require('./vip');
const { generateMonthlyReportBuffer } = require('../utils/monthlyReport');
const { generateAllOrdersReportBuffer } = require('../utils/ordersExport');



async function handleCommand(chatId, text) {
    const current = userState[chatId];
    if (text !== "❌ Bekor qilish" && current && current.step && current.step !== 'none') {
        bot.sendMessage(
            chatId,
            "⚠️ Siz hozir boshqa jarayon o'rtasidasiz (masalan mahsulot yoki kategoriya qo'shish).\n\n" +
            "Avval uni tugating yoki \"❌ Bekor qilish\" tugmasini bosing — aks holda kiritgan ma'lumotlaringiz yo'qoladi.",
            getMainBackKeyboard(chatId)
        );
        return;
    }
    resetUserState(chatId);
    if (!db) { bot.sendMessage(chatId, "❌ Database ulanmagan.", getMainKeyboard(chatId)); return; }

    // ─── FAQAT SUPER ADMIN UCHUN ────────────────────────────────────
    const superAdminOnly = ["⭐ VIP qo'shish", "🗑 VIP o'chirish", "💱 USD kurs", "🗑 Bannerni o'chirish", "🔗 Banner havolasi", "📅 Oylik hisobot", "🌐 Kategoriya tarjimalari"];
    if (superAdminOnly.includes(text) && !isSuperAdmin(chatId)) {
        bot.sendMessage(chatId, "⛔ Bu amal faqat super adminlar uchun.", getMainKeyboard(chatId));
        return;
    }

    // ─── ADMIN QO'SHISH (istalgan admin ishlata oladi, super admin shart emas) ──
    if (text === "➕ Admin qo'shish") {
        userState[chatId] = { step: 'admin_add_id', data: {}, steps: [] };
        bot.sendMessage(chatId, "➕ Yangi admin qo'shish\n\nTelegram ID kiriting:", backKeyboard);
        return;
    }

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
        const categoryNames = snapshot.docs.map(d => ({ label: getStr(d.data().name), full: d.data().name, topCategory: d.data().topCategory || null }));
        if (categoryNames.length === 0) { bot.sendMessage(chatId, "Avval kategoriya qo'shing.", getMainKeyboard(chatId)); return; }
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
    if (text === "💰 Narxni ommaviy o'zgartirish") {
        userState[chatId] = { step: 'bulkprice_category_select', data: {}, steps: [] };
        await showBulkPriceCategorySelect(chatId);
        return;
    }
    if (text === "🔍 Qidiruv") {
        userState[chatId] = { step: 'search_query', data: {}, steps: [] };
        bot.sendMessage(chatId, "🔍 Mahsulot nomini (istalgan tilda) yoki ID raqamini kiriting:", backKeyboard);
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
        await showStatisticsMenu(chatId);
        return;
    }

    // ─── OYLIK HISOBOT (Excel) ───────────────────────────────────────
    if (text === "📅 Oylik hisobot") {
        const waitMsg = await bot.sendMessage(chatId, "📊 Hisobot tayyorlanmoqda...");
        try {
            const { buffer, filename, orderCount } = await generateMonthlyReportBuffer();
            if (orderCount === 0) {
                bot.editMessageText("Bu oyda hali buyurtma yo'q.", { chat_id: chatId, message_id: waitMsg.message_id });
                return;
            }
            await bot.sendDocument(chatId, buffer, {}, { filename, contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            bot.editMessageText(`✅ Hisobot tayyor (${orderCount} ta buyurtma).`, { chat_id: chatId, message_id: waitMsg.message_id });
        } catch (error) {
            console.error("Oylik hisobot xato:", error);
            bot.editMessageText("❌ Hisobot tayyorlashda xato!", { chat_id: chatId, message_id: waitMsg.message_id });
        }
        return;
    }

    // ─── BUYURTMALAR RO'YXATI ───────────────────────────────────────
    if (text === "📦 Buyurtmalar") {
        await showOrdersPage(chatId);
        return;
    }

    // ─── BARCHA BUYURTMALAR (Excel) ──────────────────────────────────
    if (text === "📥 Buyurtmalar (Excel)") {
        const waitMsg = await bot.sendMessage(chatId, "📊 Fayl tayyorlanmoqda...");
        try {
            const { buffer, filename, orderCount } = await generateAllOrdersReportBuffer();
            if (orderCount === 0) {
                bot.editMessageText("Hali buyurtma yo'q.", { chat_id: chatId, message_id: waitMsg.message_id });
                return;
            }
            await bot.sendDocument(chatId, buffer, {}, { filename, contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            bot.editMessageText(`✅ Tayyor (${orderCount} ta buyurtma).`, { chat_id: chatId, message_id: waitMsg.message_id });
        } catch (error) {
            console.error("Buyurtmalar Excel eksport xato:", error);
            bot.editMessageText("❌ Fayl tayyorlashda xato!", { chat_id: chatId, message_id: waitMsg.message_id });
        }
        return;
    }

    // ─── KATEGORIYA TARJIMALARI (topCategory/category — RU/EN) ────────
    if (text === "🌐 Kategoriya tarjimalari") {
        userState[chatId] = { step: 'none', data: {}, steps: [] };
        await showCategoryTranslationList(chatId);
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
        await showBannerDeleteList(chatId);
        return;
    }

    // ─── BANNER HAVOLASI ─────────────────────────────────────────
    if (text === "🔗 Banner havolasi") {
        await showBannerManageList(chatId);
        return;
    }

    // ─── BEKOR QILISH ──────────────────────────────────────────────
    if (text === "❌ Bekor qilish") {
        resetUserState(chatId);
        bot.sendMessage(chatId, "Bekor qilindi.", getMainKeyboard(chatId));
        return;
    }

    bot.sendMessage(chatId, "Tugmalardan tanlang:", getMainKeyboard(chatId));
}

// Callback.js'dagi "Bekor qilish" tugmasi bosilganda ham shu ro'yxatga
// qaytarish uchun eksport qilingan (delete_banner_ oqimida takrorlanmasin).
async function showBannerDeleteList(chatId, messageId = null) {
    try {
        const snapshot = await db.collection('banners').orderBy('order', 'asc').get();
        if (snapshot.empty) {
            const text = "Bannerlar yo'q.";
            if (messageId) bot.editMessageText(text, { chat_id: chatId, message_id: messageId });
            else bot.sendMessage(chatId, text, mainKeyboard);
            return;
        }
        const kb = { inline_keyboard: [] };
        snapshot.docs.forEach((doc, i) => {
            kb.inline_keyboard.push([{ text: `🖼 Banner ${i + 1}`, callback_data: `delete_banner_${doc.id}` }]);
        });
        const text = "🗑 O'chirmoqchi bo'lgan bannerni tanlang:";
        if (messageId) bot.editMessageText(text, { chat_id: chatId, message_id: messageId, reply_markup: kb });
        else bot.sendMessage(chatId, text, { reply_markup: kb });
    } catch (error) {
        bot.sendMessage(chatId, "❌ Xato!", mainKeyboard);
    }
}

module.exports = { handleCommand, handleVipStep, showBannerDeleteList };