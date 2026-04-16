/* ═══════════════════════════════════════════════════════
   PlaceTrack — Main Application JavaScript
═══════════════════════════════════════════════════════ */

let currentUser = null;
let allApps = [];
let monthlyChart = null;
let statusChart = null;
let currentPrepTab = 'aptitude';
let currentAdminTab = 'reports';

// ── Helpers ──────────────────────────────────────────────────────

async function api(path, method = 'GET', body = null) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch('/api' + path, opts);
  const data = await res.json();
  if (!res.ok) throw { status: res.status, message: data.error || 'Request failed' };
  return data;
}

function fmtDate(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return iso; }
}

function timeAgo(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function initials(name = '') {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function showError(id, msg) {
  const el = document.getElementById(id);
  if (el) el.textContent = msg;
}
function clearError(id) { showError(id, ''); }

function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }
function closeModalOnOverlay(e, id) { if (e.target === e.currentTarget) closeModal(id); }

// ── Theme ─────────────────────────────────────────────────────────

function toggleTheme() {
  const html = document.documentElement;
  const isDark = html.dataset.theme === 'dark';
  html.dataset.theme = isDark ? 'light' : 'dark';
  localStorage.setItem('theme', html.dataset.theme);
  document.getElementById('theme-icon').className = isDark ? 'icon-moon' : 'icon-sun';
}

function loadTheme() {
  const saved = localStorage.getItem('theme') || 'dark';
  document.documentElement.dataset.theme = saved;
  const icon = document.getElementById('theme-icon');
  if (icon) icon.className = saved === 'dark' ? 'icon-sun' : 'icon-moon';
}

// ── Auth ──────────────────────────────────────────────────────────

document.querySelectorAll('.auth-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(tab.dataset.tab + '-form').classList.add('active');
  });
});

async function doLogin() {
  clearError('login-error');
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  if (!email || !password) return showError('login-error', 'Email and password required.');
  try {
    const data = await api('/auth/login', 'POST', { email, password });
    currentUser = data.user;
    initApp();
  } catch (e) {
    showError('login-error', e.message || 'Login failed. Check credentials.');
  }
}

async function doSignup() {
  clearError('signup-error');
  const name = document.getElementById('su-name').value.trim();
  const roll = document.getElementById('su-roll').value.trim();
  const email = document.getElementById('su-email').value.trim();
  const branch = document.getElementById('su-branch').value;
  const password = document.getElementById('su-password').value;
  if (!name || !roll || !email || !branch || !password)
    return showError('signup-error', 'All fields are required.');
  if (password.length < 6)
    return showError('signup-error', 'Password must be at least 6 characters.');
  try {
    const data = await api('/auth/signup', 'POST', { name, roll, email, branch, password });
    currentUser = data.user;
    initApp();
  } catch (e) {
    showError('signup-error', e.message || 'Signup failed. Try again.');
  }
}

async function doLogout() {
  await api('/auth/logout', 'POST');
  currentUser = null;
  document.getElementById('app').style.display = 'none';
  document.getElementById('auth-screen').style.display = 'flex';
}

// ── App Init ──────────────────────────────────────────────────────

function initApp() {
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('app').style.display = 'flex';

  // Admin nav
  if (currentUser.is_admin) {
    document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'flex');
  }

  // Greeting
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = currentUser.name.split(' ')[0];
  document.getElementById('dash-greeting').textContent = `${greet}, ${firstName}! 👋`;
  document.getElementById('dash-date').textContent = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  loadDashboard();
  loadNotifications();
  showPage('dashboard');
}

// ── Navigation ────────────────────────────────────────────────────

function showPage(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('page-' + pageId)?.classList.add('active');
  document.querySelector(`[data-page="${pageId}"]`)?.classList.add('active');

  // Close sidebar on mobile
  document.getElementById('sidebar').classList.remove('open');
  document.querySelector('.sidebar-overlay')?.classList.remove('active');

  if (pageId === 'dashboard') loadDashboard();
  else if (pageId === 'applications') loadApplications();
  else if (pageId === 'drives') loadDrives();
  else if (pageId === 'preparation') loadPreparation();
  else if (pageId === 'notes') loadNotes();
  else if (pageId === 'profile') loadProfile();
  else if (pageId === 'notifications') loadNotifications();
  else if (pageId === 'admin') loadAdmin();
}

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  sidebar.classList.toggle('open');
  let overlay = document.querySelector('.sidebar-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    overlay.onclick = () => { sidebar.classList.remove('open'); overlay.classList.remove('active'); };
    document.body.appendChild(overlay);
  }
  overlay.classList.toggle('active');
}

