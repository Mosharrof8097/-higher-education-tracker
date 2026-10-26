// ============================================================
// app.js — Main app: routing, init, profile modal, sample data
// ============================================================

// ── HTML escaping — use on EVERY user-provided value in a template ──
function esc(v) {
  return String(v === undefined || v === null ? '' : v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// http(s) links only — blocks javascript:/data: URLs saved in a record.
function safeUrl(u) {
  const v = String(u || '').trim();
  return /^https?:\/\//i.test(v) ? esc(v) : '#';
}

// CSV cell: quote, and defuse spreadsheet formulas (=, +, -, @ at the start).
function csvCell(v) {
  let t = String(v === undefined || v === null ? '' : v);
  if (/^[=+\-@\t\r]/.test(t)) t = "'" + t;
  return `"${t.replace(/"/g, '""')}"`;
}

// ── Dates: 'YYYY-MM-DD' strings are LOCAL calendar days ───────
// (new Date('2026-12-15') is UTC midnight, which shows the wrong day
//  and gives off-by-one "days left" in timezones behind UTC.)
function parseDate(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s || ''));
  return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
}
function daysUntil(s) {
  const d = parseDate(s);
  if (!d) return null;
  const t = new Date(); t.setHours(0, 0, 0, 0);
  return Math.round((d - t) / 86400000);
}
function fmtDate(s, withYear = true) {
  const d = parseDate(s);
  if (!d) return '—';
  return d.toLocaleDateString('en-US', withYear ? { month: 'short', day: 'numeric', year: 'numeric' } : { month: 'short', day: 'numeric' });
}
function uid(prefix) { return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`; }

// ── Global toast ─────────────────────────────────────────────
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.classList.add('show'), 10);
  // Errors stay long enough to actually be read (e.g. "storage full").
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, type === 'error' ? 8000 : 3000);
}

// ── Tab routing ───────────────────────────────────────────────
let currentTab = 'dashboard';

function switchTab(tab) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.add('hidden'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById(`tab-${tab}`).classList.remove('hidden');
  const navBtn = document.querySelector(`[data-tab="${tab}"]`);
  if (navBtn) navBtn.classList.add('active');
  currentTab = tab;

  switch (tab) {
    case 'dashboard':    Dashboard.render(); break;
    case 'professors':   Professors.render(); break;
    case 'universities': Universities.render(); break;
    case 'scholarships': Scholarships.render(); break;
    case 'emails':       Emails.render(); break;
    case 'archive':      Archive.render(); break;
    case 'degree':       Degree.render(); break;
    case 'checklist':    Checklist.render(); break;
  }
}

// ── Profile modal ─────────────────────────────────────────────
function openProfileModal() {
  const profile = Storage.getProfile();
  const form = document.getElementById('profile-form');
  ['name','nationality','fieldOfStudy','degree','gpa','ielts','toefl','gre','workExp','publications','researchInterests','target','stage','intake'].forEach(k => {
    const el = form.elements[k];
    if (el) el.value = profile[k] || '';
  });
  document.getElementById('profile-modal').classList.remove('hidden');
}

function closeProfileModal() {
  document.getElementById('profile-modal').classList.add('hidden');
}

function saveProfile(e) {
  e.preventDefault();
  const form = e.target;
  const data = {
    ...Storage.getProfile(),          // keep journey fields (target, stage, intake…)
    name: form.name.value.trim(),
    nationality: form.nationality.value.trim(),
    fieldOfStudy: form.fieldOfStudy.value.trim(),
    degree: form.degree.value,
    gpa: form.gpa.value,
    ielts: form.ielts.value,
    toefl: form.toefl.value,
    gre: form.gre.value,
    workExp: form.workExp.value,
    publications: form.publications.value,
    researchInterests: form.researchInterests.value.trim(),
    target: form.target.value,
    stage: form.stage.value,
    intake: form.intake.value.trim(),
  };
  Storage.setProfile(data);
  closeProfileModal();
  updateSidebarProfile(data);
  showToast('✅ Profile saved!', 'success');
}

function updateSidebarProfile(profile) {
  const el = document.getElementById('sidebar-profile-name');
  if (el) el.textContent = profile.name ? profile.name.split(' ')[0] + "'s Profile" : 'My Profile';
}

// ── Settings panel ────────────────────────────────────────────
function openSettings() {
  document.getElementById('settings-panel').classList.toggle('hidden');
  document.getElementById('delete-account-btn').classList.toggle('hidden', !Auth.user);
}

function clearLocalData() {
  if (Auth.user) {
    return alert('You are signed in, so your data is stored in your account and would simply re-download.\n\nTo erase it for good use "Delete My Account & Cloud Data".');
  }
  if (confirm('Clear ALL data stored in this browser? This cannot be undone!')) {
    Storage.clearAll();
    location.reload();
  }
}
function triggerImport() {
  document.getElementById('import-file').click();
}

// ── Remove demo sample rows left over from the old version ────
function isSample(r) { return r && /_s\d+$/.test(String(r.id)); }

function countSamples() {
  return ['professors','universities','scholarships','emails','goals','checklist']
    .reduce((n, k) => n + (Storage.get(Storage.KEYS[k]) || []).filter(isSample).length, 0);
}

function removeSampleData() {
  const n = countSamples();
  if (!n) return showToast('No sample data found.', 'info');
  if (!confirm(`Remove ${n} demo sample record(s)? Your own entries are kept.`)) return;
  ['professors','universities','scholarships','emails','goals','checklist'].forEach(k => {
    const key = Storage.KEYS[k];
    const list = Storage.get(key) || [];
    if (list.some(isSample)) Storage.set(key, list.filter(r => !isSample(r)));
  });
  showToast('🧹 Sample data removed.', 'success');
  switchTab(currentTab);
}

// ── First-run setup ───────────────────────────────────────────
function maybeShowOnboarding() {
  const p = Storage.getProfile();
  if (p.setupDone) return;
  document.getElementById('onboarding-modal').classList.remove('hidden');
}

function saveOnboarding(e) {
  e.preventDefault();
  const f = e.target;
  const data = {
    ...Storage.getProfile(),
    name: f.name.value.trim() || Storage.getProfile().name,
    target: f.target.value,
    stage: f.stage.value,
    intake: f.intake.value.trim(),
    fieldOfStudy: f.fieldOfStudy.value.trim() || Storage.getProfile().fieldOfStudy,
    setupDone: true,
  };
  Storage.setProfile(data);
  document.getElementById('onboarding-modal').classList.add('hidden');
  updateSidebarProfile(data);
  switchTab(data.stage === 'Enrolled' ? 'degree' : currentTab);
}

function skipOnboarding() {
  Storage.setProfile({ ...Storage.getProfile(), setupDone: true });
  document.getElementById('onboarding-modal').classList.add('hidden');
}

// Called by Sync when another device changed data.
function onRemoteChange() {
  if (document.querySelector('.modal:not(.hidden)')) return;   // don't disrupt an open form
  updateSidebarProfile(Storage.getProfile());
  switchTab(currentTab);
}

// ── Backup nudge (cloud users are already backed up) ──────────
function backupNudge() {
  if (Storage.scope !== 'guest') return;
  const last = Number(localStorage.getItem('hed_last_backup') || 0);
  const hasData = Storage.getProfessors().length + Storage.getUniversities().length + Storage.getGoals().length > 0;
  if (hasData && Date.now() - last > 14 * 864e5) {
    showToast('💾 No backup in 2+ weeks. Data is only in this browser — Export Backup in Data Management.', 'info');
  }
}

// ── Init ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('import-file').addEventListener('change', function () {
    const file = this.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => Storage.importAll(e.target.result);
    reader.readAsText(file);
    this.value = '';
  });

  await Auth.boot();          // resolves once signed in or guest

  updateSidebarProfile(Storage.getProfile());
  switchTab('dashboard');
  maybeShowOnboarding();
  backupNudge();
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
});
