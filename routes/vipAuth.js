const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');
const { verifyPassword, isHashed, hashPassword } = require('../utils/password');
const { createSessionToken, verifySessionToken } = require('../utils/sessionToken');
const { verifyTelegramInitData } = require('../utils/telegramAuth');

// MUHIM: Parol tekshiruvi endi FAQAT shu yerda, server tomonida (Admin SDK
// orqali) bo'ladi. Mini-app (brauzer) endi VIP_Clients collection'ini
// to'g'ridan-to'g'ri o'qimaydi/so'ramaydi — Firestore qoidalari buni
// butunlay taqiqlaydi. Javobda parol maydoni HECH QACHON qaytarilmaydi.
//
// Ilgari /vip-check/:uid mijoz yuborgan uid'ga hech qanday tasdiqlovchi
// dalilsiz ishonar edi — istalgan kishi boshqa birovning Telegram ID'sini
// bilib (yoki topib), o'zini o'sha VIP mijoz sifatida ko'rsata olardi.
// Endi ikkita mustaqil, soxtalashtirib bo'lmaydigan yo'l bor:
//   1) /vip-login orqali parol bilan kirilganda serverda imzolangan token
//      beriladi, keyingi safar /vip-check shu tokenni talab qiladi.
//   2) Telegram ichida ochilganda mijoz initDataUnsafe (tekshirilmagan!)
//      o'rniga initData'ni yuboradi — u Telegram tomonidan bot tokeni bilan
//      imzolangan, shuning uchun mijoz undagi user.id'ni o'zgartira olmaydi.

function toSafeUser(uid, data) {
    return {
        uid,
        login: data.login || '',
        username: data.username || data.login || 'VIP User',
        isVip: true,
    };
}

// Login + parol bilan kirish
router.post('/vip-login', async (req, res) => {
    try {
        const { login, password } = req.body || {};
        if (!login || !password) {
            return res.status(400).json({ error: "Login va parolni kiriting" });
        }

        const snap = await db.collection('VIP_Clients').where('login', '==', String(login).trim()).limit(1).get();
        if (snap.empty) {
            return res.status(401).json({ error: "Login yoki parol noto'g'ri" });
        }

        const vipDoc = snap.docs[0];
        const data = vipDoc.data();

        if (!verifyPassword(password, data.password)) {
            return res.status(401).json({ error: "Login yoki parol noto'g'ri" });
        }

        // Eski (hash'lanmagan) yozuv bo'lsa, muvaffaqiyatli kirishdan so'ng
        // uni sekin-asta hash'langan formatga o'tkazamiz.
        if (!isHashed(data.password)) {
            vipDoc.ref.update({ password: hashPassword(password) }).catch((err) => {
                console.error("VIP parolini hash'lashda xato:", err.message);
            });
        }

        const token = createSessionToken(vipDoc.id);
        return res.json({ user: toSafeUser(vipDoc.id, data), token });
    } catch (error) {
        console.error("vip-login xato:", error);
        return res.status(500).json({ error: "Server xatosi" });
    }
});

// Oldin /vip-login yoki /vip-telegram-check orqali olingan tokenni tekshirib,
// hali ham VIP ekanini tasdiqlaydi (parolsiz, lekin token soxtalashtirib
// bo'lmaydi — uid mijozdan emas, tokenning o'zidan olinadi).
router.post('/vip-check', async (req, res) => {
    try {
        const { token } = req.body || {};
        const uid = verifySessionToken(token);
        if (!uid) {
            return res.status(401).json({ error: "Sessiya eskirgan yoki noto'g'ri" });
        }

        const doc = await db.collection('VIP_Clients').doc(uid).get();
        if (!doc.exists) {
            return res.status(404).json({ error: "Topilmadi" });
        }
        return res.json({ user: toSafeUser(doc.id, doc.data()) });
    } catch (error) {
        console.error("vip-check xato:", error);
        return res.status(500).json({ error: "Server xatosi" });
    }
});

// Telegram Mini App ichida ochilganda, parolsiz avtomatik aniqlash.
// initData Telegram tomonidan oscar-shop-bot (USER_BOT_TOKEN bilan bir xil
// bot) tokeni bilan imzolangan bo'lishi kerak — shuning uchun mijoz
// ichidagi user.id'ni o'zgartira olmaydi.
router.post('/vip-telegram-check', async (req, res) => {
    try {
        const { initData } = req.body || {};
        const botToken = process.env.USER_BOT_TOKEN;
        const tgUser = botToken ? verifyTelegramInitData(initData, botToken) : null;
        if (!tgUser || !tgUser.id) {
            return res.status(401).json({ error: "Telegram ma'lumotlari tasdiqlanmadi" });
        }

        const doc = await db.collection('VIP_Clients').doc(String(tgUser.id)).get();
        if (!doc.exists) {
            return res.status(404).json({ error: "VIP emas" });
        }

        const token = createSessionToken(doc.id);
        return res.json({ user: toSafeUser(doc.id, doc.data()), token });
    } catch (error) {
        console.error("vip-telegram-check xato:", error);
        return res.status(500).json({ error: "Server xatosi" });
    }
});

module.exports = router;