// ── Dashboard ─────────────────────────────────────────────────────

async function loadDashboard() {
  try {
    const data = await api('/dashboard');
    const s = data.stats;

    document.getElementById('s-total').textContent = s.total;
    document.getElementById('s-selected').textContent = s.selected;
    document.getElementById('s-pending').textContent = s.pending;
    document.getElementById('s-rejected').textContent = s.rejected;

    drawMonthlyChart(data.monthly_chart);
    drawStatusChart(s);
    renderUpcomingInterviews(data.upcoming_interviews);
    renderDeadlines(data.deadline_alerts);
    renderUpcomingDrives(data.upcoming_drives);
  } catch (e) { console.error('Dashboard error:', e); }
}

function drawMonthlyChart(monthly) {
  const ctx = document.getElementById('monthly-chart');
  if (!ctx) return;
  if (monthlyChart) monthlyChart.destroy();
  const labels = Object.keys(monthly);
  const values = Object.values(monthly);
  const isDark = document.documentElement.dataset.theme === 'dark';
  monthlyChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Applications',
        data: values,
        backgroundColor: 'rgba(79,142,247,.6)',
        borderColor: 'rgba(79,142,247,1)',
        borderWidth: 2, borderRadius: 6, borderSkipped: false
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: true,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, ticks: { color: '#8891a8', stepSize: 1 }, grid: { color: '#252c3d' } },
        x: { ticks: { color: '#8891a8' }, grid: { display: false } }
      }
    }
  });
}

function drawStatusChart(s) {
  const ctx = document.getElementById('status-chart');
  if (!ctx) return;
  if (statusChart) statusChart.destroy();
  statusChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Applied', 'Online Test', 'Interview', 'Selected', 'Rejected'],
      datasets: [{
        data: [s.applied, s.online_test, s.interview, s.selected, s.rejected],
        backgroundColor: ['rgba(79,142,247,.8)','rgba(167,139,250,.8)','rgba(251,191,36,.8)','rgba(52,211,153,.8)','rgba(248,113,113,.8)'],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: true,
      cutout: '65%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: '#8891a8', padding: 14, font: { size: 11 } }
        }
      }
    }
  });
}

function renderUpcomingInterviews(list) {
  const el = document.getElementById('upcoming-interviews-list');
  if (!list.length) { el.innerHTML = '<div class="empty-state">No upcoming interviews 🎯</div>'; return; }
  el.innerHTML = list.map(i => `
    <div class="reminder-item">
      <div class="reminder-dot"></div>
      <div><div class="r-company">${i.company}</div>
      <div class="r-detail">${i.role} · ${fmtDate(i.date)}</div></div>
    </div>`).join('');
}

function renderDeadlines(list) {
  const el = document.getElementById('deadline-alerts-list');
  if (!list.length) { el.innerHTML = '<div class="empty-state">No urgent deadlines ✅</div>'; return; }
  el.innerHTML = list.map(d => {
    const color = d.days_left <= 2 ? 'red' : d.days_left <= 7 ? 'amber' : '';
    return `<div class="reminder-item">
      <div class="reminder-dot ${color}"></div>
      <div><div class="r-company">${d.company}</div>
      <div class="r-detail">${d.role} · ${d.days_left === 0 ? 'Today!' : d.days_left + 'd left'}</div></div>
    </div>`;
  }).join('');
}

function renderUpcomingDrives(list) {
  const el = document.getElementById('upcoming-drives-list');
  if (!list.length) { el.innerHTML = '<div class="empty-state">No upcoming drives scheduled</div>'; return; }
  el.innerHTML = list.map(d => `
    <div class="reminder-item">
      <div class="reminder-dot amber"></div>
      <div><div class="r-company">${d.company}</div>
      <div class="r-detail">${d.role} · ${fmtDate(d.date)}</div></div>
    </div>`).join('');
}

// ── Applications ──────────────────────────────────────────────────

async function loadApplications() {
  try {
    const data = await api('/applications');
    allApps = data.applications;
    renderApps(allApps);
  } catch (e) { console.error('Apps error:', e); }
}

