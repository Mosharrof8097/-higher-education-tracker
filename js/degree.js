// ============================================================
// degree.js — "My Degree": tracking the MS / PhD itself
//   Milestones · Courses & GPA · Publications · Meetings · Funding
// Every section is a synced record kind (see storage.js), edited
// through one generic modal so behaviour is identical everywhere.
// ============================================================

const Degree = {
  editing: null,          // { section, id|null }

  GRADES: { 'A+': 4.0, 'A': 4.0, 'A-': 3.7, 'B+': 3.3, 'B': 3.0, 'B-': 2.7, 'C+': 2.3, 'C': 2.0, 'C-': 1.7, 'D+': 1.3, 'D': 1.0, 'F': 0.0 },

  // Typical milestones. Programs differ — these are a starting point to edit.
  TEMPLATES: {
    MS: [
      ['Coursework', 'Complete required coursework'],
      ['Supervision', 'Choose thesis / project supervisor'],
      ['Research', 'Thesis or project proposal approved'],
      ['Admin', 'Ethics / IRB approval (if your project needs it)'],
      ['Research', 'Data collection / experiments done'],
      ['Writing', 'Full thesis draft to supervisor'],
      ['Defense', 'Thesis defense / final presentation'],
      ['Admin', 'Submit final thesis & apply to graduate'],
    ],
    PhD: [
      ['Coursework', 'Complete required coursework'],
      ['Supervision', 'Confirm supervisor'],
      ['Supervision', 'Form dissertation committee'],
      ['Exams', 'Qualifying / comprehensive exam'],
      ['Research', 'Dissertation proposal defense (candidacy)'],
      ['Admin', 'Annual progress review — Year 1'],
      ['Admin', 'Annual progress review — Year 2'],
      ['Admin', 'Annual progress review — Year 3'],
      ['Research', 'First paper submitted'],
      ['Writing', 'Full dissertation draft to committee'],
      ['Defense', 'Final dissertation defense'],
      ['Admin', 'Submit dissertation & graduate'],
    ],
  },

  SECTIONS: {
    milestones: {
      title: '🎯 Milestones', sub: 'Exams, proposals, reviews, defense — set the dates from your program handbook.',
      kind: 'milestone', empty: 'No milestones yet. Load the typical list for your degree, or add your own.',
      get: () => Storage.getMilestones(), set: v => Storage.setMilestones(v),
      fields: [
        { name: 'title', label: 'Milestone', type: 'text', required: true, full: true },
        { name: 'phase', label: 'Phase', type: 'select', options: ['Coursework', 'Supervision', 'Exams', 'Research', 'Writing', 'Defense', 'Admin', 'Other'] },
        { name: 'status', label: 'Status', type: 'select', options: ['Not started', 'In progress', 'Done'] },
        { name: 'due', label: 'Due / target date', type: 'date' },
        { name: 'doneDate', label: 'Completed on', type: 'date' },
        { name: 'notes', label: 'Notes', type: 'textarea', full: true },
      ],
      sort: (a, b) => (a.due || '9999').localeCompare(b.due || '9999'),
      cols: ['Milestone', 'Phase', 'Due', 'Status'],
      row: r => {
        const d = r.status === 'Done' ? null : daysUntil(r.due);
        const flag = d === null ? '' : d < 0 ? `<span class="badge badge-red">${-d}d overdue</span>` : d <= 30 ? `<span class="badge badge-yellow">${d}d left</span>` : '';
        return [`<strong>${esc(r.title)}</strong>${r.notes ? `<br><small>${esc(r.notes)}</small>` : ''}`,
                esc(r.phase || '—'), `${fmtDate(r.due)} ${flag}`,
                `<span class="badge ${r.status === 'Done' ? 'badge-green' : r.status === 'In progress' ? 'badge-blue' : 'badge-gray'}">${esc(r.status || 'Not started')}</span>`];
      },
    },
    courses: {
      title: '📚 Courses & GPA', sub: 'GPA is credit-weighted on a 4.0 scale from completed courses with a letter grade.',
      kind: 'course', empty: 'No courses yet.',
      get: () => Storage.getCourses(), set: v => Storage.setCourses(v),
      fields: [
        { name: 'term', label: 'Term', type: 'text', placeholder: 'Fall 2027', required: true },
        { name: 'code', label: 'Course code', type: 'text', placeholder: 'CS 6200' },
        { name: 'title', label: 'Course title', type: 'text', required: true, full: true },
        { name: 'credits', label: 'Credits', type: 'number', min: 0, step: 0.5, required: true },
        { name: 'grade', label: 'Grade', type: 'select', options: ['', ...Object.keys({ 'A+': 1, 'A': 1, 'A-': 1, 'B+': 1, 'B': 1, 'B-': 1, 'C+': 1, 'C': 1, 'C-': 1, 'D+': 1, 'D': 1, 'F': 1 }), 'P', 'NP'] },
        { name: 'status', label: 'Status', type: 'select', options: ['In progress', 'Completed', 'Withdrawn'] },
      ],
      sort: (a, b) => String(b.term || '').localeCompare(String(a.term || '')),
      cols: ['Term', 'Course', 'Credits', 'Grade'],
      row: r => [esc(r.term), `${esc(r.code)} ${esc(r.title)}`, esc(r.credits), `${esc(r.grade || '—')} <small>${esc(r.status || '')}</small>`],
    },
    publications: {
      title: '📄 Publications', sub: 'Papers, posters and talks, from first draft to published.',
      kind: 'publication', empty: 'No publications yet.',
      get: () => Storage.getPublications(), set: v => Storage.setPublications(v),
      fields: [
        { name: 'title', label: 'Title', type: 'text', required: true, full: true },
        { name: 'venue', label: 'Journal / conference', type: 'text' },
        { name: 'pubStatus', label: 'Status', type: 'select', options: ['In preparation', 'Submitted', 'Under review', 'Revision requested', 'Accepted', 'Published', 'Rejected'] },
        { name: 'date', label: 'Date of latest status', type: 'date' },
        { name: 'authors', label: 'Authors / my role', type: 'text' },
        { name: 'link', label: 'Link (DOI / URL)', type: 'text', full: true },
        { name: 'notes', label: 'Notes', type: 'textarea', full: true },
      ],
      sort: (a, b) => (b.date || '').localeCompare(a.date || ''),
      cols: ['Title', 'Venue', 'Status', 'Date'],
      row: r => [`<strong>${r.link ? `<a class="table-link" href="${safeUrl(r.link)}" target="_blank" rel="noopener noreferrer">${esc(r.title)}</a>` : esc(r.title)}</strong>`,
                 esc(r.venue || '—'),
                 `<span class="badge ${r.pubStatus === 'Published' || r.pubStatus === 'Accepted' ? 'badge-green' : r.pubStatus === 'Rejected' ? 'badge-red' : 'badge-blue'}">${esc(r.pubStatus || 'In preparation')}</span>`,
                 fmtDate(r.date)],
    },
    meetings: {
      title: '🗓️ Supervisor & committee meetings', sub: 'Log what was said and what you promised to do next.',
      kind: 'meeting', empty: 'No meetings logged yet.',
      get: () => Storage.getMeetings(), set: v => Storage.setMeetings(v),
      fields: [
        { name: 'date', label: 'Date', type: 'date', required: true },
        { name: 'withWhom', label: 'With', type: 'text', placeholder: 'Supervisor / Committee', required: true },
        { name: 'notes', label: 'Discussion notes', type: 'textarea', full: true },
        { name: 'actions', label: 'Action items (one per line)', type: 'lines', full: true },
      ],
      sort: (a, b) => (b.date || '').localeCompare(a.date || ''),
      cols: ['Date', 'With', 'Notes & action items'],
      row: r => [fmtDate(r.date), esc(r.withWhom),
        `${r.notes ? `<div>${esc(r.notes)}</div>` : ''}${(r.actions || []).map((a, i) =>
          `<label class="check-label"><input type="checkbox" ${a.done ? 'checked' : ''} onchange="Degree.toggleAction('${esc(r.id)}', ${i}, this.checked)"> <span class="${a.done ? 'text-muted' : ''}">${esc(a.text)}</span></label>`).join('')}`],
    },
    funding: {
      title: '💰 Funding', sub: 'Assistantships, fellowships, scholarships — and when each one ends.',
      kind: 'funding', empty: 'No funding recorded yet.',
      get: () => Storage.getFunding(), set: v => Storage.setFunding(v),
      fields: [
        { name: 'type', label: 'Type', type: 'select', options: ['RA', 'TA', 'Fellowship', 'Scholarship', 'Stipend', 'Other'] },
        { name: 'source', label: 'Source / funder', type: 'text', required: true },
        { name: 'amount', label: 'Amount', type: 'text', placeholder: '$2,400 / month' },
        { name: 'start', label: 'Starts', type: 'date' },
        { name: 'end', label: 'Ends', type: 'date' },
        { name: 'notes', label: 'Notes', type: 'textarea', full: true },
      ],
      sort: (a, b) => (a.end || '9999').localeCompare(b.end || '9999'),
      cols: ['Type', 'Source', 'Amount', 'Period'],
      row: r => {
        const d = daysUntil(r.end);
        const flag = d === null ? '' : d < 0 ? '<span class="badge badge-gray">ended</span>' : d <= 90 ? `<span class="badge badge-red">ends in ${d}d</span>` : '';
        return [esc(r.type), `<strong>${esc(r.source)}</strong>`, esc(r.amount || '—'), `${fmtDate(r.start)} → ${fmtDate(r.end)} ${flag}`];
      },
    },
  },

  // ── Computations ───────────────────────────────────────────
  gpa(courses) {
    let pts = 0, cr = 0;
    courses.forEach(c => {
      if (c.status !== 'Completed') return;
      const g = this.GRADES[c.grade];
      const credits = Number(c.credits);
      if (g === undefined || !(credits > 0)) return;      // P/NP/blank don't count
      pts += g * credits; cr += credits;
    });
    return { gpa: cr ? pts / cr : null, gradedCredits: cr };
  },

  earnedCredits(courses) {
    return courses.filter(c => c.status === 'Completed' && c.grade !== 'F' && c.grade !== 'NP' && c.grade)
      .reduce((n, c) => n + (Number(c.credits) || 0), 0);
  },

  // Used by the dashboard.
  summary() {
    const ms = Storage.getMilestones();
    const open = ms.filter(m => m.status !== 'Done');
    const overdue = open.filter(m => { const d = daysUntil(m.due); return d !== null && d < 0; });
    const upcoming = open.filter(m => { const d = daysUntil(m.due); return d !== null && d >= 0; })
      .sort((a, b) => a.due.localeCompare(b.due));
    const actions = [];
    Storage.getMeetings().forEach(m => (m.actions || []).forEach(a => { if (!a.done) actions.push({ text: a.text, date: m.date }); }));
    const fundingEnding = Storage.getFunding().filter(f => { const d = daysUntil(f.end); return d !== null && d >= 0 && d <= 90; });
    return { milestones: ms, overdue, upcoming, actions, fundingEnding };
  },

  // ── Render ─────────────────────────────────────────────────
  render() {
    const p = Storage.getProfile();
    const courses = Storage.getCourses();
    const { gpa, gradedCredits } = this.gpa(courses);
    const earned = this.earnedCredits(courses);
    const need = Number(p.creditsRequired) || 0;
    const ms = Storage.getMilestones();
    const msDone = ms.filter(m => m.status === 'Done').length;
    const s = this.summary();
    const target = p.target === 'PhD' || p.target === 'MS' ? p.target : '';

    const banner = p.stage === 'Applying'
      ? `<div class="info-banner">You are still in the application phase. You can plan your degree milestones here now — they will be waiting when you start.</div>` : '';

    document.getElementById('tab-degree').innerHTML = `
      <div class="section-header">
        <div>
          <h2 class="section-title">🎓 My Degree${target ? ` — ${esc(target)}` : ''}</h2>
          <p class="section-sub">${esc(p.fieldOfStudy || 'Set your field in My Profile')}${p.intake ? ` · started / starting ${esc(p.intake)}` : ''}</p>
        </div>
      </div>
      ${banner}

      <div class="stat-grid">
        <div class="stat-card"><div class="stat-icon">🎯</div><div class="stat-info">
          <div class="stat-num">${msDone}/${ms.length}</div><div class="stat-label">Milestones done</div>
          <div class="stat-sub">${s.overdue.length ? `⚠️ ${s.overdue.length} overdue` : 'none overdue'}</div></div></div>
        <div class="stat-card"><div class="stat-icon">📊</div><div class="stat-info">
          <div class="stat-num">${gpa === null ? '—' : gpa.toFixed(2)}</div><div class="stat-label">GPA (4.0 scale)</div>
          <div class="stat-sub">${gradedCredits} graded credits</div></div></div>
        <div class="stat-card"><div class="stat-icon">📚</div><div class="stat-info">
          <div class="stat-num">${earned}${need ? `/${need}` : ''}</div><div class="stat-label">Credits earned</div>
          <div class="stat-sub"><label>Required: <input type="number" min="0" style="width:4.5rem" value="${need || ''}" onchange="Degree.setCreditsRequired(this.value)"></label></div></div></div>
        <div class="stat-card"><div class="stat-icon">✅</div><div class="stat-info">
          <div class="stat-num">${s.actions.length}</div><div class="stat-label">Open action items</div>
          <div class="stat-sub">from meetings</div></div></div>
      </div>

      ${Object.keys(this.SECTIONS).map(k => this.renderSection(k)).join('')}

      <div class="modal hidden" id="degree-modal">
        <div class="modal-backdrop" onclick="Degree.closeModal()"></div>
        <div class="modal-box" id="degree-modal-box"></div>
      </div>`;
  },

  renderSection(key) {
    const cfg = this.SECTIONS[key];
    const rows = cfg.get().slice().sort(cfg.sort);
    const extra = key === 'milestones' && Storage.getProfile().target
      ? `<button class="btn btn-outline btn-sm" onclick="Degree.loadTemplate()">📋 Load typical ${esc(Storage.getProfile().target)} milestones</button>` : '';
    return `
      <div class="degree-section">
        <div class="section-header">
          <div><h3 class="section-title" style="font-size:1.1rem">${cfg.title}</h3><p class="section-sub">${esc(cfg.sub)}</p></div>
          <div style="display:flex;gap:.5rem;flex-wrap:wrap">${extra}
            <button class="btn btn-primary btn-sm" onclick="Degree.openModal('${key}')">+ Add</button></div>
        </div>
        ${rows.length === 0 ? `<div class="empty-state small"><p>${esc(cfg.empty)}</p></div>` : `
        <div class="table-wrap"><table class="data-table">
          <thead><tr>${cfg.cols.map(c => `<th>${esc(c)}</th>`).join('')}<th>Actions</th></tr></thead>
          <tbody>${rows.map(r => `<tr>${cfg.row(r).map(c => `<td>${c}</td>`).join('')}
            <td class="action-cell">
              <button class="btn-icon" title="Edit" onclick="Degree.openModal('${key}','${esc(r.id)}')">✏️</button>
              <button class="btn-icon btn-icon-danger" title="Delete" onclick="Degree.remove('${key}','${esc(r.id)}')">🗑️</button>
            </td></tr>`).join('')}</tbody>
        </table></div>`}
      </div>`;
  },

  // ── Modal ──────────────────────────────────────────────────
  fieldHtml(f, rec) {
    let v = rec ? rec[f.name] : undefined;
    if (f.type === 'lines') v = (rec && rec.actions ? rec.actions.map(a => a.text).join('\n') : '');
    if (v === undefined || v === null) v = '';
    const attrs = `name="${esc(f.name)}" ${f.required ? 'required' : ''} ${f.placeholder ? `placeholder="${esc(f.placeholder)}"` : ''}`;
    let input;
    if (f.type === 'select') {
      input = `<select ${attrs}>${f.options.map(o => `<option value="${esc(o)}" ${String(v || f.options[0]) === o ? 'selected' : ''}>${esc(o || '—')}</option>`).join('')}</select>`;
    } else if (f.type === 'textarea' || f.type === 'lines') {
      input = `<textarea ${attrs} rows="${f.type === 'lines' ? 4 : 3}">${esc(v)}</textarea>`;
    } else {
      input = `<input type="${f.type}" ${attrs} value="${esc(v)}" ${f.min !== undefined ? `min="${f.min}"` : ''} ${f.step ? `step="${f.step}"` : ''}>`;
    }
    return `<div class="form-group ${f.full ? 'form-full' : ''}"><label>${esc(f.label)}</label>${input}</div>`;
  },

  openModal(section, id = null) {
    const cfg = this.SECTIONS[section];
    const rec = id ? cfg.get().find(r => String(r.id) === String(id)) : null;
    if (id && !rec) return;
    this.editing = { section, id };
    document.getElementById('degree-modal-box').innerHTML = `
      <div class="modal-header"><h3>${rec ? 'Edit' : 'Add'} — ${esc(cfg.title.replace(/^\S+\s/, ''))}</h3>
        <button class="modal-close" onclick="Degree.closeModal()">✕</button></div>
      <form onsubmit="Degree.save(event)">
        <div class="form-grid">${cfg.fields.map(f => this.fieldHtml(f, rec)).join('')}</div>
        <div class="modal-footer">
          <button type="button" class="btn btn-outline" onclick="Degree.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Save</button>
        </div>
      </form>`;
    document.getElementById('degree-modal').classList.remove('hidden');
  },

  closeModal() {
    document.getElementById('degree-modal')?.classList.add('hidden');
    this.editing = null;
  },

  save(ev) {
    ev.preventDefault();
    const { section, id } = this.editing;
    const cfg = this.SECTIONS[section];
    const form = ev.target;
    const list = cfg.get();
    const old = id ? list.find(r => String(r.id) === String(id)) : null;

    const data = { ...(old || {}), id: old ? old.id : uid(cfg.kind) };
    cfg.fields.forEach(f => {
      const raw = form.elements[f.name].value;
      if (f.type === 'lines') {
        const prev = new Map(((old && old.actions) || []).map(a => [a.text, a.done]));
        data.actions = raw.split('\n').map(t => t.trim()).filter(Boolean).map(t => ({ text: t, done: !!prev.get(t) }));
      } else if (f.type === 'number') {
        data[f.name] = raw === '' ? '' : Number(raw);
      } else {
        data[f.name] = raw.trim();
      }
    });

    if (section === 'milestones') {                       // keep status and completion date consistent
      if (data.status === 'Done' && !data.doneDate) data.doneDate = new Date().toISOString().slice(0, 10);
      if (data.status !== 'Done') data.doneDate = '';
    }
    if (section === 'funding' && data.start && data.end && data.end < data.start) {
      return showToast('❌ End date is before the start date.', 'error');
    }
    if (section === 'courses' && !(Number(data.credits) >= 0)) {
      return showToast('❌ Credits must be a number.', 'error');
    }

    cfg.set(old ? list.map(r => String(r.id) === String(id) ? data : r) : list.concat(data));
    this.closeModal();
    this.render();
    showToast('✅ Saved.', 'success');
  },

  remove(section, id) {
    if (!confirm('Delete this entry?')) return;
    const cfg = this.SECTIONS[section];
    cfg.set(cfg.get().filter(r => String(r.id) !== String(id)));
    this.render();
  },

  toggleAction(meetingId, index, done) {
    Storage.setMeetings(Storage.getMeetings().map(m => String(m.id) !== String(meetingId) ? m
      : { ...m, actions: (m.actions || []).map((a, i) => i === index ? { ...a, done } : a) }));
    this.render();
  },

  setCreditsRequired(v) {
    const n = Number(v);
    Storage.setProfile({ ...Storage.getProfile(), creditsRequired: n > 0 ? n : '' });
    this.render();
  },

  loadTemplate() {
    const target = Storage.getProfile().target;
    const tpl = this.TEMPLATES[target];
    if (!tpl) return showToast('Set MS or PhD in My Profile first.', 'info');
    const existing = Storage.getMilestones();
    const have = new Set(existing.map(m => m.title.toLowerCase()));
    const add = tpl.filter(([, title]) => !have.has(title.toLowerCase()))
      .map(([phase, title], i) => ({ id: `ms_tpl_${target}_${i}`, title, phase, status: 'Not started', due: '', doneDate: '', notes: '' }));
    if (!add.length) return showToast('All typical milestones are already in your list.', 'info');
    Storage.setMilestones(existing.concat(add));
    this.render();
    showToast(`✅ Added ${add.length} milestones. Set the dates from your handbook.`, 'success');
  },
};
