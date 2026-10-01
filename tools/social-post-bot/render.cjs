const sharp = require('sharp');
const fs = require('node:fs/promises');
const path = require('node:path');

const WIDTH = 1122;
const HEIGHT = 1402;
const OUTPUT_WIDTH = 1080;
const OUTPUT_HEIGHT = 1350;
const FEATHER = 70;
const templatePath = path.join(__dirname, 'assets', 'approved-template.png');
const logoPath = path.join(__dirname, 'assets', 'logo.png');

let overlayPromise;

function clamp(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function userError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

async function getOverlay() {
  if (!overlayPromise) {
    overlayPromise = (async () => {
      const { data, info } = await sharp(templatePath)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      if (info.width !== WIDTH || info.height !== HEIGHT) {
        throw new Error('أبعاد القالب المعتمد غير متوقعة.');
      }
      const overlay = Buffer.alloc(WIDTH * HEIGHT * 4);
      for (let i = 0; i < WIDTH * HEIGHT; i++) {
        const offset = i * 4;
        const r = data[offset], g = data[offset + 1], b = data[offset + 2];
        const delta = 255 - Math.min(r, g, b);
        if (delta <= 2) continue;
        const alpha = Math.min(1, delta / 105);
        overlay[offset] = clamp(255 + (r - 255) / alpha);
        overlay[offset + 1] = clamp(255 + (g - 255) / alpha);
        overlay[offset + 2] = clamp(255 + (b - 255) / alpha);
        overlay[offset + 3] = clamp(alpha * 255);
      }
      return sharp(overlay, { raw: { width: WIDTH, height: HEIGHT, channels: 4 } })
        .png()
        .toBuffer();
    })();
    overlayPromise.catch(() => { overlayPromise = undefined; });
  }
  return overlayPromise;
}

// قناع يُليّن حواف الصورة الأمامية حتى لا يظهر خط حاد فوق الخلفية الضبابية.
async function featheredForeground(buffer, width, height) {
  const horizontal = width < WIDTH;
  const vertical = height < HEIGHT;
  if (!horizontal && !vertical) return buffer;
  const axis = vertical ? height : width;
  const stop = Math.min(0.3, FEATHER / axis);
  const gradient = vertical ? 'x1="0" y1="0" x2="0" y2="1"' : 'x1="0" y1="0" x2="1" y2="0"';
  const mask = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">` +
    `<defs><linearGradient id="g" ${gradient}>` +
    `<stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="${stop}" stop-color="#fff" stop-opacity="1"/>` +
    `<stop offset="${1 - stop}" stop-color="#fff" stop-opacity="1"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>` +
    `</linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/></svg>`,
  );
  return sharp(buffer).ensureAlpha()
    .composite([{ input: mask, blend: 'dest-in' }])
    .png()
    .toBuffer();
}

async function preparePhoto(input, fit, cropX, cropY) {
  let rotated;
  let metadata;
  try {
    rotated = await sharp(input).rotate().toBuffer();
    metadata = await sharp(rotated).metadata();
  } catch {
    throw userError('تعذرت قراءة الصورة. استخدم JPG أو PNG أو WebP (صور HEIC من الآيفون تحتاج تصديرًا إلى JPG).', 415);
  }
  if (!metadata.width || !metadata.height || metadata.width < 320 || metadata.height < 320) {
    throw userError('الصورة صغيرة جدًا؛ استخدم صورة لا يقل عرضها وارتفاعها عن 320 بكسل.');
  }
  if (metadata.width * metadata.height > 100_000_000) {
    throw userError('أبعاد الصورة كبيرة جدًا للمعالجة.');
  }

  let base;
  if (fit === 'contain') {
    const background = await sharp(rotated)
      .resize(WIDTH, HEIGHT, { fit: 'cover', position: 'attention' })
      .blur(28)
      .modulate({ brightness: 0.78, saturation: 0.88 })
      .toBuffer();
    const foreground = await sharp(rotated)
      .resize(WIDTH, HEIGHT, { fit: 'inside', withoutEnlargement: false })
      .png()
      .toBuffer();
    const foregroundInfo = await sharp(foreground).metadata();
    const soft = await featheredForeground(foreground, foregroundInfo.width, foregroundInfo.height);
    base = await sharp(background).composite([{
      input: soft,
      left: Math.floor((WIDTH - foregroundInfo.width) / 2),
      top: Math.floor((HEIGHT - foregroundInfo.height) / 2),
    }]).toBuffer();
  } else {
    const sourceRatio = metadata.width / metadata.height;
    const targetRatio = WIDTH / HEIGHT;
    let extract;
    if (sourceRatio > targetRatio) {
      const width = Math.max(1, Math.round(metadata.height * targetRatio));
      extract = {
        left: Math.round((metadata.width - width) * cropX), top: 0,
        width, height: metadata.height,
      };
    } else {
      const height = Math.max(1, Math.round(metadata.width / targetRatio));
      extract = {
        left: 0, top: Math.round((metadata.height - height) * cropY),
        width: metadata.width, height,
      };
    }
    base = await sharp(rotated)
      .extract(extract)
      .resize(WIDTH, HEIGHT)
      .toBuffer();
  }

  const stats = await sharp(base).stats();
  const mean = (stats.channels[0].mean + stats.channels[1].mean + stats.channels[2].mean) / 3;
  const brightness = mean < 90 ? 1.13 : mean < 125 ? 1.08 : mean > 205 ? 0.96 : 1.035;
  return sharp(base)
    .modulate({ brightness, saturation: 1.045 })
    .sharpen({ sigma: 0.7, m1: 0.65, m2: 1.35 })
    .png()
    .toBuffer();
}

async function renderPost(input, { fit = 'cover', cropX = 0.7, cropY = 0.5 } = {}) {
  const photo = await preparePhoto(input, fit, cropX, cropY);
  const overlay = await getOverlay();
  const logo = await sharp(await fs.readFile(logoPath))
    .resize(198, 109, { fit: 'contain' })
    .png()
    .toBuffer();
  const composed = await sharp(photo).composite([
    { input: overlay, left: 0, top: 0 },
    { input: logo, left: Math.round((WIDTH - 198) / 2), top: 0 },
  ]).png().toBuffer();
  return sharp(composed).resize(OUTPUT_WIDTH, OUTPUT_HEIGHT).png().toBuffer();
}

module.exports = { renderPost, getOverlay, WIDTH, HEIGHT, OUTPUT_WIDTH, OUTPUT_HEIGHT };
