import { api, app, button, download, el, toast } from './util.js';
import { openPublish } from './publish.js';

const FORMAT_LABELS = [
  ['feed45', 'منشور 4:5 (1080×1350)'], ['square', 'مربع 1:1 (1080×1080)'],
  ['story', 'قصة 9:16 (1080×1920)'], ['landscape', 'فيسبوك أفقي (1200×630)'], ['all', 'كل المقاسات (ZIP)'],
];

export async function savePost(post) {
  const groupId = post.blobs.length > 1 ? crypto.randomUUID().replaceAll('-', '').slice(0, 24) : undefined;
  const items = [];
  for (const [index, blob] of post.blobs.entries()) {
    const meta = Array.isArray(post.meta) ? post.meta[index] : post.meta;
    items.push(await api('/api/history', {
      method: 'POST', body: blob,
      headers: {
        'Content-Type': 'image/png',
        'X-Meta': encodeURIComponent(JSON.stringify({ kind: post.kind, title: post.title, meta, groupId, slideIndex: index })),
      },
    }));
  }
  app.dirty = false;
  return items;
}

const slug = text => (text || 'post').replace(/[\\/:*?"<>|\s]+/g, '-').slice(0, 40);

// شريط الإجراءات تحت المعاينة: حفظ، تحميل بمقاس، الكابشن والنشر.
export function createDock(container, getPost) {
  const select = el('select', { 'aria-label': 'مقاس التحميل' }, FORMAT_LABELS.map(([value, label]) => el('option', { value, text: label })));
  const save = button('حفظ في المكتبة', { cls: 'soft', iconName: 'save', onclick: () => run(save, async () => {
    const post = await getPost();
    if (!post) return;
    const items = await savePost(post);
    toast(items.length > 1 ? `حُفظت ${items.length} شرائح في المكتبة.` : 'حُفظ المنشور في المكتبة.', {
      type: 'ok', action: { label: 'فتح المكتبة', run: () => document.querySelector('[data-tab=library]').click() },
    });
  }) });
  const down = button('تحميل', { cls: 'soft', iconName: 'download', onclick: () => run(down, async () => {
    const post = await getPost();
    if (!post) return;
    const format = select.value;
    if (post.blobs.length === 1 && format !== 'all') {
      const blob = format === 'feed45' ? post.blobs[0]
        : await api(`/api/export?format=${format}`, { method: 'POST', body: post.blobs[0], headers: { 'Content-Type': 'image/png' } });
      download(blob, `raqeem-${slug(post.title)}-${format}.png`);
      savePost(post).catch(() => {}); // نحفظ نسخة تلقائيًا حتى لا يضيع شيء
      return;
    }
    const items = await savePost(post);
    const zip = await api('/api/zip', { method: 'POST', json: { ids: items.map(item => item.id), formats: format === 'all' ? 'all' : [format] } });
    download(zip, `raqeem-${slug(post.title)}.zip`);
  }) });
  const publish = button('الكابشن والنشر', { cls: 'primary', iconName: 'send', onclick: () => run(publish, async () => {
    const post = await getPost();
    if (!post) return;
    const items = await savePost(post);
    await openPublish({ items, post });
  }) });

  async function run(btn, task) {
    btn.setAttribute('aria-busy', 'true');
    btn.disabled = true;
    try { await task(); } catch (error) { if (error.name !== 'AbortError') toast(error.message, { type: 'bad' }); } finally {
      btn.removeAttribute('aria-busy');
      btn.disabled = false;
    }
  }

  container.replaceChildren(publish, save, down, select);
  return { save: () => save.click(), download: () => down.click(), publish: () => publish.click(), setEnabled(enabled) { [save, down, publish].forEach(b => { b.disabled = !enabled; }); } };
}
