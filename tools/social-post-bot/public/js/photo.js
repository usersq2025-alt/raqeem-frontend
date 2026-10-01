import { $, qs, qsa, api, app, confirmDialog, debounce, el, icon, money, prepareUpload, startProgress, toast } from './util.js';
import { createDock, savePost } from './dock.js';

const TARGET_RATIO = 1122 / 1402;
const files = [];          // عناصر الصور المرفوعة
let current = null;        // العنصر المعروض
let seq = 0;               // يتجاهل ردود المعاينة القديمة
let working = null;        // {controller, progress} أثناء التصميم بالذكاء الاصطناعي
let dock;

const value = name => qs(`input[name=${name}]:checked`).value;
const mode = () => value('mode');
const quality = () => value('quality');
const view = () => value('pview');
const stripName = name => name.replace(/\.[^.]+$/, '');

/* ---------- إدارة الملفات ---------- */
async function addFiles(list) {
  const accepted = [];
  for (const file of list) {
    if (/heic|heif/i.test(file.type) || /\.(heic|heif)$/i.test(file.name)) {
      toast(`«${file.name}»: صور الآيفون HEIC غير مدعومة. صدّرها JPG أولًا.`, { type: 'warn', timeout: 7000 });
    } else if (!file.type.startsWith('image/')) {
      toast(`«${file.name}» ليس صورة.`, { type: 'warn' });
    } else {
      accepted.push(file);
    }
  }
  if (!accepted.length) return;
  if (files.length + accepted.length > 30) { toast('الحد الأقصى 30 صورة في الدفعة الواحدة.', { type: 'warn' }); accepted.length = Math.max(0, 30 - files.length); }
  for (const file of accepted) {
    const url = URL.createObjectURL(file);
    const entry = { id: crypto.randomUUID(), file, name: file.name, url, crop: { x: 0.7, y: 0.5 }, natural: null, upload: null, status: 'idle', kind: null, resultBlob: null, resultUrl: null, aiId: null, aiQuality: null };
    const image = new Image();
    image.onload = () => { entry.natural = { w: image.naturalWidth, h: image.naturalHeight }; syncCrop(); };
    image.src = url;
    files.push(entry);
  }
  select(files[files.length - accepted.length]);
}

function removeFile(entry) {
  const index = files.indexOf(entry);
  files.splice(index, 1);
  URL.revokeObjectURL(entry.url);
  if (entry.resultUrl) URL.revokeObjectURL(entry.resultUrl);
  if (current === entry) current = files[Math.min(index, files.length - 1)] || null;
  renderAll();
  if (current) quick(current);
}

function select(entry) {
  current = entry;
  renderAll();
  quick(entry);
}

function renderStrip() {
  const strip = $('photoStrip');
  strip.hidden = files.length < 2;
  $('drop').classList.toggle('compact', files.length > 0);
  strip.replaceChildren(...files.map(entry => {
    const label = { working: '…', done: 'جاهزة', error: 'خطأ' }[entry.status] || '';
    return el('button', {
      type: 'button', class: `thumb${entry === current ? ' active' : ''}`, title: entry.name, 'aria-label': `الصورة ${entry.name}`,
      onclick: () => select(entry),
    },
    el('img', { src: entry.url, alt: '' }),
    label ? el('span', { class: `st ${entry.status === 'done' ? 'done' : entry.status === 'error' ? 'err' : ''}`, text: label }) : null,
    el('span', { class: 'rm', role: 'button', 'aria-label': 'إزالة', onclick: event => { event.stopPropagation(); removeFile(entry); } }, icon('x')));
  }));
}

/* ---------- تحضير الرفع والمعاينة ---------- */
async function uploadBlob(entry) {
  if (!entry.upload) entry.upload = await prepareUpload(entry.file);
  return entry.upload;
}

function headersFor(entry, extra = {}) {
  return {
    'X-Fit': value('fit'),
    'X-Crop-X': String(entry.crop.x), 'X-Crop-Y': String(entry.crop.y),
    ...extra,
  };
}

// معاينة محلية سريعة (أو إعادة تركيب نتيجة الذكاء الاصطناعي المحفوظة مجانًا عند تغيير القص).
const quickDebounced = debounce(entry => quickNow(entry), 220);
function quick(entry) { quickDebounced(entry); }

