// index.js
// 1. Kutubxonalarni chaqirish va .env ni yuklash
require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const admin = require('firebase-admin');
const axios = require('axios');
const FormData = require('form-data');

// 2. Maxfiy ma'lumotlarni Environment Variables (Railway) dan olish
const TOKEN = process.env.TELEGRAM_BOT_TOKEN || '7586941333:AAHKly13Z3M5qkyKjP-6x-thWvXdJudIHsU';
const IMGBB_API_KEY = process.env.IMGBB_API_KEY || '92f447e91c83252eedc95d323bf1b92a';
// Admin ID'lar stringdan Arrayga o'tkaziladi
const admins = (process.env.ADMIN_IDS || '5761225998,7122472578,6600096842').split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));

// 3. 🛠️ FIREBASE'NI SOZLASH (YANGILANGAN QISM - Railway uchun)
let db;
try {
    // 1. JSON stringni ENVIRONMENT VARIABLE'dan o'qish
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (!serviceAccountJson) {
        throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON topilmadi. Variables bo'limini tekshiring.");
    }
    // 2. JSON stringni JS obyektiga aylantirish
    const serviceAccount = JSON.parse(serviceAccountJson);
    // 3. Firebase'ni sozlash
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: "https://oscar-d85af.firebaseio.com"
    });
    db = admin.firestore();
    console.log("✅ Firebase muvaffaqiyatli ulangan.");
} catch (error) {
    console.error("❌ Firebase sozlashda KRITIK XATO!", error.message);
}

const bot = new TelegramBot(TOKEN, { polling: true });

// --- YANGI QO'SHILGAN BUYURTMALAR LISTENERI ---
if (db) {
    const botStartTime = admin.firestore.Timestamp.now();
    console.log("🔔 Order listener faol...");

    db.collection('orders')
        .where('status', '==', 'new')
        .onSnapshot(snapshot => {
            snapshot.docChanges().forEach(change => {
                if (change.type === 'added') {
                    const orderData = change.doc.data();
                    const orderId = change.doc.id;
                    
                    // Faqat bot ishga tushgandan keyin qo'shilganlarni oling
                    // serverTimestamp() dastlab qo'shilayotganda ba'zan null bo'lishi mumkin (pending write)
                    let isNew = false;
                    if (orderData.createdAt) {
                        const orderTime = orderData.createdAt.toMillis ? orderData.createdAt.toMillis() : new Date(orderData.createdAt).getTime();
                        if (orderTime > botStartTime.toMillis()) {
                            isNew = true;
                        }
                    } else {
                        // Agar vaqt vaqtincha null bo'lsa (yangi yozilayotgan payt), uni yangi deb qabul qilamiz
                        isNew = true;
                    }

                    if (isNew) {
                        notifyAdminsNewOrder(orderId, orderData);
                    }
                }
            });
        }, error => {
            console.error("❌ Order listener xatosi:", error);
        });

    function notifyAdminsNewOrder(orderId, orderData) {
    const loc = orderData.location || {};
    
    let itemsText = '';
    if (orderData.items && orderData.items.length > 0) {
        itemsText = orderData.items.map(item => 
            `- ${item.quantity} x ${item.name} (${item.unit === 'box' ? 'Karobka' : 'Dona'}) — $${item.price.toFixed(2)}`
        ).join('\n');
    } else {
        itemsText = "Mahsulotlar yo'q";
    }

    const providerText = orderData.paymentProvider ? ` ${orderData.paymentProvider}` : '';
    const paymentMethodText = orderData.paymentMethod === 'cash' ? 'Naqt' : `Karta${providerText}`;

    // === YETKAZIB BERISH MA'LUMOTLARI ===
    // Eski buyurtmalarda deliveryMethod bo'lmaydi — fallback bilan ishlaymiz
    let deliveryBlock = '';
    
    if (orderData.deliveryMethod === 'pickup') {
        // O'zim olib ketaman
        deliveryBlock = 
            `📦 Yetkazib berish usuli: O'zim olib ketaman\n` +
            `🏪 Olib ketish manzili: Original Colormix LLC (OSCAR), Chigatay qishlog'i, Toshkent viloyati\n` +
            `🗺 Xaritada ko'rish: https://maps.app.goo.gl/3UQiS5rZCUJdLDsf6\n\n`;
    } else if (orderData.deliveryMethod === 'delivery') {
        // Yetkazib berish
        const distance = orderData.distanceKm 
            ? `${orderData.distanceKm.toFixed(1)} km` 
            : "Noma'lum";
        
        const deliveryFeeUZS = orderData.deliveryFee || 0;
        const deliveryFeeUSD = orderData.deliveryFeeUsd || 0;
        const deliveryFeeText = deliveryFeeUZS === 0
            ? "Bepul ($100+ buyurtma uchun)"
            : `${deliveryFeeUZS.toLocaleString("uz-UZ")} so'm (≈ $${deliveryFeeUSD.toFixed(2)})`;
        
        deliveryBlock = 
            `📦 Yetkazib berish usuli: Yetkazib berish\n` +
            `📏 Masofa: ~${distance}\n` +
            `🚚 Yetkazib berish narxi: ${deliveryFeeText}\n` +
            `📍 Manzil: ${orderData.region || ''}, ${orderData.district || ''}\n` +
            `🗺 Aniq manzil: ${orderData.deliveryAddress || loc.address || 'Kiritilmagan'}\n\n`;
    } else {
        // ESKI buyurtmalar (deliveryMethod yo'q) — eski formatda ko'rsatamiz
        deliveryBlock = 
            `📍 Manzil: ${orderData.region || ''}, ${orderData.district || ''}\n` +
            `🗺 Aniq manzil: ${loc.address || 'Kiritilmagan'}\n\n`;
    }

    const message = `🛒 YANGI BUYURTMA!\n\n` +
        `👤 Mijoz: ${orderData.customerName || 'Noma\'lum'}\n` +
        `📞 Telefon: ${orderData.customerPhone || 'Noma\'lum'}\n\n` +
        deliveryBlock +
        `🛍 Mahsulotlar:\n${itemsText}\n\n` +
        `💰 Jami: ${(orderData.totalUZS || 0).toLocaleString("uz-UZ")} so'm (≈ $${(orderData.totalUSD || 0).toFixed(2)})\n` +
        `💳 To'lov: ${paymentMethodText}`;

    const inlineKeyboard = {
        inline_keyboard: [
            [
                { text: "✅ Tasdiqlash", callback_data: `confirm_order_${orderId}` },
                { text: "❌ Bekor qilish", callback_data: `cancel_order_${orderId}` }
            ]
        ]
    };

    admins.forEach(adminId => {
        bot.sendMessage(adminId, message, { reply_markup: inlineKeyboard }).catch(err => {
            console.error(`Admin ${adminId} ga xabar yuborishda xato:`, err.message);
        });
    });
}
}
// ----------------------------------------------

const userState = {}; // Foydalanuvchi holatini saqlash

// RANGLAR RO'YXATI
const AVAILABLE_COLORS = [
    { id: 'qizil', name: 'Qizil', emoji: '🔴' },
    { id: 'yashil', name: 'Yashil', emoji: '🟢' },
    { id: 'kok', name: "Ko'k", emoji: '🔵' },
    { id: 'sariq', name: 'Sariq', emoji: '🟡' },
    { id: 'qora', name: 'Qora', emoji: '⚫' },
    { id: 'oq', name: 'Oq', emoji: '⚪' },
    { id: 'kulrang', name: 'Kulrang', emoji: '🩶' },
    { id: 'jigarrang', name: 'Jigarrang', emoji: '🟤' },
    { id: 'pushti', name: 'Pushti', emoji: '🩷' },
    { id: 'binafsha', name: 'Binafsha', emoji: '🟣' },
    { id: 'toq_sariq', name: "To'q sariq", emoji: '🟠' },
    { id: 'havorang', name: 'Havorang', emoji: '🩵' }
];

// 4. Asosiy boshqaruv klaviaturasi
const mainKeyboard = {
    reply_markup: {
        keyboard: [
            [{ text: "🛍 Mahsulot qo'shish" }, { text: "📂 Kategoriya qo'shish" }],
            [{ text: "📂 Kategoriya yangilash" }, { text: "🔄 Mahsulotni yangilash" }],
            [{ text: "📊 Ma'lumotlarni ko'rish" }, { text: "📦 Buyurtmalar" }],
            [{ text: "❌ Bekor qilish" }],
        ],
        resize_keyboard: true,
    },
};

// Orqaga tugmasi bilan universal keyboard
const backKeyboard = {
    reply_markup: {
        keyboard: [["Orqaga"]],
        resize_keyboard: true,
        one_time_keyboard: false
    }
};

// Orqaga + main
const mainBackKeyboard = {
    reply_markup: {
        keyboard: [
            ...mainKeyboard.reply_markup.keyboard.slice(0, -1),
            [{ text: "❌ Bekor qilish" }, { text: "Orqaga" }]
        ],
        resize_keyboard: true,
    },
};

// 5. Yordamchi funksiyalar
// --------------------------------------------------------------------------------------
async function getNextId(collectionName) {
    if (!db) return -1;
    try {
        const snapshot = await db.collection(collectionName).orderBy('id', 'desc').limit(1).get();
        if (snapshot.empty) return 1;
        const lastId = snapshot.docs[0].data().id;
        const lastIdNum = parseInt(lastId);
        if (isNaN(lastIdNum) || lastIdNum <= 0) return 1;
        return lastIdNum + 1;
    } catch (error) {
        console.error(`Error in getNextId for ${collectionName}:`, error);
        return -1;
    }
}

