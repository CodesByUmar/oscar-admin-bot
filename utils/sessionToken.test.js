const test = require('node:test');
const assert = require('node:assert/strict');

// Testda deterministik imzo kaliti bo'lishi uchun — modul yuklanishidan
// OLDIN o'rnatiladi (utils/sessionToken.js buni require vaqtida o'qiydi).
process.env.TELEGRAM_BOT_TOKEN = 'test-secret-token';
const { createSessionToken, verifySessionToken } = require('./sessionToken');

test('verifySessionToken returns the same uid that was signed', () => {
    const token = createSessionToken('12345');
    assert.equal(verifySessionToken(token), '12345');
});

test('verifySessionToken rejects a tampered token', () => {
    const token = createSessionToken('12345');
    const tampered = token.slice(0, -2) + (token.slice(-2) === 'aa' ? 'bb' : 'aa');
    assert.equal(verifySessionToken(tampered), null);
});

test('verifySessionToken rejects garbage input', () => {
    assert.equal(verifySessionToken('not-a-real-token'), null);
    assert.equal(verifySessionToken(''), null);
    assert.equal(verifySessionToken(undefined), null);
});

test('verifySessionToken rejects a token forged with a different secret', () => {
    // Xuddi shu formatda, lekin boshqa kalit bilan imzolangan token —
    // haqiqiy hujum stsenariysini taqlid qiladi.
    const crypto = require('node:crypto');
    const payload = `99999:${Date.now() + 100000}`;
    const forgedSig = crypto.createHmac('sha256', 'wrong-secret').update(payload).digest('hex');
    const forgedToken = Buffer.from(payload, 'utf8').toString('base64url') + '.' + forgedSig;
    assert.equal(verifySessionToken(forgedToken), null);
});

test('verifySessionToken rejects an expired token', () => {
    const crypto = require('node:crypto');
    const payload = `12345:${Date.now() - 1000}`; // allaqachon o'tgan muddat
    const sig = crypto.createHmac('sha256', 'test-secret-token').update(payload).digest('hex');
    const expiredToken = Buffer.from(payload, 'utf8').toString('base64url') + '.' + sig;
    assert.equal(verifySessionToken(expiredToken), null);
});
