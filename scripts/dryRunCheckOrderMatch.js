// FAQAT KO'RISH (o'chirmaydi) — berilgan telegramChatId uchun oxirgi
// buyurtmalarni va ularning paymentMethod/receiptSubmitted qiymatlarini
// ko'rsatadi — chek nega mos buyurtma topolmayotganini aniqlash uchun.
//
// Ishga tushirish (Railway Console'da, shu servis muhitida):
//   node scripts/dryRunCheckOrderMatch.js <chatId>
const { db } = require('../config/firebase');

function getStr(val, fallback = '') {
    if (val === null || val === undefined) return fallback;
    if (typeof val === 'string') return val;
    if (typeof val === 'object') return val.uz || val.ru || val.en || fallback;
    return String(val);
}

async function main() {
    const chatId = process.argv[2] || '6600096842';
    console.log(`Qidirilayotgan telegramChatId: "${chatId}" (turi qidiruvda ishlatilgan: string)`);

    // shop-bot xuddi shu turdagi (odatda raqamli, lekin Telegram msg.chat.id
    // number bo'ladi) qiymat bilan qidiradi — ikkala turda ham sinaymiz.
    for (const variant of [chatId, Number(chatId)]) {
        const snap = await db.collection('orders')
            .where('telegramChatId', '==', variant)
            .orderBy('createdAt', 'desc')
            .limit(10)
            .get();
        console.log(`\n===== telegramChatId === ${JSON.stringify(variant)} (${typeof variant}) — ${snap.size} ta topildi =====`);
        snap.docs.forEach((d) => {
            const o = d.data();
            console.log(`  [${d.id}] paymentMethod: ${JSON.stringify(o.paymentMethod)} | receiptSubmitted: ${JSON.stringify(o.receiptSubmitted)} | status: ${o.status} | telegramChatId: ${JSON.stringify(o.telegramChatId)} (${typeof o.telegramChatId})`);
        });
    }

    console.log('\nTayyor.');
    process.exit(0);
}

main().catch((err) => {
    console.error('Xato:', err);
    process.exit(1);
});
