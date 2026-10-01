export const $ = id => document.getElementById(id);
export const qs = (selector, root = document) => root.querySelector(selector);
export const qsa = (selector, root = document) => [...root.querySelectorAll(selector)];

export const app = {
  status: null,       // آخر رد من /status
  config: null,       // الإعدادات
  dirty: false,       // نتيجة ذكاء اصطناعي غير محفوظة (تحذير قبل المغادرة)
};

/* ---------- الاتصال بالخادم ---------- */
export async function api(path, { method = 'GET', json, body, headers = {}, signal, raw = false } = {}) {
  const init = { method, signal, headers: { 'X-Raqeem-Bot': '1', ...headers } };
  if (json !== undefined) {
    init.body = JSON.stringify(json);
    init.headers['Content-Type'] = 'application/json';
  } else if (body !== undefined) {
    init.body = body;
  }
  let response;
  try {
    response = await fetch(path, init);
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    document.getElementById('offlineBanner').hidden = false;
    throw new Error('تعذر الاتصال بالبوت. تأكد أنه يعمل.');
  }
  document.getElementById('offlineBanner').hidden = true;
  if (!response.ok) {
    const problem = await response.json().catch(() => ({}));
    const error = new Error(problem.error || 'تعذر تنفيذ الطلب.');
    error.status = response.status;
    throw error;
  }
  if (raw) return response;
  return (response.headers.get('content-type') || '').includes('json') ? response.json() : response.blob();
}

/* ---------- الإشعارات ---------- */
export function toast(message, { type = '', timeout = 4500, action } = {}) {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.setAttribute('role', type === 'bad' ? 'alert' : 'status');
  const text = document.createElement('span');
  text.textContent = message;
  el.append(text);
  if (action) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = action.label;
    button.addEventListener('click', () => { action.run(); el.remove(); });
    el.append(button);
  }
  $('toasts').append(el);
  if (timeout) setTimeout(() => el.remove(), timeout + (action ? 3000 : 0));
  return el;
}

/* ---------- نافذة التأكيد ---------- */
export function confirmDialog({ title, message, confirmText = 'تأكيد', danger = false }) {
  const dialog = $('confirmDialog');
  $('confirmTitle').textContent = title;
  $('confirmText').textContent = message;
  const yes = $('confirmYes');
  yes.textContent = confirmText;
  yes.className = `btn ${danger ? 'danger' : 'primary'}`;
  return new Promise(resolve => {
    const done = value => {
      yes.removeEventListener('click', onYes);
      $('confirmNo').removeEventListener('click', onNo);
      dialog.removeEventListener('close', onNo);
      if (dialog.open) dialog.close();
      resolve(value);
    };
    const onYes = () => done(true);
    const onNo = () => done(false);
    yes.addEventListener('click', onYes);
    $('confirmNo').addEventListener('click', onNo);
    dialog.addEventListener('close', onNo, { once: true });
    dialog.showModal();
  });
}

/* ---------- أدوات صغيرة ---------- */
export function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
    else if (value !== false && value != null) node.setAttribute(key, value === true ? '' : value);
  }
  for (const child of children.flat()) if (child != null) node.append(child.nodeType ? child : document.createTextNode(child));
  return node;
}

export function icon(name) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'i');
  const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  use.setAttribute('href', `#i-${name}`);
  svg.append(use);
  return svg;
}

export function button(label, { cls = 'soft small', iconName, onclick, title, disabled } = {}) {
  return el('button', { type: 'button', class: `btn ${cls}`, onclick, title, disabled }, iconName ? icon(iconName) : null, label);
}

export const debounce = (fn, ms) => {
  let timer;
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms); };
};

const dateFormat = new Intl.DateTimeFormat('ar-u-nu-latn', { dateStyle: 'medium', timeStyle: 'short' });
export const formatDate = value => (value ? dateFormat.format(new Date(value)) : '—');
export function relativeTime(value) {
  const diff = Date.parse(value) - Date.now();
  const abs = Math.abs(diff);
  const rtf = new Intl.RelativeTimeFormat('ar', { numeric: 'auto' });
  if (abs < 3_600_000) return rtf.format(Math.round(diff / 60_000), 'minute');
  if (abs < 86_400_000) return rtf.format(Math.round(diff / 3_600_000), 'hour');
  return rtf.format(Math.round(diff / 86_400_000), 'day');
}

export function download(blob, filename) {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 15_000);
}

export const money = value => `$${Number(value || 0).toFixed(2)}`;

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = el('textarea', { style: 'position:fixed;opacity:0' });
    area.value = text;
    document.body.append(area);
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    return ok;
  }
}

// يخفّض حجم الصورة قبل الرفع (للسرعة): أقصى ضلع 2048 و JPEG عالي الجودة.
export async function prepareUpload(file) {
  if (file.size < 1_500_000 && /image\/(jpeg|png|webp)/.test(file.type)) return file;
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const scale = Math.min(1, 2048 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.92));
    return blob || file;
  } catch {
    return file;
  }
}

export function startProgress(box, textEl, label, { cancel, onCancel } = {}) {
  const started = Date.now();
  box.hidden = false;
  const tick = () => { textEl.textContent = `${label} ${Math.round((Date.now() - started) / 1000)} ث`; };
  tick();
  const timer = setInterval(tick, 500);
  return {
    set(text) { label = text; tick(); },
    stop() { clearInterval(timer); box.hidden = true; },
  };
}

// يتحكم بعنصر dialog سريعًا
export const openDialog = id => { const dialog = $(id); if (!dialog.open) dialog.showModal(); return dialog; };
