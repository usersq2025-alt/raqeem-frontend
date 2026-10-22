const http = require('node:http');
const sharp = require('sharp');

// خادم OpenAI وهمي للاختبارات والتجربة اليدوية: لا يستهلك أي رصيد.
async function startMockOpenAI({ failImageTimes = 0, failStatus = 500 } = {}) {
  const calls = [];
  let imageFailures = failImageTimes;
  const server = http.createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const raw = Buffer.concat(chunks);
    calls.push({ url: req.url, auth: req.headers.authorization, bytes: raw.length });
    const json = (status, body) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(body)); };
    if (req.url === '/images/edits' || req.url === '/images/generations') {
      if (imageFailures > 0) {
        imageFailures--;
        return json(failStatus, { error: { message: 'mock failure' } });
      }
      const edit = req.url === '/images/edits';
      const png = edit
        ? await sharp({ create: { width: 1088, height: 1360, channels: 3, background: '#d9e8ff' } }).composite([{ input: Buffer.from('<svg width="600" height="600"><circle cx="300" cy="300" r="280" fill="#ffb524"/></svg>'), gravity: 'center' }]).png().toBuffer()
        : await sharp({ create: { width: 1024, height: 1024, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite([{ input: Buffer.from('<svg width="800" height="800"><circle cx="400" cy="400" r="380" fill="#092d75"/><circle cx="400" cy="400" r="200" fill="#ffb524"/></svg>'), gravity: 'center' }]).png().toBuffer();
      return json(200, { data: [{ b64_json: png.toString('base64') }] });
    }
    if (req.url === '/chat/completions') {
      const body = JSON.parse(raw.toString('utf8'));
      const system = body.messages[0].content;
      const content = system.includes('caption')
        ? { caption: 'تعلّم ممتع كل يوم مع رقيم ✨\nانضموا إلينا وشجّعوا أبناءكم على القراءة.', hashtags: ['#رقيم', '#قراءة', '#أطفال'] }
        : { title: 'القراءة رحلة ممتعة', body: 'شجّعوا أبناءكم على القراءة يوميًا.\n\nخطوة صغيرة كل يوم تصنع فرقًا كبيرًا.', footer: 'سجّل الآن', illustration: 'a happy child reading a book' };
      return json(200, { choices: [{ message: { content: JSON.stringify(content) } }] });
    }
    return json(404, { error: { message: 'not found' } });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return {
    url: `http://127.0.0.1:${server.address().port}`,
    calls,
    setImageFailures(count) { imageFailures = count; },
    close: () => new Promise(resolve => server.close(resolve)),
  };
}

module.exports = { startMockOpenAI };
