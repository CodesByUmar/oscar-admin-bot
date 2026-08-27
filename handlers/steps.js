const { bot } = require('../config/adminBot');
const { backKeyboard, mainBackKeyboard } = require('../keyboards');
const { userState } = require('../state/userState');

async function handleProductStep(chatId, currentStep, isBack = false) {
    const state = userState[chatId];
    const data = state.data;
    const oldStep = state.step;
    if (!isBack) state.steps.push(oldStep);
    state.step = currentStep;
    switch (currentStep) {
        case 'product_name_uz':
            bot.sendMessage(chatId, "1a. Mahsulot nomini UZ tilida kiriting (RU/EN avtomatik tarjima qilinadi):", backKeyboard);
            break;
        case 'product_price_piece':
            bot.sendMessage(chatId, "2. Dona narxini USD da kiriting (mas: 3.5):", backKeyboard);
            break;
        case 'product_price_box':
            bot.sendMessage(chatId, "2b. Karobka narxini USD da kiriting (yo'q bo'lsa 0):", backKeyboard);
            break;
        case 'product_items_per_box':
            bot.sendMessage(chatId, "2c. Bir karobkada nechta dona? (yo'q bo'lsa 0):", backKeyboard);
            break;
        case 'product_discount':
            bot.sendMessage(chatId, "3. Chegirma (0-100, mas: 10 yoki 0):", backKeyboard);
            break;
        case 'product_category': {
            const kb = {
                reply_markup: {
                    keyboard: [...data.categoryNames.map(c => [{ text: c.label }]), ["Orqaga"]],
                    resize_keyboard: true,
                    one_time_keyboard: true,
                },
            };
            bot.sendMessage(chatId, "4. Kategoriyani tanlang:", kb);
            break;
        }
        case 'product_image':
            bot.sendMessage(chatId, "5. Rasm yuboring (photo formatida):", mainBackKeyboard);
            break;
        case 'product_description_uz':
            bot.sendMessage(chatId, "6a. Tavsifni UZ tilida kiriting (RU/EN avtomatik tarjima qilinadi):", backKeyboard);
            break;
        case 'product_stock':
            bot.sendMessage(chatId, "7. Ombordagi miqdor (mas: 50):", backKeyboard);
            break;
    }
}

async function handleCategoryStep(chatId, currentStep, isBack = false) {
    const state = userState[chatId];
    const oldStep = state.step;
    if (!isBack) state.steps.push(oldStep);
    state.step = currentStep;
    if (currentStep === 'category_name') bot.sendMessage(chatId, "1/2. Kategoriya nomini kiriting:", backKeyboard);
    else if (currentStep === 'category_icon') bot.sendMessage(chatId, "2/2. Ikonka (emoji, mas: 🔧):", backKeyboard);
}

module.exports = { handleProductStep, handleCategoryStep };
