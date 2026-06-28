/**
 * Bu skript Firestore'dagi hozirgi "categories" va "products"
 * collection'laringizni JSON faylga BACKUP qiladi.
 * Yangi ma'lumotlarni yozishdan OLDIN shuni ishlatib qo'yish tavsiya etiladi.
 *
 * O'RNATISH:
 *   npm install firestore-export-import firebase-admin
 *
 * ISHLATISH:
 *   node backupFirestore.cjs
 *
 * Natija: backup_<sana-vaqt>.json fayli yaratiladi.
 */

const { initializeApp } = require("firebase-admin/app");
const { cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { backups } = require("firestore-export-import");
const serviceAccount = require("./oscar-d85af-firebase-adminsdk-fbsvc-4f2f71944c.json");
const fs = require("fs");

initializeApp({
  credential: cert(serviceAccount),
});

const firestore = getFirestore();

async function main() {
  console.log("Backup olinmoqda: categories, products...");

  const data = await backups(firestore, ["categories", "products"]);

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `backup_${timestamp}.json`;

  fs.writeFileSync(filename, JSON.stringify(data, null, 2), "utf8");

  console.log(`Tugadi! Backup saqlandi: ${filename}`);
  console.log(`Categories: ${Object.keys(data.categories || {}).length} ta`);
  console.log(`Products: ${Object.keys(data.products || {}).length} ta`);

  process.exit(0);
}

main().catch((err) => {
  console.error("Xatolik:", err);
  process.exit(1);
});
