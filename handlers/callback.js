const { bot, admins } = require('../config/adminBot');
const { db } = require('../config/firebase');
const { backKeyboard, isSuperAdmin, getMainKeyboard } = require('../keyboards');
const { userState } = require('../state/userState');
const { handleInlineBack } = require('./back');
const { showCategoryView, showCategoryUpdateSelect } = require('../views/category');
const { showProductView, showProductUpdateCategorySelect, showProductsInCategory, getProductsInCategory } = require('../views/product');
const { BONUS_DISCOUNT_PERCENT } = require('../config/constants');
const { getStr, formatDateTime, resolveCustomerPhone } = require('../utils/helpers');
const { getUserBot } = require('../bots/userBot');
const { showBannerDeleteList } = require('./command');

async function notifyCustomer(telegramChatId, orderId, text) {
    if (!telegramChatId) return;
    try {
        const userBot = getUserBot();
        if (userBot) {
            await userBot.sendMessage(Number(telegramChatId), text);
        } else {
            console.log('User bot ishga tushmagan, mijozga status xabari yuborilmadi.');
        }
    } catch (err) {
        console.log(`Mijozga (${telegramChatId}) status xabarini (buyurtma ${orderId}) yuborib bo'lmadi:`, err.message);
    }
}

function registerCallbackHandler() {
    bot.on('callback_query', async (cq) => {
        const chatId = cq.message.chat.id;
        const messageId = cq.message.message_id;
        const data = cq.data;
        if (!data || !admins.includes(chatId)) { bot.answerCallbackQuery(cq.id, { text: "Ruxsat yo'q!" }); return; }
        if (!db) { bot.answerCallbackQuery(cq.id, { text: "Database yo'q." }); return; }

        // O'chirish, buyurtma tasdiqlash/bekor/yetkazish — faqat super admin.
        // ("cancel_*" hech narsani o'chirmaydi/o'zgartirmaydi, shuning uchun
        // cheklanmagan — bekor qilish har doim ruxsat etilgan.)
        const superAdminOnlyPrefixes = [
            'delete_product_', 'confirm_delete_product_',
            'delete_category_', 'confirm_delete_category_',
            'delete_banner_', 'confirm_delete_banner_',
            'confirm_delete_vip_',
            'confirm_order_', 'cancel_order_', 'deliver_order_',
        ];
        if (superAdminOnlyPrefixes.some((p) => data.startsWith(p)) && !isSuperAdmin(chatId)) {
            bot.answerCallbackQuery(cq.id, { text: "⛔ Bu amal faqat super adminlar uchun." });
            return;
        }

        if (data.startsWith('order_detail_')) {
            const orderId = data.replace('order_detail_', '');
            try {
                const doc = await db.collection('orders').doc(orderId).get();
                if (!doc.exists) { bot.answerCallbackQuery(cq.id, { text: "Topilmadi!" }); return; }
                const o = doc.data();

                // Mijoz bloki:
                //  - VIP bo'lsa: FAQAT login + telefon
                //  - Oddiy bo'lsa: kiritgan ismi + telefon
                const phone = await resolveCustomerPhone(o);
                let customerBlock = '';
                if (o.isVip) {
                    let vipLogin = o.username || '';
                    if (o.telegramChatId) {
                        try {
                            const vipDoc = await db.collection('VIP_Clients').doc(String(o.telegramChatId)).get();
                            if (vipDoc.exists && vipDoc.data().login) vipLogin = vipDoc.data().login;
                        } catch (e) { console.error('VIP lookup xato:', e.message); }
                    }
                    customerBlock = `⭐ VIP: ${vipLogin || "Noma'lum"}\n📞 ${phone || "Noma'lum"}\n`;
                } else {
                    customerBlock = `👤 ${o.customerName || o.username || "Noma'lum"}\n📞 ${phone || "Noma'lum"}\n`;
                }
                const nameToStr = (n) => typeof n === 'string' ? n : (n && typeof n === 'object' ? (n.uz || n.ru || n.en || Object.values(n)[0] || "Noma'lum mahsulot") : "Noma'lum mahsulot");
                const itemsText = o.items?.map(item => `- ${item.quantity} x ${nameToStr(item.name)} — ${(item.price * item.quantity).toLocaleString("uz-UZ")} so'm`).join('\n') || "Mahsulot yo'q";
                const bonusText = o.orderType === 'discount' ? `🎁 ${BONUS_DISCOUNT_PERCENT}% chegirma\n` : o.orderType === 'bonus' ? `🎁 1+1 bonus\n` : '';
                const statusEmoji = o.status === 'confirmed' ? "✅" : o.status === 'cancelled' ? "❌" : o.status === 'delivered' ? "🏁" : "🆕";
                const statusText = o.status === 'confirmed' ? "Tasdiqlangan" : o.status === 'cancelled' ? "Bekor qilingan" : o.status === 'delivered' ? "Yetkazildi" : "Yangi";
                let deliveryText = '';
                if (o.deliveryMethod === 'pickup') {
                    const pickupAddr = o.pickupAddress || o.storeAddress || "Oscar do'koni";
                    deliveryText = `📦 Yetkazish: O'zim olib ketaman\n🏪 Manzil: ${pickupAddr}\n`;
                } else {
                    const addr = o.deliveryAddress || o.address || 'Kiritilmagan';
                    const comment = o.addressComment || o.deliveryComment || '';
                    deliveryText = `📦 Yetkazish: Yetkazib berish\n📍 Manzil: ${addr}\n` + (comment ? `💬 Izoh: ${comment}\n` : '');
                }
                // YANGI:
                const msg = `📋 BUYURTMA\n\n🆔 ${orderId}\n🕐 Vaqt: ${formatDateTime(o.createdAt)}\n${customerBlock}${bonusText}${deliveryText}\n🛍 Mahsulotlar:\n${itemsText}\n\n💰 Jami: ${(o.totalUZS || 0).toLocaleString("uz-UZ")} so'm\n📊 Status: ${statusEmoji} ${statusText}`; const kb = { inline_keyboard: [] };
                if (o.status === 'pending' && isSuperAdmin(chatId)) kb.inline_keyboard.push([{ text: "✅ Tasdiqlash", callback_data: `confirm_order_${orderId}` }, { text: "❌ Bekor", callback_data: `cancel_order_${orderId}` }]);
                kb.inline_keyboard.push([{ text: "⬅️ Orqaga", callback_data: "back_to_orders" }]);
                bot.editMessageText(msg, { chat_id: chatId, message_id: messageId, reply_markup: kb });
                bot.answerCallbackQuery(cq.id);
            } catch (error) { bot.answerCallbackQuery(cq.id, { text: "Xato!" }); }
            return;
        }

        if (data === 'back_to_orders') {
            try {
                const snapshot = await db.collection('orders').orderBy('createdAt', 'desc').limit(10).get();
                if (snapshot.empty) { bot.editMessageText("Buyurtmalar yo'q.", { chat_id: chatId, message_id: messageId }); bot.answerCallbackQuery(cq.id); return; }
                const kb = { inline_keyboard: [] };
                snapshot.docs.forEach(d => {
                    const o = d.data();
                    const emoji = o.status === 'confirmed' ? "✅" : o.status === 'cancelled' ? "❌" : o.status === 'delivered' ? "🏁" : "🆕";
                    let addressShort = '';
                    if (o.deliveryMethod === 'pickup') {
                        addressShort = `🏪 O'zim olib ketaman`;
                    } else {
                        const addr = o.deliveryAddress || o.address || '';
                        addressShort = addr ? `📍 ${addr.length > 25 ? addr.substring(0, 25) + '…' : addr}` : `📍 Manzil yo'q`;
                    }
                    // YANGI:
                    kb.inline_keyboard.push([{ text: `${emoji} ${o.customerName || o.username || 'Noma\'lum'} | ${(o.totalUZS || 0).toLocaleString("uz-UZ")} so'm | 🕐 ${formatDateTime(o.createdAt)}`, callback_data: `order_detail_${d.id}` }]);
                });
                bot.editMessageText("So'nggi 10 ta buyurtma:", { chat_id: chatId, message_id: messageId, reply_markup: kb });
                bot.answerCallbackQuery(cq.id);
            } catch (error) { bot.answerCallbackQuery(cq.id, { text: "Xato!" }); }
            return;
        }

        if (data.startsWith('confirm_order_') || data.startsWith('cancel_order_')) {
            const isConfirm = data.startsWith('confirm_order_');
            const orderId = isConfirm ? data.replace('confirm_order_', '') : data.replace('cancel_order_', '');
            try {
                const orderRef = db.collection('orders').doc(orderId);
                const doc = await orderRef.get();
                if (!doc.exists) { bot.answerCallbackQuery(cq.id, { text: "Topilmadi!" }); return; }
                const orderData = doc.data();
                if (orderData.status !== 'pending') { bot.answerCallbackQuery(cq.id, { text: `Allaqachon ${orderData.status}!` }); return; }
                await orderRef.update({ status: isConfirm ? 'confirmed' : 'cancelled' });
                if (isConfirm && orderData.telegramChatId) {
                    const customerRef = db.collection('customers').doc(String(orderData.telegramChatId));
                    const customerDoc = await customerRef.get();
                    if (customerDoc.exists) {
                        const c = customerDoc.data();
                        const currentCount = c.ordersCount || 0;
                        const newCount = currentCount >= 2 ? 0 : currentCount + 1;
                        await customerRef.update({ ordersCount: newCount, totalOrders: (c.totalOrders || 0) + 1 });
                        console.log(`✅ Mijoz ${orderData.telegramChatId}: ordersCount ${currentCount} → ${newCount}`);
                    }
                }
                const adminName = cq.from.first_name || "Admin";
                const statusText = isConfirm ? `✅ Tasdiqlandi — ${adminName}` : `❌ Bekor qilindi — ${adminName}`;
                const newKeyboard = isConfirm
                    ? { inline_keyboard: [[{ text: "🚚 Yetkazildi deb belgilash", callback_data: `deliver_order_${orderId}` }]] }
                    : { inline_keyboard: [] };
                bot.editMessageText(`${cq.message.text}\n\n=================\n${statusText}`, { chat_id: chatId, message_id: messageId, reply_markup: newKeyboard });
                bot.answerCallbackQuery(cq.id, { text: isConfirm ? "Tasdiqlandi" : "Bekor qilindi" });
                admins.forEach(aId => {
                    if (aId !== chatId) bot.sendMessage(aId, `Buyurtma ${orderId} ${isConfirm ? 'tasdiqlandi' : 'bekor'} → ${adminName}`);
                });

                notifyCustomer(orderData.telegramChatId, orderId,
                    isConfirm
                        ? `✅ Buyurtmangiz tasdiqlandi!\n\n🆔 ${orderId}\n\nTez orada yetkazib beriladi.`
                        : `❌ Afsuski, buyurtmangiz bekor qilindi.\n\n🆔 ${orderId}\n\nSavollar bo'lsa, qo'llab-quvvatlash xizmatiga murojaat qiling.`
                );
            } catch (error) {
                console.error("Buyurtma xato:", error);
                bot.answerCallbackQuery(cq.id, { text: "Xato!" });
            }
            return;
        }

        if (data.startsWith('deliver_order_')) {
            const orderId = data.replace('deliver_order_', '');
            try {
                const orderRef = db.collection('orders').doc(orderId);
                const doc = await orderRef.get();
                if (!doc.exists) { bot.answerCallbackQuery(cq.id, { text: "Topilmadi!" }); return; }
                const orderData = doc.data();
                if (orderData.status !== 'confirmed') {
                    bot.answerCallbackQuery(cq.id, { text: `Bu buyurtma hali qabul qilinmagan yoki allaqachon ${orderData.status}!` });
                    return;
                }
                await orderRef.update({ status: 'delivered' });
                const adminName = cq.from.first_name || "Admin";
                bot.editMessageText(`${cq.message.text}\n\n🚚 Yetkazildi — ${adminName}`, {
                    chat_id: chatId, message_id: messageId, reply_markup: { inline_keyboard: [] },
                });
                bot.answerCallbackQuery(cq.id, { text: "Yetkazildi deb belgilandi" });
                admins.forEach(aId => {
                    if (aId !== chatId) bot.sendMessage(aId, `Buyurtma ${orderId} yetkazildi → ${adminName}`);
                });
                notifyCustomer(orderData.telegramChatId, orderId,
                    `🚚 Buyurtmangiz yetkazib berildi!\n\n🆔 ${orderId}\n\nXaridingiz uchun rahmat!`
                );
            } catch (error) {
                console.error("Yetkazildi belgilashda xato:", error);
                bot.answerCallbackQuery(cq.id, { text: "Xato!" });
            }
            return;
        }

        if (data === 'close_orders_list') {
            try {
                await bot.editMessageReplyMarkup({ inline_keyboard: [] }, { chat_id: chatId, message_id: messageId });
            } catch (error) { /* xabar allaqachon o'zgargan bo'lishi mumkin, e'tibor bermaymiz */ }
            bot.sendMessage(chatId, "🏠 Asosiy menyu", getMainKeyboard(chatId));
            bot.answerCallbackQuery(cq.id);
            return;
        }

        if (data === 'back_to_prev') { await handleInlineBack(chatId, messageId); bot.answerCallbackQuery(cq.id); return; }

        if (data.startsWith('cat_select_')) {
            const id = parseInt(data.replace('cat_select_', ''));
            const state = userState[chatId] || { step: 'none', data: {}, steps: [] };
            state.steps.push(state.step); state.step = 'category_update_view';
            state.data.categoryId = id; state.data.messageId = messageId;
            userState[chatId] = state;
            await showCategoryView(chatId, id, messageId);
            bot.answerCallbackQuery(cq.id); return;
        }
        if (data.startsWith('cat_update_name_')) {
            const id = parseInt(data.replace('cat_update_name_', ''));
            const state = userState[chatId] || { step: 'none', data: {}, steps: [] };
            userState[chatId] = { step: 'update_category_name', data: { categoryId: id, messageId }, steps: state.steps || [] };
            bot.sendMessage(chatId, 'Yangi nomni kiriting:', backKeyboard);
            bot.answerCallbackQuery(cq.id); return;
        }
        if (data.startsWith('cat_update_icon_')) {
            const id = parseInt(data.replace('cat_update_icon_', ''));
            const state = userState[chatId] || { step: 'none', data: {}, steps: [] };
            userState[chatId] = { step: 'update_category_icon', data: { categoryId: id, messageId }, steps: state.steps || [] };
            bot.sendMessage(chatId, 'Yangi ikonkani kiriting:', backKeyboard);
            bot.answerCallbackQuery(cq.id); return;
        }
        if (data.startsWith('delete_category_')) {
            const id = parseInt(data.replace('delete_category_', ''));
            try {
                const doc = await db.collection('categories').doc(String(id)).get();
                if (!doc.exists) { bot.answerCallbackQuery(cq.id, { text: "Topilmadi!" }); return; }
                const cat = doc.data();
                const count = await getProductsInCategory(cat.name);
                if (count === 0) {
                    bot.editMessageText(
                        `⚠️ "${getStr(cat.name)}" kategoriyasini o'chirishni tasdiqlaysizmi? Bu amalni ortga qaytarib bo'lmaydi.`,
                        {
                            chat_id: chatId, message_id: messageId,
                            reply_markup: {
                                inline_keyboard: [[
                                    { text: "✅ Ha, o'chirish", callback_data: `confirm_delete_category_${id}` },
                                    { text: "❌ Yo'q", callback_data: `cancel_delete_category_${id}` },
                                ]],
                            },
                        }
                    );
                } else {
                    bot.editMessageText(`⚠️ "${getStr(cat.name)}" ichida ${count} ta mahsulot bor. Avval ularni boshqa kategoriyaga o'tkazing yoki o'chiring.`, { chat_id: chatId, message_id: messageId });
                }
                bot.answerCallbackQuery(cq.id);
            } catch (error) { bot.answerCallbackQuery(cq.id, { text: "Xato!" }); }
            return;
        }

        if (data.startsWith('confirm_delete_category_')) {
            const id = parseInt(data.replace('confirm_delete_category_', ''));
            try {
                const doc = await db.collection('categories').doc(String(id)).get();
                const catName = doc.exists ? getStr(doc.data().name) : 'Noma\'lum';
                await db.collection('categories').doc(String(id)).delete();
                bot.editMessageText(`✅ "${catName}" o'chirildi.`, { chat_id: chatId, message_id: messageId });
                bot.answerCallbackQuery(cq.id);
            } catch (error) { bot.answerCallbackQuery(cq.id, { text: "Xato!" }); }
            return;
        }

        if (data.startsWith('cancel_delete_category_')) {
            const id = parseInt(data.replace('cancel_delete_category_', ''));
            await showCategoryView(chatId, id, messageId);
            bot.answerCallbackQuery(cq.id);
            return;
        }
        if (data.startsWith('select_category_')) {
            const id = parseInt(data.replace('select_category_', ''));
            try {
                const doc = await db.collection('categories').doc(String(id)).get();
                if (!doc.exists) { bot.answerCallbackQuery(cq.id, { text: "Topilmadi!" }); return; }
                const cat = doc.data();
                const state = userState[chatId] || { step: 'none', data: {}, steps: [] };
                state.steps.push(state.step); state.step = 'product_update_product_select';
                state.data.selectedCategory = cat.name; state.data.messageId = messageId;
                userState[chatId] = state;
                await showProductsInCategory(chatId, cat.name, messageId);
                bot.answerCallbackQuery(cq.id);
            } catch (error) { bot.answerCallbackQuery(cq.id, { text: "Xato!" }); }
            return;
        }
        if (data.startsWith('update_product_')) {
            const id = parseInt(data.replace('update_product_', ''));
            try {
                const doc = await db.collection('products').doc(String(id)).get();
                if (!doc.exists) { bot.answerCallbackQuery(cq.id, { text: "Topilmadi!" }); return; }
                const state = userState[chatId] || { step: 'none', data: {}, steps: [] };
                state.steps.push(state.step); state.step = 'product_update_view';
                state.data.productId = id; state.data.messageId = messageId;
                userState[chatId] = state;
                await showProductView(chatId, id, messageId);
                bot.answerCallbackQuery(cq.id);
            } catch (error) { bot.answerCallbackQuery(cq.id, { text: "Xato!" }); }
            return;
        }

        if (data.startsWith('update_field_category_')) {
            const id = parseInt(data.replace('update_field_category_', ''));
            try {
                const catsSnap = await db.collection('categories').get();
                if (catsSnap.empty) { bot.answerCallbackQuery(cq.id, { text: "Kategoriyalar yo'q!" }); return; }
                const cats = catsSnap.docs.map(d => ({ id: d.data().id, icon: d.data().icon || d.data().icon_url || '', name: getStr(d.data().name) }));
                const kb = { reply_markup: { inline_keyboard: [] } };
                for (let i = 0; i < cats.length; i += 2) {
                    const row = [{ text: `${cats[i].icon} ${cats[i].name}`.trim(), callback_data: `set_product_cat_${id}_${cats[i].id}` }];
                    if (i + 1 < cats.length) row.push({ text: `${cats[i + 1].icon} ${cats[i + 1].name}`.trim(), callback_data: `set_product_cat_${id}_${cats[i + 1].id}` });
                    kb.reply_markup.inline_keyboard.push(row);
                }
                kb.reply_markup.inline_keyboard.push([{ text: "⬅️ Orqaga", callback_data: 'back_to_prev' }]);
                bot.editMessageText("Yangi kategoriyani tanlang:", { chat_id: chatId, message_id: messageId, reply_markup: kb.reply_markup });
                bot.answerCallbackQuery(cq.id);
            } catch (error) { bot.answerCallbackQuery(cq.id, { text: "Xato!" }); }
            return;
        }

        if (data.startsWith('set_product_cat_')) {
            const parts = data.replace('set_product_cat_', '').split('_');
            const productId = parseInt(parts[0]);
            const catId = parseInt(parts[1]);
            try {
                const catDoc = await db.collection('categories').doc(String(catId)).get();
                if (!catDoc.exists) { bot.answerCallbackQuery(cq.id, { text: "Kategoriya topilmadi!" }); return; }
                const catNameObj = catDoc.data().name;
                await db.collection('products').doc(String(productId)).update({ category: catNameObj });
                const catName = getStr(catNameObj);
                const state = userState[chatId] || { step: 'none', data: {}, steps: [] };
                state.data.productId = productId; state.data.messageId = messageId;
                userState[chatId] = state;
                await showProductView(chatId, productId, messageId);
                bot.answerCallbackQuery(cq.id, { text: `✅ Kategoriya: ${catName}` });
            } catch (error) { bot.answerCallbackQuery(cq.id, { text: "Xato!" }); }
            return;
        }

        // Nomi/Tavsifni har bir tilda ALOHIDA ko'rish va tahrirlash —
        // avval "Nomi"/"Tavsif" tugmasi hammasini (uz/ru/en) qaytadan
        // yozdirar edi, joriy qiymatlarni ko'rsatmasdan. callback_data:
        // update_ml_{name|description}_{uz|ru|en}_{productId}
        if (data.startsWith('update_ml_')) {
            const rest = data.replace('update_ml_', '');
            const parts = rest.split('_');
            const id = parseInt(parts[parts.length - 1]);
            const lang = parts[parts.length - 2];
            const field = parts.slice(0, parts.length - 2).join('_');
            try {
                const doc = await db.collection('products').doc(String(id)).get();
                if (!doc.exists) { bot.answerCallbackQuery(cq.id, { text: "Topilmadi!" }); return; }
                const fieldData = doc.data()[field];
                const currentValue = (fieldData && typeof fieldData === 'object') ? (fieldData[lang] || '') : (lang === 'uz' ? getStr(fieldData) : '');
                const cur = userState[chatId] || { step: 'none', data: {}, steps: [] };
                userState[chatId] = {
                    step: 'update_ml_field',
                    data: { productId: id, mlField: field, lang, selectedCategory: cur.data.selectedCategory, messageId },
                    steps: cur.steps || [],
                };
                const langLabel = { uz: "O'ZBEKCHA", ru: "RUSCHA", en: "INGLIZCHA" }[lang] || lang;
                const fieldLabel = field === 'name' ? 'Nomi' : 'Tavsifi';
                const preview = currentValue ? `\n\nJoriy qiymat: "${currentValue}"` : '\n\n(Hozircha bo\'sh)';
                bot.sendMessage(chatId, `${fieldLabel} (${langLabel}) uchun yangi matn kiriting:${preview}`, backKeyboard);
                bot.answerCallbackQuery(cq.id);
            } catch (error) { bot.answerCallbackQuery(cq.id, { text: "Xato!" }); }
            return;
        }

        if (data.startsWith('update_field_')) {
            if (data.startsWith('update_field_discountStart_') || data.startsWith('update_field_discountEnd_')) {
                const isStart = data.startsWith('update_field_discountStart_');
                const id = parseInt(isStart ? data.replace('update_field_discountStart_', '') : data.replace('update_field_discountEnd_', ''));
                const fieldName = isStart ? 'discountStartDate' : 'discountEndDate';
                const fieldLabel = isStart ? 'Chegirma boshlanish sanasi' : 'Chegirma tugash sanasi';
                const cur = userState[chatId] || { step: 'none', data: {}, steps: [] };
                userState[chatId] = { step: 'update_discount_date', data: { productId: id, dateField: fieldName, dateLabel: fieldLabel, selectedCategory: cur.data.selectedCategory, messageId }, steps: cur.steps || [] };
                bot.sendMessage(chatId, `${fieldLabel}ni kiriting:\nFormat: DD.MM.YYYY (mas: 13.05.2026)\nO'chirish uchun: 0`, backKeyboard);
                bot.answerCallbackQuery(cq.id); return;
            }
            const parts = data.split('_');
            const fieldType = parts[2];
            const id = parseInt(parts[3]);
            const cur = userState[chatId] || { step: 'none', data: {}, steps: [] };
            const preserve = { selectedCategory: cur.data.selectedCategory, messageId };
            if (fieldType === 'image') {
                userState[chatId] = { step: 'update_product_image', data: { productId: id, ...preserve }, steps: cur.steps || [] };
                const { mainBackKeyboard } = require('../keyboards');
                bot.sendMessage(chatId, 'Yangi rasm yuboring:', mainBackKeyboard);
            } else {
                userState[chatId] = { step: 'update_value', data: { productId: id, field: fieldType, ...preserve }, steps: cur.steps || [] };
                const labelMap = { pricePiece: "Narx (dona, USD, mas: 6.53)", priceBox: "Narx (karobka, USD, mas: 24.99)", discount: 'Chegirma (%)', stock: 'Stock' };
                bot.sendMessage(chatId, `${labelMap[fieldType] || fieldType} uchun yangi qiymatni yuboring:`, backKeyboard);
            }
            bot.answerCallbackQuery(cq.id); return;
        }

        if (data.startsWith('delete_banner_')) {
            const id = data.replace('delete_banner_', '');
            bot.editMessageText(
                "⚠️ Bu bannerni o'chirishni tasdiqlaysizmi? Bu amalni ortga qaytarib bo'lmaydi.",
                {
                    chat_id: chatId, message_id: messageId,
                    reply_markup: {
                        inline_keyboard: [[
                            { text: "✅ Ha, o'chirish", callback_data: `confirm_delete_banner_${id}` },
                            { text: "❌ Yo'q", callback_data: `cancel_delete_banner` },
                        ]],
                    },
                }
            );
            bot.answerCallbackQuery(cq.id);
            return;
        }

        if (data.startsWith('confirm_delete_banner_')) {
            const id = data.replace('confirm_delete_banner_', '');
            try {
                await db.collection('banners').doc(id).delete();
                bot.editMessageText(`✅ Banner o'chirildi.`, { chat_id: chatId, message_id: messageId });
                bot.answerCallbackQuery(cq.id);
            } catch (error) { bot.answerCallbackQuery(cq.id, { text: "Xato!" }); }
            return;
        }

        if (data === 'cancel_delete_banner') {
            await showBannerDeleteList(chatId, messageId);
            bot.answerCallbackQuery(cq.id);
            return;
        }

        if (data.startsWith('delete_product_')) {
            const id = parseInt(data.replace('delete_product_', ''));
            try {
                const doc = await db.collection('products').doc(String(id)).get();
                if (!doc.exists) { bot.answerCallbackQuery(cq.id, { text: "Topilmadi!" }); return; }
                const p = doc.data();
                bot.editMessageText(
                    `⚠️ "${getStr(p.name)}" mahsulotini o'chirishni tasdiqlaysizmi? Bu amalni ortga qaytarib bo'lmaydi.`,
                    {
                        chat_id: chatId, message_id: messageId,
                        reply_markup: {
                            inline_keyboard: [[
                                { text: "✅ Ha, o'chirish", callback_data: `confirm_delete_product_${id}` },
                                { text: "❌ Yo'q", callback_data: `cancel_delete_product_${id}` },
                            ]],
                        },
                    }
                );
                bot.answerCallbackQuery(cq.id);
            } catch (error) { bot.answerCallbackQuery(cq.id, { text: "Xato!" }); }
            return;
        }

        if (data.startsWith('confirm_delete_product_')) {
            const id = parseInt(data.replace('confirm_delete_product_', ''));
            try {
                const doc = await db.collection('products').doc(String(id)).get();
                const pName = doc.exists ? getStr(doc.data().name) : 'Noma\'lum';
                await db.collection('products').doc(String(id)).delete();
                bot.editMessageText(`✅ "${pName}" o'chirildi.`, { chat_id: chatId, message_id: messageId });
                bot.answerCallbackQuery(cq.id);
            } catch (error) { bot.answerCallbackQuery(cq.id, { text: "Xato!" }); }
            return;
        }

        if (data.startsWith('cancel_delete_product_')) {
            const id = parseInt(data.replace('cancel_delete_product_', ''));
            await showProductView(chatId, id, messageId);
            bot.answerCallbackQuery(cq.id);
            return;
        }

        if (data.startsWith('confirm_delete_vip_')) {
            const telegramId = data.replace('confirm_delete_vip_', '');
            try {
                const doc = await db.collection('VIP_Clients').doc(telegramId).get();
                const vipName = doc.exists ? (doc.data().username || 'Noma\'lum') : 'Noma\'lum';
                await db.collection('VIP_Clients').doc(telegramId).delete();
                bot.editMessageText(`✅ VIP o'chirildi!\n\n👤 Ism: ${vipName}\n🆔 Telegram ID: ${telegramId}`, { chat_id: chatId, message_id: messageId });
                bot.answerCallbackQuery(cq.id);
            } catch (error) { bot.answerCallbackQuery(cq.id, { text: "Xato!" }); }
            return;
        }

        if (data === 'cancel_delete_vip') {
            bot.editMessageText("Bekor qilindi.", { chat_id: chatId, message_id: messageId });
            bot.answerCallbackQuery(cq.id);
            return;
        }
    });
}

module.exports = { registerCallbackHandler };


