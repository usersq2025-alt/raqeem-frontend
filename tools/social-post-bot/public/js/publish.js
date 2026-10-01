import { $, api, app, confirmDialog, copyText, download, el, formatDate, icon, openDialog, toast } from './util.js';

const IG_LIMIT = 2200;
let ctx = null;   // {items, post, tags:[], busy}

function normalizeTag(text) {
  const tag = String(text).trim().replace(/\s+/g, '_').replace(/^#+/, '').replace(/[^\p{L}\p{N}_]/gu, '');
  return tag ? `#${tag}` : '';
}

function renderTags() {
  const box = $('pubTags');
  box.replaceChildren(...ctx.tags.map((tag, index) => el('span', { class: 'tag' }, tag,
    el('button', { type: 'button', 'aria-label': `حذف ${tag}`, onclick: () => { ctx.tags.splice(index, 1); renderTags(); updateCount(); } }, '×'))));
}

function fullCaption() {
  return [$('pubCaption').value.trim(), ctx.tags.join(' ')].filter(Boolean).join('\n\n');
}

function updateCount() {
  const length = fullCaption().length;
  const counter = $('pubCount');
  counter.textContent = `${length} / ${IG_LIMIT} (حد إنستغرام)`;
  counter.classList.toggle('over', length > IG_LIMIT && $('pubIg').checked);
}

function whenValue() { return document.querySelector('input[name=when]:checked').value; }

function pad(number) { return String(number).padStart(2, '0'); }
function toLocalInput(date) { return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`; }

function quickTimes() {
  const now = new Date();
  const at = (days, hour) => { const d = new Date(now); d.setDate(d.getDate() + days); d.setHours(hour, 0, 0, 0); return d; };
  const list = [
    ['بعد ساعة', new Date(now.getTime() + 3_600_000)],
    ['الليلة 8 م', at(0, 20)], ['غدًا 9 ص', at(1, 9)], ['غدًا 8 م', at(1, 20)],
  ];
  return list.filter(([, date]) => date.getTime() > now.getTime() + 60_000);
}

function syncWhen() {
  const mode = whenValue();
  $('pubSchedule').hidden = mode !== 'later';
  const meta = app.status?.meta;
  const connected = meta?.configured;
  $('pubConfirmLabel').textContent = mode === 'draft' ? 'حفظ المسودة' : mode === 'now' ? 'موافقة ونشر الآن' : 'موافقة وجدولة';
  if (mode === 'later' && !$('pubWhen').value) {
    const first = quickTimes()[0]?.[1] || new Date(Date.now() + 3_600_000);
    $('pubWhen').value = toLocalInput(first);
  }
  const manual = $('pubManual');
  if (!connected && mode !== 'draft') {
    manual.hidden = false;
    manual.className = 'notice';
    manual.replaceChildren(icon('alert'), el('span', { text: 'النشر المباشر غير متصل بعد. اختر «مسودة» لحفظ المنشور، أو انسخ الكابشن وحمّل الصورة وانشر يدويًا. خطوات الربط في «الإعدادات».' }));
  } else {
    manual.hidden = true;
  }
  $('pubConfirm').disabled = !connected && mode !== 'draft';
}

async function suggest(local) {
  const post = ctx.post || {};
  const button = local ? $('pubLocal') : $('pubAi');
  button.setAttribute('aria-busy', 'true');
  button.disabled = true;
  try {
    const payload = { title: post.title || '', body: post.body || '', idea: post.idea || '', local };
    if (!payload.title && !payload.body && !payload.idea) {
      toast('أضف عنوانًا أو نصًا في المنشور ليُكتب له كابشن، أو اكتب الكابشن بنفسك.', { type: 'warn' });
      return;
    }
    const result = await api('/ai/caption', { method: 'POST', json: payload });
    $('pubCaption').value = result.caption;
    ctx.tags = result.hashtags || [];
    renderTags();
    updateCount();
    if (result.warning) toast(`كُتب كابشن جاهز بدل الذكاء الاصطناعي: ${result.warning}`, { type: 'warn', timeout: 7000 });
  } catch (error) {
    toast(error.message, { type: 'bad' });
  } finally {
    button.removeAttribute('aria-busy');
    button.disabled = false;
  }
}

export async function openPublish({ items, post = {} }) {
  const meta = app.status?.meta;
  ctx = { items, post, tags: [] };
  const first = items[0];
  const existingCaption = first.caption || '';
  $('pubCaption').value = existingCaption;
  ctx.tags = [...(first.hashtags || [])];
  $('pubThumbs').replaceChildren(...items.map(item => el('img', { src: `/api/history/${item.id}/thumb`, alt: item.title || 'المنشور' })));
  $('pubHint').textContent = items.length > 1
    ? `منشور متعدد الصور (${items.length}). يُنشر كألبوم/كاروسيل.`
    : 'إنستغرام يستقبل الصورة بصيغة JPEG تلقائيًا (يحوّلها البوت).';
  $('pubTagInput').value = '';
  document.querySelector('input[name=when][value=draft]').checked = true;
  $('pubWhen').value = '';
  $('pubFb').checked = Boolean(meta?.facebook?.ready);
  $('pubIg').checked = Boolean(meta?.instagram?.ready);
  $('pubFb').disabled = !meta?.facebook?.ready;
  $('pubIg').disabled = !meta?.instagram?.ready;
  $('pubFbNote').textContent = meta?.facebook?.ready ? '' : '(غير متصل)';
  $('pubIgNote').textContent = meta?.instagram?.ready ? '' : '(غير متصل)';
  $('pubFb').title = meta?.facebook?.reason || '';
  $('pubIg').title = meta?.instagram?.reason || '';
  renderTags();
  $('pubQuick').replaceChildren(...quickTimes().map(([label, date]) => el('button', {
    type: 'button', class: 'btn soft small', onclick: () => { $('pubWhen').value = toLocalInput(date); },
  }, label)));
  syncWhen();
  updateCount();
  openDialog('publishDialog');
  // كابشن جاهز تلقائيًا إن لم يوجد: يوفّر الكتابة للمنشورات النصية.
  if (!existingCaption && (post.title || post.body)) await suggest(true);
}

async function confirmAndSubmit() {
  const mode = whenValue();
  const targets = [$('pubFb').checked && 'facebook', $('pubIg').checked && 'instagram'].filter(Boolean);
  const caption = $('pubCaption').value.trim();
  if (mode !== 'draft' && !targets.length) { toast('اختر منصة واحدة على الأقل.', { type: 'warn' }); return; }
  if (!targets.length) targets.push('facebook');
  if (mode !== 'draft' && !caption) {
    const ok = await confirmDialog({ title: 'بدون كابشن؟', message: 'لم تكتب كابشنًا. هل تريد النشر بدونه؟', confirmText: 'انشر بدون كابشن' });
    if (!ok) return;
  }
  let scheduledAt;
  if (mode === 'later') {
    const value = $('pubWhen').value;
    if (!value || Date.parse(value) < Date.now()) { toast('اختر موعدًا قادمًا للنشر.', { type: 'warn' }); return; }
    scheduledAt = new Date(value).toISOString();
  }
  if (mode !== 'draft') {
    const names = targets.map(target => (target === 'facebook' ? 'فيسبوك' : 'إنستغرام')).join(' و');
    const ok = await confirmDialog({
      title: mode === 'now' ? 'تأكيد النشر الآن' : 'تأكيد الجدولة',
      message: mode === 'now'
        ? `سيُنشر المنشور فورًا على ${names} وسيظهر لمتابعيك. هل أنت متأكد؟`
        : `سيُنشر المنشور على ${names} في ${formatDate(scheduledAt)}.`,
      confirmText: mode === 'now' ? 'انشر الآن' : 'جدولة',
    });
    if (!ok) return;
  }
  const button = $('pubConfirm');
  button.disabled = true;
  try {
    for (const item of ctx.items) await api(`/api/history/${item.id}`, { method: 'PATCH', json: { caption, hashtags: ctx.tags } });
    await api('/api/queue', {
      method: 'POST',
      json: {
        historyIds: ctx.items.map(item => item.id), targets, caption, hashtags: ctx.tags,
        scheduledAt: scheduledAt || null, approve: mode !== 'draft',
      },
    });
    $('publishDialog').close();
    toast(mode === 'draft' ? 'حُفظت المسودة في «الجدولة» بانتظار موافقتك.' : mode === 'now' ? 'بدأ النشر. تابع الحالة في «الجدولة».' : 'تمت الجدولة.', {
      type: 'ok', action: { label: 'فتح الجدولة', run: () => document.querySelector('[data-tab=queue]').click() },
    });
    document.dispatchEvent(new Event('queue-changed'));
  } catch (error) {
    toast(error.message, { type: 'bad', timeout: 8000 });
  } finally {
    button.disabled = false;
    syncWhen();
  }
}

export function initPublish() {
  $('pubCancel').addEventListener('click', () => $('publishDialog').close());
  $('pubAi').addEventListener('click', () => suggest(false));
  $('pubLocal').addEventListener('click', () => suggest(true));
  $('pubCaption').addEventListener('input', updateCount);
  $('pubFb').addEventListener('change', updateCount);
  $('pubIg').addEventListener('change', updateCount);
  document.querySelectorAll('input[name=when]').forEach(input => input.addEventListener('change', syncWhen));
  $('pubTagInput').addEventListener('keydown', event => {
    if (event.key !== 'Enter' && event.key !== ',') return;
    event.preventDefault();
    for (const part of event.target.value.split(/[,\s]+/)) {
      const tag = normalizeTag(part);
      if (tag && !ctx.tags.includes(tag) && ctx.tags.length < 30) ctx.tags.push(tag);
    }
    event.target.value = '';
    renderTags();
    updateCount();
  });
  $('pubCopy').addEventListener('click', async () => {
    toast((await copyText(fullCaption())) ? 'نُسخ الكابشن مع الوسوم.' : 'تعذر النسخ.', { type: 'ok', timeout: 2500 });
  });
  $('pubConfirm').addEventListener('click', confirmAndSubmit);
}
