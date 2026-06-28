import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";

admin.initializeApp();
const db = getFirestore();

const PAYME_MERCHANT_ID = "test_merchant";
const PAYME_KEY = "test_key";

const PAYME_ERROR = {
  INVALID_AMOUNT: { code: -31001, message: { ru: "Неверная сумма", uz: "Notog'ri summa", en: "Invalid amount" } },
  TRANSACTION_NOT_FOUND: { code: -31003, message: { ru: "Транзакция не найдена", uz: "Tranzaksiya topilmadi", en: "Transaction not found" } },
  CANT_DO_OPERATION: { code: -31008, message: { ru: "Невозможно выполнить операцию", uz: "Operatsiyani bajarib bo'lmaydi", en: "Cannot perform operation" } },
  AUTH_ERROR: { code: -32504, message: { ru: "Ошибка авторизации", uz: "Avtorizatsiya xatosi", en: "Authorization error" } },
};

type ResLike = {
  status: (code: number) => ResLike;
  json: (body: unknown) => void;
  send: (body: unknown) => void;
};

/**
 * 1. Callable Function: createPayment
 * Checkout.tsx tomonidan httpsCallable orqali chaqiriladi.
 * Firestore da order yaratadi va Payme checkout URL ini qaytaradi.
 */
export const createPayment = functions.https.onCall(async (data) => {
  const {
    isVip, customerName, customerPhone, username,
    region, district, location,
    items, totalUSD, totalUZS,
    deliveryMethod, deliveryFee, deliveryFeeUsd, distanceKm,
    deliveryAddress, deliveryCoords,
    paymentProvider, telegramChatId,
    status, paymentStatus, paidAt, cancelledAt, transactionId,
    createdAt, updatedAt,
  } = data;

  if (!items || !totalUZS) {
    throw new functions.https.HttpsError("invalid-argument", "Missing required fields");
  }

  // Payme tiyinlarda ishlaydi (1 UZS = 100 tiyin)
  const amountTiyin = Math.round(totalUZS * 100);

  const orderRef = await db.collection("orders").add({
    ...(isVip
      ? { username, isVip: true }
      : { customerName, customerPhone, isVip: false }
    ),
    region, district, location,
    items,
    totalUSD, totalUZS,
    amountTiyin,
    deliveryMethod, deliveryFee, deliveryFeeUsd, distanceKm,
    deliveryAddress, deliveryCoords,
    paymentMethod: "card",
    paymentProvider,
    telegramChatId: telegramChatId || null,
    status: status || "pending",
    paymentStatus: paymentStatus || "pending",
    transactionId: transactionId || null,
    paidAt: paidAt || null,
    cancelledAt: cancelledAt || null,
    createdAt: createdAt || new Date().toISOString(),
    updatedAt: updatedAt || new Date().toISOString(),
  });

  const orderId = orderRef.id;

  const paymeParams = `m=${PAYME_MERCHANT_ID};ac.order_id=${orderId};a=${amountTiyin}`;
  const base64Params = Buffer.from(paymeParams).toString("base64");
  const paymeUrl = `https://checkout.paycom.uz/${base64Params}`;

  return { success: true, url: paymeUrl, orderId };
});

/**
 * 2. HTTP Function: handlePaymeWebhook
 * Payme serverlari tomonidan JSON-RPC 2.0 orqali chaqiriladi.
 */
export const handlePaymeWebhook = functions.https.onRequest(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).send("Method Not Allowed");
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(200).json({ error: PAYME_ERROR.AUTH_ERROR, id: req.body.id });
    return;
  }

  const token = authHeader.split(" ")[1];
  const decodedToken = Buffer.from(token, "base64").toString("utf-8");
  const expectedToken = `Paycom:${PAYME_KEY}`;

  if (decodedToken !== expectedToken) {
    res.status(200).json({ error: PAYME_ERROR.AUTH_ERROR, id: req.body.id });
    return;
  }

  const { method, params, id } = req.body;

  try {
    switch (method) {
      case "CheckPerformTransaction":
        await checkPerformTransaction(params, id, res as ResLike);
        return;
      case "CreateTransaction":
        await createTransaction(params, id, res as ResLike);
        return;
      case "PerformTransaction":
        await performTransaction(params, id, res as ResLike);
        return;
      case "CancelTransaction":
        await cancelTransaction(params, id, res as ResLike);
        return;
      case "CheckTransaction":
        await checkTransaction(params, id, res as ResLike);
        return;
      default:
        res.status(200).json({ error: PAYME_ERROR.CANT_DO_OPERATION, id });
        return;
    }
  } catch (error) {
    console.error(`Payme Webhook Error [${method}]:`, error);
    res.status(200).json({ error: PAYME_ERROR.CANT_DO_OPERATION, id });
  }
});

