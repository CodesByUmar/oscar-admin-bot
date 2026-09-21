// FAQAT TEKSHIRISH — Firebase Cloud Storage bucketni ikkala mumkin
// bo'lgan nom bilan (eski appspot.com va yangi firebasestorage.app)
// tekshiradi. Hech narsa yuklamaydi/o'chirmaydi (topilgan holatdagina
// kichik test fayl yozib, darhol o'chiradi).
//
// Ishga tushirish (Railway Console'da, shu servis muhitida):
//   node scripts/testFirebaseStorage2.js
const { admin } = require('../config/firebase');

async function tryBucket(name) {
    console.log(`\nSinov qilinayotgan bucket: ${name}`);
    try {
        const bucket = admin.storage().bucket(name);
        const [exists] = await bucket.exists();
        console.log('  Mavjudmi:', exists);
        if (exists) {
            const file = bucket.file('_test/ping.txt');
            await file.save(Buffer.from('test'), { contentType: 'text/plain' });
            console.log('  ✅ Yozish MUVAFFAQIYATLI.');
            await file.delete();
            console.log('  ✅ Test fayli tozalandi.');
            return true;
        }
    } catch (error) {
        console.log('  ❌ Xato:', error.message);
    }
    return false;
}

async function main() {
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    const serviceAccount = JSON.parse(serviceAccountJson);
    console.log('Loyiha:', serviceAccount.project_id);

    const ok1 = await tryBucket(`${serviceAccount.project_id}.appspot.com`);
    const ok2 = await tryBucket(`${serviceAccount.project_id}.firebasestorage.app`);

    if (!ok1 && !ok2) {
        console.log('\n❌ Hech qaysi nom bilan bucket topilmadi — Storage hali Firebase Console\'da yoqilmagan bo\'lishi mumkin.');
    }
    process.exit(0);
}

main().catch((err) => {
    console.error('Xato:', err);
    process.exit(1);
});
