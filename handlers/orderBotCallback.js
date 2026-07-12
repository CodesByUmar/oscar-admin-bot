const { bot, admins } = require('../config/orderBot');
const { db } = require('../config/firebase');
const { getUserBot } = require('../bots/userBot');

// Bu bot faqat: yangi buyurtma xabarini ko'rsatish, Tasdiqlash/Bekor qilish,
// va tasdiqlangandan keyin "Yetkazildi" deb belgilashni boshqaradi.
// Buyurtmalar ro'yxati / statistika kabi funksiyalar admin botda o'zgarishsiz qoladi.
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

        // ── Tasdiqlash / Bekor qilish ──────────────────────────────
        if (data.startsWith('confirm_order_') || data.startsWith('cancel_order_')) {
            const isConfirm = data.startsWith('confirm_order_');
            const orderId = isConfirm ? data.replace('confirm_order_', '') : data.replace('cancel_order_', '');
            try {
                const orderRef = db.collection('orders').doc(orderId);
                const doc = await orderRef.get();
                if (!doc.exists) { bot.answerCallbackQuery(cq.id, { text: "Topilmadi!" }); return; }
                const orderData = doc.data();
                if (orderData.status !== 'new') {
                    bot.answerCallbackQuery(cq.id, { text: `Allaqachon ${orderData.status}!` });
                    return;
                }

                const newStatus = isConfirm ? 'confirmed' : 'cancelled';
                await orderRef.update({ status: newStatus });

                // Mijozlar statistikasi (faqat tasdiqlanganda, admin botdagi kabi)
                if (isConfirm && orderData.customerTelegramId) {
                    try {
                        const customerRef = db.collection('customers').doc(String(orderData.customerTelegramId));
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

                const adminName = cq.from.first_name || "Admin";
                const statusLine = isConfirm ? `✅ Qabul qilindi — ${adminName}` : `❌ Bekor qilindi — ${adminName}`;

                // Tasdiqlangan bo'lsa — "Yetkazildi" deb belgilash tugmasini qoldiramiz.
                const newKeyboard = isConfirm
                    ? { inline_keyboard: [[{ text: "🚚 Yetkazildi deb belgilash", callback_data: `deliver_order_${orderId}` }]] }
                    : { inline_keyboard: [] };

                bot.editMessageText(`${cq.message.text}\n\n=================\n${statusLine}`, {
                    chat_id: chatId, message_id: messageId, reply_markup: newKeyboard,
                });
                bot.answerCallbackQuery(cq.id, { text: isConfirm ? "Qabul qilindi" : "Bekor qilindi" });

                admins.forEach(aId => {
                    if (aId !== chatId) bot.sendMessage(aId, `Buyurtma ${orderId} ${isConfirm ? 'qabul qilindi' : 'bekor qilindi'} → ${adminName}`);
                });

                // Mijozga (mini-app / birinchi bot orqali) xabar
                notifyCustomer(orderData.customerTelegramId, orderId,
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

        // ── Yetkazildi deb belgilash ────────────────────────────────
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

                notifyCustomer(orderData.customerTelegramId, orderId,
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

async function notifyCustomer(customerTelegramId, orderId, text) {
    if (!customerTelegramId) return;
    try {
        const userBot = getUserBot();
        if (userBot) {
            await userBot.sendMessage(Number(customerTelegramId), text);
        } else {
            console.log('User bot ishga tushmagan, mijozga status xabari yuborilmadi.');
        }
    } catch (err) {
        console.log(`Mijozga (${customerTelegramId}) status xabarini (buyurtma ${orderId}) yuborib bo'lmadi:`, err.message);
    }
}

module.exports = { registerOrderBotCallbacks };