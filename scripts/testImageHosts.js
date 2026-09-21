// FAQAT TEKSHIRISH — Railway serveridan hozir qaysi bepul rasm
// hostingi ishlayotganini aniqlaydi: Catbox.moe va 0x0.st.
// Kichik test rasm (1x1 PNG) yuklanadi.
//
// Ishga tushirish (Railway Console'da, shu servis muhitida):
//   node scripts/testImageHosts.js
const axios = require('axios');
const FormData = require('form-data');

// 1x1 shaffof PNG (67 bayt) — haqiqiy, tekshiruvchi xizmatlar rad etmaydi.
const TEST_PNG = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
    'base64'
);

async function testCatbox() {
    console.log('\n===== Catbox.moe =====');
    try {
        const form = new FormData();
        form.append('reqtype', 'fileupload');
        form.append('fileToUpload', TEST_PNG, { filename: 'test.png', contentType: 'image/png' });
        const res = await axios.post('https://catbox.moe/user/api.php', form, {
            headers: { ...form.getHeaders() },
            timeout: 20000,
        });
        console.log('✅ MUVAFFAQIYATLI:', res.data);
    } catch (error) {
        const detail = error.response ? `HTTP ${error.response.status} ${JSON.stringify(error.response.data)?.slice(0, 200)}` : error.message;
        console.log('❌ Xato:', detail);
    }
}

async function test0x0() {
    console.log('\n===== 0x0.st =====');
    try {
        const form = new FormData();
        form.append('file', TEST_PNG, { filename: 'test.png', contentType: 'image/png' });
        const res = await axios.post('https://0x0.st', form, {
            headers: { ...form.getHeaders(), 'User-Agent': 'OscarBot/1.0 (+https://oscar-admin-bot-production-8d47.up.railway.app)' },
            timeout: 20000,
        });
        console.log('✅ MUVAFFAQIYATLI:', typeof res.data === 'string' ? res.data.trim() : res.data);
    } catch (error) {
        const detail = error.response ? `HTTP ${error.response.status} ${JSON.stringify(error.response.data)?.slice(0, 200)}` : error.message;
        console.log('❌ Xato:', detail);
    }
}

async function main() {
    await testCatbox();
    await test0x0();
    console.log('\nTayyor.');
    process.exit(0);
}

main();
