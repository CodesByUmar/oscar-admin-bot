const { superAdmins } = require('../config/adminBot');

// ─── Bo'lim (guruh) darajasidagi tugmalar ──────────────────────────
// Bosh menyu endi 13 ta tugmani birma-bir ko'rsatmaydi — 4 ta bo'limga
// bo'lingan, har biri bosilganda ichidagi amallar chiqadi.
// Iconlar olib tashlandi — foydalanuvchi so'rovi bo'yicha.
const GROUP_PRODUCTS = "Mahsulotlar";
const GROUP_REPORTS = "Hisobot va statistika";
const GROUP_BANNER = "Banner va tarjima";
const GROUP_MANAGEMENT = "Boshqaruv";
const BACK_TO_GROUPS = "Bosh menyu";

const groupsKeyboard = {
    reply_markup: {
        keyboard: [
            [{ text: GROUP_PRODUCTS }, { text: GROUP_REPORTS }],
            [{ text: GROUP_BANNER }, { text: GROUP_MANAGEMENT }],
        ],
        resize_keyboard: true,
    },
};

// Bir xil — bu bo'limlarning hech biri superAdminOnly emas
const mainKeyboard = groupsKeyboard;
const staffKeyboard = groupsKeyboard;

// ─── "Mahsulotlar" bo'limi (super admin va xodim uchun bir xil) ────
const productsGroupKeyboard = {
    reply_markup: {
        keyboard: [
            [{ text: "Mahsulot qo'shish" }, { text: "Kategoriya qo'shish" }],
            [{ text: "Kategoriya yangilash" }, { text: "Mahsulotni yangilash" }],
            [{ text: "Narxni ommaviy o'zgartirish" }],
            [{ text: "Qidiruv" }],
            [{ text: BACK_TO_GROUPS }],
        ],
        resize_keyboard: true,
    },
};

// ─── "Hisobot va statistika" bo'limi ────────────────────────────────
const reportsGroupKeyboard = {
    reply_markup: {
        keyboard: [
            [{ text: "Statistika" }, { text: "USD kurs" }],
            [{ text: "Buyurtmalar" }, { text: "Buyurtmalar (Excel)" }],
            [{ text: "Oylik hisobot" }],
            [{ text: BACK_TO_GROUPS }],
        ],
        resize_keyboard: true,
    },
};
const staffReportsGroupKeyboard = {
    reply_markup: {
        keyboard: [
            [{ text: "Statistika" }],
            [{ text: "Buyurtmalar" }, { text: "Buyurtmalar (Excel)" }],
            [{ text: BACK_TO_GROUPS }],
        ],
        resize_keyboard: true,
    },
};

// ─── "Banner va tarjima" bo'limi ────────────────────────────────────
const bannerGroupKeyboard = {
    reply_markup: {
        keyboard: [
            [{ text: "Banner qo'shish" }, { text: "Bannerni o'chirish" }],
            [{ text: "Banner havolasi" }],
            [{ text: "Kategoriya tarjimalari" }],
            [{ text: BACK_TO_GROUPS }],
        ],
        resize_keyboard: true,
    },
};
const staffBannerGroupKeyboard = {
    reply_markup: {
        keyboard: [
            [{ text: "Banner qo'shish" }],
            [{ text: BACK_TO_GROUPS }],
        ],
        resize_keyboard: true,
    },
};

// ─── "Boshqaruv" bo'limi ─────────────────────────────────────────────
const managementGroupKeyboard = {
    reply_markup: {
        keyboard: [
            [{ text: "Do'kon kontaktlari" }],
            [{ text: "Admin qo'shish" }, { text: "Admin o'chirish" }],
            [{ text: "VIP qo'shish" }, { text: "VIP o'chirish" }],
            [{ text: BACK_TO_GROUPS }],
        ],
        resize_keyboard: true,
    },
};
const staffManagementGroupKeyboard = {
    reply_markup: {
        keyboard: [
            [{ text: "Do'kon kontaktlari" }],
            [{ text: "Admin qo'shish" }, { text: "Admin o'chirish" }],
            [{ text: BACK_TO_GROUPS }],
        ],
        resize_keyboard: true,
    },
};

// ─── Jarayon ichidagi ("nom kiriting" kabi) qadamlar uchun ─────────
const backKeyboard = {
    reply_markup: { keyboard: [["Bekor qilish", "Orqaga"]], resize_keyboard: true },
};

// Jarayon o'rtasida boshqa tugma bosilganda chiqadigan ogohlantirishda
// ko'rsatiladi — faqat bekor qilish tugmasi kifoya.
const mainBackKeyboard = {
    reply_markup: { keyboard: [["Bekor qilish"]], resize_keyboard: true },
};
const staffBackKeyboard = mainBackKeyboard;

function isSuperAdmin(chatId) {
    return superAdmins.includes(chatId);
}

function getMainKeyboard(chatId) {
    return groupsKeyboard;
}

function getMainBackKeyboard(chatId) {
    return mainBackKeyboard;
}

function getGroupKeyboard(chatId, groupKey) {
    const admin = isSuperAdmin(chatId);
    if (groupKey === 'products') return productsGroupKeyboard;
    if (groupKey === 'reports') return admin ? reportsGroupKeyboard : staffReportsGroupKeyboard;
    if (groupKey === 'banner') return admin ? bannerGroupKeyboard : staffBannerGroupKeyboard;
    if (groupKey === 'management') return admin ? managementGroupKeyboard : staffManagementGroupKeyboard;
    return groupsKeyboard;
}

const commandButtons = [
    "Mahsulot qo'shish", "Kategoriya qo'shish", "Kategoriya yangilash",
    "Mahsulotni yangilash", "Narxni ommaviy o'zgartirish", "Qidiruv",
    "Statistika", "USD kurs", "Oylik hisobot",
    "Buyurtmalar", "Buyurtmalar (Excel)", "Bekor qilish",
    "Banner qo'shish", "Bannerni o'chirish", "Banner havolasi",
    "Kategoriya tarjimalari",
    "Do'kon kontaktlari",
    "VIP qo'shish", "VIP o'chirish",
    "Admin qo'shish", "Admin o'chirish",
    // Bo'lim navigatsiyasi
    GROUP_PRODUCTS, GROUP_REPORTS, GROUP_BANNER, GROUP_MANAGEMENT, BACK_TO_GROUPS,
];

module.exports = {
    mainKeyboard, staffKeyboard, backKeyboard, mainBackKeyboard, staffBackKeyboard,
    groupsKeyboard,
    commandButtons, isSuperAdmin, getMainKeyboard, getMainBackKeyboard, getGroupKeyboard,
    GROUP_PRODUCTS, GROUP_REPORTS, GROUP_BANNER, GROUP_MANAGEMENT, BACK_TO_GROUPS,
};
