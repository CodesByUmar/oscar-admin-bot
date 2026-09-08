const ExcelJS = require('exceljs');
const { db } = require('../config/firebase');
const { formatDateTime } = require('./helpers');

const STATUS_LABEL = {
    pending: "Kutilmoqda",
    confirmed: "Tasdiqlangan",
    cancelled: "Bekor qilingan",
    delivered: "Yetkazilgan",
};

const MONTH_NAMES_UZ = [
    'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
    'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr',
];

const HEADER_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2F5233' } };
const SECTION_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F0E3' } };

// Joriy oyning 1-kuni, 00:00 (Osiyo/Toshkent, UTC+5 — doim, yoz vaqti yo'q)
// vaqtiga mos keladigan UTC lahzani (Firestore so'rovi uchun) va shu
// oyning yil/oy raqamini (fayl nomi uchun) qaytaradi. Ikkalasini bitta
// Date obyektidan qayta hisoblash xato edi — chegara Date'ining o'zi
// UTC'da bir kun oldinga siljigan bo'ladi (mas: avgust 1-00:00 Toshkent
// = iyul 31-19:00 UTC), shuning uchun yil/oy alohida saqlanadi.
function getCurrentMonthBoundaryTashkent() {
    const tashkentNow = new Date(Date.now() + 5 * 60 * 60 * 1000);
    const year = tashkentNow.getUTCFullYear();
    const month = tashkentNow.getUTCMonth(); // 0-indeksli
    const boundary = new Date(Date.UTC(year, month, 1, 0, 0, 0) - 5 * 60 * 60 * 1000);
    return { boundary, year, month };
}

function customerLabel(o) {
    if (o.isVip) return `⭐ ${o.username || "VIP"}`;
    return o.customerName || o.username || "Noma'lum";
}

function nameToStr(n) {
    if (typeof n === 'string') return n;
    if (n && typeof n === 'object') return n.uz || n.ru || n.en || Object.values(n)[0] || "Noma'lum mahsulot";
    return "Noma'lum mahsulot";
}

function itemsToStr(o) {
    if (!o.items || o.items.length === 0) return '';
    return o.items.map((item) => `${item.quantity} x ${nameToStr(item.name)}`).join('; ');
}

// Har bir admin bo'yicha: nechta buyurtma tasdiqlagan/bekor qilgan/
// yetkazgan, va tasdiqlagan buyurtmalarining umumiy summasi ("qancha
// savdo yopgan").
function buildAdminSummary(orders) {
    const byAdmin = new Map(); // name -> { confirmed, cancelled, delivered, confirmedSum }
    const ensure = (name) => {
        if (!byAdmin.has(name)) byAdmin.set(name, { confirmed: 0, cancelled: 0, delivered: 0, confirmedSum: 0 });
        return byAdmin.get(name);
    };
    orders.forEach((o) => {
        if (o.confirmedBy?.name) {
            const s = ensure(o.confirmedBy.name);
            s.confirmed += 1;
            s.confirmedSum += o.totalUZS || 0;
        }
        if (o.cancelledBy?.name) ensure(o.cancelledBy.name).cancelled += 1;
        if (o.deliveredBy?.name) ensure(o.deliveredBy.name).delivered += 1;
    });
    return byAdmin;
}

// Do'kon (checkout'da tanlangan orderSource) bo'yicha: buyurtmalar soni
// (barcha holatlar — umumiy faollik uchun) va sotuv summasi (faqat
// tasdiqlangan/yetkazilganlar — 150-151 OSCAR / 10-36 X-TRA / SHOWROOM / Online).
function buildStoreSummary(orders) {
    const byStore = new Map(); // source -> { count, sum }
    orders.forEach((o) => {
        const source = o.orderSource || "Noma'lum";
        if (!byStore.has(source)) byStore.set(source, { count: 0, sum: 0 });
        const s = byStore.get(source);
        s.count += 1;
        if (isCompletedSale(o)) s.sum += o.totalUZS || 0;
    });
    return byStore;
}

// Faqat tasdiqlangan yoki yetkazilgan buyurtmalar haqiqiy sotuv
// hisoblanadi — kutilayotgan yoki bekor qilingan buyurtma pulini
// "savdo summasi"ga qo'shish hisobotni chalkashtiradi.
function isCompletedSale(o) {
    return o.status === 'confirmed' || o.status === 'delivered';
}

// Eng ko'p sotilgan mahsulotlar — miqdor va summa bo'yicha (faqat
// haqiqiy sotuv hisoblangan buyurtmalardan).
function buildTopProducts(orders) {
    const byProduct = new Map(); // name -> { qty, sum }
    orders
        .filter(isCompletedSale)
        .forEach((o) => {
            (o.items || []).forEach((item) => {
                const name = nameToStr(item.name);
                if (!byProduct.has(name)) byProduct.set(name, { qty: 0, sum: 0 });
                const p = byProduct.get(name);
                p.qty += item.quantity || 0;
                p.sum += (item.price || 0) * (item.quantity || 0);
            });
        });
    return Array.from(byProduct.entries())
        .map(([name, v]) => ({ name, ...v }))
        .sort((a, b) => b.sum - a.sum);
}

