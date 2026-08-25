const mainKeyboard = {
    reply_markup: {
        keyboard: [
            [{ text: "🛍 Mahsulot qo'shish" }, { text: "📂 Kategoriya qo'shish" }],
            [{ text: "📋 Ro'yxat orqali qo'shish" }, { text: "📸 Draftlarni to'ldirish" }],
            [{ text: "📂 Kategoriya yangilash" }, { text: "🔄 Mahsulotni yangilash" }],
            [{ text: "🖼 Buzilgan rasmlarni tuzatish" }],
            [{ text: "📊 Statistika" }, { text: "💱 USD kurs" }],
            [{ text: "📦 Buyurtmalar" }],
            [{ text: "🖼 Banner qo'shish" }, { text: "🗑 Bannerni o'chirish" }],
            [{ text: "⭐ VIP qo'shish" }, { text: "🗑 VIP o'chirish" }],
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

const bulkListKeyboard = {
    reply_markup: {
        keyboard: [["✅ Barchasi tayyor"], ["❌ Bekor qilish"]],
        resize_keyboard: true,
    },
};

const commandButtons = [
    "🛍 Mahsulot qo'shish", "📋 Ro'yxat orqali qo'shish", "📸 Draftlarni to'ldirish", "📂 Kategoriya qo'shish", "📂 Kategoriya yangilash",
    "🔄 Mahsulotni yangilash", "🖼 Buzilgan rasmlarni tuzatish",
    "📊 Statistika", "💱 USD kurs",
    "📦 Buyurtmalar", "❌ Bekor qilish",
    "🖼 Banner qo'shish", "🗑 Bannerni o'chirish",
    "⭐ VIP qo'shish", "🗑 VIP o'chirish",
];

module.exports = { mainKeyboard, backKeyboard, mainBackKeyboard, bulkListKeyboard, commandButtons };
