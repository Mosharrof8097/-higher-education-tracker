// ============================================================
// storage.js — localStorage helper + JSON export/import
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
  },

  get(key) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error('Storage.get error:', e);
      return null;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error('Storage.set error:', e);
    }
  },

  getProfessors() {
    return this.get(this.KEYS.professors) || [];
  },
  setProfessors(data) {
    this.set(this.KEYS.professors, data);
  },

  getUniversities() {
    return this.get(this.KEYS.universities) || [];
  },
  setUniversities(data) {
    this.set(this.KEYS.universities, data);
  },

  getChecklist() {
    return this.get(this.KEYS.checklist) || [];
  },
  setChecklist(data) {
    this.set(this.KEYS.checklist, data);
  },

  getGoals() {
    return this.get(this.KEYS.goals) || [];
  },
  setGoals(data) {
    this.set(this.KEYS.goals, data);
  },

  getScholarships() {
    return this.get(this.KEYS.scholarships) || [];
  },
  setScholarships(data) {
    this.set(this.KEYS.scholarships, data);
  },

  getEmails() {
    return this.get(this.KEYS.emails) || [];
  },
  setEmails(data) {
    this.set(this.KEYS.emails, data);
  },

  getProfile() {
    return this.get(this.KEYS.profile) || {
      name: '', ielts: '', gpa: '', gre: '', workExp: '',
      degree: 'Bachelor', nationality: '', fieldOfStudy: '',
    };
  },
  setProfile(data) {
    this.set(this.KEYS.profile, data);
  },

  // ── Export all data as JSON file ─────────────────────────
  exportAll() {
    const allData = {
      exportedAt: new Date().toISOString(),
      version: '2.0',
      professors:   this.getProfessors(),
      universities: this.getUniversities(),
      checklist:    this.getChecklist(),
      goals:        this.getGoals(),
      scholarships: this.getScholarships(),
      emails:       this.getEmails(),
      profile:      this.getProfile(),
    };
    const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `higher-edu-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('✅ Data exported successfully!', 'success');
  },

  // ── Import data from JSON file ────────────────────────────
  importAll(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      if (data.professors)   this.setProfessors(data.professors);
      if (data.universities) this.setUniversities(data.universities);
      if (data.checklist)    this.setChecklist(data.checklist);
      if (data.goals)        this.setGoals(data.goals);
      if (data.scholarships) this.setScholarships(data.scholarships);
      if (data.emails)       this.setEmails(data.emails);
      if (data.profile)      this.setProfile(data.profile);
      showToast('✅ Data imported successfully! Reloading...', 'success');
      setTimeout(() => location.reload(), 1500);
    } catch (e) {
      showToast('❌ Invalid backup file. Please try again.', 'error');
    }
  },

  // ── Clear everything ──────────────────────────────────────
  clearAll() {
    Object.values(this.KEYS).forEach(k => localStorage.removeItem(k));
  },
};