async function uploadToImgBB(fileId) {
    try {
        const file = await bot.getFile(fileId);
        const fileUrl = `https://api.telegram.org/file/bot${TOKEN}/${file.file_path}`;
        const response = await axios.get(fileUrl, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(response.data);
        const form = new FormData();
        form.append('key', IMGBB_API_KEY);
        form.append('image', buffer, {
            filename: 'product_image.jpg',
            contentType: 'image/jpeg'
        });
        const uploadResponse = await axios.post('https://api.imgbb.com/1/upload', form, {
            headers: { ...form.getHeaders() }
        });
        if (uploadResponse.data.success) {
            return uploadResponse.data.data.url;
        } else {
            console.error('ImgBB yuklash muvaffaqiyatsiz:', uploadResponse.data);
            throw new Error('ImgBB yuklash muvaffaqiyatsiz');
        }
    } catch (error) {
        console.error('ImgBB yuklashda xato:', error.message || error);
        return null;
    }
}

async function getProductsInCategory(categoryName) {
    if (!db) return 0;
    try {
        const snapshot = await db.collection('products').where('category', '==', categoryName).get();
        return snapshot.size;
    } catch (error) {
        console.error('Kategoriyadagi mahsulotlar sonini olishda xato:', error);
        return 0;
    }
}

function resetUserState(chatId) {
    userState[chatId] = { step: 'none', data: {}, steps: [] };
}

// Ranglar inline keyboard yaratish
function createColorKeyboard(selectedColors = []) {
    const keyboard = [];
    for (let i = 0; i < AVAILABLE_COLORS.length; i += 2) {
        const row = [];
        const color1 = AVAILABLE_COLORS[i];
        const isSelected1 = selectedColors.includes(color1.id);
        row.push({
            text: `${isSelected1 ? '✅' : ''} ${color1.emoji} ${color1.name}`,
            callback_data: `color_toggle_${color1.id}`
        });
        
        if (i + 1 < AVAILABLE_COLORS.length) {
            const color2 = AVAILABLE_COLORS[i + 1];
            const isSelected2 = selectedColors.includes(color2.id);
            row.push({
                text: `${isSelected2 ? '✅' : ''} ${color2.emoji} ${color2.name}`,
                callback_data: `color_toggle_${color2.id}`
            });
        }
        keyboard.push(row);
    }
    
    // Saqlash tugmasi
    keyboard.push([{ text: '💾 Saqlash', callback_data: 'save_colors' }]);
    keyboard.push([{ text: '⬅️ Orqaga', callback_data: 'back_to_prev' }]);
    
    return { reply_markup: { inline_keyboard: keyboard } };
}

// TUZATILGAN: Orqaga qaytish handler
async function handleBack(chatId) {
    const state = userState[chatId];
    if (!state || state.steps.length === 0) {
        resetUserState(chatId);
        bot.sendMessage(chatId, "Bosh menyu.", mainKeyboard);
        return;
    }
    const prevStep = state.steps.pop();
    state.step = prevStep;
    console.log(`Orqaga qaytildi: ${prevStep}, qolgan qadamlar: ${state.steps.length}`);
    
    // Mahsulot yangilash jarayonidagi qadamlar uchun
    if (prevStep === 'product_update_view') {
        await showProductView(chatId, state.data.productId, state.data.messageId);
    } else if (prevStep === 'product_update_product_select') {
        const categoryName = state.data.selectedCategory;
        if (categoryName) {
            await showProductsInCategory(chatId, categoryName, state.data.messageId);
        } else {
            resetUserState(chatId);
            bot.sendMessage(chatId, "Jarayon bekor qilindi. Bosh menyu.", mainKeyboard);
        }
    } else if (prevStep === 'product_update_category_select') {
         const lastMessageId = state.data.lastInlineMessageId || state.data.messageId;
         if (lastMessageId) {
             bot.editMessageText("Mahsulot yangilash bekor qilindi. Bosh menyu.", {
                 chat_id: chatId,
                 message_id: lastMessageId,
                 parse_mode: 'Markdown'
             });
         }
         resetUserState(chatId);
         bot.sendMessage(chatId, "Bosh menyu.", mainKeyboard);
    } else if (prevStep === 'update_product_name' ||
               prevStep === 'update_product_description' ||
               prevStep === 'update_product_image' ||
               prevStep === 'update_value' ||
               prevStep === 'update_product_colors') {
        await showProductView(chatId, state.data.productId, state.data.messageId);
    }
    // Kategoriya yangilash jarayonidagi qadamlar uchun
     else if (prevStep === 'category_update_view') {
        await showCategoryView(chatId, state.data.categoryId, state.data.messageId);
    } else if (prevStep === 'category_update_select') {
         const lastMessageId = state.data.lastInlineMessageId || state.data.messageId;
         if (lastMessageId) {
             bot.editMessageText("Kategoriya yangilash bekor qilindi. Bosh menyu.", {
                 chat_id: chatId,
                 message_id: lastMessageId,
                 parse_mode: 'Markdown'
             });
         }
         resetUserState(chatId);
         bot.sendMessage(chatId, "Bosh menyu.", mainKeyboard);
    } else if (prevStep === 'update_category_name' ||
               prevStep === 'update_category_icon') {
        await showCategoryView(chatId, state.data.categoryId, state.data.messageId);
    }
    // Mahsulot qo'shish jarayoni uchun
    else if (prevStep.startsWith('product_')) {
        await handleProductStep(chatId, prevStep, true);
    }
    // Kategoriya qo'shish jarayoni uchun
    else if (prevStep.startsWith('category_')) {
        await handleCategoryStep(chatId, prevStep, true);
    }
    else {
        resetUserState(chatId);
        bot.sendMessage(chatId, "Bosh menyu.", mainKeyboard);
    }
}

// TUZATILGAN: Inline orqaga handler
async function handleInlineBack(chatId, messageId) {
    const state = userState[chatId];
    if (!state || state.steps.length === 0) {
        resetUserState(chatId);
        bot.editMessageText("Yangilash bekor qilindi. Bosh menyu.", {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: 'Markdown'
        });
        bot.sendMessage(chatId, "Bosh menyu.", mainKeyboard);
        return;
    }
    const prevStep = state.steps.pop();
    state.step = prevStep;
    console.log(`Inline orqaga qaytildi: ${prevStep}, qolgan qadamlar: ${state.steps.length}`);
    
    if (prevStep === 'category_update_select') {
        await showCategoryUpdateSelect(chatId, messageId);
    } else if (prevStep === 'product_update_category_select') {
        await showProductUpdateCategorySelect(chatId, messageId);
    } else if (prevStep === 'product_update_product_select') {
        const categoryName = state.data.selectedCategory;
        if (categoryName) {
            await showProductsInCategory(chatId, categoryName, messageId);
        } else {
            await showProductUpdateCategorySelect(chatId, messageId);
        }
    } else if (prevStep === 'category_update_view') {
        await showCategoryView(chatId, state.data.categoryId, messageId);
    } else if (prevStep === 'product_update_view') {
        await showProductView(chatId, state.data.productId, messageId);
    } else if (prevStep === 'product_colors') {
        // Mahsulot qo'shish jarayonida ranglardan orqaga
        state.step = 'product_colors';
        const hasColorsKeyboard = {
            reply_markup: {
                keyboard: [
                    [{ text: "Mavjud" }, { text: "Mavjud emas" }],
                    ["Orqaga"]
                ],
                resize_keyboard: true,
                one_time_keyboard: true
            }
        };
        bot.sendMessage(chatId, "9/9. Bu mahsulotning turli ranglari mavjudmi?", hasColorsKeyboard);
    } else {
        resetUserState(chatId);
        bot.editMessageText("Yangilash bekor qilindi. Bosh menyu.", {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: 'Markdown'
        });
        bot.sendMessage(chatId, "Bosh menyu.", mainKeyboard);
    }
}

// Kategoriya view ko'rsatish
async function showCategoryView(chatId, categoryId, messageId) {
    try {
        const doc = await db.collection('categories').doc(String(categoryId)).get();
        if (!doc.exists) {
            if (messageId) {
                bot.editMessageText("Kategoriya topilmadi!", { chat_id: chatId, message_id: messageId });
            }
            bot.sendMessage(chatId, "Bosh menyu.", mainKeyboard);
            return;
        }
        const categoryData = doc.data();
        const updateKeyboard = {
            reply_markup: {
                inline_keyboard: [
                    [{ text: `Nomi: ${categoryData.name}`, callback_data: `cat_update_name_${categoryId}` }],
                    [{ text: `Ikonka: ${categoryData.icon}`, callback_data: `cat_update_icon_${categoryId}` }],
                    [{ text: "🗑 Kategoriyani o'chirish", callback_data: `delete_category_${categoryId}` }],
                    [{ text: "⬅️ Orqaga", callback_data: 'back_to_prev' }]
                ],
            },
        };
        const message = `📝 Kategoriya: ${categoryData.icon} ${categoryData.name} (ID: ${categoryId})\n` +
                        `Hozirgi qiymatlar:\n` +
                        `• Nomi: ${categoryData.name}\n` +
                        `• Ikonka: ${categoryData.icon}\n` +
                        `Nima o'zgartirishni xohlaysiz? (Tugmani bosing)`;
        if (messageId) {
            bot.editMessageText(message, {
                chat_id: chatId, message_id: messageId,
                reply_markup: updateKeyboard.reply_markup, parse_mode: 'Markdown'
            });
        } else {
            bot.sendMessage(chatId, message, updateKeyboard);
        }
    } catch (error) {
        console.error("Kategoriya view ko'rsatishda xato:", error);
        if (messageId) {
            bot.editMessageText("Xato yuz berdi!", { chat_id: chatId, message_id: messageId });
        }
        bot.sendMessage(chatId, "Bosh menyu.", mainKeyboard);
    }
}

function formatTimestamp(ts) {
    if (!ts) return "Yo'q";
    try {
        const date = ts.toDate ? ts.toDate() : new Date(ts);
        const dd = String(date.getDate()).padStart(2, '0');
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const yyyy = date.getFullYear();
        return `${dd}.${mm}.${yyyy}`;
    } catch (e) {
        return "Yo'q";
    }
}

// Mahsulot view ko'rsatish - RANGLAR QO'SHILGAN
async function showProductView(chatId, productId, messageId) {
    try {
        const doc = await db.collection('products').doc(String(productId)).get();
        if (!doc.exists) {
            if (messageId) {
                bot.editMessageText("Mahsulot topilmadi!", { chat_id: chatId, message_id: messageId });
            }
            bot.sendMessage(chatId, "Bosh menyu.", mainKeyboard);
            return;
        }
        const productData = doc.data();
        
        const startDateText = formatTimestamp(productData.discountStartDate);
        const endDateText = formatTimestamp(productData.discountEndDate);
        
        // Ranglarni formatlash
        let colorsDisplay = 'Yo\'q';
        if (productData.colors && productData.colors.length > 0) {
            const colorNames = productData.colors.map(colorId => {
                const color = AVAILABLE_COLORS.find(c => c.id === colorId);
                return color ? `${color.emoji} ${color.name}` : colorId;
            });
            colorsDisplay = colorNames.join(', ');
        }
        
        const updateKeyboard = {
            reply_markup: {
                inline_keyboard: [
                    [{ text: `Nomi: ${productData.name}`, callback_data: `update_field_name_${productId}` }],
                    [{ text: `Dona narxi: ${productData.pricePiece.toFixed(2)} $`, callback_data: `update_field_pricePiece_${productId}` }],
                    [{ text: `Chegirma: ${productData.discount}%`, callback_data: `update_field_discount_${productId}` }],
                    [{ text: `📅 Chegirma boshlanishi: ${startDateText}`, callback_data: `update_field_discountStart_${productId}` }],
                    [{ text: `📅 Chegirma tugashi: ${endDateText}`, callback_data: `update_field_discountEnd_${productId}` }],
                    [{ text: `Stock: ${productData.stock.toLocaleString()} dona`, callback_data: `update_field_stock_${productId}` }],
                    [{ text: `Karobka sig'imi: ${productData.boxCapacity} dona`, callback_data: `update_field_boxCapacity_${productId}` }],
                    [{ text: `Tavsif: ${productData.description ? productData.description.substring(0, 20) + '...' : 'Yo\'q'}`, callback_data: `update_field_description_${productId}` }],
                    [{ text: `Rasm: ${productData.image ? 'Bor' : 'Yo\'q'}`, callback_data: `update_field_image_${productId}` }],
                    [{ text: `🎨 Ranglar: ${productData.colors && productData.colors.length > 0 ? productData.colors.length + ' ta' : 'Yo\'q'}`, callback_data: `update_field_colors_${productId}` }],
                    [{ text: "🗑 Mahsulotni o'chirish", callback_data: `delete_product_${productId}` }],
                    [{ text: "⬅️ Orqaga", callback_data: 'back_to_prev' }]
                ],
            },
        };
        const message = `📝 Mahsulot: ${productData.name} (ID: ${productId})\n` +
                        `Hozirgi qiymatlar:\n` +
                        `• Nomi: ${productData.name}\n` +
                        `• Dona narxi: ${productData.pricePiece.toFixed(2)} $\n` +
                        `• Chegirma: ${productData.discount}%\n` +
                        `• Chegirma boshlanishi: ${startDateText}\n` +
                        `• Chegirma tugashi: ${endDateText}\n` +
                        `• Stock: ${productData.stock.toLocaleString()} dona\n` +
                        `• Karobka sig'imi: ${productData.boxCapacity} dona\n` +
                        `• Tavsif: ${productData.description || 'Belgilanmagan'}\n` +
                        `• Rasm: ${productData.image ? 'URL mavjud' : 'Yo\'q'}\n` +
                        `• Ranglar: ${colorsDisplay}\n` +
                        `Qaysi maydonni yangilashni xohlaysiz? (Tugmani bosing)`;
        if (messageId) {
            bot.editMessageText(message, {
                chat_id: chatId, message_id: messageId,
                reply_markup: updateKeyboard.reply_markup, parse_mode: 'Markdown'
            });
        } else {
            bot.sendMessage(chatId, message, updateKeyboard);
        }
    } catch (error) {
        console.error("Mahsulot view ko'rsatishda xato:", error);
        if (messageId) {
            bot.editMessageText("Xato yuz berdi!", { chat_id: chatId, message_id: messageId });
        }
        bot.sendMessage(chatId, "Bosh menyu.", mainKeyboard);
    }
}

// Kategoriya yangilash uchun kategoriya tanlash menyusini ko'rsatish
async function showCategoryUpdateSelect(chatId, messageId = null) {
    try {
        const categoriesSnapshot = await db.collection('categories').get();
        if (categoriesSnapshot.empty) {
            const text = "Hech qanday kategoriya topilmadi. Avval qo'shing.";
            if (messageId) {
                bot.editMessageText(text, { chat_id: chatId, message_id: messageId });
                bot.sendMessage(chatId, "Bosh menyu.", mainKeyboard);
            } else {
                bot.sendMessage(chatId, text, mainKeyboard);
            }
            return;
        }
        const categories = categoriesSnapshot.docs.map(doc => {
            const data = doc.data();
            return { id: data.id, name: data.name, icon: data.icon };
        });
        const inlineKeyboard = { reply_markup: { inline_keyboard: [] } };
        for (let i = 0; i < categories.length; i += 2) {
            const row = [{ text: `${categories[i].icon} ${categories[i].name}`, callback_data: `cat_select_${categories[i].id}` }];
            if (i + 1 < categories.length) {
                row.push({ text: `${categories[i + 1].icon} ${categories[i + 1].name}`, callback_data: `cat_select_${categories[i + 1].id}` });
            }
            inlineKeyboard.reply_markup.inline_keyboard.push(row);
        }
        const text = "Qaysi kategoriyani yangilashni xohlaysiz? (Inline tugmalardan tanlang):";
        if (messageId) {
            bot.editMessageText(text, { chat_id: chatId, message_id: messageId, reply_markup: inlineKeyboard.reply_markup });
        } else {
            bot.sendMessage(chatId, text, inlineKeyboard);
        }
    } catch (error) {
        console.error("Kategoriyalarni olishda xato:", error);
        const errorText = "❌ Kategoriyalarni olishda xato yuz berdi!";
        if (messageId) {
            bot.editMessageText(errorText, { chat_id: chatId, message_id: messageId });
            bot.sendMessage(chatId, "Bosh menyu.", mainKeyboard);
        } else {
            bot.sendMessage(chatId, errorText, mainKeyboard);
        }
    }
}

// Mahsulot yangilash uchun kategoriya tanlash menyusini ko'rsatish
async function showProductUpdateCategorySelect(chatId, messageId = null) {
    try {
        const categoriesSnapshot = await db.collection('categories').get();
        if (categoriesSnapshot.empty) {
            const text = "Hech qanday kategoriya topilmadi. Avval qo'shing.";
            if (messageId) {
                bot.editMessageText(text, { chat_id: chatId, message_id: messageId });
                bot.sendMessage(chatId, "Bosh menyu.", mainKeyboard);
            } else {
                bot.sendMessage(chatId, text, mainKeyboard);
            }
            return;
        }
        const categories = categoriesSnapshot.docs.map(doc => {
            const data = doc.data();
            return { id: data.id, name: data.name, icon: data.icon };
        });
        const inlineKeyboard = { reply_markup: { inline_keyboard: [] } };
        for (let i = 0; i < categories.length; i += 2) {
            const row = [{ text: `${categories[i].icon} ${categories[i].name}`, callback_data: `select_category_${categories[i].id}` }];
            if (i + 1 < categories.length) {
                row.push({ text: `${categories[i + 1].icon} ${categories[i + 1].name}`, callback_data: `select_category_${categories[i + 1].id}` });
            }
            inlineKeyboard.reply_markup.inline_keyboard.push(row);
        }
        const text = "Qaysi kategoriyadagi mahsulotni yangilashni xohlaysiz? (Inline tugmalardan tanlang):";
        if (messageId) {
            bot.editMessageText(text, { chat_id: chatId, message_id: messageId, reply_markup: inlineKeyboard.reply_markup });
        } else {
            bot.sendMessage(chatId, text, inlineKeyboard);
        }
    } catch (error) {
        console.error("Kategoriyalarni olishda xato:", error);
        const errorText = "❌ Kategoriyalarni olishda xato yuz berdi!";
        if (messageId) {
            bot.editMessageText(errorText, { chat_id: chatId, message_id: messageId });
            bot.sendMessage(chatId, "Bosh menyu.", mainKeyboard);
        } else {
            bot.sendMessage(chatId, errorText, mainKeyboard);
        }
    }
}

// Kategoriya bo'yicha mahsulotlarni ko'rsatish
async function showProductsInCategory(chatId, categoryName, messageId = null) {
    try {
        const productsSnapshot = await db.collection('products').where('category', '==', categoryName).get();
        if (productsSnapshot.empty) {
            const text = `"${categoryName}" kategoriyasida hech qanday mahsulot yo'q.`;
            if (messageId) {
                bot.editMessageText(text, { chat_id: chatId, message_id: messageId });
            }
            bot.sendMessage(chatId, text, mainKeyboard);
            resetUserState(chatId);
            return;
        }
        const products = productsSnapshot.docs.map(pDoc => {
            const pData = pDoc.data();
            return { id: pData.id, name: pData.name };
        });
        const inlineKeyboard = { reply_markup: { inline_keyboard: [] } };
        for (let i = 0; i < products.length; i += 2) {
            const row = [{ text: products[i].name, callback_data: `update_product_${products[i].id}` }];
            if (i + 1 < products.length) {
                row.push({ text: products[i + 1].name, callback_data: `update_product_${products[i + 1].id}` });
            }
            inlineKeyboard.reply_markup.inline_keyboard.push(row);
        }
        inlineKeyboard.reply_markup.inline_keyboard.push([{ text: "⬅️ Orqaga", callback_data: 'back_to_prev' }]);
        const text = `"${categoryName}" kategoriyasidagi mahsulotlar:\nQaysi mahsulotni yangilashni xohlaysiz?`;
        if (messageId) {
            bot.editMessageText(text, {
                chat_id: chatId, message_id: messageId,
                reply_markup: inlineKeyboard.reply_markup, parse_mode: 'Markdown'
            });
        } else {
            bot.sendMessage(chatId, text, inlineKeyboard);
        }
        const state = userState[chatId];
        if (state) {
            state.data.selectedCategory = categoryName;
        }
    } catch (error) {
        console.error("Mahsulotlarni olishda xato:", error);
        const errorText = "❌ Mahsulotlarni olishda xato yuz berdi!";
        if (messageId) {
            bot.editMessageText(errorText, { chat_id: chatId, message_id: messageId });
            bot.sendMessage(chatId, "Bosh menyu.", mainKeyboard);
        } else {
            bot.sendMessage(chatId, errorText, mainKeyboard);
        }
    }
}

// Tugma buyruqlarini qayta ishlash funksiyasi
async function handleCommand(chatId, text) {
    resetUserState(chatId);
    if (!db) {
        bot.sendMessage(chatId, "❌ Uzr, Database ulanishi xato bo'ldi. Admin sozlamalarini tekshiring.", mainKeyboard);
        return;
    }
    if (text === "🛍 Mahsulot qo'shish") {
        const categoriesSnapshot = await db.collection('categories').get();
        const categoryNames = categoriesSnapshot.docs.map(doc => doc.data().name);
        if (categoryNames.length === 0) {
            bot.sendMessage(chatId, "Avval kategoriya qo'shing. '📂 Kategoriya qo'shish' ni tanlang.", mainKeyboard);
            return;
        }
        userState[chatId] = { step: 'product_name', data: { categoryNames, priceBox: 0, selectedColors: [] }, steps: [] };
        bot.sendMessage(chatId, "1/9. Mahsulot nomini kiriting:", backKeyboard);
        return;
    }
    if (text === "📂 Kategoriya qo'shish") {
        userState[chatId] = { step: 'category_name', data: {}, steps: [] };
        bot.sendMessage(chatId, "1/2. Kategoriya nomini kiriting (mas: Oziq-ovqat):", backKeyboard);
        return;
    }
    if (text === "📂 Kategoriya yangilash") {
        userState[chatId] = { step: 'category_update_select', data: {}, steps: [] };
        await showCategoryUpdateSelect(chatId);
        return;
    }
    if (text === "❌ Bekor qilish") {
        resetUserState(chatId);
        bot.sendMessage(chatId, "Joriy amal bekor qilindi.", mainKeyboard);
        return;
    }
    if (text === "🔄 Mahsulotni yangilash") {
        userState[chatId] = { step: 'product_update_category_select', data: {}, steps: [] };
        await showProductUpdateCategorySelect(chatId);
        return;
    }
    if (text === "📊 Ma'lumotlarni ko'rish") {
        try {
            const productsSnapshot = await db.collection('products').get();
            const categoriesSnapshot = await db.collection('categories').get();
            bot.sendMessage(chatId,
                `📊 Statistika:\n` +
                `🔹 Mahsulotlar soni: ${productsSnapshot.size.toLocaleString()} ta\n` +
                `🔹 Kategoriyalar soni: ${categoriesSnapshot.size.toLocaleString()} ta`,
                { ...mainKeyboard, parse_mode: 'Markdown' }
            );
        } catch (error) {
            console.error("Statistika olishda xato:", error);
            bot.sendMessage(chatId, "❌ Ma'lumotlarni olishda xato yuz berdi!", mainKeyboard);
        }
        return;
    }
    if (text === "📦 Buyurtmalar") {
        try {
            const snapshot = await db.collection('orders').orderBy('createdAt', 'desc').limit(10).get();
            if (snapshot.empty) {
                bot.sendMessage(chatId, "Hozircha buyurtmalar yo'q.", mainKeyboard);
                return;
            }
            
            const inlineKeyboard = { inline_keyboard: [] };
            
            snapshot.docs.forEach(doc => {
                const orderData = doc.data();
                const orderId = doc.id;
                let statusEmoji = "🆕";
                if (orderData.status === 'confirmed') statusEmoji = "✅";
                else if (orderData.status === 'cancelled') statusEmoji = "❌";
                
                const btnText = `${statusEmoji} ${orderData.customerName || 'Noma\'lum'} — ${(orderData.totalUZS || 0).toLocaleString("uz-UZ")} so'm`;
                inlineKeyboard.inline_keyboard.push([{ text: btnText, callback_data: `order_detail_${orderId}` }]);
            });
            
            bot.sendMessage(chatId, "So'nggi 10 ta buyurtma:", { reply_markup: inlineKeyboard });
        } catch (error) {
            console.error("Buyurtmalarni olishda xato:", error);
            bot.sendMessage(chatId, "❌ Buyurtmalarni olishda xato yuz berdi!", mainKeyboard);
        }
        return;
    }
    bot.sendMessage(chatId, "Tushunmadim. Iltimos, quyidagi tugmalardan birini tanlang:", mainKeyboard);
}

// Mahsulot bosqichlarini handle qilish - RANGLAR QO'SHILGAN
async function handleProductStep(chatId, currentStep, isBack = false) {
    const state = userState[chatId];
    const data = state.data;
    const oldStep = state.step;
    if (!isBack) {
        state.steps.push(oldStep);
    }
    switch (currentStep) {
        case 'product_name':
            state.step = 'product_name';
            bot.sendMessage(chatId, "1/9. Mahsulot nomini kiriting:", backKeyboard);
            break;
        case 'product_price_piece':
            state.step = 'product_price_piece';
            bot.sendMessage(chatId, "2/9. Dona narxi (USD, raqam, mas: 5.50 yoki 5,50):", backKeyboard);
            break;
        case 'product_discount':
            state.step = 'product_discount';
            bot.sendMessage(chatId, "3/9. Chegirma (0-100, mas: 10):", backKeyboard);
            break;
        case 'product_category':
            state.step = 'product_category';
            const categoryKeyboard = {
                reply_markup: {
                    keyboard: [...data.categoryNames.map(name => [{ text: name }]), ["Orqaga"]],
                    resize_keyboard: true,
                    one_time_keyboard: true
                }
            };
            bot.sendMessage(chatId, "4/9. Kategoriyani tanlang:", categoryKeyboard);
            break;
        case 'product_image':
            state.step = 'product_image';
            bot.sendMessage(chatId, "5/9. Rasm yuboring (photo formatida):", mainBackKeyboard);
            break;
        case 'product_description':
            state.step = 'product_description';
            bot.sendMessage(chatId, "6/9. Tavsif (qisqa ma'lumot):", backKeyboard);
            break;
        case 'product_box_capacity':
            state.step = 'product_box_capacity';
            bot.sendMessage(chatId, "7/9. Har bir karobkada necha dona bor (raqam, mas: 20):", backKeyboard);
            break;
        case 'product_stock':
            state.step = 'product_stock';
            bot.sendMessage(chatId, "8/9. Ombordagi jami stock (dona soni, mas: 100):", backKeyboard);
            break;
        case 'product_colors':
            state.step = 'product_colors';
            const hasColorsKeyboard = {
                reply_markup: {
                    keyboard: [
                        [{ text: "Mavjud" }, { text: "Mavjud emas" }],
                        ["Orqaga"]
                    ],
                    resize_keyboard: true,
                    one_time_keyboard: true
                }
            };
            bot.sendMessage(chatId, "9/9. Bu mahsulotning turli ranglari mavjudmi?", hasColorsKeyboard);
            break;
    }
}

// Kategoriya bosqichlarini handle qilish
async function handleCategoryStep(chatId, currentStep, isBack = false) {
    const state = userState[chatId];
    const data = state.data;
    const oldStep = state.step;
    if (!isBack) {
        state.steps.push(oldStep);
    }
    switch (currentStep) {
        case 'category_name':
            state.step = 'category_name';
            bot.sendMessage(chatId, "1/2. Kategoriya nomini kiriting (mas: Oziq-ovqat):", backKeyboard);
            break;
        case 'category_icon':
            state.step = 'category_icon';
            bot.sendMessage(chatId, "2/2. Ikonka (emoji, mas: 🥄):", backKeyboard);
            break;
    }
}

// 6. Asosiy message handler
const commandButtons = [
    "🛍 Mahsulot qo'shish",
    "📂 Kategoriya qo'shish",
    "📂 Kategoriya yangilash",
    "🔄 Mahsulotni yangilash",
    "📊 Ma'lumotlarni ko'rish",
    "📦 Buyurtmalar",
    "❌ Bekor qilish"
];

// Yordamchi funksiya: Son formatini to'g'rilash va 3 xonalikka cheklash
function parseNumberInput(input, isPrice = false) {
  if (typeof input !== 'string') return null;

  // Barcha vergulni nuqtaga almashtirish
  let normalized = input.replace(/,/g, '.');

  const parsed = parseFloat(normalized);

  if (isNaN(parsed) || parsed < 0) {
    return null;
  }

  if (isPrice) {
    // Agar qiymat narx bo'lsa, maksimum 3 xonalik o'nli kasr qismi qoladi
    const parts = normalized.split('.');
    if (parts.length === 2 && parts[1].length > 3) {
      // Birinchi 3 ta o'nlik raqamni kesish
      normalized = parts[0] + '.' + parts[1].substring(0, 3);
    }
    // Kesilgandan keyin yana parseFloat qilish kerak
    return parseFloat(normalized);
  }

  // Agar narx bo'lmasa, oddiy qaytarish (masalan, stock, boxCapacity)
  return parsed;
}

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    const photo = msg.photo;

    if (!admins.includes(chatId)) {
        bot.sendMessage(chatId, "Bu bot faqat administratorlar uchun mo'ljallangan.");
        return;
    }
    if (!db) {
        bot.sendMessage(chatId, "❌ Uzr, Database ulanishi yo'q. Avval Railway Variables ni tekshiring.");
        return;
    }
    if (text && text.startsWith('/')) {
        if (text === '/start') {
            resetUserState(chatId);
            bot.sendMessage(chatId, "Xush kelibsiz! Admin paneliga kirish uchun tugmalardan birini tanlang.", mainKeyboard);
        } else {
            bot.sendMessage(chatId, "Noma'lum buyruq. /start ni bosing.", mainKeyboard);
        }
        return;
    }
    if (text === "Orqaga") {
        await handleBack(chatId);
        return;
    }
    if (text && commandButtons.includes(text)) {
        await handleCommand(chatId, text);
        return;
    }
    if (photo && !text) {
        return bot.emit('photo', msg);
    }
    if (!userState[chatId] || userState[chatId].step === 'none') {
        bot.sendMessage(chatId, "Tushunmadim. Iltimos, quyidagi tugmalardan birini tanlang:", mainKeyboard);
        return;
    }

    const state = userState[chatId];
    const step = state.step;
    let data = state.data;

    // Mahsulot qo'shish bosqichlari
    if (step.startsWith('product_')) {
        const oldStep = step;
        switch (step) {
            case 'product_name':
                data.name = text;
                state.steps.push(oldStep);
                state.step = 'product_price_piece';
                bot.sendMessage(chatId, "2/9. Dona narxi (USD, raqam, mas: 5.50 yoki 5,50):", backKeyboard);
                break;
            case 'product_price_piece':
                const pricePiece = parseNumberInput(text, true);
                if (pricePiece === null || pricePiece <= 0) {
                    bot.sendMessage(chatId, "Musbat son kiriting (masalan: 5 yoki 5.50 yoki 5,50)! (Maksimal 3 o'nlik xona)");
                    return;
                }
                data.pricePiece = pricePiece;
                state.steps.push(oldStep);
                state.step = 'product_discount';
                bot.sendMessage(chatId, "3/9. Chegirma (0-100, mas: 10):", backKeyboard);
                break;
            case 'product_discount':
                if (!/^\d+$/.test(text) || parseInt(text) < 0 || parseInt(text) > 100) {
                    bot.sendMessage(chatId, "0 dan 100 gacha son kiriting!");
                    return;
                }
                data.discount = parseInt(text);
                state.steps.push(oldStep);
                state.step = 'product_category';
                const categoryKeyboard = {
                    reply_markup: {
                        keyboard: data.categoryNames.map(name => [{ text: name }]).concat([["Orqaga"]]),
                        resize_keyboard: true,
                        one_time_keyboard: true
                    }
                };
                bot.sendMessage(chatId, "4/9. Kategoriyani tanlang:", categoryKeyboard);
                break;
            case 'product_category':
                if (!data.categoryNames.includes(text)) {
                    bot.sendMessage(chatId, "Iltimos, kategoriyani tugmalardan tanlang!");
                    return;
                }
                data.category = text;
                state.steps.push(oldStep);
                state.step = 'product_image';
                bot.sendMessage(chatId, "5/9. Rasm yuboring (photo formatida):", mainBackKeyboard);
                break;
            case 'product_image':
                return; // Rasm handlerda qayta ishlanadi
            case 'product_description':
                data.description = text;
                state.steps.push(oldStep);
                state.step = 'product_box_capacity';
                bot.sendMessage(chatId, "7/9. Har bir karobkada necha dona bor (raqam, mas: 20):", backKeyboard);
                break;
            case 'product_box_capacity':
                if (!/^\d+$/.test(text) || parseInt(text) <= 0) {
                    bot.sendMessage(chatId, "Musbat son kiriting!");
                    return;
                }
                data.boxCapacity = parseInt(text);
                state.steps.push(oldStep);
                state.step = 'product_stock';
                bot.sendMessage(chatId, "8/9. Ombordagi jami stock (dona soni, mas: 100):", backKeyboard);
                break;
            case 'product_stock':
                if (!/^\d+$/.test(text) || parseInt(text) < 0) {
                    bot.sendMessage(chatId, "0 yoki musbat son kiriting!");
                    return;
                }
                data.stock = parseInt(text);
                // Ranglar haqida so'rash
                state.steps.push(oldStep);
                state.step = 'product_colors';
                const hasColorsKeyboard = {
                    reply_markup: {
                        keyboard: [
                            [{ text: "Mavjud" }, { text: "Mavjud emas" }],
                            ["Orqaga"]
                        ],
                        resize_keyboard: true,
                        one_time_keyboard: true
                    }
                };
                bot.sendMessage(chatId, "9/9. Bu mahsulotning turli ranglari mavjudmi?", hasColorsKeyboard);
                break;
            case 'product_colors':
                if (text === "Mavjud emas") {
                    // Ranglar yo'q, mahsulotni saqlash
                    const newId = await getNextId('products');
                    if (newId === -1) {
                        bot.sendMessage(chatId, "❌ Mahsulot ID sini olishda xato yuz berdi!", mainKeyboard);
                        resetUserState(chatId);
                        return;
                    }
                    const newProduct = {
                        id: newId,
                        name: data.name,
                        priceBox: data.priceBox,
                        pricePiece: data.pricePiece,
                        discount: data.discount,
                        category: data.category,
                        image: data.image,
                        description: data.description,
                        boxCapacity: data.boxCapacity,
                        stock: data.stock,
                        colors: []
                    };
                    try {
                        await db.collection('products').doc(String(newId)).set(newProduct);
                        bot.sendMessage(chatId,
                            `✅ Mahsulot muvaffaqiyatli qo'shildi!\n` +
                            `Nomi: ${newProduct.name}\n` +
                            `Dona narxi: ${newProduct.pricePiece.toFixed(2)} $\n` +
                            `Chegirma: ${newProduct.discount}%\n` +
                            `Stock: ${newProduct.stock.toLocaleString()} dona\n` +
                            `Ranglar: Yo'q`,
                            { ...mainKeyboard, parse_mode: 'Markdown' }
                        );
                    } catch (error) {
                        console.error("Mahsulot qo'shishda xato:", error);
                        bot.sendMessage(chatId, "❌ Mahsulot qo'shishda xato yuz berdi!");
                    }
                    resetUserState(chatId);
                } else if (text === "Mavjud") {
                    // Rang tanlash menyusini ko'rsatish
                    state.steps.push(oldStep);
                    state.step = 'product_color_select';
                    const colorKeyboard = createColorKeyboard(data.selectedColors || []);
                    bot.sendMessage(chatId, "Mavjud ranglarni tanlang:", colorKeyboard);
                }
                break;
        }
        state.data = data;
        return;
    }

    // Kategoriya qo'shish bosqichlari
    if (step.startsWith('category_')) {
        const oldStep = step;
        switch (step) {
            case 'category_name':
                data.name = text;
                state.steps.push(oldStep);
                state.step = 'category_icon';
                bot.sendMessage(chatId, "2/2. Ikonka (emoji, mas: 🥄):", backKeyboard);
                break;
            case 'category_icon':
                data.icon = text;
                const newId = await getNextId('categories');
                if (newId === -1) {
                    bot.sendMessage(chatId, "❌ Kategoriya ID sini olishda xato yuz berdi!", mainKeyboard);
                    resetUserState(chatId);
                    return;
                }
                const newCategory = { id: newId, name: data.name, icon: data.icon };
                try {
                    await db.collection('categories').doc(String(newId)).set(newCategory);
                    bot.sendMessage(chatId,
                        `✅ Kategoriya muvaffaqiyatli qo'shildi!\n` +
                        `Nomi: ${newCategory.name}\n` +
                        `Ikonka: ${newCategory.icon}`,
                        { ...mainKeyboard, parse_mode: 'Markdown' }
                    );
                } catch (error) {
                    console.error("Kategoriya qo'shishda xato:", error);
                    bot.sendMessage(chatId, "❌ Kategoriya qo'shishda xato yuz berdi!");
                }
                resetUserState(chatId);
                break;
        }
        state.data = data;
        return;
    }

    // Kategoriya yangilash bosqichlari
    if (state.step === 'update_category_name') {
        const stateData = state.data;
        const messageId = stateData.messageId;
        try {
            await db.collection('categories').doc(String(stateData.categoryId)).update({ name: text });
            state.step = 'category_update_view';
            await showCategoryView(chatId, stateData.categoryId, messageId);
            bot.sendMessage(chatId,
                `✅ Kategoriya nomi yangilandi: ${text}`,
                backKeyboard
            );
        } catch (error) {
            console.error("Kategoriya nomini yangilashda xato:", error);
            bot.sendMessage(chatId, "❌ Nom yangilashda xato yuz berdi!", mainKeyboard);
            resetUserState(chatId);
        }
        return;
    }
    if (state.step === 'update_category_icon') {
        const stateData = state.data;
        const messageId = stateData.messageId;
        try {
            await db.collection('categories').doc(String(stateData.categoryId)).update({ icon: text });
            state.step = 'category_update_view';
            await showCategoryView(chatId, stateData.categoryId, messageId);
            bot.sendMessage(chatId,
                `✅ Kategoriya ikonka yangilandi: ${text}`,
                backKeyboard
            );
        } catch (error) {
            console.error("Kategoriya ikonka yangilashda xato:", error);
            bot.sendMessage(chatId, "❌ Ikonka yangilashda xato yuz berdi!", mainKeyboard);
            resetUserState(chatId);
        }
        return;
    }

    // CHEGIRMA SANALARINI YANGILASH
    if (state.step === 'update_discount_date') {
        const stateData = state.data;
        const messageId = stateData.messageId;
        const dateField = stateData.dateField;
        const dateLabel = stateData.dateLabel;
        
        // "0" yuborilsa, sanani o'chirish
        if (text === "0") {
            try {
                await db.collection('products').doc(String(stateData.productId)).update({ 
                    [dateField]: admin.firestore.FieldValue.delete() 
                });
                state.step = 'product_update_view';
                await showProductView(chatId, stateData.productId, messageId);
                bot.sendMessage(chatId, `✅ ${dateLabel} o'chirildi.`, backKeyboard);
            } catch (error) {
                console.error("Sana o'chirishda xato:", error);
                bot.sendMessage(chatId, "❌ Sana o'chirishda xato yuz berdi!", mainKeyboard);
                resetUserState(chatId);
            }
            return;
        }
        
        // DD.MM.YYYY formatini tekshirish
        const dateMatch = text.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
        if (!dateMatch) {
            bot.sendMessage(chatId, 
                "❌ Noto'g'ri format! To'g'ri format: DD.MM.YYYY\n" +
                "Masalan: 13.05.2026"
            );
            return;
        }
        
        const day = parseInt(dateMatch[1]);
        const month = parseInt(dateMatch[2]);
        const year = parseInt(dateMatch[3]);
        
        if (day < 1 || day > 31 || month < 1 || month > 12 || year < 2024 || year > 2100) {
            bot.sendMessage(chatId, 
                "❌ Noto'g'ri sana!\n" +
                "Kun: 1-31, Oy: 1-12, Yil: 2024-2100"
            );
            return;
        }
        
        const dateObj = new Date(year, month - 1, day, 0, 0, 0);
        
        // Sana haqiqatdan ham mavjudligini tekshirish (masalan, 31.02.2026 yaroqsiz)
        if (dateObj.getDate() !== day || dateObj.getMonth() !== month - 1 || dateObj.getFullYear() !== year) {
            bot.sendMessage(chatId, "❌ Bunday sana mavjud emas! Qaytadan kiriting.");
            return;
        }
        
        try {
            const timestamp = admin.firestore.Timestamp.fromDate(dateObj);
            await db.collection('products').doc(String(stateData.productId)).update({ 
                [dateField]: timestamp 
            });
            state.step = 'product_update_view';
            await showProductView(chatId, stateData.productId, messageId);
            bot.sendMessage(chatId, 
                `✅ ${dateLabel} yangilandi: ${text}`, 
                backKeyboard
            );
        } catch (error) {
            console.error("Sana yangilashda xato:", error);
            bot.sendMessage(chatId, "❌ Sana yangilashda xato yuz berdi!", mainKeyboard);
            resetUserState(chatId);
        }
        return;
    }

    // Mahsulot yangilash bosqichlari
    if (state.step === 'update_value') {
        const stateData = state.data;
        const messageId = stateData.messageId;
        let value;
        let fieldType = stateData.field;
        let fieldNameUz;

        if (fieldType.includes('price')) {
            fieldNameUz = 'Dona narxi (USD)';
            const parsedValue = parseNumberInput(text, true);
            if (parsedValue === null || parsedValue <= 0) {
                bot.sendMessage(chatId, `${fieldNameUz} uchun musbat son kiriting (masalan: 5 yoki 5.50 yoki 5,50)! (Maksimal 3 o'nlik xona)`);
                return;
            }
            value = parsedValue;
        } else if (fieldType === 'discount') {
            fieldNameUz = 'Chegirma';
            const parsedValue = parseNumberInput(text, false);
            if (parsedValue === null || parsedValue < 0 || parsedValue > 100) {
                bot.sendMessage(chatId, "0 dan 100 gacha son kiriting!");
                return;
            }
            value = parsedValue;
        } else if (fieldType === 'stock' || fieldType === 'boxCapacity') {
            fieldNameUz = fieldType === 'stock' ? 'Stock soni' : 'Qutidagi soni';
            const parsedValue = parseNumberInput(text, false);
            if (parsedValue === null || parsedValue <= 0) {
                bot.sendMessage(chatId, `${fieldNameUz} uchun musbat son kiriting!`);
                return;
            }
            value = Math.floor(parsedValue);
        } else {
            bot.sendMessage(chatId, "Noto'g'ri maydon aniqlandi!");
            resetUserState(chatId);
            return;
        }

        try {
            await db.collection('products').doc(String(stateData.productId)).update({ [fieldType]: value });
            let displayValue = value;
            if (fieldType.includes('price')) {
                displayValue = value.toFixed(3).replace(/\.?0+$/, '');
            }
            state.step = 'product_update_view';
            await showProductView(chatId, stateData.productId, messageId);
            bot.sendMessage(chatId, `✅ ${fieldNameUz} yangilandi: ${displayValue}`, backKeyboard);
        } catch (error) {
            console.error("Yangilashda xato:", error);
            bot.sendMessage(chatId, "❌ Yangilashda xato yuz berdi!", mainKeyboard);
            resetUserState(chatId);
        }
        return;
    }

    if (state.step === 'update_product_description') {
        const stateData = state.data;
        const messageId = stateData.messageId;
        try {
            await db.collection('products').doc(String(stateData.productId)).update({ description: text });
            state.step = 'product_update_view';
            await showProductView(chatId, stateData.productId, messageId);
            bot.sendMessage(chatId,
                `✅ Mahsulot tavsifi yangilandi: ${text.substring(0, 50)}...`,
                backKeyboard
            );
        } catch (error) {
            console.error("Tavsif yangilashda xato:", error);
            bot.sendMessage(chatId, "❌ Tavsif yangilashda xato yuz berdi!", mainKeyboard);
            resetUserState(chatId);
        }
        return;
    }
    if (state.step === 'update_product_name') {
        const stateData = state.data;
        const messageId = stateData.messageId;
        try {
            await db.collection('products').doc(String(stateData.productId)).update({ name: text });
            state.step = 'product_update_view';
            await showProductView(chatId, stateData.productId, messageId);
            bot.sendMessage(chatId,
                `✅ Mahsulot nomi yangilandi: ${text}`,
                backKeyboard
            );
        } catch (error) {
            console.error("Nomi yangilashda xato:", error);
            bot.sendMessage(chatId, "❌ Nomi yangilashda xato yuz berdi!", mainKeyboard);
            resetUserState(chatId);
        }
        return;
    }

    bot.sendMessage(chatId, "Tushunmadim. Orqaga bosib oldingizga qayting yoki ❌ Bekor qilish ni bosing.", mainKeyboard);
});

