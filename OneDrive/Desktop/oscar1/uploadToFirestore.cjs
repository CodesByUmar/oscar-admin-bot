/**
 * Bu skript:
 * 1. Eski "categories" va "products" collection'larini TO'LIQ o'chiradi
 * 2. firestore_data.json fayldagi yangi ma'lumotlarni yozadi
 *
 * O'RNATISH:
 *   npm install firestore-export-import firebase-admin
 *
 * ISHLATISH:
 *   node uploadToFirestore.cjs
 *
 * DIQQAT: Bu skript eski categories va products collection'laridagi
 * BARCHA ma'lumotlarni butunlay o'chiradi va o'rniga yangisini yozadi!
 * Oldin backupFirestore.cjs orqali backup olib qo'ying.
 */

const { initializeApp } = require("firebase-admin/app");
const { cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { restore } = require("firestore-export-import");
const serviceAccount = require("./oscar-d85af-firebase-adminsdk-fbsvc-4f2f71944c.json");
const fs = require("fs");

initializeApp({
  credential: cert(serviceAccount),
});

const firestore = getFirestore();

async function deleteCollection(collectionName) {
  const snapshot = await firestore.collection(collectionName).get();
  if (snapshot.empty) {
    console.log(`"${collectionName}" collection bo'sh, o'chirish kerak emas.`);
    return;
  }

  const batchSize = 400;
  const docs = snapshot.docs;

  for (let i = 0; i < docs.length; i += batchSize) {
    const batch = firestore.batch();
    const chunk = docs.slice(i, i + batchSize);
    chunk.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    console.log(
      `"${collectionName}": ${Math.min(i + batchSize, docs.length)}/${docs.length} o'chirildi`
    );
  }
}

async function main() {
  console.log("Eski ma'lumotlar o'chirilmoqda...");
  await deleteCollection("categories");
  await deleteCollection("products");

  const raw = fs.readFileSync("./firestore_data.json", "utf8");
  const data = JSON.parse(raw); // { categories: {...}, products: {...} }

  console.log("Yangi ma'lumotlar yozilmoqda...");
  const status = await restore(firestore, data);

  console.log("Tugadi! Status:", status);
  process.exit(0);
}

main().catch((err) => {
  console.error("Xatolik:", err);
  process.exit(1);
});