// orders.createdAt ba'zi hujjatlarda Firestore Timestamp, ba'zilarida esa
// oddiy ISO matn sifatida saqlangan (kelib chiqishi — buyurtma boshqa
// tizimda yaratilgan). Ikkalasini ham JS Date'ga xavfsiz o'giradi.
function toJsDate(ts) {
    if (!ts) return null;
    if (typeof ts.toDate === 'function') return ts.toDate();
    const d = new Date(ts);
    return isNaN(d.getTime()) ? null : d;
}

function addSectionHeader(sheet, text, lastCol = 'E') {
    const row = sheet.addRow([text]);
    sheet.mergeCells(`A${row.number}:${lastCol}${row.number}`);
    row.font = { bold: true, size: 12 };
    row.fill = SECTION_FILL;
    row.height = 20;
    row.alignment = { vertical: 'middle' };
    return row;
}

function addFactRow(sheet, label, value) {
    const row = sheet.addRow([label, value]);
    row.getCell(1).font = { bold: false };
    row.getCell(2).font = { bold: true };
    return row;
}

// Faqat xotiradagi `orders` massividan Excel workbook yasaydi — Firestore
// bilan bog'liq emas, shu sabab sinov (test) uchun alohida chaqirish mumkin.
async function buildWorkbookFromOrders(orders, year, month) {
    const wb = new ExcelJS.Workbook();
    const monthLabel = `${MONTH_NAMES_UZ[month]} ${year}`;

    // ==================== "Xulosa" — umumiy, oddiy tilda ====================
    const summarySheet = wb.addWorksheet('Xulosa');
    summarySheet.columns = [
        { key: 'a', width: 30 },
        { key: 'b', width: 20 },
        { key: 'c', width: 24 },
        { key: 'd', width: 18 },
        { key: 'e', width: 18 },
    ];

    const titleRow = summarySheet.addRow([`📊 OYLIK HISOBOT — ${monthLabel}`]);
    summarySheet.mergeCells(`A${titleRow.number}:E${titleRow.number}`);
    titleRow.font = { bold: true, size: 16, color: { argb: 'FF2F5233' } };
    titleRow.height = 28;
    titleRow.alignment = { vertical: 'middle' };
    summarySheet.addRow([]);

    const statusCounts = orders.reduce((acc, o) => {
        acc[o.status] = (acc[o.status] || 0) + 1;
        return acc;
    }, {});
    const confirmedOrCompleted = orders.filter(isCompletedSale);
    const totalSum = confirmedOrCompleted.reduce((sum, o) => sum + (o.totalUZS || 0), 0);
    const avgOrderSum = confirmedOrCompleted.length > 0
        ? Math.round(confirmedOrCompleted.reduce((s, o) => s + (o.totalUZS || 0), 0) / confirmedOrCompleted.length)
        : 0;
    const pct = (n) => orders.length > 0 ? `${Math.round((n / orders.length) * 100)}%` : '0%';

    addSectionHeader(summarySheet, '🔢 UMUMIY KO\'RSATKICHLAR');
    addFactRow(summarySheet, "Jami buyurtmalar soni", orders.length);
    addFactRow(summarySheet, "Jami savdo summasi (tasdiqlangan + yetkazilgan)", `${totalSum.toLocaleString('uz-UZ')} so'm`);
    addFactRow(summarySheet, "O'rtacha buyurtma summasi", `${avgOrderSum.toLocaleString('uz-UZ')} so'm`);
    addFactRow(summarySheet, `✅ ${STATUS_LABEL.confirmed}`, `${statusCounts.confirmed || 0} ta (${pct(statusCounts.confirmed || 0)})`);
    addFactRow(summarySheet, `🏁 ${STATUS_LABEL.delivered}`, `${statusCounts.delivered || 0} ta (${pct(statusCounts.delivered || 0)})`);
    addFactRow(summarySheet, `❌ ${STATUS_LABEL.cancelled}`, `${statusCounts.cancelled || 0} ta (${pct(statusCounts.cancelled || 0)})`);
    addFactRow(summarySheet, `🆕 ${STATUS_LABEL.pending}`, `${statusCounts.pending || 0} ta (${pct(statusCounts.pending || 0)})`);
    summarySheet.addRow([]);

    addSectionHeader(summarySheet, "🏬 DO'KON BO'YICHA");
    const storeHeaderRow = summarySheet.addRow(["Do'kon", 'Buyurtmalar soni', 'Summa (so\'m)']);
    storeHeaderRow.font = { bold: true };
    const byStore = buildStoreSummary(orders);
    Array.from(byStore.entries())
        .sort((a, b) => b[1].sum - a[1].sum)
        .forEach(([source, s]) => {
            const row = summarySheet.addRow([source, s.count, s.sum]);
            row.getCell(3).numFmt = '#,##0';
        });
    summarySheet.addRow([]);

    addSectionHeader(summarySheet, '👤 ADMIN SAMARADORLIGI');
    const adminHeaderRow = summarySheet.addRow([
        'Admin', 'Tasdiqlagan soni', "Tasdiqlagan summasi (so'm)", 'Yetkazgan soni', 'Bekor qilgan soni',
    ]);
    adminHeaderRow.font = { bold: true };
    const byAdmin = buildAdminSummary(orders);
    for (const [name, s] of byAdmin.entries()) {
        const row = summarySheet.addRow([name, s.confirmed, s.confirmedSum, s.delivered, s.cancelled]);
        row.getCell(3).numFmt = '#,##0';
    }
    if (byAdmin.size === 0) {
        summarySheet.addRow(["Bu oyda hali hech kim buyurtma tasdiqlamagan."]);
    }

    // ==================== "Top mahsulotlar" ====================
    const topSheet = wb.addWorksheet('Top mahsulotlar');
    topSheet.columns = [
        { header: 'Mahsulot', key: 'mahsulot', width: 40 },
        { header: 'Sotilgan miqdor', key: 'qty', width: 18 },
        { header: 'Summa (so\'m)', key: 'sum', width: 20 },
    ];
    topSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    topSheet.getRow(1).fill = HEADER_FILL;
    topSheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
    topSheet.autoFilter = { from: 'A1', to: 'C1' };
    topSheet.views = [{ state: 'frozen', ySplit: 1 }];

    buildTopProducts(orders).forEach((p) => {
        topSheet.addRow({ mahsulot: p.name, qty: p.qty, sum: p.sum });
    });
    topSheet.getColumn('sum').numFmt = '#,##0';

    // ==================== "Buyurtmalar" — batafsil ====================
    const detailSheet = wb.addWorksheet('Buyurtmalar');
    detailSheet.columns = [
        { header: 'ID', key: 'id', width: 14 },
        { header: 'Sana', key: 'sana', width: 18 },
        { header: 'Mijoz', key: 'mijoz', width: 28 },
        { header: "Do'kon", key: 'dokon', width: 16 },
        { header: 'Holat', key: 'holat', width: 16 },
        { header: 'Summa (so\'m)', key: 'summa', width: 16 },
        { header: 'Mahsulotlar', key: 'mahsulotlar', width: 50 },
        { header: 'Tasdiqladi', key: 'tasdiqladi', width: 18 },
        { header: 'Bekor qildi', key: 'bekorQildi', width: 18 },
        { header: 'Yetkazdi', key: 'yetkazdi', width: 18 },
    ];
    detailSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    detailSheet.getRow(1).fill = HEADER_FILL;
    detailSheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
    detailSheet.autoFilter = { from: 'A1', to: 'J1' };
    detailSheet.views = [{ state: 'frozen', ySplit: 1 }];

    orders
        .sort((a, b) => (toJsDate(b.createdAt)?.getTime() || 0) - (toJsDate(a.createdAt)?.getTime() || 0))
        .forEach((o) => {
            detailSheet.addRow({
                id: o.id,
                sana: formatDateTime(o.createdAt),
                mijoz: customerLabel(o),
                dokon: o.orderSource || "Noma'lum",
                holat: STATUS_LABEL[o.status] || o.status || "Noma'lum",
                summa: o.totalUZS || 0,
                mahsulotlar: itemsToStr(o),
                tasdiqladi: o.confirmedBy?.name || '',
                bekorQildi: o.cancelledBy?.name || '',
                yetkazdi: o.deliveredBy?.name || '',
            });
        });
    detailSheet.getColumn('summa').numFmt = '#,##0';

    const buffer = await wb.xlsx.writeBuffer();
    const monthFileLabel = `${year}-${String(month + 1).padStart(2, '0')}`;
    return { buffer, filename: `hisobot-${monthFileLabel}.xlsx`, orderCount: orders.length };
}

async function generateMonthlyReportBuffer() {
    const { boundary: startOfMonth, year, month } = getCurrentMonthBoundaryTashkent();
    // MUHIM: createdAt turi hujjatlar orasida bir xil emas (Timestamp yoki
    // ISO matn aralash) — Firestore'ning o'zida turlar mos kelmasa "><"
    // filtri hech narsa topmay qoladi (xato bermaydi, sekin-asta jim
    // noto'g'ri natija beradi). Shuning uchun sana bo'yicha filtrlash
    // serverda emas, barcha hujjatlarni o'qib, shu yerda amalga oshiriladi
    // — buyurtmalar soni hozircha kichik (yuzlab), bu arzon.
    const snap = await db.collection('orders').get();
    const orders = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((o) => {
            const created = toJsDate(o.createdAt);
            return created && created >= startOfMonth;
        });
    return buildWorkbookFromOrders(orders, year, month);
}

module.exports = { generateMonthlyReportBuffer, buildWorkbookFromOrders };
