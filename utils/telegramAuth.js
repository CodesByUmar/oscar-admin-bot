const crypto = require('crypto');

// Telegram Mini App'ning window.Telegram.WebApp.initData qatorini rasman
// hujjatlashtirilgan algoritm bo'yicha tekshiradi:
// https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
// initDataUnsafe'dan farqli o'laroq, initData Telegram tomonidan botning
// o'z tokeni bilan imzolangan — shuning uchun mijoz uni soxtalashtira olmaydi.
function verifyTelegramInitData(initData, botToken, maxAgeSeconds = 86400) {
    if (typeof initData !== 'string' || !initData || !botToken) return null;

    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) return null;
    params.delete('hash');

    const dataCheckString = [...params.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');

    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
    const computedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

    const hashBuf = Buffer.from(hash, 'hex');
    const computedBuf = Buffer.from(computedHash, 'hex');
    if (hashBuf.length !== computedBuf.length || !crypto.timingSafeEqual(hashBuf, computedBuf)) {
        return null;
    }

    const authDate = parseInt(params.get('auth_date'), 10);
    if (isNaN(authDate) || (Date.now() / 1000 - authDate) > maxAgeSeconds) return null;

    const userJson = params.get('user');
    if (!userJson) return null;
    try {
        return JSON.parse(userJson);
    } catch {
        return null;
    }
}

module.exports = { verifyTelegramInitData };
