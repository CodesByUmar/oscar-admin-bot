"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handlePaymeWebhook = exports.createPayment = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const cors = require("cors");
const corsHandler = cors({ origin: true }); // Allow all origins for the WebApp
admin.initializeApp();
const db = admin.firestore();
// Dummy Payme Credentials
const PAYME_MERCHANT_ID = "test_merchant";
const PAYME_KEY = "test_key";
// Payme Error Codes
const PAYME_ERROR = {
    INVALID_AMOUNT: { code: -31001, message: { ru: "Неверная сумма", uz: "Notog'ri summa", en: "Invalid amount" } },
    TRANSACTION_NOT_FOUND: { code: -31003, message: { ru: "Транзакция не найдена", uz: "Tranzaksiya topilmadi", en: "Transaction not found" } },
    CANT_DO_OPERATION: { code: -31008, message: { ru: "Невозможно выполнить операцию", uz: "Operatsiyani bajarib bo'lmaydi", en: "Cannot perform operation" } },
    AUTH_ERROR: { code: -32504, message: { ru: "Ошибка авторизации", uz: "Avtorizatsiya xatosi", en: "Authorization error" } },
};
/**
 * 1. HTTP Function: createPayment
 * Called by Frontend Checkout.tsx via standard fetch
 */
exports.createPayment = functions.https.onRequest((req, res) => {
    corsHandler(req, res, async () => {
        // Only allow POST requests
        if (req.method !== "POST") {
            res.status(405).json({ error: "Method Not Allowed" });
            return;
        }
        try {
            const { customer, items, totalAmountUSD, totalAmountUZS } = req.body;
            if (!customer || !items) {
                res.status(400).json({ error: "Missing required fields" });
                return;
            }
            // Convert total UZS to tiyins (Payme expects tiyins)
            const amountTiyin = Math.round(totalAmountUZS * 100);
            // Create the order in Firestore
            const orderRef = await db.collection("orders").add({
                customer,
                items,
                totalAmountUSD,
                totalAmountUZS,
                amountTiyin,
                paymentProvider: "payme",
                paymentStatus: "pending",
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            const orderId = orderRef.id;
            // Generate Payme Checkout URL Base64
            // m = merchant_id, ac.order_id = our orderId, a = amount in tiyins
            const paymeParams = `m=${PAYME_MERCHANT_ID};ac.order_id=${orderId};a=${amountTiyin}`;
            const base64Params = Buffer.from(paymeParams).toString("base64");
            // Test mode URL
            const paymeUrl = `https://checkout.test.paycom.uz/${base64Params}`;
            res.status(200).json({ success: true, url: paymeUrl, orderId });
        }
        catch (error) {
            console.error("Error creating payment:", error);
            res.status(500).json({ error: "Failed to create payment session." });
        }
    });
});
/**
 * 2. HTTP Function: handlePaymeWebhook
 * Called by Payme servers for JSON-RPC 2.0 Webhook
 */
exports.handlePaymeWebhook = functions.https.onRequest(async (req, res) => {
    // Payme sends POST requests
    if (req.method !== "POST") {
        res.status(405).send("Method Not Allowed");
        return;
    }
    // 1. Authenticate Request
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        res.status(200).json({ error: PAYME_ERROR.AUTH_ERROR, id: req.body.id });
        return;
    }
    const token = authHeader.split(" ")[1];
    const decodedToken = Buffer.from(token, "base64").toString("utf-8"); // "Paycom:test_key"
    const expectedToken = `Paycom:${PAYME_KEY}`;
    if (decodedToken !== expectedToken) {
        res.status(200).json({ error: PAYME_ERROR.AUTH_ERROR, id: req.body.id });
        return;
    }
    const { method, params, id } = req.body;
    try {
        switch (method) {
            case "CheckPerformTransaction":
                await checkPerformTransaction(params, id, res);
                return;
            case "CreateTransaction":
                await createTransaction(params, id, res);
                return;
            case "PerformTransaction":
                await performTransaction(params, id, res);
                return;
            case "CancelTransaction":
                await cancelTransaction(params, id, res);
                return;
            case "CheckTransaction":
                await checkTransaction(params, id, res);
                return;
            default:
                res.status(200).json({ error: PAYME_ERROR.CANT_DO_OPERATION, id });
                return;
        }
    }
    catch (error) {
        console.error(`Payme Webhook Error [${method}]:`, error);
        res.status(200).json({ error: PAYME_ERROR.CANT_DO_OPERATION, id });
    }
});
/**
 * CheckPerformTransaction
 * Validates if the order exists and amount is correct before allowing transaction creation.
 */
async function checkPerformTransaction(params, id, res) {
    const { amount, account } = params;
    const orderId = account.order_id;
    const orderSnap = await db.collection("orders").doc(orderId).get();
    if (!orderSnap.exists) {
        return res.status(200).json({ error: PAYME_ERROR.CANT_DO_OPERATION, id });
    }
    const orderData = orderSnap.data();
    // Validate amount (tiyins)
    if ((orderData === null || orderData === void 0 ? void 0 : orderData.amountTiyin) !== amount) {
        return res.status(200).json({ error: PAYME_ERROR.INVALID_AMOUNT, id });
    }
    if ((orderData === null || orderData === void 0 ? void 0 : orderData.paymentStatus) !== "pending") {
        return res.status(200).json({ error: PAYME_ERROR.CANT_DO_OPERATION, id });
    }
    return res.status(200).json({
        result: {
            allow: true,
        },
        id,
    });
}
/**
 * CreateTransaction
 * Creates the transaction in our database state.
 */
async function createTransaction(params, id, res) {
    const { id: paymeTxId, time, amount, account } = params;
    const orderId = account.order_id;
    const orderRef = db.collection("orders").doc(orderId);
    const orderSnap = await orderRef.get();
    if (!orderSnap.exists) {
        return res.status(200).json({ error: PAYME_ERROR.CANT_DO_OPERATION, id });
    }
    const orderData = orderSnap.data();
    // Validate amount
    if ((orderData === null || orderData === void 0 ? void 0 : orderData.amountTiyin) !== amount) {
        return res.status(200).json({ error: PAYME_ERROR.INVALID_AMOUNT, id });
    }
    // Check if transaction already exists (idempotency)
    if ((orderData === null || orderData === void 0 ? void 0 : orderData.transactionId) === paymeTxId) {
        if (orderData.paymentStatus !== "pending") {
            return res.status(200).json({ error: PAYME_ERROR.CANT_DO_OPERATION, id });
        }
        return res.status(200).json({
            result: {
                create_time: orderData.paymeCreateTime,
                transaction: orderId,
                state: 1, // Created
            },
            id,
        });
    }
    // If order already has a different transaction or is not pending
    if ((orderData === null || orderData === void 0 ? void 0 : orderData.transactionId) || (orderData === null || orderData === void 0 ? void 0 : orderData.paymentStatus) !== "pending") {
        return res.status(200).json({ error: PAYME_ERROR.CANT_DO_OPERATION, id });
    }
    // Update order with transaction details
    const createTime = Date.now();
    await orderRef.update({
        transactionId: paymeTxId,
        paymeCreateTime: createTime,
        paymeTime: time,
        paymentStatus: "pending" // Still pending until PerformTransaction
    });
    return res.status(200).json({
        result: {
            create_time: createTime,
            transaction: orderId,
            state: 1, // Created
        },
        id,
    });
}
/**
 * PerformTransaction
 * Marks the transaction as paid and finalizes the order.
 */
async function performTransaction(params, id, res) {
    const { id: paymeTxId } = params;
    // Find order by transactionId
    const ordersQuery = await db.collection("orders").where("transactionId", "==", paymeTxId).limit(1).get();
    if (ordersQuery.empty) {
        return res.status(200).json({ error: PAYME_ERROR.TRANSACTION_NOT_FOUND, id });
    }
    const orderDoc = ordersQuery.docs[0];
    const orderData = orderDoc.data();
    // If already paid (idempotency)
    if (orderData.paymentStatus === "paid") {
        return res.status(200).json({
            result: {
                transaction: orderDoc.id,
                perform_time: orderData.paymePerformTime,
                state: 2, // Done
            },
            id,
        });
    }
    // If it was cancelled or something else, we can't perform
    if (orderData.paymentStatus !== "pending") {
        return res.status(200).json({ error: PAYME_ERROR.CANT_DO_OPERATION, id });
    }
    const performTime = Date.now();
    await orderDoc.ref.update({
        paymentStatus: "paid",
        paymePerformTime: performTime
    });
    // NOTE: Here you would normally trigger the Telegram Bot Webhook to notify admins
    // e.g. await sendTelegramNotification(orderData)
    return res.status(200).json({
        result: {
            transaction: orderDoc.id,
            perform_time: performTime,
            state: 2, // Done
        },
        id,
    });
}
/**
 * CancelTransaction
 */
async function cancelTransaction(params, id, res) {
    const { id: paymeTxId, reason } = params;
    const ordersQuery = await db.collection("orders").where("transactionId", "==", paymeTxId).limit(1).get();
    if (ordersQuery.empty) {
        return res.status(200).json({ error: PAYME_ERROR.TRANSACTION_NOT_FOUND, id });
    }
    const orderDoc = ordersQuery.docs[0];
    const orderData = orderDoc.data();
    // If already cancelled (idempotency)
    if (orderData.paymentStatus === "canceled" || orderData.paymentStatus === "failed") {
        return res.status(200).json({
            result: {
                transaction: orderDoc.id,
                cancel_time: orderData.paymeCancelTime,
                state: -1, // Cancelled
            },
            id,
        });
    }
    const cancelTime = Date.now();
    await orderDoc.ref.update({
        paymentStatus: "canceled",
        paymeCancelTime: cancelTime,
        paymeCancelReason: reason
    });
    return res.status(200).json({
        result: {
            transaction: orderDoc.id,
            cancel_time: cancelTime,
            state: -1,
        },
        id,
    });
}
/**
 * CheckTransaction
 */
async function checkTransaction(params, id, res) {
    const { id: paymeTxId } = params;
    const ordersQuery = await db.collection("orders").where("transactionId", "==", paymeTxId).limit(1).get();
    if (ordersQuery.empty) {
        return res.status(200).json({ error: PAYME_ERROR.TRANSACTION_NOT_FOUND, id });
    }
    const orderDoc = ordersQuery.docs[0];
    const orderData = orderDoc.data();
    let state = 1; // created
    if (orderData.paymentStatus === "paid")
        state = 2; // done
    if (orderData.paymentStatus === "canceled")
        state = -1; // cancelled
    return res.status(200).json({
        result: {
            create_time: orderData.paymeCreateTime || 0,
            perform_time: orderData.paymePerformTime || 0,
            cancel_time: orderData.paymeCancelTime || 0,
            transaction: orderDoc.id,
            state,
            reason: orderData.paymeCancelReason || null,
        },
        id,
    });
}
//# sourceMappingURL=index.js.map