// FAQAT TEKSHIRISH — Firebase loyihasida Cloud Storage (bucket) yoqilganmi
// yo'qmi, aniqlaydi. Hech narsa yuklamaydi/o'chirmaydi.
//
// Ishga tushirish (Railway Console'da, shu servis muhitida):
//   node scripts/testFirebaseStorage.js
const { admin } = require('../config/firebase');

async function main() {
    try {
        const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
        const serviceAccount = JSON.parse(serviceAccountJson);
        const bucketName = `${serviceAccount.project_id}.appspot.com`;
        console.log('Loyiha:', serviceAccount.project_id);
        console.log('Sinov qilinayotgan bucket:', bucketName);
        const bucket = admin.storage().bucket(bucketName);
        const [exists] = await bucket.exists();
        console.log('Bucket mavjudmi:', exists);
        if (exists) {
            const testContent = Buffer.from('test');
            const file = bucket.file('_test/ping.txt');
            await file.save(testContent, { contentType: 'text/plain' });
            console.log('✅ Yozish MUVAFFAQIYATLI — Storage ishlaydi.');
            await file.delete();
            console.log('✅ Test fayli tozalandi.');
        } else {
            console.log('❌ Bucket topilmadi — ehtimol Storage hali yoqilmagan.');
        }
    } catch (error) {
        console.error('❌ Xato:', error.message);
    }
    process.exit(0);
}

main();
