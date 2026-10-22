import { $, api, app, button, copyText, el, formatDate, icon, money, toast } from './util.js';

function card(title, ...children) {
  return el('section', { class: 'card' }, el('h2', { text: title }), children);
}

function meter(value, max) {
  const percent = Math.min(100, Math.round((value / Math.max(1, max)) * 100));
  return el('div', { class: `meter${percent >= 85 ? ' hot' : ''}`, role: 'progressbar', 'aria-valuenow': String(value), 'aria-valuemax': String(max) }, el('i', { style: `width:${percent}%` }));
}

const kv = (key, value) => el('div', { class: 'kv' }, el('span', { text: key }), el('b', { text: value }));
const pill = (text, cls) => el('span', { class: `pill ${cls}`, text });

async function healthCard() {
  const list = el('ul', { class: 'checks' });
  const box = card('حالة النظام', list);
  const run = async () => {
    list.replaceChildren(el('li', { text: 'جاري الفحص…' }));
    try {
      const data = await api('/api/health');
      list.replaceChildren(...data.checks.map(check => el('li', {},
        el('span', { class: check.ok ? 'ok' : 'bad' }, icon(check.ok ? 'check' : 'alert')),
        el('span', {}, check.name, check.detail ? el('small', { class: 'muted', text: ` — ${check.detail}` }) : null))));
      box.querySelector('h2').textContent = data.ok ? 'حالة النظام: سليمة' : 'حالة النظام: يوجد ما يحتاج إصلاحًا';
    } catch (error) { list.replaceChildren(el('li', { class: 'bad', text: error.message })); }
  };
  box.append(el('div', { class: 'row' }, button('أعد الفحص', { iconName: 'refresh', onclick: run })));
  await run();
  return box;
}

function usageCard(usage, settings) {
  const daily = el('input', { type: 'number', min: '1', max: '500', value: String(settings.limits.dailyAiCalls), id: 'setDaily' });
  const monthly = el('input', { type: 'number', min: '1', max: '5000', value: String(settings.limits.monthlyBudgetUsd), id: 'setMonthly' });
  return card('الذكاء الاصطناعي والاستهلاك',
    el('div', { class: 'row' }, pill(app.status?.aiAvailable ? 'مفتاح OpenAI: موجود' : 'مفتاح OpenAI: غير مضبوط', app.status?.aiAvailable ? 'ok' : 'warn')),
    el('p', { class: 'hint', text: `طلبات اليوم: ${usage.today.calls} من ${usage.dailyAiCalls} (≈ ${money(usage.today.cost)})` }), meter(usage.today.calls, usage.dailyAiCalls),
    el('p', { class: 'hint', text: `تكلفة هذا الشهر التقريبية: ${money(usage.monthCost)} من ${money(usage.monthlyBudgetUsd)}` }), meter(usage.monthCost, usage.monthlyBudgetUsd),
    el('p', { class: 'hint', text: 'التقدير مبني على أسعار تقريبية في config.json؛ الفاتورة الفعلية في لوحة OpenAI.' }),
    el('div', { class: 'field' }, el('label', { for: 'setDaily', text: 'الحد اليومي لطلبات الذكاء الاصطناعي' }), daily),
    el('div', { class: 'field' }, el('label', { for: 'setMonthly', text: 'الميزانية الشهرية (دولار)' }), monthly),
    button('حفظ الحدود', { cls: 'primary', onclick: async () => {
      try {
        await api('/api/settings', { method: 'POST', json: { limits: { dailyAiCalls: daily.value, monthlyBudgetUsd: monthly.value } } });
        toast('حُفظت الحدود.', { type: 'ok', timeout: 2500 });
        app.refreshUsage?.();
        render();
      } catch (error) { toast(error.message, { type: 'bad' }); }
    } }),
    el('p', { class: 'hint', text: `النماذج: صور ${settings.models.imageEdit.join(' ← ')} · نص ${settings.models.text.join(' ← ')}` }));
}

function brandCard(settings) {
  const tags = [...settings.brand.hashtags];
  const box = el('div', { class: 'tags' });
  const draw = () => box.replaceChildren(...tags.map((tag, index) => el('span', { class: 'tag' }, tag, el('button', { type: 'button', 'aria-label': `حذف ${tag}`, onclick: () => { tags.splice(index, 1); draw(); } }, '×'))));
  draw();
  const input = el('input', { type: 'text', placeholder: 'اكتب وسمًا واضغط Enter', 'aria-label': 'وسم جديد' });
  input.addEventListener('keydown', event => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    const tag = `#${input.value.trim().replace(/\s+/g, '_').replace(/^#+/, '')}`;
    if (tag.length > 1 && !tags.includes(tag)) tags.push(tag);
    input.value = '';
    draw();
  });
  const cta = el('textarea', { rows: '2', maxlength: '200', placeholder: 'مثال: سجّل الآن عبر الرابط في السيرة الذاتية' });
  cta.value = settings.brand.cta || '';
  return card('هوية المنشورات',
    el('p', { class: 'hint', text: 'تُضاف هذه الوسوم تلقائيًا للكابشن الجاهز، وتُستخدم الدعوة كسطر ختامي.' }),
    el('div', { class: 'field' }, el('label', { text: 'الوسوم الافتراضية' }), box, input),
    el('div', { class: 'field' }, el('label', { text: 'سطر الدعوة للإجراء (اختياري)' }), cta),
    button('حفظ الهوية', { cls: 'primary', onclick: async () => {
      try { await api('/api/settings', { method: 'POST', json: { brand: { hashtags: tags, cta: cta.value } } }); toast('حُفظت الهوية.', { type: 'ok', timeout: 2500 }); } catch (error) { toast(error.message, { type: 'bad' }); }
    } }));
}