async function checkPerformTransaction(params: any, id: string, res: ResLike) {
  const { amount, account } = params;
  const orderId = account.order_id;

  const orderSnap = await db.collection("orders").doc(orderId).get();

  if (!orderSnap.exists) {
    return res.status(200).json({ error: PAYME_ERROR.CANT_DO_OPERATION, id });
  }

  const orderData = orderSnap.data()!;

  if (orderData?.amountTiyin !== amount) {
    return res.status(200).json({ error: PAYME_ERROR.INVALID_AMOUNT, id });
  }

  if (orderData?.paymentStatus !== "pending") {
    return res.status(200).json({ error: PAYME_ERROR.CANT_DO_OPERATION, id });
  }

  return res.status(200).json({ result: { allow: true }, id });
}

async function createTransaction(params: any, id: string, res: ResLike) {
  const { id: paymeTxId, time, amount, account } = params;
  const orderId = account.order_id;

  const orderRef = db.collection("orders").doc(orderId);
  const orderSnap = await orderRef.get();

  if (!orderSnap.exists) {
    return res.status(200).json({ error: PAYME_ERROR.CANT_DO_OPERATION, id });
  }

  const orderData = orderSnap.data()!;

  if (orderData?.amountTiyin !== amount) {
    return res.status(200).json({ error: PAYME_ERROR.INVALID_AMOUNT, id });
  }

  // Idempotency: agar bu transaksiya allaqachon mavjud bo'lsa
  if (orderData?.transactionId === paymeTxId) {
    if (orderData.paymentStatus !== "pending") {
      return res.status(200).json({ error: PAYME_ERROR.CANT_DO_OPERATION, id });
    }
    return res.status(200).json({
      result: { create_time: orderData.paymeCreateTime, transaction: orderId, state: 1 },
      id,
    });
  }

  if (orderData?.transactionId || orderData?.paymentStatus !== "pending") {
    return res.status(200).json({ error: PAYME_ERROR.CANT_DO_OPERATION, id });
  }

  const createTime = Date.now();
  await orderRef.update({
    transactionId: paymeTxId,
    paymeCreateTime: createTime,
    paymeTime: time,
    paymentStatus: "pending",
    updatedAt: new Date().toISOString(),
  });

  return res.status(200).json({
    result: { create_time: createTime, transaction: orderId, state: 1 },
    id,
  });
}

async function performTransaction(params: any, id: string, res: ResLike) {
  const { id: paymeTxId } = params;

  const ordersQuery = await db.collection("orders").where("transactionId", "==", paymeTxId).limit(1).get();

  if (ordersQuery.empty) {
    return res.status(200).json({ error: PAYME_ERROR.TRANSACTION_NOT_FOUND, id });
  }

  const orderDoc = ordersQuery.docs[0];
  const orderData = orderDoc.data()!;

  // Idempotency: allaqachon to'langan bo'lsa
  if (orderData.paymentStatus === "paid") {
    return res.status(200).json({
      result: { transaction: orderDoc.id, perform_time: orderData.paymePerformTime, state: 2 },
      id,
    });
  }

  if (orderData.paymentStatus !== "pending") {
    return res.status(200).json({ error: PAYME_ERROR.CANT_DO_OPERATION, id });
  }

  const performTime = Date.now();
  const now = new Date().toISOString();

  await orderDoc.ref.update({
    paymentStatus: "paid",
    status: "paid",
    paidAt: now,
    paymePerformTime: performTime,
    updatedAt: now,
  });

  return res.status(200).json({
    result: { transaction: orderDoc.id, perform_time: performTime, state: 2 },
    id,
  });
}

async function cancelTransaction(params: any, id: string, res: ResLike) {
  const { id: paymeTxId, reason } = params;

  const ordersQuery = await db.collection("orders").where("transactionId", "==", paymeTxId).limit(1).get();

  if (ordersQuery.empty) {
    return res.status(200).json({ error: PAYME_ERROR.TRANSACTION_NOT_FOUND, id });
  }

  const orderDoc = ordersQuery.docs[0];
  const orderData = orderDoc.data()!;

  // Idempotency: allaqachon bekor qilingan bo'lsa
  if (orderData.paymentStatus === "canceled" || orderData.paymentStatus === "failed") {
    return res.status(200).json({
      result: { transaction: orderDoc.id, cancel_time: orderData.paymeCancelTime, state: -1 },
      id,
    });
  }

  const cancelTime = Date.now();
  const now = new Date().toISOString();

  await orderDoc.ref.update({
    paymentStatus: "canceled",
    status: "cancelled",
    cancelledAt: now,
    paymeCancelTime: cancelTime,
    paymeCancelReason: reason,
    updatedAt: now,
  });

  return res.status(200).json({
    result: { transaction: orderDoc.id, cancel_time: cancelTime, state: -1 },
    id,
  });
}

async function checkTransaction(params: any, id: string, res: ResLike) {
  const { id: paymeTxId } = params;

  const ordersQuery = await db.collection("orders").where("transactionId", "==", paymeTxId).limit(1).get();

  if (ordersQuery.empty) {
    return res.status(200).json({ error: PAYME_ERROR.TRANSACTION_NOT_FOUND, id });
  }

  const orderDoc = ordersQuery.docs[0];
  const orderData = orderDoc.data()!;

  let state = 1;
  if (orderData.paymentStatus === "paid") state = 2;
  if (orderData.paymentStatus === "canceled") state = -1;

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
