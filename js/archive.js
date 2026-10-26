// ============================================================
// archive.js — Personal Document Archive
// Upload, view, download, tag your important documents
// ============================================================

const Archive = {
  docs: [],   // cached metadata list

  async render() {
    document.getElementById('tab-archive').innerHTML = `
      <div class="section-header">
        <div>
          <h2 class="section-title">📁 Document Archive</h2>
          <p class="section-sub">Upload and manage all your important documents — PDF, images, Word files</p>
        </div>
        <label class="btn btn-primary" style="cursor:pointer;">
          ⬆️ Upload Document
          <input type="file" id="doc-upload-input" accept=".pdf,.jpg,.jpeg,.png,.docx,.doc,.txt" multiple style="display:none" onchange="Archive.handleUpload(this)">
        </label>
      </div>

      <!-- Filter bar -->
      <div class="filter-bar">
        <input type="text" class="filter-input" placeholder="🔍 Search documents..." oninput="Archive.filterDocs(this.value)">
        <select class="filter-select" onchange="Archive.filterByTag(this.value)">
          <option value="All">All Categories</option>
          <option>Academic</option>
          <option>Language</option>
          <option>Identity</option>
          <option>Financial</option>
          <option>Recommendation</option>
          <option>Statement</option>
          <option>Research</option>
          <option>Other</option>
        </select>
        <select class="filter-select" onchange="Archive.filterByStatus(this.value)">
          <option value="All">All Status</option>
          <option value="Final">✅ Final</option>
          <option value="Draft">📝 Draft</option>
          <option value="Pending">⏳ Pending</option>
        </select>
      </div>

      <!-- Storage info bar -->
      <div id="archive-storage-bar" class="storage-bar">
        <span>📦 Loading storage info...</span>
      </div>

      <!-- Document grid -->
      <div id="archive-grid" class="archive-grid">
        <div style="padding:2rem;color:var(--text-muted);">Loading documents...</div>
      </div>

      <!-- Upload progress -->
      <div id="upload-progress" class="upload-progress hidden">
        <div class="upload-progress-inner">
          <span id="upload-progress-text">Uploading...</span>
          <div class="progress-bar-wrap"><div class="progress-bar" id="upload-bar" style="width:0%"></div></div>
        </div>
      </div>
    `;

    await this.loadAndRender();
  },

  async loadAndRender(search = '', tag = 'All', status = 'All') {
    this.docs = await Files.list();
    this.renderGrid(this.docs, search, tag, status);
    this.updateStorageBar();
  },

  renderGrid(docs, search = '', tag = 'All', status = 'All') {
    const filtered = docs.filter(d => {
      const q = search.toLowerCase();
      const matchSearch = !q || d.name.toLowerCase().includes(q) || (d.tag || '').toLowerCase().includes(q);
      const matchTag = tag === 'All' || d.tag === tag;
      const matchStatus = status === 'All' || d.status === status;
      return matchSearch && matchTag && matchStatus;
    });

    const grid = document.getElementById('archive-grid');
    if (!grid) return;

    if (filtered.length === 0) {
      grid.innerHTML = `<div class="empty-state"><div class="empty-icon">📁</div><p>${docs.length === 0 ? 'No documents yet. Click <strong>⬆️ Upload Document</strong> to add your first file!' : 'No documents match your filter.'}</p></div>`;
      return;
    }

    grid.innerHTML = filtered.map(d => `
      <div class="archive-card" id="doc-${esc(d.id)}">
        <div class="archive-card-icon">${this.fileIcon(d.mimeType)}</div>
        <div class="archive-card-body">
          <div class="archive-card-name" title="${esc(d.name)}">${esc(d.name)}</div>
          <div class="archive-card-meta">
            <span class="badge ${this.tagColor(d.tag)}">${esc(d.tag || 'Other')}</span>
            <span class="badge ${this.statusBadge(d.status)}">${esc(d.status || 'Draft')}</span>
          </div>
          <div class="archive-card-info">
            <span>${this.formatSize(d.size)}</span>
            <span>${new Date(d.uploadDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          </div>
        </div>
        <div class="archive-card-actions">
          <button class="btn btn-sm btn-primary" onclick="Files.download('${esc(d.id)}')">⬇️ Download</button>
          <button class="btn btn-sm btn-outline" onclick="Archive.editMeta('${esc(d.id)}')">✏️ Edit</button>
          <button class="btn btn-sm btn-danger" onclick="Archive.deleteDoc('${esc(d.id)}')">🗑️</button>
        </div>
      </div>`).join('');
  },

  async handleUpload(input) {
    const files = [...input.files];
    if (!files.length) return;

    const progress = document.getElementById('upload-progress');
    const bar = document.getElementById('upload-bar');
    const text = document.getElementById('upload-progress-text');
    progress.classList.remove('hidden');

    let uploaded = 0;
    const failures = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      text.textContent = `Uploading ${i + 1}/${files.length}: ${file.name}`;
      bar.style.width = `${Math.round(((i) / files.length) * 100)}%`;

      const id = `doc_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const meta = {
        id,
        name: file.name,
        mimeType: file.type || 'application/octet-stream',
        size: file.size,
        tag: this.guessTag(file.name),
        status: 'Draft',
        uploadDate: new Date().toISOString(),
        notes: '',
      };

      try {
        const res = await Files.save(meta, file);
        if (res.ok) uploaded++; else failures.push(res.reason);
      } catch (e) {
        failures.push(`"${file.name}": ${(e && e.message) || 'upload failed'}`);
      }
      bar.style.width = `${Math.round(((i + 1) / files.length) * 100)}%`;
    }

    progress.classList.add('hidden');
    bar.style.width = '0%';
    input.value = '';
    if (uploaded) showToast(`✅ ${uploaded} file(s) uploaded!`, 'success');
    failures.forEach(msg => showToast(`❌ ${msg}`, 'error'));
    await this.loadAndRender();
  },

  async editMeta(id) {
    const doc = this.docs.find(d => d.id === id);
    if (!doc) return;

    const newName = prompt('File label/name:', doc.name);
    if (newName === null) return;
    const tags = ['Academic', 'Language', 'Identity', 'Financial', 'Recommendation', 'Statement', 'Research', 'Other'];
    const tagStr = prompt(`Category (${tags.join(', ')}):`, doc.tag || 'Other');
    const statuses = ['Final', 'Draft', 'Pending'];
    const statusStr = prompt(`Status (${statuses.join(', ')}):`, doc.status || 'Draft');

    const pick = (val, allowed, fallback) =>
      allowed.find(a => a.toLowerCase() === String(val || '').trim().toLowerCase()) || fallback;
    const ok = await Files.updateMeta(id, {
      name: newName.trim() || doc.name,
      tag: pick(tagStr, tags, doc.tag || 'Other'),
      status: pick(statusStr, statuses, doc.status || 'Draft'),
    });
    if (!ok) return showToast('❌ Could not update this document.', 'error');
    showToast('✅ Document updated!', 'success');
    await this.loadAndRender();
  },

  async deleteDoc(id) {
    if (!confirm('Delete this document? This cannot be undone.')) return;
    if (!(await Files.remove(id))) return;
    showToast('🗑️ Document deleted.', 'info');
    await this.loadAndRender();
  },

  filterDocs(search) {
    const tag = document.querySelector('#tab-archive .filter-select:nth-of-type(1)')?.value || 'All';
    const status = document.querySelector('#tab-archive .filter-select:nth-of-type(2)')?.value || 'All';
    this.renderGrid(this.docs, search, tag, status);
  },
  filterByTag(tag) {
    const search = document.querySelector('#tab-archive .filter-input')?.value || '';
    const status = document.querySelector('#tab-archive .filter-select:nth-of-type(2)')?.value || 'All';
    this.renderGrid(this.docs, search, tag, status);
  },
  filterByStatus(status) {
    const search = document.querySelector('#tab-archive .filter-input')?.value || '';
    const tag = document.querySelector('#tab-archive .filter-select:nth-of-type(1)')?.value || 'All';
    this.renderGrid(this.docs, search, tag, status);
  },

  updateStorageBar() {
    const bar = document.getElementById('archive-storage-bar');
    if (!bar) return;
    const totalSize = this.docs.reduce((sum, d) => sum + (d.size || 0), 0);
    bar.innerHTML = `<span>📦 ${this.docs.length} document(s) · ${this.formatSize(totalSize)} used · ${Files.where()}</span>`;
  },

  // Helpers
  guessTag(name) {
    const n = name.toLowerCase();
    if (n.includes('sop') || n.includes('statement')) return 'Statement';
    if (n.includes('cv') || n.includes('resume')) return 'Academic';
    if (n.includes('transcript') || n.includes('grade') || n.includes('degree') || n.includes('certificate')) return 'Academic';
    if (n.includes('ielts') || n.includes('toefl') || n.includes('gre') || n.includes('gmat')) return 'Language';
    if (n.includes('passport') || n.includes('nid') || n.includes('birth')) return 'Identity';
    if (n.includes('bank') || n.includes('financial') || n.includes('sponsor')) return 'Financial';
    if (n.includes('lor') || n.includes('recommendation') || n.includes('reference')) return 'Recommendation';
    if (n.includes('research') || n.includes('proposal') || n.includes('publication')) return 'Research';
    return 'Other';
  },
  fileIcon(mime) {
    if (!mime) return '📄';
    if (mime.includes('pdf')) return '📕';
    if (mime.includes('image')) return '🖼️';
    if (mime.includes('word') || mime.includes('document')) return '📝';
    if (mime.includes('text')) return '📄';
    return '📎';
  },
  tagColor(tag) {
    const map = { Academic: 'badge-blue', Language: 'badge-green', Identity: 'badge-navy', Financial: 'badge-yellow', Recommendation: 'badge-purple', Statement: 'badge-orange', Research: 'badge-teal', Other: 'badge-gray' };
    return map[tag] || 'badge-gray';
  },
  statusBadge(s) {
    if (s === 'Final') return 'badge-green';
    if (s === 'Pending') return 'badge-yellow';
    return 'badge-gray';
  },
  formatSize(bytes) {
    if (!bytes) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  },

  // Called by cross-checker to get list of uploaded doc types
  async getUploadedDocTypes() {
    const docs = await Files.list();
    return docs.map(d => ({ id: d.id, name: d.name, tag: d.tag, status: d.status }));
  },
};
