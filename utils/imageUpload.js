const axios = require('axios');
const FormData = require('form-data');
const { bot, TOKEN } = require('../config/adminBot');

// ImgBB Railway serverining IP-manzilini bloklagani aniqlandi (doim
// "You have been forbidden to use this website" xatosi qaytarardi —
// rasmning o'zida muammo yo'q edi). Shuning uchun Catbox.moe'ga
// o'tkazildi — ro'yxatdan o'tish/API key shart emas, ochiq va bepul.
async function uploadImage(fileId) {
    try {
        const file = await bot.getFile(fileId);
        const fileUrl = `https://api.telegram.org/file/bot${TOKEN}/${file.file_path}`;
        const response = await axios.get(fileUrl, { responseType: 'arraybuffer', timeout: 20000 });
        const buffer = Buffer.from(response.data);

        const form = new FormData();
        form.append('reqtype', 'fileupload');
        form.append('fileToUpload', buffer, { filename: 'image.jpg', contentType: 'image/jpeg' });
        const uploadResponse = await axios.post('https://catbox.moe/user/api.php', form, {
            headers: { ...form.getHeaders() },
            timeout: 30000,
        });

        const url = typeof uploadResponse.data === 'string' ? uploadResponse.data.trim() : '';
        if (url.startsWith('https://files.catbox.moe/')) return url;
        console.error('Rasm yuklash xato: kutilmagan javob:', JSON.stringify(uploadResponse.data)?.slice(0, 300));
        return null;
    } catch (error) {
        if (error.response) {
            console.error(`Rasm yuklash xato: HTTP ${error.response.status}`, JSON.stringify(error.response.data)?.slice(0, 500));
        } else {
            console.error('Rasm yuklash xato:', error.message);
        }
        return null;
    }
}

module.exports = { uploadImage };
