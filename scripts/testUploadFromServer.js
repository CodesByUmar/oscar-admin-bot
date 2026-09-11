// FAQAT TEKSHIRISH — Railway serverining o'zidan Catbox.moe'ga kichik
// test rasm yuklab ko'radi, natijani to'g'ridan-to'g'ri konsolga chiqaradi.
//
// Ishga tushirish (Railway Console'da, shu servis muhitida):
//   node scripts/testUploadFromServer.js
const axios = require('axios');
const FormData = require('form-data');

const TINY_PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

async function main() {
    console.log('Server IP (Railway):');
    try {
        const ipRes = await axios.get('https://api.ipify.org?format=json', { timeout: 10000 });
        console.log('  ', ipRes.data.ip);
    } catch (e) { console.log('   (IP aniqlanmadi:', e.message, ')'); }

    console.log('\nCatbox.moe sinovi:');
    try {
        const buffer = Buffer.from(TINY_PNG_BASE64, 'base64');
        const form = new FormData();
        form.append('reqtype', 'fileupload');
        form.append('fileToUpload', buffer, { filename: 'test.png', contentType: 'image/png' });
        const res = await axios.post('https://catbox.moe/user/api.php', form, {
            headers: { ...form.getHeaders() },
            timeout: 30000,
        });
        console.log('   HTTP', res.status, '-', JSON.stringify(res.data).slice(0, 300));
    } catch (error) {
        if (error.response) {
            console.log('   ❌ HTTP', error.response.status, '-', JSON.stringify(error.response.data)?.slice(0, 300));
        } else {
            console.log('   ❌', error.message);
        }
    }
    process.exit(0);
}

main();
