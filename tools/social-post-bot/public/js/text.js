import { $, qs, qsa, api, app, el, icon, startProgress, toast } from './util.js';
import { createDock } from './dock.js';

const W = 1080;
const H = 1350;
const COLORS = { navy: '#253754', body: '#34445f', orange: '#f5a016', footer: '#d9870f' };
const PRESETS = {
  plain: { badge: '', label: 'عادي' },
  announce: { badge: 'إعلان', label: 'إعلان' },
  tip: { badge: 'نصيحة تعليمية', label: 'نصيحة تعليمية' },
  quote: { badge: '', label: 'اقتباس' },
};
const DRAFT_KEY = 'raqeem-text-draft-v2';

const newSlide = badge => ({ badge: badge || '', title: '', body: '', footer: '', scene: '', illustration: null });
const state = { preset: 'plain', align: 'center', slides: [newSlide()], cur: 0 };
const canvas = $('tCanvas');
const ctx = canvas.getContext('2d');
const templateImage = new Image();
let templateReady = false;
let fontsReady = false;
let framePending = false;
let aiWork = null;
let dock;

const slide = () => state.slides[state.cur];

/* ---------- الرسم ---------- */
function wrap(c, text, maxWidth) {
  const lines = [];
  for (const paragraph of text.split('\n')) {
    if (!paragraph.trim()) { lines.push(''); continue; }
    let line = '';
    for (const word of paragraph.trim().split(/\s+/)) {
      const test = line ? `${line} ${word}` : word;
      if (!line || c.measureText(test).width <= maxWidth) line = test;
      else { lines.push(line); line = word; }
    }
    lines.push(line);
  }
  return lines;
}

function boxFor(s) {
  if (s.illustration) return { x: 130, y: 650, w: 820, h: 400 };
  if (state.preset === 'quote') return { x: 130, y: 400, w: 820, h: 650 };
  if (s.badge) return { x: 130, y: 285, w: 820, h: 765 };
  return { x: 130, y: 250, w: 820, h: 800 };
}

function layout(c, box, title, body, scale, quote) {
  const hasTitle = Boolean(title);
  const hasBody = Boolean(body);
  const titleSize = ((hasBody ? 92 : 118) * (quote ? 0.86 : 1)) * scale;
  const bodySize = (hasTitle ? 52 : 64) * scale;
  let titleLines = [];
  let bodyLines = [];
  if (hasTitle) { c.font = `900 ${titleSize}px Cairo`; titleLines = wrap(c, title, box.w); }
  if (hasBody) { c.font = `500 ${bodySize}px Cairo`; bodyLines = wrap(c, body, box.w); }
  const titleLH = titleSize * 1.4;
  const bodyLH = bodySize * 1.75;
  const gap = hasTitle && hasBody ? 70 * scale : 0;
  return { titleSize, bodySize, titleLines, bodyLines, titleLH, bodyLH, gap, height: titleLines.length * titleLH + gap + bodyLines.length * bodyLH };
}

