const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { verifyTelegramInitData } = require('./telegramAuth');

const BOT_TOKEN = 'test-bot-token';

// Telegram'ning rasmiy imzolash algoritmini takrorlab, sinov uchun
// haqiqiy ko'rinishdagi initData yasaydi:
// https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
function buildInitData(fields, botToken = BOT_TOKEN) {
    const dataCheckString = Object.keys(fields)
        .sort()
        .map((k) => `${k}=${fields[k]}`)
        .join('\n');
    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
    const hash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
    return Object.entries({ ...fields, hash })
        .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
        .join('&');
}

test('verifyTelegramInitData accepts correctly signed data', () => {
    const initData = buildInitData({
        user: JSON.stringify({ id: 987654321, first_name: 'Test' }),
        auth_date: String(Math.floor(Date.now() / 1000)),
    });
    const result = verifyTelegramInitData(initData, BOT_TOKEN);
    assert.deepEqual(result, { id: 987654321, first_name: 'Test' });
});

test('verifyTelegramInitData rejects data signed with the wrong bot token', () => {
    const initData = buildInitData({
        user: JSON.stringify({ id: 987654321 }),
        auth_date: String(Math.floor(Date.now() / 1000)),
    });
    assert.equal(verifyTelegramInitData(initData, 'a-completely-different-token'), null);
});

test('verifyTelegramInitData rejects a forged user id (hash no longer matches)', () => {
    const initData = buildInitData({
        user: JSON.stringify({ id: 987654321 }),
        auth_date: String(Math.floor(Date.now() / 1000)),
    });
    const forged = initData.replace('987654321', '111111111');
    assert.equal(verifyTelegramInitData(forged, BOT_TOKEN), null);
});

test('verifyTelegramInitData rejects stale (too old) auth_date', () => {
    const twoDaysAgo = Math.floor(Date.now() / 1000) - 2 * 24 * 60 * 60;
    const initData = buildInitData({
        user: JSON.stringify({ id: 987654321 }),
        auth_date: String(twoDaysAgo),
    });
    assert.equal(verifyTelegramInitData(initData, BOT_TOKEN, 86400), null);
});

test('verifyTelegramInitData rejects missing/empty input', () => {
    assert.equal(verifyTelegramInitData('', BOT_TOKEN), null);
    assert.equal(verifyTelegramInitData(undefined, BOT_TOKEN), null);
    assert.equal(verifyTelegramInitData('user=x&auth_date=1', ''), null);
});
