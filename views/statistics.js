// Statistika bo'limi — sonlarni ko'rsatish, har biriga kirib to'liq
// ro'yxatni (sahifalab) ko'rish, va UZ/RU/EN tilini tanlash imkoni.
const { bot } = require('../config/adminBot');
const { db } = require('../config/firebase');
const { getMainKeyboard } = require('../keyboards');
const { getStr } = require('../utils/helpers');
const { keyToDocId } = require('./categoryTranslation');

const PAGE_SIZE = 10;

const T = {
    uz: {
        title: '📊 Statistika:', products: 'Mahsulotlar', categories: 'Kategoriyalar',
        topcats: 'Top-kategoriyalar', customers: 'Mijozlar', vip: 'VIP', orders: 'Buyurtmalar',
        rate: 'USD kurs', detail: "Batafsil ko'rish uchun tanlang:", back: "⬅️ Statistikaga qaytish",
        prev: '⬅️ Oldingi', next: 'Keyingi ➡️', page: 'sahifa', ta: ' ta', unknown: "Noma'lum",
        ordersCount: (n) => `${n} ta buyurtma`, notEntered: 'Kiritilmagan',
    },
    ru: {
        title: '📊 Статистика:', products: 'Товары', categories: 'Категории',
        topcats: 'Топ-категории', customers: 'Клиенты', vip: 'VIP', orders: 'Заказы',
        rate: 'Курс USD', detail: 'Выберите для подробностей:', back: '⬅️ Назад к статистике',
        prev: '⬅️ Пред.', next: 'След. ➡️', page: 'стр.', ta: '', unknown: 'Неизвестно',
        ordersCount: (n) => `${n} заказ(ов)`, notEntered: 'Не указан',
    },
    en: {
        title: '📊 Statistics:', products: 'Products', categories: 'Categories',
        topcats: 'Top categories', customers: 'Customers', vip: 'VIP', orders: 'Orders',
        rate: 'USD rate', detail: 'Select to view details:', back: '⬅️ Back to statistics',
        prev: '⬅️ Prev', next: 'Next ➡️', page: 'page', ta: '', unknown: 'Unknown',
        ordersCount: (n) => `${n} order(s)`, notEntered: 'Not set',
    },
};

const langCache = new Map();

async function getAdminLang(chatId) {
    if (langCache.has(chatId)) return langCache.get(chatId);
    try {
        const doc = await db.collection('admin_prefs').doc(String(chatId)).get();
        const lang = (doc.exists && ['uz', 'ru', 'en'].includes(doc.data().statLang)) ? doc.data().statLang : 'uz';
        langCache.set(chatId, lang);
        return lang;
    } catch (error) {
        return 'uz';
    }
}

async function setAdminLang(chatId, lang) {
    langCache.set(chatId, lang);
    try {
        await db.collection('admin_prefs').doc(String(chatId)).set({ statLang: lang }, { merge: true });
    } catch (error) {
        console.error('Til sozlamasini saqlashda xato:', error);
    }
}

// `name` — string yoki {uz,ru,en} obyekt bo'lishi mumkin (mahsulot nomi).
function pickLang(name, lang, fallback = '?') {
    if (!name) return fallback;
    if (typeof name === 'string') return name;
    return name[lang] || name.ru || name.uz || name.en || fallback;
}

// Kategoriya/top-kategoriya kalitini (odatda o'zbekcha saqlanadi)
// `categoryTranslations` kolleksiyasi orqali RU/EN'ga o'giradi (mijoz
// ilovasi ham xuddi shu kolleksiyani ishlatadi).
async function translateKey(key, lang, trMap) {
    if (lang === 'uz' || !key) return key;
    const docId = keyToDocId(key);
    const tr = trMap.get(docId);
    return (tr && tr[lang]) || key;
}

async function loadTranslations() {
    const map = new Map();
    try {
        const snap = await db.collection('categoryTranslations').get();
        snap.docs.forEach((d) => map.set(d.id, d.data()));
    } catch (error) { /* tarjima topilmasa, kalitning o'zi ishlatiladi */ }
    return map;
}

function paginate(items, page) {
    const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
    const safePage = Math.min(Math.max(page, 0), totalPages - 1);
    return {
        pageItems: items.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE),
        safePage,
        totalPages,
    };
}

function navRow(prefix, safePage, totalPages, t) {
    const row = [];
    if (safePage > 0) row.push({ text: t.prev, callback_data: `${prefix}_${safePage - 1}` });
    if (safePage < totalPages - 1) row.push({ text: t.next, callback_data: `${prefix}_${safePage + 1}` });
    return row;
}

function langSwitchRow(current) {
    const flags = { uz: "🇺🇿 UZ", ru: "🇷🇺 RU", en: "🇬🇧 EN" };
    return Object.keys(flags).map((l) => ({
        text: l === current ? `• ${flags[l]} •` : flags[l],
        callback_data: `stat_lang_${l}`,
    }));
}

