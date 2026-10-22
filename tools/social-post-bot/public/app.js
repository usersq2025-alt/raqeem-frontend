import { $, qsa, api, app, el, money, toast } from './js/util.js';
import { initPublish } from './js/publish.js';
import { initPhoto } from './js/photo.js';
import { initText, loadProject } from './js/text.js';
import { initLibrary } from './js/library.js';
import { initQueue } from './js/queue.js';
import { initSettings } from './js/settings.js';

const TABS = ['photo', 'text', 'library', 'queue', 'settings'];
let active = 'photo';
let modules = {};

/* ---------- المظهر ---------- */
function applyTheme(theme) {
  const dark = theme === 'dark' || (theme === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  $('themeToggle').querySelector('use').setAttribute('href', dark ? '#i-sun' : '#i-moon');
}
function initTheme() {
  let saved = 'auto';
  try { saved = localStorage.getItem('raqeem-theme') || 'auto'; } catch { /* التخزين غير متاح */ }
  applyTheme(saved);
  $('themeToggle').addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem('raqeem-theme', next); } catch { /* تجاهل */ }
    applyTheme(next);
  });
}

/* ---------- حالة النظام (الشرائح العلوية) ---------- */
function chip(text, cls, tab) {
  return el('button', { type: 'button', class: `chip ${cls}`, onclick: () => showTab(tab) }, el('i'), text);
}

function renderChips() {
  const status = app.status;
  const box = $('statusChips');
  if (!status) { box.replaceChildren(); return; }
  const usage = status.usage;
  const left = usage.dailyAiCalls - usage.today.calls;
  const meta = status.meta;
  box.replaceChildren(
    chip(status.aiAvailable ? `الذكاء الاصطناعي: ${left} طلب متبقٍ اليوم` : 'الذكاء الاصطناعي: غير مضبوط', status.aiAvailable ? (left <= 5 ? 'warn' : 'ok') : 'warn', 'settings'),
    chip(meta.dryRun ? 'النشر: تجريبي' : meta.configured ? 'النشر المباشر: متصل' : 'النشر المباشر: غير متصل', meta.dryRun ? 'warn' : meta.needsRefresh ? 'warn' : meta.configured ? 'ok' : 'bad', 'settings'),
  );
}

async function refreshStatus() {
  try {
    app.status = await api('/status');
    renderChips();
    modules.photo?.rerender();
    modules.text?.syncAi();
    modules.queue?.renderNotice();
  } catch { /* لافتة الانقطاع تظهر من api() */ }
}
app.refreshUsage = refreshStatus;
app.refreshStatus = refreshStatus;

/* ---------- التبويبات ---------- */
function showTab(name, { push = true } = {}) {
  if (!TABS.includes(name)) name = 'photo';
  active = name;
  for (const tab of TABS) {
    $(`view-${tab}`).hidden = tab !== name;
  }
  qsa('.tab').forEach(button => button.setAttribute('aria-selected', String(button.dataset.tab === name)));
  if (push) history.replaceState(null, '', `#${name}`);
  modules[name]?.show?.();
  window.scrollTo({ top: 0 });
}

function initTabs() {
  qsa('.tab').forEach(button => button.addEventListener('click', () => showTab(button.dataset.tab)));
  const initial = location.hash.slice(1);
  showTab(TABS.includes(initial) ? initial : 'photo', { push: false });
}

/* ---------- الاختصارات والحافظة ---------- */
function initShortcuts() {
  document.addEventListener('keydown', event => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName);
    const modal = document.querySelector('dialog[open]');
    if (event.key === '?' && !typing && !modal) { event.preventDefault(); $('helpDialog').showModal(); return; }
    if (event.altKey && /^[1-5]$/.test(event.key)) { event.preventDefault(); showTab(TABS[Number(event.key) - 1]); return; }
    if (!(event.ctrlKey || event.metaKey) || modal) return;
    const activeModule = modules[active];
    if (event.key === 'Enter' && activeModule?.primary) { event.preventDefault(); activeModule.primary(); }
    else if (event.key.toLowerCase() === 's' && activeModule?.save) { event.preventDefault(); activeModule.save(); }
    else if (event.key.toLowerCase() === 'd' && activeModule?.download) { event.preventDefault(); activeModule.download(); }
  });
  document.addEventListener('paste', event => {
    if (active !== 'photo' || /^(INPUT|TEXTAREA)$/.test(event.target.tagName)) return;
    const images = [...(event.clipboardData?.files || [])].filter(file => file.type.startsWith('image/'));
    if (images.length) { event.preventDefault(); modules.photo.paste(images); toast('تم لصق الصورة.', { type: 'ok', timeout: 1800 }); }
  });
  $('helpBtn').addEventListener('click', () => $('helpDialog').showModal());
  // إغلاق النوافذ بالنقر على الخلفية
  qsa('dialog.modal').forEach(dialog => dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); }));
  window.addEventListener('beforeunload', event => { if (app.dirty) { event.preventDefault(); event.returnValue = ''; } });
}

/* ---------- التشغيل ---------- */
initTheme();
initPublish();
modules.photo = initPhoto({ onStatusRefresh: refreshStatus });
modules.text = initText();
modules.library = initLibrary({ onOpenText: project => { loadProject(project); showTab('text'); } });
modules.queue = initQueue();
modules.settings = initSettings();
initShortcuts();
await refreshStatus();
initTabs();
setInterval(refreshStatus, 60_000);
