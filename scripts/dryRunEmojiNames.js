// FAQAT KO'RISH (o'chirmaydi/o'zgartirmaydi) — mahsulot nomlarining
// boshida (UZ/RU/EN) qolib ketgan emoji borligini ko'rsatadi.
//
// Ishga tushirish (Railway Console'da, shu servis muhitida):
//   node scripts/dryRunEmojiNames.js
const { db } = require('../config/firebase');

// Boshida turgan emoji + undan keyingi bo'shliq(lar)ni topadi.
const LEADING_EMOJI = /^(\p{Extended_Pictographic}|\p{Emoji_Presentation})\s*/u;

function variants(nameField) {
    if (!nameField) return [];
    if (typeof nameField === 'string') return [['', nameField]];
    if (typeof nameField === 'object') {
        return ['uz', 'ru', 'en'].filter((k) => nameField[k]).map((k) => [k, nameField[k]]);
    }
    return [];
}

async function main() {
    const snapshot = await db.collection('products').get();
    let count = 0;
    snapshot.docs.forEach((d) => {
        const data = d.data();
        const vs = variants(data.name);
        const hits = vs.filter(([, v]) => LEADING_EMOJI.test(v));
        if (hits.length > 0) {
            count++;
            const shown = hits.map(([k, v]) => `${k ? k + ':' : ''}"${v}" -> "${v.replace(LEADING_EMOJI, '')}"`).join('  |  ');
            console.log(`[${d.id}] ${shown}`);
        }
    });
    console.log(`\nJami: ${count} ta mahsulot nomida boshida emoji bor.`);
    console.log('Tayyor. Bu FAQAT ko\'rsatish edi — hech narsa o\'zgartirilmadi.');
    process.exit(0);
}

main().catch((err) => {
    console.error('Xato:', err);
    process.exit(1);
});
