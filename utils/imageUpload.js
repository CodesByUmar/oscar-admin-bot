const axios = require('axios');
const FormData = require('form-data');
const { bot, TOKEN } = require('../config/adminBot');

// ImgBB Railway serverining IP-manzilini butunlay bloklagani aniqlandi
// (doim "You have been forbidden to use this website" xatosi qaytarardi —
// rasmning o'zida muammo yo'q edi). Shuning uchun Catbox.moe'ga o'tkazildi
// — ro'yxatdan o'tish/API key shart emas. Catbox esa vaqti-vaqti bilan
// "412 Invalid uploader" bilan vaqtincha rad etadi (doimiy blok emas —
// qayta urinishda odatda o'tadi), shuning uchun bir necha marta qayta
// urinib ko'ramiz.
const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 2000;

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function uploadToCatbox(buffer) {
    const form = new FormData();
    form.append('reqtype', 'fileupload');
    form.append('fileToUpload', buffer, { filename: 'image.jpg', contentType: 'image/jpeg' });
    const response = await axios.post('https://catbox.moe/user/api.php', form, {
        headers: { ...form.getHeaders() },
        timeout: 30000,
    });
    const url = typeof response.data === 'string' ? response.data.trim() : '';
    if (url.startsWith('https://files.catbox.moe/')) return url;
    throw new Error(`Kutilmagan javob: ${JSON.stringify(response.data)?.slice(0, 300)}`);
}

async function uploadImage(fileId) {
    let buffer;
    try {
        const file = await bot.getFile(fileId);
        const fileUrl = `https://api.telegram.org/file/bot${TOKEN}/${file.file_path}`;
        const response = await axios.get(fileUrl, { responseType: 'arraybuffer', timeout: 20000 });
        buffer = Buffer.from(response.data);
    } catch (error) {
        console.error('Rasm yuklash xato (Telegramdan olishda):', error.message);
        return null;
    }

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
            return await uploadToCatbox(buffer);
        } catch (error) {
            const detail = error.response
                ? `HTTP ${error.response.status} ${JSON.stringify(error.response.data)?.slice(0, 300)}`
                : error.message;
            console.error(`Rasm yuklash xato (Catbox, ${attempt}/${MAX_ATTEMPTS}):`, detail);
            if (attempt < MAX_ATTEMPTS) await sleep(RETRY_DELAY_MS);
        }
    }
    return null;
}

module.exports = { uploadImage };
