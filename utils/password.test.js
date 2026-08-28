const test = require('node:test');
const assert = require('node:assert/strict');
const { hashPassword, verifyPassword, isHashed } = require('./password');

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
