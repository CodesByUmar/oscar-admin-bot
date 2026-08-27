const { bot } = require('../config/adminBot');
const { backKeyboard, getMainKeyboard } = require('../keyboards');
const { userState, resetUserState } = require('../state/userState');
const { showProductView, showProductsInCategory, showProductUpdateCategorySelect } = require('../views/product');
const { showCategoryView, showCategoryUpdateSelect } = require('../views/category');
const { handleProductStep, handleCategoryStep } = require('./steps');

async function handleBack(chatId) {
    const state = userState[chatId];
    if (!state || state.steps.length === 0) {
        resetUserState(chatId);
        bot.sendMessage(chatId, "Bosh menyu.", getMainKeyboard(chatId));
        return;
    }
    const prevStep = state.steps.pop();
    state.step = prevStep;

    if (prevStep === 'product_update_view') {
        await showProductView(chatId, state.data.productId, state.data.messageId);
    } else if (prevStep === 'product_update_product_select') {
        if (state.data.selectedCategory) await showProductsInCategory(chatId, state.data.selectedCategory, state.data.messageId);
        else { resetUserState(chatId); bot.sendMessage(chatId, "Bosh menyu.", getMainKeyboard(chatId)); }
    } else if (['update_product_name', 'update_product_description', 'update_product_image', 'update_value', 'update_discount_date'].includes(prevStep)) {
        await showProductView(chatId, state.data.productId, state.data.messageId);
    } else if (prevStep === 'category_update_view') {
        await showCategoryView(chatId, state.data.categoryId, state.data.messageId);
    } else if (['update_category_name', 'update_category_icon'].includes(prevStep)) {
        await showCategoryView(chatId, state.data.categoryId, state.data.messageId);
    } else if (prevStep.startsWith('product_')) {
        await handleProductStep(chatId, prevStep, true);
    } else if (prevStep.startsWith('category_')) {
        await handleCategoryStep(chatId, prevStep, true);
    } else {
        resetUserState(chatId);
        bot.sendMessage(chatId, "Bosh menyu.", getMainKeyboard(chatId));
    }
}

async function handleInlineBack(chatId, messageId) {
    const state = userState[chatId];
    if (!state || state.steps.length === 0) {
        resetUserState(chatId);
        bot.editMessageText("Bekor qilindi.", { chat_id: chatId, message_id: messageId });
        bot.sendMessage(chatId, "Bosh menyu.", getMainKeyboard(chatId));
        return;
    }
    const prevStep = state.steps.pop();
    state.step = prevStep;
    if (prevStep === 'category_update_select') await showCategoryUpdateSelect(chatId, messageId);
    else if (prevStep === 'product_update_category_select') await showProductUpdateCategorySelect(chatId, messageId);
    else if (prevStep === 'product_update_product_select') {
        if (state.data.selectedCategory) await showProductsInCategory(chatId, state.data.selectedCategory, messageId);
        else await showProductUpdateCategorySelect(chatId, messageId);
    } else if (prevStep === 'category_update_view') await showCategoryView(chatId, state.data.categoryId, messageId);
    else if (prevStep === 'product_update_view') await showProductView(chatId, state.data.productId, messageId);
    else {
        resetUserState(chatId);
        bot.editMessageText("Bekor qilindi.", { chat_id: chatId, message_id: messageId });
        bot.sendMessage(chatId, "Bosh menyu.", getMainKeyboard(chatId));
    }
}

module.exports = { handleBack, handleInlineBack };
