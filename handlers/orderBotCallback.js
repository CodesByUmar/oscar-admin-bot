const { bot, admins } = require('../config/orderBot');
const { db, admin } = require('../config/firebase');
const { getUserBot } = require('../bots/userBot');
const { isSuperAdmin } = require('../keyboards');
const { getAdminDisplayName } = require('../utils/helpers');

function registerOrderBotCallbacks() {
    if (!bot) return;
    if (!db) { console.warn("⚠️ DB yo'q — order bot callback ishlamaydi."); return; }

    bot.on('callback_query', async (cq) => {
        const chatId = cq.message.chat.id;
        const messageId = cq.message.message_id;
        const data = cq.data;

        if (!data || !admins.includes(chatId)) {
            bot.answerCallbackQuery(cq.id, { text: "Ruxsat yo'q!" });
            return;
        }

        // Buyurtmani tasdiqlash/bekor qilish/yetkazish — faqat super admin.
        if ((data.startsWith('confirm_order_') || data.startsWith('cancel_order_') || data.startsWith('deliver_order_')) && !isSuperAdmin(chatId)) {
            bot.answerCallbackQuery(cq.id, { text: "⛔ Bu amal faqat super adminlar uchun." });
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
                if (orderData.status !== 'pending') {
                    bot.answerCallbackQuery(cq.id, { text: `Allaqachon ${orderData.status}!` });
                    return;
                }

                const newStatus = isConfirm ? 'confirmed' : 'cancelled';
                const adminDisplayName = getAdminDisplayName(cq.from);
                await orderRef.update({
                    status: newStatus,
                    [isConfirm ? 'confirmedBy' : 'cancelledBy']: { id: cq.from.id, name: adminDisplayName },
                    [isConfirm ? 'confirmedAt' : 'cancelledAt']: admin.firestore.FieldValue.serverTimestamp(),
                });

                if (isConfirm && orderData.telegramChatId) {
                    try {
                        const customerRef = db.collection('customers').doc(String(orderData.telegramChatId));
                        const customerDoc = await customerRef.get();
                        if (customerDoc.exists) {
                            const c = customerDoc.data();
                            const currentCount = c.ordersCount || 0;
                            const newCount = currentCount >= 2 ? 0 : currentCount + 1;
                            await customerRef.update({ ordersCount: newCount, totalOrders: (c.totalOrders || 0) + 1 });
                        }
                    } catch (err) {
                        console.error("Mijoz statistikasini yangilashda xato:", err.message);
                    }
                }

                const statusLine = isConfirm ? `✅ Qabul qilindi — ${adminDisplayName}` : `❌ Bekor qilindi — ${adminDisplayName}`;

                const newKeyboard = isConfirm
                    ? { inline_keyboard: [[{ text: "🚚 Yetkazildi deb belgilash", callback_data: `deliver_order_${orderId}` }]] }
                    : { inline_keyboard: [] };

                bot.editMessageText(`${cq.message.text}\n\n=================\n${statusLine}`, {
                    chat_id: chatId, message_id: messageId, reply_markup: newKeyboard,
                });
                bot.answerCallbackQuery(cq.id, { text: isConfirm ? "Qabul qilindi" : "Bekor qilindi" });

                admins.forEach(aId => {
                    if (aId !== chatId) bot.sendMessage(aId, `Buyurtma ${orderId} ${isConfirm ? 'qabul qilindi' : 'bekor qilindi'} → ${adminDisplayName}`);
                });

                notifyCustomer(orderData.telegramChatId, orderId,
                    isConfirm
                        ? `✅ Buyurtmangiz qabul qilindi!\n\n🆔 ${orderId}\n\nTez orada yetkazib beriladi.`
                        : `❌ Afsuski, buyurtmangiz bekor qilindi.\n\n🆔 ${orderId}\n\nSavollar bo'lsa, qo'llab-quvvatlash xizmatiga murojaat qiling.`
                );
            } catch (error) {
                console.error("Buyurtma (order bot) xato:", error);
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

                const deliveredByName = getAdminDisplayName(cq.from);
                await orderRef.update({
                    status: 'delivered',
                    deliveredBy: { id: cq.from.id, name: deliveredByName },
                    deliveredAt: admin.firestore.FieldValue.serverTimestamp(),
                });

                bot.editMessageText(`${cq.message.text}\n\n🚚 Yetkazildi — ${deliveredByName}`, {
                    chat_id: chatId, message_id: messageId, reply_markup: { inline_keyboard: [] },
                });
                bot.answerCallbackQuery(cq.id, { text: "Yetkazildi deb belgilandi" });

                admins.forEach(aId => {
                    if (aId !== chatId) bot.sendMessage(aId, `Buyurtma ${orderId} yetkazildi → ${deliveredByName}`);
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
    });
}

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

module.exports = { registerOrderBotCallbacks };