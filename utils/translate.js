// Gemini API orqali mahsulot nomi/tavsifini o'zbekchadan ruscha/inglizchaga
// avtomatik tarjima qilish. Admin faqat UZ matnni kiritadi — RU/EN
// ko'rinmasdan, avtomatik to'ldiriladi.
const MODEL = process.env.GEMINI_MODEL || 'gemini-3.6-flash';

async function translateText(text, targetLangLabel) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || !text) return null;
    try {
        const prompt =
            `Translate the following e-commerce product text from Uzbek to ${targetLangLabel}. ` +
            `Reply with ONLY the translation itself — no quotes, no explanation, no extra text.\n\n` +
            `Text: ${text}`;
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-goog-api-key': apiKey },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
            signal: AbortSignal.timeout(15000),
        });
        if (!res.ok) {
            console.error('Gemini tarjima xatosi:', res.status, await res.text().catch(() => ''));
            return null;
        }
        const data = await res.json();
        const part = data.candidates?.[0]?.content?.parts?.find((p) => p.text);
        return part ? part.text.trim() : null;
    } catch (error) {
        console.error('Gemini tarjima xatosi:', error.message);
        return null;
    }
}

// UZ matndan RU va EN'ni PARALLEL (bir vaqtda) so'raydi — ketma-ket
// so'ralsa, admin ikki barobar ko'proq kutgan bo'lardi.
async function translateToRuEn(uzText) {
    const [ru, en] = await Promise.all([
        translateText(uzText, 'Russian'),
        translateText(uzText, 'English'),
    ]);
    return { ru: ru || '', en: en || '' };
}

module.exports = { translateText, translateToRuEn };
