import { $, api, app, button, confirmDialog, el, formatDate, icon, openDialog, relativeTime, toast } from './util.js';

let items = [];
let known = new Map();
let timer;
let editing = null;
const PLATFORM = { facebook: 'فيسبوك', instagram: 'إنستغرام' };
const STATUS = {
  draft: ['pill', 'بانتظار موافقتك'], approved: ['pill info', 'مجدول'], publishing: ['pill warn', 'جاري النشر…'],
  published: ['pill ok', 'نُشر'], failed: ['pill bad', 'تعذر النشر'], missed: ['pill warn', 'فات موعده'], cancelled: ['pill', 'ملغى'],
};
const pad = n => String(n).padStart(2, '0');
const toLocalInput = date => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;

function titleOf(item) {
  const first = String(item.caption || '').split('\n')[0].trim();
  return first ? first.slice(0, 70) : `منشور (${item.historyIds.length} ${item.historyIds.length > 1 ? 'صور' : 'صورة'})`;
}

async function act(path, options, success) {
  try {
    await api(path, options);
    if (success) toast(success, { type: 'ok', timeout: 3000 });
  } catch (error) {
    toast(error.message, { type: 'bad', timeout: 8000 });
  }
  await refresh();
}

function row(item) {
  const [cls, label] = STATUS[item.status] || ['pill', item.status];
  const time = item.scheduledAt ? `${formatDate(item.scheduledAt)} · ${relativeTime(item.scheduledAt)}` : 'بدون موعد بعد';
  const acts = [];
  const publishNow = async () => {
    const ok = await confirmDialog({ title: 'النشر الآن', message: `سيُنشر المنشور فورًا على ${item.targets.map(t => PLATFORM[t]).join(' و')}. متأكد؟`, confirmText: 'انشر الآن' });
    if (ok) act(`/api/queue/${item.id}/publish-now`, { method: 'POST', json: {} }, 'بدأ النشر.');
  };
  if (item.status === 'draft') acts.push(button('موافقة ونشر الآن', { cls: 'primary', iconName: 'send', onclick: publishNow }), button('جدولة', { cls: 'soft', iconName: 'clock', onclick: () => edit(item, true) }));
  if (item.status === 'approved') acts.push(button('نشر الآن', { cls: 'soft', iconName: 'send', onclick: publishNow }), button('تعديل', { cls: 'soft', iconName: 'edit', onclick: () => edit(item) }), button('إلغاء الجدولة', { cls: 'ghost', onclick: () => act(`/api/queue/${item.id}/cancel`, { method: 'POST', json: {} }, 'أُلغيت الجدولة.') }));
  if (item.status === 'failed' || item.status === 'missed') acts.push(button('أعد المحاولة الآن', { cls: 'primary', iconName: 'refresh', onclick: publishNow }), button('تعديل', { cls: 'soft', iconName: 'edit', onclick: () => edit(item) }));
  if (['draft', 'failed', 'missed', 'cancelled', 'published'].includes(item.status)) {
    acts.push(button('حذف', { cls: 'ghost', iconName: 'trash', onclick: async () => {
      if (await confirmDialog({ title: 'حذف من الجدولة', message: 'سيُحذف هذا العنصر من القائمة (لن يُحذف المنشور المنشور فعليًا على المنصات).', danger: true, confirmText: 'احذف' })) act(`/api/queue/${item.id}`, { method: 'DELETE' });
    } }));
  }
  const results = Object.entries(item.results || {}).filter(([, value]) => value?.ok).map(([target]) => `✓ ${PLATFORM[target]}`);
  return el('div', { class: 'qrow' },
    el('div', { class: 'qthumbs' }, item.historyIds.slice(0, 3).map(id => el('img', { src: `/api/history/${id}/thumb`, alt: '' }))),
    el('div', { class: 'qinfo' },
      el('b', { text: titleOf(item) }),
      el('span', {}, el('span', { class: cls, text: label }), ' ', item.targets.map(t => PLATFORM[t]).join(' + '), ' · ', time),
      results.length && item.status !== 'published' ? el('span', { class: 'muted', text: `نجح: ${results.join('، ')}` }) : null,
      item.status === 'published' ? el('span', { class: 'muted', text: `${results.join('، ')} · ${formatDate(item.publishedAt)}${Object.values(item.results || {}).some(r => r.dryRun) ? ' (تجريبي)' : ''}` }) : null,
      item.lastError && item.status !== 'published' ? el('span', { class: 'err', text: item.lastError }) : null),
    el('div', { class: 'qacts' }, acts));
}

function group(title, list, iconName) {
  if (!list.length) return null;
  return el('div', { class: 'q-group' }, el('h2', {}, icon(iconName), title, el('span', { class: 'pill', text: String(list.length) })), list.map(row));
}