async function quickNow(entry) {
  if (!entry || entry !== current) return;
  const ticket = ++seq;
  const preview = $('photoPreview');
  preview.classList.add('loading');
  try {
    const useAi = mode() === 'ai' && entry.aiId && entry.aiQuality === quality();
    const response = useAi
      ? await api('/render', { method: 'POST', raw: true, headers: headersFor(entry, { 'X-Enhancement': 'ai', 'X-Quality': quality(), 'X-Cache-Id': entry.aiId }) })
      : await api('/render', { method: 'POST', raw: true, body: await uploadBlob(entry), headers: headersFor(entry, { 'X-Enhancement': 'safe', 'Content-Type': entry.file.type || 'application/octet-stream' }) });
    if (ticket !== seq) return;
    setResult(entry, await response.blob(), useAi ? 'ai' : 'quick');
  } catch (error) {
    if (ticket !== seq) return;
    if (error.status === 410) { entry.aiId = null; entry.kind = null; return quickNow(entry); }
    entry.status = 'error';
    toast(error.message, { type: 'bad' });
  } finally {
    if (ticket === seq) preview.classList.remove('loading');
    renderAll();
  }
}

function setResult(entry, blob, kind) {
  if (entry.resultUrl) URL.revokeObjectURL(entry.resultUrl);
  entry.resultBlob = blob;
  entry.resultUrl = URL.createObjectURL(blob);
  entry.kind = kind;
  entry.status = (mode() === 'safe' || kind === 'ai') ? 'done' : 'idle';
  if (entry === current) renderPreview();
}

/* ---------- العرض ---------- */
function renderPreview() {
  const preview = $('photoPreview');
  preview.classList.remove('grab', 'grabbing');
  let url = null;
  if (view() === 'template') url = '/template';
  else if (!current) url = null;
  else if (view() === 'original') url = current.url;
  else url = current.resultUrl;
  if (!url) {
    preview.replaceChildren(el('div', { class: 'empty' }, icon('image'), el('p', { text: 'ارفع صورة لتظهر المعاينة هنا مباشرة.' })));
    return;
  }
  const image = el('img', { src: url, alt: 'معاينة المنشور', draggable: 'false' });
  if ($('photoMock').checked) {
    preview.replaceChildren(el('div', { class: 'mock' },
      el('div', { class: 'mock-head' }, el('img', { src: '/logo.png', alt: '' }), 'raqeem'), image,
      el('div', { class: 'mock-cap', text: 'هكذا سيظهر المنشور في الموجز.' })));
  } else {
    preview.replaceChildren(image);
  }
  if (view() === 'result' && current && value('fit') === 'cover' && cropAxis()) { preview.classList.add('grab'); enableDrag(image); }
}

function cropAxis() {
  if (!current?.natural) return null;
  const ratio = current.natural.w / current.natural.h;
  if (Math.abs(ratio - TARGET_RATIO) < 0.01) return null;
  return ratio > TARGET_RATIO ? 'x' : 'y';
}

function syncCrop() {
  const axis = cropAxis();
  const cover = value('fit') === 'cover';
  $('cropRow').hidden = !(cover && axis);
  $('cropHint').hidden = !(cover && axis);
  if (cover && axis) renderPreview();
}

function enableDrag(image) {
  let start = null;
  image.addEventListener('pointerdown', event => {
    start = { x: event.clientX, y: event.clientY, crop: { ...current.crop } };
    image.setPointerCapture(event.pointerId);
    $('photoPreview').classList.add('grabbing');
  });
  image.addEventListener('pointermove', event => {
    if (!start) return;
    const axis = cropAxis();
    const ratio = current.natural.w / current.natural.h;
    if (axis === 'x') {
      const overflow = image.clientHeight * (ratio - TARGET_RATIO);
      current.crop.x = Math.max(0, Math.min(1, start.crop.x - (event.clientX - start.x) / overflow));
    } else {
      const overflow = image.clientWidth * (1 / ratio - 1 / TARGET_RATIO);
      current.crop.y = Math.max(0, Math.min(1, start.crop.y - (event.clientY - start.y) / overflow));
    }
    image.style.transform = `translate(${axis === 'x' ? (event.clientX - start.x) * 0.35 : 0}px, ${axis === 'y' ? (event.clientY - start.y) * 0.35 : 0}px)`;
  });
  const end = () => {
    if (!start) return;
    start = null;
    $('photoPreview').classList.remove('grabbing');
    image.style.transform = '';
    quickNow(current);
  };
  image.addEventListener('pointerup', end);
  image.addEventListener('pointercancel', end);
}

