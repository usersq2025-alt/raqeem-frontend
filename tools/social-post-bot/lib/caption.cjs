const LIMITS = { instagram: 2200, facebook: 63206 };

function normalizeHashtags(list) {
  const seen = new Set();
  const out = [];
  for (const raw of list || []) {
    const tag = String(raw).trim().replace(/\s+/g, '_').replace(/^#+/, '').replace(/[^\p{L}\p{N}_]/gu, '');
    if (!tag || seen.has(tag)) continue;
    seen.add(tag);
    out.push(`#${tag}`);
    if (out.length === 30) break;
  }
  return out;
}

// كابشن احتياطي بلا ذكاء اصطناعي: العنوان + مقتطف من النص + الدعوة + الوسوم الافتراضية.
function buildLocalCaption({ title = '', body = '', brand = {} }) {
  const paragraphs = String(body).split(/\n+/).map(line => line.trim()).filter(Boolean);
  let excerpt = paragraphs.join('\n');
  if (excerpt.length > 500) excerpt = `${excerpt.slice(0, 497).replace(/\s+\S*$/, '')}…`;
  const caption = [String(title).trim(), excerpt, brand.cta || ''].filter(Boolean).join('\n\n');
  return { caption, hashtags: normalizeHashtags(brand.hashtags) };
}

function composeCaption(caption, hashtags) {
  const tags = normalizeHashtags(hashtags);
  return [String(caption || '').trim(), tags.join(' ')].filter(Boolean).join('\n\n');
}

function validateForTargets(fullCaption, targets) {
  const problems = [];
  if (targets.includes('instagram')) {
    if (fullCaption.length > LIMITS.instagram) problems.push(`كابشن إنستغرام أطول من ${LIMITS.instagram} حرفًا (الحالي ${fullCaption.length}).`);
    if ((fullCaption.match(/#[\p{L}\p{N}_]+/gu) || []).length > 30) problems.push('إنستغرام يسمح بـ 30 وسمًا كحد أقصى.');
  }
  return problems;
}

module.exports = { LIMITS, normalizeHashtags, buildLocalCaption, composeCaption, validateForTargets };
