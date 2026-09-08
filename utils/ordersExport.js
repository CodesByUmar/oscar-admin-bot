// Barcha buyurtmalarni (oy bilan cheklanmagan) Excel faylga eksport qilish.
// utils/monthlyReport.js'ga o'xshaydi, lekin faqat joriy oy emas — bazadagi
// HAMMA buyurtmani chiqaradi va har bir qatorga sotilgan mahsulotlar
// ro'yxatini ham qo'shadi.
const ExcelJS = require('exceljs');
const { db } = require('../config/firebase');
const { formatDateTime } = require('./helpers');

const STATUS_LABEL = {
    pending: "Kutilmoqda",
    confirmed: "Tasdiqlangan",
    cancelled: "Bekor qilingan",
    delivered: "Yetkazilgan",
};

function customerLabel(o) {
    if (o.isVip) return `⭐ ${o.username || "VIP"}`;
    return o.customerName || o.username || "Noma'lum";
}

// createdAt ba'zi hujjatlarda Firestore Timestamp, ba'zilarida oddiy
// ISO matn/son sifatida saqlangan — ikkalasini ham JS Date'ga xavfsiz o'giradi.
function toJsDate(ts) {
    if (!ts) return null;
    if (typeof ts.toDate === 'function') return ts.toDate();
    const d = new Date(ts);
    return isNaN(d.getTime()) ? null : d;
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

function deliveryLabel(o) {
    if (o.deliveryMethod === 'pickup') return o.pickupAddress || o.storeAddress || "O'zim olib ketaman";
    return o.deliveryAddress || o.address || '';
}

async function generateAllOrdersReportBuffer() {
    const snap = await db.collection('orders').get();
    const orders = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (toJsDate(b.createdAt)?.getTime() || 0) - (toJsDate(a.createdAt)?.getTime() || 0));

    const wb = new ExcelJS.Workbook();
    const sheet = wb.addWorksheet('Buyurtmalar');
    sheet.columns = [
        { header: 'ID', key: 'id', width: 14 },
        { header: 'Sana', key: 'sana', width: 18 },
        { header: 'Mijoz', key: 'mijoz', width: 28 },
        { header: 'Telefon', key: 'telefon', width: 16 },
        { header: 'Holat', key: 'holat', width: 16 },
        { header: 'Summa (so\'m)', key: 'summa', width: 16 },
        { header: 'Mahsulotlar', key: 'mahsulotlar', width: 50 },
        { header: 'Yetkazish/Manzil', key: 'manzil', width: 34 },
        { header: 'Tasdiqladi', key: 'tasdiqladi', width: 18 },
        { header: 'Bekor qildi', key: 'bekorQildi', width: 18 },
        { header: 'Yetkazdi', key: 'yetkazdi', width: 18 },
    ];
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2F5233' } };
    sheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.autoFilter = { from: 'A1', to: 'K1' };

    orders.forEach((o) => {
        sheet.addRow({
            id: o.id,
            sana: formatDateTime(o.createdAt),
            mijoz: customerLabel(o),
            telefon: o.customerPhone || '',
            holat: STATUS_LABEL[o.status] || o.status || "Noma'lum",
            summa: o.totalUZS || 0,
            mahsulotlar: itemsToStr(o),
            manzil: deliveryLabel(o),
            tasdiqladi: o.confirmedBy?.name || '',
            bekorQildi: o.cancelledBy?.name || '',
            yetkazdi: o.deliveredBy?.name || '',
        });
    });
    sheet.getColumn('summa').numFmt = '#,##0';

    const buffer = await wb.xlsx.writeBuffer();
    const now = new Date(Date.now() + 5 * 60 * 60 * 1000); // Toshkent
    const dateLabel = now.toISOString().slice(0, 10);
    return { buffer, filename: `barcha-buyurtmalar-${dateLabel}.xlsx`, orderCount: orders.length };
}

module.exports = { generateAllOrdersReportBuffer };
