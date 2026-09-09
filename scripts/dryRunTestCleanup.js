// FAQAT KO'RISH (o'chirmaydi) — video uchun tozalashdan oldin nima
// o'chirilishi/qolishini ko'rsatadi:
//   1) Nomida "test" so'zi bor kategoriya va mahsulotlar (UZ/RU/EN, katta-kichik harf farqisiz)
//   2) Hozirgi barcha adminlar (ADMIN_IDS + bot_admins), har biri Telegram username/ism bilan
//
// Ishga tushirish (Railway Console'da, shu servis muhitida):
//   node scripts/dryRunTestCleanup.js
const { db } = require('../config/firebase');

function getStr(val, fallback = '') {
    if (val === null || val === undefined) return fallback;
    if (typeof val === 'string') return val;
    if (typeof val === 'object') return val.uz || val.ru || val.en || fallback;
    return String(val);
}

function allNameVariants(val) {
    if (val === null || val === undefined) return [];
    if (typeof val === 'string') return [val];
    if (typeof val === 'object') return [val.uz, val.ru, val.en].filter(Boolean);
    return [];
}

function looksLikeTest(nameField) {
    return allNameVariants(nameField).some((n) => n.toLowerCase().includes('test'));
}

async function main() {
    console.log('===== 1) "test" nomli KATEGORIYALAR =====');
    const catsSnap = await db.collection('categories').get();
    let catCount = 0;
    catsSnap.docs.forEach((d) => {
        const data = d.data();
        if (looksLikeTest(data.name)) {
            catCount++;
            console.log(`  [${d.id}] ${getStr(data.name)}`);
        }
    });
    if (catCount === 0) console.log('  (topilmadi)');

    console.log('\n===== 2) "test" nomli MAHSULOTLAR =====');
    const prodSnap = await db.collection('products').get();
    let prodCount = 0;
    prodSnap.docs.forEach((d) => {
        const data = d.data();
        if (looksLikeTest(data.name)) {
            prodCount++;
            console.log(`  [${d.id}] ${getStr(data.name)} | kategoriya: ${getStr(data.category)} | narx: ${data.pricePiece || '-'}`);
        }
    });
    if (prodCount === 0) console.log('  (topilmadi)');

    console.log('\n===== 3) HOZIRGI ADMINLAR =====');
    const adminIds = (process.env.ADMIN_IDS || '').split(',').map((s) => s.trim()).filter(Boolean);
    const botAdminsSnap = await db.collection('bot_admins').get();
    const dynamicAdmins = botAdminsSnap.docs.map((d) => d.id);
    const allIds = Array.from(new Set([...adminIds, ...dynamicAdmins]));

    for (const id of allIds) {
        const source = adminIds.includes(id) && dynamicAdmins.includes(id)
            ? 'ADMIN_IDS + bot_admins'
            : adminIds.includes(id) ? 'ADMIN_IDS (Railway env)' : 'bot_admins (Firestore)';
        let label = '';
        try {
            const userDoc = await db.collection('telegram_users').doc(String(id)).get();
            if (userDoc.exists) {
                const u = userDoc.data();
                label = u.username ? `@${u.username}` : [u.first_name, u.last_name].filter(Boolean).join(' ');
            }
        } catch (e) { /* topilmasa ham davom etadi */ }
        console.log(`  ID: ${id}${label ? '  (' + label + ')' : '  (username topilmadi)'}  — manba: ${source}`);
    }

    console.log('\nTayyor. Bu FAQAT ko\'rsatish edi — hech narsa o\'chirilmadi.');
    process.exit(0);
}

main().catch((err) => {
    console.error('Xato:', err);
    process.exit(1);
});
