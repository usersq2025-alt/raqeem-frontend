const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');
const { renderPost } = require('../render.cjs');
const { FORMATS, exportFormat, toJpeg } = require('../lib/formats.cjs');
const { createZip } = require('../lib/zip.cjs');

// صورة اختبار حتمية (بدون عشوائية) لمقارنتها بصورة مرجعية.
async function sample(width, height) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2a6bd6"/><stop offset="1" stop-color="#ffb524"/></linearGradient></defs>
    <rect width="100%" height="100%" fill="url(#g)"/><circle cx="${width / 2}" cy="${height / 2}" r="${Math.min(width, height) / 4}" fill="#ffffff"/></svg>`;
  return sharp(Buffer.from(svg)).jpeg({ quality: 95 }).toBuffer();
}

for (const [name, w, h] of [['أفقية', 1600, 900], ['عمودية', 900, 1600], ['مربعة', 1000, 1000], ['صغيرة الحد', 320, 320]]) {
  for (const fit of ['cover', 'contain']) {
    test(`الرسم: صورة ${name} بوضع ${fit} تنتج 1080×1350`, async () => {
      const out = await renderPost(await sample(w, h), { fit });
      const meta = await sharp(out).metadata();
      assert.equal(meta.width, 1080);
      assert.equal(meta.height, 1350);
      assert.equal(meta.format, 'png');
    });
  }
}

test('الرسم: يرفض الصور الصغيرة جدًا والملفات التالفة برسائل واضحة', async () => {
  await assert.rejects(renderPost(await sample(200, 200)), /صغيرة جدًا/);
  await assert.rejects(renderPost(Buffer.from('not an image')), error => error.status === 415);
});

test('الرسم: القص الأفقي يغيّر النتيجة', async () => {
  const input = await sample(1600, 900);
  const left = await renderPost(input, { cropX: 0 });
  const right = await renderPost(input, { cropX: 1 });
  assert.notDeepEqual(left, right);
});

test('الرسم: مطابقة بصرية مع الصورة المرجعية (القالب والشعار والتركيب)', async () => {
  const reference = path.join(__dirname, 'fixtures', 'render-reference.png');
  const out = await renderPost(await sample(1600, 900), { fit: 'cover', cropX: 0.5 });
  if (!fs.existsSync(reference) || process.env.UPDATE_SNAPSHOTS === '1') {
    fs.mkdirSync(path.dirname(reference), { recursive: true });
    fs.writeFileSync(reference, out);
    return;
  }
  const a = await sharp(out).resize(270, 338).raw().toBuffer();
  const b = await sharp(reference).resize(270, 338).raw().toBuffer();
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff += Math.abs(a[i] - b[i]);
  const mean = diff / a.length;
  assert.ok(mean < 3, `الفرق البصري المتوسط ${mean.toFixed(2)} أكبر من الحد المسموح (3). إن كان التغيير مقصودًا شغّل UPDATE_SNAPSHOTS=1.`);
});

test('المقاسات: كل مقاس يخرج بأبعاده الدقيقة', async () => {
  const base = await renderPost(await sample(1600, 900));
  for (const [key, format] of Object.entries(FORMATS)) {
    const meta = await sharp(await exportFormat(base, key)).metadata();
    assert.equal(`${meta.width}x${meta.height}`, `${format.width}x${format.height}`, key);
  }
  await assert.rejects(exportFormat(base, 'nope'), error => error.status === 400);
});

test('إنستغرام: التحويل إلى JPEG حقيقي', async () => {
  const jpeg = await toJpeg(await renderPost(await sample(1600, 900)));
  assert.equal((await sharp(jpeg).metadata()).format, 'jpeg');
});

test('ZIP: ترويسات صحيحة وأسماء عربية وCRC سليم', () => {
  const zlib = require('node:zlib');
  const files = [{ name: 'ملف-1.png', data: Buffer.from('hello') }, { name: 'b.txt', data: Buffer.from('world!') }];
  const zip = createZip(files);
  assert.equal(zip.readUInt32LE(zip.length - 22), 0x06054b50);
  assert.equal(zip.readUInt16LE(zip.length - 22 + 10), 2);
  let offset = 0;
  for (const file of files) {
    assert.equal(zip.readUInt32LE(offset), 0x04034b50);
    assert.equal(zip.readUInt32LE(offset + 14), zlib.crc32(file.data));
    const nameLength = zip.readUInt16LE(offset + 26);
    assert.equal(zip.subarray(offset + 30, offset + 30 + nameLength).toString('utf8'), file.name);
    offset += 30 + nameLength + file.data.length;
  }
});