async function showStatisticsMenu(chatId, messageId = null) {
    try {
        const lang = await getAdminLang(chatId);
        const t = T[lang];
        const [pCount, cCount, o, vipCount, rateDoc] = await Promise.all([
            db.collection('products').count().get(),
            db.collection('categories').count().get(),
            db.collection('orders').get(),
            db.collection('VIP_Clients').count().get(),
            db.collection('settings').doc('usd_rate').get(),
        ]);
        const rate = rateDoc.exists ? (rateDoc.data().rate || t.notEntered) : t.notEntered;

        const uniqueCustomers = new Set();
        o.docs.forEach((doc) => {
            const od = doc.data();
            const key = od.telegramChatId || od.customerPhone;
            if (key) uniqueCustomers.add(String(key));
        });

        const text =
            `${t.title}\n` +
            `🔹 ${t.products}: ${pCount.data().count}\n` +
            `🔹 ${t.categories}: ${cCount.data().count}\n` +
            `🔹 ${t.orders}: ${o.size}\n` +
            `🔹 ${t.customers}: ${uniqueCustomers.size}\n` +
            `🔹 ${t.vip}: ${vipCount.data().count}\n` +
            `💱 ${t.rate}: 1 USD = ${typeof rate === 'number' ? rate.toLocaleString('uz-UZ') : rate} so'm\n\n` +
            t.detail;
        const kb = {
            inline_keyboard: [
                langSwitchRow(lang),
                [{ text: `📦 ${t.products} (${pCount.data().count})`, callback_data: 'stat_products_0' }],
                [{ text: `📁 ${t.categories} (${cCount.data().count})`, callback_data: 'stat_categories_0' }],
                [{ text: `🗂 ${t.topcats}`, callback_data: 'stat_topcats_0' }],
                [{ text: `👥 ${t.customers} (${uniqueCustomers.size})`, callback_data: 'stat_customers_0' }],
                [{ text: `⭐ ${t.vip} (${vipCount.data().count})`, callback_data: 'stat_vip_0' }],
            ],
        };
        if (messageId) {
            await bot.editMessageText(text, { chat_id: chatId, message_id: messageId, reply_markup: kb });
        } else {
            await bot.sendMessage(chatId, text, { reply_markup: kb });
        }
    } catch (error) {
        console.error('Statistika xato:', error);
        bot.sendMessage(chatId, '❌ Xato!', getMainKeyboard(chatId));
    }
}

async function showStatProducts(chatId, messageId, page = 0) {
    try {
        const lang = await getAdminLang(chatId);
        const t = T[lang];
        const snap = await db.collection('products').get();
        const items = snap.docs
            .map((d) => ({ id: d.id, name: pickLang(d.data().name, lang, '?') }))
            .sort((a, b) => a.name.localeCompare(b.name));
        const { pageItems, safePage, totalPages } = paginate(items, page);
        const kb = { inline_keyboard: [] };
        pageItems.forEach((p) => {
            kb.inline_keyboard.push([{ text: `${p.name} (#${p.id})`.slice(0, 64), callback_data: `update_product_${p.id}` }]);
        });
        const nav = navRow('stat_products', safePage, totalPages, t);
        if (nav.length) kb.inline_keyboard.push(nav);
        kb.inline_keyboard.push([{ text: t.back, callback_data: 'stat_back' }]);
        await bot.editMessageText(
            `📦 ${t.products} (${items.length}${t.ta}) — ${t.page} ${safePage + 1}/${totalPages}`,
            { chat_id: chatId, message_id: messageId, reply_markup: kb }
        );
    } catch (error) {
        console.error('Statistika (mahsulotlar) xato:', error);
    }
}

async function showStatCategories(chatId, messageId, page = 0) {
    try {
        const lang = await getAdminLang(chatId);
        const t = T[lang];
        const [catsSnap, productsSnap, trMap] = await Promise.all([
            db.collection('categories').get(),
            db.collection('products').get(),
            loadTranslations(),
        ]);
        const countByCategory = new Map();
        productsSnap.docs.forEach((d) => {
            const key = getStr(d.data().category, t.unknown);
            countByCategory.set(key, (countByCategory.get(key) || 0) + 1);
        });
        const items = await Promise.all(catsSnap.docs.map(async (d) => {
            const key = getStr(d.data().name, '?');
            const label = await translateKey(key, lang, trMap);
            return { label, count: countByCategory.get(key) || 0 };
        }));
        items.sort((a, b) => b.count - a.count);
        const { pageItems, safePage, totalPages } = paginate(items, page);
        const kb = { inline_keyboard: [] };
        pageItems.forEach((c) => {
            kb.inline_keyboard.push([{ text: `${c.label} — ${c.count}${t.ta}`.slice(0, 64), callback_data: 'noop' }]);
        });
        const nav = navRow('stat_categories', safePage, totalPages, t);
        if (nav.length) kb.inline_keyboard.push(nav);
        kb.inline_keyboard.push([{ text: t.back, callback_data: 'stat_back' }]);
        await bot.editMessageText(
            `📁 ${t.categories} (${items.length}${t.ta}) — ${t.page} ${safePage + 1}/${totalPages}`,
            { chat_id: chatId, message_id: messageId, reply_markup: kb }
        );
    } catch (error) {
        console.error('Statistika (kategoriyalar) xato:', error);
    }
}

