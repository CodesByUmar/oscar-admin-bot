const test = require('node:test');
const assert = require('node:assert/strict');
const { parseNumberInput, parseDateDDMMYYYY, getStr, formatTimestamp } = require('./helpers');

test('parseNumberInput parses a plain positive number', () => {
    assert.equal(parseNumberInput('6.53'), 6.53);
});

test('parseNumberInput treats comma as a decimal separator', () => {
    // Admin ko'pincha vergul bilan yozadi (mas: "6,53"), Firestore'da esa
    // nuqta bilan saqlanadi.
    assert.equal(parseNumberInput('6,53'), 6.53);
});

test('parseNumberInput rejects negative numbers', () => {
    assert.equal(parseNumberInput('-5'), null);
});

test('parseNumberInput rejects non-numeric text', () => {
    assert.equal(parseNumberInput('abc'), null);
});

test('parseNumberInput rejects non-string input', () => {
    assert.equal(parseNumberInput(6.53), null);
    assert.equal(parseNumberInput(null), null);
    assert.equal(parseNumberInput(undefined), null);
});

test('parseNumberInput truncates prices to 3 decimal places without rounding', () => {
    assert.equal(parseNumberInput('6.5439', true), 6.543);
});

test('parseNumberInput leaves non-price numbers with full precision', () => {
    assert.equal(parseNumberInput('6.5439', false), 6.5439);
});

test('parseNumberInput accepts zero', () => {
    assert.equal(parseNumberInput('0'), 0);
});

test('parseDateDDMMYYYY parses a valid date', () => {
    const d = parseDateDDMMYYYY('13.05.2026');
    assert.equal(d.getFullYear(), 2026);
    assert.equal(d.getMonth(), 4); // 0-indeksli oy
    assert.equal(d.getDate(), 13);
});

test('parseDateDDMMYYYY rejects a wrong format', () => {
    assert.equal(parseDateDDMMYYYY('2026-05-13'), null);
    assert.equal(parseDateDDMMYYYY('13/05/2026'), null);
    assert.equal(parseDateDDMMYYYY('not a date'), null);
});

test('parseDateDDMMYYYY rejects a calendar-invalid date (e.g. Feb 31)', () => {
    assert.equal(parseDateDDMMYYYY('31.02.2026'), null);
});

test('parseDateDDMMYYYY rejects a year outside the allowed range', () => {
    assert.equal(parseDateDDMMYYYY('01.01.2023'), null);
    assert.equal(parseDateDDMMYYYY('01.01.2101'), null);
});

test('getStr returns the fallback for null/undefined', () => {
    assert.equal(getStr(null, 'Yoq'), 'Yoq');
    assert.equal(getStr(undefined, 'Yoq'), 'Yoq');
});

test('getStr returns a plain string unchanged', () => {
    assert.equal(getStr('Bo\'yoq'), 'Bo\'yoq');
});

test('getStr picks uz first from a multi-language object', () => {
    assert.equal(getStr({ uz: 'Bo\'yoq', ru: 'Краска', en: 'Paint' }), 'Bo\'yoq');
});

test('getStr falls back through ru then en when uz is missing', () => {
    assert.equal(getStr({ ru: 'Краска', en: 'Paint' }), 'Краска');
    assert.equal(getStr({ en: 'Paint' }), 'Paint');
});

test('getStr falls back to the provided default when the object has no known keys', () => {
    assert.equal(getStr({}, 'Nomalum'), 'Nomalum');
});

test('formatTimestamp returns a placeholder for missing input', () => {
    assert.equal(formatTimestamp(null), "Yo'q");
    assert.equal(formatTimestamp(undefined), "Yo'q");
});

test('formatTimestamp formats a Firestore-like Timestamp (with .toDate())', () => {
    const fakeTimestamp = { toDate: () => new Date(Date.UTC(2026, 4, 13, 10, 0, 0)) };
    const result = formatTimestamp(fakeTimestamp);
    assert.equal(result, '13.05.2026');
});
