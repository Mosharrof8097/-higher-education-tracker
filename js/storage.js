// ============================================================
// storage.js — local cache (synchronous API) + change tracking
//
// Feature modules keep calling Storage.getX()/setX() synchronously.
// Underneath, data lives in localStorage namespaced per account
// ("guest" keeps the legacy un-prefixed keys). When signed in,
// every set() is diffed per record and queued for Sync to upload.
// ============================================================

const Storage = {
  KEYS: {
    professors:   'hed_professors',
    universities: 'hed_universities',
    checklist:    'hed_checklist',
    goals:        'hed_goals',
    settings:     'hed_settings',
    scholarships: 'hed_scholarships',
    emails:       'hed_emails',
    profile:      'hed_profile',
    docs:         'hed_docs',
    milestones:   'hed_milestones',
    courses:      'hed_courses',
    publications: 'hed_publications',
    meetings:     'hed_meetings',
    funding:      'hed_funding',
    documents:    'hed_documents',   // uploaded-file metadata
  },

  // Keys that are synced to the cloud, and the record "kind" they map to.
  // Everything else (e.g. settings) stays on this device.
  SYNCED: {
    hed_professors: 'professors', hed_universities: 'universities',
    hed_checklist: 'checklist',   hed_goals: 'goals',
    hed_scholarships: 'scholarships', hed_emails: 'emails',
    hed_profile: 'profile',       hed_docs: 'docs',
    hed_milestones: 'milestones', hed_courses: 'courses',
    hed_publications: 'publications', hed_meetings: 'meetings',
    hed_funding: 'funding',       hed_documents: 'documents',
  },
  SINGLETONS: ['profile'],        // stored as one object, not an array
  SINGLETON_ID: 'singleton',

  scope: 'guest',                 // 'guest' or a Supabase user id

  setScope(scope) { this.scope = scope || 'guest'; },

  // Namespaced localStorage key for the active account.
  storeKey(key) {
    return this.scope === 'guest' ? key : `hed:${this.scope}:${key}`;
  },

  // ── Raw access (no change tracking) ────────────────────────
  rawGet(key) {
    try {
      const data = localStorage.getItem(this.storeKey(key));
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error('Storage.get error:', e);
      return null;
    }
  },

  rawSet(key, value) {
    try {
      localStorage.setItem(this.storeKey(key), JSON.stringify(value));
      return true;
    } catch (e) {
      console.error('Storage.set error:', e);
      this.reportWriteFailure(e);
      return false;
    }
  },

  _lastFailureToast: 0,
  reportWriteFailure(e) {
    // Never fail silently: unsaved data is the worst outcome for a tracker.
    const now = Date.now();
    if (now - this._lastFailureToast < 5000) return;
    this._lastFailureToast = now;
    const full = e && (e.name === 'QuotaExceededError' || e.code === 22);
    if (typeof showToast === 'function') {
      showToast(full
        ? '❌ Browser storage is full — your last change was NOT saved. Export a backup and free space.'
        : '❌ Could not save your last change on this device.', 'error');
    }
  },

  // ── Tracked access ─────────────────────────────────────────
  get(key) {
    return this.rawGet(key);
  },

  set(key, value) {
    const kind = this.SYNCED[key];
    const cloud = this.scope !== 'guest' && kind && typeof Sync !== 'undefined';
    const before = cloud ? this.rawGet(key) : null;
    const ok = this.rawSet(key, value);
    if (ok && cloud) Sync.track(kind, before, value);
    return ok;
  },

  getProfessors()    { return this.get(this.KEYS.professors) || []; },
  setProfessors(d)   { this.set(this.KEYS.professors, d); },

  getUniversities()  { return this.get(this.KEYS.universities) || []; },
  setUniversities(d) { this.set(this.KEYS.universities, d); },

  getChecklist()     { return this.get(this.KEYS.checklist) || []; },
  setChecklist(d)    { this.set(this.KEYS.checklist, d); },

  getGoals()         { return this.get(this.KEYS.goals) || []; },
  setGoals(d)        { this.set(this.KEYS.goals, d); },

  getScholarships()  { return this.get(this.KEYS.scholarships) || []; },
  setScholarships(d) { this.set(this.KEYS.scholarships, d); },

  getEmails()        { return this.get(this.KEYS.emails) || []; },
  setEmails(d)       { this.set(this.KEYS.emails, d); },

  getMilestones()    { return this.get(this.KEYS.milestones) || []; },
  setMilestones(d)   { this.set(this.KEYS.milestones, d); },

  getCourses()       { return this.get(this.KEYS.courses) || []; },
  setCourses(d)      { this.set(this.KEYS.courses, d); },

  getPublications()  { return this.get(this.KEYS.publications) || []; },
  setPublications(d) { this.set(this.KEYS.publications, d); },

  getMeetings()      { return this.get(this.KEYS.meetings) || []; },
  setMeetings(d)     { this.set(this.KEYS.meetings, d); },

  getFunding()       { return this.get(this.KEYS.funding) || []; },
  setFunding(d)      { this.set(this.KEYS.funding, d); },

  getProfile() {
    return this.get(this.KEYS.profile) || {
      name: '', ielts: '', gpa: '', gre: '', workExp: '',
      degree: 'Bachelor', nationality: '', fieldOfStudy: '',
      // Journey setup (filled by onboarding)
      target: '', stage: '', intake: '', setupDone: false,
    };
  },
  setProfile(d) { this.set(this.KEYS.profile, d); },

  // ── Backup: everything that syncs, plus metadata for files ──
  snapshot() {
    const out = { exportedAt: new Date().toISOString(), version: '3.0' };
    Object.entries(this.KEYS).forEach(([name, key]) => {
      if (name === 'settings') return;
      const v = this.get(key);
      if (v !== null) out[name] = v;
    });
    return out;
  },

  exportAll() {
    const blob = new Blob([JSON.stringify(this.snapshot(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `higher-edu-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    try { localStorage.setItem('hed_last_backup', String(Date.now())); } catch (e) {}
    showToast('✅ Data exported. Uploaded files are not inside this JSON — download them from Document Archive.', 'success');
  },

  // Import writes through set(), so a signed-in import also syncs.
  importAll(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      if (!data || typeof data !== 'object') throw new Error('not an object');
      let count = 0;
      Object.entries(this.KEYS).forEach(([name, key]) => {
        if (name === 'settings' || data[name] === undefined) return;
        const isSingleton = this.SINGLETONS.includes(name);
        if (isSingleton !== (!Array.isArray(data[name]))) return; // wrong shape → skip
        this.set(key, data[name]);
        count++;
      });
      if (!count) throw new Error('nothing to import');
      showToast('✅ Data imported successfully! Reloading...', 'success');
      setTimeout(() => location.reload(), 1500);
    } catch (e) {
      showToast('❌ Invalid backup file. Please try again.', 'error');
    }
  },

  // Clears the ACTIVE account's local cache only.
  clearAll() {
    Object.values(this.KEYS).forEach(k => localStorage.removeItem(this.storeKey(k)));
  },
};
