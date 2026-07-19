// ====================== MAHSULOTLARNI TEKSHIRISH VA EXCEL'GA CHIQARISH ======================
// Nima qiladi:
//   1. Firestore'dagi barcha mahsulotlarni o'qiydi (521 ta)
//   2. Har biri uchun tekshiradi: nomi bormi, rasm maydoni bormi, rasm havolasi
//      HAQIQATAN HAM ochiladimi (buzilgan/o'chirilgan havola emasmi)
//   3. Natijani rangli, saralanadigan "mahsulotlar-tekshiruvi.xlsx" fayliga yozadi
//
// O'RNATISH (bir marta, oscar-admin-bot papkasida):
//   npm install exceljs
//   (axios, firebase-admin, dotenv sizda allaqachon bor)
//
// ISHGA TUSHIRISH:
//   node export-products-excel.js
//
// Eslatma: 521 ta rasm havolasini tekshirish (har biriga so'rov yuborish) bir necha
// daqiqa vaqt olishi mumkin — bu normal, sabr qiling, jarayon konsolda ko'rinib turadi.
// Agar tezroq kerak bo'lsa (faqat maydon bor-yo'qligini tekshirish, havolani real
// so'rov bilan tekshirmasdan): node export-products-excel.js --fast
// ================================================================================================

require("dotenv").config();
const admin = require("firebase-admin");
const axios = require("axios");
const ExcelJS = require("exceljs");

const FAST_MODE = process.argv.includes("--fast"); // havolalarni real tekshirmaydi, faqat maydon borligini ko'radi
const CONCURRENCY = 15; // bir vaqtda nechta havola tekshirilsin (tezlik/xavfsizlik muvozanati)

const saJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
if (!saJson) { console.error("❌ FIREBASE_SERVICE_ACCOUNT_JSON topilmadi (.env)"); process.exit(1); }
admin.initializeApp({ credential: admin.credential.cert(JSON.parse(saJson)) });
const db = admin.firestore();

function matn(qiymat) {
    if (!qiymat) return "";
    if (typeof qiymat === "string") return qiymat;
    if (typeof qiymat === "object") return qiymat.uz || qiymat.ru || qiymat.en || Object.values(qiymat)[0] || "";
    return String(qiymat);
}

// Rasm havolasi haqiqatan ham ochiladimi — tekshiradi (HEAD so'rov, 8 soniya limit bilan)
async function havolaIshlaydimi(url) {
    if (!url) return false;
    try {
        const res = await axios.head(url, { timeout: 8000, validateStatus: () => true });
        if (res.status >= 200 && res.status < 400) return true;
        // Ba'zi serverlar HEAD'ni qo'llab-quvvatlamaydi — GET bilan qayta urinamiz
        const res2 = await axios.get(url, { timeout: 8000, validateStatus: () => true, responseType: "stream" });
        return res2.status >= 200 && res2.status < 400;
    } catch (e) {
        return false;
    }
}

// Ro'yxatni kichik guruhlarga bo'lib, parallel tekshiradi (bir vaqtda CONCURRENCY tadan)
async function guruhlabTekshirish(itemlar, ishFunksiya, progressYozuv) {
    const natijalar = new Array(itemlar.length);
    let bajarildi = 0;
    for (let i = 0; i < itemlar.length; i += CONCURRENCY) {
        const guruh = itemlar.slice(i, i + CONCURRENCY);
        const guruhNatija = await Promise.all(guruh.map((item) => ishFunksiya(item)));
        guruhNatija.forEach((n, idx) => { natijalar[i + idx] = n; });
        bajarildi += guruh.length;
        if (progressYozuv) progressYozuv(bajarildi, itemlar.length);
    }
    return natijalar;
}

