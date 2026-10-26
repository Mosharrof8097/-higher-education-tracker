// ============================================================
// db.js — IndexedDB wrapper for Document Archive
// Stores actual file data (PDF, images) in the browser DB
// ============================================================

const DB = {
  db: null,
  DB_NAME: 'hed_archive_db',
  DB_VERSION: 1,
  STORE: 'documents',

  open() {
    return new Promise((resolve, reject) => {
      if (this.db) { resolve(this.db); return; }
      const req = indexedDB.open(this.DB_NAME, this.DB_VERSION);
      req.onupgradeneeded = e => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(this.STORE)) {
          db.createObjectStore(this.STORE, { keyPath: 'id' });
        }
      };
      req.onsuccess = e => { this.db = e.target.result; resolve(this.db); };
      req.onerror = e => reject(e.target.error);
    });
  },

  async saveFile(meta, arrayBuffer) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.STORE, 'readwrite');
      tx.objectStore(this.STORE).put({ ...meta, data: arrayBuffer });
      tx.oncomplete = () => resolve();
      tx.onerror = e => reject(e.target.error);
    });
  },

  async getFile(id) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const req = db.transaction(this.STORE, 'readonly').objectStore(this.STORE).get(id);
      req.onsuccess = e => resolve(e.target.result);
      req.onerror = e => reject(e.target.error);
    });
  },

  async getAllMeta() {
    // Returns all records WITHOUT the binary data (for listing)
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const results = [];
      const req = db.transaction(this.STORE, 'readonly').objectStore(this.STORE).openCursor();
      req.onsuccess = e => {
        const cursor = e.target.result;
        if (cursor) {
          const { data, ...meta } = cursor.value; // strip binary
          results.push(meta);
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      req.onerror = e => reject(e.target.error);
    });
  },

  async deleteFile(id) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.STORE, 'readwrite');
      tx.objectStore(this.STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = e => reject(e.target.error);
    });
  },

  async downloadFile(id) {
    const record = await this.getFile(id);
    if (!record) { showToast('File not found.', 'error'); return; }
    const blob = new Blob([record.data], { type: record.mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = record.name;
    a.click();
    URL.revokeObjectURL(url);
  },
};
