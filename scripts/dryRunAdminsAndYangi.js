// FAQAT KO'RISH (o'chirmaydi) —
//  1) Hozirgi barcha adminlar (ADMIN_IDS + bot_admins), har biri uchun
//     Telegram username/ism (agar telegram_users'da bo'lsa) va manba
//     (Railway ADMIN_IDS yoki Firestore bot_admins) ko'rsatiladi —
//     "Oyatillo"ni to'g'ri ID bilan topish uchun.
//  2) "Yangi" nomli topCategory/category/product'larni qidiradi.
//
// Ishga tushirish (Railway Console'da, shu servis muhitida):
//   node scripts/dryRunAdminsAndYangi.js
const { db } = require('../config/firebase');

function getStr(val, fallback = '') {
    if (val === null || val === undefined) return fallback;
    if (typeof val === 'string') return val;
    if (typeof val === 'object') return val.uz || val.ru || val.en || fallback;
    return String(val);
}

async function main() {
    console.log('===== 1) HOZIRGI ADMINLAR =====');
    const adminIds = (process.env.ADMIN_IDS || '').split(',').map((s) => s.trim()).filter(Boolean);
    const superAdminIdsRaw = process.env.SUPER_ADMIN_IDS;
    const superAdminIds = superAdminIdsRaw ? superAdminIdsRaw.split(',').map((s) => s.trim()).filter(Boolean) : null;
    const botAdminsSnap = await db.collection('bot_admins').get();
    const dynamicAdmins = botAdminsSnap.docs.map((d) => d.id);
    const allIds = Array.from(new Set([...adminIds, ...dynamicAdmins]));

    for (const id of allIds) {
        const source = adminIds.includes(id) && dynamicAdmins.includes(id)
            ? 'ADMIN_IDS + bot_admins'
            : adminIds.includes(id) ? 'ADMIN_IDS (Railway env)' : 'bot_admins (Firestore, botning o\'zidan qo\'shilgan)';
        let label = '';
        try {
            const userDoc = await db.collection('telegram_users').doc(String(id)).get();
            if (userDoc.exists) {
                const u = userDoc.data();
                label = u.username ? `@${u.username}` : [u.first_name, u.last_name].filter(Boolean).join(' ');
            }
        } catch (e) { /* davom etadi */ }
        if (!label) {
            try {
                const vipDoc = await db.collection('VIP_Clients').doc(String(id)).get();
                if (vipDoc.exists && vipDoc.data().login) label = `VIP login: ${vipDoc.data().login}`;
            } catch (e) { /* davom etadi */ }
        }
        const superFlag = superAdminIds ? (superAdminIds.includes(id) ? '  [SUPER ADMIN]' : '  [oddiy admin]') : '  [super admin — SUPER_ADMIN_IDS sozlanmagan, hammasi super]';
        console.log(`  ID: ${id}${label ? '  (' + label + ')' : '  (nomi topilmadi)'}  — manba: ${source}${superFlag}`);
    }

    console.log('\n===== 2) "Yangi" nomli yozuvlar =====');
    const topSnap = await db.collection('topCategories').get();
    const topHits = topSnap.docs.filter((d) => getStr(d.data().name).trim().toLowerCase() === 'yangi');
    console.log(`\n-- topCategories --`);
    if (topHits.length === 0) console.log('  (topilmadi)');
    topHits.forEach((d) => console.log(`  [topCategories/${d.id}] "${getStr(d.data().name)}"`));

    const catSnap = await db.collection('categories').get();
    const catHits = catSnap.docs.filter((d) => getStr(d.data().name).trim().toLowerCase() === 'yangi');
    console.log(`\n-- categories (subkategoriya) --`);
    if (catHits.length === 0) console.log('  (topilmadi)');
    catHits.forEach((d) => console.log(`  [categories/${d.id}] "${getStr(d.data().name)}" | topCategory: "${getStr(d.data().topCategory)}"`));

    const prodSnap = await db.collection('products').get();
    const prodHits = prodSnap.docs.filter((d) => getStr(d.data().name).trim().toLowerCase() === 'yangi');
    console.log(`\n-- products --`);
    if (prodHits.length === 0) console.log('  (topilmadi)');
    prodHits.forEach((d) => console.log(`  [products/${d.id}] "${getStr(d.data().name)}" | kategoriya: "${getStr(d.data().category)}" | topCategory: "${getStr(d.data().topCategory)}"`));

    console.log('\nTayyor. Bu FAQAT ko\'rsatish edi — hech narsa o\'zgartirilmadi.');
    process.exit(0);
}

main().catch((err) => {
    console.error('Xato:', err);
    process.exit(1);
});
