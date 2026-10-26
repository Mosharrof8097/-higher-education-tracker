// ============================================================
// scholarships.js — Scholarship Tracker + Eligibility Cross-Checker
// ============================================================

const Scholarships = {
  editingId: null,

  // ── Render main tab ────────────────────────────────────────
  render() {
    const list = Storage.getScholarships();
    document.getElementById('tab-scholarships').innerHTML = `
      <div class="section-header">
        <div>
          <h2 class="section-title">🏆 Scholarship Tracker</h2>
          <p class="section-sub">Government & full-funding scholarships — Chevening, DAAD, Fulbright, Erasmus+, and more</p>
        </div>
        <button class="btn btn-primary" onclick="Scholarships.openModal()">+ Add Scholarship</button>
      </div>

      <!-- Filter bar -->
      <div class="filter-bar">
        <input type="text" class="filter-input" placeholder="🔍 Search scholarships..." oninput="Scholarships.renderCards(this.value)">
        <select class="filter-select" onchange="Scholarships.renderCards('', this.value)">
          <option value="All">All Status</option>
          <option>Not Started</option>
          <option>Researching</option>
          <option>Applied</option>
          <option>Interview</option>
          <option>Accepted</option>
          <option>Rejected</option>
        </select>
        <select class="filter-select" onchange="Scholarships.renderCards('','All',this.value)">
          <option value="All">All Funding</option>
          <option>Full Funding</option>
          <option>Partial Funding</option>
          <option>Tuition Only</option>
          <option>Living Allowance Only</option>
        </select>
      </div>

      <!-- Cards -->
      <div id="scholarship-cards" class="scholarship-grid">
        ${this.buildCards(list)}
      </div>
      ${list.length === 0 ? '<div class="empty-state"><div class="empty-icon">🏆</div><p>No scholarships tracked yet. Click <strong>+ Add Scholarship</strong> to start!</p></div>' : ''}

      <!-- Modal -->
      <div id="sch-modal" class="modal hidden">
        <div class="modal-backdrop" onclick="Scholarships.closeModal()"></div>
        <div class="modal-box modal-box-wide">
          <div class="modal-header">
            <h3 id="sch-modal-title">Add Scholarship</h3>
            <button class="modal-close" onclick="Scholarships.closeModal()">✕</button>
          </div>
          <form id="sch-form" onsubmit="Scholarships.saveForm(event)">
            <div class="form-grid">
              <div class="form-group">
                <label>Scholarship Name *</label>
                <input type="text" name="name" required placeholder="e.g. Chevening Scholarship 2025">
              </div>
              <div class="form-group">
                <label>Funding Body / Govt</label>
                <input type="text" name="funder" placeholder="e.g. UK Government, DAAD, Fulbright">
              </div>
              <div class="form-group">
                <label>Country</label>
                <input type="text" name="country" placeholder="e.g. UK, Germany, USA">
              </div>
              <div class="form-group">
                <label>Funding Type</label>
                <select name="fundingType">
                  <option>Full Funding</option>
                  <option>Partial Funding</option>
                  <option>Tuition Only</option>
                  <option>Living Allowance Only</option>
                </select>
              </div>
              <div class="form-group">
                <label>Amount / Value</label>
                <input type="text" name="amount" placeholder="e.g. £18,000/yr, €12,000 total">
              </div>
              <div class="form-group">
                <label>Application Deadline</label>
                <input type="date" name="deadline">
              </div>
              <div class="form-group">
                <label>Application Status</label>
                <select name="appStatus">
                  <option>Not Started</option>
                  <option>Researching</option>
                  <option>Applied</option>
                  <option>Interview</option>
                  <option>Accepted</option>
                  <option>Rejected</option>
                </select>
              </div>
              <div class="form-group">
                <label>Official Website</label>
                <input type="url" name="website" placeholder="https://...">
              </div>
              <div class="form-group">
                <label>Min IELTS Score</label>
                <input type="number" name="reqIelts" step="0.5" min="0" max="9" placeholder="e.g. 6.5">
              </div>
              <div class="form-group">
                <label>Min GPA (out of 4.0)</label>
                <input type="number" name="reqGpa" step="0.1" min="0" max="4" placeholder="e.g. 3.0">
              </div>
              <div class="form-group">
                <label>Min Work Experience (years)</label>
                <input type="number" name="reqWorkExp" min="0" placeholder="e.g. 2">
              </div>
              <div class="form-group">
                <label>Degree Level Required</label>
                <select name="reqDegree">
                  <option value="">Any</option>
                  <option value="Bachelor">Bachelor's</option>
                  <option value="Master">Master's</option>
                  <option value="PhD">PhD</option>
                </select>
              </div>

              <!-- Required Documents -->
              <div class="form-group form-full">
                <label>Required Documents (check all that apply)</label>
                <div class="req-checks">
                  ${['SOP', 'CV/Resume', 'LOR', 'Transcript', 'IELTS/TOEFL', 'GRE', 'Research Proposal', 'Writing Sample', 'Passport Copy', 'Financial Statement', 'Work Experience Letter', 'Birth Certificate'].map(r => `
                    <label class="req-check-label">
                      <input type="checkbox" name="req_docs" value="${esc(r)}">
                      ${esc(r)}
                    </label>`).join('')}
                </div>
              </div>

              <div class="form-group form-full">
                <label>Other Eligibility Criteria</label>
                <textarea name="otherCriteria" rows="2" placeholder="e.g. Must be from developing country, under 35 years old, citizen of specific countries..."></textarea>
              </div>
              <div class="form-group form-full">
                <label>Notes</label>
                <textarea name="notes" rows="2" placeholder="Personal notes, tips, contacts..."></textarea>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-outline" onclick="Scholarships.closeModal()">Cancel</button>
              <button type="submit" class="btn btn-primary">Save Scholarship</button>
            </div>
          </form>
        </div>
      </div>

      <!-- Cross-check panel -->
      <div id="crosscheck-panel" class="modal hidden">
        <div class="modal-backdrop" onclick="document.getElementById('crosscheck-panel').classList.add('hidden')"></div>
        <div class="modal-box modal-box-wide" id="crosscheck-content"></div>
      </div>
    `;
  },

  buildCards(list, search = '', status = 'All', funding = 'All') {
    let filtered = list.filter(s => {
      const q = search.toLowerCase();
      const matchSearch = !q || s.name.toLowerCase().includes(q) || (s.funder || '').toLowerCase().includes(q) || (s.country || '').toLowerCase().includes(q);
      const matchStatus = status === 'All' || s.appStatus === status;
      const matchFunding = funding === 'All' || s.fundingType === funding;
      return matchSearch && matchStatus && matchFunding;
    });

    if (!filtered.length) return '';

    const today = new Date();
    return filtered.map(s => {
      const daysLeft = s.deadline ? daysUntil(s.deadline) : null;
      return `
        <div class="sch-card">
          <div class="sch-card-header">
            <div>
              <h3 class="sch-name">${esc(s.name)}</h3>
              <p class="sch-funder">🏛️ ${esc(s.funder || '—')} · 📍 ${esc(s.country || '—')}</p>
            </div>
            <span class="badge ${this.statusClass(s.appStatus)}">${esc(s.appStatus || 'Not Started')}</span>
          </div>

          <div class="sch-meta-row">
            <span class="sch-funding-badge">${this.fundingIcon(s.fundingType)} ${esc(s.fundingType || '—')}</span>
            ${s.amount ? `<span class="sch-amount">💰 ${esc(s.amount)}</span>` : ''}
          </div>

          ${s.deadline ? `
            <div class="deadline-item" style="margin-top:0.6rem;">
              <span>📅 Deadline: <strong>${fmtDate(s.deadline)}</strong></span>
              ${daysLeft !== null ? `<span class="deadline-days ${daysLeft <= 30 ? 'urgent' : daysLeft <= 60 ? 'warning' : 'safe'}">${daysLeft}d left</span>` : ''}
            </div>` : ''}

          <!-- Requirements summary -->
          <div class="sch-reqs">
            ${s.reqIelts ? `<span class="req-pill">IELTS ≥ ${esc(s.reqIelts)}</span>` : ''}
            ${s.reqGpa ? `<span class="req-pill">GPA ≥ ${esc(s.reqGpa)}</span>` : ''}
            ${s.reqWorkExp ? `<span class="req-pill">Work exp ≥ ${esc(s.reqWorkExp)}yr</span>` : ''}
            ${s.reqDegree ? `<span class="req-pill">${esc(s.reqDegree)}'s deg.</span>` : ''}
            ${(s.reqDocs || []).map(d => `<span class="req-pill">${esc(d)}</span>`).join('')}
          </div>

          ${s.notes ? `<p class="uni-notes">${esc(s.notes)}</p>` : ''}

          <div class="sch-card-footer">
            ${s.website ? `<a href="${safeUrl(s.website)}" target="_blank" class="btn btn-sm btn-outline">🌐 Website</a>` : ''}
            <button class="btn btn-sm btn-teal" onclick="Scholarships.checkEligibility('${esc(s.id)}')">🔍 Check Eligibility</button>
            <button class="btn btn-sm btn-outline" onclick="Scholarships.openModal('${esc(s.id)}')">✏️ Edit</button>
            <button class="btn btn-sm btn-danger" onclick="Scholarships.delete('${esc(s.id)}')">🗑️</button>
          </div>
        </div>`;
    }).join('');
  },

  renderCards(search = '', status = 'All', funding = 'All') {
    const c = document.getElementById('scholarship-cards');
    if (c) c.innerHTML = this.buildCards(Storage.getScholarships(), search, status, funding);
  },

  // ── Eligibility Cross-Checker ─────────────────────────────
  async checkEligibility(id) {
    const sch = Storage.getScholarships().find(s => s.id === id);
    if (!sch) return;
    const profile = Storage.getProfile();
    const uploadedDocs = await Archive.getUploadedDocTypes();

    // ── Score checks ──
    const checks = [];

    // IELTS
    if (sch.reqIelts) {
      const userScore = parseFloat(profile.ielts) || 0;
      const required = parseFloat(sch.reqIelts);
      checks.push({
        label: `IELTS Score (min ${required})`,
        status: userScore >= required ? 'pass' : userScore > 0 ? 'fail' : 'unknown',
        detail: userScore > 0 ? `Your score: ${userScore}` : 'Not entered in your profile',
      });
    }

    // GPA
    if (sch.reqGpa) {
      const userGpa = parseFloat(profile.gpa) || 0;
      const required = parseFloat(sch.reqGpa);
      checks.push({
        label: `GPA (min ${required}/4.0)`,
        status: userGpa >= required ? 'pass' : userGpa > 0 ? 'fail' : 'unknown',
        detail: userGpa > 0 ? `Your GPA: ${userGpa}` : 'Not entered in your profile',
      });
    }

    // Work Experience
    if (sch.reqWorkExp) {
      const userExp = parseInt(profile.workExp) || 0;
      const required = parseInt(sch.reqWorkExp);
      checks.push({
        label: `Work Experience (min ${required} year${required > 1 ? 's' : ''})`,
        status: userExp >= required ? 'pass' : userExp > 0 ? 'fail' : 'unknown',
        detail: userExp > 0 ? `Your experience: ${userExp} year(s)` : 'Not entered in your profile',
      });
    }

    // Degree
    if (sch.reqDegree) {
      const degreeMap = { Bachelor: 1, Master: 2, PhD: 3 };
      const userDeg = degreeMap[profile.degree] || 0;
      const reqDeg = degreeMap[sch.reqDegree] || 0;
      checks.push({
        label: `${esc(sch.reqDegree)}'s degree required`,
        status: userDeg >= reqDeg ? 'pass' : 'fail',
        detail: profile.degree ? `Your degree: ${profile.degree}` : 'Not set in profile',
      });
    }

    // ── Document checks ──
    const docChecks = [];
    const uploadedNames = uploadedDocs.map(d => d.name.toLowerCase() + ' ' + (d.tag || '').toLowerCase());

    (sch.reqDocs || []).forEach(reqDoc => {
      const r = reqDoc.toLowerCase().replace('/', ' ');
      const found = uploadedDocs.find(d =>
        d.name.toLowerCase().includes(r.split(' ')[0]) ||
        d.tag?.toLowerCase().includes(r.split(' ')[0])
      );
      const isFinal = found?.status === 'Final';
      docChecks.push({
        label: reqDoc,
        status: found ? (isFinal ? 'pass' : 'partial') : 'fail',
        detail: found
          ? (isFinal ? `✅ Uploaded: "${esc(found.name)}" (Final)` : `📝 Uploaded: "${esc(found.name)}" (${esc(found.status || 'Draft')} — mark as Final when ready)`)
          : '❌ Not uploaded in your Document Archive',
      });
    });

    // ── Render panel ──
    const passCount = [...checks, ...docChecks].filter(c => c.status === 'pass').length;
    const totalCount = checks.length + docChecks.length;
    const pct = totalCount ? Math.round((passCount / totalCount) * 100) : 0;

    document.getElementById('crosscheck-content').innerHTML = `
      <div class="modal-header">
        <h3>🔍 Eligibility Check — ${esc(sch.name)}</h3>
        <button class="modal-close" onclick="document.getElementById('crosscheck-panel').classList.add('hidden')">✕</button>
      </div>
      <div style="padding:1.5rem;">

        <!-- Score summary -->
        <div class="crosscheck-summary ${pct >= 80 ? 'summary-green' : pct >= 50 ? 'summary-yellow' : 'summary-red'}">
          <div class="crosscheck-score">${pct}%</div>
          <div>
            <strong>${pct >= 80 ? '🎉 Strong candidate!' : pct >= 50 ? '⚠️ Partially eligible' : '❌ Not yet eligible'}</strong>
            <p>${passCount}/${totalCount} requirements met</p>
          </div>
        </div>

        <!-- Profile checks -->
        ${checks.length > 0 ? `
          <h4 class="crosscheck-section-title">📊 Profile / Score Requirements</h4>
          <div class="crosscheck-list">
            ${checks.map(c => this.checkRow(c)).join('')}
          </div>` : ''}

        <!-- Document checks -->
        ${docChecks.length > 0 ? `
          <h4 class="crosscheck-section-title">📁 Required Documents</h4>
          <div class="crosscheck-list">
            ${docChecks.map(c => this.checkRow(c)).join('')}
          </div>` : ''}

        <!-- Missing items action -->
        ${[...checks, ...docChecks].some(c => c.status !== 'pass') ? `
          <div class="crosscheck-missing">
            <strong>🎯 What you need to do next:</strong>
            <ul>
              ${[...checks, ...docChecks].filter(c => c.status !== 'pass').map(c =>
                `<li>${c.status === 'fail' ? '❌' : '📝'} <strong>${esc(c.label)}</strong>: ${esc(c.detail)}</li>`
              ).join('')}
            </ul>
          </div>` : ''}

        <div style="display:flex;gap:0.75rem;margin-top:1.5rem;">
          <button class="btn btn-outline" onclick="switchTab('archive')">📁 Go to Archive</button>
          <button class="btn btn-outline" onclick="openProfileModal()">👤 Update My Profile</button>
          <button class="btn btn-primary" onclick="document.getElementById('crosscheck-panel').classList.add('hidden')">Close</button>
        </div>
      </div>
    `;
    document.getElementById('crosscheck-panel').classList.remove('hidden');
  },

  checkRow(c) {
    const icons = { pass: '✅', fail: '❌', partial: '📝', unknown: '❓' };
    const classes = { pass: 'check-pass', fail: 'check-fail', partial: 'check-partial', unknown: 'check-unknown' };
    return `
      <div class="check-row ${classes[c.status]}">
        <span class="check-row-icon">${icons[c.status]}</span>
        <div>
          <div class="check-row-label">${esc(c.label)}</div>
          <div class="check-row-detail">${esc(c.detail)}</div>
        </div>
      </div>`;
  },

  // ── Modal ──────────────────────────────────────────────────
  openModal(id = null) {
    this.editingId = id;
    const modal = document.getElementById('sch-modal');
    const title = document.getElementById('sch-modal-title');
    const form = document.getElementById('sch-form');
    form.reset();
    form.querySelectorAll('input[type=checkbox]').forEach(cb => cb.checked = false);

    if (id) {
      const s = Storage.getScholarships().find(x => x.id === id);
      if (s) {
        title.textContent = 'Edit Scholarship';
        ['name','funder','country','fundingType','amount','deadline','appStatus','website','reqIelts','reqGpa','reqWorkExp','reqDegree','otherCriteria','notes'].forEach(k => {
          const el = form.elements[k]; if (el) el.value = s[k] || '';
        });
        (s.reqDocs || []).forEach(r => {
          const cb = form.querySelector(`input[value="${esc(r)}"]`);
          if (cb) cb.checked = true;
        });
      }
    } else {
      title.textContent = 'Add Scholarship';
    }
    modal.classList.remove('hidden');
  },
  closeModal() {
    document.getElementById('sch-modal').classList.add('hidden');
    this.editingId = null;
  },

  saveForm(e) {
    e.preventDefault();
    const form = e.target;
    const reqDocs = [...form.querySelectorAll('input[name=req_docs]:checked')].map(cb => cb.value);
    const data = {
      id: this.editingId || `s_${Date.now()}`,
      name: form.name.value.trim(),
      funder: form.funder.value.trim(),
      country: form.country.value.trim(),
      fundingType: form.fundingType.value,
      amount: form.amount.value.trim(),
      deadline: form.deadline.value,
      appStatus: form.appStatus.value,
      website: form.website.value.trim(),
      reqIelts: form.reqIelts.value,
      reqGpa: form.reqGpa.value,
      reqWorkExp: form.reqWorkExp.value,
      reqDegree: form.reqDegree.value,
      reqDocs,
      otherCriteria: form.otherCriteria.value.trim(),
      notes: form.notes.value.trim(),
    };
    let list = Storage.getScholarships();
    if (this.editingId) {
      list = list.map(s => s.id === this.editingId ? data : s);
      showToast('✅ Scholarship updated!', 'success');
    } else {
      list.push(data);
      showToast('✅ Scholarship added!', 'success');
    }
    Storage.setScholarships(list);
    this.closeModal();
    this.render();
    Dashboard.render();
  },

  delete(id) {
    if (!confirm('Delete this scholarship?')) return;
    Storage.setScholarships(Storage.getScholarships().filter(s => s.id !== id));
    this.render();
    Dashboard.render();
    showToast('🗑️ Scholarship removed.', 'info');
  },

  // Helpers
  statusClass(s) {
    if (s === 'Accepted') return 'badge-green';
    if (s === 'Rejected') return 'badge-red';
    if (s === 'Applied' || s === 'Interview') return 'badge-blue';
    if (s === 'Researching') return 'badge-yellow';
    return 'badge-gray';
  },
  fundingIcon(t) {
    if (t === 'Full Funding') return '🌟';
    if (t === 'Partial Funding') return '⭐';
    return '💰';
  },
};
