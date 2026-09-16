// Bir martalik skript: dryRunFullTestSweep.js orqali topilgan va
// foydalanuvchi tasdiqlagan test yozuvlarni o'chiradi:
//   - VIP_Clients/test_vip_001
//   - bot_admins/5019943928 (bugun qo'shilgan test admin)
//   - banners/vU3LP20rGrsmkgdM9ivM (image URL bo'yicha topiladi)
//   - orders: mahsulot nomida "test2" bor va status==="pending" bo'lgan
//     BARCHA buyurtmalar (ID'larni qo'lda ko'chirish xato qilish xavfi
//     bor edi, shuning uchun xuddi dry-run bilan bir xil mezon bilan
//     qayta topib o'chiramiz — har birini chop etib boramiz).
//
// Ishga tushirish (Railway Console'da, shu servis muhitida):
//   node scripts/deleteFullTestSweep.js
const { db } = require('../config/firebase');

function getStr(val, fallback = '') {
    if (val === null || val === undefined) return fallback;
    if (typeof val === 'string') return val;
    if (typeof val === 'object') return val.uz || val.ru || val.en || fallback;
    return String(val);
}

async function main() {
    console.log('--- VIP ---');
    const vipRef = db.collection('VIP_Clients').doc('test_vip_001');
    const vipDoc = await vipRef.get();
    if (vipDoc.exists && getStr(vipDoc.data().login) === 'test_vip') {
        await vipRef.delete();
        console.log('🗑 VIP_Clients/test_vip_001 — o\'chirildi.');
    } else {
        console.log('⚠️ VIP_Clients/test_vip_001 kutilganidek topilmadi, o\'tkazib yuborildi.');
    }

    console.log('\n--- Admin ---');
    const adminRef = db.collection('bot_admins').doc('5019943928');
    const adminDoc = await adminRef.get();
    if (adminDoc.exists) {
        await adminRef.delete();
        console.log('🗑 bot_admins/5019943928 — o\'chirildi.');
    } else {
        console.log('⚠️ bot_admins/5019943928 topilmadi, o\'tkazib yuborildi.');
    }

    console.log('\n--- Banner ---');
    const bannersSnap = await db.collection('banners').get();
    const targetBanner = bannersSnap.docs.find((d) => (d.data().image || '').includes('vU3LP20rGrsmkgdM9ivM'));
    if (targetBanner) {
        await targetBanner.ref.delete();
        console.log(`🗑 banners/${targetBanner.id} — o'chirildi.`);
    } else {
        console.log('⚠️ Catbox banner topilmadi, o\'tkazib yuborildi.');
    }

    console.log('\n--- Test buyurtmalar (mahsulot: "test2", status: pending) ---');
    const ordersSnap = await db.collection('orders').where('status', '==', 'pending').get();
    let deletedOrders = 0;
    for (const doc of ordersSnap.docs) {
        const o = doc.data();
        const itemsStr = (o.items || []).map((it) => getStr(it.name)).join(' ').toLowerCase();
        if (itemsStr.includes('test2')) {
            await doc.ref.delete();
            console.log(`🗑 orders/${doc.id} — o'chirildi.`);
            deletedOrders++;
        }
    }
    console.log(`Jami o'chirilgan buyurtmalar: ${deletedOrders}`);

    console.log('\nTayyor.');
    process.exit(0);
}

main().catch((err) => {
    console.error('Xato:', err);
    process.exit(1);
});