function filterApps() {
  const q = document.getElementById('search-input').value.toLowerCase();
  const status = document.getElementById('status-filter').value;
  let filtered = allApps;
  if (q) filtered = filtered.filter(a =>
    a.company.toLowerCase().includes(q) || a.role.toLowerCase().includes(q));
  if (status) filtered = filtered.filter(a => a.status === status);
  renderApps(filtered);
}

function renderApps(apps) {
  const el = document.getElementById('apps-list');
  if (!apps.length) {
    el.innerHTML = `<div class="card" style="text-align:center;color:var(--txt-muted);padding:48px">
      <div style="font-size:2.5rem;margin-bottom:12px">📋</div>
      <p>No applications yet. Start by adding one!</p>
    </div>`;
    return;
  }
  el.innerHTML = apps.map(a => `
    <div class="app-card">
      <div class="app-logo">${initials(a.company)}</div>
      <div class="app-info">
        <div class="app-company">${a.company}</div>
        <div class="app-role">${a.role}</div>
        <div class="app-meta">
          <span class="status-badge status-${a.status.replace(' ', '\\ ')}">${a.status}</span>
          ${a.package ? `<span class="app-package">💰 ${a.package}</span>` : ''}
          ${a.interview_date ? `<span class="app-date">📅 Interview: ${fmtDate(a.interview_date)}</span>` : ''}
          ${a.deadline ? `<span class="app-date">⏰ Deadline: ${fmtDate(a.deadline)}</span>` : ''}
          <span class="app-date">Applied ${fmtDate(a.applied_date)}</span>
        </div>
      </div>
      <div class="app-actions">
        <button class="btn-edit" onclick="openEditModal('${a.id}')">
          <i class="icon-pencil"></i> Edit
        </button>
        <button class="btn-danger" onclick="deleteApp('${a.id}', '${a.company}')">
          <i class="icon-trash-2"></i>
        </button>
      </div>
    </div>`).join('');
}

function openAddModal() {
  document.getElementById('modal-title').textContent = 'Add Application';
  document.getElementById('edit-app-id').value = '';
  document.getElementById('app-company').value = '';
  document.getElementById('app-role').value = '';
  document.getElementById('app-package').value = '';
  document.getElementById('app-status').value = 'Applied';
  document.getElementById('app-deadline').value = '';
  document.getElementById('app-interview-date').value = '';
  document.getElementById('app-notes').value = '';
  clearError('app-modal-error');
  openModal('app-modal');
}

function openEditModal(appId) {
  const app = allApps.find(a => a.id === appId);
  if (!app) return;
  document.getElementById('modal-title').textContent = 'Edit Application';
  document.getElementById('edit-app-id').value = appId;
  document.getElementById('app-company').value = app.company;
  document.getElementById('app-role').value = app.role;
  document.getElementById('app-package').value = app.package || '';
  document.getElementById('app-status').value = app.status;
  document.getElementById('app-deadline').value = app.deadline || '';
  document.getElementById('app-interview-date').value = app.interview_date || '';
  document.getElementById('app-notes').value = app.notes || '';
  clearError('app-modal-error');
  openModal('app-modal');
}

async function saveApplication() {
  clearError('app-modal-error');
  const id = document.getElementById('edit-app-id').value;
  const payload = {
    company: document.getElementById('app-company').value.trim(),
    role: document.getElementById('app-role').value.trim(),
    package: document.getElementById('app-package').value.trim(),
    status: document.getElementById('app-status').value,
    deadline: document.getElementById('app-deadline').value,
    interview_date: document.getElementById('app-interview-date').value,
    notes: document.getElementById('app-notes').value.trim()
  };
  if (!payload.company || !payload.role)
    return showError('app-modal-error', 'Company and Role are required.');
  try {
    if (id) {
      const data = await api('/applications/' + id, 'PUT', payload);
      allApps = allApps.map(a => a.id === id ? data.application : a);
    } else {
      const data = await api('/applications', 'POST', payload);
      allApps.unshift(data.application);
    }
    closeModal('app-modal');
    renderApps(allApps);
    loadNotificationCount();
  } catch (e) {
    showError('app-modal-error', e.message || 'Failed to save.');
  }
}