function metaCard(meta) {
  const line = (name, status) => el('div', { class: 'kv' }, el('span', { text: name }), status.ready ? pill('جاهز', 'ok') : pill('غير متصل', 'warn'));
  const nodes = [
    meta.dryRun ? el('div', { class: 'notice' }, icon('alert'), el('span', { text: 'الوضع التجريبي مفعّل: لا يُنشر شيء فعليًا.' })) : null,
    line('فيسبوك (الصفحة)', meta.facebook), meta.facebook.reason ? el('p', { class: 'hint', text: meta.facebook.reason }) : null,
    line('إنستغرام (حساب أعمال)', meta.instagram), meta.instagram.reason ? el('p', { class: 'hint', text: meta.instagram.reason }) : null,
    meta.token.expiresAt ? kv('انتهاء التوكن', `${formatDate(meta.token.expiresAt)} (${meta.token.daysLeft} يومًا)`) : null,
    meta.token.refreshedAt ? kv('آخر تجديد', formatDate(meta.token.refreshedAt)) : null,
    meta.token.canRefresh ? el('div', { class: 'row' }, button('جدّد التوكن الآن', { iconName: 'refresh', onclick: async () => {
      try { await api('/api/meta/refresh', { method: 'POST', json: {} }); toast('جُدّد التوكن.', { type: 'ok' }); app.refreshStatus?.(); render(); } catch (error) { toast(error.message, { type: 'bad', timeout: 8000 }); }
    } })) : el('p', { class: 'hint', text: 'التجديد التلقائي يحتاج META_USER_TOKEN و META_APP_ID و META_APP_SECRET.' }),
    el('details', { class: 'guide' }, el('summary', { text: 'كيف أربط فيسبوك وإنستغرام؟' }), el('ol', {},
      el('li', { text: 'أنشئ تطبيقًا من نوع Business في developers.facebook.com وأضف منتجات Facebook Login for Business و Instagram.' }),
      el('li', { text: 'اربط حساب إنستغرام (نوع أعمال/Creator) بصفحة فيسبوك التي تديرها.' }),
      el('li', { text: 'أنشئ توكن مستخدم طويل الأجل بصلاحيات: pages_manage_posts و pages_read_engagement و pages_show_list و instagram_basic و instagram_content_publish.' }),
      el('li', {}, 'ضع في ملف ', el('code', { text: '.env' }), ' القيم: META_PAGE_ID و META_PAGE_TOKEN و META_IG_USER_ID، وللتجديد التلقائي META_USER_TOKEN و META_APP_ID و META_APP_SECRET.'),
      el('li', {}, 'إنستغرام يقرأ الصورة من رابط عام: شغّل نفقًا (مثل Cloudflare Tunnel) يشير إلى ', el('code', { text: 'http://127.0.0.1:4567' }), ' وضع عنوانه في RAQEEM_PUBLIC_BASE_URL. لا يُكشف سوى روابط الصور المؤقتة العشوائية.'),
      el('li', { text: 'أعد تشغيل البوت. جرّب أولًا بـ RAQEEM_META_DRY_RUN=1 للتأكد من سير العمل دون نشر فعلي.' })))];
  return card('ربط المنصات (Meta)', nodes);
}

async function logCard() {
  const pre = el('pre', { class: 'log', tabindex: '0' });
  const load = async () => {
    try { const data = await api('/api/logs?n=120'); pre.textContent = data.lines.join('\n') || 'السجل فارغ.'; pre.scrollTop = pre.scrollHeight; } catch (error) { pre.textContent = error.message; }
  };
  const box = card('سجل البوت (آخر الأسطر)', el('div', { class: 'row' },
    button('تحديث', { iconName: 'refresh', onclick: load }),
    button('نسخ', { iconName: 'copy', onclick: async () => toast((await copyText(pre.textContent)) ? 'نُسخ السجل.' : 'تعذر النسخ.', { type: 'ok', timeout: 2000 }) })), pre);
  await load();
  return box;
}

function filesCard(settings, usage) {
  return card('الملفات والإصدار',
    kv('الإصدار', settings.version), kv('المنفذ', String(settings.port)),
    kv('مجلد البيانات', usage.disk.dataDir), kv('حجم الصور المحفوظة', `${(usage.disk.bytes / 1024 / 1024).toFixed(1)} م.ب`),
    el('p', { class: 'hint' }, 'مفتاح OpenAI وبيانات Meta تُضبط في ملف ', el('code', { text: '.env' }), ' داخل مجلد البوت (نفّذ edit-settings.cmd لفتحه)، ثم أعد تشغيل البوت.'));
}

export async function render() {
  const body = $('settingsBody');
  try {
    const [settings, usage, meta] = await Promise.all([api('/api/settings'), api('/api/usage'), api('/api/meta/status')]);
    body.replaceChildren(await healthCard(), usageCard(usage, settings), brandCard(settings), metaCard(meta), filesCard(settings, usage), await logCard());
  } catch (error) {
    body.replaceChildren(el('div', { class: 'notice bad' }, icon('alert'), el('span', { text: error.message })));
  }
}

export function initSettings() {
  return { show: render };
}
