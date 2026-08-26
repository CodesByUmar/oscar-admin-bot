const { db } = require('../config/firebase');

async function getNextId(collectionName) {
    if (!db) return -1;
    try {
        const snapshot = await db.collection(collectionName).orderBy('id', 'desc').limit(1).get();
        if (snapshot.empty) return 1;
        const lastId = snapshot.docs[0].data().id;
        const lastIdNum = parseInt(lastId);
        if (isNaN(lastIdNum) || lastIdNum <= 0) return 1;
        return lastIdNum + 1;
    } catch (error) {
        console.error(`getNextId xato:`, error);
        return -1;
    }
}

// getNextId + alohida .set() ikki admin bir vaqtda yangi mahsulot/kategoriya
// qo'shsa, ikkalasi ham bir xil ID o'qib, biri ikkinchisining yozuvini
// ustidan yozib qo'yishi mumkin edi. Shu sabab ID olish va yozish bitta
// Firestore tranzaksiyasi ichida, atomik qilib bajariladi.
async function createWithNextId(collectionName, buildDoc) {
    if (!db) throw new Error("DB ulanmagan");
    return db.runTransaction(async (tx) => {
        const snapshot = await tx.get(
            db.collection(collectionName).orderBy('id', 'desc').limit(1)
        );
        let lastIdNum = 0;
        if (!snapshot.empty) {
            const parsed = parseInt(snapshot.docs[0].data().id);
            if (!isNaN(parsed) && parsed > 0) lastIdNum = parsed;
        }
        const newId = lastIdNum + 1;
        const docData = buildDoc(newId);
        tx.set(db.collection(collectionName).doc(String(newId)), docData);
        return docData;
    });
}

function parseNumberInput(input, isPrice = false) {
    if (typeof input !== 'string') return null;
    let normalized = input.replace(/,/g, '.');
    const parsed = parseFloat(normalized);
    if (isNaN(parsed) || parsed < 0) return null;
    if (isPrice) {
        const parts = normalized.split('.');
        if (parts.length === 2 && parts[1].length > 3) {
            normalized = parts[0] + '.' + parts[1].substring(0, 3);
        }
        return parseFloat(normalized);
    }
    return parsed;
}

// ==================== VAQT FUNKSIYALARI (TO‘G‘RILANDI) ====================

/** O‘zbekiston vaqti (Asia/Tashkent) bo‘yicha formatlash */
function formatTimestamp(ts) {
    if (!ts) return "Yo'q";
    try {
        const date = ts.toDate ? ts.toDate() : new Date(ts);

        return new Intl.DateTimeFormat('ru-RU', {
            timeZone: 'Asia/Tashkent',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        }).format(date);
    } catch (e) {
        console.error("formatTimestamp xato:", e);
        return "Yo'q";
    }
}

/** O‘zbekiston vaqti (Asia/Tashkent) bo‘yicha sana + vaqt */
function formatDateTime(ts) {
    if (!ts) return "Noma'lum";
    try {
        const date = ts.toDate ? ts.toDate() : new Date(ts);

        return new Intl.DateTimeFormat('ru-RU', {
            timeZone: 'Asia/Tashkent',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        }).format(date);
    } catch (e) {
        console.error("formatDateTime xato:", e);
        return "Noma'lum";
    }
}

/** Matndan sana o‘qish (DD.MM.YYYY) */
function parseDateDDMMYYYY(text) {
    const match = text.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
    if (!match) return null;
    const day = parseInt(match[1]);
    const month = parseInt(match[2]);
    const year = parseInt(match[3]);

    if (day < 1 || day > 31 || month < 1 || month > 12 || year < 2024 || year > 2100)
        return null;

    const dateObj = new Date(year, month - 1, day, 0, 0, 0);
    if (dateObj.getDate() !== day || dateObj.getMonth() !== month - 1 || dateObj.getFullYear() !== year)
        return null;

    return dateObj;
}

function getStr(val, fallback = '') {
    if (val === null || val === undefined) return fallback;
    if (typeof val === 'string') return val;
    if (typeof val === 'object') return val.uz || val.ru || val.en || val.name || fallback;
    return String(val);
}

module.exports = {
    getNextId,
    createWithNextId,
    parseNumberInput,
    formatTimestamp,
    formatDateTime,
    parseDateDDMMYYYY,
    getStr
};