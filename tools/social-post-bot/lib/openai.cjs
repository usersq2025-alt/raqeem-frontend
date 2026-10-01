const sharp = require('sharp');

function fail(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

const sleep = (ms, signal) => new Promise((resolve, reject) => {
  const timer = setTimeout(resolve, ms);
  signal?.addEventListener('abort', () => { clearTimeout(timer); reject(fail(499, 'أُلغي الطلب.')); }, { once: true });
});

const RETRYABLE = new Set([408, 409, 429, 500, 502, 503, 504]);

function describeFailure(status, apiMessage) {
  if (status === 401) return 'مفتاح OpenAI غير صالح. راجع OPENAI_API_KEY في ملف .env.';
  if (status === 403) return 'حساب OpenAI لا يملك صلاحية استخدام هذا النموذج.';
  if (status === 429) return 'تجاوزت حد الاستخدام أو الرصيد في OpenAI. انتظر قليلًا أو راجع الرصيد.';
  if (status >= 500) return 'خدمة OpenAI مشغولة حاليًا. حاول بعد قليل.';
  return apiMessage || `رفضت خدمة OpenAI الطلب (رمز ${status}).`;
}

// عميل OpenAI: إعادة محاولة ذكية، نماذج بديلة، وإلغاء عند انقطاع المتصفح.
function createOpenAI({ getConfig, getKey = () => process.env.OPENAI_API_KEY, fetchImpl = (...args) => fetch(...args), logger, sleepImpl = sleep }) {
  const config = () => getConfig();

  function requireKey() {
    const key = getKey();
    if (!key) throw fail(503, 'مفتاح OpenAI غير موجود. ضعه في ملف .env (OPENAI_API_KEY) ثم أعد تشغيل البوت.');
    return key;
  }

  // يعيد الاستجابة الناجحة، أو يرمي خطأً. لا يعيد المحاولة عند 4xx (عدا 429).
  async function call(url, makeInit, { signal, timeoutMs = 60_000, retries = 2 } = {}) {
    const key = requireKey();
    let lastError;
    for (let attempt = 0; attempt <= retries; attempt++) {
      if (signal?.aborted) throw fail(499, 'أُلغي الطلب.');
      const timeout = AbortSignal.timeout(timeoutMs);
      const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;
      let response;
      try {
        const init = makeInit();
        response = await fetchImpl(url, { ...init, headers: { ...(init.headers || {}), Authorization: `Bearer ${key}` }, signal: combined });
      } catch (error) {
        if (signal?.aborted) throw fail(499, 'أُلغي الطلب.');
        lastError = error.name === 'TimeoutError'
          ? fail(504, `انتهت مهلة OpenAI (${Math.round(timeoutMs / 60000 * 10) / 10} دقيقة).`)
          : fail(502, 'تعذر الاتصال بخدمة OpenAI. تحقق من الإنترنت.');
        if (attempt < retries && error.name !== 'TimeoutError') {
          await sleepImpl(1000 * 3 ** attempt, signal);
          continue;
        }
        throw lastError;
      }
      if (response.ok) return response;
      const body = await response.json().catch(() => ({}));
      const apiMessage = body?.error?.message;
      lastError = fail(response.status === 401 || response.status === 403 ? response.status : (response.status === 429 ? 429 : 502),
        describeFailure(response.status, apiMessage));
      lastError.upstreamStatus = response.status;
      lastError.upstreamMessage = apiMessage;
      logger?.warn(`OpenAI ${response.status} (محاولة ${attempt + 1})`, apiMessage);
      if (!RETRYABLE.has(response.status) || attempt === retries) throw lastError;
      const retryAfter = Number(response.headers?.get?.('retry-after'));
      await sleepImpl(Math.min(15_000, (Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 1000 * 3 ** attempt)), signal);
    }
    throw lastError;
  }

  // يجرّب النماذج بالترتيب. الأخطاء الحاسمة (مفتاح/رصيد/إلغاء) لا تُجرَّب لها بدائل.
  async function withModels(models, task) {
    let lastError;
    for (const model of models) {
      try {
        return { ...(await task(model)), model };
      } catch (error) {
        lastError = error;
        if ([401, 403, 429, 499, 503, 504].includes(error.status)) throw error;
        logger?.warn(`فشل النموذج ${model}، تجربة البديل`, error.message);
      }
    }
    throw lastError || fail(502, 'لا توجد نماذج مضبوطة.');
  }

  async function editImage(imageBytes, quality, { signal } = {}) {
    requireKey();
    let normalized;
    try {
      normalized = await sharp(imageBytes).rotate().resize({ width: 2048, height: 2048, fit: 'inside', withoutEnlargement: true }).png().toBuffer();
    } catch {
      throw fail(415, 'تعذرت قراءة الصورة. استخدم JPG أو PNG أو WebP (صور HEIC من الآيفون تحتاج تصديرًا إلى JPG).');
    }
    const settings = config().imageEdit;
    return withModels(config().models.imageEdit, async model => {
      const response = await call('https://api.openai.com/v1/images/edits', () => {
        const form = new FormData();
        form.append('model', model);
        form.append('image', new Blob([normalized], { type: 'image/png' }), 'photo.png');
        form.append('size', settings.size);
        form.append('quality', quality);
        form.append('output_format', 'png');
        form.append('prompt', settings.prompt);
        return { method: 'POST', body: form };
      }, { signal, timeoutMs: settings.timeoutMs, retries: 1 });
      const result = await response.json().catch(() => ({}));
      const encoded = result?.data?.[0]?.b64_json;
      if (!encoded) throw fail(502, 'لم تُرجع خدمة تحسين الصور نتيجة.');
      return { buffer: Buffer.from(encoded, 'base64') };
    });
  }

  const ILLUSTRATION_STYLE = [
    'A glossy 3D sticker-style illustration with a thick soft white outline, friendly and child-safe,',
    'rich navy blue and golden yellow color palette with small orange accents, soft studio lighting,',
    'centered single subject, clean transparent background, absolutely no text, no letters, no numbers, no watermark.',
    'Subject:',
  ].join(' ');

  async function illustrate(scene, quality, { signal } = {}) {
    requireKey();
    return withModels(config().models.illustration, async model => {
      const send = async transparent => {
        const response = await call('https://api.openai.com/v1/images/generations', () => ({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model, prompt: `${ILLUSTRATION_STYLE} ${scene}`, size: '1024x1024', quality, output_format: 'png',
            ...(transparent ? { background: 'transparent' } : {}),
          }),
        }), { signal, timeoutMs: 150_000, retries: 1 });
        const result = await response.json().catch(() => ({}));
        const encoded = result?.data?.[0]?.b64_json;
        if (!encoded) throw fail(502, 'لم تُرجع خدمة الرسم نتيجة.');
        return Buffer.from(encoded, 'base64');
      };
      try {
        return { buffer: await send(true) };
      } catch (error) {
        // بعض النماذج ترفض الخلفية الشفافة: نعيد المحاولة بدونها.
        if (error.upstreamStatus === 400) return { buffer: await send(false) };
        throw error;
      }
    });
  }

  function parseJson(content) {
    const cleaned = String(content || '').replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    try { return JSON.parse(cleaned); } catch { throw fail(502, 'تعذر فهم رد الذكاء الاصطناعي. حاول مرة أخرى.'); }
  }

  async function chatJson(system, user, { signal, kind = 'text' } = {}) {
    requireKey();
    const result = await withModels(config().models.text, async model => {
      const response = await call('https://api.openai.com/v1/chat/completions', () => ({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          response_format: { type: 'json_object' },
          messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
        }),
      }), { signal, timeoutMs: 60_000, retries: 2 });
      const body = await response.json().catch(() => ({}));
      return { data: parseJson(body?.choices?.[0]?.message?.content) };
    });
    return result.data;
  }

  const clip = (value, max) => String(value ?? '').replace(/\r/g, '').trim().slice(0, max);

  async function writePost(idea, { signal } = {}) {
    const data = await chatJson(
      [
        'أنت كاتب محتوى لمنصة «رقيم» التعليمية للأطفال. اكتب بالعربية الفصحى المبسطة بأسلوب ودود موجّه للأهل والأطفال.',
        'لا تخترع أرقامًا أو تواريخ أو أسعارًا أو وعودًا غير مذكورة في فكرة المستخدم.',
        'أعد JSON فقط بالحقول: title (عنوان قصير حتى 45 حرفًا)، body (نص حتى 380 حرفًا، الفقرات تُفصل بسطر فارغ)،',
        'footer (سطر ختامي حتى 40 حرفًا أو نص فارغ)، illustration (وصف بالإنجليزية لرسمة واحدة مناسبة للمنشور، بلا أي نص مكتوب داخلها).',
      ].join(' '),
      idea, { signal },
    );
    return {
      title: clip(data.title, 120), body: clip(data.body, 900),
      footer: clip(data.footer, 60), illustration: clip(data.illustration, 400),
    };
  }

  async function writeCaption({ title = '', body = '', idea = '', brand = {} }, { signal } = {}) {
    const data = await chatJson(
      [
        'أنت مسؤول سوشال ميديا لمنصة «رقيم» التعليمية للأطفال. اكتب كابشن عربيًا جذابًا لمنشور إنستغرام وفيسبوك.',
        'ابدأ بجملة جاذبة، ثم سطرين أو ثلاثة، ثم دعوة للتفاعل. لا تخترع أرقامًا أو تواريخ أو عروضًا.',
        `سطر الدعوة الثابت إن وُجد يُضاف كما هو: "${brand.cta || ''}".`,
        'أعد JSON فقط بالحقول: caption (النص دون هاشتاقات، حتى 900 حرف)، hashtags (مصفوفة من 5 إلى 8 وسوم عربية بدون مسافات).',
      ].join(' '),
      `العنوان: ${title}\nالنص: ${body}\nالفكرة: ${idea}`, { signal },
    );
    return {
      caption: clip(data.caption, 2000),
      hashtags: Array.isArray(data.hashtags) ? data.hashtags.map(tag => clip(tag, 60)).filter(Boolean) : [],
    };
  }

  return { editImage, illustrate, writePost, writeCaption, hasKey: () => Boolean(getKey()) };
}

module.exports = { createOpenAI };
