// ============================================================
// sync.js — cloud sync (Supabase) on top of the local cache
//
// Model: one row per record in public.records (user_id, kind, id).
//  • Local edits are diffed per record and queued in an outbox.
//  • push() upserts the outbox; pull() merges rows changed since a cursor.
//  • Conflict rule: last write wins PER RECORD (server clock decides).
//    A record with an unsent local edit is never overwritten by a pull.
//  • Offline-safe: the outbox survives reloads and flushes when online.
// ============================================================

const Sync = {
  client: null,
  uid: null,
  status: 'local',            // local | syncing | synced | offline | error
  lastError: '',
  pushing: false,
  pulling: false,
  pushTimer: null,
  retryTimer: null,
  seq: 0,                     // bumps on every queued edit
  PAGE: 1000,
  CHUNK: 200,
  OVERLAP_MS: 5000,           // re-read a little history; merges are idempotent

  // ── Setup ──────────────────────────────────────────────────
  init(createClient) {
    if (!CONFIG.CLOUD_ENABLED || !createClient) return false;
    this.client = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_PUBLISHABLE_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
    return true;
  },

  // Called once a user is known. Loads this account's cache and syncs.
  async start(uid) {
    this.uid = uid;
    Storage.setScope(uid);
    this.seq = 0;
    this.setStatus(navigator.onLine ? 'syncing' : 'offline');
    await this.sync();
    this._bindEvents();
  },

  // Offline start: no client available. Read the account's saved data and
  // queue edits in the outbox; they upload on the next online visit.
  resume(uid) {
    this.uid = uid;
    Storage.setScope(uid);
    this.seq = 0;
    this.setStatus('offline');
  },

  stop() {
    this.uid = null;
    clearTimeout(this.pushTimer);
    clearTimeout(this.retryTimer);
    Storage.setScope('guest');
    this.setStatus('local');
  },

  _bound: false,
  _bindEvents() {
    if (this._bound) return;
    this._bound = true;
    window.addEventListener('online', () => this.sync());
    window.addEventListener('offline', () => this.setStatus('offline'));
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') this.sync();
    });
    setInterval(() => { if (document.visibilityState === 'visible') this.sync(); }, 60000);
  },

  // ── Outbox (survives reloads) ──────────────────────────────
  _boxKey()  { return `hed:${this.uid}:outbox`; },
  _cursorKey() { return `hed:${this.uid}:cursor`; },

  _box() {
    try { return JSON.parse(localStorage.getItem(this._boxKey()) || '{}'); }
    catch (e) { return {}; }
  },
  _saveBox(box) {
    try { localStorage.setItem(this._boxKey(), JSON.stringify(box)); return true; }
    catch (e) { Storage.reportWriteFailure(e); return false; }
  },
  pendingCount() { return this.uid ? Object.keys(this._box()).length : 0; },

  _enqueue(kind, id, data, deleted) {
    const box = this._box();
    box[`${kind}/${id}`] = { kind, id, data, deleted: !!deleted, v: ++this.seq };
    this._saveBox(box);
  },

  // Diff old → new and queue only what changed.
  track(kind, before, after) {
    if (!this.uid) return;
    const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

    if (Storage.SINGLETONS.includes(kind)) {
      if (!same(before, after)) this._enqueue(kind, Storage.SINGLETON_ID, after, false);
    } else {
      const oldById = new Map((Array.isArray(before) ? before : []).map(r => [r.id, r]));
      const newList = Array.isArray(after) ? after : [];
      const seen = new Set();
      newList.forEach(r => {
        if (!r || r.id === undefined || r.id === null) return;
        seen.add(r.id);
        if (!oldById.has(r.id) || !same(oldById.get(r.id), r)) this._enqueue(kind, String(r.id), r, false);
      });
      oldById.forEach((_, id) => {
        if (!seen.has(id)) this._enqueue(kind, String(id), {}, true);
      });
    }
    this.schedulePush();
  },

  schedulePush(delay = 600) {
    clearTimeout(this.pushTimer);
    this.pushTimer = setTimeout(() => this.push(), delay);
    if (this.pendingCount()) this.setStatus(navigator.onLine ? 'syncing' : 'offline');
  },

  // ── Push ───────────────────────────────────────────────────
  async push() {
    if (!this.client || !this.uid || this.pushing) return;
    if (!navigator.onLine) { this.setStatus('offline'); return; }

    this.pushing = true;
    try {
      let entries = Object.values(this._box());
      while (entries.length) {
        const chunk = entries.slice(0, this.CHUNK);
        const rows = chunk.map(e => ({
          user_id: this.uid, kind: e.kind, id: e.id, data: e.data, deleted: e.deleted,
        }));
        const { error } = await this.client.from('records')
          .upsert(rows, { onConflict: 'user_id,kind,id' });
        if (error) throw error;

        // Drop only entries not edited again while the request was in flight.
        const box = this._box();
        chunk.forEach(e => {
          const k = `${e.kind}/${e.id}`;
          if (box[k] && box[k].v === e.v) delete box[k];
        });
        this._saveBox(box);
        entries = Object.values(box);
      }
      this.lastError = '';
      this.setStatus('synced');
    } catch (e) {
      this.lastError = (e && e.message) || String(e);
      console.error('Sync.push failed:', e);
      this.setStatus(navigator.onLine ? 'error' : 'offline');
      clearTimeout(this.retryTimer);
      this.retryTimer = setTimeout(() => this.push(), 30000);
    } finally {
      this.pushing = false;
    }
  },

  // ── Pull ───────────────────────────────────────────────────
  async pull() {
    if (!this.client || !this.uid || this.pulling) return false;
    if (!navigator.onLine) return false;

    this.pulling = true;
    let changed = false;
    try {
      const stored = localStorage.getItem(this._cursorKey());
      const from = stored ? new Date(new Date(stored).getTime() - this.OVERLAP_MS).toISOString() : null;

      let offset = 0, newest = stored || null, rows = [];
      for (;;) {
        let q = this.client.from('records')
          .select('kind,id,data,deleted,updated_at')
          .order('updated_at', { ascending: true })
          .order('kind', { ascending: true })
          .order('id', { ascending: true })
          .range(offset, offset + this.PAGE - 1);
        if (from) q = q.gte('updated_at', from);
        const { data, error } = await q;
        if (error) throw error;
        rows = rows.concat(data || []);
        if (!data || data.length < this.PAGE) break;
        offset += this.PAGE;
      }

      rows.forEach(r => { if (!newest || r.updated_at > newest) newest = r.updated_at; });
      changed = this.applyRemote(rows);
      if (newest) localStorage.setItem(this._cursorKey(), newest);
    } catch (e) {
      this.lastError = (e && e.message) || String(e);
      console.error('Sync.pull failed:', e);
      this.setStatus(navigator.onLine ? 'error' : 'offline');
      throw e;
    } finally {
      this.pulling = false;
    }
    return changed;
  },

  // Merge remote rows into the local cache. Pure w.r.t. network.
  applyRemote(rows) {
    if (!rows.length) return false;
    const box = this._box();
    const byKind = {};
    rows.forEach(r => { (byKind[r.kind] = byKind[r.kind] || []).push(r); });

    let changed = false;
    Object.entries(byKind).forEach(([kind, list]) => {
      const key = Object.keys(Storage.SYNCED).find(k => Storage.SYNCED[k] === kind);
      if (!key) return;                         // unknown kind from a newer app version
      const isSingleton = Storage.SINGLETONS.includes(kind);

      if (isSingleton) {
        // Rows arrive oldest → newest; the last applicable one wins.
        list.forEach(r => {
          if (box[`${kind}/${r.id}`] || r.deleted) return;
          Storage.rawSet(key, r.data);
          changed = true;
        });
        return;
      }

      const current = Array.isArray(Storage.rawGet(key)) ? Storage.rawGet(key) : [];
      const index = new Map(current.map((rec, i) => [String(rec.id), i]));
      let next = current.slice();
      let touched = false;

      list.forEach(r => {
        if (box[`${kind}/${r.id}`]) return;     // unsent local edit wins
        const at = index.get(String(r.id));
        if (r.deleted) {
          if (at !== undefined) { next[at] = null; touched = true; }
        } else if (at !== undefined) {
          if (JSON.stringify(next[at]) !== JSON.stringify(r.data)) { next[at] = r.data; touched = true; }
        } else {
          index.set(String(r.id), next.length);
          next.push(r.data);
          touched = true;
        }
      });

      if (touched) {
        Storage.rawSet(key, next.filter(Boolean));
        changed = true;
      }
    });
    return changed;
  },

  // Pull then push; refresh the UI if remote data changed.
  async sync() {
    if (!this.client || !this.uid) return;
    if (!navigator.onLine) { this.setStatus('offline'); return; }
    this.setStatus('syncing');
    try {
      const changed = await this.pull();
      await this.push();
      if (changed && typeof onRemoteChange === 'function') onRemoteChange();
    } catch (e) { /* status already set by pull() */ }
  },

  // ── Status chip ────────────────────────────────────────────
  setStatus(s) {
    this.status = s;
    const el = document.getElementById('sync-status');
    if (!el) return;
    const label = {
      local:   ['💾', 'Local only (this device)'],
      syncing: ['🔄', 'Syncing…'],
      synced:  ['☁️', 'All changes saved'],
      offline: ['📴', 'Offline — changes are saved here and will sync'],
      error:   ['⚠️', 'Sync problem — will retry'],
    }[s] || ['', s];
    const n = this.pendingCount();
    el.className = `sync-chip sync-${s}`;
    el.textContent = `${label[0]} ${label[1]}${n && s !== 'synced' ? ` (${n} pending)` : ''}`;
    el.title = this.lastError || '';
  },
};
