import { $, qs, qsa, api, app, button, confirmDialog, copyText, debounce, download, el, formatDate, icon, openDialog, toast } from './util.js';
import { openPublish } from './publish.js';

const PAGE = 48;
const state = { q: '', filter: '', items: [], total: 0, selected: new Set(), selectMode: false };
let goText = () => {};

const statusPill = status => ({
  published: ['pill ok', 'منشور'], scheduled: ['pill info', 'مجدول'], draft: ['pill', 'مسودة'],
}[status] || ['pill', status]);

function postFor(item) {
  const slides = item.meta?.slides || [];
  return {
    kind: item.kind, title: item.title, body: slides.map(s => s.body).filter(Boolean).join('\n\n'),
  };
}

// منشور كاروسيل: شرائح المجموعة نفسها محمّلة في الصفحة الحالية.
function groupOf(item) {
  if (!item.groupId) return [item];
  return state.items.filter(other => other.groupId === item.groupId).sort((a, b) => (a.slideIndex ?? 0) - (b.slideIndex ?? 0));
}

async function load(reset = true) {
  if (reset) { state.items = []; }
  const params = new URLSearchParams({ limit: String(PAGE), offset: String(state.items.length) });
  if (state.q) params.set('q', state.q);
  if (state.filter === 'photo' || state.filter === 'text') params.set('kind', state.filter);
  if (state.filter === 'published') params.set('status', 'published');
  try {
    const data = await api(`/api/history?${params}`);
    state.items = reset ? data.items : [...state.items, ...data.items];
    state.total = data.total;
    render();
  } catch (error) {
    toast(error.message, { type: 'bad' });
  }
}

function render() {
  const grid = $('libGrid');
  if (!state.items.length) {
    grid.replaceChildren(el('div', { class: 'empty-state' }, icon('grid'),
      el('b', { text: state.q || state.filter ? 'لا نتائج مطابقة.' : 'المكتبة فارغة بعد.' }),
      el('span', { text: state.q || state.filter ? 'جرّب بحثًا آخر أو أزل التصفية.' : 'كل منشور تحفظه أو تحمّله أو تنشره يظهر هنا لتعيد استخدامه بنقرة.' }),
      state.q || state.filter ? null : button('ابدأ بمنشور من صورة', { cls: 'primary', onclick: () => document.querySelector('[data-tab=photo]').click() })));
  } else {
    grid.replaceChildren(...state.items.map(card));
  }
  $('libMore').hidden = state.items.length >= state.total;
  $('libBulk').hidden = !state.selected.size;
  $('libBulkCount').textContent = `${state.selected.size} محدد`;
  $('libSelectMode').textContent = state.selectMode ? 'إنهاء التحديد' : 'تحديد متعدد';
}

function card(item) {
  const [cls, label] = statusPill(item.status);
  const selected = state.selected.has(item.id);
  const open = () => (state.selectMode ? toggle(item.id) : viewer(item));
  return el('article', { class: `gcard${selected ? ' selected' : ''}` },
    state.selectMode || selected ? el('input', { type: 'checkbox', class: 'sel', checked: selected, 'aria-label': 'تحديد', onchange: () => toggle(item.id) }) : null,
    el('button', { type: 'button', class: 'thumbbtn', onclick: open, 'aria-label': `عرض ${item.title || 'المنشور'}` }, el('img', { src: `/api/history/${item.id}/thumb`, alt: '', loading: 'lazy' })),
    el('div', { class: 'meta' }, el('b', { text: item.title || 'بدون عنوان', title: item.title }), el('span', { text: formatDate(item.createdAt) })),
    el('div', { class: 'tags' },
      el('span', { class: 'pill', text: item.kind === 'text' ? 'نص' : 'صورة' }),
      el('span', { class: cls, text: label }),
      item.groupId ? el('span', { class: 'pill info', text: `شريحة ${(item.slideIndex ?? 0) + 1}` }) : null),
    el('div', { class: 'acts' },
      button('نشر', { cls: 'soft', onclick: () => openPublish({ items: groupOf(item), post: postFor(item) }) }),
      el('a', { class: 'btn soft small', href: `/api/history/${item.id}/image?download=1`, download: '' }, 'تحميل'),
      button('حذف', { cls: 'ghost', onclick: () => remove([item]) })));
}

function toggle(id) {
  if (state.selected.has(id)) state.selected.delete(id); else state.selected.add(id);
  render();
}

