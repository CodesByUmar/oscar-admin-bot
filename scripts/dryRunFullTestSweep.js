// FAQAT KO'RISH (o'chirmaydi) — butun tizim bo'ylab "test" ga o'xshagan
// yozuvlarni qidiradi: products, categories, topCategories, bot_admins,
// VIP_Clients, banners, orders (oscar-shop-bot bilan bir xil Firestore).
//
// Ishga tushirish (Railway Console'da, shu servis muhitida):
//   node scripts/dryRunFullTestSweep.js
const { db } = require('../config/firebase');

function getStr(val, fallback = '') {
    if (val === null || val === undefined) return fallback;
    if (typeof val === 'string') return val;
    if (typeof val === 'object') return val.uz || val.ru || val.en || fallback;
    return String(val);
}

function looksLikeTest(str) {
    const low = (str || '').toLowerCase();
    return low.includes('test') || /^t\d*$/.test(low.trim()) || low.trim() === '1';
}

async function scanNameCollection(name) {
    const snap = await db.collection(name).get();
    const hits = snap.docs.filter((d) => looksLikeTest(getStr(d.data().name)));
    console.log(`\n===== "${name}" (${snap.size} ta jami) =====`);
    if (hits.length === 0) console.log('  (test topilmadi)');
    hits.forEach((d) => console.log(`  [${d.id}] "${getStr(d.data().name)}"`));
}

async function main() {
    await scanNameCollection('products');
    await scanNameCollection('categories');
    await scanNameCollection('topCategories');

    console.log('\n===== "bot_admins" (dinamik adminlar) =====');
    const adminsSnap = await db.collection('bot_admins').get();
    if (adminsSnap.empty) console.log('  (bo\'sh)');
    for (const d of adminsSnap.docs) {
        console.log(`  ID: ${d.id}  addedBy: ${d.data().addedBy || '?'}  addedAt: ${d.data().addedAt || '?'}`);
    }

    console.log('\n===== "VIP_Clients" =====');
    const vipSnap = await db.collection('VIP_Clients').get();
    if (vipSnap.empty) console.log('  (bo\'sh)');
    vipSnap.docs.forEach((d) => {
        const v = d.data();
        const flag = looksLikeTest(v.login) ? '  <-- test?' : '';
        console.log(`  ID: ${d.id}  login: ${v.login || '?'}${flag}`);
    });

    console.log('\n===== "banners" =====');
    const bannersSnap = await db.collection('banners').get();
    if (bannersSnap.empty) console.log('  (bo\'sh)');
    bannersSnap.docs.forEach((d) => console.log(`  [${d.id}] image: ${(d.data().image || '').slice(0, 60)}`));

    console.log('\n===== "orders" (oxirgi 10 ta, test-ga o\'xshaganlar) =====');
    const ordersSnap = await db.collection('orders').orderBy('createdAt', 'desc').limit(30).get();
    let orderHits = 0;
    ordersSnap.docs.forEach((d) => {
        const o = d.data();
        const nameStr = getStr(o.customerName) + ' ' + getStr(o.username);
        const itemsStr = (o.items || []).map((it) => getStr(it.name)).join(' ');
        if (looksLikeTest(nameStr) || looksLikeTest(itemsStr)) {
            orderHits++;
            console.log(`  [${d.id}] mijoz: "${getStr(o.customerName) || getStr(o.username)}" | mahsulotlar: ${itemsStr || '(yo\'q)'} | status: ${o.status} | to'lov: ${o.paymentMethod}`);
        }
    });
    if (orderHits === 0) console.log('  (test topilmadi, oxirgi 30 tadan)');

    console.log('\nTayyor. Bu FAQAT ko\'rsatish edi — hech narsa o\'zgartirilmadi.');
    process.exit(0);
}

main().catch((err) => {
    console.error('Xato:', err);
    process.exit(1);
});
