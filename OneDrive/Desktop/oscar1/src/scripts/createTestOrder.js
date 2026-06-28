// createTestOrder.js
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ============================================
// 1. SERVICE ACCOUNT FAYLNI O'QISH
// ============================================
// .env dan FIREBASE_SERVICE_ACCOUNT_JSON ni o'qish yoki fayldan
const serviceAccountPath = join(__dirname, '..', '..', 'oscar-d85af-firebase-adminsdk-fbsvc-4f2f71944c.json');

if (!existsSync(serviceAccountPath)) {
    console.error('❌ serviceAccountKey.json topilmadi!');
    console.error(`   Iltimos, faylni ${serviceAccountPath} ga joylashtiring`);
    process.exit(1);
}

const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));

initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore();
console.log('🔥 Firebase ga ulandi!');

// ============================================
// 2. ORDER YARATISH
// ============================================
async function createTestOrder() {
    const orderData = {
        // ===== MIJOZ =====
        customerName: "Payme Test",
        customerPhone: "+998 90 123 45 67",
        region: "Toshkent shahri",
        district: "Chilonzor",

        // ===== YETKAZIB BERISH =====
        deliveryMethod: "delivery",
        deliveryAddress: "Test address, Tashkent",
        deliveryCoords: {
            lat: 41.31133701789056,
            lng: 69.28557435507813
        },
        deliveryFee: 25000,
        deliveryFeeUsd: 2.08,
        distanceKm: 15.3,

        // ===== TO'LOV =====
        paymentMethod: "card",
        paymentProvider: "payme",
        paymentStatus: "pending",

        // ===== STATUS =====
        status: "pending",

        // ===== SUMMA =====
        totalUSD: 3.58,
        totalUZS: 43000,

        // ===== MAHSULOTLAR =====
        items: [
            {
                productId: "1",
                name: "Suyultiruvchi 0,5 (380ml)",
                quantity: 5,
                unit: "item",
                price: 0.3,
                originalPrice: 0.3,
                discount: 0,
                total: 1.5
            }
        ],

        // ===== VAQT =====
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        paidAt: null,
        cancelledAt: null,
        transactionId: null,
        telegramChatId: null,
        isVip: false
    };

    try {
        const docRef = await db.collection('orders').add(orderData);
        console.log('\n========================================');
        console.log('✅ ORDER YARATILDI!');
        console.log('========================================');
        console.log(`📝 Order ID: ${docRef.id}`);
        console.log(`💰 Summa: 43,000 UZS`);
        console.log(`💳 To'lov: card → payme`);
        console.log(`📊 Holat: pending`);
        console.log('========================================');
        console.log('\n🔗 Payme test muhitida quyidagi ID ni ishlating:');
        console.log(`   Номер заказа: ${docRef.id}`);
        console.log('\n📋 Keyingi qadamlar:');
        console.log(`   1. Payme test muhitiga kiring`);
        console.log(`   2. "Неверная сумма" testini tanlang`);
        console.log(`   3. Номер заказа: ${docRef.id}`);
        console.log(`   4. Неверная сумма: 3000000`);
        console.log(`   5. Kutilgan javob: -31001`);
        console.log('========================================');
    } catch (error) {
        console.error('❌ Xatolik:', error.message);
    }
}

createTestOrder();