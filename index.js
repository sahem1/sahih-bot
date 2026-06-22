const express = require('express');
const { Telegraf } = require('telegraf');
const axios = require('axios');
const cheerio = require('cheerio');

// 1. تشغيل منفذ (Port) وهمي لإرضاء سيرفر Render وتجنب الخطأ الأحمر
const app = express();
const PORT = process.env.PORT || 10000;

app.get('/', (req, res) => {
    res.send('Bot is running safely!');
});

app.listen(PORT, () => {
    console.log(`Port binding active on port ${PORT}`);
});

// 2. قراءة توكن البوت بأمان من إعدادات الـ Environment في Render
const bot = new Telegraf(process.env.BOT_TOKEN);

// ترويسة احترافية تحاكي متصفح كمبيوتر حقيقي تماماً لتجاوز حظر المواقع
const AXIOS_CONFIG = {
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'ar,en-US;q=0.9,en;q=0.8',
        'Cache-Control': 'no-cache',
        'Referer': 'https://dorar.net/'
    },
    timeout: 10000 // مهلة 10 ثوانٍ لمنع تعليق السيرفر
};

// دالة البحث في الدرر السنية (طريقة السحب المباشر المعزز ضد الحظر)
async function searchDorar(query) {
    try {
        // استخدام رابط البحث المباشر للموسوعة الحديثية بدلاً من الـ API المعرض للحظر
        const url = `https://dorar.net/hadith/search?q=${encodeURIComponent(query)}&rawi%5B%5D=0`;
        const { data } = await axios.get(url, AXIOS_CONFIG);
        const $ = cheerio.load(data);
        
        // البحث عن أول صندوق يحتوي على الحديث في الموقع وتفريغه
        const firstResult = $('.hadith-box, .hadith, [id^="hadith"]').first();

        if (firstResult.length === 0) {
            return "ℹ️ لم يتم العثور على نتائج مطابقة في الموسوعة الحديثية للدرر السنية.";
        }

        // جلب نص الحديث والتخريج بدقة
        const matn = firstResult.find('.hadith').text().trim() || firstResult.text().substring(0, 200).trim();
        const info = firstResult.find('.hadith-info').text().trim().replace(/\s+/g, ' ') || "متاح عبر رابط المصدر";

        return `💬 **المتن:** "${matn}"\n📋 **التخريج:** ${info}\n🔗 [رابط المصدر](${url})`;
    } catch (e) {
        console.error("خطأ الدرر السنية:", e.message);
        return "⚠️ تعذر الاتصال بموقع الدرر السنية حالياً.";
    }
}

// دالة البحث في موقع صحيح الجامع (تم تصحيح الرابط إلى https الآمن)
async function searchSahihJami(query) {
    try {
        const url = `https://sahih-jami.com/index.php?search=${encodeURIComponent(query)}`;
        const { data } = await axios.get(url, AXIOS_CONFIG);
        const $ = cheerio.load(data);
        
        const hadithText = $('.hadith_text, .result_box, #content, body').first().text().trim();

        // فحص تقريبي للنصوص المستخرجة
        if (!hadithText || hadithText.length < 10) {
            return "ℹ️ لم يعثر على أحاديث للشيخ الألباني مطابقة لهذا النص.";
        }

        // تنظيف النص المستخرج وعرض أول جزء منه
        const cleanText = hadithText.replace(/\s+/g, ' ').substring(0, 350);
        return `💬 **الأحاديث المصفاة (الألباني):**\n"${cleanText}..."\n🔗 [رابط المصدر](${url})`;
    } catch (e) {
        console.error("خطأ صحيح الجامع:", e.message);
        return "⚠️ تعذر الاتصال بموقع صحيح الجامع بسبب قيود الحماية الآمنة.";
    }
}

