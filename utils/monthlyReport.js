const ExcelJS = require('exceljs');
const { db } = require('../config/firebase');
const { getStr, formatDateTime } = require('./helpers');

const STATUS_LABEL = {
    pending: "Kutilmoqda",
    confirmed: "Tasdiqlangan",
    cancelled: "Bekor qilingan",
    delivered: "Yetkazilgan",
};

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

// orders.createdAt ba'zi hujjatlarda Firestore Timestamp, ba'zilarida esa
// oddiy ISO matn sifatida saqlangan (kelib chiqishi — buyurtma boshqa
// tizimda yaratilgan). Ikkalasini ham JS Date'ga xavfsiz o'giradi.
function toJsDate(ts) {
    if (!ts) return null;
    if (typeof ts.toDate === 'function') return ts.toDate();
    const d = new Date(ts);
    return isNaN(d.getTime()) ? null : d;
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

    const wb = new ExcelJS.Workbook();

    // ---------- "Buyurtmalar" varag'i (batafsil) ----------
    const detailSheet = wb.addWorksheet('Buyurtmalar');
    detailSheet.columns = [
        { header: 'ID', key: 'id', width: 14 },
        { header: 'Sana', key: 'sana', width: 18 },
        { header: 'Mijoz', key: 'mijoz', width: 28 },
        { header: 'Holat', key: 'holat', width: 16 },
        { header: 'Summa (so\'m)', key: 'summa', width: 16 },
        { header: 'Tasdiqladi', key: 'tasdiqladi', width: 18 },
        { header: 'Bekor qildi', key: 'bekorQildi', width: 18 },
        { header: 'Yetkazdi', key: 'yetkazdi', width: 18 },
    ];
    detailSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    detailSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2F5233' } };
    detailSheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
    detailSheet.autoFilter = { from: 'A1', to: 'H1' };

    orders
        .sort((a, b) => (toJsDate(b.createdAt)?.getTime() || 0) - (toJsDate(a.createdAt)?.getTime() || 0))
        .forEach((o) => {
            detailSheet.addRow({
                id: o.id,
                sana: formatDateTime(o.createdAt),
                mijoz: customerLabel(o),
                holat: STATUS_LABEL[o.status] || o.status || "Noma'lum",
                summa: o.totalUZS || 0,
                tasdiqladi: o.confirmedBy?.name || '',
                bekorQildi: o.cancelledBy?.name || '',
                yetkazdi: o.deliveredBy?.name || '',
            });
        });
    detailSheet.getColumn('summa').numFmt = '#,##0';

    // ---------- "Xulosa" varag'i (admin bo'yicha) ----------
    const summarySheet = wb.addWorksheet('Xulosa');
    summarySheet.columns = [
        { header: 'Admin', key: 'admin', width: 22 },
        { header: 'Tasdiqlagan soni', key: 'confirmed', width: 18 },
        { header: 'Tasdiqlagan summasi (so\'m)', key: 'confirmedSum', width: 24 },
        { header: 'Yetkazgan soni', key: 'delivered', width: 16 },
        { header: 'Bekor qilgan soni', key: 'cancelled', width: 18 },
    ];
    summarySheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    summarySheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2F5233' } };
    summarySheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

    const byAdmin = buildAdminSummary(orders);
    for (const [name, s] of byAdmin.entries()) {
        summarySheet.addRow({
            admin: name,
            confirmed: s.confirmed,
            confirmedSum: s.confirmedSum,
            delivered: s.delivered,
            cancelled: s.cancelled,
        });
    }
    summarySheet.getColumn('confirmedSum').numFmt = '#,##0';

    const statusCounts = orders.reduce((acc, o) => {
        acc[o.status] = (acc[o.status] || 0) + 1;
        return acc;
    }, {});
    const totalSum = orders.reduce((sum, o) => sum + (o.totalUZS || 0), 0);

    summarySheet.addRow({});
    const totalHeaderRow = summarySheet.addRow({ admin: 'JAMI (oy bo\'yicha)' });
    totalHeaderRow.font = { bold: true };
    summarySheet.addRow({ admin: 'Jami buyurtmalar', confirmed: orders.length });
    summarySheet.addRow({ admin: 'Jami summa (so\'m)', confirmed: totalSum });
    summarySheet.addRow({ admin: `  - ${STATUS_LABEL.pending}`, confirmed: statusCounts.pending || 0 });
    summarySheet.addRow({ admin: `  - ${STATUS_LABEL.confirmed}`, confirmed: statusCounts.confirmed || 0 });
    summarySheet.addRow({ admin: `  - ${STATUS_LABEL.cancelled}`, confirmed: statusCounts.cancelled || 0 });
    summarySheet.addRow({ admin: `  - ${STATUS_LABEL.delivered}`, confirmed: statusCounts.delivered || 0 });

    const buffer = await wb.xlsx.writeBuffer();
    const monthLabel = `${year}-${String(month + 1).padStart(2, '0')}`;
    return { buffer, filename: `hisobot-${monthLabel}.xlsx`, orderCount: orders.length };
}

module.exports = { generateMonthlyReportBuffer };