// 7. Photo handler
bot.on('photo', async (msg) => {
    const chatId = msg.chat.id;
    const fileId = msg.photo[msg.photo.length - 1].file_id;
    if (!admins.includes(chatId)) return;
    if (!db) {
        bot.sendMessage(chatId, "❌ Uzr, Database ulanishi yo'q.");
        return;
    }
    const state = userState[chatId];
    if (state && (state.step === 'product_image' || state.step === 'update_product_image')) {
        let data = state.data;
        const waitMessage = await bot.sendMessage(chatId, "Rasm yuklanmoqda... ⏳");
        const imageUrl = await uploadToImgBB(fileId);
        if (imageUrl) {
            data.image = imageUrl;
            if (state.step === 'product_image') {
                state.steps.push(state.step);
                state.step = 'product_description';
                await bot.editMessageText(`✅ Rasm yuklandi!\n6/9. Tavsif (qisqa ma'lumot):`, {
                    chat_id: chatId,
                    message_id: waitMessage.message_id
                });
                bot.sendMessage(chatId, "Tavsifni kiriting:", backKeyboard);
            } else if (state.step === 'update_product_image') {
                const stateData = state.data;
                const messageId = stateData.messageId;
                try {
                    await db.collection('products').doc(String(stateData.productId)).update({ image: imageUrl });
                    state.step = 'product_update_view';
                    await showProductView(chatId, stateData.productId, messageId);
                    bot.editMessageText(`✅ Mahsulot rasmi yangilandi!`, {
                        chat_id: chatId,
                        message_id: waitMessage.message_id
                    });
                    bot.sendMessage(chatId, "Orqaga bosing yoki boshqa amalni tanlang.", backKeyboard);
                } catch (error) {
                    console.error("Rasm yangilashda xato:", error);
                    bot.editMessageText("❌ Rasm yangilashda xato yuz berdi!", {
                        chat_id: chatId,
                        message_id: waitMessage.message_id
                    });
                }
            }
        } else {
            bot.editMessageText("❌ Rasm yuklashda xato yuz berdi! Qaytadan urinib ko'ring.", {
                chat_id: chatId,
                message_id: waitMessage.message_id
            });
        }
        state.data = data;
    } else {
        bot.sendMessage(chatId, "Hozir rasm kutilyapti emas. Tugmalardan foydalaning.", mainKeyboard);
    }
});

