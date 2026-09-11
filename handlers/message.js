const { bot, admins } = require('../config/adminBot');
const { db, admin } = require('../config/firebase');
const { mainKeyboard, backKeyboard, mainBackKeyboard, commandButtons, getMainKeyboard } = require('../keyboards');
const { userState, resetUserState } = require('../state/userState');
const { parseNumberInput, parseDateDDMMYYYY, createWithNextId, getStr, transliterate } = require('../utils/helpers');
const { handleBack } = require('./back');
const { handleCommand } = require('./command');
const { handleVipStep } = require('./vip');
const { handleAdminAddStep } = require('./adminManagement');
const { showProductView } = require('../views/product');
const { showCategoryView } = require('../views/category');
const { showCategoryTranslationEdit, findCategoryKeyItem } = require('../views/categoryTranslation');
const { showStoreContactEdit } = require('../views/storeContacts');

function registerMessageHandler() {
    bot.on('message', async (msg) => {
        try {
            await handleIncomingMessage(msg);
        } catch (error) {
            console.error("❌ message handlerida kutilmagan xato:", error);
            try {
                await bot.sendMessage(msg.chat.id, "❌ Kutilmagan xato yuz berdi. Iltimos, qaytadan urinib ko'ring yoki /start bosing.", getMainKeyboard(msg.chat.id));
            } catch (_) { }
        }
    });
}

