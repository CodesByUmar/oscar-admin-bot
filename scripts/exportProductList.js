// Barcha mahsulotlarni (nomi, kategoriya, narxlar) Excel fayl qilib yaratadi
// va ADMIN_IDS'dagi birinchi adminning (egasining) Telegram chatiga admin-bot
// orqali yuboradi. Faylda oxirgi bo'sh ustun — "Sotish birligi" — Oscar egasi
// qo'lda to'ldirishi uchun (dona/qop/chelak/quti).
//
// Hech narsani o'zgartirmaydi/o'chirmaydi (faqat o'qiydi).
//
// Ishga tushirish (Railway Console'da, oscar-admin-bot muhitida):
//   node scripts/exportProductList.js
const axios = require('axios');
const FormData = require('form-data');
const ExcelJS = require('exceljs');
const { db } = require('../config/firebase');

function getStr(val, fallback = '') {
    if (val === null || val === undefined) return fallback;
    if (typeof val === 'string') return val;
    if (typeof val === 'object') return val.uz || val.ru || val.en || fallback;
    return String(val);
}

async function main() {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const ownerId = (process.env.ADMIN_IDS || '').split(',').map((s) => s.trim()).filter(Boolean)[0];
    if (!token || !ownerId) throw new Error('TELEGRAM_BOT_TOKEN yoki ADMIN_IDS topilmadi.');

    const snap = await db.collection('products').get();
    const products = snap.docs.map((d) => {
        const p = d.data();
        return {
            id: d.id,
            name: getStr(p.name).trim(),
            top: getStr(p.topCategory).trim(),
            cat: getStr(p.category).trim(),
            piece: Number(p.pricePiece) || 0,
            box: Number(p.priceBox) || 0,
            perBox: Number(p.itemsPerBox) || 0,
            discount: Number(p.discount) || 0,
        };
    });
    products.sort((a, b) =>
        a.top.localeCompare(b.top) || a.cat.localeCompare(b.cat) || a.name.localeCompare(b.name));

    const wb = new ExcelJS.Workbook();
    wb.creator = "Oscar do'kon";
    const ws = wb.addWorksheet('Mahsulotlar', { views: [{ state: 'frozen', ySplit: 1 }] });
    ws.columns = [
        { header: 'ID', key: 'id', width: 7 },
        { header: 'Nomi', key: 'name', width: 46 },
        { header: 'Kategoriya', key: 'top', width: 24 },
        { header: 'Subkategoriya', key: 'cat', width: 28 },
        { header: 'Dona narxi ($)', key: 'piece', width: 15 },
        { header: 'Karobka narxi ($)', key: 'box', width: 18 },
        { header: 'Karobkada nechta dona', key: 'perBox', width: 22 },
        { header: 'Chegirma (%)', key: 'discount', width: 13 },
        { header: "Sotish birligi (dona / qop / chelak / quti) — to'ldiring", key: 'unit', width: 34 },
    ];
    const header = ws.getRow(1);
    header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2F5233' } };
    header.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    header.height = 32;
    ws.autoFilter = { from: 'A1', to: 'I1' };

    products.forEach((p) => ws.addRow({
        id: p.id,
        name: p.name || '(nomi yo\'q)',
        top: p.top || '(kategoriyasiz)',
        cat: p.cat,
        piece: p.piece,
        box: p.box,
        perBox: p.perBox || '',
        discount: p.discount || '',
        unit: '',
    }));
    ws.getColumn('unit').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF8DC' } };

    const buffer = Buffer.from(await wb.xlsx.writeBuffer());
    const fileName = `oscar-mahsulotlar-${new Date().toISOString().slice(0, 10)}.xlsx`;

    const form = new FormData();
    form.append('chat_id', ownerId);
    form.append('caption', `📋 Oscar mahsulotlari ro'yxati: ${products.length} ta (nomi, narxi). Oxirgi ustun — sotish birligi — bo'sh, to'ldirish uchun.`);
    form.append('document', buffer, {
        filename: fileName,
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const res = await axios.post(`https://api.telegram.org/bot${token}/sendDocument`, form, {
        headers: form.getHeaders(),
        maxBodyLength: Infinity,
        timeout: 60000,
    });
    console.log(`✅ Yuborildi: ${fileName} (${products.length} ta mahsulot, ${Math.round(buffer.length / 1024)} KB) -> chat ${ownerId}, ok=${res.data.ok}`);
    process.exit(0);
}

main().catch((err) => {
    console.error('Xato:', err.response ? JSON.stringify(err.response.data) : err.message);
    process.exit(1);
});
