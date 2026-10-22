// تشغيل تجريبي معزول: OpenAI وهمي + نشر تجريبي + بيانات مؤقتة. لا يمس .env ولا رصيدك.
// الاستخدام: node test/dev-server.cjs   ثم افتح http://127.0.0.1:4599
const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs');
const { startMockOpenAI } = require('./helpers/mock-openai.cjs');

(async () => {
  const mock = await startMockOpenAI();
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'raqeem-dev-'));
  Object.assign(process.env, {
    RAQEEM_NO_ENV: '1', OPENAI_API_KEY: 'sk-test-mock', OPENAI_BASE_URL: mock.url,
    RAQEEM_SOCIAL_DATA_DIR: dataDir, RAQEEM_SOCIAL_BOT_PORT: process.env.RAQEEM_SOCIAL_BOT_PORT || '4599',
    RAQEEM_META_DRY_RUN: '1',
  });
  console.log(`وضع التجربة — بيانات مؤقتة: ${dataDir}`);
  require('../server.cjs').start();
})();
