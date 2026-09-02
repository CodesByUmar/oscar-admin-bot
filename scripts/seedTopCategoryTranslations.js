// Bir martalik skript: hozircha RU/EN'i yo'q top-kategoriyalarni
// `categoryTranslations` kolleksiyasiga to'ldiradi (qurilish-bo'yoq
// bozorida keng qo'llaniladigan standart ruscha nomlar). Subkategoriyalar
// (64 tasi) allaqachon eski importdan RU/EN'ga ega, shuning uchun bu
// yerga kiritilmagan.
//
// Ishga tushirish (Railway Console'da, shu servis muhitida):
//   node scripts/seedTopCategoryTranslations.js
const { db, admin } = require('../config/firebase');

function keyToDocId(key) {
    return encodeURIComponent(key).replace(/%/g, '_');
}

const TRANSLATIONS = {
    'Suyultirgich': { ru: 'Разбавитель', en: 'Thinner' },
    "Emal (alkidli)": { ru: 'Эмаль (алкидная)', en: 'Alkyd Enamel' },
    "Fuga (chok bo'yoq)": { ru: 'Фуга (затирка для швов)', en: 'Tile Grout' },
    'Boshqa asboblar': { ru: 'Другие инструменты', en: 'Other Tools' },
    'Klin / zajim': { ru: 'Клин / зажим', en: 'Wedge / Clamp' },
    'Folga skotch': { ru: 'Фольгированный скотч', en: 'Foil Tape' },
    'SACA skotch (yashil)': { ru: 'Скотч SACA (зелёный)', en: 'SACA Tape (Green)' },
    'WASHI skotch': { ru: 'Малярный скотч WASHI', en: 'Washi Tape' },
    'Choklar uchun lenta': { ru: 'Лента для швов', en: 'Joint Tape' },
    'Maxsus yelimlar': { ru: 'Специальные клеи', en: 'Special Adhesives' },
    "Boshqa (turli mahsulotlar)": { ru: 'Другое (разные товары)', en: 'Other (Miscellaneous)' },
    'Suyuq mixlar': { ru: 'Жидкие гвозди', en: 'Liquid Nails' },
    'Valik': { ru: 'Валик', en: 'Roller' },
    "Bo'yoqchi cho'tkasi": { ru: 'Малярная кисть', en: 'Paint Brush' },
    "Andava (qum qog'oz)": { ru: 'Наждачная бумага', en: 'Sandpaper' },
    'Aerozol bo\'yoq': { ru: 'Аэрозольная краска', en: 'Spray Paint' },
    'Devor qog\'ozi yelimi': { ru: 'Клей для обоев', en: 'Wallpaper Glue' },
    'SACA M3 skotch (qizil)': { ru: 'Скотч SACA M3 (красный)', en: 'SACA M3 Tape (Red)' },
    'Avtomobil skotchi': { ru: 'Автомобильный скотч', en: 'Automotive Tape' },
    'Gidroizolyatsiya': { ru: 'Гидроизоляция', en: 'Waterproofing' },
    'PVX burchak': { ru: 'ПВХ уголок', en: 'PVC Corner' },
    'Nitroemal': { ru: 'Нитроэмаль', en: 'Nitro Enamel' },
    'Shisha parda (Steklohost)': { ru: 'Стеклохолст', en: 'Fiberglass Mesh' },
    'Morilka': { ru: 'Морилка', en: 'Wood Stain' },
    "Bo'yoq lotoki": { ru: 'Малярный лоток', en: 'Paint Tray' },
    "Sim to'r (vytyajka)": { ru: 'Сетка для вытяжки', en: 'Extractor Mesh' },
    'Dyubel ushlagich': { ru: 'Держатель дюбелей', en: 'Dowel Holder' },
    'Emal (akril / suvli)': { ru: 'Эмаль (акриловая / водная)', en: 'Acrylic/Water-based Enamel' },
    'Lak (umumiy)': { ru: 'Лак', en: 'Varnish' },
    'Shpaklyovka': { ru: 'Шпаклёвка', en: 'Putty' },
};

async function seed() {
    if (!db) {
        console.error('❌ DB ulanmagan (Firebase config topilmadi).');
        process.exit(1);
    }
    const entries = Object.entries(TRANSLATIONS);
    let written = 0;
    for (const [key, tr] of entries) {
        const docId = keyToDocId(key);
        await db.collection('categoryTranslations').doc(docId).set({
            key,
            type: 'top',
            ru: tr.ru,
            en: tr.en,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
        written++;
        console.log(`✅ ${key} -> ${tr.ru}`);
    }
    console.log(`\nTayyor: ${written}/${entries.length} ta top-kategoriya tarjimasi yozildi.`);
    process.exit(0);
}

seed().catch((err) => {
    console.error('❌ Xato:', err);
    process.exit(1);
});