// 8. Callback query handler - RANGLAR QO'SHILGAN
bot.on('callback_query', async (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    const messageId = callbackQuery.message.message_id;
    const data = callbackQuery.data;
    console.log(`Callback received: ${data}`);

    if (!data || !admins.includes(chatId)) {
        bot.answerCallbackQuery(callbackQuery.id, { text: "Ruxsat yo'q!" });
        return;
    }
    if (!db) {
        bot.answerCallbackQuery(callbackQuery.id, { text: "Database ulanishi yo'q." });
        return;
    }

    if (data.startsWith('order_detail_')) {
        const orderId = data.replace('order_detail_', '');
        try {
            const orderRef = db.collection('orders').doc(orderId);
            const doc = await orderRef.get();
            if (!doc.exists) {
                bot.answerCallbackQuery(callbackQuery.id, { text: "Buyurtma topilmadi!" });
                return;
            }
            
            const orderData = doc.data();
            const loc = orderData.location || {};
            
            let itemsText = '';
            if (orderData.items && orderData.items.length > 0) {
                itemsText = orderData.items.map(item => 
                    `- ${item.quantity} x ${item.name} (${item.unit === 'box' ? 'Karobka' : 'Dona'}) — $${item.price.toFixed(2)}`
                ).join('\n');
            } else {
                itemsText = "Mahsulotlar yo'q";
            }

            const providerText = orderData.paymentProvider ? ` ${orderData.paymentProvider}` : '';
            const paymentMethodText = orderData.paymentMethod === 'cash' ? 'Naqt' : `Karta${providerText}`;

            let statusEmoji = "🆕";
            let statusText = "Yangi";
            if (orderData.status === 'confirmed') {
                statusEmoji = "✅";
                statusText = "Tasdiqlangan";
            } else if (orderData.status === 'cancelled') {
                statusEmoji = "❌";
                statusText = "Bekor qilingan";
            }

            const message = `📋 BUYURTMA TAFSILOTLARI\n\n` +
                `🆔 ID: ${orderId}\n` +
                `👤 Mijoz: ${orderData.customerName || 'Noma\'lum'}\n` +
                `📞 Telefon: ${orderData.customerPhone || 'Noma\'lum'}\n` +
                `📍 Viloyat/Tuman: ${orderData.region || ''}, ${orderData.district || ''}\n` +
                `🗺 Aniq manzil: ${loc.address || 'Kiritilmagan'}\n\n` +
                `🛍 Mahsulotlar:\n${itemsText}\n\n` +
                `💰 Jami: ${(orderData.totalUZS || 0).toLocaleString("uz-UZ")} so'm (≈ $${(orderData.totalUSD || 0).toFixed(2)})\n` +
                `💳 To'lov: ${paymentMethodText}\n` +
                `📊 Status: ${statusEmoji} ${statusText}`;

            const inlineKeyboard = { inline_keyboard: [] };

            if (orderData.status === 'new') {
                inlineKeyboard.inline_keyboard.push([
                    { text: "✅ Tasdiqlash", callback_data: `confirm_order_${orderId}` },
                    { text: "❌ Bekor qilish", callback_data: `cancel_order_${orderId}` }
                ]);
            }
            
            inlineKeyboard.inline_keyboard.push([
                { text: "⬅️ Orqaga", callback_data: "back_to_orders" }
            ]);

            bot.editMessageText(message, {
                chat_id: chatId,
                message_id: messageId,
                reply_markup: inlineKeyboard
            });
            bot.answerCallbackQuery(callbackQuery.id);
        } catch (error) {
            console.error("Buyurtmani olishda xato:", error);
            bot.answerCallbackQuery(callbackQuery.id, { text: "Xato yuz berdi!" });
        }
        return;
    }

    if (data === 'back_to_orders') {
        try {
            const snapshot = await db.collection('orders').orderBy('createdAt', 'desc').limit(10).get();
            if (snapshot.empty) {
                bot.editMessageText("Hozircha buyurtmalar yo'q.", { chat_id: chatId, message_id: messageId });
                bot.answerCallbackQuery(callbackQuery.id);
                return;
            }
            
            const inlineKeyboard = { inline_keyboard: [] };
            
            snapshot.docs.forEach(doc => {
                const orderData = doc.data();
                const orderId = doc.id;
                let statusEmoji = "🆕";
                if (orderData.status === 'confirmed') statusEmoji = "✅";
                else if (orderData.status === 'cancelled') statusEmoji = "❌";
                
                const btnText = `${statusEmoji} ${orderData.customerName || 'Noma\'lum'} — ${(orderData.totalUZS || 0).toLocaleString("uz-UZ")} so'm`;
                inlineKeyboard.inline_keyboard.push([{ text: btnText, callback_data: `order_detail_${orderId}` }]);
            });
            
            bot.editMessageText("So'nggi 10 ta buyurtma:", { 
                chat_id: chatId, 
                message_id: messageId,
                reply_markup: inlineKeyboard 
            });
            bot.answerCallbackQuery(callbackQuery.id);
        } catch (error) {
            console.error("Buyurtmalarni olishda xato:", error);
            bot.answerCallbackQuery(callbackQuery.id, { text: "Xato yuz berdi!" });
        }
        return;
    }

    // BUYURTMANI TASDIQLASH / BEKOR QILISH
    if (data.startsWith('confirm_order_') || data.startsWith('cancel_order_')) {
        const isConfirm = data.startsWith('confirm_order_');
        const orderId = isConfirm ? data.replace('confirm_order_', '') : data.replace('cancel_order_', '');
        
        try {
            const orderRef = db.collection('orders').doc(orderId);
            const doc = await orderRef.get();
            
            if (!doc.exists) {
                bot.answerCallbackQuery(callbackQuery.id, { text: "Buyurtma topilmadi!" });
                return;
            }
            
            const currentStatus = doc.data().status;
            if (currentStatus !== 'new') {
                bot.answerCallbackQuery(callbackQuery.id, { text: `Bu buyurtma allaqachon ${currentStatus} qilingan!` });
                return;
            }

            const newStatus = isConfirm ? 'confirmed' : 'cancelled';
            await orderRef.update({ status: newStatus });
            
            const adminName = callbackQuery.from.first_name || "Admin";
            const statusText = isConfirm ? `✅ Tasdiqlandi — ${adminName}` : `❌ Bekor qilindi — ${adminName}`;
            
            const currentMessageText = callbackQuery.message.text;
            const updatedMessage = `${currentMessageText}\n\n=================\n${statusText}`;
            
            bot.editMessageText(updatedMessage, {
                chat_id: chatId,
                message_id: messageId
            });
            bot.answerCallbackQuery(callbackQuery.id, { text: isConfirm ? "Tasdiqlandi" : "Bekor qilindi" });
            
            admins.forEach(aId => {
                if (aId !== chatId) {
                    bot.sendMessage(aId, `Buyurtma (${orderId}) ${isConfirm ? 'tasdiqlandi' : 'bekor qilindi'} -> ${adminName} tomonidan.`);
                }
            });
            
        } catch (error) {
            console.error("Buyurtma holatini yangilashda xato:", error);
            bot.answerCallbackQuery(callbackQuery.id, { text: "Xato yuz berdi!" });
        }
        return;
    }

    // Inline orqaga
    if (data === 'back_to_prev') {
        await handleInlineBack(chatId, messageId);
        bot.answerCallbackQuery(callbackQuery.id, { text: "Orqaga qaytildi!" });
        return;
    }

    // RANGLARNI TANLASH
    if (data.startsWith('color_toggle_')) {
        const colorId = data.replace('color_toggle_', '');
        const state = userState[chatId];
        if (!state || (!state.step.includes('color') && state.step !== 'update_product_colors')) {
            bot.answerCallbackQuery(callbackQuery.id, { text: "Xato!" });
            return;
        }
        
        if (!state.data.selectedColors) {
            state.data.selectedColors = [];
        }
        
        const index = state.data.selectedColors.indexOf(colorId);
        if (index > -1) {
            state.data.selectedColors.splice(index, 1);
        } else {
            state.data.selectedColors.push(colorId);
        }
        
        const updatedKeyboard = createColorKeyboard(state.data.selectedColors);
        bot.editMessageReplyMarkup(updatedKeyboard.reply_markup, {
            chat_id: chatId,
            message_id: messageId
        });
        
        const color = AVAILABLE_COLORS.find(c => c.id === colorId);
        bot.answerCallbackQuery(callbackQuery.id, { 
            text: index > -1 ? `${color.name} o'chirildi` : `${color.name} tanlandi` 
        });
        return;
    }

    // RANGLARNI SAQLASH
    if (data === 'save_colors') {
        const state = userState[chatId];
        if (!state) {
            bot.answerCallbackQuery(callbackQuery.id, { text: "Xato!" });
            return;
        }
        
        // Mahsulot qo'shishda ranglarni saqlash
        if (state.step === 'product_color_select') {
            const newId = await getNextId('products');
            if (newId === -1) {
                bot.editMessageText("❌ Mahsulot ID sini olishda xato yuz berdi!", {
                    chat_id: chatId,
                    message_id: messageId
                });
                resetUserState(chatId);
                return;
            }
            
            const productData = state.data;
            const newProduct = {
                id: newId,
                name: productData.name,
                priceBox: productData.priceBox,
                pricePiece: productData.pricePiece,
                discount: productData.discount,
                category: productData.category,
                image: productData.image,
                description: productData.description,
                boxCapacity: productData.boxCapacity,
                stock: productData.stock,
                colors: productData.selectedColors || []
            };
            
            try {
                await db.collection('products').doc(String(newId)).set(newProduct);
                
                const colorNames = productData.selectedColors ? productData.selectedColors.map(colorId => {
                    const color = AVAILABLE_COLORS.find(c => c.id === colorId);
                    return color ? `${color.emoji} ${color.name}` : colorId;
                }).join(', ') : 'Yo\'q';
                
                bot.editMessageText(
                    `✅ Mahsulot muvaffaqiyatli qo'shildi!\n` +
                    `Nomi: ${newProduct.name}\n` +
                    `Dona narxi: ${newProduct.pricePiece.toFixed(2)} $\n` +
                    `Chegirma: ${newProduct.discount}%\n` +
                    `Stock: ${newProduct.stock.toLocaleString()} dona\n` +
                    `Ranglar: ${colorNames}`,
                    {
                        chat_id: chatId,
                        message_id: messageId,
                        parse_mode: 'Markdown'
                    }
                );
                bot.sendMessage(chatId, "Bosh menyu:", mainKeyboard);
            } catch (error) {
                console.error("Mahsulot qo'shishda xato:", error);
                bot.editMessageText("❌ Mahsulot qo'shishda xato yuz berdi!", {
                    chat_id: chatId,
                    message_id: messageId
                });
            }
            resetUserState(chatId);
        }
        // Mahsulot yangilashda ranglarni saqlash
        else if (state.step === 'update_product_colors') {
            const productId = state.data.productId;
            const originalMessageId = state.data.messageId;
            
            try {
                await db.collection('products').doc(String(productId)).update({ 
                    colors: state.data.selectedColors || [] 
                });
                
                bot.editMessageText("✅ Ranglar muvaffaqiyatli yangilandi!", {
                    chat_id: chatId,
                    message_id: messageId
                });
                
                state.step = 'product_update_view';
                await showProductView(chatId, productId, originalMessageId);
                bot.sendMessage(chatId, "Orqaga bosing yoki boshqa amalni tanlang.", backKeyboard);
            } catch (error) {
                console.error("Ranglar yangilashda xato:", error);
                bot.editMessageText("❌ Ranglar yangilashda xato yuz berdi!", {
                    chat_id: chatId,
                    message_id: messageId
                });
            }
        }
        
        bot.answerCallbackQuery(callbackQuery.id, { text: "Saqlandi!" });
        return;
    }

    // Kategoriya yangilash uchun tanlash
    if (data.startsWith('cat_select_')) {
        const categoryIdStr = data.replace('cat_select_', '');
        const categoryIdNum = parseInt(categoryIdStr);
        if (isNaN(categoryIdNum)) {
            bot.answerCallbackQuery(callbackQuery.id, { text: "Noto'g'ri kategoriya ID!" });
            return;
        }
        try {
            const doc = await db.collection('categories').doc(String(categoryIdNum)).get();
            if (!doc.exists) {
                bot.answerCallbackQuery(callbackQuery.id, { text: "Kategoriya topilmadi!" });
                return;
            }
            const state = userState[chatId] || { step: 'none', data: {}, steps: [] };
            state.steps.push(state.step);
            state.step = 'category_update_view';
            state.data.categoryId = categoryIdNum;
            state.data.messageId = messageId;
            userState[chatId] = state;
            await showCategoryView(chatId, categoryIdNum, messageId);
            bot.answerCallbackQuery(callbackQuery.id, { text: "Kategoriya tanlandi!" });
        } catch (error) {
            console.error("Kategoriyani tanlashda xato:", error);
            bot.answerCallbackQuery(callbackQuery.id, { text: "Xato yuz berdi!" });
        }
        return;
    }

    // Kategoriya nomini yangilash
    if (data.startsWith('cat_update_name_')) {
        const categoryIdStr = data.replace('cat_update_name_', '');
        const categoryIdNum = parseInt(categoryIdStr);
        const state = userState[chatId] || { step: 'none', data: {}, steps: [] };
        const oldSteps = state.steps || [];
        userState[chatId] = {
            step: 'update_category_name',
            data: { categoryId: categoryIdNum, messageId: messageId },
            steps: oldSteps
        };
        bot.sendMessage(chatId, 'Yangi kategoriya nomini kiriting:', backKeyboard);
        bot.answerCallbackQuery(callbackQuery.id, { text: "Nom o'zgartirish tanlandi!" });
        return;
    }

    // Kategoriya ikonkasini yangilash
    if (data.startsWith('cat_update_icon_')) {
        const categoryIdStr = data.replace('cat_update_icon_', '');
        const categoryIdNum = parseInt(categoryIdStr);
        const state = userState[chatId] || { step: 'none', data: {}, steps: [] };
        const oldSteps = state.steps || [];
        userState[chatId] = {
            step: 'update_category_icon',
            data: { categoryId: categoryIdNum, messageId: messageId },
            steps: oldSteps
        };
        bot.sendMessage(chatId, 'Yangi kategoriya ikonka (emoji) ni kiriting:', backKeyboard);
        bot.answerCallbackQuery(callbackQuery.id, { text: "Ikonka o'zgartirish tanlandi!" });
        return;
    }

    // Kategoriyani o'chirish
    if (data.startsWith('delete_category_')) {
        const categoryIdStr = data.replace('delete_category_', '');
        const categoryIdNum = parseInt(categoryIdStr);
        try {
            const doc = await db.collection('categories').doc(String(categoryIdNum)).get();
            if (!doc.exists) {
                bot.answerCallbackQuery(callbackQuery.id, { text: "Kategoriya topilmadi!" });
                return;
            }
            const categoryData = doc.data();
            const productsCount = await getProductsInCategory(categoryData.name);
            if (productsCount === 0) {
                await db.collection('categories').doc(String(categoryIdNum)).delete();
                bot.editMessageText(`✅ Kategoriya "${categoryData.name}" o'chirildi.`, {
                    chat_id: chatId, message_id: messageId, parse_mode: 'Markdown'
                });
                bot.answerCallbackQuery(callbackQuery.id, { text: "Kategoriya o'chirildi!" });
            } else {
                const confirmKeyboard = {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: `Ha, o'chir (${productsCount} ta mahsulot ham o'chadi)`, callback_data: `confirm_delete_category_${categoryIdNum}` }],
                            [{ text: "Yo'q, bekor qilish", callback_data: 'back_to_prev' }]
                        ],
                    },
                };
                bot.editMessageText(
                    `⚠️ "${categoryData.name}" kategoriyasida ${productsCount} ta mahsulot bor.\n` +
                    `Rostan ham o'chirmoqchimisiz?`,
                    {
                        chat_id: chatId, message_id: messageId,
                        reply_markup: confirmKeyboard.reply_markup, parse_mode: 'Markdown'
                    }
                );
                bot.answerCallbackQuery(callbackQuery.id, { text: `Tasdiqlash kutilmoqda...` });
            }
        } catch (error) {
            console.error("Kategoriya o'chirishda xato:", error);
            bot.answerCallbackQuery(callbackQuery.id, { text: "Xato yuz berdi!" });
        }
        return;
    }

    // Mahsulot yangilash uchun kategoriya tanlash
    if (data.startsWith('select_category_')) {
        const categoryIdStr = data.replace('select_category_', '');
        const categoryIdNum = parseInt(categoryIdStr);
        try {
            const doc = await db.collection('categories').doc(String(categoryIdNum)).get();
            if (!doc.exists) {
                bot.answerCallbackQuery(callbackQuery.id, { text: "Kategoriya topilmadi!" });
                return;
            }
            const categoryData = doc.data();
            const state = userState[chatId] || { step: 'none', data: {}, steps: [] };
            state.steps.push(state.step);
            state.step = 'product_update_product_select';
            state.data.selectedCategory = categoryData.name;
            state.data.messageId = messageId;
            userState[chatId] = state;
            await showProductsInCategory(chatId, categoryData.name, messageId);
            bot.answerCallbackQuery(callbackQuery.id, { text: "Kategoriya tanlandi!" });
        } catch (error) {
            console.error("Kategoriya mahsulotlarini olishda xato:", error);
            bot.answerCallbackQuery(callbackQuery.id, { text: "Xato yuz berdi!" });
        }
        return;
    }

    // Mahsulot tanlash
    if (data.startsWith('update_product_')) {
        const productIdStr = data.replace('update_product_', '');
        const productIdNum = parseInt(productIdStr);
        try {
            const doc = await db.collection('products').doc(String(productIdNum)).get();
            if (!doc.exists) {
                bot.answerCallbackQuery(callbackQuery.id, { text: "Mahsulot topilmadi!" });
                return;
            }
            const state = userState[chatId] || { step: 'none', data: {}, steps: [] };
            state.steps.push(state.step);
            state.step = 'product_update_view';
            state.data.productId = productIdNum;
            state.data.messageId = messageId;
            userState[chatId] = state;
            await showProductView(chatId, productIdNum, messageId);
            bot.answerCallbackQuery(callbackQuery.id, { text: "Mahsulot tanlandi!" });
        } catch (error) {
            console.error("Mahsulotni tanlashda xato:", error);
            bot.answerCallbackQuery(callbackQuery.id, { text: "Xato yuz berdi!" });
        }
        return;
    }

    // Mahsulot maydonlarini yangilash - RANGLAR QO'SHILGAN
    if (data.startsWith('update_field_discountStart_') || data.startsWith('update_field_discountEnd_')) {
        const isStart = data.startsWith('update_field_discountStart_');
        const productIdStr = isStart 
            ? data.replace('update_field_discountStart_', '') 
            : data.replace('update_field_discountEnd_', '');
        const productIdNum = parseInt(productIdStr);
        const fieldName = isStart ? 'discountStartDate' : 'discountEndDate';
        const fieldLabel = isStart ? 'Chegirma boshlanish sanasi' : 'Chegirma tugash sanasi';
        
        const currentState = userState[chatId] || { step: 'none', data: {}, steps: [] };
        const oldSteps = currentState.steps || [];
        const preserveData = {
            selectedCategory: currentState.data.selectedCategory,
            lastInlineMessageId: currentState.data.lastInlineMessageId,
            messageId: messageId
        };
        
        userState[chatId] = {
            step: 'update_discount_date',
            data: { 
                productId: productIdNum, 
                dateField: fieldName,
                dateLabel: fieldLabel,
                ...preserveData 
            },
            steps: oldSteps
        };
        
        bot.sendMessage(chatId, 
            `${fieldLabel}ni kiriting:\n` +
            `Format: DD.MM.YYYY (masalan: 13.05.2026)\n\n` +
            `Sanani o'chirish uchun "0" yuboring.`, 
            backKeyboard
        );
        bot.answerCallbackQuery(callbackQuery.id, { text: `${fieldLabel} tanlandi!` });
        return;
    }

    if (data.startsWith('update_field_')) {
        const parts = data.split('_');
        const fieldType = parts[2];
        const productIdStr = parts[3];
        const productIdNum = parseInt(productIdStr);
        const fieldMap = {
            'name': 'Mahsulot nomi',
            'pricePiece': 'Dona narxi (USD)',
            'discount': 'Chegirma (%)',
            'stock': 'Stock (dona)',
            'boxCapacity': 'Karobka sig\'imi',
            'description': 'Tavsif',
            'image': 'Rasm',
            'colors': 'Ranglar'
        };
        const fieldName = fieldMap[fieldType];
        const currentState = userState[chatId] || { step: 'none', data: {}, steps: [] };
        const oldSteps = currentState.steps || [];
        const preserveData = {
            selectedCategory: currentState.data.selectedCategory,
            lastInlineMessageId: currentState.data.lastInlineMessageId,
            messageId: messageId
        };
        
        if (fieldType === 'colors') {
            // Ranglarni yangilash uchun
            try {
                const doc = await db.collection('products').doc(String(productIdNum)).get();
                const productData = doc.data();
                userState[chatId] = {
                    step: 'update_product_colors',
                    data: { 
                        productId: productIdNum,
                        selectedColors: productData.colors || [],
                        ...preserveData
                    },
                    steps: oldSteps
                };
                const colorKeyboard = createColorKeyboard(productData.colors || []);
                bot.sendMessage(chatId, "Ranglarni tanlang:", colorKeyboard);
            } catch (error) {
                console.error("Ranglarni olishda xato:", error);
                bot.answerCallbackQuery(callbackQuery.id, { text: "Xato yuz berdi!" });
                return;
            }
        } else if (fieldType === 'name') {
            userState[chatId] = {
                step: 'update_product_name',
                data: { productId: productIdNum, ...preserveData },
                steps: oldSteps
            };
            bot.sendMessage(chatId, `Yangi mahsulot nomini kiriting:`, backKeyboard);
        } else if (fieldType === 'description') {
            userState[chatId] = {
                step: 'update_product_description',
                data: { productId: productIdNum, ...preserveData },
                steps: oldSteps
            };
            bot.sendMessage(chatId, `Yangi tavsifni kiriting:`, backKeyboard);
        } else if (fieldType === 'image') {
            userState[chatId] = {
                step: 'update_product_image',
                data: { productId: productIdNum, ...preserveData },
                steps: oldSteps
            };
            bot.sendMessage(chatId, 'Yangi rasm yuboring (photo formatida):', mainBackKeyboard);
        } else {
            userState[chatId] = {
                step: 'update_value',
                data: { productId: productIdNum, field: fieldType, ...preserveData },
                steps: oldSteps
            };
            bot.sendMessage(chatId, `${fieldName} uchun yangi qiymatni yuboring (raqam, mas: 5.50 yoki 5,50):`, backKeyboard);
        }
        bot.answerCallbackQuery(callbackQuery.id, { text: `${fieldName} tanlandi!` });
        return;
    }

    // Mahsulotni o'chirish
    if (data.startsWith('delete_product_')) {
        const productIdStr = data.replace('delete_product_', '');
        const productIdNum = parseInt(productIdStr);
        try {
            const doc = await db.collection('products').doc(String(productIdNum)).get();
            if (!doc.exists) {
                bot.answerCallbackQuery(callbackQuery.id, { text: "Mahsulot topilmadi!" });
                return;
            }
            const productData = doc.data();
            await db.collection('products').doc(String(productIdNum)).delete();
            bot.editMessageText(`✅ Mahsulot "${productData.name}" o'chirildi.`, {
                chat_id: chatId, message_id: messageId, parse_mode: 'Markdown'
            });
            bot.answerCallbackQuery(callbackQuery.id, { text: "Mahsulot o'chirildi!" });
        } catch (error) {
            console.error("Mahsulot o'chirishda xato:", error);
            bot.answerCallbackQuery(callbackQuery.id, { text: "Xato yuz berdi!" });
        }
        return;
    }
});

console.log("Bot ishga tushdi va polling boshlandi...");
