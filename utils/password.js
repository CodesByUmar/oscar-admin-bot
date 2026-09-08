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

// VIP parolini "tiklash" (reset) o'rniga — foydalanuvchining o'zi
// so'raganda — admin bevosita botda ko'ra olishi kerak (mahsulot talabi).
// Yuqoridagi hashPassword() BIR TOMONLAMA (qaytarib bo'lmaydi), shuning
// uchun shu maqsad uchun alohida, QAYTARILADIGAN (AES-256-GCM) shifrlash
// qo'shildi. Ikkalasi bir vaqtda saqlanadi: `password` (hash — kirishni
// tekshirish uchun, hech qachon ochilmaydi) va `passwordEnc` (shifrlangan
// — faqat admin botda ko'rsatish uchun, VIP_ENC_KEY bilan ochiladi).
//
// MUHIM (xavfsizlik kelishuvi): bu parolni QAYTA TIKLASH mumkin qiladi,
// odatiy "faqat hash" yondashuvidan farqli o'laroq. Bu ataylab shunday —
// foydalanuvchi (loyiha egasi) buni bila turib tanlagan, chunki VIP
// parolini "unutdim" holatida reset qilish o'rniga adminning o'zi
// ko'rsatib qo'yishini xohlagan.
function getEncKey() {
    const raw = process.env.VIP_ENC_KEY;
    if (!raw || raw.length !== 64) {
        throw new Error("VIP_ENC_KEY topilmadi yoki noto'g'ri uzunlikda (64 hex belgi kerak)");
    }
    return Buffer.from(raw, 'hex');
}

// Format: "iv:authTag:ciphertext" (hammasi hex).
function encryptPassword(password) {
    const key = getEncKey();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const ciphertext = Buffer.concat([cipher.update(String(password), 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${ciphertext.toString('hex')}`;
}

function decryptPassword(encrypted) {
    const key = getEncKey();
    const [ivHex, authTagHex, ciphertextHex] = String(encrypted).split(':');
    if (!ivHex || !authTagHex || !ciphertextHex) throw new Error("Noto'g'ri shifrlangan format");
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
    const plain = Buffer.concat([decipher.update(Buffer.from(ciphertextHex, 'hex')), decipher.final()]);
    return plain.toString('utf8');
}

module.exports = { hashPassword, verifyPassword, isHashed, encryptPassword, decryptPassword };
