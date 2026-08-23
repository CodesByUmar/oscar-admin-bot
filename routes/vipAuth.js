const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');

// MUHIM: Parol tekshiruvi endi FAQAT shu yerda, server tomonida (Admin SDK
// orqali) bo'ladi. Mini-app (brauzer) endi VIP_Clients collection'ini
// to'g'ridan-to'g'ri o'qimaydi/so'ramaydi — Firestore qoidalari buni
// butunlay taqiqlaydi. Javobda parol maydoni HECH QACHON qaytarilmaydi.

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

        if (data.password !== password) {
            return res.status(401).json({ error: "Login yoki parol noto'g'ri" });
        }

        return res.json({ user: toSafeUser(vipDoc.id, data) });
    } catch (error) {
        console.error("vip-login xato:", error);
        return res.status(500).json({ error: "Server xatosi" });
    }
});

// Saqlangan sessiya/Telegram ID hali ham VIP ekanini tekshirish (parolsiz)
router.get('/vip-check/:uid', async (req, res) => {
    try {
        const uid = req.params.uid;
        const doc = await db.collection('VIP_Clients').doc(String(uid)).get();
        if (!doc.exists) {
            return res.status(404).json({ error: "Topilmadi" });
        }
        return res.json({ user: toSafeUser(doc.id, doc.data()) });
    } catch (error) {
        console.error("vip-check xato:", error);
        return res.status(500).json({ error: "Server xatosi" });
    }
});

module.exports = router;
