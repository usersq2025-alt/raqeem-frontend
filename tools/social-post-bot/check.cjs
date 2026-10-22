// فحص جاهزية بوت المنشورات: node check.cjs [--quiet]
// يرجع 0 إن كان كل شيء سليمًا، و1 مع تفصيل ما ينقص. يُستدعى تلقائيًا من start.ps1.
const { loadEnv, loadConfig, defaultDataDir } = require('./lib/config.cjs');
const { runHealthCheck } = require('./lib/health.cjs');

loadEnv();
runHealthCheck({ dataDir: defaultDataDir(), config: loadConfig(defaultDataDir()) }).then(result => {
  const quiet = process.argv.includes('--quiet');
  for (const check of result.checks) {
    if (quiet && check.ok) continue;
    console.log(`${check.ok ? 'PASS' : 'FAIL'}  ${check.name}${check.detail ? ` — ${check.detail}` : ''}`);
  }
  if (!quiet) console.log(result.ok ? '\nكل شيء جاهز.' : '\nيوجد ما يحتاج إصلاحًا.');
  process.exit(result.ok ? 0 : 1);
}).catch(error => {
  console.error(error);
  process.exit(1);
});
