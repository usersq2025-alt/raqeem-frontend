const { composeCaption, validateForTargets } = require('./caption.cjs');

const TARGETS = ['facebook', 'instagram'];

function fail(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

// الجدولة: لا شيء يُنشر قبل الموافقة الصريحة (approved). الحالات:
// draft → approved → publishing → published | failed | missed | cancelled
function createScheduler({ store, meta, getConfig, logger, now = () => Date.now() }) {
  let timer;
  let ticking = false;
  const cfg = () => getConfig().schedule || {};

  async function create({ historyIds, targets, caption, hashtags, scheduledAt }) {
    const ids = [...new Set(historyIds || [])];
    if (!ids.length || ids.length > 10) throw fail(400, 'اختر من 1 إلى 10 صور للمنشور.');
    const chosen = [...new Set(targets || [])].filter(target => TARGETS.includes(target));
    if (!chosen.length) throw fail(400, 'اختر منصة واحدة على الأقل.');
    for (const id of ids) await store.getHistory(id);
    const full = composeCaption(caption, hashtags);
    const problems = validateForTargets(full, chosen);
    if (problems.length) throw fail(400, problems.join(' '));
    const time = scheduledAt ? Date.parse(scheduledAt) : NaN;
    if (scheduledAt && !Number.isFinite(time)) throw fail(400, 'وقت الجدولة غير صالح.');
    return store.addQueue({
      historyIds: ids, targets: chosen, caption: String(caption || ''), hashtags: hashtags || [],
      scheduledAt: Number.isFinite(time) ? new Date(time).toISOString() : null,
    });
  }

  async function approve(id, scheduledAt) {
    const status = await meta.status();
    return store.updateQueue(id, item => {
      if (!['draft', 'failed', 'missed'].includes(item.status)) throw fail(409, 'لا يمكن اعتماد هذا العنصر في حالته الحالية.');
      for (const target of item.targets) {
        if (!status[target].ready) throw fail(400, `${target === 'facebook' ? 'فيسبوك' : 'إنستغرام'} غير جاهز: ${status[target].reason}`);
      }
      const time = scheduledAt === undefined || scheduledAt === null ? Date.parse(item.scheduledAt || '') : Date.parse(scheduledAt);
      const value = Number.isFinite(time) ? time : now();
      if (value < now() - 60_000 && scheduledAt) throw fail(400, 'وقت الجدولة في الماضي. اختر وقتًا قادمًا أو انشر الآن.');
      item.scheduledAt = new Date(Math.max(value, 0)).toISOString();
      item.status = 'approved';
      item.approvedAt = new Date(now()).toISOString();
      item.attempts = 0;
      item.nextAttemptAt = null;
      item.lastError = null;
    });
  }

  const publishNow = id => approve(id, new Date(now()).toISOString()).then(item => tick().then(() => store.getQueue(item.id)));

  async function cancel(id) {
    return store.updateQueue(id, item => {
      if (item.status === 'publishing') throw fail(409, 'العنصر قيد النشر الآن.');
      if (item.status === 'published') throw fail(409, 'المنشور نُشر بالفعل ولا يمكن إلغاؤه من هنا.');
      item.status = 'cancelled';
    });
  }

  async function update(id, { scheduledAt, caption, hashtags }) {
    return store.updateQueue(id, item => {
      if (['publishing', 'published'].includes(item.status)) throw fail(409, 'لا يمكن تعديل عنصر قيد النشر أو منشور.');
      if (scheduledAt !== undefined) {
        const time = Date.parse(scheduledAt);
        if (!Number.isFinite(time)) throw fail(400, 'وقت الجدولة غير صالح.');
        item.scheduledAt = new Date(time).toISOString();
        if (item.status === 'missed') item.status = 'draft';
      }
      if (caption !== undefined) item.caption = String(caption);
      if (hashtags !== undefined) item.hashtags = hashtags;
      const problems = validateForTargets(composeCaption(item.caption, item.hashtags), item.targets);
      if (problems.length) throw fail(400, problems.join(' '));
    });
  }

  async function runItem(item) {
    await store.updateQueue(item.id, entry => { entry.status = 'publishing'; });
    let outcome;
    try {
      const pngs = [];
      for (const id of item.historyIds) pngs.push(await store.readImage(id));
      outcome = await meta.publish({
        targets: item.targets, caption: composeCaption(item.caption, item.hashtags), pngs, done: item.results || {},
      });
    } catch (error) {
      outcome = Object.fromEntries(item.targets.map(target => [target, { ok: false, error: error.message }]));
    }
    const allDone = item.targets.every(target => outcome[target]?.ok);
    const errors = item.targets.filter(target => !outcome[target]?.ok).map(target => `${target}: ${outcome[target]?.error}`);
    const updated = await store.updateQueue(item.id, entry => {
      entry.results = outcome;
      entry.attempts = (entry.attempts || 0) + 1;
      if (allDone) {
        entry.status = 'published';
        entry.publishedAt = new Date(now()).toISOString();
        entry.lastError = null;
      } else {
        entry.lastError = errors.join(' | ');
        const authProblem = item.targets.some(target => [401, 403].includes(outcome[target]?.status));
        if (entry.attempts >= (cfg().maxAttempts || 3) || authProblem) {
          entry.status = 'failed';
        } else {
          const wait = (cfg().retryMinutes || [2, 10, 30])[entry.attempts - 1] ?? 30;
          entry.status = 'approved';
          entry.nextAttemptAt = new Date(now() + wait * 60_000).toISOString();
        }
      }
    });
    if (allDone) {
      for (const id of item.historyIds) {
        await store.patchHistory(id, { status: 'published', publishedAt: updated.publishedAt }).catch(() => {});
      }
      logger?.info('نُشر المنشور', { queueId: item.id, targets: item.targets });
    } else {
      logger?.warn('تعذر النشر', { queueId: item.id, error: updated.lastError, status: updated.status });
    }
    return updated;
  }

  // يُنفَّذ كل نصف دقيقة: ينشر المستحق، ويعلّم الفائت بعد مهلة السماح بأنه "فاته الموعد".
  async function tick() {
    if (ticking) return;
    ticking = true;
    try {
      const current = now();
      const grace = (cfg().graceHours ?? 6) * 3_600_000;
      for (const item of await store.listQueue()) {
        if (item.status !== 'approved') continue;
        const due = Date.parse(item.scheduledAt);
        if (!Number.isFinite(due) || due > current) continue;
        if (item.nextAttemptAt && Date.parse(item.nextAttemptAt) > current) continue;
        if (current - due > grace && !item.attempts) {
          await store.updateQueue(item.id, entry => {
            entry.status = 'missed';
            entry.lastError = 'فات موعد النشر والبوت كان متوقفًا. راجع المنشور ثم أعد جدولته أو انشره الآن.';
          });
          logger?.warn('فات موعد منشور', { queueId: item.id });
          continue;
        }
        await runItem(item);
      }
    } catch (error) {
      logger?.error('خطأ في دورة الجدولة', error);
    } finally {
      ticking = false;
    }
  }

  // بعد انقطاع مفاجئ: ما كان "قيد النشر" قد يكون نُشر فعلًا، فلا نعيد نشره تلقائيًا.
  async function recover() {
    for (const item of await store.listQueue()) {
      if (item.status !== 'publishing') continue;
      await store.updateQueue(item.id, entry => {
        entry.status = 'failed';
        entry.lastError = 'توقف البوت أثناء النشر. تحقق من صفحتك أولًا لتتأكد أن المنشور لم يُنشر، ثم أعد المحاولة.';
      });
    }
  }

  async function retry(id) {
    return approve(id, new Date(now()).toISOString());
  }

  async function start() {
    await recover();
    meta.maybeRefresh().catch(() => {});
    const every = Math.max(5, cfg().tickSeconds || 30) * 1000;
    timer = setInterval(tick, every);
    timer.unref?.();
    setInterval(() => meta.maybeRefresh().catch(() => {}), 12 * 3_600_000).unref?.();
    tick();
  }

  const stop = () => clearInterval(timer);

  return { create, approve, publishNow, cancel, update, retry, tick, start, stop, recover };
}

module.exports = { createScheduler, TARGETS };
