const sharp = require('sharp');

// المقاسات المدعومة. النشر الأساسي 4:5، والبقية تُشتق منه بخلفية ناعمة مأخوذة من الصورة نفسها.
const FORMATS = {
  feed45: { label: 'منشور عمودي 4:5', width: 1080, height: 1350, suffix: '1080x1350' },
  square: { label: 'منشور مربع 1:1', width: 1080, height: 1080, suffix: '1080x1080' },
  story: { label: 'قصة / ريلز 9:16', width: 1080, height: 1920, suffix: '1080x1920' },
  landscape: { label: 'فيسبوك أفقي', width: 1200, height: 630, suffix: '1200x630' },
};

async function exportFormat(png, key) {
  const format = FORMATS[key];
  if (!format) {
    const error = new Error('مقاس غير مدعوم.');
    error.status = 400;
    throw error;
  }
  const meta = await sharp(png).metadata();
  if (meta.width === format.width && meta.height === format.height) return png;
  const background = await sharp(png)
    .resize(format.width, format.height, { fit: 'cover', position: 'centre' })
    .blur(36)
    .modulate({ brightness: 0.72, saturation: 0.9 })
    .toBuffer();
  const foreground = await sharp(png)
    .resize(format.width, format.height, { fit: 'inside' })
    .png()
    .toBuffer();
  const info = await sharp(foreground).metadata();
  return sharp(background)
    .composite([{
      input: foreground,
      left: Math.floor((format.width - info.width) / 2),
      top: Math.floor((format.height - info.height) / 2),
    }])
    .png()
    .toBuffer();
}

// إنستغرام يقبل JPEG فقط عبر رابط الصورة.
const toJpeg = png => sharp(png).flatten({ background: '#ffffff' }).jpeg({ quality: 92, mozjpeg: true }).toBuffer();

module.exports = { FORMATS, exportFormat, toJpeg };
