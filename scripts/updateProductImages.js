// Bir martalik skript: aniqlangan mahsulotlarning `image` maydonini yangi
// (ImgBB'ga yuklangan, haqiqiy mahsulot fotosi bo'lgan) havolalar bilan
// almashtiradi. Hujjat ID'lari nom bo'yicha aniq moslashtirib topilgan
// (Excel'dagi raqamlar bazadagi ID bilan har doim ham bir xil emas edi).
//
// Ishga tushirish (Railway Console'da, shu servis muhitida):
//   node scripts/updateProductImages.js
const { db } = require('../config/firebase');

const IMAGES = {
    '210': 'https://i.ibb.co/WNkfW0fz/210-229-duafix-fuga-generic.png',
    '211': 'https://i.ibb.co/WNkfW0fz/210-229-duafix-fuga-generic.png',
    '212': 'https://i.ibb.co/WNkfW0fz/210-229-duafix-fuga-generic.png',
    '213': 'https://i.ibb.co/WNkfW0fz/210-229-duafix-fuga-generic.png',
    '214': 'https://i.ibb.co/WNkfW0fz/210-229-duafix-fuga-generic.png',
    '215': 'https://i.ibb.co/WNkfW0fz/210-229-duafix-fuga-generic.png',
    '216': 'https://i.ibb.co/WNkfW0fz/210-229-duafix-fuga-generic.png',
    '217': 'https://i.ibb.co/WNkfW0fz/210-229-duafix-fuga-generic.png',
    '218': 'https://i.ibb.co/WNkfW0fz/210-229-duafix-fuga-generic.png',
    '219': 'https://i.ibb.co/WNkfW0fz/210-229-duafix-fuga-generic.png',
    '220': 'https://i.ibb.co/WNkfW0fz/210-229-duafix-fuga-generic.png',
    '221': 'https://i.ibb.co/WNkfW0fz/210-229-duafix-fuga-generic.png',
    '222': 'https://i.ibb.co/WNkfW0fz/210-229-duafix-fuga-generic.png',
    '223': 'https://i.ibb.co/WNkfW0fz/210-229-duafix-fuga-generic.png',
    '224': 'https://i.ibb.co/WNkfW0fz/210-229-duafix-fuga-generic.png',
    '225': 'https://i.ibb.co/WNkfW0fz/210-229-duafix-fuga-generic.png',
    '226': 'https://i.ibb.co/WNkfW0fz/210-229-duafix-fuga-generic.png',
    '227': 'https://i.ibb.co/WNkfW0fz/210-229-duafix-fuga-generic.png',
    '228': 'https://i.ibb.co/WNkfW0fz/210-229-duafix-fuga-generic.png',
    '229': 'https://i.ibb.co/WNkfW0fz/210-229-duafix-fuga-generic.png',
    '232': 'https://i.ibb.co/tPHxkqKs/232-valik-panjara.png',
    '753': 'https://i.ibb.co/tPHxkqKs/232-valik-panjara.png',
    '323': 'https://i.ibb.co/gbTKshyN/323-aerozol-oq.png',
    '325': 'https://i.ibb.co/6RcRfkws/325-aerozol-qora.png',
    '332': 'https://i.ibb.co/490PpxR/332-wd40.png',
    '378': 'https://i.ibb.co/S7rxnLvj/339-emal-pf115-20kg.png',
    '429': 'https://i.ibb.co/8gKhDs8x/390-391-steklohost-yelim.png',
    '430': 'https://i.ibb.co/8gKhDs8x/390-391-steklohost-yelim.png',
    '433': 'https://i.ibb.co/yB6kt6ZZ/394-408-duafix-aerozol-generic.png',
    '434': 'https://i.ibb.co/yB6kt6ZZ/394-408-duafix-aerozol-generic.png',
    '435': 'https://i.ibb.co/yB6kt6ZZ/394-408-duafix-aerozol-generic.png',
    '436': 'https://i.ibb.co/yB6kt6ZZ/394-408-duafix-aerozol-generic.png',
    '437': 'https://i.ibb.co/yB6kt6ZZ/394-408-duafix-aerozol-generic.png',
    '438': 'https://i.ibb.co/yB6kt6ZZ/394-408-duafix-aerozol-generic.png',
    '439': 'https://i.ibb.co/yB6kt6ZZ/394-408-duafix-aerozol-generic.png',
    '440': 'https://i.ibb.co/yB6kt6ZZ/394-408-duafix-aerozol-generic.png',
    '441': 'https://i.ibb.co/yB6kt6ZZ/394-408-duafix-aerozol-generic.png',
    '442': 'https://i.ibb.co/yB6kt6ZZ/394-408-duafix-aerozol-generic.png',
    '443': 'https://i.ibb.co/yB6kt6ZZ/394-408-duafix-aerozol-generic.png',
    '444': 'https://i.ibb.co/yB6kt6ZZ/394-408-duafix-aerozol-generic.png',
    '445': 'https://i.ibb.co/yB6kt6ZZ/394-408-duafix-aerozol-generic.png',
    '446': 'https://i.ibb.co/yB6kt6ZZ/394-408-duafix-aerozol-generic.png',
    '447': 'https://i.ibb.co/yB6kt6ZZ/394-408-duafix-aerozol-generic.png',
    '80': 'https://i.ibb.co/p6KGMCLP/80-olifa-bordo.jpg',
    '120': 'https://i.ibb.co/DDFGqRFC/120-123-emulsiya-universal.png',
    '121': 'https://i.ibb.co/DDFGqRFC/120-123-emulsiya-universal.png',
    '122': 'https://i.ibb.co/DDFGqRFC/120-123-emulsiya-universal.png',
    '123': 'https://i.ibb.co/DDFGqRFC/120-123-emulsiya-universal.png',
};

async function run() {
    if (!db) {
        console.error('❌ DB ulanmagan.');
        process.exit(1);
    }
    const entries = Object.entries(IMAGES);
    let updated = 0, missing = 0;
    for (const [id, url] of entries) {
        const ref = db.collection('products').doc(id);
        const snap = await ref.get();
        if (!snap.exists) {
            console.log(`⚠️  ${id} topilmadi, o'tkazib yuborildi.`);
            missing++;
            continue;
        }
        await ref.update({ image: url });
        console.log(`✅ ${id} (${(snap.data().name && snap.data().name.ru) || ''}) -> ${url}`);
        updated++;
    }
    console.log(`\nTayyor: ${updated} yangilandi, ${missing} topilmadi (jami ${entries.length}).`);
    process.exit(0);
}

run().catch((err) => {
    console.error('❌ Xato:', err);
    process.exit(1);
});
