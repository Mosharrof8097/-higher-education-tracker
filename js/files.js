// ============================================================
// files.js — document storage adapter
//
//   Signed in → Supabase Storage (private bucket, <uid>/<docId>/<name>);
//               metadata is a normal synced record kind ("documents").
//   Guest     → IndexedDB via DB (db.js), as in the original demo.
// ============================================================

const Files = {
  BUCKET: 'documents',

  cloud() { return !!(Sync.client && Sync.uid && Storage.scope !== 'guest'); },

  // Storage object keys are picky; the display name is kept in metadata.
  safeName(name) {
    const cleaned = String(name).normalize('NFKD').replace(/[^\w.\-]+/g, '_').replace(/^_+|_+$/g, '');
    return (cleaned || 'file').slice(0, 120);
  },

  async list() {
    if (this.cloud()) return Storage.get(Storage.KEYS.documents) || [];
    return DB.getAllMeta();
  },

  // Returns { ok:true } or { ok:false, reason }
  async save(meta, file) {
    if (!this.cloud()) {
      await DB.saveFile(meta, await file.arrayBuffer());
      return { ok: true };
    }
    if (file.size > CONFIG.MAX_FILE_BYTES) {
      return { ok: false, reason: `"${file.name}" is larger than ${Math.round(CONFIG.MAX_FILE_BYTES / 1048576)} MB.` };
    }
    if (!navigator.onLine) return { ok: false, reason: 'You are offline — uploads need an internet connection.' };

    const used = (await this.list()).reduce((s, d) => s + (d.size || 0), 0);
    if (used + file.size > CONFIG.STORAGE_QUOTA_BYTES) {
      return { ok: false, reason: 'Cloud file storage is full (1 GB). Delete some documents first.' };
    }

    const path = `${Sync.uid}/${meta.id}/${this.safeName(file.name)}`;
    const { error } = await Sync.client.storage.from(this.BUCKET)
      .upload(path, file, { contentType: meta.mimeType, upsert: false });
    if (error) return { ok: false, reason: error.message };

    // Metadata is written only after the bytes are safely stored.
    const docs = Storage.get(Storage.KEYS.documents) || [];
    Storage.set(Storage.KEYS.documents, docs.concat({ ...meta, path }));
    return { ok: true };
  },

  async updateMeta(id, patch) {
    if (!this.cloud()) {
      const record = await DB.getFile(id);
      if (!record) return false;
      await DB.saveFile({ ...record, ...patch }, record.data);
      return true;
    }
    const docs = Storage.get(Storage.KEYS.documents) || [];
    if (!docs.some(d => d.id === id)) return false;
    Storage.set(Storage.KEYS.documents, docs.map(d => d.id === id ? { ...d, ...patch } : d));
    return true;
  },

  async download(id) {
    if (!this.cloud()) return DB.downloadFile(id);
    const doc = (Storage.get(Storage.KEYS.documents) || []).find(d => d.id === id);
    if (!doc) return showToast('File not found.', 'error');
    if (!navigator.onLine) return showToast('You are offline — downloads need an internet connection.', 'error');
    const { data, error } = await Sync.client.storage.from(this.BUCKET)
      .createSignedUrl(doc.path, 60, { download: doc.name });
    if (error) return showToast('❌ Download failed: ' + error.message, 'error');
    const a = document.createElement('a');
    a.href = data.signedUrl;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
  },

  async remove(id) {
    if (!this.cloud()) { await DB.deleteFile(id); return true; }
    const docs = Storage.get(Storage.KEYS.documents) || [];
    const doc = docs.find(d => d.id === id);
    if (!doc) return true;
    if (!navigator.onLine) { showToast('You are offline — deleting files needs an internet connection.', 'error'); return false; }
    const { error } = await Sync.client.storage.from(this.BUCKET).remove([doc.path]);
    if (error) { showToast('❌ Delete failed: ' + error.message, 'error'); return false; }
    Storage.set(Storage.KEYS.documents, docs.filter(d => d.id !== id));
    return true;
  },

  where() { return this.cloud() ? 'Stored in your account (private cloud storage)' : 'Stored in this browser only (IndexedDB)'; },

  // Delete every file this user owns (used before account deletion).
  async removeAllMine() {
    const store = Sync.client.storage.from(this.BUCKET);
    const paths = [];
    const top = await store.list(Sync.uid, { limit: 1000 });
    if (top.error) throw top.error;
    for (const entry of top.data || []) {
      const inner = await store.list(`${Sync.uid}/${entry.name}`, { limit: 1000 });
      if (inner.error) throw inner.error;
      (inner.data || []).forEach(f => paths.push(`${Sync.uid}/${entry.name}/${f.name}`));
    }
    for (let i = 0; i < paths.length; i += 100) {
      const { error } = await store.remove(paths.slice(i, i + 100));
      if (error) throw error;
    }
  },
};