function drawSlide(c, s) {
  const title = s.title.trim();
  const body = s.body.replace(/\r/g, '').trim();
  const footer = s.footer.trim();
  const center = state.align === 'center';
  const quote = state.preset === 'quote';
  const box = boxFor(s);
  c.clearRect(0, 0, W, H);
  c.drawImage(templateImage, 0, 0, W, H);
  if (s.illustration) c.drawImage(s.illustration, (W - 410) / 2, 205, 410, 410);
  c.direction = 'rtl';
  c.textBaseline = 'middle';

  if (s.badge && !s.illustration) {
    c.font = '900 30px Cairo';
    c.textAlign = 'center';
    const width = c.measureText(s.badge).width + 72;
    c.fillStyle = COLORS.orange;
    c.beginPath(); c.roundRect((W - width) / 2, 192, width, 58, 29); c.fill();
    c.fillStyle = COLORS.navy;
    c.fillText(s.badge, W / 2, 222);
  }
  if (quote && !s.illustration) {
    c.font = '900 260px Cairo';
    c.textAlign = 'center';
    c.fillStyle = COLORS.orange;
    c.fillText('”', W / 2, 330);
  }

  c.textAlign = center ? 'center' : 'right';
  const x = center ? box.x + box.w / 2 : box.x + box.w;
  if (title || body) {
    let scale = s.illustration ? 0.78 : 1;
    let plan = layout(c, box, title, body, scale, quote);
    while (plan.height > box.h && scale > 0.4) { scale -= 0.02; plan = layout(c, box, title, body, scale, quote); }
    let y = box.y + (box.h - plan.height) / 2;
    c.fillStyle = COLORS.navy;
    c.font = `900 ${plan.titleSize}px Cairo`;
    for (const line of plan.titleLines) { c.fillText(line, x, y + plan.titleLH / 2); y += plan.titleLH; }
    if (plan.gap) {
      const barX = center ? x - 60 : x - 120;
      c.fillStyle = COLORS.orange;
      c.beginPath(); c.roundRect(barX, y + plan.gap / 2 - 5, 120, 10, 5); c.fill();
      y += plan.gap;
    }
    c.fillStyle = COLORS.body;
    c.font = `500 ${plan.bodySize}px Cairo`;
    for (const line of plan.bodyLines) { if (line) c.fillText(line, x, y + plan.bodyLH / 2); y += plan.bodyLH; }
  }
  if (footer) {
    c.textAlign = 'center';
    c.fillStyle = COLORS.footer;
    let size = 40;
    c.font = `700 ${size}px Cairo`;
    while (c.measureText(footer).width > 760 && size > 24) { size -= 2; c.font = `700 ${size}px Cairo`; }
    c.fillText(footer, W / 2, 1120);
  }
}

function draw() {
  if (!templateReady || !fontsReady || $('view-text').hidden) return;
  drawSlide(ctx, slide());
}
function schedule() {
  if (framePending) return;
  framePending = true;
  requestAnimationFrame(() => { framePending = false; draw(); });
}

async function slideBlob(s) {
  const off = document.createElement('canvas');
  off.width = W; off.height = H;
  drawSlide(off.getContext('2d'), s);
  return new Promise(resolve => off.toBlob(resolve, 'image/png'));
}

/* ---------- النموذج ⇄ الحالة ---------- */
function syncForm() {
  const s = slide();
  $('tBadge').value = s.badge;
  $('tTitle').value = s.title;
  $('tBody').value = s.body;
  $('tFooter').value = s.footer;
  $('tScene').value = s.scene;
  qs(`input[name=preset][value=${state.preset}]`).checked = true;
  qs(`input[name=align][value=${state.align}]`).checked = true;
  updateCounts();
  renderSlides();
  schedule();
}

function updateCounts() {
  const length = $('tBody').value.length;
  $('bodyCount').textContent = `${length} / 900`;
  $('bodyCount').classList.toggle('over', length > 850);
  const many = state.slides.length > 1;
  $('slideLabel').textContent = many ? `· شريحة ${state.cur + 1} من ${state.slides.length}` : '';
  $('textSlideInfo').textContent = many ? `شريحة ${state.cur + 1} من ${state.slides.length}` : '';
}

function renderSlides() {
  const bar = $('slideBar');
  const buttons = state.slides.map((s, index) => el('button', {
    type: 'button', class: 'slide-btn', 'aria-current': String(index === state.cur), 'aria-label': `الشريحة ${index + 1}`,
    onclick: () => { state.cur = index; syncForm(); },
  }, String(index + 1)));
  const add = el('button', {
    type: 'button', class: 'slide-btn add', 'aria-label': 'إضافة شريحة', title: 'إضافة شريحة',
    onclick: () => {
      if (state.slides.length >= 10) { toast('الحد الأقصى 10 شرائح.', { type: 'warn' }); return; }
      state.slides.splice(state.cur + 1, 0, newSlide(PRESETS[state.preset].badge));
      state.cur += 1;
      syncForm();
      $('tTitle').focus();
    },
  }, icon('plus'));
  const nodes = [...buttons, add];
  if (state.slides.length > 1) {
    nodes.push(el('button', {
      type: 'button', class: 'btn ghost small',
      onclick: () => { state.slides.splice(state.cur, 1); state.cur = Math.max(0, state.cur - 1); syncForm(); },
    }, 'حذف هذه الشريحة'));
  }
  bar.replaceChildren(...nodes);
}