async function handleIncomingMessage(msg) {
    const chatId = msg.chat.id;
    const text = msg.text;
    const photo = msg.photo;

    if (!admins.includes(chatId)) {
        bot.sendMessage(chatId, `Bu bot faqat administratorlar uchun.\nSizning ID: ${chatId}`);
        return;
    }
    if (!db) { bot.sendMessage(chatId, "❌ Database ulanmagan."); return; }
    if (text && text.startsWith('/')) {
        if (text === '/start') {
            resetUserState(chatId);
            bot.sendMessage(chatId, "Xush kelibsiz! Shop-bot admin paneli.", getMainKeyboard(chatId));
        } else if (text === '/addvip' || text === '/removevip') {
            return;
        } else bot.sendMessage(chatId, "Noma'lum buyruq. /start ni bosing.", getMainKeyboard(chatId));
        return;
    }
    if (text === "Orqaga") { await handleBack(chatId); return; }
    if (text && commandButtons.includes(text)) { await handleCommand(chatId, text); return; }
    // MUHIM: rasmni bu yerda qayta emit qilish SHART EMAS — node-telegram-bot-api
    // rasmli xabar kelganda 'message' bilan birga 'photo' event'ini ham avtomatik
    // chiqaradi. Qo'lda qayta emit qilish rasm 2 marta ishlanishiga (banner/mahsulot
    // rasmi 2 marta yuklanib, 2 marta saqlanishiga) sabab bo'lardi.
    if (photo && !text) { return; }
    if (!userState[chatId] || userState[chatId].step === 'none') {
        bot.sendMessage(chatId, "Tugmalardan tanlang:", getMainKeyboard(chatId));
        return;
    }

    const state = userState[chatId];
    const step = state.step;
    let data = state.data;

    // ─── USD KURS O'RNATISH ──────────────────────────────────────────
    if (step === 'set_usd_rate') {
        const rate = parseNumberInput(text);
        if (!rate || rate <= 0 || rate > 99999999) {
            bot.sendMessage(chatId, "❌ Noto'g'ri qiymat! Musbat son kiriting (mas: 12600):");
            return;
        }
        try {
            await db.collection('settings').doc('usd_rate').set({ rate: Math.round(rate), updatedAt: admin.firestore.FieldValue.serverTimestamp() });
            resetUserState(chatId);
            bot.sendMessage(chatId, `✅ USD kurs yangilandi!\n\n💱 1 USD = ${Math.round(rate).toLocaleString('uz-UZ')} so'm`, mainKeyboard);
        } catch (error) {
            console.error("USD kurs saqlashda xato:", error);
            bot.sendMessage(chatId, "❌ Saqlashda xato!", mainKeyboard);
            resetUserState(chatId);
        }
        return;
    }

    // ─── QIDIRUV ──────────────────────────────────────────────────────
    if (step === 'search_query') {
        const query = text.trim();
        if (!query) { bot.sendMessage(chatId, "Qidiruv so'zini kiriting:"); return; }
        try {
            const snapshot = await db.collection('products').get();
            const q = query.toLowerCase();
            const qLatin = transliterate(query); // lotincha yozilgan so'z kirillcha nomlarda ham topilishi uchun
            const isNumeric = /^\d+$/.test(query);
            const matches = [];
            snapshot.docs.forEach((doc) => {
                const p = doc.data();
                // Nomi, tavsifi, kategoriyasi va top-kategoriyasi (UZ/RU/EN
                // barchasi) bo'yicha qidiradi — faqat nom emas.
                const asStrings = (field) => {
                    if (!field) return [];
                    if (typeof field === 'string') return [field];
                    if (typeof field === 'object') return [field.uz, field.ru, field.en].filter(Boolean);
                    return [];
                };
                const searchable = [
                    ...asStrings(p.name),
                    ...asStrings(p.description),
                    ...asStrings(p.category),
                    ...asStrings(p.topCategory),
                ];
                const textMatch = searchable.some((s) => {
                    const lower = s.toLowerCase();
                    return lower.includes(q) || transliterate(lower).includes(qLatin);
                });
                const idMatch = isNumeric && String(p.id).includes(query);
                if (textMatch || idMatch) matches.push({ id: p.id, name: getStr(p.name, "Noma'lum") });
            });

            resetUserState(chatId);

            if (matches.length === 0) {
                bot.sendMessage(chatId, `"${query}" bo'yicha hech narsa topilmadi.`, getMainKeyboard(chatId));
                return;
            }
            if (matches.length === 1) {
                await showProductView(chatId, matches[0].id);
                return;
            }
            const LIMIT = 25;
            const shown = matches.slice(0, LIMIT);
            const kb = { reply_markup: { inline_keyboard: [] } };
            for (let i = 0; i < shown.length; i += 2) {
                const label = (p) => `${p.name.substring(0, 30)} (#${p.id})`;
                const row = [{ text: label(shown[i]), callback_data: `update_product_${shown[i].id}` }];
                if (i + 1 < shown.length) row.push({ text: label(shown[i + 1]), callback_data: `update_product_${shown[i + 1].id}` });
                kb.reply_markup.inline_keyboard.push(row);
            }
            const extra = matches.length > LIMIT
                ? `\n\n(Jami ${matches.length} ta topildi, birinchi ${LIMIT} tasi ko'rsatilmoqda — aniqroq so'z bilan qidiring)`
                : '';
            bot.sendMessage(chatId, `"${query}" bo'yicha ${matches.length} ta mahsulot topildi:${extra}`, kb);
        } catch (error) {
            console.error("Qidiruvda xato:", error);
            bot.sendMessage(chatId, "❌ Qidirishda xato yuz berdi!", getMainKeyboard(chatId));
            resetUserState(chatId);
        }
        return;
    }

    // ─── MAHSULOT QO'SHISH (3 tilda) ────────────────────────────────
    if (step.startsWith('product_')) {
        const oldStep = step;
        switch (step) {

            // 1. Nom UZ
            case 'product_name_uz':
                if (!text || text.trim().length < 2) { bot.sendMessage(chatId, "Kamida 2 belgi kiriting!"); return; }
                data.name_uz = text.trim();
                state.steps.push(oldStep);
                state.step = 'product_name_ru';
                bot.sendMessage(chatId, "1b. Mahsulot nomini RU tilida kiriting:", backKeyboard);
                break;

            // 1b. Nom RU
            case 'product_name_ru':
                if (!text || text.trim().length < 2) { bot.sendMessage(chatId, "Kamida 2 belgi kiriting!"); return; }
                data.name_ru = text.trim();
                state.steps.push(oldStep);
                state.step = 'product_name_en';
                bot.sendMessage(chatId, "1c. Mahsulot nomini EN tilida kiriting:", backKeyboard);
                break;

            // 1c. Nom EN
            case 'product_name_en':
                if (!text || text.trim().length < 2) { bot.sendMessage(chatId, "Kamida 2 belgi kiriting!"); return; }
                data.name_en = text.trim();
                state.steps.push(oldStep);
                state.step = 'product_price_piece';
                bot.sendMessage(chatId, "2. Dona narxini USD da kiriting (mas: 6.53):", backKeyboard);
                break;

            // 2. Narx (pricePiece, USD)
            case 'product_price_piece': {
                const price = parseNumberInput(text, true);
                if (price === null || price <= 0) { bot.sendMessage(chatId, "Musbat son kiriting! (mas: 6.53)"); return; }
                data.pricePiece = price;
                state.steps.push(oldStep);
                state.step = 'product_price_box';
                bot.sendMessage(chatId, "2b. Karobka narxini USD da kiriting, agar yo'q bo'lsa 0 (mas: 24.99):", backKeyboard);
                break;
            }

            // 2b. Narx (priceBox, USD)
            case 'product_price_box': {
                const price = parseNumberInput(text, true);
                if (price === null || price < 0) { bot.sendMessage(chatId, "0 yoki musbat son kiriting!"); return; }
                data.priceBox = price;
                state.steps.push(oldStep);
                state.step = 'product_items_per_box';
                bot.sendMessage(chatId, "2c. Bir karobkada nechta dona bor? (yo'q bo'lsa 0):", backKeyboard);
                break;
            }

            // 2c. itemsPerBox
            case 'product_items_per_box': {
                if (!/^\d+$/.test(text) || parseInt(text) < 0) { bot.sendMessage(chatId, "0 yoki musbat butun son!"); return; }
                data.itemsPerBox = parseInt(text);
                state.steps.push(oldStep);
                state.step = 'product_discount';
                bot.sendMessage(chatId, "3. Chegirma foizi (0-100, chegirma yo'q bo'lsa 0):", backKeyboard);
                break;
            }

            // 3. Chegirma
            case 'product_discount': {
                if (!/^\d+$/.test(text) || parseInt(text) < 0 || parseInt(text) > 100) {
                    bot.sendMessage(chatId, "0 dan 100 gacha son kiriting!");
                    return;
                }
                data.discount = parseInt(text);
                state.steps.push(oldStep);
                state.step = 'product_category';
                const ckb = {
                    reply_markup: {
                        keyboard: data.categoryNames.map(c => [{ text: c.label }]).concat([["Orqaga"]]),
                        resize_keyboard: true,
                        one_time_keyboard: true,
                    },
                };
                bot.sendMessage(chatId, "4. Kategoriyani tanlang:", ckb);
                break;
            }

            // 4. Kategoriya
            case 'product_category': {
                const matched = data.categoryNames.find(c => c.label === text);
                if (!matched) { bot.sendMessage(chatId, "Tugmalardan tanlang!"); return; }
                data.category = matched.full;
                data.topCategory = matched.topCategory || null;
                state.steps.push(oldStep);
                state.step = 'product_image';
                bot.sendMessage(chatId, "5. Rasm yuboring (photo formatida):", mainBackKeyboard);
                break;
            }

            case 'product_image':
                return;

            // 6. Tavsif UZ
            case 'product_description_uz':
                data.desc_uz = text.trim();
                state.steps.push(oldStep);
                state.step = 'product_description_ru';
                bot.sendMessage(chatId, "6b. Tavsifni RU tilida kiriting:", backKeyboard);
                break;

            // 6b. Tavsif RU
            case 'product_description_ru':
                data.desc_ru = text.trim();
                state.steps.push(oldStep);
                state.step = 'product_description_en';
                bot.sendMessage(chatId, "6c. Tavsifni EN tilida kiriting:", backKeyboard);
                break;

            // 6c. Tavsif EN → saqlash
            case 'product_description_en': {
                data.desc_en = text.trim();
                const buildProduct = (id) => ({
                    id,
                    name: { uz: data.name_uz || '', ru: data.name_ru || '', en: data.name_en || '' },
                    pricePiece: data.pricePiece || 0,
                    priceBox: data.priceBox || 0,
                    itemsPerBox: data.itemsPerBox || 0,
                    discount: data.discount || 0,
                    category: data.category || '',
                    topCategory: data.topCategory || null,
                    image: data.image || '',
                    description: { uz: data.desc_uz || '', ru: data.desc_ru || '', en: data.desc_en || '' },
                });
                try {
                    const newProduct = await createWithNextId('products', buildProduct);
                    bot.sendMessage(chatId,
                        `✅ Mahsulot qo'shildi!\n\n` +
                        `📦 UZ: ${newProduct.name.uz}\n` +
                        `📦 RU: ${newProduct.name.ru}\n` +
                        `📦 EN: ${newProduct.name.en}\n` +
                        `💰 Dona: $${newProduct.pricePiece} | Karobka: $${newProduct.priceBox}\n` +
                        `🏷 Chegirma: ${newProduct.discount}%\n` +
                        `📂 Kategoriya: ${getStr(newProduct.category)}`,
                        getMainKeyboard(chatId)
                    );
                } catch (error) {
                    console.error("Mahsulot saqlashda xato:", error);
                    bot.sendMessage(chatId, `❌ Mahsulot qo'shilmadi!\nSabab: ${error.message || 'noma\'lum xato'}`, getMainKeyboard(chatId));
                }
                resetUserState(chatId);
                break;
            }
        }
        state.data = data;
        return;
    }

    // ─── KATEGORIYA QO'SHISH ─────────────────────────────────────────
    if (step.startsWith('category_')) {
        if (step === 'category_name') {
            const trimmed = text.trim();
            // Bir xil nomli (katta-kichik harf farqisiz) kategoriya bo'lsa
            // qo'shmaymiz — Telegram tugmasi faqat matnni yuboradi, shuning
            // uchun 2 ta bir xil nomli kategoriya bo'lsa, bot mahsulot
            // qo'shishda qaysi birini bosganingizni ajrata olmay qoladi.
            const existingSnap = await db.collection('categories').get();
            const dup = existingSnap.docs.find((d) => getStr(d.data().name).toLowerCase().trim() === trimmed.toLowerCase());
            if (dup) {
                bot.sendMessage(chatId, `⚠️ "${getStr(dup.data().name)}" nomli kategoriya allaqachon bor. Boshqa nom kiriting:`, backKeyboard);
                return;
            }
            data.name = trimmed;
            // Mavjud top-kategoriyalar ro'yxatini yig'amiz — mijoz ilovasida
            // kategoriya to'g'ri guruhga (top-kategoriyaga) tushishi uchun.
            // Tanlanmasa ham bo'ladi ("Yo'q" desa) — mijoz ilovasida "Boshqa"ga tushadi.
            const topCounts = new Map();
            existingSnap.docs.forEach((d) => {
                const top = getStr(d.data().topCategory, '').trim();
                if (top) topCounts.set(top, (topCounts.get(top) || 0) + 1);
            });
            data.topCategoryOptions = [...topCounts.keys()].sort();
            state.steps.push(step);
            state.step = 'category_topcategory';
            const topKb = {
                reply_markup: {
                    keyboard: [
                        ["Yo'q (tegishli emas)"],
                        ...data.topCategoryOptions.map((o) => [{ text: o }]),
                        ["Orqaga"],
                    ],
                    resize_keyboard: true,
                },
            };
            bot.sendMessage(chatId, "2/2. Top-kategoriyani tanlang (mijoz ilovasida shu guruhga tushadi):", topKb);
        } else if (step === 'category_topcategory') {
            const trimmed = text.trim();
            const options = data.topCategoryOptions || [];
            let topCategory = null;
            if (trimmed !== "Yo'q (tegishli emas)") {
                const matched = options.find((o) => o === trimmed);
                if (!matched) {
                    bot.sendMessage(chatId, "Iltimos, ro'yxatdan tanlang yoki \"Yo'q (tegishli emas)\" ni bosing:");
                    return;
                }
                topCategory = matched;
            }
            try {
                const newDoc = { name: data.name };
                if (topCategory) newDoc.topCategory = topCategory;
                await createWithNextId('categories', (id) => ({ id, ...newDoc }));
                const topText = topCategory ? `\nTop-kategoriya: ${topCategory}` : '';
                bot.sendMessage(chatId, `✅ Kategoriya qo'shildi!\n${data.name}${topText}`, getMainKeyboard(chatId));
            } catch (error) {
                bot.sendMessage(chatId, "❌ Xato!", getMainKeyboard(chatId));
            }
            resetUserState(chatId);
        }
        state.data = data;
        return;
    }

    // ─── KATEGORIYA YANGILASH ────────────────────────────────────────
    if (state.step === 'update_category_name') {
        try {
            const trimmed = text.trim();
            const existingSnap = await db.collection('categories').get();
            const dup = existingSnap.docs.find((d) => d.id !== String(state.data.categoryId) && getStr(d.data().name).toLowerCase().trim() === trimmed.toLowerCase());
            if (dup) {
                bot.sendMessage(chatId, `⚠️ "${getStr(dup.data().name)}" nomli kategoriya allaqachon bor. Boshqa nom kiriting:`, backKeyboard);
                return;
            }
            const catDoc = await db.collection('categories').doc(String(state.data.categoryId)).get();
            const oldName = catDoc.exists ? catDoc.data().name : null;
            await db.collection('categories').doc(String(state.data.categoryId)).update({ name: trimmed });
            if (oldName && oldName !== trimmed) {
                const productsSnap = await db.collection('products').where('category', '==', oldName).get();
                if (!productsSnap.empty) {
                    const batch = db.batch();
                    productsSnap.docs.forEach(doc => batch.update(doc.ref, { category: trimmed }));
                    await batch.commit();
                }
            }
            state.step = 'category_update_view';
            await showCategoryView(chatId, state.data.categoryId, state.data.messageId);
            bot.sendMessage(chatId, `✅ Nom yangilandi: ${trimmed}`, backKeyboard);
        } catch (error) { bot.sendMessage(chatId, "❌ Xato!", getMainKeyboard(chatId)); resetUserState(chatId); }
        return;
    }

    // ─── CHEGIRMA SANASI ─────────────────────────────────────────────
    if (state.step === 'update_discount_date') {
        const stateData = state.data;
        if (text === "0") {
            try {
                await db.collection('products').doc(String(stateData.productId)).update({ [stateData.dateField]: admin.firestore.FieldValue.delete() });
                state.step = 'product_update_view';
                await showProductView(chatId, stateData.productId, stateData.messageId);
                bot.sendMessage(chatId, `✅ ${stateData.dateLabel} o'chirildi.`, backKeyboard);
            } catch (error) { bot.sendMessage(chatId, "❌ Xato!", getMainKeyboard(chatId)); resetUserState(chatId); }
            return;
        }
        const dateObj = parseDateDDMMYYYY(text);
        if (!dateObj) { bot.sendMessage(chatId, "❌ Format: DD.MM.YYYY (mas: 13.05.2026)\nO'chirish uchun: 0"); return; }
        try {
            const timestamp = admin.firestore.Timestamp.fromDate(dateObj);
            await db.collection('products').doc(String(stateData.productId)).update({ [stateData.dateField]: timestamp });
            state.step = 'product_update_view';
            await showProductView(chatId, stateData.productId, stateData.messageId);
            bot.sendMessage(chatId, `✅ ${stateData.dateLabel} yangilandi: ${text}`, backKeyboard);
        } catch (error) { bot.sendMessage(chatId, "❌ Xato!", getMainKeyboard(chatId)); resetUserState(chatId); }
        return;
    }

    // ─── MAHSULOT YANGILASH ──────────────────────────────────────────
    if (state.step === 'update_value') {
        const stateData = state.data;
        const fieldType = stateData.field;
        let value;
        if (fieldType === 'pricePiece' || fieldType === 'priceBox') {
            const parsed = parseNumberInput(text, true);
            if (parsed === null || parsed < 0) { bot.sendMessage(chatId, "0 yoki musbat son kiriting! (mas: 6.53)"); return; }
            value = parsed;
        } else if (fieldType === 'discount') {
            if (!/^\d+$/.test(text) || parseInt(text) < 0 || parseInt(text) > 100) { bot.sendMessage(chatId, "0-100 oralig'ida!"); return; }
            value = parseInt(text);
        } else if (fieldType === 'itemsPerBox') {
            if (!/^\d+$/.test(text) || parseInt(text) < 0) { bot.sendMessage(chatId, "0 yoki musbat son!"); return; }
            value = parseInt(text);
        } else { bot.sendMessage(chatId, "Xato!"); resetUserState(chatId); return; }

        // Narx maydoni (dona/karobka) bo'lsa — bir xil kategoriyadagi boshqa
        // mahsulotlar bor-yo'qligini tekshiramiz (mas: 11 xil rangli bir xil
        // mahsulot). Bo'lsa, ularning narxini ham birga o'zgartirishni so'raymiz —
        // aks holda faqat shu bittasi yangilanadi (avvalgidek).
        if (fieldType === 'pricePiece' || fieldType === 'priceBox') {
            try {
                const productDoc = await db.collection('products').doc(String(stateData.productId)).get();
                const category = productDoc.exists ? productDoc.data().category : null;
                if (category) {
                    const siblingsSnap = await db.collection('products').where('category', '==', category).get();
                    const siblings = siblingsSnap.docs.filter((d) => d.id !== String(stateData.productId));
                    if (siblings.length > 0) {
                        stateData.pendingField = fieldType;
                        stateData.pendingValue = value;
                        stateData.pendingCategory = category;
                        state.step = 'price_sync_confirm';
                        const names = siblings.slice(0, 15).map((d) => `• ${getStr(d.data().name, '?')}`).join('\n');
                        const more = siblings.length > 15 ? `\n… va yana ${siblings.length - 15} ta` : '';
                        const fieldLabel = fieldType === 'priceBox' ? 'karobka' : 'dona';
                        bot.sendMessage(
                            chatId,
                            `⚠️ Bu mahsulot bilan bir xil kategoriyada yana ${siblings.length} ta mahsulot bor:\n\n${names}${more}\n\n` +
                            `Ularning ${fieldLabel} narxini ham $${value} ga o'zgartiraymi?`,
                            {
                                reply_markup: {
                                    inline_keyboard: [[
                                        { text: `✅ Ha, hammasiga (${siblings.length + 1} ta)`, callback_data: 'pricesync_yes' },
                                        { text: '❌ Yo\'q, faqat shu biriga', callback_data: 'pricesync_no' },
                                    ]],
                                },
                            }
                        );
                        return;
                    }
                }
            } catch (error) {
                console.error("Narx sinxronizatsiyasini tekshirishda xato:", error);
                // Tekshiruv muvaffaqiyatsiz bo'lsa ham, faqat shu bitta mahsulotni
                // yangilashda davom etamiz — pastdagi umumiy yo'l ishlatiladi.
            }
        }

        try {
            await db.collection('products').doc(String(stateData.productId)).update({ [fieldType]: value });
            state.step = 'product_update_view';
            await showProductView(chatId, stateData.productId, stateData.messageId);
            bot.sendMessage(chatId, `✅ Yangilandi: ${value}`, backKeyboard);
        } catch (error) { bot.sendMessage(chatId, "❌ Xato!", getMainKeyboard(chatId)); resetUserState(chatId); }
        return;
    }

    // ─── NARX SINXRONIZATSIYASI (bir xil kategoriyadagi rang-variantlar) ──
    if (state.step === 'price_sync_confirm') {
        // Bu bosqichda oddiy matn kutilmaydi — admin faqat yuqoridagi
        // inline tugmalardan birini bosishi kerak.
        bot.sendMessage(chatId, "Iltimos, yuqoridagi tugmalardan birini bosing (✅ yoki ❌).");
        return;
    }
    if (state.step === 'update_ml_field') {
        if (!text || text.trim().length < 1) { bot.sendMessage(chatId, "Bo'sh bo'lmasin!"); return; }
        try {
            const { productId, mlField, lang } = state.data;
            await db.collection('products').doc(String(productId)).update({ [`${mlField}.${lang}`]: text.trim() });
            state.step = 'product_update_view';
            await showProductView(chatId, productId, state.data.messageId);
            const fieldLabel = mlField === 'name' ? 'Nomi' : 'Tavsifi';
            bot.sendMessage(chatId, `✅ ${fieldLabel} (${lang.toUpperCase()}) yangilandi`, backKeyboard);
        } catch (error) {
            console.error("Ko'p tilli maydonni yangilashda xato:", error);
            bot.sendMessage(chatId, "❌ Xato!", getMainKeyboard(chatId));
            resetUserState(chatId);
        }
        return;
    }

    // ─── NARXNI OMMAVIY O'ZGARTIRISH ────────────────────────────────
    if (step === 'bulkprice_value_input') {
        const value = parseNumberInput(text);
        if (value === null || value < 0) { bot.sendMessage(chatId, "0 yoki musbat son kiriting! (mas: 6.53)"); return; }
        try {
            const snapshot = await db.collection('products').where('category', '==', data.bulkCategory).get();
            data.bulkValue = value;
            const fieldLabel = data.bulkField === 'priceBox' ? 'karobka' : 'dona';
            const kb = {
                inline_keyboard: [
                    [{ text: '✅ Tasdiqlash', callback_data: 'bulkprice_confirm' }],
                    [{ text: '❌ Bekor qilish', callback_data: 'bulkprice_cancel' }],
                ],
            };
            bot.sendMessage(
                chatId,
                `⚠️ "${getStr(data.bulkCategory)}" kategoriyasidagi ${snapshot.size} ta mahsulotning narxi (${fieldLabel}) $${value} ga o'zgartiriladi.\n\nTasdiqlaysizmi?`,
                { reply_markup: kb }
            );
        } catch (error) {
            console.error("Bulk narx tekshirishda xato:", error);
            bot.sendMessage(chatId, "❌ Xato!", getMainKeyboard(chatId));
            resetUserState(chatId);
        }
        return;
    }

    // ─── BANNER HAVOLASI (qo'lda kiritish) ─────────────────────────
    if (step === 'banner_link_manual_input') {
        const link = (text || '').trim();
        const isValid = link && (link.startsWith('/') || link.startsWith('http://') || link.startsWith('https://'));
        if (!isValid) {
            bot.sendMessage(
                chatId,
                "❌ Noto'g'ri havola. Havola \"/\" bilan (masalan: /categories/Valik) yoki \"http://\"/\"https://\" bilan boshlanishi kerak.\n\nQaytadan yuboring:"
            );
            return;
        }
        try {
            await db.collection('banners').doc(data.bannerId).update({ link });
            resetUserState(chatId);
            bot.sendMessage(chatId, `✅ Havola saqlandi: ${link}`, getMainKeyboard(chatId));
        } catch (error) {
            console.error("Banner havolasini saqlashda xato:", error);
            bot.sendMessage(chatId, "❌ Xato!", getMainKeyboard(chatId));
            resetUserState(chatId);
        }
        return;
    }

    // ─── KATEGORIYA TARJIMALARI (topCategory/category — RU/EN) ────────
    if (step === 'cattr_ru_input' || step === 'cattr_en_input') {
        const stateData = state.data;
        if (!text || text.trim().length < 1) { bot.sendMessage(chatId, "Bo'sh bo'lmasin!"); return; }
        try {
            const item = await findCategoryKeyItem(stateData.cattrDocId);
            if (!item) {
                bot.sendMessage(chatId, "Bu kategoriya endi mahsulotlarda topilmadi.", getMainKeyboard(chatId));
                resetUserState(chatId);
                return;
            }
            const field = step === 'cattr_ru_input' ? 'ru' : 'en';
            await db.collection('categoryTranslations').doc(stateData.cattrDocId).set(
                { key: item.key, type: item.type, [field]: text.trim(), updatedAt: admin.firestore.FieldValue.serverTimestamp() },
                { merge: true }
            );
            state.step = 'none';
            await showCategoryTranslationEdit(chatId, stateData.cattrDocId, stateData.cattrMessageId);
            bot.sendMessage(chatId, `✅ ${field.toUpperCase()} nom saqlandi: ${text.trim()}`, backKeyboard);
        } catch (error) {
            console.error("Kategoriya tarjimasini saqlashda xato:", error);
            bot.sendMessage(chatId, "❌ Xato!", getMainKeyboard(chatId));
            resetUserState(chatId);
        }
        return;
    }

    // ─── DO'KON KONTAKTLARI (telefon/Telegram) ─────────────────────────
    if (step === 'storecontact_phone_input' || step === 'storecontact_tg_input') {
        const stateData = state.data;
        const value = (text || '').trim();
        if (!value) { bot.sendMessage(chatId, "Bo'sh bo'lmasin!"); return; }
        const isPhone = step === 'storecontact_phone_input';
        if (isPhone && !/^\+?\d{9,15}$/.test(value)) {
            bot.sendMessage(chatId, "❌ Noto'g'ri format! Telefon raqamni +998901234567 ko'rinishida kiriting.");
            return;
        }
        try {
            const field = isPhone ? 'phone' : 'telegramUsername';
            const cleanValue = isPhone ? value : value.replace('@', '');
            await db.collection('storeContacts').doc(stateData.storeDocId).set(
                { [field]: cleanValue, updatedAt: admin.firestore.FieldValue.serverTimestamp() },
                { merge: true }
            );
            state.step = 'none';
            await showStoreContactEdit(chatId, stateData.storeDocId, stateData.storeMessageId);
            bot.sendMessage(chatId, `✅ Saqlandi: ${isPhone ? cleanValue : '@' + cleanValue}`, backKeyboard);
        } catch (error) {
            console.error("Do'kon kontaktini saqlashda xato:", error);
            bot.sendMessage(chatId, "❌ Xato!", getMainKeyboard(chatId));
            resetUserState(chatId);
        }
        return;
    }

    // ─── VIP ─────────────────────────────────────────────────────────
    if (step && step.startsWith('vip_')) {
        await handleVipStep(chatId, text);
        return;
    }

    // ─── ADMIN QO'SHISH ──────────────────────────────────────────────
    if (step === 'admin_add_id' || step === 'admin_add_confirm') {
        await handleAdminAddStep(chatId, text);
        return;
    }
    if (step === 'admin_remove_confirm') {
        bot.sendMessage(chatId, "Iltimos, yuqoridagi tugmalardan birini bosing (✅ yoki ❌).");
        return;
    }

    bot.sendMessage(chatId, "Tushunmadim. Tugmalardan tanlang:", getMainKeyboard(chatId));
}

module.exports = { registerMessageHandler };