async function deleteApp(id, company) {
  if (!confirm(`Delete application for ${company}?`)) return;
  try {
    await api('/applications/' + id, 'DELETE');
    allApps = allApps.filter(a => a.id !== id);
    renderApps(allApps);
  } catch (e) { alert('Failed to delete: ' + e.message); }
}

// ── Drives ────────────────────────────────────────────────────────

async function loadDrives() {
  try {
    const data = await api('/admin/drives');
    const list = document.getElementById('drives-list');
    if (!data.drives.length) {
      list.innerHTML = `<div class="card" style="text-align:center;color:var(--txt-muted);padding:48px;grid-column:1/-1">
        <div style="font-size:2.5rem;margin-bottom:12px">🏢</div>
        <p>No placement drives scheduled yet.</p>
      </div>`;
      return;
    }
    list.innerHTML = data.drives.sort((a,b) => a.date.localeCompare(b.date)).map(d => `
      <div class="drive-card">
        <div class="drive-company">${d.company}</div>
        <div class="drive-role">${d.role}</div>
        <div class="drive-date-badge">📅 ${fmtDate(d.date)}</div>
        <div class="drive-details">
          ${d.location ? `<div class="drive-detail"><i class="icon-map-pin"></i> ${d.location}</div>` : ''}
          ${d.package ? `<div class="drive-detail"><i class="icon-indian-rupee"></i> ${d.package}</div>` : ''}
        </div>
      </div>`).join('');
  } catch (e) { console.error(e); }
}

// ── Preparation ───────────────────────────────────────────────────

async function loadPreparation() {
  try {
    const data = await api('/resources');
    window._prepData = data;
    renderPrepTab(currentPrepTab, data);
  } catch (e) { console.error(e); }
}

function switchPrepTab(tab) {
  currentPrepTab = tab;
  document.querySelectorAll('.prep-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.ptab === tab);
  });
  if (window._prepData) renderPrepTab(tab, window._prepData);
}

function renderPrepTab(tab, data) {
  const el = document.getElementById('prep-content');
  if (tab === 'aptitude') {
    el.innerHTML = `<h3 style="margin-bottom:16px;color:var(--txt-secondary)">Top Aptitude Preparation Sites</h3>
      <div class="resource-grid">
        ${data.aptitude.map(r => `
          <a href="${r.url}" target="_blank" rel="noopener" class="resource-card">
            <div class="r-name">🔗 ${r.name}</div>
            <div class="r-desc">${r.desc}</div>
            <div class="r-link">Open site →</div>
          </a>`).join('')}
      </div>`;
  } else if (tab === 'coding') {
    el.innerHTML = `<h3 style="margin-bottom:16px;color:var(--txt-secondary)">Coding Practice Platforms</h3>
      <div class="resource-grid">
        ${data.coding.map(r => `
          <a href="${r.url}" target="_blank" rel="noopener" class="resource-card">
            <div class="r-name">💻 ${r.name}</div>
            <div class="r-desc">${r.desc}</div>
            <div class="r-link">Open site →</div>
          </a>`).join('')}
      </div>`;
  } else if (tab === 'hr') {
    el.innerHTML = `<h3 style="margin-bottom:16px;color:var(--txt-secondary)">Common HR Interview Questions</h3>
      <div class="hr-list">
        ${data.hr_questions.map((q, i) => `
          <div class="hr-item">
            <div class="hr-num">${i+1}</div>
            <div class="hr-q">${q}</div>
          </div>`).join('')}
      </div>`;
  } else if (tab === 'resume') {
    el.innerHTML = `<h3 style="margin-bottom:16px;color:var(--txt-secondary)">Resume Writing Tips</h3>
      <div class="tips-grid">
        ${data.resume_tips.map((tip, i) => `
          <div class="tip-card">
            <div class="tip-num">${i+1}</div>
            <p>${tip}</p>
          </div>`).join('')}
      </div>`;
  }
}

// ── Notes ─────────────────────────────────────────────────────────

