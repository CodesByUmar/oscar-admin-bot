const { superAdmins } = require('../config/adminBot');

const mainKeyboard = {
    reply_markup: {
        keyboard: [
            [{ text: "🛍 Mahsulot qo'shish" }, { text: "📂 Kategoriya qo'shish" }],
            [{ text: "📂 Kategoriya yangilash" }, { text: "🔄 Mahsulotni yangilash" }],
            [{ text: "💰 Narxni ommaviy o'zgartirish" }],
            [{ text: "🔍 Qidiruv" }],
            [{ text: "📊 Statistika" }, { text: "💱 USD kurs" }],
            [{ text: "📦 Buyurtmalar" }, { text: "📥 Buyurtmalar (Excel)" }],
            [{ text: "📅 Oylik hisobot" }],
            [{ text: "🖼 Banner qo'shish" }, { text: "🗑 Bannerni o'chirish" }],
            [{ text: "🔗 Banner havolasi" }],
            [{ text: "🌐 Kategoriya tarjimalari" }],
            [{ text: "🏪 Do'kon kontaktlari" }],
            [{ text: "➕ Admin qo'shish" }, { text: "🗑 Admin o'chirish" }],
            [{ text: "⭐ VIP qo'shish" }, { text: "🗑 VIP o'chirish" }],
        ],
        resize_keyboard: true,
    },
};

// Xodim (super admin bo'lmagan) uchun — o'chirish, VIP, USD kurs
// tugmalari yo'q (Statistika esa endi hammaga ochiq). Bu faqat ko'rinish
// qulayligi uchun; haqiqiy cheklov har bir handlerning o'zida
// (superAdmins.includes(chatId)) tekshiriladi.
const staffKeyboard = {
    reply_markup: {
        keyboard: [
            [{ text: "🛍 Mahsulot qo'shish" }, { text: "📂 Kategoriya qo'shish" }],
            [{ text: "📂 Kategoriya yangilash" }, { text: "🔄 Mahsulotni yangilash" }],
            [{ text: "💰 Narxni ommaviy o'zgartirish" }],
            [{ text: "🔍 Qidiruv" }, { text: "📊 Statistika" }],
            [{ text: "📦 Buyurtmalar" }, { text: "📥 Buyurtmalar (Excel)" }],
            [{ text: "🖼 Banner qo'shish" }],
            [{ text: "🏪 Do'kon kontaktlari" }],
            [{ text: "➕ Admin qo'shish" }, { text: "🗑 Admin o'chirish" }],
        ],
        resize_keyboard: true,
    },
};

const backKeyboard = {
    reply_markup: { keyboard: [["Orqaga"]], resize_keyboard: true },
};

const mainBackKeyboard = {
    reply_markup: {
        keyboard: [
            ...mainKeyboard.reply_markup.keyboard.slice(0, -1),
            [{ text: "❌ Bekor qilish" }, { text: "Orqaga" }],
        ],
        resize_keyboard: true,
    },
};

const staffBackKeyboard = {
    reply_markup: {
        keyboard: [
            ...staffKeyboard.reply_markup.keyboard,
            [{ text: "❌ Bekor qilish" }, { text: "Orqaga" }],
        ],
        resize_keyboard: true,
    },
};

function isSuperAdmin(chatId) {
    return superAdmins.includes(chatId);
}

function getMainKeyboard(chatId) {
    return isSuperAdmin(chatId) ? mainKeyboard : staffKeyboard;
}

function getMainBackKeyboard(chatId) {
    return isSuperAdmin(chatId) ? mainBackKeyboard : staffBackKeyboard;
}

const commandButtons = [
    "🛍 Mahsulot qo'shish", "📂 Kategoriya qo'shish", "📂 Kategoriya yangilash",
    "🔄 Mahsulotni yangilash", "💰 Narxni ommaviy o'zgartirish", "🔍 Qidiruv",
    "📊 Statistika", "💱 USD kurs", "📅 Oylik hisobot",
    "📦 Buyurtmalar", "📥 Buyurtmalar (Excel)", "❌ Bekor qilish",
    "🖼 Banner qo'shish", "🗑 Bannerni o'chirish", "🔗 Banner havolasi",
    "🌐 Kategoriya tarjimalari",
    "🏪 Do'kon kontaktlari",
    "⭐ VIP qo'shish", "🗑 VIP o'chirish",
    "➕ Admin qo'shish", "🗑 Admin o'chirish",
];

module.exports = {
    mainKeyboard, staffKeyboard, backKeyboard, mainBackKeyboard, staffBackKeyboard,
    commandButtons, isSuperAdmin, getMainKeyboard, getMainBackKeyboard,
};
