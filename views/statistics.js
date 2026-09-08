// Statistika bo'limi — endi faqat sonlarni emas, ichiga kirib har bir
// ro'yxatni (mahsulotlar, kategoriyalar, top-kategoriyalar, mijozlar, VIP)
// ko'rish imkonini beradi.
const { bot } = require('../config/adminBot');
const { db } = require('../config/firebase');
const { getMainKeyboard } = require('../keyboards');
const { getStr, formatDateTime } = require('../utils/helpers');

const PAGE_SIZE = 10;

function paginate(items, page) {
    const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
    const safePage = Math.min(Math.max(page, 0), totalPages - 1);
    return {
        pageItems: items.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE),
        safePage,
        totalPages,
    };
}

function navRow(prefix, safePage, totalPages) {
    const row = [];
    if (safePage > 0) row.push({ text: '⬅️ Oldingi', callback_data: `${prefix}_${safePage - 1}` });
    if (safePage < totalPages - 1) row.push({ text: 'Keyingi ➡️', callback_data: `${prefix}_${safePage + 1}` });
    return row;
}

async function showStatisticsMenu(chatId, messageId = null) {
    try {
        const [pCount, cCount, o, vipCount, rateDoc] = await Promise.all([
            db.collection('products').count().get(),
            db.collection('categories').count().get(),
            db.collection('orders').get(),
            db.collection('VIP_Clients').count().get(),
            db.collection('settings').doc('usd_rate').get(),
        ]);
        const rate = rateDoc.exists ? (rateDoc.data().rate || 'Kiritilmagan') : 'Kiritilmagan';

        const uniqueCustomers = new Set();
        o.docs.forEach((doc) => {
            const od = doc.data();
            const key = od.telegramChatId || od.customerPhone;
            if (key) uniqueCustomers.add(String(key));
        });

        const text =
            `📊 Statistika:\n` +
            `🔹 Mahsulotlar: ${pCount.data().count}\n` +
            `🔹 Kategoriyalar: ${cCount.data().count}\n` +
            `🔹 Buyurtmalar: ${o.size}\n` +
            `🔹 Mijozlar: ${uniqueCustomers.size}\n` +
            `🔹 VIP: ${vipCount.data().count}\n` +
            `💱 USD kurs: 1 USD = ${typeof rate === 'number' ? rate.toLocaleString('uz-UZ') : rate} so'm\n\n` +
            `Batafsil ko'rish uchun tanlang:`;
        const kb = {
            inline_keyboard: [
                [{ text: `📦 Mahsulotlar (${pCount.data().count})`, callback_data: 'stat_products_0' }],
                [{ text: `📁 Kategoriyalar (${cCount.data().count})`, callback_data: 'stat_categories_0' }],
                [{ text: `🗂 Top-kategoriyalar`, callback_data: 'stat_topcats_0' }],
                [{ text: `👥 Mijozlar (${uniqueCustomers.size})`, callback_data: 'stat_customers_0' }],
                [{ text: `⭐ VIP (${vipCount.data().count})`, callback_data: 'stat_vip_0' }],
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
        const snap = await db.collection('products').get();
        const items = snap.docs
            .map((d) => ({ id: d.id, name: getStr(d.data().name, '?') }))
            .sort((a, b) => a.name.localeCompare(b.name));
        const { pageItems, safePage, totalPages } = paginate(items, page);
        const kb = { inline_keyboard: [] };
        pageItems.forEach((p) => {
            kb.inline_keyboard.push([{ text: `${p.name} (#${p.id})`.slice(0, 64), callback_data: `update_product_${p.id}` }]);
        });
        const nav = navRow('stat_products', safePage, totalPages);
        if (nav.length) kb.inline_keyboard.push(nav);
        kb.inline_keyboard.push([{ text: '⬅️ Statistikaga qaytish', callback_data: 'stat_back' }]);
        await bot.editMessageText(
            `📦 Mahsulotlar (${items.length} ta) — sahifa ${safePage + 1}/${totalPages}`,
            { chat_id: chatId, message_id: messageId, reply_markup: kb }
        );
    } catch (error) {
        console.error('Statistika (mahsulotlar) xato:', error);
    }
}

async function showStatCategories(chatId, messageId, page = 0) {
    try {
        const [catsSnap, productsSnap] = await Promise.all([
            db.collection('categories').get(),
            db.collection('products').get(),
        ]);
        const countByCategory = new Map();
        productsSnap.docs.forEach((d) => {
            const key = getStr(d.data().category, "Yo'q");
            countByCategory.set(key, (countByCategory.get(key) || 0) + 1);
        });
        const items = catsSnap.docs
            .map((d) => {
                const name = getStr(d.data().name, '?');
                return { name, count: countByCategory.get(name) || 0 };
            })
            .sort((a, b) => b.count - a.count);
        const { pageItems, safePage, totalPages } = paginate(items, page);
        const kb = { inline_keyboard: [] };
        pageItems.forEach((c) => {
            kb.inline_keyboard.push([{ text: `${c.name} — ${c.count} ta`.slice(0, 64), callback_data: 'noop' }]);
        });
        const nav = navRow('stat_categories', safePage, totalPages);
        if (nav.length) kb.inline_keyboard.push(nav);
        kb.inline_keyboard.push([{ text: '⬅️ Statistikaga qaytish', callback_data: 'stat_back' }]);
        await bot.editMessageText(
            `📁 Kategoriyalar (${items.length} ta) — sahifa ${safePage + 1}/${totalPages}`,
            { chat_id: chatId, message_id: messageId, reply_markup: kb }
        );
    } catch (error) {
        console.error('Statistika (kategoriyalar) xato:', error);
    }
}

async function showStatTopCategories(chatId, messageId, page = 0) {
    try {
        const productsSnap = await db.collection('products').get();
        const countByTop = new Map();
        productsSnap.docs.forEach((d) => {
            const top = typeof d.data().topCategory === 'string' && d.data().topCategory ? d.data().topCategory : 'Boshqa';
            countByTop.set(top, (countByTop.get(top) || 0) + 1);
        });
        const items = Array.from(countByTop.entries())
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);
        const { pageItems, safePage, totalPages } = paginate(items, page);
        const kb = { inline_keyboard: [] };
        pageItems.forEach((c) => {
            kb.inline_keyboard.push([{ text: `${c.name} — ${c.count} ta`.slice(0, 64), callback_data: 'noop' }]);
        });
        const nav = navRow('stat_topcats', safePage, totalPages);
        if (nav.length) kb.inline_keyboard.push(nav);
        kb.inline_keyboard.push([{ text: '⬅️ Statistikaga qaytish', callback_data: 'stat_back' }]);
        await bot.editMessageText(
            `🗂 Top-kategoriyalar (${items.length} ta) — sahifa ${safePage + 1}/${totalPages}`,
            { chat_id: chatId, message_id: messageId, reply_markup: kb }
        );
    } catch (error) {
        console.error('Statistika (top-kategoriyalar) xato:', error);
    }
}

async function showStatCustomers(chatId, messageId, page = 0) {
    try {
        const ordersSnap = await db.collection('orders').get();
        const byCustomer = new Map(); // key -> { name, phone, count, lastAt }
        ordersSnap.docs.forEach((d) => {
            const od = d.data();
            const key = od.telegramChatId || od.customerPhone;
            if (!key) return;
            const k = String(key);
            const existing = byCustomer.get(k);
            const name = od.customerName || od.username || 'Noma\'lum';
            if (existing) {
                existing.count += 1;
                if (!existing.name || existing.name === 'Noma\'lum') existing.name = name;
            } else {
                byCustomer.set(k, { name, phone: od.customerPhone || '', count: 1 });
            }
        });
        const items = Array.from(byCustomer.values()).sort((a, b) => b.count - a.count);
        const { pageItems, safePage, totalPages } = paginate(items, page);
        const kb = { inline_keyboard: [] };
        pageItems.forEach((c) => {
            const label = `${c.name}${c.phone ? ' | ' + c.phone : ''} — ${c.count} ta buyurtma`;
            kb.inline_keyboard.push([{ text: label.slice(0, 64), callback_data: 'noop' }]);
        });
        const nav = navRow('stat_customers', safePage, totalPages);
        if (nav.length) kb.inline_keyboard.push(nav);
        kb.inline_keyboard.push([{ text: '⬅️ Statistikaga qaytish', callback_data: 'stat_back' }]);
        await bot.editMessageText(
            `👥 Mijozlar (${items.length} ta) — sahifa ${safePage + 1}/${totalPages}`,
            { chat_id: chatId, message_id: messageId, reply_markup: kb }
        );
    } catch (error) {
        console.error('Statistika (mijozlar) xato:', error);
    }
}

async function showStatVip(chatId, messageId, page = 0) {
    try {
        const snap = await db.collection('VIP_Clients').get();
        const items = snap.docs
            .map((d) => ({ id: d.id, name: d.data().username || 'Noma\'lum', login: d.data().login || '' }))
            .sort((a, b) => a.name.localeCompare(b.name));
        const { pageItems, safePage, totalPages } = paginate(items, page);
        const kb = { inline_keyboard: [] };
        pageItems.forEach((v) => {
            kb.inline_keyboard.push([{ text: `${v.name}${v.login ? ' (' + v.login + ')' : ''}`.slice(0, 64), callback_data: 'noop' }]);
        });
        const nav = navRow('stat_vip', safePage, totalPages);
        if (nav.length) kb.inline_keyboard.push(nav);
        kb.inline_keyboard.push([{ text: '⬅️ Statistikaga qaytish', callback_data: 'stat_back' }]);
        await bot.editMessageText(
            `⭐ VIP mijozlar (${items.length} ta) — sahifa ${safePage + 1}/${totalPages}`,
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
};