async function loadNotes() {
  try {
    const data = await api('/notes');
    const el = document.getElementById('notes-list');
    if (!data.notes.length) {
      el.innerHTML = `<div class="card" style="text-align:center;color:var(--txt-muted);padding:48px;grid-column:1/-1">
        <div style="font-size:2.5rem;margin-bottom:12px">📓</div>
        <p>No notes yet. Document your interview experiences!</p>
      </div>`;
      return;
    }
    el.innerHTML = data.notes.map(n => `
      <div class="note-card">
        <div>
          <div class="note-title">${n.title}</div>
          ${n.company ? `<div class="note-company">@ ${n.company}</div>` : ''}
        </div>
        <div class="note-content">${n.content}</div>
        <div class="note-footer">
          <span class="note-date">${fmtDate(n.created_at)}</span>
          <button class="btn-danger" onclick="deleteNote('${n.id}')">
            <i class="icon-trash-2"></i>
          </button>
        </div>
      </div>`).join('');
  } catch (e) { console.error(e); }
}

function openNoteModal() {
  document.getElementById('note-title').value = '';
  document.getElementById('note-company').value = '';
  document.getElementById('note-content').value = '';
  clearError('note-modal-error');
  openModal('note-modal');
}

async function saveNote() {
  clearError('note-modal-error');
  const title = document.getElementById('note-title').value.trim();
  const company = document.getElementById('note-company').value.trim();
  const content = document.getElementById('note-content').value.trim();
  if (!title || !content) return showError('note-modal-error', 'Title and content are required.');
  try {
    await api('/notes', 'POST', { title, company, content });
    closeModal('note-modal');
    loadNotes();
  } catch (e) { showError('note-modal-error', e.message); }
}

async function deleteNote(id) {
  if (!confirm('Delete this note?')) return;
  try {
    await api('/notes/' + id, 'DELETE');
    loadNotes();
  } catch (e) { alert('Delete failed'); }
}

// ── Profile ───────────────────────────────────────────────────────

async function loadProfile() {
  try {
    const u = await api('/auth/me');
    currentUser = u;
    document.getElementById('profile-avatar').textContent = initials(u.name);
    document.getElementById('profile-name').textContent = u.name;
    document.getElementById('profile-email').textContent = u.email;
    document.getElementById('profile-roll').textContent = u.roll;
    document.getElementById('profile-branch').textContent = u.branch;
    document.getElementById('p-name').value = u.name || '';
    document.getElementById('p-roll').value = u.roll || '';
    document.getElementById('p-branch').value = u.branch || '';
    document.getElementById('p-phone').value = u.phone || '';
    document.getElementById('p-linkedin').value = u.linkedin || '';
    document.getElementById('p-github').value = u.github || '';

    const resumeStatus = document.getElementById('resume-status');
    const resumeDownload = document.getElementById('resume-download');
    if (u.resume) {
      resumeStatus.textContent = `✅ Resume uploaded: ${u.resume}`;
      resumeDownload.href = '/static/uploads/' + u.resume;
      resumeDownload.style.display = 'inline-flex';
    } else {
      resumeStatus.textContent = 'No resume uploaded yet.';
      resumeDownload.style.display = 'none';
    }
  } catch (e) { console.error(e); }
}

async function saveProfile() {
  clearError('profile-update-msg');
  const payload = {
    name: document.getElementById('p-name').value.trim(),
    roll: document.getElementById('p-roll').value.trim(),
    branch: document.getElementById('p-branch').value.trim(),
    phone: document.getElementById('p-phone').value.trim(),
    linkedin: document.getElementById('p-linkedin').value.trim(),
    github: document.getElementById('p-github').value.trim()
  };
  try {
    await api('/profile', 'PUT', payload);
    document.getElementById('profile-update-msg').textContent = '✅ Profile updated!';
    setTimeout(() => clearError('profile-update-msg'), 3000);
    loadProfile();
  } catch (e) { showError('profile-update-msg', e.message); document.getElementById('profile-update-msg').style.color = 'var(--clr-red)'; }
}

async function changePassword() {
  clearError('pwd-msg');
  const oldP = document.getElementById('p-old-pwd').value;
  const newP = document.getElementById('p-new-pwd').value;
  const confP = document.getElementById('p-confirm-pwd').value;
  if (!oldP || !newP || !confP) return showError('pwd-msg', 'All password fields required.');
  if (newP !== confP) return showError('pwd-msg', 'New passwords do not match.');
  if (newP.length < 6) return showError('pwd-msg', 'Password must be at least 6 characters.');
  try {
    await api('/profile/password', 'PUT', { old_password: oldP, new_password: newP });
    document.getElementById('pwd-msg').style.color = 'var(--clr-green)';
    showError('pwd-msg', '✅ Password updated successfully!');
    document.getElementById('p-old-pwd').value = '';
    document.getElementById('p-new-pwd').value = '';
    document.getElementById('p-confirm-pwd').value = '';
  } catch (e) {
    document.getElementById('pwd-msg').style.color = 'var(--clr-red)';
    showError('pwd-msg', e.message);
  }
}

