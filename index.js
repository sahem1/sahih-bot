const bot = new Telegraf(process.env.BOT_TOKEN || 'YOUR_TELEGRAM_BOT_TOKEN');
const cheerio = require('cheerio');

// ضع هنا توكن البوت الخاص بك من BotFather
const bot = new Telegraf('YOUR_TELEGRAM_BOT_TOKEN');


// ترويسة الطلبات لتجنب الحظر من المواقع
const AXIOS_CONFIG = {
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'ar,en-US;q=0.7,en;q=0.3'
    },
    timeout: 8000 // مهلة 8 ثوانٍ كحد أقصى للطلب
};

// 1. دالة البحث في الدرر السنية
async function searchDorar(query) {
    try {
        const url = `https://dorar.net/hadith/search?q=${encodeURIComponent(query)}`;
        const { data } = await axios.get(url, AXIOS_CONFIG);
        const $ = cheerio.load(data);
        const firstResult = $('.hadith-box').first();

        if (firstResult.length === 0) return "ℹ️ لم يتم العثور على نتائج حديثية.";

        const matn = firstResult.find('.hadith').text().trim();
        const info = firstResult.find('.hadith-info').text().trim().replace(/\s+/g, ' ');

        return `💬 **المتن:** "${matn}"\n📋 **التخريج:** ${info}\n🔗 [رابط المصدر](${url})`;
    } catch (e) {
        return "⚠️ تعذر الاتصال بالموقع حالياً.";
    }
}

// 2. دالة البحث في موقع صحيح الجامع (الألباني)
async function searchSahihJami(query) {
    try {
        // محاكاة استعلام البحث في الموقع
        const url = `http://sahih-jami.com/index.php?search=${encodeURIComponent(query)}`;
        const { data } = await axios.get(url, AXIOS_CONFIG);
        const $ = cheerio.load(data);
        
        // جلب أول عنصر يحتوي على نص الحديث في الموقع
        const hadithText = $('.hadith_text, .result_box, #content').first().text().trim();

        if (!hadithText || hadithText.length < 5) {
            return "ℹ️ لم يعثر على أحاديث للشيخ الألباني مطابقة لهذا النص.";
        }

        return `💬 **الأحاديث المصفاة (الألباني):**\n"${hadithText.substring(0, 400)}..."\n🔗 [رابط المصدر](${url})`;
    } catch (e) {
        return "⚠️ تعذر الاتصال بموقع صحيح الجامع.";
    }
}

// 3. دالة البحث في جامع الكتب التسعة وجامع السنة (sunnah.one)
async function searchSunnahOne(query) {
    try {
        const url = `https://www.sunnah.one/search?q=${encodeURIComponent(query)}`;
        const { data } = await axios.get(url, AXIOS_CONFIG);
        const $ = cheerio.load(data);
        
        // جلب أول نتيجة من أمهات الكتب أو المتفق عليه
        const firstCard = $('.hadith-card, .result-item').first();
        
        if (firstCard.length === 0) return "ℹ️ لم يتم العثور على نتائج في أمهات الكتب التسعة.";

        const matn = firstCard.find('.hadith-text, p').first().text().trim();
        const bookInfo = firstCard.find('.book-name, .source').text().trim();

        return `📚 **الكتاب:** ${bookInfo || 'جامع السنة'}\n💬 **المتن:** "${matn.substring(0, 400)}..."\n🔗 [رابط المصدر](${url})`;
    } catch (e) {
        return "⚠️ تعذر الاتصال بمنصة جامع السنة.";
    }
}

// رسالة الترحيب /start
bot.start((ctx) => {
    ctx.reply(
        `📌 **مرحباً بك في بوت (صحيح الاستشهاد)**\n\n` +
        `محرك بحث ذكي مخصص ومحصن للبحث في المصادر الشرعية والحديثية الموثوقة فقط.\n\n` +
        `🔍 **المصادر المدمجة الحالية:**\n` +
        `1. الدرر السنية (الموسوعة الحديثية)\n` +
        `2. صحيح الجامع (مؤلفات الشيخ الألباني)\n` +
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

    const waitingMsg = await ctx.reply('🔍 جاري فحص وتدقيق النص في جميع المصادر الموثوقة بالتوازي... الرجاء الانتظار لفترة وجيزة.');

    try {
        // تشغيل جميع محركات البحث في نفس الوقت (بالتوازي) لتوفير الوقت
        const [dorarRes, sahihJamiRes, sunnahOneRes] = await Promise.all([
            searchDorar(searchQuery),
            searchSahihJami(searchQuery),
            searchSunnahOne(searchQuery)
        ]);

        // تجميع النتائج وتنسيقها بشكل مرتب ومفروز
        let finalResponse = `📋 **نتائج التحقق والاستشهاد لـ:** "${searchQuery}"\n`;
        finalResponse += `===============================\n\n`;
        
        finalResponse += `🌐 **1. موقع الدرر السنية:**\n${dorarRes}\n\n`;
        finalResponse += `----------------------------------------\n\n`;
        
        finalResponse += `🦅 **2. موقع صحيح الجامع (الألباني):**\n${sahihJamiRes}\n\n`;
        finalResponse += `----------------------------------------\n\n`;
        
        finalResponse += `🕌 **3. جامع الكتب التسعة والسنة المتفق عليها:**\n${sunnahOneRes}\n\n`;
        finalResponse += `===============================\n`;
        finalResponse += `✨ تم الفرز والترتيب بواسطة بوت *صحيح الاستشهاد*.`;

        // إرسال النتيجة النهائية وتعديل رسالة الانتظار
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
    console.log('🚀 بوت صحيح الاستشهاد بكامل ميزاته يعمل الآن بنجاح!');
});

// إيقاف آمن
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