function renderBadge() {
  const badge = $('photoBadge');
  badge.replaceChildren();
  if (!current) return;
  const pill = (text, cls) => badge.append(el('span', { class: `pill ${cls}`, text }));
  if (current.kind === 'ai') pill('نتيجة الذكاء الاصطناعي', 'ok');
  else if (mode() === 'ai') pill('معاينة محلية سريعة — اضغط «صمّم بالذكاء الاصطناعي» للنتيجة النهائية', 'warn');
  else pill('تحسين محلي', 'info');
  if (current.fallback) pill('رجع البوت للتحسين المحلي: ' + current.fallback, 'bad');
  if (files.length > 1) pill(`${files.filter(entry => entry.status === 'done').length} / ${files.length} جاهزة`, 'info');
}

function estimate() {
  const usage = app.status?.usage;
  if (!usage) return null;
  const unit = quality() === 'high' ? usage.costsUsd.imageEditHigh : usage.costsUsd.imageEditMedium;
  return { unit, left: Math.max(0, usage.dailyAiCalls - usage.today.calls) };
}

function renderControls() {
  const hasKey = Boolean(app.status?.aiAvailable);
  const ai = mode() === 'ai';
  $('qualityBox').hidden = !ai;
  $('noKeyNotice').hidden = hasKey || !ai;
  const cost = estimate();
  $('aiCostBadge').textContent = cost ? `≈ ${money(cost.unit)} للصورة · المتبقي اليوم ${cost.left} طلب` : '';
  const button = $('aiGo');
  const label = $('aiGoLabel');
  const pending = files.filter(entry => entry.status !== 'done');
  button.hidden = !ai && files.length < 2;
  button.disabled = !files.length || Boolean(working) || (ai && !hasKey);
  if (!files.length) label.textContent = 'ارفع صورة أولًا';
  else if (files.length > 1) label.textContent = ai ? `صمّم الكل بالذكاء الاصطناعي (${pending.length || files.length})` : `جهّز الكل (${pending.length || files.length})`;
  else label.textContent = current?.kind === 'ai' && current.aiQuality === quality() ? 'أعد التوليد (نتيجة جديدة)' : 'صمّم بالذكاء الاصطناعي';
  $('photoCancel').hidden = !working;
  dock?.setEnabled(Boolean(current?.resultBlob));
}

function renderAll() {
  renderStrip();
  renderPreview();
  renderBadge();
  renderControls();
  syncCrop();
}

/* ---------- التصميم بالذكاء الاصطناعي ---------- */
async function enhance(entry, controller, regenerate) {
  entry.status = 'working';
  renderStrip();
  const response = await api('/render', {
    method: 'POST', raw: true, signal: controller.signal, body: await uploadBlob(entry),
    headers: headersFor(entry, {
      'X-Enhancement': 'ai', 'X-Quality': quality(), 'Content-Type': entry.file.type || 'application/octet-stream',
      ...(regenerate ? { 'X-Regenerate': '1' } : {}),
    }),
  });
  const fallback = response.headers.get('X-Fallback-Reason');
  entry.fallback = fallback ? decodeURIComponent(fallback) : null;
  entry.aiId = response.headers.get('X-Photo-Id');
  entry.aiQuality = entry.aiId ? quality() : null;
  setResult(entry, await response.blob(), entry.aiId ? 'ai' : 'quick');
  entry.status = 'done';
  if (entry.aiId && response.headers.get('X-From-Cache') !== '1') app.dirty = true;
  if (entry.fallback) toast(`تعذر الذكاء الاصطناعي، استُخدم التحسين المحلي بدلًا منه: ${entry.fallback}`, { type: 'warn', timeout: 9000 });
}

