// Bir martalik skript: foydalanuvchi "new" papkasiga qo'shgan yangi
// rasmlarni bir nechta mahsulot guruhiga yozadi.
//
// DIQQAT: "Эмаль Нитро ... 20кг" (7 ta rang, id 395-401) BU SKRIPTGA
// KIRITILMADI — ular allaqachon har biri o'ziga xos, rangi ko'rsatilgan
// (БЕЛЫЙ/ЧЁРНЫЙ va h.k.) 20кг idish rasmiga ega, "new" papkadagi umumiy
// 0.8кг baklajka rasmi bilan almashtirish aksincha sifatni pasaytirar edi.
// Foydalanuvchiga alohida xabar berildi, tasdiqlasa alohida skript bilan
// bajariladi.
//
// Xavfsizlik: har bir yozishdan oldin mahsulot nomi solishtiriladi.
//
// Ishga tushirish (Railway Console'da, shu servis muhitida):
//   node scripts/updateBatch3.js
const { db } = require('../config/firebase');

const ZAZHIM = 'https://i.ibb.co/S7WWNhRf/zazhim-upload.jpg';
const RAMKI = 'https://i.ibb.co/Vc9gzQpT/image.jpg';
const VALIK22 = 'https://i.ibb.co/dwhj1w71/22x5.jpg';
const SKOTCH = 'https://i.ibb.co/VcK5QZG6/image.jpg';
const SMYVKA = 'https://i.ibb.co/bMwxkT9w/image.jpg';
const DUBEL = 'https://i.ibb.co/BKF4tCwm/image.jpg';
const MORILKA = 'https://i.ibb.co/xtWwcwxS/image.png';
const SODA = 'https://i.ibb.co/gbTCvt5L/image.png';
const LENTA_2X10 = 'https://i.ibb.co/WNwTN8vW/2-10.png';
const LENTA_4X10 = 'https://i.ibb.co/hRKhHxKM/4-10.png';
const ASOS_A_VN20 = 'https://i.ibb.co/bggwRW67/20.jpg';
const ASOS_A_4VN = 'https://i.ibb.co/chGS3H9N/4.jpg';
const ASOS_A_4FAS = 'https://i.ibb.co/zTvRfkTg/4kg.jpg';
const ASOS_B_20 = 'https://i.ibb.co/d4XFjVYN/20.jpg';

