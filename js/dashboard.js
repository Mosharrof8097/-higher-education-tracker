// ============================================================
// dashboard.js — Dashboard tab: summary cards + Chart.js charts
// ============================================================

const Dashboard = {
  profChart: null,
  uniChart: null,

  render() {
    const profs   = Storage.getProfessors();
    const unis    = Storage.getUniversities();
    const schs    = Storage.getScholarships();
    const emails  = Storage.getEmails();
    const checklist = Storage.getChecklist();
    const goals   = Storage.getGoals();
    const profile = Storage.getProfile();

    // ── Stats ─────────────────────────────────────────────────
    const totalProfs   = profs.length;
    const replied      = profs.filter(p => p.response === 'Replied').length;
    const awaiting     = profs.filter(p => p.response === 'Awaiting').length;
    const promising    = profs.filter(p => p.status === 'Promising' || p.status === 'In talks').length;
    const totalUnis    = unis.length;
    const submitted    = unis.filter(u => u.appStatus === 'Submitted').length;
    const accepted     = unis.filter(u => u.appStatus === 'Accepted').length;
    const checkDone    = checklist.filter(c => c.done).length;
    const checkTotal   = checklist.length;
    const goalsDone    = goals.filter(g => g.done).length;
    const totalSchs    = schs.length;
    const schApplied   = schs.filter(s => s.appStatus === 'Applied' || s.appStatus === 'Interview').length;
    const schAccepted  = schs.filter(s => s.appStatus === 'Accepted').length;
    const emailsTotal  = emails.length;
    const needsFollowUp = emails.filter(e => e.followUp === 'Yes').length;

    // ── Upcoming deadlines (unis + scholarships combined) ─────
    const today = new Date();
    const allDeadlines = [
      ...unis.filter(u => u.deadline).map(u => ({ name: u.name, type: 'University', program: u.program, deadline: u.deadline, daysLeft: Math.ceil((new Date(u.deadline) - today) / 86400000) })),
      ...schs.filter(s => s.deadline).map(s => ({ name: s.name, type: 'Scholarship', program: s.funder, deadline: s.deadline, daysLeft: Math.ceil((new Date(s.deadline) - today) / 86400000) })),
    ].filter(d => d.daysLeft >= 0).sort((a, b) => a.daysLeft - b.daysLeft).slice(0, 6);

    document.getElementById('tab-dashboard').innerHTML = `
      <div class="dashboard-wrap">

        <!-- Header -->
        <div class="section-header">
          <div>
            <h2 class="section-title">Dashboard</h2>
            <p class="section-sub">Your higher education journey at a glance${profile.name ? ` — Welcome back, <strong>${profile.name.split(' ')[0]}</strong>!` : ''}</p>
          </div>
          <div style="display:flex;gap:0.5rem;align-items:center;">
            <button class="btn btn-outline btn-sm" onclick="openProfileModal()">👤 ${profile.ielts ? `IELTS ${profile.ielts}` : 'Set Profile'}</button>
            <span class="badge badge-navy">${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          </div>
        </div>

        <!-- Stat Cards Row 1 -->
        <div class="stat-grid">
          <div class="stat-card" onclick="switchTab('professors')" style="cursor:pointer;">
            <div class="stat-icon">🔬</div>
            <div class="stat-info">
              <div class="stat-num">${totalProfs}</div>
              <div class="stat-label">Professors Tracked</div>
              <div class="stat-sub">${replied} replied · ${promising} promising</div>
            </div>
          </div>
          <div class="stat-card" onclick="switchTab('universities')" style="cursor:pointer;">
            <div class="stat-icon">🏛️</div>
            <div class="stat-info">
              <div class="stat-num">${totalUnis}</div>
              <div class="stat-label">Universities Tracked</div>
              <div class="stat-sub">${submitted} submitted · ${accepted} accepted</div>
            </div>
          </div>
          <div class="stat-card" onclick="switchTab('scholarships')" style="cursor:pointer;">
            <div class="stat-icon">🏆</div>
            <div class="stat-info">
              <div class="stat-num">${totalSchs}</div>
              <div class="stat-label">Scholarships Tracked</div>
              <div class="stat-sub">${schApplied} applied · ${schAccepted} accepted</div>
            </div>
          </div>
          <div class="stat-card" onclick="switchTab('emails')" style="cursor:pointer;">
            <div class="stat-icon">📧</div>
            <div class="stat-info">
              <div class="stat-num">${emailsTotal}</div>
              <div class="stat-label">Emails Logged</div>
              <div class="stat-sub">${needsFollowUp > 0 ? `⚠️ ${needsFollowUp} need follow-up` : 'All followed up ✅'}</div>
            </div>
          </div>
        </div>

        <!-- Stat Cards Row 2 -->
        <div class="stat-grid" style="margin-top:0;">
          <div class="stat-card" onclick="switchTab('checklist')" style="cursor:pointer;">
            <div class="stat-icon">✅</div>
            <div class="stat-info">
              <div class="stat-num">${checkDone}/${checkTotal}</div>
              <div class="stat-label">Checklist Done</div>
              <div class="stat-sub">${goalsDone} goals completed</div>
            </div>
          </div>
          <div class="stat-card" onclick="switchTab('professors')" style="cursor:pointer;">
            <div class="stat-icon">⏳</div>
            <div class="stat-info">
              <div class="stat-num">${awaiting}</div>
              <div class="stat-label">Awaiting Replies</div>
              <div class="stat-sub">from professors</div>
            </div>
          </div>
          <div class="stat-card" onclick="switchTab('archive')" style="cursor:pointer;">
            <div class="stat-icon">📁</div>
            <div class="stat-info">
              <div class="stat-num">Archive</div>
              <div class="stat-label">Document Vault</div>
              <div class="stat-sub">Upload & manage docs</div>
            </div>
          </div>
          ${needsFollowUp > 0 ? `
          <div class="stat-card stat-card-alert" onclick="switchTab('emails')" style="cursor:pointer;">
            <div class="stat-icon">⚠️</div>
            <div class="stat-info">
              <div class="stat-num">${needsFollowUp}</div>
              <div class="stat-label">Follow-ups Needed</div>
              <div class="stat-sub">Click to view emails</div>
            </div>
          </div>` : `
          <div class="stat-card">
            <div class="stat-icon">🌟</div>
            <div class="stat-info">
              <div class="stat-num">${schs.filter(s=>s.fundingType==='Full Funding').length}</div>
              <div class="stat-label">Full Funding Scholarships</div>
              <div class="stat-sub">tracked</div>
            </div>
          </div>`}
        </div>

        <!-- Charts Row -->
        <div class="charts-row">
          <div class="chart-card">
            <h3 class="chart-title">Professor Response Status</h3>
            <div class="chart-wrap"><canvas id="profChart"></canvas></div>
          </div>
          <div class="chart-card">
            <h3 class="chart-title">University Application Status</h3>
            <div class="chart-wrap"><canvas id="uniChart"></canvas></div>
          </div>
        </div>

        <!-- Upcoming Deadlines -->
        <div class="deadlines-card">
          <h3 class="chart-title">⏰ Upcoming Deadlines <span style="font-size:0.75rem;font-weight:400;color:var(--text-muted);">(Universities + Scholarships)</span></h3>
          ${allDeadlines.length === 0
            ? '<p class="empty-msg">No upcoming deadlines. Add universities or scholarships with deadlines to see them here.</p>'
            : `<div class="deadline-list">
                ${allDeadlines.map(d => `
                  <div class="deadline-item">
                    <div class="deadline-info">
                      <span class="deadline-uni">${d.type === 'Scholarship' ? '🏆' : '🏛️'} ${d.name}</span>
                      <span class="deadline-prog">${d.program || ''}</span>
                    </div>
                    <div class="deadline-right">
                      <span class="deadline-date">${new Date(d.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      <span class="deadline-days ${d.daysLeft <= 30 ? 'urgent' : d.daysLeft <= 60 ? 'warning' : 'safe'}">${d.daysLeft}d left</span>
                    </div>
                  </div>`).join('')}
              </div>`
          }
        </div>

      </div>
    `;

    this.renderCharts(profs, unis);
  },

  renderCharts(profs, unis) {
    if (this.profChart) this.profChart.destroy();
    if (this.uniChart)  this.uniChart.destroy();

    const profCtx = document.getElementById('profChart');
    const uniCtx  = document.getElementById('uniChart');
    if (!profCtx || !uniCtx) return;

    const replied  = profs.filter(p => p.response === 'Replied').length;
    const awaiting = profs.filter(p => p.response === 'Awaiting').length;
    const noReply  = profs.filter(p => p.response === 'No Reply').length;

    this.profChart = new Chart(profCtx, {
      type: 'doughnut',
      data: {
        labels: ['Replied', 'Awaiting', 'No Reply'],
        datasets: [{ data: [replied, awaiting, noReply], backgroundColor: ['#4ade80', '#fbbf24', '#f87171'], borderWidth: 0 }],
      },
      options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { position: 'bottom' } } },
    });

    const statuses  = ['Not Started', 'In Progress', 'Submitted', 'Accepted', 'Rejected'];
    const uniCounts = statuses.map(s => unis.filter(u => u.appStatus === s).length);
    this.uniChart = new Chart(uniCtx, {
      type: 'bar',
      data: {
        labels: statuses,
        datasets: [{ label: 'Universities', data: uniCounts, backgroundColor: ['#94a3b8', '#60a5fa', '#a78bfa', '#4ade80', '#f87171'], borderRadius: 6, borderWidth: 0 }],
      },
      options: {
        responsive: true, maintainAspectRatio: true,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } }, x: { grid: { display: false } } },
      },
    });
  },
};