async function uploadResume() {
  const fileInput = document.getElementById('resume-file');
  const file = fileInput.files[0];
  if (!file) return;
  const formData = new FormData();
  formData.append('resume', file);
  try {
    const res = await fetch('/api/profile/resume', { method: 'POST', body: formData });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    alert('✅ Resume uploaded successfully!');
    loadProfile();
  } catch (e) { alert('Upload failed: ' + e.message); }
}

// ── Notifications ─────────────────────────────────────────────────

async function loadNotifications() {
  try {
    const data = await api('/notifications');
    const unread = data.notifications.filter(n => !n.read).length;
    updateBadge(unread);

    const el = document.getElementById('notif-list');
    if (!el) return;
    if (!data.notifications.length) {
      el.innerHTML = '<div class="card" style="text-align:center;color:var(--txt-muted);padding:40px"><p>No notifications yet.</p></div>';
      return;
    }
    el.innerHTML = data.notifications.map(n => `
      <div class="notif-item ${n.read ? '' : 'unread'}">
        <div class="notif-icon ${n.type}">
          ${n.type === 'new' ? '✅' : n.type === 'drive' ? '🏢' : '🔔'}
        </div>
        <div>
          <div class="notif-msg">${n.message}</div>
          <div class="notif-time">${timeAgo(n.created_at)}</div>
        </div>
      </div>`).join('');
  } catch (e) { console.error(e); }
}

async function loadNotificationCount() {
  try {
    const data = await api('/notifications');
    const unread = data.notifications.filter(n => !n.read).length;
    updateBadge(unread);
  } catch (e) {}
}

function updateBadge(count) {
  ['notif-badge', 'notif-badge-d'].forEach(id => {
    const badge = document.getElementById(id);
    if (!badge) return;
    badge.textContent = count > 9 ? '9+' : count;
    badge.style.display = count > 0 ? 'flex' : 'none';
  });
}

async function markAllRead() {
  try {
    await api('/notifications/read', 'POST');
    updateBadge(0);
    loadNotifications();
  } catch (e) {}
}

// ── Admin ─────────────────────────────────────────────────────────

function loadAdmin() {
  renderAdminTab(currentAdminTab);
}

function switchAdminTab(tab) {
  currentAdminTab = tab;
  document.querySelectorAll('.admin-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.atab === tab);
  });
  renderAdminTab(tab);
}

async function renderAdminTab(tab) {
  const el = document.getElementById('admin-content');
  if (tab === 'reports') {
    try {
      const data = await api('/admin/reports');
      el.innerHTML = `
        <div class="report-grid">
          <div class="report-stat"><div class="rs-num">${data.total_students}</div><div class="rs-label">Total Students</div></div>
          <div class="report-stat"><div class="rs-num">${data.total_applications}</div><div class="rs-label">Applications</div></div>
          <div class="report-stat"><div class="rs-num" style="color:var(--clr-green)">${data.total_selected}</div><div class="rs-label">Selected</div></div>
          <div class="report-stat"><div class="rs-num" style="color:var(--clr-red)">${data.total_rejected}</div><div class="rs-label">Rejected</div></div>
          <div class="report-stat"><div class="rs-num" style="color:var(--clr-amber)">${data.total_drives}</div><div class="rs-label">Drives</div></div>
        </div>`;
    } catch (e) { el.innerHTML = '<p>Error loading reports</p>'; }
  } else if (tab === 'students') {
    try {
      const data = await api('/admin/students');
      el.innerHTML = `<div class="card">
        <table class="students-table">
          <thead><tr>
            <th>Name</th><th>Roll</th><th>Branch</th><th>Applications</th><th>Selected</th>
          </tr></thead>
          <tbody>
            ${data.students.map(s => `<tr>
              <td><strong>${s.name}</strong><br><small style="color:var(--txt-muted)">${s.email}</small></td>
              <td>${s.roll}</td><td>${s.branch}</td>
              <td>${s.total_apps}</td>
              <td><span class="status-badge status-Selected">${s.selected}</span></td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
    } catch (e) { el.innerHTML = '<p>Error loading students</p>'; }
  } else if (tab === 'drives-admin') {
    try {
      const data = await api('/admin/drives');
      el.innerHTML = `
        <div style="margin-bottom:16px">
          <button class="btn-primary" onclick="openDriveModal()"><i class="icon-plus"></i> Add Drive</button>
        </div>
        <div class="drives-list">
          ${data.drives.length ? data.drives.sort((a,b)=>a.date.localeCompare(b.date)).map(d => `
            <div class="drive-card">
              <div class="drive-company">${d.company}</div>
              <div class="drive-role">${d.role}</div>
              <div class="drive-date-badge">📅 ${fmtDate(d.date)}</div>
              <div class="drive-details">
                ${d.location ? `<div class="drive-detail"><i class="icon-map-pin"></i>${d.location}</div>` : ''}
                ${d.package ? `<div class="drive-detail"><i class="icon-indian-rupee"></i>${d.package}</div>` : ''}
              </div>
              <div style="margin-top:12px">
                <button class="btn-danger" onclick="deleteDrive('${d.id}','${d.company}')">
                  <i class="icon-trash-2"></i> Delete
                </button>
              </div>
            </div>`).join('') : '<p style="color:var(--txt-muted)">No drives yet.</p>'}
        </div>`;
    } catch (e) { el.innerHTML = '<p>Error loading drives</p>'; }
  }
}

