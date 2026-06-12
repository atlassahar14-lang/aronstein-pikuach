/**
 * One-time migration: move Base64 media from app_data.projects JSON to Supabase Storage.
 * Safe to re-run — verifies Storage URL before replacing data: URLs; skips already-migrated items.
 *
 * Usage (do NOT commit keys):
 *   set SUPABASE_SERVICE_ROLE=eyJ...
 *   set SUPABASE_ACCESS_TOKEN=sbp_...
 *   node scripts/migrate-base64-to-storage.mjs
 */
const PROJECT_REF = 'knbbbrnwzbkywkrcponi';
const SUPABASE_URL = `https://${PROJECT_REF}.supabase.co`;
const BUCKET = 'media';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE;

if (!SERVICE_KEY) {
  console.error('Set SUPABASE_SERVICE_ROLE');
  process.exit(1);
}

function isDataUrl(s) {
  return typeof s === 'string' && s.startsWith('data:');
}
function isHttpUrl(s) {
  return typeof s === 'string' && /^https:\/\//i.test(s);
}
function extFromDataUrl(dataUrl) {
  const m = dataUrl.match(/^data:([^;,]+)/);
  const map = {
    'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif',
    'application/pdf': 'pdf',
  };
  return map[(m?.[1] || '').toLowerCase()] || 'bin';
}
function dataUrlToBuffer(dataUrl) {
  const [, meta, b64] = dataUrl.match(/^data:([^;]+)?;base64,(.+)$/) || [];
  if (!b64) throw new Error('invalid data url');
  return { mime: meta || 'application/octet-stream', buf: Buffer.from(b64, 'base64') };
}
async function verifyUrl(url) {
  try {
    let res = await fetch(url, { method: 'HEAD' });
    if (res.ok) return true;
    if (res.status === 405 || res.status === 403) {
      res = await fetch(url, { headers: { Range: 'bytes=0-0' } });
      return res.ok || res.status === 206;
    }
    return false;
  } catch {
    return false;
  }
}
async function uploadBuffer(path, mime, buf) {
  const url = `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SERVICE_KEY}`,
      apikey: SERVICE_KEY,
      'Content-Type': mime,
      'x-upsert': 'true',
    },
    body: buf,
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`upload ${path}: ${res.status} ${t}`);
  }
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;
}
async function migrateField(item, urlKey, projectId, folder, itemId, label, stats) {
  const dataUrl = item[urlKey];
  if (!isDataUrl(dataUrl)) {
    if (item.path && isHttpUrl(item[urlKey]) && await verifyUrl(item[urlKey])) {
      stats.skipped++;
      return true;
    }
    stats.skipped++;
    return true;
  }
  const ext = extFromDataUrl(dataUrl);
  const storagePath = `${folder}/${projectId}/${itemId}.${ext}`;
  const existingPublic = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${storagePath}`;

  if (await verifyUrl(existingPublic)) {
    console.log(`  recover ${label}`);
    item[urlKey] = existingPublic;
    item.path = storagePath;
    stats.recovered++;
    return true;
  }

  const { mime, buf } = dataUrlToBuffer(dataUrl);
  console.log(`  upload ${label} (${Math.round(buf.length / 1024)}KB)`);
  const publicUrl = await uploadBuffer(storagePath, mime, buf);
  if (!(await verifyUrl(publicUrl))) throw new Error(`verify failed: ${label}`);
  item[urlKey] = publicUrl;
  item.path = storagePath;
  if (!item.type) item.type = mime;
  stats.migrated++;
  return true;
}
function normalizeGallery(proj) {
  if (!Array.isArray(proj.galleryPosts)) {
    proj.galleryPosts = (proj.photos || []).map((p) => {
      const ts = p.uploadedAt || p.date || new Date().toISOString();
      return {
        id: `gpost_${p.id}`,
        text: p.caption || '',
        createdAt: ts,
        updatedAt: ts,
        images: [{ id: p.id, name: p.name || '', url: p.url, path: p.path || null, type: p.type || '', uploadedAt: ts }],
      };
    });
  }
}
function galleryImageById(proj, imgId) {
  for (const post of proj.galleryPosts || []) {
    const img = (post.images || []).find((x) => x.id === imgId);
    if (img) return img;
  }
  return null;
}
function cleanupPhotos(proj) {
  if (!Array.isArray(proj.photos) || !proj.photos.length) return;
  const ok = proj.photos.every((ph) => {
    if (isDataUrl(ph.url)) return false;
    const g = galleryImageById(proj, ph.id);
    return !(g && isDataUrl(g.url));
  });
  if (ok) delete proj.photos;
}
function hasBase64(proj) {
  if ((proj.documents || []).some((d) => isDataUrl(d.url))) return true;
  if ((proj.photos || []).some((p) => isDataUrl(p.url))) return true;
  if ((proj.updates || []).some((u) => isDataUrl(u.mediaUrl))) return true;
  normalizeGallery(proj);
  return (proj.galleryPosts || []).some((post) => (post.images || []).some((img) => isDataUrl(img.url)));
}
async function fetchProjects() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/app_data?id=eq.main&select=projects,activity_log`, {
    headers: { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY },
  });
  if (!res.ok) throw new Error(`fetch: ${res.status} ${await res.text()}`);
  const rows = await res.json();
  if (!rows[0]) throw new Error('app_data row missing');
  return { projects: rows[0].projects, activityLog: rows[0].activity_log };
}
async function saveProjects(projects, activityLog) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/app_data?id=eq.main`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${SERVICE_KEY}`,
      apikey: SERVICE_KEY,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({ projects, activity_log: activityLog ?? [], updated_at: new Date().toISOString() }),
  });
  if (!res.ok) throw new Error(`save: ${res.status} ${await res.text()}`);
}
async function main() {
  const { projects, activityLog } = await fetchProjects();
  const stats = { migrated: 0, recovered: 0, skipped: 0 };
  const errors = [];

  for (const proj of projects) {
    if (!hasBase64(proj)) continue;
    console.log(`Project ${proj.id} (${proj.name})`);
    for (const doc of proj.documents || []) {
      if (!isDataUrl(doc.url)) continue;
      try {
        await migrateField(doc, 'url', proj.id, 'documents', doc.id, `doc ${doc.name}`, stats);
      } catch (e) { errors.push(e.message); }
    }
    normalizeGallery(proj);
    for (const post of proj.galleryPosts || []) {
      for (const img of post.images || []) {
        if (!isDataUrl(img.url)) continue;
        try {
          await migrateField(img, 'url', proj.id, `gallery/${post.id}`, img.id, `gallery ${img.id}`, stats);
        } catch (e) { errors.push(e.message); }
      }
    }
    for (const ph of proj.photos || []) {
      if (!isDataUrl(ph.url)) continue;
      const gal = galleryImageById(proj, ph.id);
      if (gal && !isDataUrl(gal.url) && isHttpUrl(gal.url) && await verifyUrl(gal.url)) {
        ph.url = gal.url;
        ph.path = gal.path;
        stats.skipped++;
        continue;
      }
      try {
        await migrateField(ph, 'url', proj.id, 'gallery/legacy', ph.id, `legacy ${ph.id}`, stats);
        if (gal && isDataUrl(gal.url)) {
          gal.url = ph.url;
          gal.path = ph.path;
          gal.type = ph.type || gal.type;
        }
      } catch (e) { errors.push(e.message); }
    }
    for (const upd of proj.updates || []) {
      if (!isDataUrl(upd.mediaUrl)) continue;
      try {
        await migrateField(upd, 'mediaUrl', proj.id, 'updates', upd.id, `update ${upd.id}`, stats);
      } catch (e) { errors.push(e.message); }
    }
    cleanupPhotos(proj);
  }

  if (errors.length) {
    console.error('Errors (JSON NOT saved):', errors);
    process.exit(1);
  }

  const size = Buffer.byteLength(JSON.stringify(projects));
  console.log(`Saving JSON (${Math.round(size / 1024)}KB)...`, stats);
  if (size > 1_500_000) throw new Error(`payload still too large: ${size}`);
  await saveProjects(projects, activityLog);
  console.log('Done.');
}
main().catch((e) => { console.error(e); process.exit(1); });