function saveDraft() {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({
      preset: state.preset, align: state.align, cur: state.cur,
      slides: state.slides.map(({ badge, title, body, footer, scene }) => ({ badge, title, body, footer, scene })),
    }));
  } catch { /* التخزين غير متاح */ }
}

function restoreDraft() {
  try {
    const saved = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
    if (!saved?.slides?.length) return;
    loadProject(saved, false);
  } catch { /* مسودة تالفة */ }
}

export function loadProject(project, notify = true) {
  state.preset = PRESETS[project.preset] ? project.preset : 'plain';
  state.align = project.align === 'right' ? 'right' : 'center';
  state.slides = project.slides.slice(0, 10).map(s => ({ ...newSlide(), badge: s.badge || '', title: s.title || '', body: s.body || '', footer: s.footer || '', scene: s.scene || '' }));
  state.cur = Math.min(project.cur ?? project.index ?? 0, state.slides.length - 1);
  syncForm();
  if (notify) toast('فُتح المنشور للتعديل. الرسمة التوضيحية (إن وُجدت) تحتاج توليدًا من جديد.', { timeout: 6000 });
}

function onField(field, id) {
  $(id).addEventListener('input', () => {
    slide()[field] = $(id).value;
    if (field === 'body') updateCounts();
    saveDraft();
    schedule();
  });
}

/* ---------- الذكاء الاصطناعي ---------- */
async function aiCall(path, json, label, wantBlob) {
  const controller = new AbortController();
  const progress = startProgress($('textProgress'), $('textProgressText'), label);
  aiWork = { controller, progress };
  syncAi();
  try {
    return await api(path, { method: 'POST', json, signal: controller.signal });
  } finally {
    progress.stop();
    aiWork = null;
    syncAi();
    app.refreshUsage?.();
  }
}

async function makeIllustration() {
  const scene = $('tScene').value.trim();
  if (!scene) throw new Error('اكتب وصف الرسمة أولًا.');
  const blob = await aiCall('/ai/illustration', { scene, quality: $('tHQ').checked ? 'high' : 'medium' }, 'جاري رسم الرسمة…');
  const image = new Image();
  image.src = URL.createObjectURL(blob);
  await image.decode();
  slide().illustration = image;
  slide().scene = scene;
  app.dirty = true;
  schedule();
}

async function makeAll() {
  const idea = $('tIdea').value.trim();
  if (!idea) { toast('اكتب فكرة المنشور أولًا.', { type: 'warn' }); $('tIdea').focus(); return; }
  try {
    const data = await aiCall('/ai/text', { idea }, 'جاري كتابة النص…');
    const s = slide();
    s.title = data.title || ''; s.body = data.body || ''; s.footer = data.footer || '';
    if (!s.badge && PRESETS[state.preset].badge) s.badge = PRESETS[state.preset].badge;
    if (data.illustration) s.scene = data.illustration;
    syncForm();
    saveDraft();
    if ($('tWithIll').checked && data.illustration) await makeIllustration();
    toast('تم. راجع النص والرسمة ثم احفظ أو انشر.', { type: 'ok' });
  } catch (error) {
    if (error.name === 'AbortError') toast('أُلغي الطلب.', { type: 'warn', timeout: 2500 });
    else toast(error.message, { type: 'bad', timeout: 8000 });
  }
}

