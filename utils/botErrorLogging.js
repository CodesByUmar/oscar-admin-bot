// Kodning ko'p joyida bot.sendMessage/editMessageText/... natijasi
// await/catch qilinmasdan chaqiriladi ("fire-and-forget"). Xato bo'lsa
// (masalan "message is not modified", "chat not found", bot bloklangan)
// hech qanday try/catch uni ushlamaydi va u faqat global
// unhandledRejection'ga tushib, jim console'ga yozilib qolar edi (yoki
// hatto u ham yo'q edi) — adminga yoki loglarga aniq signal bermas edi.
//
// Har bir chaqiruv joyini alohida await/catch bilan o'rab chiqish o'nlab
// faylga tegishi va xato qilish xavfini oshirishi mumkin edi. Shuning
// o'rniga, bot instansiyasining o'ziga bir marta "log qiluvchi" wrapper
// qo'yiladi — endi HAR BIR chaqiruvning xatosi (kim uni ushlagan yoki
// yo'qligidan qat'iy nazar) kamida konsolga (Railway loglariga) yoziladi.
// Chaqiruvchi tomon o'zi alohida .catch()/try-catch qo'shsa, u ham
// odatdagidek ishlayveradi — bu wrapper faqat QO'SHIMCHA log qo'shadi,
// asl promise'ni almashtirmaydi.
function silenceUnhandledRejections(bot, label) {
    const methodsToWrap = ['sendMessage', 'editMessageText', 'editMessageReplyMarkup', 'answerCallbackQuery'];
    methodsToWrap.forEach((method) => {
        const original = bot[method] && bot[method].bind(bot);
        if (!original) return;
        bot[method] = (...args) => {
            const result = original(...args);
            if (result && typeof result.catch === 'function') {
                result.catch((error) => {
                    console.error(`${label} ${method} xato:`, error.message);
                });
            }
            return result;
        };
    });
}

module.exports = { silenceUnhandledRejections };