async function runPrimary() {
  if (!files.length || working) return;
  const ai = mode() === 'ai';
  const batch = files.length > 1;
  const targets = batch ? files.filter(entry => entry.status !== 'done' || (ai && entry.kind !== 'ai')) : [current];
  if (!targets.length) { toast('كل الصور جاهزة. يمكنك حفظها أو تحميلها.', { type: 'ok' }); return; }
  if (ai && batch) {
    const cost = estimate();
    const ok = await confirmDialog({
      title: 'تصميم دفعة بالذكاء الاصطناعي',
      message: `ستُرسل ${targets.length} صورة، التكلفة التقريبية ${money(cost.unit * targets.length)} (المتبقي اليوم ${cost.left} طلب). كل نتيجة تُحفظ تلقائيًا في المكتبة.`,
      confirmText: 'ابدأ',
    });
    if (!ok) return;
  }
  const controller = new AbortController();
  const progress = startProgress($('photoProgress'), $('photoProgressText'), ai ? 'جاري التصوير بالذكاء الاصطناعي…' : 'جاري التجهيز…');
  working = { controller };
  renderControls();
  let done = 0;
  try {
    for (const entry of targets) {
      if (controller.signal.aborted) break;
      if (batch) { current = entry; renderAll(); progress.set(`(${done + 1}/${targets.length}) ${entry.name} —`); }
      try {
        if (ai) await enhance(entry, controller, !batch && entry.kind === 'ai');
        else {
          await quickNow(entry);
          if (entry.status !== 'done') throw new Error('تعذر تجهيز الصورة.');
        }
        if (batch) await savePost({ kind: 'photo', title: stripName(entry.name), blobs: [entry.resultBlob], meta: { type: 'photo', mode: mode(), fit: value('fit') } });
        done++;
      } catch (error) {
        if (error.name === 'AbortError') throw error;
        entry.status = 'error';
        toast(`${entry.name}: ${error.message}`, { type: 'bad', timeout: 8000 });
        if (error.status === 429) break;
      }
      renderAll();
    }
    if (done) toast(batch ? `اكتملت ${done} صورة وحُفظت في المكتبة.` : 'تم تصميم المنشور. راجعه ثم احفظه أو انشره.', { type: 'ok' });
  } catch (error) {
    if (error.name === 'AbortError') toast('أُلغي التصميم.', { type: 'warn', timeout: 2500 });
    else toast(error.message, { type: 'bad' });
    targets.forEach(entry => { if (entry.status === 'working') entry.status = 'idle'; });
  } finally {
    progress.stop();
    working = null;
    refreshStatus();
    renderAll();
  }
}

let refreshStatus = () => {};

/* ---------- ما يُسلَّم للشريط السفلي ---------- */
async function getPost() {
  if (!current?.resultBlob) { toast('ارفع صورة أولًا.', { type: 'warn' }); return null; }
  const ready = files.length > 1 ? files.filter(entry => entry.status === 'done' && entry.resultBlob) : [current];
  if (!ready.length) { toast('اضغط «صمّم الكل» أولًا لتجهيز الصور.', { type: 'warn' }); return null; }
  if (mode() === 'ai' && ready.some(entry => entry.kind !== 'ai')) {
    const ok = await confirmDialog({
      title: 'هذه معاينة محلية', message: 'لم تُصمَّم هذه الصورة بالذكاء الاصطناعي بعد. هل تريد المتابعة بالنتيجة المحلية؟', confirmText: 'تابع بالمحلية',
    });
    if (!ok) return null;
  }
  return {
    kind: 'photo', title: stripName(ready[0].name),
    blobs: ready.map(entry => entry.resultBlob),
    meta: { type: 'photo', mode: mode(), quality: quality(), fit: value('fit') },
  };
}

export function initPhoto({ onStatusRefresh }) {
  refreshStatus = onStatusRefresh;
  dock = createDock($('photoDock'), getPost);
  dock.setEnabled(false);

  const input = $('file');
  input.addEventListener('change', () => { addFiles([...input.files]); input.value = ''; });
  const drop = $('drop');
  drop.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); input.click(); } });
  ['dragenter', 'dragover'].forEach(name => drop.addEventListener(name, event => { event.preventDefault(); drop.classList.add('dragging'); }));
  ['dragleave', 'drop'].forEach(name => drop.addEventListener(name, event => { event.preventDefault(); drop.classList.remove('dragging'); }));
  drop.addEventListener('drop', event => addFiles([...event.dataTransfer.files]));
  // إسقاط الملفات في أي مكان من القسم
  const section = $('view-photo');
  section.addEventListener('dragover', event => { if (event.dataTransfer.types.includes('Files')) event.preventDefault(); });
  section.addEventListener('drop', event => { if (event.dataTransfer.files.length) { event.preventDefault(); addFiles([...event.dataTransfer.files]); } });

  qsa('input[name=fit]').forEach(radio => radio.addEventListener('change', () => { syncCrop(); if (current) quick(current); }));
  qsa('input[name=mode]').forEach(radio => radio.addEventListener('change', () => { renderAll(); if (current) quick(current); }));
  qsa('input[name=quality]').forEach(radio => radio.addEventListener('change', () => { renderAll(); if (current) quick(current); }));
  qsa('input[name=pview]').forEach(radio => radio.addEventListener('change', renderPreview));
  $('photoMock').addEventListener('change', renderPreview);
  $('cropReset').addEventListener('click', () => { if (current) { current.crop = { x: 0.7, y: 0.5 }; quick(current); } });
  $('aiGo').addEventListener('click', runPrimary);
  $('photoCancel').addEventListener('click', () => working?.controller.abort());
  renderAll();

  return {
    paste: list => addFiles(list),
    primary: runPrimary,
    save: () => dock.save(), download: () => dock.download(),
    rerender: renderControls,
  };
}