function openDriveModal() {
  ['d-company','d-role','d-date','d-location','d-package'].forEach(id => {
    document.getElementById(id).value = '';
  });
  clearError('drive-modal-error');
  openModal('drive-modal');
}

async function saveDrive() {
  clearError('drive-modal-error');
  const payload = {
    company: document.getElementById('d-company').value.trim(),
    role: document.getElementById('d-role').value.trim(),
    date: document.getElementById('d-date').value,
    location: document.getElementById('d-location').value.trim(),
    package: document.getElementById('d-package').value.trim()
  };
  if (!payload.company || !payload.role || !payload.date)
    return showError('drive-modal-error', 'Company, role, and date required.');
  try {
    await api('/admin/drives', 'POST', payload);
    closeModal('drive-modal');
    renderAdminTab('drives-admin');
    loadNotificationCount();
  } catch (e) { showError('drive-modal-error', e.message); }
}

async function deleteDrive(id, company) {
  if (!confirm(`Delete drive for ${company}?`)) return;
  try {
    await api('/admin/drives/' + id, 'DELETE');
    renderAdminTab('drives-admin');
  } catch (e) { alert('Failed: ' + e.message); }
}

// ── Export ────────────────────────────────────────────────────────

function exportJSON() {
  const blob = new Blob([JSON.stringify(allApps, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url;
  a.download = 'applications.json'; a.click();
  URL.revokeObjectURL(url);
  closeModal('export-modal');
}

function exportCSV() {
  const headers = ['Company', 'Role', 'Package', 'Status', 'Applied Date', 'Interview Date', 'Deadline', 'Notes'];
  const rows = allApps.map(a => [
    a.company, a.role, a.package || '', a.status,
    fmtDate(a.applied_date), fmtDate(a.interview_date) || '',
    fmtDate(a.deadline) || '', (a.notes || '').replace(/,/g, ';')
  ]);
  const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url;
  a.download = 'applications.csv'; a.click();
  URL.revokeObjectURL(url);
  closeModal('export-modal');
}

// ── Keyboard shortcuts ────────────────────────────────────────────

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
  }
  // Ctrl+Enter to submit login/signup
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    const activeAuth = document.querySelector('.auth-form.active');
    if (activeAuth) {
      activeAuth.id === 'login-form' ? doLogin() : doSignup();
    }
  }
});

// Also allow Enter on auth inputs
document.addEventListener('keypress', e => {
  if (e.key === 'Enter') {
    if (document.querySelector('#login-form.active')) doLogin();
    else if (document.querySelector('#signup-form.active')) doSignup();
  }
});

// ── Boot ──────────────────────────────────────────────────────────

async function boot() {
  loadTheme();
  try {
    const data = await api('/auth/me');
    currentUser = data;
    initApp();
  } catch (e) {
    document.getElementById('auth-screen').style.display = 'flex';
    document.getElementById('app').style.display = 'none';
  }
}

boot();