async function showStatTopCategories(chatId, messageId, page = 0) {
    try {
        const lang = await getAdminLang(chatId);
        const t = T[lang];
        const [productsSnap, trMap] = await Promise.all([
            db.collection('products').get(),
            loadTranslations(),
        ]);
        const countByTop = new Map();
        productsSnap.docs.forEach((d) => {
            const top = typeof d.data().topCategory === 'string' && d.data().topCategory ? d.data().topCategory : 'Boshqa';
            countByTop.set(top, (countByTop.get(top) || 0) + 1);
        });
        const items = await Promise.all(Array.from(countByTop.entries()).map(async ([key, count]) => {
            const label = await translateKey(key, lang, trMap);
            return { label, count };
        }));
        items.sort((a, b) => b.count - a.count);
        const { pageItems, safePage, totalPages } = paginate(items, page);
        const kb = { inline_keyboard: [] };
        pageItems.forEach((c) => {
            kb.inline_keyboard.push([{ text: `${c.label} — ${c.count}${t.ta}`.slice(0, 64), callback_data: 'noop' }]);
        });
        const nav = navRow('stat_topcats', safePage, totalPages, t);
        if (nav.length) kb.inline_keyboard.push(nav);
        kb.inline_keyboard.push([{ text: t.back, callback_data: 'stat_back' }]);
        await bot.editMessageText(
            `🗂 ${t.topcats} (${items.length}${t.ta}) — ${t.page} ${safePage + 1}/${totalPages}`,
            { chat_id: chatId, message_id: messageId, reply_markup: kb }
        );
    } catch (error) {
        console.error('Statistika (top-kategoriyalar) xato:', error);
    }
}

async function showStatCustomers(chatId, messageId, page = 0) {
    try {
        const lang = await getAdminLang(chatId);
        const t = T[lang];
        const ordersSnap = await db.collection('orders').get();
        const byCustomer = new Map();
        ordersSnap.docs.forEach((d) => {
            const od = d.data();
            const key = od.telegramChatId || od.customerPhone;
            if (!key) return;
            const k = String(key);
            const existing = byCustomer.get(k);
            const name = od.customerName || od.username || t.unknown;
            if (existing) {
                existing.count += 1;
                if (!existing.name || existing.name === t.unknown) existing.name = name;
            } else {
                byCustomer.set(k, { name, phone: od.customerPhone || '', count: 1 });
            }
        });
        const items = Array.from(byCustomer.values()).sort((a, b) => b.count - a.count);
        const { pageItems, safePage, totalPages } = paginate(items, page);
        const kb = { inline_keyboard: [] };
        pageItems.forEach((c) => {
            const label = `${c.name}${c.phone ? ' | ' + c.phone : ''} — ${t.ordersCount(c.count)}`;
            kb.inline_keyboard.push([{ text: label.slice(0, 64), callback_data: 'noop' }]);
        });
        const nav = navRow('stat_customers', safePage, totalPages, t);
        if (nav.length) kb.inline_keyboard.push(nav);
        kb.inline_keyboard.push([{ text: t.back, callback_data: 'stat_back' }]);
        await bot.editMessageText(
            `👥 ${t.customers} (${items.length}${t.ta}) — ${t.page} ${safePage + 1}/${totalPages}`,
            { chat_id: chatId, message_id: messageId, reply_markup: kb }
        );
    } catch (error) {
        console.error('Statistika (mijozlar) xato:', error);
    }
}

async function showStatVip(chatId, messageId, page = 0) {
    try {
        const lang = await getAdminLang(chatId);
        const t = T[lang];
        const snap = await db.collection('VIP_Clients').get();
        const items = snap.docs
            .map((d) => ({ id: d.id, name: d.data().username || t.unknown, login: d.data().login || '' }))
            .sort((a, b) => a.name.localeCompare(b.name));
        const { pageItems, safePage, totalPages } = paginate(items, page);
        const kb = { inline_keyboard: [] };
        pageItems.forEach((v) => {
            kb.inline_keyboard.push([{ text: `${v.name}${v.login ? ' (' + v.login + ')' : ''}`.slice(0, 64), callback_data: 'noop' }]);
        });
        const nav = navRow('stat_vip', safePage, totalPages, t);
        if (nav.length) kb.inline_keyboard.push(nav);
        kb.inline_keyboard.push([{ text: t.back, callback_data: 'stat_back' }]);
        await bot.editMessageText(
            `⭐ ${t.vip} (${items.length}${t.ta}) — ${t.page} ${safePage + 1}/${totalPages}`,
            { chat_id: chatId, message_id: messageId, reply_markup: kb }
        );
    } catch (error) {
        console.error('Statistika (VIP) xato:', error);
    }
}

module.exports = {
    showStatisticsMenu,
    showStatProducts,
    showStatCategories,
    showStatTopCategories,
    showStatCustomers,
    showStatVip,
    setAdminLang,
};
