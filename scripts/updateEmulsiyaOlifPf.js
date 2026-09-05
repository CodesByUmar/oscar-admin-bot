// Bir martalik skript: bir nechta guruh mahsulotning xato/umumiy rasmini
// to'g'ri rasmga almashtiradi.
//
// 1) "Эмульсия UNIVERSAL" (4/14 кг, внутр/фасад) — hozir "Oscar Interior
//    Ultra Wash" rasmi bilan XATO ko'rsatilgan edi. Endi haqiqiy ВД-111
//    UNIVERSAL idishi: ichki (внутр) va fasad (фасад) uchun alohida rasm.
// 2) "Эмульсия Оскар" 7кг (внр/фасад) — hozir "ASOS Marigold" rasmi bilan
//    XATO ko'rsatilgan edi. 20кг nusxasi (128/129) allaqachon to'g'ri
//    "Oscar Exterior Silk Touch" rasmiga ega — o'sha bilan bir xil qilinadi.
// 3) ПФ-115 oilasi (choco, мокрая серая, мокрая-асфальт va dublikat
//    "Эмаль Оскар чоко 20кг") — asosiy "Эмаль UNIVERSAL ПФ 115" (378)
//    allaqachon to'g'ri ASOS ПФ-115 rasmiga ega — o'sha bilan bir xil
//    qilinadi.
// 4) "Нитро лак 15кг" va "ЛАК ПФ-283 15кг" — hozir ikkalasi ham "Oscar
//    Нитра" (НЦ-132) rasmi bilan baham ko'radi, aniqroq ASOS ПФ-266
//    (половая глянцевая, 20кг lekin idish turi mos) rasmiga almashtiriladi.
// 5) "Олифа (бочка)" va "Олиф BORDO" — ikkinchisi hozir butunlay xato
//    ("Битумлак БТ-5100") rasmga ega edi; endi har biriga o'ziga xos olif
//    rasmi qo'yiladi.
//
// Xavfsizlik: har bir yozishdan oldin mahsulot nomi kutilgan nom bilan
// solishtiriladi, mos kelmasa o'tkazib yuboriladi.
//
// Ishga tushirish (Railway Console'da, shu servis muhitida):
//   node scripts/updateEmulsiyaOlifPf.js
const { db } = require('../config/firebase');

const EMULSA1 = 'https://i.ibb.co/dwkdDDDp/emulsa1.jpg'; // Universal ВД-111, внутренний
const EMULSA2 = 'https://i.ibb.co/RpgvV1cg/emulsa2.jpg'; // Universal Фасад
const OSCAR_EMULSIYA = 'https://i.ibb.co/WpGN1bYp/product-image.jpg'; // Oscar Exterior Silk Touch (128 bilan bir xil)
const PF115 = 'https://i.ibb.co/S7rxnLvj/339-emal-pf115-20kg.png'; // ASOS ПФ-115 (378 bilan bir xil)
const PF266 = 'https://i.ibb.co/KjbxVWWc/pf-226.png'; // ASOS ПФ-266
const OLIF_BOCHKA = 'https://i.ibb.co/9HLYHTtZ/olif-bochka.jpg';
const OLIF_BORDO = 'https://i.ibb.co/R4t499M2/olif-bordo.jpg';

const TARGETS = [
    { id: '120', expected: 'Эмульсия UNIVERSAL 4 кг внутр', url: EMULSA1 },
    { id: '121', expected: 'Эмульсия UNIVERSAL 4 кг фасад', url: EMULSA2 },
    { id: '122', expected: 'Эмульсия UNIVERSAL 14 кг внутр', url: EMULSA1 },
    { id: '123', expected: 'Эмульсия UNIVERSAL 14 кг фасад', url: EMULSA2 },
    { id: '124', expected: 'Эмульсия Оскар внр 7кг', url: OSCAR_EMULSIYA },
    { id: '125', expected: 'Эмульсия Оскар фасад 7кг', url: OSCAR_EMULSIYA },
    { id: '379', expected: 'Эмаль CHOCO ПФ 115 20кг', url: PF115 },
    { id: '391', expected: 'Эмаль Оскар чоко 20кг', url: PF115 },
    { id: '380', expected: 'Эмаль Оскар ПФ 115 Мокрая серая 20кг', url: PF115 },
    { id: '394', expected: 'Эмаль Оскар мокрая-асфальт 20кг', url: PF115 },
    { id: '402', expected: 'Нитро лак 15кг', url: PF266 },
    { id: '403', expected: 'ЛАК ПФ-283 15кг', url: PF266 },
    { id: '77', expected: 'Олифа (бочка)', url: OLIF_BOCHKA },
    { id: '80', expected: 'Олиф BORDO', url: OLIF_BORDO },
];

async function run() {
    if (!db) {
        console.error('❌ DB ulanmagan.');
        process.exit(1);
    }
    let updated = 0;
    for (const { id, expected, url } of TARGETS) {
        const ref = db.collection('products').doc(id);
        const snap = await ref.get();
        if (!snap.exists) {
            console.log(`⚠️  ${id} topilmadi.`);
            continue;
        }
        const actualRu = (snap.data().name && snap.data().name.ru) || '';
        if (actualRu !== expected) {
            console.log(`⚠️  ${id}: nom mos kelmadi (kutilgan "${expected}", bazada "${actualRu}") — o'tkazib yuborildi.`);
            continue;
        }
        await ref.update({ image: url });
        console.log(`✅ ${id} (${actualRu})`);
        updated++;
    }
    console.log(`\nTayyor: ${updated}/${TARGETS.length} yangilandi.`);
    process.exit(0);
}

run().catch((err) => {
    console.error('❌ Xato:', err);
    process.exit(1);
});
