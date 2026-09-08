const test = require('node:test');
const assert = require('node:assert/strict');

// encryptPassword/decryptPassword VIP_ENC_KEY'ni talab qiladi — testlar
// uchun sobit (o'zboshimcha) kalit o'rnatiladi, haqiqiy Railway kaliti bilan
// bog'liq emas.
process.env.VIP_ENC_KEY = '0'.repeat(64);

const { hashPassword, verifyPassword, isHashed, encryptPassword, decryptPassword } = require('./password');

test('hashPassword produces a value that isHashed recognizes', () => {
    const hashed = hashPassword('mySecret123');
    assert.equal(isHashed(hashed), true);
});

test('hashPassword never returns the original plaintext', () => {
    const hashed = hashPassword('mySecret123');
    assert.notEqual(hashed, 'mySecret123');
});

test('verifyPassword accepts the correct password against a hash', () => {
    const hashed = hashPassword('mySecret123');
    assert.equal(verifyPassword('mySecret123', hashed), true);
});

test('verifyPassword rejects a wrong password against a hash', () => {
    const hashed = hashPassword('mySecret123');
    assert.equal(verifyPassword('wrongPassword', hashed), false);
});

test('hashPassword uses a random salt (two hashes of the same password differ)', () => {
    const a = hashPassword('mySecret123');
    const b = hashPassword('mySecret123');
    assert.notEqual(a, b);
});

test('verifyPassword falls back to plain equality for legacy (un-hashed) values', () => {
    // VIP_Clients'da eski, hash'lanmagan yozuvlar birinchi kirishda
    // shu yo'l bilan tekshirilib, keyin routes/vipAuth.js orqali
    // avtomatik hash'lanadi.
    assert.equal(verifyPassword('oldPlainPass', 'oldPlainPass'), true);
    assert.equal(verifyPassword('oldPlainPass', 'somethingElse'), false);
});

test('isHashed returns false for a plain string', () => {
    assert.equal(isHashed('oldPlainPass'), false);
    assert.equal(isHashed(''), false);
    assert.equal(isHashed(undefined), false);
});

test('encryptPassword/decryptPassword round-trip returns the original plaintext', () => {
    const encrypted = encryptPassword('mySecret123');
    assert.equal(decryptPassword(encrypted), 'mySecret123');
});

test('encryptPassword never returns the original plaintext', () => {
    const encrypted = encryptPassword('mySecret123');
    assert.notEqual(encrypted, 'mySecret123');
});

test('encryptPassword uses a random IV (two encryptions of the same password differ)', () => {
    const a = encryptPassword('mySecret123');
    const b = encryptPassword('mySecret123');
    assert.notEqual(a, b);
    assert.equal(decryptPassword(a), decryptPassword(b));
});

test('decryptPassword throws on tampered ciphertext (auth tag mismatch)', () => {
    const encrypted = encryptPassword('mySecret123');
    const [iv, authTag, ciphertext] = encrypted.split(':');
    const tampered = `${iv}:${authTag}:${ciphertext.slice(0, -2)}00`;
    assert.throws(() => decryptPassword(tampered));
});
