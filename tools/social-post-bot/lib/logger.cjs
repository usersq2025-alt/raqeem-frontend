const fs = require('node:fs');
const path = require('node:path');

const MAX_BYTES = 2 * 1024 * 1024;
const KEEP = 5;

// يمنع تسرب المفاتيح والتوكنات إلى ملف السجل.
function redact(text) {
  return String(text)
    .replace(/sk-[A-Za-z0-9_-]{8,}/g, 'sk-***')
    .replace(/EAA[A-Za-z0-9]{20,}/g, 'EAA***')
    .replace(/(access_token|client_secret|fb_exchange_token|input_token)=[^&\s"]+/g, '$1=***')
    .replace(/Bearer\s+[A-Za-z0-9._-]+/g, 'Bearer ***');
}

function createLogger(dir, { echo = true } = {}) {
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, 'social.log');

  function rotate() {
    try {
      if (fs.statSync(file).size < MAX_BYTES) return;
    } catch { return; }
    for (let i = KEEP - 1; i >= 1; i--) {
      try { fs.renameSync(`${file}.${i}`, `${file}.${i + 1}`); } catch { /* غير موجود */ }
    }
    try { fs.renameSync(file, `${file}.1`); } catch { /* تجاهل */ }
    try { fs.unlinkSync(`${file}.${KEEP + 1}`); } catch { /* تجاهل */ }
  }

  function write(level, message, extra) {
    const detail = extra === undefined ? '' : ' ' + (extra instanceof Error ? extra.message : JSON.stringify(extra));
    const line = redact(`${new Date().toISOString()} [${level}] ${message}${detail}`);
    try {
      rotate();
      fs.appendFileSync(file, line + '\n');
    } catch { /* السجل لا يجب أن يوقف البوت */ }
    if (echo) (level === 'error' ? console.error : console.log)(line);
  }

  function tail(lines = 100) {
    try {
      const text = fs.readFileSync(file, 'utf8');
      return text.split('\n').filter(Boolean).slice(-lines);
    } catch { return []; }
  }

  return {
    file,
    info: (message, extra) => write('info', message, extra),
    warn: (message, extra) => write('warn', message, extra),
    error: (message, extra) => write('error', message, extra),
    tail,
  };
}

module.exports = { createLogger, redact };
