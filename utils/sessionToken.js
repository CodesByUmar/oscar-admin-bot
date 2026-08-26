const crypto = require('crypto');

// VIP sessiya tokenlari uchun imzo kaliti sifatida admin-botning o'z tokeni
// ishlatiladi — bu allaqachon faqat serverga ma'lum sir, alohida Railway
// o'zgaruvchisi qo'shish shart emas.
const SECRET = process.env.TELEGRAM_BOT_TOKEN || 'oscar-vip-fallback-secret';
const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 kun

function sign(payload) {
    return crypto.createHmac('sha256', SECRET).update(payload).digest('hex');
}

// uid'ga bog'langan, muddati o'tadigan, soxtalashtirib bo'lmaydigan token
// yaratadi. Mijoz uni localStorage'da saqlaydi va keyingi tashriflarda
// /api/vip-check'ga yuboradi — shu orqali serverga ko'rsatadigan yagona
// narsa "men shu uid ekanligimni tasdiqlovchi imzo", uid'ning o'zi emas.
function createSessionToken(uid) {
    const payload = `${uid}:${Date.now() + TOKEN_TTL_MS}`;
    const payloadB64 = Buffer.from(payload, 'utf8').toString('base64url');
    return `${payloadB64}.${sign(payload)}`;
}

// Tokenni tekshiradi va ichidagi uid'ni qaytaradi, yoki noto'g'ri/eskirgan
// bo'lsa null qaytaradi.
function verifySessionToken(token) {
    if (typeof token !== 'string' || !token.includes('.')) return null;
    const [payloadB64, sig] = token.split('.');
    let payload;
    try {
        payload = Buffer.from(payloadB64, 'base64url').toString('utf8');
    } catch {
        return null;
    }
    const expectedSig = sign(payload);
    const sigBuf = Buffer.from(sig || '', 'hex');
    const expectedBuf = Buffer.from(expectedSig, 'hex');
    if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
        return null;
    }
    const [uid, expiryStr] = payload.split(':');
    const expiry = parseInt(expiryStr, 10);
    if (!uid || isNaN(expiry) || Date.now() > expiry) return null;
    return uid;
}

module.exports = { createSessionToken, verifySessionToken };
