// ============================================================
// app.js — Main app: routing, init, profile modal, sample data
// ============================================================

// ── Global toast ─────────────────────────────────────────────
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
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
    case 'checklist':    Checklist.render(); break;
  }
}

// ── Profile modal ─────────────────────────────────────────────
function openProfileModal() {
  const profile = Storage.getProfile();
  const form = document.getElementById('profile-form');
  ['name','nationality','fieldOfStudy','degree','gpa','ielts','toefl','gre','workExp','publications','researchInterests'].forEach(k => {
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
}
function triggerImport() {
  document.getElementById('import-file').click();
}

// ── Sample data (runs once per data type on first load) ──────
function loadSampleData() {

  // Only seed professors if empty
  if (!Storage.getProfessors().length) {
    Storage.setProfessors([
      { id: 'p_s1', university: 'State Univ.', country: 'USA', researchArea: 'ML / Vision', professor: 'Dr. R. Lee', email: '', contacted: '2024-09-12', response: 'Replied', funding: 'RA', status: 'In talks', lab: 'Vision & AI Lab', notes: 'Very positive response. Discussed research alignment.' },
      { id: 'p_s2', university: 'Tech Inst.', country: 'USA', researchArea: 'Robotics', professor: 'Dr. A. Khan', email: '', contacted: '2024-09-15', response: 'Awaiting', funding: 'TA', status: 'Follow up', lab: 'Robotics Lab', notes: 'No reply yet. Follow up after 2 weeks.' },
      { id: 'p_s3', university: 'City Univ.', country: 'Canada', researchArea: 'NLP', professor: 'Dr. M. Osei', email: '', contacted: '2024-09-18', response: 'No Reply', funding: 'Unknown', status: 'Follow up', lab: 'Language AI Group', notes: 'Second email sent.' },
      { id: 'p_s4', university: 'North Univ.', country: 'UK', researchArea: 'Data Science', professor: 'Dr. P. Silva', email: '', contacted: '2024-09-21', response: 'Replied', funding: 'Grant', status: 'Promising', lab: 'Data Science Centre', notes: 'Excellent funding. Priority application.' },
    ]);
  }

  // Only seed universities if empty
  if (!Storage.getUniversities().length) {
    Storage.setUniversities([
      { id: 'u_s1', name: 'State University', country: 'USA', program: 'PhD in Computer Science', duration: '4-5 years', deadline: '2025-12-15', appStatus: 'In Progress', tuition: 'Full Funding (RA)', website: '', portalUrl: '', ielts: '7.0', gre: 'Yes', lorCount: '3', requirements: ['SOP', 'CV/Resume', 'LOR'], notes: 'Top choice.' },
      { id: 'u_s2', name: 'North University', country: 'UK', program: 'PhD in Data Science', duration: '3-4 years', deadline: '2025-01-31', appStatus: 'Not Started', tuition: 'Research Grant', website: '', portalUrl: '', ielts: '6.5', gre: 'No', lorCount: '2', requirements: ['SOP'], notes: 'Dr. P. Silva responded positively.' },
    ]);
  }

  // Only seed scholarships if empty (NEW)
  if (!Storage.getScholarships().length) {
    Storage.setScholarships([
      {
        id: 'sch_s1', name: 'Chevening Scholarship 2025', funder: 'UK Government (FCDO)', country: 'UK',
        fundingType: 'Full Funding', amount: '£18,000/yr + tuition + flights',
        deadline: '2025-11-05', appStatus: 'Not Started',
        website: 'https://www.chevening.org',
        reqIelts: '6.5', reqGpa: '3.0', reqWorkExp: '2', reqDegree: 'Bachelor',
        reqDocs: ['SOP', 'CV/Resume', 'LOR', 'Transcript', 'IELTS/TOEFL', 'Passport Copy'],
        otherCriteria: 'Must be a citizen of an eligible Chevening country. Must have 2+ years work experience.',
        notes: 'One of the most prestigious scholarships. High competition.',
      },
      {
        id: 'sch_s2', name: 'DAAD Research Scholarship 2025', funder: 'German Academic Exchange Service', country: 'Germany',
        fundingType: 'Full Funding', amount: '€861–1,200/month + tuition waiver',
        deadline: '2025-10-15', appStatus: 'Researching',
        website: 'https://www.daad.de',
        reqIelts: '6.0', reqGpa: '2.8', reqWorkExp: '0', reqDegree: 'Bachelor',
        reqDocs: ['SOP', 'CV/Resume', 'LOR', 'Transcript', 'Research Proposal'],
        otherCriteria: 'Open to applicants from developing countries. Strong research background preferred.',
        notes: 'Very strong in engineering and sciences.',
      },
      {
        id: 'sch_s3', name: 'Fulbright Foreign Student Program', funder: 'US Government (DOS)', country: 'USA',
        fundingType: 'Full Funding', amount: 'Full tuition + living stipend + insurance',
        deadline: '2025-12-01', appStatus: 'Not Started',
        website: 'https://foreign.fulbrightonline.org',
        reqIelts: '7.0', reqGpa: '3.0', reqWorkExp: '0', reqDegree: 'Bachelor',
        reqDocs: ['SOP', 'CV/Resume', 'LOR', 'Transcript', 'IELTS/TOEFL', 'Research Proposal'],
        otherCriteria: 'Must apply through your home country Fulbright office.',
        notes: 'Extremely prestigious. Focus on academic excellence and leadership.',
      },
    ]);
  }

  // Only seed emails if empty (NEW)
  if (!Storage.getEmails().length) {
    Storage.setEmails([
      {
        id: 'e_s1', toName: 'Dr. R. Lee', toEmail: 'r.lee@stateuniv.edu', type: 'Professor',
        dateSent: '2024-09-12', subject: 'Research Collaboration Inquiry — Groundwater & ML',
        docsAttached: 'CV, Research Summary',
        sentNotes: 'Introduced myself, described my research background in groundwater hydrology, expressed interest in joining his ML/Vision lab.',
        replyStatus: 'Replied', replyDate: '2024-09-20',
        docsReceived: 'Lab requirements, Application checklist',
        replyNotes: 'Very positive response. Interested in my groundwater + ML work. Suggested to apply formally.',
        followUp: 'No', followUpDate: '',
      },
      {
        id: 'e_s2', toName: 'Chevening Scholarship Office', toEmail: '', type: 'Scholarship',
        dateSent: '2024-09-25', subject: 'Inquiry about eligibility for Chevening 2025',
        docsAttached: '',
        sentNotes: 'Asked about eligibility criteria for candidates from Bangladesh with 1 year work experience.',
        replyStatus: 'Awaiting', replyDate: '',
        docsReceived: '', replyNotes: '',
        followUp: 'Yes', followUpDate: '2024-10-10',
      },
    ]);
  }

  // Only seed goals if empty
  if (!Storage.getGoals().length) {
    Storage.setGoals([
      { id: 'g_s1', title: 'Email 20 professors by Nov 15', targetDate: '2025-11-15', priority: 'High', notes: 'Focus on ML, NLP, and Hydrology faculty.', done: false },
      { id: 'g_s2', title: 'Complete SOP first draft', targetDate: '2025-10-30', priority: 'High', notes: '', done: false },
      { id: 'g_s3', title: 'Achieve IELTS 7.5', targetDate: '2025-11-01', priority: 'High', notes: '', done: false },
      { id: 'g_s4', title: 'Submit Chevening application', targetDate: '2025-11-05', priority: 'High', notes: '', done: false },
      { id: 'g_s5', title: 'Submit 5 university applications', targetDate: '2026-01-15', priority: 'Medium', notes: '', done: false },
    ]);
  }
}

// ── Init ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('import-file').addEventListener('change', function () {
    const file = this.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => Storage.importAll(e.target.result);
    reader.readAsText(file);
    this.value = '';
  });

  loadSampleData();
  updateSidebarProfile(Storage.getProfile());
  switchTab('dashboard');
});