async function main() {
    console.log(FAST_MODE
        ? "⚡ TEZKOR REJIM — rasm havolalari haqiqiy so'rov bilan tekshirilmaydi, faqat maydon borligi ko'riladi.\n"
        : "🔍 TO'LIQ TEKSHIRUV — har bir rasm havolasi haqiqatan ochilishi tekshiriladi (biroz vaqt oladi).\n");

    console.log("🗄  Firestore'dan mahsulotlarni o'qiyapman...");
    const snap = await db.collection("products").get();
    const mahsulotlar = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    console.log(`✅ ${mahsulotlar.length} ta mahsulot topildi.\n`);

    let havolaNatijalari = new Array(mahsulotlar.length).fill(null);
    if (!FAST_MODE) {
        console.log("🌐 Rasm havolalarini tekshiryapman...");
        havolaNatijalari = await guruhlabTekshirish(
            mahsulotlar,
            async (p) => (p.image ? await havolaIshlaydimi(p.image) : false),
            (bajarildi, jami) => process.stdout.write(`\r   ${bajarildi}/${jami} tekshirildi...`)
        );
        console.log("\n");
    }

    // ---------- Excel yaratish ----------
    const wb = new ExcelJS.Workbook();
    wb.creator = "Oscar do'kon";
    const ws = wb.addWorksheet("Mahsulotlar", { views: [{ state: "frozen", ySplit: 1 }] });

    ws.columns = [
        { header: "ID", key: "id", width: 8 },
        { header: "Nomi (UZ)", key: "nomi", width: 40 },
        { header: "Kategoriya", key: "kategoriya", width: 28 },
        { header: "Dona narxi ($)", key: "narxDona", width: 14 },
        { header: "Karobka narxi ($)", key: "narxKarobka", width: 16 },
        { header: "Stock", key: "stock", width: 10 },
        { header: "Nomi holati", key: "nomiHolati", width: 14 },
        { header: "Rasm holati", key: "rasmHolati", width: 14 },
        { header: "Rasm havolasi", key: "rasmUrl", width: 45 },
        { header: "Umumiy status", key: "umumiy", width: 16 },
    ];
    ws.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2F5233" } };
    ws.getRow(1).alignment = { vertical: "middle", horizontal: "center" };
    ws.autoFilter = { from: "A1", to: "J1" };

    const YASHIL = "FFDFF2D8", QIZIL = "FFFBE0E0", SARIQ = "FFFDF3D0";
    const YASHIL_MATN = "FF1E5B1E", QIZIL_MATN = "FF9E2020", SARIQ_MATN = "FF8A6D1E";

    let nomiYoq = 0, rasmYoqSoni = 0, rasmBuzuq = 0, toliq = 0;

    mahsulotlar.forEach((p, idx) => {
        const nomi = matn(p.name);
        const kategoriya = matn(p.category);
        const rasmBor = !!(p.image && String(p.image).trim() !== "");
        const rasmIshlaydi = FAST_MODE ? null : havolaNatijalari[idx];

        const nomiOk = nomi.trim() !== "";
        let rasmHolatiMatn, rasmHolatiRang, rasmHolatiMatnRang;
        if (!rasmBor) {
            rasmHolatiMatn = "❌ Yo'q"; rasmHolatiRang = QIZIL; rasmHolatiMatnRang = QIZIL_MATN;
            rasmYoqSoni++;
        } else if (FAST_MODE) {
            rasmHolatiMatn = "◻ Bor (tekshirilmadi)"; rasmHolatiRang = null; rasmHolatiMatnRang = null;
        } else if (rasmIshlaydi) {
            rasmHolatiMatn = "✅ Ishlaydi"; rasmHolatiRang = YASHIL; rasmHolatiMatnRang = YASHIL_MATN;
        } else {
            rasmHolatiMatn = "⚠️ Buzilgan havola"; rasmHolatiRang = SARIQ; rasmHolatiMatnRang = SARIQ_MATN;
            rasmBuzuq++;
        }

        const umumiyOk = nomiOk && rasmBor && (FAST_MODE || rasmIshlaydi);
        if (umumiyOk) toliq++;
        if (!nomiOk) nomiYoq++;

        const row = ws.addRow({
            id: p.id,
            nomi: nomi || "(nomi yo'q)",
            kategoriya: kategoriya || "(kategoriyasiz)",
            narxDona: p.pricePiece || 0,
            narxKarobka: p.priceBox || 0,
            stock: p.stock || 0,
            nomiHolati: nomiOk ? "✅ Bor" : "❌ Yo'q",
            rasmHolati: rasmHolatiMatn,
            rasmUrl: rasmBor ? p.image : "",
            umumiy: umumiyOk ? "✅ To'liq" : "⚠️ Tekshirish kerak",
        });

        if (rasmBor) {
            const cell = row.getCell("rasmUrl");
            cell.value = { text: p.image, hyperlink: p.image };
            cell.font = { color: { argb: "FF0563C1" }, underline: true };
        }

        const nomiCell = row.getCell("nomiHolati");
        nomiCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: nomiOk ? YASHIL : QIZIL } };
        nomiCell.font = { color: { argb: nomiOk ? YASHIL_MATN : QIZIL_MATN }, bold: true };

        const rasmCell = row.getCell("rasmHolati");
        if (rasmHolatiRang) {
            rasmCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rasmHolatiRang } };
            rasmCell.font = { color: { argb: rasmHolatiMatnRang }, bold: true };
        }

        const umumiyCell = row.getCell("umumiy");
        umumiyCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: umumiyOk ? YASHIL : SARIQ } };
        umumiyCell.font = { color: { argb: umumiyOk ? YASHIL_MATN : SARIQ_MATN }, bold: true };
    });

    // ---------- Xulosa varag'i ----------
    const xs = wb.addWorksheet("Xulosa");
    xs.columns = [{ key: "label", width: 32 }, { key: "value", width: 14 }];
    const xulosaSatrlari = [
        ["Jami mahsulotlar", mahsulotlar.length],
        ["Nomi yo'q mahsulotlar", nomiYoq],
        ["Rasmi umuman yo'q", rasmYoqSoni],
        [FAST_MODE ? "Rasm havolasi tekshirilmadi (tezkor rejim)" : "Rasm havolasi buzilgan", FAST_MODE ? "—" : rasmBuzuq],
        ["To'liq va tayyor mahsulotlar", toliq],
    ];
    xulosaSatrlari.forEach((s) => xs.addRow(s));
    xs.getColumn(1).font = { bold: true };
    xs.getRow(1).font = { bold: true, size: 13 };

    const faylNomi = `mahsulotlar-tekshiruvi-${new Date().toISOString().slice(0, 10)}.xlsx`;
    await wb.xlsx.writeFile(faylNomi);

    console.log("📊 XULOSA:");
    xulosaSatrlari.forEach(([label, value]) => console.log(`   ${label}: ${value}`));
    console.log(`\n✅ Tayyor! Fayl: ${faylNomi}`);
    process.exit(0);
}

main().catch((e) => { console.error("❌ Xato:", e); process.exit(1); });