async function remove(items) {
  const ok = await confirmDialog({
    title: 'حذف نهائي', danger: true, confirmText: 'احذف',
    message: items.length > 1 ? `سيُحذف ${items.length} منشورات من المكتبة نهائيًا.` : `سيُحذف «${items[0].title || 'المنشور'}» من المكتبة نهائيًا.`,
  });
  if (!ok) return;
  let failed = 0;
  for (const item of items) {
    try { await api(`/api/history/${item.id}`, { method: 'DELETE' }); state.selected.delete(item.id); } catch (error) { failed++; toast(error.message, { type: 'bad' }); }
  }
  if (items.length > failed) toast('تم الحذف.', { type: 'ok', timeout: 2500 });
  load();
}

function viewer(item) {
  $('viewerTitle').textContent = item.title || 'المنشور';
  $('viewerImg').src = `/api/history/${item.id}/image`;
  const select = el('select', { 'aria-label': 'المقاس' },
    [['feed45', 'منشور 4:5'], ['square', 'مربع 1:1'], ['story', 'قصة 9:16'], ['landscape', 'فيسبوك أفقي']].map(([value, text]) => el('option', { value, text })));
  const [cls, label] = statusPill(item.status);
  $('viewerSide').replaceChildren(
    el('div', {}, el('span', { class: cls, text: label }), ' ', el('span', { class: 'muted', text: formatDate(item.createdAt) })),
    item.caption ? el('p', { class: 'hint', text: item.caption.slice(0, 220) }) : null,
    el('div', { class: 'row' }, select,
      el('a', { class: 'btn soft small', href: '#', onclick: event => { event.preventDefault(); location.href = `/api/history/${item.id}/image?download=1&format=${select.value}`; } }, icon('download'), 'تحميل')),
    button('الكابشن والنشر', { cls: 'primary', iconName: 'send', onclick: () => { $('viewerDialog').close(); openPublish({ items: groupOf(item), post: postFor(item) }); } }),
    item.kind === 'text' && item.meta?.slides ? button('تعديل النص', { cls: 'soft', iconName: 'edit', onclick: () => { $('viewerDialog').close(); goText(item.meta); } }) : null,
    item.caption ? button('نسخ الكابشن', { cls: 'soft', iconName: 'copy', onclick: async () => toast((await copyText([item.caption, (item.hashtags || []).join(' ')].filter(Boolean).join('\n\n'))) ? 'نُسخ الكابشن.' : 'تعذر النسخ.', { type: 'ok', timeout: 2000 }) }) : null,
    button('حذف', { cls: 'danger', iconName: 'trash', onclick: async () => { $('viewerDialog').close(); await remove([item]); } }));
  openDialog('viewerDialog');
}

export function initLibrary({ onOpenText }) {
  goText = onOpenText;
  $('libSearch').addEventListener('input', debounce(event => { state.q = event.target.value.trim(); load(); }, 300));
  qsa('input[name=libf]').forEach(radio => radio.addEventListener('change', () => { state.filter = radio.value; load(); }));
  $('libMore').addEventListener('click', () => load(false));
  document.addEventListener('history-changed', () => { if (!$('view-library').hidden) load(); });
  document.addEventListener('queue-changed', () => { if (!$('view-library').hidden) load(); });
  $('libSelectMode').addEventListener('click', () => { state.selectMode = !state.selectMode; if (!state.selectMode) state.selected.clear(); render(); });
  $('libClearSel').addEventListener('click', () => { state.selected.clear(); render(); });
  $('libDeleteSel').addEventListener('click', () => remove(state.items.filter(item => state.selected.has(item.id))));
  $('libZip').addEventListener('click', async () => {
    const ids = state.items.filter(item => state.selected.has(item.id)).map(item => item.id);
    const format = $('libBulkFormat').value;
    try {
      toast('جاري تجهيز الملف…', { timeout: 1500 });
      download(await api('/api/zip', { method: 'POST', json: { ids, formats: format === 'all' ? 'all' : [format] } }), 'raqeem-posts.zip');
    } catch (error) { toast(error.message, { type: 'bad' }); }
  });
  $('libPublishSel').addEventListener('click', () => {
    const items = state.items.filter(item => state.selected.has(item.id));
    if (items.length > 10) { toast('يمكن نشر 10 صور كحد أقصى في منشور واحد.', { type: 'warn' }); return; }
    openPublish({ items, post: postFor(items[0]) });
  });
  return { show: () => load(), reload: () => load() };
}
