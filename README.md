GOOD MORNING 
# 🛠️ OSCAR — Admin Bot (oscar-admin-bot)

Telegram orqali ishlaydigan boshqaruv paneli. **OSCAR** tizimining uchta repozitoriyasidan biri — do'kon egasi/xodimi mahsulotlar, kategoriyalar, buyurtmalar va VIP mijozlarni shu bot orqali boshqaradi.

> 🔗 Bog'liq repolar: [`oscar-ui`](https://github.com/Oyatillo-tech/oscar-ui) (mijoz mini-ilovasi) · [`oscar-shop-bot`](https://github.com/Oyatillo-tech/oscar-shop-bot) (mijoz boti)

## 🚀 Texnologiyalar

Node.js, node-telegram-bot-api, Express (webhook server), Firebase Admin SDK, Payme webhook integratsiyasi

## ✨ Asosiy imkoniyatlar

- 📦 Mahsulot va kategoriya boshqaruvi (qo'shish/tahrirlash/o'chirish)
- 🧾 Buyurtmalarni ko'rish, tasdiqlash yoki bekor qilish
- 👑 VIP mijozlar tizimi (`/addvip`, `/removevip`)
- 💰 USD kursini boshqarish
- 💳 Payme to'lov webhook'larini qayta ishlash
- 🖼️ ImgBB orqali mahsulot rasmlarini yuklash

## 📁 Loyiha strukturasi

```
index.js                    # Kirish nuqtasi
config/
├── adminBot.js               # Bot obyekti, ADMIN_IDS
├── firebase.js                # Firebase Admin SDK
└── constants.js
server.js                    # Express — Payme webhook uchun
handlers/
├── command.js                 # Asosiy menyu
├── message.js                 # Bosqichma-bosqich matnli kirishlar
├── callback.js                # Inline tugmalar
├── photo.js                   # Rasm yuklash (ImgBB)
├── back.js
├── steps.js
└── vip.js
views/                        # Mahsulot/kategoriya ko'rinishlari
listeners/orders.js             # Yangi buyurtma xabarnomasi (onSnapshot)
utils/
├── helpers.js                  # getNextId va boshqalar
└── imgbb.js
webhooks/payme.js               # Payme webhook handler
keyboards/index.js
state/userState.js              # Admin sessiya holati (RAM, doimiy emas)
```

## 🛠️ O'rnatish

```bash
git clone https://github.com/Oyatillo-tech/oscar-admin-bot.git
cd oscar-admin-bot
npm install
```

## ⚙️ Muhit o'zgaruvchilari (.env)

```
TELEGRAM_BOT_TOKEN=
ADMIN_IDS=123456,789012
FIREBASE_SERVICE_ACCOUNT_JSON=
IMGBB_API_KEY=
MINI_APP_URL=
PAYME_KEY=
PORT=3000
```

> ⚠️ `FIREBASE_SERVICE_ACCOUNT_JSON` kabi maxfiy kalitlar hech qachon ochiq repoga qo'yilmasligi kerak.

## ▶️ Ishga tushirish

```bash
node index.js
```

## ⚠️ Texnik eslatma

`state/userState.js` xotirada (RAM) saqlanadi — server qayta ishga tushsa, adminlarning joriy bosqichi tozalanadi va ular `/start` bosishlari kerak bo'ladi.

## 👤 Muallif

**Oyatillo Obloberdiev**
[LinkedIn](https://www.linkedin.com/in/oyatillo-obloberdiev-14b645294/) | [GitHub](https://github.com/Oyatillo-tech)
