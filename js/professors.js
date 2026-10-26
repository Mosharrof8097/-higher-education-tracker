// ============================================================
// professors.js — Professor Outreach Tracker (full CRUD)
// ============================================================

const Professors = {
  editingId: null,
  filterStatus: 'All',
  filterResponse: 'All',
  filterFunding: 'All',
  searchQuery: '',

  render() {
    const profs = Storage.getProfessors();
    document.getElementById('tab-professors').innerHTML = `
      <div class="section-header">
        <div>
          <h2 class="section-title">Professor Outreach Tracker</h2>
          <p class="section-sub">Track every professor you've contacted — one row per professor</p>
        </div>
        <button class="btn btn-primary" onclick="Professors.openModal()">+ Add Professor</button>
      </div>

      <!-- Filters -->
      <div class="filter-bar">
        <input type="text" class="filter-input" placeholder="🔍 Search professor or university..." oninput="Professors.setSearch(this.value)">
        <select class="filter-select" onchange="Professors.setFilter('filterStatus', this.value)">
          <option value="All">All Status</option>
          <option value="In talks">In talks</option>
          <option value="Follow up">Follow up</option>
          <option value="Promising">Promising</option>
          <option value="Rejected">Rejected</option>
          <option value="Applied">Applied</option>
        </select>
        <select class="filter-select" onchange="Professors.setFilter('filterResponse', this.value)">
          <option value="All">All Responses</option>
          <option value="Replied">Replied</option>
          <option value="Awaiting">Awaiting</option>
          <option value="No Reply">No Reply</option>
        </select>
        <select class="filter-select" onchange="Professors.setFilter('filterFunding', this.value)">
          <option value="All">All Funding</option>
          <option value="RA">RA</option>
          <option value="TA">TA</option>
          <option value="Grant">Grant</option>
          <option value="Fellowship">Fellowship</option>
          <option value="Unknown">Unknown</option>
        </select>
        <button class="btn btn-outline" onclick="Professors.exportCSV()">📤 Export CSV</button>
      </div>

      <!-- Table -->
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>University</th>
              <th>Research Area</th>
              <th>Professor</th>
              <th>Contacted</th>
              <th>Response</th>
              <th>Funding</th>
              <th>Status</th>
              <th>Notes</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="prof-tbody">
            ${this.renderRows(profs)}
          </tbody>
        </table>
        ${profs.length === 0 ? '<div class="empty-state"><div class="empty-icon">🔬</div><p>No professors tracked yet. Click <strong>+ Add Professor</strong> to start!</p></div>' : ''}
      </div>

      <!-- Modal -->
      <div id="prof-modal" class="modal hidden">
        <div class="modal-backdrop" onclick="Professors.closeModal()"></div>
        <div class="modal-box">
          <div class="modal-header">
            <h3 id="prof-modal-title">Add Professor</h3>
            <button class="modal-close" onclick="Professors.closeModal()">✕</button>
          </div>
          <form id="prof-form" onsubmit="Professors.saveForm(event)">
            <div class="form-grid">
              <div class="form-group">
                <label>University *</label>
                <input type="text" name="university" required placeholder="e.g. MIT, State Univ.">
              </div>
              <div class="form-group">
                <label>Country</label>
                <input type="text" name="country" placeholder="e.g. USA, Canada">
              </div>
              <div class="form-group">
                <label>Research Area *</label>
                <input type="text" name="researchArea" required placeholder="e.g. ML/Vision, NLP">
              </div>
              <div class="form-group">
                <label>Professor Name *</label>
                <input type="text" name="professor" required placeholder="e.g. Dr. R. Lee">
              </div>
              <div class="form-group">
                <label>Professor Email</label>
                <input type="email" name="email" placeholder="professor@univ.edu">
              </div>
              <div class="form-group">
                <label>Contacted Date</label>
                <input type="date" name="contacted">
              </div>
              <div class="form-group">
                <label>Response</label>
                <select name="response">
                  <option>Awaiting</option>
                  <option>Replied</option>
                  <option>No Reply</option>
                </select>
              </div>
              <div class="form-group">
                <label>Funding Type</label>
                <select name="funding">
                  <option>Unknown</option>
                  <option>RA</option>
                  <option>TA</option>
                  <option>Grant</option>
                  <option>Fellowship</option>
                  <option>Self-funded</option>
                </select>
              </div>
              <div class="form-group">
                <label>Status</label>
                <select name="status">
                  <option>Follow up</option>
                  <option>In talks</option>
                  <option>Promising</option>
                  <option>Applied</option>
                  <option>Rejected</option>
                </select>
              </div>
              <div class="form-group">
                <label>Lab / Group</label>
                <input type="text" name="lab" placeholder="e.g. Vision Lab">
              </div>
              <div class="form-group form-full">
                <label>Notes</label>
                <textarea name="notes" rows="3" placeholder="Personal notes, follow-up actions, email summary..."></textarea>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-outline" onclick="Professors.closeModal()">Cancel</button>
              <button type="submit" class="btn btn-primary">Save</button>
            </div>
          </form>
        </div>
      </div>
    `;
  },

  renderRows(profs) {
    let filtered = profs.filter(p => {
      const matchStatus = this.filterStatus === 'All' || p.status === this.filterStatus;
      const matchResponse = this.filterResponse === 'All' || p.response === this.filterResponse;
      const matchFunding = this.filterFunding === 'All' || p.funding === this.filterFunding;
      const q = this.searchQuery.toLowerCase();
      const matchSearch = !q || (p.professor || '').toLowerCase().includes(q) || (p.university || '').toLowerCase().includes(q) || (p.researchArea || '').toLowerCase().includes(q);
      return matchStatus && matchResponse && matchFunding && matchSearch;
    });

    if (filtered.length === 0) return '<tr><td colspan="9" style="text-align:center;padding:2rem;color:#94a3b8;">No matching records found.</td></tr>';

    return filtered.map(p => `
      <tr>
        <td><strong>${esc(p.university)}</strong>${p.country ? `<br><small>${esc(p.country)}</small>` : ''}</td>
        <td>${esc(p.researchArea || '—')}</td>
        <td>${esc(p.professor)}${p.email ? `<br><a href="mailto:${esc(p.email)}" class="table-link">✉️ Email</a>` : ''}</td>
        <td>${p.contacted ? fmtDate(p.contacted) : '—'}</td>
        <td><span class="badge ${this.responseClass(p.response)}">${esc(p.response || 'Awaiting')}</span></td>
        <td><span class="badge badge-navy">${esc(p.funding || 'Unknown')}</span></td>
        <td><span class="badge ${this.statusClass(p.status)}">${esc(p.status || '—')}</span></td>
        <td class="notes-cell">${esc(p.notes || '—')}</td>
        <td class="action-cell">
          <button class="btn-icon" title="Edit" onclick="Professors.openModal('${esc(p.id)}')">✏️</button>
          <button class="btn-icon btn-icon-danger" title="Delete" onclick="Professors.delete('${esc(p.id)}')">🗑️</button>
        </td>
      </tr>`).join('');
  },

  responseClass(r) {
    if (r === 'Replied') return 'badge-green';
    if (r === 'No Reply') return 'badge-red';
    return 'badge-yellow';
  },
  statusClass(s) {
    if (s === 'Promising' || s === 'In talks') return 'badge-green';
    if (s === 'Rejected') return 'badge-red';
    if (s === 'Applied') return 'badge-blue';
    return 'badge-yellow';
  },

  setFilter(key, value) {
    this[key] = value;
    const tbody = document.getElementById('prof-tbody');
    if (tbody) tbody.innerHTML = this.renderRows(Storage.getProfessors());
  },
  setSearch(value) {
    this.searchQuery = value;
    const tbody = document.getElementById('prof-tbody');
    if (tbody) tbody.innerHTML = this.renderRows(Storage.getProfessors());
  },

  openModal(id = null) {
    this.editingId = id;
    const modal = document.getElementById('prof-modal');
    const title = document.getElementById('prof-modal-title');
    const form = document.getElementById('prof-form');
    form.reset();
    if (id) {
      const p = Storage.getProfessors().find(x => x.id === id);
      if (p) {
        title.textContent = 'Edit Professor';
        Object.keys(p).forEach(k => {
          const el = form.elements[k];
          if (el) el.value = p[k] || '';
        });
      }
    } else {
      title.textContent = 'Add Professor';
    }
    modal.classList.remove('hidden');
  },
  closeModal() {
    document.getElementById('prof-modal').classList.add('hidden');
    this.editingId = null;
  },

  saveForm(e) {
    e.preventDefault();
    const form = e.target;
    const data = {
      id: this.editingId || `p_${Date.now()}`,
      university: form.university.value.trim(),
      country: form.country.value.trim(),
      researchArea: form.researchArea.value.trim(),
      professor: form.professor.value.trim(),
      email: form.email.value.trim(),
      contacted: form.contacted.value,
      response: form.response.value,
      funding: form.funding.value,
      status: form.status.value,
      lab: form.lab.value.trim(),
      notes: form.notes.value.trim(),
    };
    let profs = Storage.getProfessors();
    if (this.editingId) {
      profs = profs.map(p => p.id === this.editingId ? data : p);
      showToast('✅ Professor updated!', 'success');
    } else {
      profs.push(data);
      showToast('✅ Professor added!', 'success');
    }
    Storage.setProfessors(profs);
    this.closeModal();
    this.render();
    Dashboard.render();
  },

  delete(id) {
    if (!confirm('Delete this professor entry?')) return;
    const profs = Storage.getProfessors().filter(p => p.id !== id);
    Storage.setProfessors(profs);
    this.render();
    Dashboard.render();
    showToast('🗑️ Professor removed.', 'info');
  },

  exportCSV() {
    const profs = Storage.getProfessors();
    if (!profs.length) { showToast('No data to export.', 'info'); return; }
    const headers = ['University', 'Country', 'Research Area', 'Professor', 'Email', 'Contacted', 'Response', 'Funding', 'Status', 'Lab', 'Notes'];
    const rows = profs.map(p => [p.university, p.country, p.researchArea, p.professor, p.email, p.contacted, p.response, p.funding, p.status, p.lab, p.notes].map(csvCell));
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `professor-outreach-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('✅ CSV exported!', 'success');
  },
};
