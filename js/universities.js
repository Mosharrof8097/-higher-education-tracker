// ============================================================
// universities.js — University Research Board (full CRUD)
// ============================================================

const Universities = {
  editingId: null,

  render() {
    const unis = Storage.getUniversities();
    document.getElementById('tab-universities').innerHTML = `
      <div class="section-header">
        <div>
          <h2 class="section-title">University Research Board</h2>
          <p class="section-sub">Track your target universities, programs, and application status</p>
        </div>
        <button class="btn btn-primary" onclick="Universities.openModal()">+ Add University</button>
      </div>

      <!-- Filter -->
      <div class="filter-bar">
        <input type="text" class="filter-input" placeholder="🔍 Search university or program..." oninput="Universities.renderCards(this.value)">
        <select class="filter-select" onchange="Universities.renderCards('', this.value)">
          <option value="All">All Status</option>
          <option>Not Started</option>
          <option>In Progress</option>
          <option>Submitted</option>
          <option>Accepted</option>
          <option>Rejected</option>
        </select>
      </div>

      <!-- Cards Grid -->
      <div id="uni-cards" class="uni-grid">
        ${this.buildCards(unis)}
      </div>
      ${unis.length === 0 ? '<div class="empty-state"><div class="empty-icon">🏛️</div><p>No universities tracked yet. Click <strong>+ Add University</strong> to start!</p></div>' : ''}

      <!-- Modal -->
      <div id="uni-modal" class="modal hidden">
        <div class="modal-backdrop" onclick="Universities.closeModal()"></div>
        <div class="modal-box modal-box-wide">
          <div class="modal-header">
            <h3 id="uni-modal-title">Add University</h3>
            <button class="modal-close" onclick="Universities.closeModal()">✕</button>
          </div>
          <form id="uni-form" onsubmit="Universities.saveForm(event)">
            <div class="form-grid">
              <div class="form-group">
                <label>University Name *</label>
                <input type="text" name="name" required placeholder="e.g. MIT">
              </div>
              <div class="form-group">
                <label>Country *</label>
                <input type="text" name="country" required placeholder="e.g. USA">
              </div>
              <div class="form-group">
                <label>Program *</label>
                <input type="text" name="program" required placeholder="e.g. PhD in Computer Science">
              </div>
              <div class="form-group">
                <label>Duration</label>
                <input type="text" name="duration" placeholder="e.g. 4 years">
              </div>
              <div class="form-group">
                <label>Application Deadline</label>
                <input type="date" name="deadline">
              </div>
              <div class="form-group">
                <label>Application Status</label>
                <select name="appStatus">
                  <option>Not Started</option>
                  <option>In Progress</option>
                  <option>Submitted</option>
                  <option>Accepted</option>
                  <option>Rejected</option>
                </select>
              </div>
              <div class="form-group">
                <label>Tuition / Funding</label>
                <input type="text" name="tuition" placeholder="e.g. Full Funding / $30k/yr">
              </div>
              <div class="form-group">
                <label>Official Website</label>
                <input type="url" name="website" placeholder="https://...">
              </div>
              <div class="form-group">
                <label>Portal Login</label>
                <input type="url" name="portalUrl" placeholder="https://apply.univ.edu">
              </div>
              <div class="form-group">
                <label>IELTS Min Score</label>
                <input type="text" name="ielts" placeholder="e.g. 6.5">
              </div>
              <div class="form-group">
                <label>GRE Required?</label>
                <select name="gre">
                  <option value="">Unknown</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                  <option value="Optional">Optional</option>
                </select>
              </div>
              <div class="form-group">
                <label>LOR Count Required</label>
                <input type="number" name="lorCount" min="1" max="5" placeholder="e.g. 3">
              </div>
              <!-- Requirements checklist -->
              <div class="form-group form-full">
                <label>Requirements Status</label>
                <div class="req-checks">
                  ${['SOP', 'CV/Resume', 'LOR', 'Transcript', 'IELTS', 'GRE', 'Research Proposal', 'Writing Sample'].map(r => `
                    <label class="req-check-label">
                      <input type="checkbox" name="req_${r.replace(/\//g, '_').replace(/ /g, '_')}" value="${esc(r)}">
                      ${esc(r)}
                    </label>`).join('')}
                </div>
              </div>
              <div class="form-group form-full">
                <label>Notes</label>
                <textarea name="notes" rows="3" placeholder="Important notes, contacts, scholarship info..."></textarea>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-outline" onclick="Universities.closeModal()">Cancel</button>
              <button type="submit" class="btn btn-primary">Save</button>
            </div>
          </form>
        </div>
      </div>
    `;
  },

  buildCards(unis, search = '', statusFilter = 'All') {
    let filtered = unis.filter(u => {
      const q = search.toLowerCase();
      const matchSearch = !q || u.name.toLowerCase().includes(q) || (u.program || '').toLowerCase().includes(q) || (u.country || '').toLowerCase().includes(q);
      const matchStatus = statusFilter === 'All' || u.appStatus === statusFilter;
      return matchSearch && matchStatus;
    });

    if (filtered.length === 0) return '';

    return filtered.map(u => {
      const today = new Date();
      const daysLeft = u.deadline ? daysUntil(u.deadline) : null;
      const reqs = u.requirements || [];
      const reqTotal = 8;

      return `
        <div class="uni-card">
          <div class="uni-card-header">
            <div>
              <h3 class="uni-name">${esc(u.name)}</h3>
              <p class="uni-country">📍 ${esc(u.country || 'Unknown')}</p>
            </div>
            <span class="badge ${this.statusClass(u.appStatus)}">${esc(u.appStatus || 'Not Started')}</span>
          </div>
          <p class="uni-program">🎓 ${esc(u.program || '—')}</p>
          ${u.duration ? `<p class="uni-detail">⏱️ ${esc(u.duration)}</p>` : ''}
          ${u.tuition ? `<p class="uni-detail">💰 ${esc(u.tuition)}</p>` : ''}
          ${u.deadline ? `<p class="uni-detail ${daysLeft !== null && daysLeft < 30 ? 'text-urgent' : ''}">📅 Deadline: ${fmtDate(u.deadline)} ${daysLeft !== null ? `(${daysLeft}d left)` : ''}</p>` : ''}
          ${u.ielts ? `<p class="uni-detail">🗣️ IELTS min: ${esc(u.ielts)}</p>` : ''}
          ${u.gre ? `<p class="uni-detail">📝 GRE: ${esc(u.gre)}</p>` : ''}

          <!-- Req badges -->
          <div class="req-badges">
            ${reqs.map(r => `<span class="req-badge req-done">✓ ${esc(r)}</span>`).join('')}
          </div>

          <!-- Links -->
          <div class="uni-links">
            ${u.website ? `<a href="${safeUrl(u.website)}" target="_blank" class="table-link">🌐 Website</a>` : ''}
            ${u.portalUrl ? `<a href="${safeUrl(u.portalUrl)}" target="_blank" class="table-link">📋 Apply</a>` : ''}
          </div>

          ${u.notes ? `<p class="uni-notes">${esc(u.notes)}</p>` : ''}

          <div class="uni-card-footer">
            <button class="btn btn-sm btn-outline" onclick="Universities.openModal('${esc(u.id)}')">✏️ Edit</button>
            <button class="btn btn-sm btn-danger" onclick="Universities.delete('${esc(u.id)}')">🗑️ Delete</button>
          </div>
        </div>`;
    }).join('');
  },

  renderCards(search = '', status = 'All') {
    const container = document.getElementById('uni-cards');
    if (container) container.innerHTML = this.buildCards(Storage.getUniversities(), search, status);
  },

  statusClass(s) {
    if (s === 'Accepted') return 'badge-green';
    if (s === 'Rejected') return 'badge-red';
    if (s === 'Submitted') return 'badge-blue';
    if (s === 'In Progress') return 'badge-yellow';
    return 'badge-gray';
  },

  openModal(id = null) {
    this.editingId = id;
    const modal = document.getElementById('uni-modal');
    const title = document.getElementById('uni-modal-title');
    const form = document.getElementById('uni-form');
    form.reset();
    // Uncheck all req checkboxes
    form.querySelectorAll('input[type=checkbox]').forEach(cb => cb.checked = false);

    if (id) {
      const u = Storage.getUniversities().find(x => x.id === id);
      if (u) {
        title.textContent = 'Edit University';
        Object.keys(u).forEach(k => {
          const el = form.elements[k];
          if (el) el.value = u[k] || '';
        });
        // Restore req checkboxes
        (u.requirements || []).forEach(r => {
          const cb = form.querySelector(`input[value="${esc(r)}"]`);
          if (cb) cb.checked = true;
        });
      }
    } else {
      title.textContent = 'Add University';
    }
    modal.classList.remove('hidden');
  },
  closeModal() {
    document.getElementById('uni-modal').classList.add('hidden');
    this.editingId = null;
  },

  saveForm(e) {
    e.preventDefault();
    const form = e.target;
    // Collect checked requirements
    const reqs = [...form.querySelectorAll('input[type=checkbox]:checked')].map(cb => cb.value);
    const data = {
      id: this.editingId || `u_${Date.now()}`,
      name: form.name.value.trim(),
      country: form.country.value.trim(),
      program: form.program.value.trim(),
      duration: form.duration.value.trim(),
      deadline: form.deadline.value,
      appStatus: form.appStatus.value,
      tuition: form.tuition.value.trim(),
      website: form.website.value.trim(),
      portalUrl: form.portalUrl.value.trim(),
      ielts: form.ielts.value.trim(),
      gre: form.gre.value,
      lorCount: form.lorCount.value,
      requirements: reqs,
      notes: form.notes.value.trim(),
    };
    let unis = Storage.getUniversities();
    if (this.editingId) {
      unis = unis.map(u => u.id === this.editingId ? data : u);
      showToast('✅ University updated!', 'success');
    } else {
      unis.push(data);
      showToast('✅ University added!', 'success');
    }
    Storage.setUniversities(unis);
    this.closeModal();
    this.render();
    Dashboard.render();
  },

  delete(id) {
    if (!confirm('Delete this university entry?')) return;
    const unis = Storage.getUniversities().filter(u => u.id !== id);
    Storage.setUniversities(unis);
    this.render();
    Dashboard.render();
    showToast('🗑️ University removed.', 'info');
  },
};