// دالة البحث في منصة جامع السنة (تحديث طريقة التقاط النصوص المرنة)
async function searchSunnahOne(query) {
    try {
        const url = `https://www.sunnah.one/search?q=${encodeURIComponent(query)}`;
        const { data } = await axios.get(url, AXIOS_CONFIG);
        const $ = cheerio.load(data);
        
        // محاولة التقاط الكارد أو أي حاوية نصية بداخلها الحديث
        const firstCard = $('.hadith-card, .result-item, article, main').first();
        
        if (firstCard.length === 0 || firstCard.text().length < 20) {
            return "ℹ️ لم يتم العثور على نتائج في أمهات الكتب التسعة.";
        }

        const matn = firstCard.find('.hadith-text, p, span').first().text().trim() || firstCard.text().substring(0, 300).trim();
        const bookInfo = firstCard.find('.book-name, .source, h3').first().text().trim() || "جامع السنة";

        return `📚 **الكتاب:** ${bookInfo}\n💬 **المتن:** "${matn.substring(0, 350)}..."\n🔗 [رابط المصدر](${url})`;
    } catch (e) {
        console.error("خطأ جامع السنة:", e.message);
        return "⚠️ تعذر الاتصال بمنصة جامع السنة.";
    }
}

// رسالة الترحيب /start
bot.start((ctx) => {
    ctx.reply(
        `📌 **مرحباً بك في بوت (صحيح الاستشهاد)**\n\n` +
        `محرك بحث ذكي مخصص ومحصن للبحث في المصادر الشرعية والحديثية الموثوقة فقط.\n\n` +
        `🔍 **المصادر المدمجة الحالية:**\n` +
        `1. الدرر السنية (الموسوعة الحديثية المحدثة ضد الحظر)\n` +
        `2. صحيح الجامع (مؤلفات الشيخ الألباني عبر الرابط الآمن)\n` +
        `3. جامع الكتب التسعة (البخاري ومسلم والسنن)\n` +
        `4. جامع السنة (فلتر المتفق عليه)\n\n` +
        `✍️ أرسل الآن الحديث أو النص الشرعي المراد التحقق منه لبدء الفرز التلقائي.`
    );
});

// استقبال طلبات البحث
bot.on('text', async (ctx) => {
    const searchQuery = ctx.message.text.trim();

    if (searchQuery.length < 3) {
        return ctx.reply("⚠️ نص البحث قصير جداً، يرجى كتابة كلمة دلالية واضحة أو جزء من الحديث.");
    }

    const waitingMsg = await ctx.reply('🔍 جاري فحص وتدقيق النص في جميع المصادر الموثوقة بالتوازي... الرجاء الانتظار لثوانٍ معدودة.');

    try {
        const [dorarRes, sahihJamiRes, sunnahOneRes] = await Promise.all([
            searchDorar(searchQuery),
            searchSahihJami(searchQuery),
            searchSunnahOne(searchQuery)
        ]);

        let finalResponse = `📋 **نتائج التحقق والاستشهاد لـ:** "${searchQuery}"\n`;
        finalResponse += `===============================\n\n`;
        finalResponse += `🌐 **1. موقع الدرر السنية:**\n${dorarRes}\n\n`;
        finalResponse += `----------------------------------------\n\n`;
        finalResponse += `🦅 **2. موقع صحيح الجامع (الألباني):**\n${sahihJamiRes}\n\n`;
        finalResponse += `----------------------------------------\n\n`;
        finalResponse += `🕌 **3. جامع الكتب التسعة والسنة المتفق عليها:**\n${sunnahOneRes}\n\n`;
        finalResponse += `===============================\n`;
        finalResponse += `✨ تم الفرز والترتيب بواسطة بوت *صحيح الاستشهاد*.`;

        await ctx.telegram.editMessageText(
            ctx.chat.id, 
            waitingMsg.message_id, 
            null, 
            finalResponse, 
            { parse_mode: 'Markdown', disable_web_page_preview: true }
        );

    } catch (error) {
        console.error("خطأ عام في البوت:", error);
        ctx.telegram.editMessageText(ctx.chat.id, waitingMsg.message_id, null, '❌ عذراً، واجه المحرك خطأ غير متوقع أثناء تجميع البيانات.');
    }
});

// تشغيل البوت
bot.launch().then(() => {
    console.log('🚀 بوت صحيح الاستشهاد يعمل الآن بنجاح!');
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