function syncAi() {
  const hasKey = Boolean(app.status?.aiAvailable);
  $('tNoKey').hidden = hasKey;
  const busy = Boolean(aiWork);
  $('tMake').disabled = !hasKey || busy;
  $('tIllustrate').disabled = !hasKey || busy;
  $('textCancel').hidden = !busy;
}

/* ---------- ما يُسلَّم للشريط السفلي ---------- */
async function getPost() {
  const empty = state.slides.findIndex(s => !s.title.trim() && !s.body.trim());
  if (empty >= 0) {
    toast(state.slides.length > 1 ? `الشريحة ${empty + 1} فارغة. اكتب عنوانًا أو نصًا.` : 'اكتب عنوانًا أو نصًا أولًا.', { type: 'warn' });
    if (state.slides.length > 1) { state.cur = empty; syncForm(); }
    return null;
  }
  await document.fonts.ready;
  const plain = state.slides.map(({ badge, title, body, footer, scene }) => ({ badge, title, body, footer, scene }));
  const blobs = [];
  for (const s of state.slides) blobs.push(await slideBlob(s));
  const first = state.slides[0];
  return {
    kind: 'text', title: first.title.trim() || first.body.trim().slice(0, 40), body: state.slides.map(s => s.body.trim()).filter(Boolean).join('\n\n'),
    idea: $('tIdea').value.trim(), blobs,
    meta: blobs.map((_, index) => ({ type: 'text', preset: state.preset, align: state.align, slides: plain, index })),
  };
}

function renderPreviewShell() {
  const preview = $('textPreview');
  if ($('textMock').checked) {
    preview.replaceChildren(el('div', { class: 'mock' }, el('div', { class: 'mock-head' }, el('img', { src: '/logo.png', alt: '' }), 'raqeem'), canvas,
      el('div', { class: 'mock-cap', text: 'هكذا سيظهر المنشور في الموجز.' })));
  } else {
    preview.replaceChildren(canvas);
  }
}

export function initText() {
  dock = createDock($('textDock'), getPost);
  templateImage.onload = () => { templateReady = true; draw(); };
  templateImage.src = '/text-template.png';
  Promise.all(['500', '700', '900'].map(weight => document.fonts.load(`${weight} 40px Cairo`, 'أبجد abc 123')))
    .catch(() => {}).finally(() => { fontsReady = true; draw(); });

  restoreDraft();
  syncForm();
  onField('badge', 'tBadge'); onField('title', 'tTitle'); onField('body', 'tBody'); onField('footer', 'tFooter');
  $('tScene').addEventListener('input', () => { slide().scene = $('tScene').value; saveDraft(); });
  qsa('input[name=align]').forEach(radio => radio.addEventListener('change', () => { state.align = radio.value; saveDraft(); schedule(); }));
  qsa('input[name=preset]').forEach(radio => radio.addEventListener('change', () => {
    const previous = PRESETS[state.preset].badge;
    state.preset = radio.value;
    for (const s of state.slides) if (!s.badge || s.badge === previous) s.badge = PRESETS[state.preset].badge;
    syncForm();
    saveDraft();
  }));
  $('tMake').addEventListener('click', makeAll);
  $('tIllustrate').addEventListener('click', async () => {
    try { await makeIllustration(); toast('تم رسم الرسمة.', { type: 'ok', timeout: 2500 }); } catch (error) {
      if (error.name !== 'AbortError') toast(error.message, { type: 'bad', timeout: 8000 });
    }
  });
  $('tRemoveIll').addEventListener('click', () => { slide().illustration = null; schedule(); });
  $('textCancel').addEventListener('click', () => aiWork?.controller.abort());
  $('textMock').addEventListener('change', renderPreviewShell);
  syncAi();

  return {
    show: () => { renderPreviewShell(); draw(); syncAi(); },
    primary: () => dock.publish(), save: () => dock.save(), download: () => dock.download(), syncAi,
  };
}
