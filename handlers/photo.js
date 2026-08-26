const { bot, admins } = require('../config/adminBot');
const { db, admin } = require('../config/firebase');
const { backKeyboard, mainKeyboard } = require('../keyboards');
const { userState, resetUserState } = require('../state/userState');
const { uploadToImgBB } = require('../utils/imgbb');
const { showProductView } = require('../views/product');

// Bitta chat uchun rasmlarni KETMA-KET ishlash — aks holda admin bir nechta
// rasmni tez-tez yuborsa, ularning bot.on('photo') ishlovchilari bir-biriga
// qоплаб (parallel) ishga tushib, umumiy state.data'ni bir-biridan "o'g'irlab"
// qo'yadi va navbat aralashib ketadi.
const processingChain = new Map(); // chatId -> oxirgi navbatdagi Promise

function enqueuePhotoProcessing(chatId, fileId) {
    const previous = processingChain.get(chatId) || Promise.resolve();
    const next = previous
        .then(() => processIncomingPhoto(chatId, fileId))
        .catch((error) => console.error('Rasm navbatida xato:', error));
    processingChain.set(chatId, next);
    return next;
}

async function processIncomingPhoto(chatId, fileId) {
        if (!admins.includes(chatId)) {
            bot.sendMessage(chatId, `Bu bot faqat administratorlar uchun.\nSizning ID: ${chatId}`);
            return;
        }
        if (!db) return;
        const state = userState[chatId];
        if (state && state.step === 'banner_image') {
            const waitMsg = await bot.sendMessage(chatId, "Banner yuklanmoqda... ⏳");
            const imageUrl = await uploadToImgBB(fileId);
            if (imageUrl) {
                try {
                    const countSnap = await db.collection('banners').get();
                    await db.collection('banners').add({
                        image: imageUrl,
                        link: null,
                        order: countSnap.size,
                        createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    });
                    resetUserState(chatId);
                    bot.editMessageText("✅ Banner qo'shildi! Mini-appda darhol ko'rinadi.", { chat_id: chatId, message_id: waitMsg.message_id });
                    bot.sendMessage(chatId, "Davom eting.", mainKeyboard);
                } catch (error) {
                    bot.editMessageText("❌ Bannerni saqlashda xato!", { chat_id: chatId, message_id: waitMsg.message_id });
                }
            } else {
                bot.editMessageText("❌ Rasm yuklashda xato!", { chat_id: chatId, message_id: waitMsg.message_id });
            }
        } else if (state && (state.step === 'product_image' || state.step === 'update_product_image')) {
            const waitMsg = await bot.sendMessage(chatId, "Rasm yuklanmoqda... ⏳");
            const imageUrl = await uploadToImgBB(fileId);
            if (imageUrl) {
                state.data.image = imageUrl;
                if (state.step === 'product_image') {
                    state.steps.push(state.step);
                    state.step = 'product_description_uz';
                    bot.editMessageText("✅ Rasm yuklandi!\n6a. Tavsifni UZ tilida kiriting:", { chat_id: chatId, message_id: waitMsg.message_id });
                    bot.sendMessage(chatId, "Tavsif (UZ):", backKeyboard);
                } else {
                    try {
                        await db.collection('products').doc(String(state.data.productId)).update({ image: imageUrl });
                        state.step = 'product_update_view';
                        await showProductView(chatId, state.data.productId, state.data.messageId);
                        bot.editMessageText("✅ Rasm yangilandi!", { chat_id: chatId, message_id: waitMsg.message_id });
                        bot.sendMessage(chatId, "Davom eting.", backKeyboard);
                    } catch (error) {
                        bot.editMessageText("❌ Xato!", { chat_id: chatId, message_id: waitMsg.message_id });
                    }
                }
            } else {
                bot.editMessageText("❌ Rasm yuklashda xato!", { chat_id: chatId, message_id: waitMsg.message_id });
            }
        } else {
            const { mainKeyboard } = require('../keyboards');
            bot.sendMessage(chatId, "Rasm kutilmayapti.", mainKeyboard);
        }
}

function registerPhotoHandler() {
    bot.on('photo', async (msg) => {
        const fileId = msg.photo[msg.photo.length - 1].file_id;
        enqueuePhotoProcessing(msg.chat.id, fileId);
    });
}

module.exports = { registerPhotoHandler };