function render() {
  const by = (...statuses) => items.filter(item => statuses.includes(item.status));
  const byTime = (a, b) => Date.parse(a.scheduledAt || 0) - Date.parse(b.scheduledAt || 0);
  const nodes = [
    group('تحتاج انتباهك', by('failed', 'missed'), 'alert'),
    group('بانتظار موافقتك', by('draft'), 'edit'),
    group('مجدولة', [...by('approved', 'publishing')].sort(byTime), 'clock'),
    group('نُشرت مؤخرًا', by('published').sort((a, b) => Date.parse(b.publishedAt || 0) - Date.parse(a.publishedAt || 0)).slice(0, 15), 'check'),
    group('ملغاة', by('cancelled'), 'x'),
  ].filter(Boolean);
  $('queueBody').replaceChildren(...(nodes.length ? nodes : [el('div', { class: 'empty-state' }, icon('calendar'), el('b', { text: 'لا توجد منشورات مجدولة.' }),
    el('span', { text: 'من أي منشور اضغط «الكابشن والنشر» لحفظه كمسودة أو جدولته.' }))]));
  const pending = by('draft', 'approved', 'publishing', 'failed', 'missed').length;
  $('queueCount').hidden = !pending;
  $('queueCount').textContent = String(pending);
}

function renderNotice() {
  const meta = app.status?.meta;
  const box = $('queueMetaNotice');
  if (!meta) { box.hidden = true; return; }
  let message = '';
  let cls = 'notice wide';
  if (meta.dryRun) { message = 'الوضع التجريبي مفعّل (RAQEEM_META_DRY_RUN=1): لا يُنشر شيء فعليًا على المنصات.'; }
  else if (!meta.configured) { message = 'النشر المباشر غير متصل بعد، لكن يمكنك حفظ المسودات. اربط فيسبوك/إنستغرام من «الإعدادات» لتفعيل الجدولة والنشر التلقائي.'; }
  else if (meta.needsRefresh) { message = `توكن Meta ينتهي خلال ${meta.token.daysLeft} يومًا. جدّده من «الإعدادات» حتى لا يتوقف النشر.`; cls += ' bad'; }
  box.hidden = !message;
  box.className = cls;
  box.replaceChildren(icon('alert'), el('span', { text: message }));
}

async function refresh() {
  try {
    const data = await api('/api/queue');
    for (const item of data.items) {
      const before = known.get(item.id);
      if (before && before !== item.status) {
        if (item.status === 'published') toast(`نُشر: ${titleOf(item)}`, { type: 'ok', timeout: 7000 });
        if (item.status === 'failed') toast(`تعذر نشر: ${titleOf(item)} — ${item.lastError || ''}`, { type: 'bad', timeout: 10000 });
        if (item.status === 'missed') toast(`فات موعد منشور: ${titleOf(item)}`, { type: 'warn', timeout: 10000 });
      }
    }
    known = new Map(data.items.map(item => [item.id, item.status]));
    items = data.items;
    render();
    renderNotice();
  } catch { /* الواجهة تعرض لافتة الانقطاع */ }
}

function edit(item, requireTime = false) {
  editing = { item, requireTime };
  $('schedWhen').value = toLocalInput(new Date(item.scheduledAt && Date.parse(item.scheduledAt) > Date.now() ? item.scheduledAt : Date.now() + 3_600_000));
  $('schedCaption').value = item.caption || '';
  const now = new Date();
  const at = (days, hour) => { const d = new Date(now); d.setDate(d.getDate() + days); d.setHours(hour, 0, 0, 0); return d; };
  $('schedQuick').replaceChildren(...[['بعد ساعة', new Date(now.getTime() + 3_600_000)], ['الليلة 8 م', at(0, 20)], ['غدًا 9 ص', at(1, 9)], ['غدًا 8 م', at(1, 20)]]
    .filter(([, date]) => date.getTime() > now.getTime() + 60_000)
    .map(([label, date]) => el('button', { type: 'button', class: 'btn soft small', onclick: () => { $('schedWhen').value = toLocalInput(date); } }, label)));
  $('schedTitle').textContent = item.status === 'draft' ? 'جدولة المنشور' : 'تعديل الموعد والكابشن';
  $('schedSave').textContent = item.status === 'draft' ? 'موافقة وجدولة' : 'حفظ التعديل';
  openDialog('scheduleDialog');
}

async function saveEdit() {
  const { item } = editing;
  const when = Date.parse($('schedWhen').value);
  if (!Number.isFinite(when)) { toast('اختر موعدًا صالحًا.', { type: 'warn' }); return; }
  if (when < Date.now() && item.status !== 'published') { toast('اختر موعدًا قادمًا.', { type: 'warn' }); return; }
  $('schedSave').disabled = true;
  try {
    await api(`/api/queue/${item.id}`, { method: 'PATCH', json: { scheduledAt: new Date(when).toISOString(), caption: $('schedCaption').value } });
    if (item.status === 'draft' || item.status === 'failed' || item.status === 'missed') {
      await api(`/api/queue/${item.id}/approve`, { method: 'POST', json: { scheduledAt: new Date(when).toISOString() } });
    }
    $('scheduleDialog').close();
    toast('تم الحفظ.', { type: 'ok', timeout: 2500 });
  } catch (error) {
    toast(error.message, { type: 'bad', timeout: 8000 });
  } finally {
    $('schedSave').disabled = false;
    refresh();
  }
}

export function initQueue() {
  $('schedCancel').addEventListener('click', () => $('scheduleDialog').close());
  $('schedSave').addEventListener('click', saveEdit);
  document.addEventListener('queue-changed', refresh);
  // تحديث دوري خفيف؛ أسرع عندما يكون هناك نشر جارٍ.
  const loop = async () => {
    if (!document.hidden) await refresh();
    const busy = items.some(item => ['publishing', 'approved'].includes(item.status));
    timer = setTimeout(loop, busy ? 8000 : 20000);
  };
  loop();
  return { show: refresh, renderNotice };
}
