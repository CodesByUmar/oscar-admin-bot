const express = require('express');
const paymeRouter = require('./webhooks/payme');
const vipAuthRouter = require('./routes/vipAuth');

// MUHIM: faqat mini-app'ning o'z manzillaridan kelgan so'rovlarga ruxsat
// beramiz (VIP login endpoint'i uchun) — boshqa hech qaysi sayt bu
// API'ni chaqira olmasin.
const ALLOWED_ORIGINS = [
    'https://oscar-ui-seven.vercel.app',
    'http://localhost:5173',
];

function corsMiddleware(req, res, next) {
    const origin = req.headers.origin;
    if (ALLOWED_ORIGINS.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    }
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
}

function startServer() {
    const app = express();
    app.use(express.json());

    app.use('/payme/webhook', paymeRouter);

    app.use('/api', corsMiddleware, vipAuthRouter);

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`✅ Server ${PORT}-portda ishlamoqda`);
    });
}

module.exports = { startServer };
