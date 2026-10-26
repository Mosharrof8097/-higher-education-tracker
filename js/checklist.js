// ============================================================
// checklist.js — Study Checklist & Goals Tracker
// ============================================================

const Checklist = {
  editingGoalId: null,

  render() {
    const items = Storage.getChecklist();
    const goals = Storage.getGoals();
    const doneCount = items.filter(i => i.done).length;
    const progress = items.length ? Math.round((doneCount / items.length) * 100) : 0;

    document.getElementById('tab-checklist').innerHTML = `
      <div class="section-header">
        <div>
          <h2 class="section-title">My Study Checklist & Goals</h2>
          <p class="section-sub">Track every step of your higher education preparation</p>
        </div>
        <button class="btn btn-primary" onclick="Checklist.addItem()">+ Add Task</button>
      </div>

      <!-- Overall progress -->
      <div class="progress-card">
        <div class="progress-header">
          <span>Overall Progress</span>
          <span><strong>${doneCount}</strong> / ${items.length} tasks completed</span>
        </div>
        <div class="progress-bar-wrap">
          <div class="progress-bar" style="width:${progress}%"></div>
        </div>
        <div class="progress-pct">${progress}%</div>
      </div>

      <!-- Two-column layout: checklist + goals -->
      <div class="checklist-layout">

        <!-- Left: Checklist -->
        <div class="checklist-col">
          <div class="col-header">
            <h3>📋 Task Checklist</h3>
            <div style="display:flex;gap:0.5rem;">
              <button class="btn btn-sm btn-outline" onclick="Checklist.addItem()">+ Add</button>
              <button class="btn btn-sm btn-outline" onclick="Checklist.loadDefaults()">Load Defaults</button>
            </div>
          </div>
          <div id="checklist-items">
            ${this.buildChecklist(items)}
          </div>
          ${items.length === 0 ? '<div class="empty-state small"><p>No tasks yet. Click <strong>+ Add</strong> or <strong>Load Defaults</strong> for a starter list.</p></div>' : ''}
        </div>

        <!-- Right: Goals -->
        <div class="goals-col">
          <div class="col-header">
            <h3>🎯 Goals & Milestones</h3>
            <button class="btn btn-sm btn-outline" onclick="Checklist.openGoalModal()">+ Add Goal</button>
          </div>
          <div id="goals-list">
            ${this.buildGoals(goals)}
          </div>
          ${goals.length === 0 ? '<div class="empty-state small"><p>No goals yet. Add milestones to stay motivated!</p></div>' : ''}
        </div>

      </div>

      <!-- Document Tracker Section -->
      <div class="doc-tracker">
        <div class="col-header">
          <h3>📄 Document Tracker</h3>
          <small>Check off documents as you prepare them</small>
        </div>
        <div class="doc-grid" id="doc-grid">
          ${this.buildDocTracker()}
        </div>
      </div>

      <!-- Goal Modal -->
      <div id="goal-modal" class="modal hidden">
        <div class="modal-backdrop" onclick="Checklist.closeGoalModal()"></div>
        <div class="modal-box">
          <div class="modal-header">
            <h3 id="goal-modal-title">Add Goal</h3>
            <button class="modal-close" onclick="Checklist.closeGoalModal()">✕</button>
          </div>
          <form id="goal-form" onsubmit="Checklist.saveGoal(event)">
            <div class="form-grid">
              <div class="form-group form-full">
                <label>Goal Title *</label>
                <input type="text" name="title" required placeholder="e.g. Send 10 professor emails by Nov 1">
              </div>
              <div class="form-group">
                <label>Target Date</label>
                <input type="date" name="targetDate">
              </div>
              <div class="form-group">
                <label>Priority</label>
                <select name="priority">
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Low">Low</option>
                </select>
              </div>
              <div class="form-group form-full">
                <label>Notes</label>
                <textarea name="notes" rows="2" placeholder="Additional details..."></textarea>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-outline" onclick="Checklist.closeGoalModal()">Cancel</button>
              <button type="submit" class="btn btn-primary">Save Goal</button>
            </div>
          </form>
        </div>
      </div>
    `;
  },

  buildChecklist(items) {
    if (!items.length) return '';
    const grouped = {};
    items.forEach(i => {
      const cat = i.category || 'General';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(i);
    });
    return Object.entries(grouped).map(([cat, catItems]) => `
      <div class="checklist-group">
        <div class="group-label">${esc(cat)}</div>
        ${catItems.map(item => `
          <div class="checklist-item ${item.done ? 'done' : ''}">
            <label class="check-label">
              <input type="checkbox" ${item.done ? 'checked' : ''} onchange="Checklist.toggleItem('${esc(item.id)}', this.checked)">
              <span class="check-text">${esc(item.text)}</span>
            </label>
            <div class="check-actions">
              ${item.dueDate ? `<span class="check-date">${fmtDate(item.dueDate, false)}</span>` : ''}
              <button class="btn-icon btn-icon-danger" onclick="Checklist.deleteItem('${esc(item.id)}')">✕</button>
            </div>
          </div>`).join('')}
      </div>`).join('');
  },

  buildGoals(goals) {
    if (!goals.length) return '';
    return goals.map(g => {
      const today = new Date();
      const daysLeft = g.targetDate ? daysUntil(g.targetDate) : null;
      return `
        <div class="goal-item ${g.done ? 'done' : ''}">
          <div class="goal-top">
            <label class="check-label">
              <input type="checkbox" ${g.done ? 'checked' : ''} onchange="Checklist.toggleGoal('${esc(g.id)}', this.checked)">
              <span class="check-text"><strong>${esc(g.title)}</strong></span>
            </label>
            <span class="badge ${g.priority === 'High' ? 'badge-red' : g.priority === 'Low' ? 'badge-gray' : 'badge-yellow'}">${esc(g.priority || 'Medium')}</span>
          </div>
          ${g.notes ? `<p class="goal-notes">${esc(g.notes)}</p>` : ''}
          <div class="goal-footer">
            ${g.targetDate ? `<span class="check-date ${daysLeft !== null && daysLeft < 14 ? 'text-urgent' : ''}">📅 ${fmtDate(g.targetDate)}${daysLeft !== null ? ` · ${daysLeft}d` : ''}</span>` : ''}
            <div style="display:flex;gap:0.5rem;">
              <button class="btn-icon" onclick="Checklist.openGoalModal('${esc(g.id)}')">✏️</button>
              <button class="btn-icon btn-icon-danger" onclick="Checklist.deleteGoal('${esc(g.id)}')">🗑️</button>
            </div>
          </div>
        </div>`;
    }).join('');
  },

  buildDocTracker() {
    const docs = Storage.get('hed_docs') || this.defaultDocs();
    return docs.map(d => `
      <div class="doc-item ${d.done ? 'done' : ''}">
        <label class="check-label">
          <input type="checkbox" ${d.done ? 'checked' : ''} onchange="Checklist.toggleDoc('${esc(d.id)}', this.checked)">
          <span class="doc-icon">${esc(d.icon)}</span>
          <span class="check-text">${esc(d.name)}</span>
        </label>
        <span class="doc-status ${d.done ? 'text-green' : 'text-muted'}">${d.done ? '✅ Ready' : '⏳ Pending'}</span>
      </div>`).join('');
  },

  defaultDocs() {
    const docs = [
      { id: 'd1', name: 'Statement of Purpose (SOP)', icon: '📝', done: false },
      { id: 'd2', name: 'CV / Resume', icon: '📄', done: false },
      { id: 'd3', name: 'Letter of Recommendation 1', icon: '✉️', done: false },
      { id: 'd4', name: 'Letter of Recommendation 2', icon: '✉️', done: false },
      { id: 'd5', name: 'Letter of Recommendation 3', icon: '✉️', done: false },
      { id: 'd6', name: 'Official Transcripts', icon: '🎓', done: false },
      { id: 'd7', name: 'IELTS / TOEFL Certificate', icon: '🗣️', done: false },
      { id: 'd8', name: 'GRE Score Report', icon: '📊', done: false },
      { id: 'd9', name: 'Research Proposal', icon: '🔬', done: false },
      { id: 'd10', name: 'Passport Copy', icon: '🛂', done: false },
      { id: 'd11', name: 'Financial Statement', icon: '💰', done: false },
      { id: 'd12', name: 'Portfolio / Writing Sample', icon: '🖊️', done: false },
    ];
    Storage.set('hed_docs', docs);
    return docs;
  },

  toggleDoc(id, checked) {
    const docs = Storage.get('hed_docs') || [];
    const updated = docs.map(d => d.id === id ? { ...d, done: checked } : d);
    Storage.set('hed_docs', updated);
    document.getElementById('doc-grid').innerHTML = this.buildDocTracker();
  },

  toggleItem(id, checked) {
    const items = Storage.getChecklist().map(i => i.id === id ? { ...i, done: checked } : i);
    Storage.setChecklist(items);
    this.render();
  },

  toggleGoal(id, checked) {
    const goals = Storage.getGoals().map(g => g.id === id ? { ...g, done: checked } : g);
    Storage.setGoals(goals);
    this.render();
    Dashboard.render();
  },

  addItem() {
    const text = prompt('Enter task description:');
    if (!text || !text.trim()) return;
    const category = prompt('Category (e.g. Test Prep, Documents, Applications):', 'General') || 'General';
    const dueDate = prompt('Due date (YYYY-MM-DD) or leave blank:', '') || '';
    const items = Storage.getChecklist();
    items.push({ id: `c_${Date.now()}`, text: text.trim(), category: category.trim(), dueDate, done: false });
    Storage.setChecklist(items);
    this.render();
    Dashboard.render();
  },

  deleteItem(id) {
    if (!confirm('Delete this task?')) return;
    Storage.setChecklist(Storage.getChecklist().filter(i => i.id !== id));
    this.render();
    Dashboard.render();
  },

  loadDefaults() {
    if (!confirm('Load the default higher education checklist? This will ADD to your existing tasks.')) return;
    const defaults = [
      { category: 'Test Prep', text: 'Register for IELTS / TOEFL', done: false },
      { category: 'Test Prep', text: 'Take IELTS / TOEFL exam', done: false },
      { category: 'Test Prep', text: 'Register for GRE (if required)', done: false },
      { category: 'Test Prep', text: 'Take GRE exam', done: false },
      { category: 'Documents', text: 'Write Statement of Purpose (SOP)', done: false },
      { category: 'Documents', text: 'Update CV / Resume', done: false },
      { category: 'Documents', text: 'Request LOR from Professor 1', done: false },
      { category: 'Documents', text: 'Request LOR from Professor 2', done: false },
      { category: 'Documents', text: 'Request LOR from Professor 3', done: false },
      { category: 'Documents', text: 'Collect official transcripts', done: false },
      { category: 'Research', text: 'Identify target research areas', done: false },
      { category: 'Research', text: 'Find 20+ target professors', done: false },
      { category: 'Research', text: 'Draft cold email template', done: false },
      { category: 'Research', text: 'Send professor outreach emails', done: false },
      { category: 'Research', text: 'Follow up with non-responding professors', done: false },
      { category: 'Applications', text: 'Shortlist 10 target universities', done: false },
      { category: 'Applications', text: 'Create accounts on all application portals', done: false },
      { category: 'Applications', text: 'Submit all applications', done: false },
      { category: 'Finance', text: 'Prepare financial proof documents', done: false },
      { category: 'Finance', text: 'Apply for scholarships & fellowships', done: false },
    ];
    const existing = Storage.getChecklist();
    const merged = [...existing, ...defaults.map(d => ({ ...d, id: `c_${Date.now()}_${Math.random().toString(36).slice(2)}` }))];
    Storage.setChecklist(merged);
    this.render();
    Dashboard.render();
    showToast('✅ Default checklist loaded!', 'success');
  },

  openGoalModal(id = null) {
    this.editingGoalId = id;
    const modal = document.getElementById('goal-modal');
    const form = document.getElementById('goal-form');
    const title = document.getElementById('goal-modal-title');
    form.reset();
    if (id) {
      const g = Storage.getGoals().find(x => x.id === id);
      if (g) {
        title.textContent = 'Edit Goal';
        form.title.value = g.title || '';
        form.targetDate.value = g.targetDate || '';
        form.priority.value = g.priority || 'Medium';
        form.notes.value = g.notes || '';
      }
    } else {
      title.textContent = 'Add Goal';
    }
    modal.classList.remove('hidden');
  },
  closeGoalModal() {
    document.getElementById('goal-modal').classList.add('hidden');
    this.editingGoalId = null;
  },

  saveGoal(e) {
    e.preventDefault();
    const form = e.target;
    const data = {
      id: this.editingGoalId || `g_${Date.now()}`,
      title: form.title.value.trim(),
      targetDate: form.targetDate.value,
      priority: form.priority.value,
      notes: form.notes.value.trim(),
      done: false,
    };
    let goals = Storage.getGoals();
    if (this.editingGoalId) {
      goals = goals.map(g => g.id === this.editingGoalId ? { ...g, ...data } : g);
      showToast('✅ Goal updated!', 'success');
    } else {
      goals.push(data);
      showToast('✅ Goal added!', 'success');
    }
    Storage.setGoals(goals);
    this.closeGoalModal();
    this.render();
    Dashboard.render();
  },

  deleteGoal(id) {
    if (!confirm('Delete this goal?')) return;
    Storage.setGoals(Storage.getGoals().filter(g => g.id !== id));
    this.render();
    Dashboard.render();
    showToast('🗑️ Goal removed.', 'info');
  },
};
