const { bot, admins } = require('../config/adminBot');
const { db, admin } = require('../config/firebase');
const { backKeyboard, mainKeyboard } = require('../keyboards');
const { userState, resetUserState } = require('../state/userState');
const { uploadToImgBB } = require('../utils/imgbb');
const { showProductView } = require('../views/product');

async function processIncomingImage(chatId, fileId) {
    if (!admins.includes(chatId)) return;
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
    } else if (state && state.step === 'bulk_item_image') {
        const waitMsg = await bot.sendMessage(chatId, "Rasm yuklanmoqda... ⏳");
        const imageUrl = await uploadToImgBB(fileId);
        if (imageUrl) {
            const item = state.data.bulkQueue[state.data.bulkIndex];
            item.image = imageUrl;
            state.step = 'bulk_item_price';
            bot.editMessageText(
                `✅ Rasm yuklandi!\n\n"${item.name}" uchun dona narxini USD da kiriting (mas: 6.53):`,
                { chat_id: chatId, message_id: waitMsg.message_id }
            );
        } else {
            bot.editMessageText("❌ Rasm yuklashda xato! Qaytadan yuboring.", { chat_id: chatId, message_id: waitMsg.message_id });
        }
    } else if (state && state.step === 'fix_image_item') {
        const waitMsg = await bot.sendMessage(chatId, "Rasm yuklanmoqda... ⏳");
        const imageUrl = await uploadToImgBB(fileId);
        if (imageUrl) {
            const item = state.data.bulkQueue[state.data.bulkIndex];
            try {
                await db.collection('products').doc(String(item.productId)).update({
                    image: imageUrl,
                    imageBroken: admin.firestore.FieldValue.delete(),
                });
                state.data.bulkFixed.push(item.name);
            } catch (error) {
                console.error("Rasmni tuzatishda xato:", error);
            }
            state.data.bulkIndex++;
            if (state.data.bulkIndex >= state.data.bulkQueue.length) {
                bot.editMessageText(
                    `🎉 Tugadi! ${state.data.bulkFixed.length}/${state.data.bulkQueue.length} ta rasm yangilandi.`,
                    { chat_id: chatId, message_id: waitMsg.message_id }
                );
                bot.sendMessage(chatId, "Davom eting.", mainKeyboard);
                resetUserState(chatId);
            } else {
                const next = state.data.bulkQueue[state.data.bulkIndex];
                bot.editMessageText(
                    `✅ Yangilandi!\n\n📦 ${state.data.bulkIndex + 1}/${state.data.bulkQueue.length}: ${next.name}\n\nShu mahsulot uchun yangi rasm yuboring:`,
                    { chat_id: chatId, message_id: waitMsg.message_id }
                );
            }
        } else {
            bot.editMessageText("❌ Rasm yuklashda xato! Qaytadan yuboring.", { chat_id: chatId, message_id: waitMsg.message_id });
        }
    } else if (state && state.step === 'draft_photo_item') {
        // Draftlar uchun RASM bosqichi — narx bu yerda so'ralmaydi, hammasi tugagach alohida so'raladi.
        const waitMsg = await bot.sendMessage(chatId, "Rasm yuklanmoqda... ⏳");
        const imageUrl = await uploadToImgBB(fileId);
        if (imageUrl) {
            const item = state.data.bulkQueue[state.data.bulkIndex];
            item.image = imageUrl;
            state.data.bulkIndex++;
            if (state.data.bulkIndex >= state.data.bulkQueue.length) {
                state.step = 'draft_price_item';
                state.data.bulkIndex = 0;
                const first = state.data.bulkQueue[0];
                bot.editMessageText(
                    `✅ Qabul qilindi!\n\n🎉 Barcha rasmlar qabul qilindi! Endi narxlarni so'rayman — har biriga USD narxini yozib yuboraverasiz.`,
                    { chat_id: chatId, message_id: waitMsg.message_id }
                );
                bot.sendMessage(chatId, `💰 1/${state.data.bulkQueue.length}: ${first.name}\n\nDona narxini USD da kiriting (mas: 6.53):`);
            } else {
                const next = state.data.bulkQueue[state.data.bulkIndex];
                bot.editMessageText(
                    `✅ Qabul qilindi!\n\n📦 ${state.data.bulkIndex + 1}/${state.data.bulkQueue.length}: ${next.name}\n\nRasmini yuboring:`,
                    { chat_id: chatId, message_id: waitMsg.message_id }
                );
            }
        } else {
            bot.editMessageText("❌ Rasm yuklashda xato! Qaytadan yuboring.", { chat_id: chatId, message_id: waitMsg.message_id });
        }
    } else {
        const { mainKeyboard } = require('../keyboards');
        bot.sendMessage(chatId, "Rasm kutilmayapti.", mainKeyboard);
    }
}

// Bitta chat uchun rasmlarni KETMA-KET ishlash — aks holda admin bir nechta
// rasmni tez-tez yuborsa, ularning bot.on() ishlovchilari bir-biriga qоплаб
// (parallel) ishga tushib, state.data.bulkIndex'ni bir-biridan "o'g'irlab"
// qo'yadi va navbat aralashib ketadi (masalan 3/50, 4/50, 2/50, 7/50...).
const processingChain = new Map(); // chatId -> oxirgi navbatdagi Promise

function enqueueImageProcessing(chatId, fileId) {
    const previous = processingChain.get(chatId) || Promise.resolve();
    const next = previous
        .then(() => processIncomingImage(chatId, fileId))
        .catch((error) => console.error('Rasm navbatida xato:', error));
    processingChain.set(chatId, next);
    return next;
}

function registerPhotoHandler() {
    bot.on('photo', async (msg) => {
        const fileId = msg.photo[msg.photo.length - 1].file_id;
        enqueueImageProcessing(msg.chat.id, fileId);
    });
    // Rasm "fayl" (document) sifatida siqilmasdan yuborilganda ham qabul qilish —
    // masalan yuqori sifatli mahsulot rasmlarini "Compress: off" bilan yuborishganda.
    bot.on('document', async (msg) => {
        const doc = msg.document;
        if (!doc || !doc.mime_type || !doc.mime_type.startsWith('image/')) return;
        enqueueImageProcessing(msg.chat.id, doc.file_id);
    });
}

module.exports = { registerPhotoHandler };
