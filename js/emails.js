// ============================================================
// emails.js — Email & Communication Tracker
// Track every email to professors, universities, scholarships
// ============================================================

const Emails = {
  editingId: null,
  filterType: 'All',
  filterReply: 'All',

  render() {
    const emails = Storage.getEmails();
    document.getElementById('tab-emails').innerHTML = `
      <div class="section-header">
        <div>
          <h2 class="section-title">📧 Email & Communication Log</h2>
          <p class="section-sub">Track every email sent to professors, universities, and scholarships</p>
        </div>
        <button class="btn btn-primary" onclick="Emails.openModal()">+ Log Email</button>
      </div>

      <!-- Stats row -->
      <div class="email-stats-row">
        <div class="email-stat-chip">
          <span class="chip-num">${emails.length}</span>
          <span class="chip-label">Total Emails</span>
        </div>
        <div class="email-stat-chip chip-green">
          <span class="chip-num">${emails.filter(e => e.replyStatus === 'Replied').length}</span>
          <span class="chip-label">Replied</span>
        </div>
        <div class="email-stat-chip chip-yellow">
          <span class="chip-num">${emails.filter(e => e.replyStatus === 'Awaiting').length}</span>
          <span class="chip-label">Awaiting</span>
        </div>
        <div class="email-stat-chip chip-red">
          <span class="chip-num">${emails.filter(e => e.followUp === 'Yes').length}</span>
          <span class="chip-label">Need Follow-up</span>
        </div>
      </div>

      <!-- Filters -->
      <div class="filter-bar">
        <input type="text" class="filter-input" placeholder="🔍 Search recipient, subject..." oninput="Emails.setSearch(this.value)">
        <select class="filter-select" onchange="Emails.setFilter('filterType', this.value)">
          <option value="All">All Types</option>
          <option>Professor</option>
          <option>University</option>
          <option>Scholarship</option>
          <option>Other</option>
        </select>
        <select class="filter-select" onchange="Emails.setFilter('filterReply', this.value)">
          <option value="All">All Replies</option>
          <option value="Replied">Replied</option>
          <option value="Awaiting">Awaiting</option>
          <option value="No Reply">No Reply</option>
        </select>
        <select class="filter-select" onchange="Emails.setFilter('filterFollowUp', this.value)">
          <option value="All">All Follow-ups</option>
          <option value="Yes">Needs Follow-up</option>
          <option value="No">No Follow-up</option>
        </select>
        <button class="btn btn-outline" onclick="Emails.exportCSV()">📤 Export CSV</button>
      </div>

      <!-- Email list -->
      <div id="email-list" class="email-list">
        ${this.buildEmailList(emails)}
      </div>
      ${emails.length === 0 ? '<div class="empty-state"><div class="empty-icon">📧</div><p>No emails logged yet. Click <strong>+ Log Email</strong> to start tracking your communications.</p></div>' : ''}

      <!-- Modal -->
      <div id="email-modal" class="modal hidden">
        <div class="modal-backdrop" onclick="Emails.closeModal()"></div>
        <div class="modal-box modal-box-wide">
          <div class="modal-header">
            <h3 id="email-modal-title">Log Email</h3>
            <button class="modal-close" onclick="Emails.closeModal()">✕</button>
          </div>
          <form id="email-form" onsubmit="Emails.saveForm(event)">
            <div class="form-grid">

              <!-- Sent email info -->
              <div class="form-group form-full">
                <label style="font-size:0.85rem;color:var(--orange);font-weight:700;">📤 EMAIL I SENT</label>
              </div>
              <div class="form-group">
                <label>To (Recipient Name) *</label>
                <input type="text" name="toName" required placeholder="e.g. Dr. R. Lee / Chevening Office">
              </div>
              <div class="form-group">
                <label>Recipient Email</label>
                <input type="email" name="toEmail" placeholder="recipient@email.com">
              </div>
              <div class="form-group">
                <label>Type</label>
                <select name="type">
                  <option>Professor</option>
                  <option>University</option>
                  <option>Scholarship</option>
                  <option>Other</option>
                </select>
              </div>
              <div class="form-group">
                <label>Date Sent *</label>
                <input type="date" name="dateSent" required>
              </div>
              <div class="form-group form-full">
                <label>Email Subject</label>
                <input type="text" name="subject" placeholder="e.g. Research collaboration inquiry — Groundwater Hydrology">
              </div>
              <div class="form-group form-full">
                <label>Documents I Attached</label>
                <input type="text" name="docsAttached" placeholder="e.g. CV, SOP, Research Proposal (comma separated)">
              </div>
              <div class="form-group form-full">
                <label>Email Summary / Notes</label>
                <textarea name="sentNotes" rows="2" placeholder="Brief summary of what you wrote..."></textarea>
              </div>

              <!-- Reply info -->
              <div class="form-group form-full">
                <label style="font-size:0.85rem;color:var(--navy-mid);font-weight:700;margin-top:0.5rem;">📥 THEIR REPLY</label>
              </div>
              <div class="form-group">
                <label>Reply Status</label>
                <select name="replyStatus">
                  <option>Awaiting</option>
                  <option>Replied</option>
                  <option>No Reply</option>
                </select>
              </div>
              <div class="form-group">
                <label>Reply Date</label>
                <input type="date" name="replyDate">
              </div>
              <div class="form-group form-full">
                <label>Documents They Sent Me</label>
                <input type="text" name="docsReceived" placeholder="e.g. Application form, Offer letter, Requirements list">
              </div>
              <div class="form-group form-full">
                <label>Reply Summary / Notes</label>
                <textarea name="replyNotes" rows="2" placeholder="Summary of their reply, key points..."></textarea>
              </div>

              <!-- Follow-up -->
              <div class="form-group">
                <label>Follow-up Needed?</label>
                <select name="followUp">
                  <option value="No">No</option>
                  <option value="Yes">Yes</option>
                </select>
              </div>
              <div class="form-group">
                <label>Follow-up Date</label>
                <input type="date" name="followUpDate">
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-outline" onclick="Emails.closeModal()">Cancel</button>
              <button type="submit" class="btn btn-primary">Save Email Log</button>
            </div>
          </form>
        </div>
      </div>
    `;
  },

  buildEmailList(emails, search = '', type = 'All', reply = 'All', followUp = 'All') {
    let filtered = emails.filter(e => {
      const q = search.toLowerCase();
      const matchSearch = !q || e.toName.toLowerCase().includes(q) || (e.subject || '').toLowerCase().includes(q) || (e.toEmail || '').toLowerCase().includes(q);
      const matchType = type === 'All' || e.type === type;
      const matchReply = reply === 'All' || e.replyStatus === reply;
      const matchFollowUp = followUp === 'All' || e.followUp === followUp;
      return matchSearch && matchType && matchReply && matchFollowUp;
    }).sort((a, b) => new Date(b.dateSent) - new Date(a.dateSent));

    if (!filtered.length) return '<div style="padding:2rem;text-align:center;color:var(--text-muted);">No emails match your filter.</div>';

    return filtered.map(e => `
      <div class="email-card ${e.followUp === 'Yes' ? 'email-followup' : ''}">
        <div class="email-card-left">
          <div class="email-type-icon">${this.typeIcon(e.type)}</div>
          <div class="email-card-body">
            <div class="email-card-header-row">
              <strong class="email-to">${e.toName}</strong>
              ${e.toEmail ? `<a href="mailto:${e.toEmail}" class="table-link" style="font-size:0.75rem;">✉️ ${e.toEmail}</a>` : ''}
              <span class="badge ${this.typeClass(e.type)}">${e.type}</span>
              ${e.followUp === 'Yes' ? `<span class="badge badge-red">⚠️ Follow-up needed</span>` : ''}
            </div>
            ${e.subject ? `<div class="email-subject">"${e.subject}"</div>` : ''}
            <div class="email-meta-row">
              <span>📤 Sent: <strong>${e.dateSent ? new Date(e.dateSent).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</strong></span>
              <span class="badge ${this.replyClass(e.replyStatus)}">${e.replyStatus || 'Awaiting'}</span>
              ${e.replyDate ? `<span>📥 Reply: <strong>${new Date(e.replyDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</strong></span>` : ''}
              ${e.followUpDate && e.followUp === 'Yes' ? `<span style="color:var(--red);">📅 Follow-up: ${new Date(e.followUpDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>` : ''}
            </div>

            <!-- Docs row -->
            ${e.docsAttached ? `<div class="email-docs-row"><span class="docs-label">📎 Sent:</span> ${e.docsAttached.split(',').map(d => `<span class="doc-chip">${d.trim()}</span>`).join('')}</div>` : ''}
            ${e.docsReceived ? `<div class="email-docs-row"><span class="docs-label">📬 Received:</span> ${e.docsReceived.split(',').map(d => `<span class="doc-chip doc-chip-green">${d.trim()}</span>`).join('')}</div>` : ''}

            <!-- Notes -->
            ${e.sentNotes ? `<div class="email-note"><span class="note-label">📤 My email:</span> ${e.sentNotes}</div>` : ''}
            ${e.replyNotes ? `<div class="email-note"><span class="note-label">📥 Their reply:</span> ${e.replyNotes}</div>` : ''}
          </div>
        </div>
        <div class="email-card-actions">
          <button class="btn-icon" title="Edit" onclick="Emails.openModal('${e.id}')">✏️</button>
          <button class="btn-icon btn-icon-danger" title="Delete" onclick="Emails.delete('${e.id}')">🗑️</button>
        </div>
      </div>`).join('');
  },

  search: '',
  filterFollowUp: 'All',

  setSearch(v) { this.search = v; this.reRender(); },
  setFilter(key, v) { this[key] = v; this.reRender(); },
  reRender() {
    const el = document.getElementById('email-list');
    if (el) el.innerHTML = this.buildEmailList(Storage.getEmails(), this.search, this.filterType, this.filterReply, this.filterFollowUp);
  },

  openModal(id = null) {
    this.editingId = id;
    const modal = document.getElementById('email-modal');
    const title = document.getElementById('email-modal-title');
    const form = document.getElementById('email-form');
    form.reset();
    if (id) {
      const e = Storage.getEmails().find(x => x.id === id);
      if (e) {
        title.textContent = 'Edit Email Log';
        ['toName','toEmail','type','dateSent','subject','docsAttached','sentNotes','replyStatus','replyDate','docsReceived','replyNotes','followUp','followUpDate'].forEach(k => {
          const el = form.elements[k]; if (el) el.value = e[k] || '';
        });
      }
    } else {
      title.textContent = 'Log Email';
      form.dateSent.value = new Date().toISOString().slice(0, 10);
    }
    modal.classList.remove('hidden');
  },
  closeModal() {
    document.getElementById('email-modal').classList.add('hidden');
    this.editingId = null;
  },

  saveForm(ev) {
    ev.preventDefault();
    const form = ev.target;
    const data = {
      id: this.editingId || `e_${Date.now()}`,
      toName: form.toName.value.trim(),
      toEmail: form.toEmail.value.trim(),
      type: form.type.value,
      dateSent: form.dateSent.value,
      subject: form.subject.value.trim(),
      docsAttached: form.docsAttached.value.trim(),
      sentNotes: form.sentNotes.value.trim(),
      replyStatus: form.replyStatus.value,
      replyDate: form.replyDate.value,
      docsReceived: form.docsReceived.value.trim(),
      replyNotes: form.replyNotes.value.trim(),
      followUp: form.followUp.value,
      followUpDate: form.followUpDate.value,
    };
    let emails = Storage.getEmails();
    if (this.editingId) {
      emails = emails.map(e => e.id === this.editingId ? data : e);
      showToast('✅ Email updated!', 'success');
    } else {
      emails.push(data);
      showToast('✅ Email logged!', 'success');
    }
    Storage.setEmails(emails);
    this.closeModal();
    this.render();
    Dashboard.render();
  },

  delete(id) {
    if (!confirm('Delete this email log?')) return;
    Storage.setEmails(Storage.getEmails().filter(e => e.id !== id));
    this.render();
    Dashboard.render();
    showToast('🗑️ Email log removed.', 'info');
  },

  exportCSV() {
    const emails = Storage.getEmails();
    if (!emails.length) { showToast('No data to export.', 'info'); return; }
    const headers = ['To Name', 'To Email', 'Type', 'Date Sent', 'Subject', 'Docs Attached', 'Reply Status', 'Reply Date', 'Docs Received', 'Follow-up', 'Notes'];
    const rows = emails.map(e => [e.toName, e.toEmail, e.type, e.dateSent, e.subject, e.docsAttached, e.replyStatus, e.replyDate, e.docsReceived, e.followUp, e.sentNotes].map(v => `"${(v || '').replace(/"/g, '""')}"`));
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `email-log-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    showToast('✅ CSV exported!', 'success');
  },

  typeIcon(t) {
    if (t === 'Professor') return '🔬';
    if (t === 'University') return '🏛️';
    if (t === 'Scholarship') return '🏆';
    return '✉️';
  },
  typeClass(t) {
    if (t === 'Professor') return 'badge-blue';
    if (t === 'University') return 'badge-navy';
    if (t === 'Scholarship') return 'badge-yellow';
    return 'badge-gray';
  },
  replyClass(r) {
    if (r === 'Replied') return 'badge-green';
    if (r === 'No Reply') return 'badge-red';
    return 'badge-yellow';
  },
};
