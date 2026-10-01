const fs = require('node:fs/promises');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');

// فحص جاهزية البوت: الاعتماديات والقوالب والخطوط ومجلد البيانات.
async function runHealthCheck({ dataDir, config }) {
  const checks = [];
  const add = (name, ok, detail = '') => checks.push({ name, ok, detail });

  let sharp;
  try {
    sharp = require('sharp');
    add('حزمة sharp', true, `الإصدار ${sharp.versions?.sharp || '؟'}`);
  } catch (error) {
    add('حزمة sharp', false, `غير موجودة (${error.message.split('\n')[0]}). ثبّت اعتماديات raqeem-frontend.`);
  }
  add('إصدار Node', Number(process.versions.node.split('.')[0]) >= 22, `الإصدار ${process.versions.node} (المطلوب 22 أو أحدث)`);

  const expect = [
    ['قالب الصور', 'assets/approved-template.png', 1122, 1402],
    ['قالب النصوص', 'assets/text-template.png', 1080, 1350],
    ['الشعار', 'assets/logo.png'],
  ];
  for (const [name, file, width, height] of expect) {
    const full = path.join(ROOT, file);
    try {
      await fs.access(full);
      if (width && sharp) {
        const meta = await sharp(full).metadata();
        add(name, meta.width === width && meta.height === height, `${meta.width}×${meta.height}${meta.width === width ? '' : ` (المتوقع ${width}×${height})`}`);
      } else {
        add(name, true, file);
      }
    } catch {
      add(name, false, `الملف مفقود: ${file}`);
    }
  }

  for (const weight of ['500', '700', '900']) {
    const file = `public/fonts/cairo-arabic-${weight}-normal.woff2`;
    try { await fs.access(path.join(ROOT, file)); add(`خط Cairo ${weight}`, true); } catch { add(`خط Cairo ${weight}`, false, `مفقود: ${file}`); }
  }
  for (const file of ['public/index.html', 'public/app.js', 'public/app.css']) {
    try { await fs.access(path.join(ROOT, file)); add(`واجهة ${path.basename(file)}`, true); } catch { add(`واجهة ${path.basename(file)}`, false, `مفقود: ${file}`); }
  }

  try {
    await fs.mkdir(dataDir, { recursive: true });
    const probe = path.join(dataDir, `.write-test-${process.pid}`);
    await fs.writeFile(probe, 'ok');
    await fs.rm(probe);
    add('مجلد البيانات قابل للكتابة', true, dataDir);
  } catch (error) {
    add('مجلد البيانات قابل للكتابة', false, `${dataDir}: ${error.message}`);
  }

  add('مفتاح OpenAI', Boolean(process.env.OPENAI_API_KEY), process.env.OPENAI_API_KEY ? 'موجود' : 'غير مضبوط (الميزات الذكية معطلة، والمحلية تعمل)');
  add('نماذج مضبوطة', Boolean(config.models.imageEdit.length && config.models.text.length), `صور: ${config.models.imageEdit.join('، ')}`);
  // مفتاح OpenAI اختياري: لا يُفشل الفحص العام.
  const required = checks.filter(check => check.name !== 'مفتاح OpenAI');
  return { ok: required.every(check => check.ok), checks };
}

module.exports = { runHealthCheck };