const TARGETS = [
    // Клин/Зажим (bitta rasm)
    { id: '118', expected: 'Клин (Гайка) 1мм', url: ZAZHIM },
    { id: '119', expected: 'Зажим (Болт) 1мм', url: ZAZHIM },
    { id: '492', expected: 'Клин/зажим маленький 1.2мм', url: ZAZHIM },
    { id: '493', expected: 'Клин/зажим маленький 1.4мм', url: ZAZHIM },
    { id: '494', expected: 'Клин/зажим большой 1.5мм', url: ZAZHIM },
    { id: '495', expected: 'Клин/зажим маленький MINI 1.2мм', url: ZAZHIM },
    // Рамки для розеток
    { id: '230', expected: 'Рамки для розеток', url: RAMKI },
    // Валик 22 (х5 / х3)
    { id: '246', expected: 'Валик 22 (набор х 5)', url: VALIK22 },
    { id: '252', expected: 'Валик 22 (набор х 3)', url: VALIK22 },
    { id: '773', expected: 'Валик 22 (набор х 3)', url: VALIK22 },
    // Скотч хозяйственный (22 ta o'lcham)
    { id: '288', expected: 'Скотч хозяйственный 3.6см х 25м', url: SKOTCH },
    { id: '289', expected: 'Скотч хозяйственный 3.6см х 50м', url: SKOTCH },
    { id: '290', expected: 'Скотч хозяйственный 3.6см х 75м', url: SKOTCH },
    { id: '291', expected: 'Скотч хозяйственный 3.6см х 100м', url: SKOTCH },
    { id: '292', expected: 'Скотч хозяйственный 3.6см х 150м', url: SKOTCH },
    { id: '293', expected: 'Скотч хозяйственный 3.6см х 200м', url: SKOTCH },
    { id: '294', expected: 'Скотч хозяйственный 3.6см х 250м', url: SKOTCH },
    { id: '295', expected: 'Скотч хозяйственный 3.6см х 300м', url: SKOTCH },
    { id: '296', expected: 'Скотч хозяйственный 4.5см х 50м', url: SKOTCH },
    { id: '297', expected: 'Скотч хозяйственный 4.5см х 100м', url: SKOTCH },
    { id: '298', expected: 'Скотч хозяйственный 4.5см х 150м', url: SKOTCH },
    { id: '299', expected: 'Скотч хозяйственный 4.5см х 200м', url: SKOTCH },
    { id: '300', expected: 'Скотч хозяйственный 4.5см х 250м', url: SKOTCH },
    { id: '301', expected: 'Скотч хозяйственный 4.5см х 300м', url: SKOTCH },
    { id: '302', expected: 'Скотч хозяйственный 6.0см х 25м', url: SKOTCH },
    { id: '303', expected: 'Скотч хозяйственный 6.0см х 50м', url: SKOTCH },
    { id: '304', expected: 'Скотч хозяйственный 6.0см х 75м', url: SKOTCH },
    { id: '305', expected: 'Скотч хозяйственный 6.0см х 100м', url: SKOTCH },
    { id: '306', expected: 'Скотч хозяйственный 6.0см х 150м', url: SKOTCH },
    { id: '307', expected: 'Скотч хозяйственный 6.0см х 200м', url: SKOTCH },
    { id: '308', expected: 'Скотч хозяйственный 6.0см х 250м', url: SKOTCH },
    { id: '309', expected: 'Скотч хозяйственный 6.0см х 300м', url: SKOTCH },
    // Смывка Асос (eski rasm butunlay boshqa brend edi)
    { id: '330', expected: 'Смывка Асос', url: SMYVKA },
    // Двустронная (xato yozilgan nusxa) тканевая лента — eski rasm butunlay boshqa mahsulot edi
    { id: '369', expected: 'Двустронная тканевая лента 2 х 10', url: LENTA_2X10 },
    { id: '370', expected: 'Двустронная тканевая лента 4 х 10', url: LENTA_4X10 },
    // Морилка (6 rang)
    { id: '477', expected: 'Морилка дуб', url: MORILKA },
    { id: '478', expected: 'Морилка красное дерево', url: MORILKA },
    { id: '479', expected: 'Морилка сосна', url: MORILKA },
    { id: '480', expected: 'Морилка махагон', url: MORILKA },
    { id: '481', expected: 'Морилка орех', url: MORILKA },
    { id: '482', expected: 'Морилка палисандр', url: MORILKA },
    // Каустическая сода (3 o'lcham)
    { id: '487', expected: 'Каустическая сода 150гр', url: SODA },
    { id: '488', expected: 'Каустическая сода 350гр', url: SODA },
    { id: '489', expected: 'Каустическая сода 750гр', url: SODA },
    // Дюбель (8 ta)
    { id: '503', expected: 'Дюбель Держатель 15см', url: DUBEL },
    { id: '504', expected: 'Дюбель Держатель 12.5см', url: DUBEL },
    { id: '505', expected: 'Дюбель Держатель 10см', url: DUBEL },
    { id: '506', expected: 'Дюбель Держатель 8см', url: DUBEL },
    { id: '507', expected: 'Дюбель гвоздь 12.5см (оцинков.)', url: DUBEL },
    { id: '508', expected: 'Дюбель комплект 12.5см (оцинковый мих)', url: DUBEL },
    { id: '509', expected: 'Дюбель гвоздь 15.0см (оцинков.)', url: DUBEL },
    { id: '510', expected: 'Дюбель комплект 15см (оцинковый мих)', url: DUBEL },
    // Эмульсия Асос А/Б (eski rasm butunlay boshqa mahsulot — Silk Touch edi)
    { id: '513', expected: 'Эмульсия Асос А вн. 20кг', url: ASOS_A_VN20 },
    { id: '514', expected: 'Эмульсия Асос А фас. 20кг', url: ASOS_A_VN20 },
    { id: '515', expected: 'Эмульсия Асос А 4 кг внутр', url: ASOS_A_4VN },
    { id: '516', expected: 'Эмульсия Асос А 4 кг фасад', url: ASOS_A_4FAS },
    { id: '517', expected: 'Эмульсия Асос Б 20кг', url: ASOS_B_20 },
    { id: '518', expected: 'Эмульсия Асос Б 4кг', url: ASOS_A_4VN },
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
