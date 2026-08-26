const crypto = require('crypto');

// Node'ning o'zidagi crypto moduli bilan (tashqi paket/native build kerak
// emas — Railway'da qurilish xavfini kamaytiradi). Format: "salt:hash" (hex).
function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(String(password), salt, 64).toString('hex');
    return `${salt}:${hash}`;
}

function isHashed(stored) {
    return typeof stored === 'string' && /^[0-9a-f]{32}:[0-9a-f]{128}$/.test(stored);
}

// Eski (hash'lanmagan) yozuvlar bilan orqaga moslikni saqlash uchun: agar
// saqlangan qiymat hash formatida bo'lmasa, oddiy tenglik bilan solishtiradi
// (bir martalik holat — kirish muvaffaqiyatli bo'lsa, chaqiruvchi tomon
// yozuvni qayta hash'lab yangilashi kerak, pastdagi izohga qarang).
function verifyPassword(password, stored) {
    if (!isHashed(stored)) {
        return stored === password;
    }
    const [salt, hashHex] = stored.split(':');
    const hashBuffer = Buffer.from(hashHex, 'hex');
    const derivedBuffer = crypto.scryptSync(String(password), salt, 64);
    if (hashBuffer.length !== derivedBuffer.length) return false;
    return crypto.timingSafeEqual(hashBuffer, derivedBuffer);
}

module.exports = { hashPassword, verifyPassword, isHashed };
