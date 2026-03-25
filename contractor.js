/* ============================================================
   CONTRACTOR PORTAL — Universal JavaScript v2.0
   Database-ready with full API layer, theme system & more
   ============================================================ */

/* ─── CONFIG ─────────────────────────────────────────────── */
const CONFIG = {
  apiBase: '/api',           // ← Replace with your actual API base URL
  version: '2.0.0',
  pages: {
    dashboard: 'contractor_dashboard.html',
    bookings:  'contractor_bookings.html',
    messages:  'contractor_messages.html',
    calendar:  'contractor_calendar.html',
    profile:   'contractor_profile.html',
    settings:  'contractor_settings.html',
  },
  /*
   DB Connection info lives SERVER-SIDE only (never expose here).
   Example Node.js / PHP backend setup:
   POST /api/contractor/login    → returns JWT token
   GET  /api/contractor/me       → returns logged-in user
   PUT  /api/contractor/profile  → update profile
   POST /api/contractor/otp/*    → OTP verification
  */
};

/* ─── STATE ──────────────────────────────────────────────── */
const State = {
  sidebar: {
    collapsed:  localStorage.getItem('sidebarCollapsed') === 'true',
    mobileOpen: false,
  },
  user:        null,
  theme:       localStorage.getItem('portalTheme') || 'dark',
  currentPage: '',
  otpPending:  {},
};

/* ─── DOM READY ─────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  applyTheme(State.theme, false);
  initSidebar();
  initUser();
  initHeaderDate();
  initToastContainer();
  markActivePage();
  initModalClose();
  initThemeToggle();
});

/* ─── THEME SYSTEM ────────────────────────────────────────── */
function applyTheme(theme, save = true) {
  State.theme = theme;
  document.documentElement.setAttribute('data-theme', theme);
  // Update toggle icons
  const btns = document.querySelectorAll('.theme-toggle-btn');
  btns.forEach(btn => { btn.textContent = theme === 'dark' ? '☀️' : '🌙'; });
  if (save) localStorage.setItem('portalTheme', theme);
}

function toggleTheme() {
  const next = State.theme === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  showToast(`Switched to ${next} mode`, 'info', 2000);
}

function initThemeToggle() {
  document.querySelectorAll('.theme-toggle-btn').forEach(btn => {
    btn.addEventListener('click', toggleTheme);
    btn.textContent = State.theme === 'dark' ? '☀️' : '🌙';
  });
}

/* ─── SIDEBAR ────────────────────────────────────────────── */
function initSidebar() {
  const sidebar    = document.getElementById('sidebar');
  const main       = document.getElementById('mainContent');
  const toggleBtn  = document.getElementById('sidebarToggle');
  const overlay    = document.getElementById('sidebarOverlay');
  const mobileBtn  = document.getElementById('mobileMenuBtn');

  if (!sidebar) return;

  if (State.sidebar.collapsed && window.innerWidth > 768) {
    sidebar.classList.add('collapsed');
    main && main.classList.add('expanded');
  }

  toggleBtn && toggleBtn.addEventListener('click', () => {
    if (window.innerWidth <= 768) openMobileSidebar();
    else toggleDesktopSidebar();
  });

  mobileBtn && mobileBtn.addEventListener('click', openMobileSidebar);
  overlay   && overlay.addEventListener('click', closeMobileSidebar);

  window.addEventListener('resize', () => {
    if (window.innerWidth > 768) closeMobileSidebar();
  });
}

function toggleDesktopSidebar() {
  const sidebar = document.getElementById('sidebar');
  const main    = document.getElementById('mainContent');
  if (!sidebar) return;
  sidebar.classList.toggle('collapsed');
  main && main.classList.toggle('expanded');
  State.sidebar.collapsed = sidebar.classList.contains('collapsed');
  localStorage.setItem('sidebarCollapsed', State.sidebar.collapsed);
}

function openMobileSidebar() {
  document.getElementById('sidebar')?.classList.add('mobile-open');
  document.getElementById('sidebarOverlay')?.classList.add('visible');
  State.sidebar.mobileOpen = true;
}

function closeMobileSidebar() {
  document.getElementById('sidebar')?.classList.remove('mobile-open');
  document.getElementById('sidebarOverlay')?.classList.remove('visible');
  State.sidebar.mobileOpen = false;
}

/* ─── USER INIT ──────────────────────────────────────────── */
async function initUser() {
  const cached = localStorage.getItem('contractorUser');
  if (cached) {
    try {
      State.user = JSON.parse(cached);
      renderUserInSidebar(State.user);
      return;
    } catch(_) {}
  }

  try {
    const res  = await apiGet('/contractor/me');
    State.user = res.data;
    localStorage.setItem('contractorUser', JSON.stringify(State.user));
    renderUserInSidebar(State.user);
  } catch(e) {
    // Demo fallback
    State.user = {
      id:       1,
      name:     'Juan dela Cruz',
      role:     'Contractor',
      email:    'juan@example.com',
      phone:    '+63 912 345 6789',
      address:  '123 Rizal St, Manila',
      avatar:   null,
      initials: 'JD',
      verified: { email: true, phone: false },
    };
    renderUserInSidebar(State.user);
  }
}

function renderUserInSidebar(user) {
  const nameEl    = document.getElementById('sidebarUserName');
  const roleEl    = document.getElementById('sidebarUserRole');
  const avatarEl  = document.getElementById('sidebarAvatar');
  const fallback  = document.getElementById('sidebarAvatarFallback');
  const headerName= document.getElementById('headerUserName');

  if (nameEl) nameEl.textContent = user.name;
  if (roleEl) roleEl.textContent = user.role;
  if (headerName) headerName.textContent = user.name.split(' ')[0];

  const initials = user.initials
    || (user.name || '').split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2);

  if (user.avatar) {
    avatarEl && (avatarEl.src = user.avatar, avatarEl.style.display = 'block');
    fallback && (fallback.style.display = 'none');
  } else {
    avatarEl && (avatarEl.style.display = 'none');
    if (fallback) { fallback.style.display = 'flex'; fallback.textContent = initials; }
  }
}

/* ─── ACTIVE PAGE ────────────────────────────────────────── */
function markActivePage() {
  const path = window.location.pathname.split('/').pop();
  document.querySelectorAll('.nav-item[data-page]').forEach(item => {
    item.classList.toggle('active', item.dataset.page === path);
  });
  State.currentPage = path;
}

/* ─── HEADER DATE ────────────────────────────────────────── */
function initHeaderDate() {
  ['headerDate','headerDateChip'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = new Date().toLocaleDateString('en-PH', {
      weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
    });
  });
}

/* ─── TOAST SYSTEM ───────────────────────────────────────── */
function initToastContainer() {
  if (!document.getElementById('toast-container')) {
    const c = document.createElement('div');
    c.id = 'toast-container';
    document.body.appendChild(c);
  }
}

function showToast(message, type = 'info', duration = 3500) {
  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || icons.info}</span>
    <span class="toast-msg">${message}</span>
  `;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity   = '0';
    toast.style.transform = 'translateX(30px)';
    toast.style.transition = '0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

/* ─── MODAL SYSTEM ───────────────────────────────────────── */
function openModal(modalId) {
  const m = document.getElementById(modalId);
  if (m) { m.classList.add('open'); document.body.style.overflow = 'hidden'; }
}

function closeModal(modalId) {
  const m = document.getElementById(modalId);
  if (m) { m.classList.remove('open'); document.body.style.overflow = ''; }
}

function initModalClose() {
  document.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', () => closeModal(btn.dataset.closeModal));
  });
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) {
        overlay.classList.remove('open');
        document.body.style.overflow = '';
      }
    });
  });
}

/* ─── API HELPERS ────────────────────────────────────────── */
/*
 These helpers are database-ready.
 Point CONFIG.apiBase to your backend (Node/Express, PHP, etc.)

 DB Schema example (MySQL/PostgreSQL):
 ────────────────────────────────────
 Table: contractors
   id          BIGINT PRIMARY KEY AUTO_INCREMENT
   name        VARCHAR(120) NOT NULL
   email       VARCHAR(120) UNIQUE NOT NULL
   phone       VARCHAR(30)
   address     TEXT
   avatar_url  VARCHAR(255)
   role        VARCHAR(50) DEFAULT 'Contractor'
   verified    JSON         -- {email: bool, phone: bool}
   settings    JSON         -- {darkMode, notifications, ...}
   created_at  DATETIME DEFAULT NOW()

 Table: bookings
   id          BIGINT PRIMARY KEY AUTO_INCREMENT
   contractor_id BIGINT FK→contractors
   customer_name VARCHAR(120)
   service_type  VARCHAR(80)
   scheduled_at  DATETIME
   address       TEXT
   amount        DECIMAL(10,2)
   status        ENUM('pending','active','completed','cancelled')
   notes         TEXT
   created_at    DATETIME DEFAULT NOW()

 Table: messages
   id            BIGINT PRIMARY KEY AUTO_INCREMENT
   conversation_id BIGINT FK→conversations
   sender_type   ENUM('contractor','customer')
   sender_id     BIGINT
   body          TEXT NOT NULL
   read_at       DATETIME
   sent_at       DATETIME DEFAULT NOW()

 Table: calendar_events
   id          BIGINT PRIMARY KEY AUTO_INCREMENT
   contractor_id BIGINT FK→contractors
   title       VARCHAR(120)
   client      VARCHAR(120)
   service_type VARCHAR(60)
   event_date  DATE
   event_time  TIME
   duration_hrs DECIMAL(4,1)
   status      ENUM('pending','confirmed','completed','cancelled')
   location    VARCHAR(200)
   notes       TEXT
   created_at  DATETIME DEFAULT NOW()
*/

async function apiGet(endpoint, params = {}) {
  const url = new URL(`${CONFIG.apiBase}${endpoint}`, window.location.origin);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url, {
    method:  'GET',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
    credentials: 'include',
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

async function apiPost(endpoint, data) {
  const res = await fetch(`${CONFIG.apiBase}${endpoint}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

async function apiPut(endpoint, data) {
  const res = await fetch(`${CONFIG.apiBase}${endpoint}`, {
    method:  'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

async function apiDelete(endpoint) {
  const res = await fetch(`${CONFIG.apiBase}${endpoint}`, {
    method:  'DELETE',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
    credentials: 'include',
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

async function apiUpload(endpoint, formData) {
  const res = await fetch(`${CONFIG.apiBase}${endpoint}`, {
    method:  'POST',
    headers: { 'Authorization': `Bearer ${getToken()}` },
    credentials: 'include',
    body: formData,
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

function getToken() {
  return localStorage.getItem('contractorToken')
    || sessionStorage.getItem('contractorToken') || '';
}

function setToken(token, remember = true) {
  if (remember) localStorage.setItem('contractorToken', token);
  else sessionStorage.setItem('contractorToken', token);
}

/* ─── OTP / VERIFICATION ─────────────────────────────────── */
async function sendEmailOTP(email) {
  try {
    await apiPost('/contractor/otp/email', { email });
    showToast(`Verification code sent to ${email}`, 'success');
    return true;
  } catch(e) {
    showToast('Failed to send email verification', 'error');
    return false;
  }
}

async function sendPhoneOTP(phone) {
  try {
    await apiPost('/contractor/otp/phone', { phone });
    showToast(`SMS code sent to ${phone}`, 'success');
    return true;
  } catch(e) {
    showToast('Failed to send SMS verification', 'error');
    return false;
  }
}

async function verifyOTP(type, code, value) {
  try {
    const res = await apiPost('/contractor/otp/verify', { type, code, value });
    return res.success;
  } catch(e) { return false; }
}

/* ─── OTP COUNTDOWN ──────────────────────────────────────── */
function startOTPCountdown(elementId, seconds = 60, onEnd) {
  const el = document.getElementById(elementId);
  if (!el) return;
  let remaining = seconds;
  el.textContent   = `Resend in ${remaining}s`;
  el.style.pointerEvents = 'none';
  el.style.opacity = '0.5';
  const interval = setInterval(() => {
    remaining--;
    el.textContent = `Resend in ${remaining}s`;
    if (remaining <= 0) {
      clearInterval(interval);
      el.textContent   = 'Resend Code';
      el.style.pointerEvents = '';
      el.style.opacity = '';
      onEnd && onEnd();
    }
  }, 1000);
}

/* ─── LOGOUT ─────────────────────────────────────────────── */
function handleLogout(e) {
  if (e) e.preventDefault();
  // Use modal if this page has one, otherwise fall back to confirm()
  if (document.getElementById('logoutModal')) {
    openModal('logoutModal');
  } else {
    if (confirm('Are you sure you want to log out?')) confirmLogout();
  }
}

function confirmLogout() {
  localStorage.removeItem('contractorUser');
  localStorage.removeItem('contractorToken');
  sessionStorage.clear();
  window.location.href = 'login.html';
}

/* ─── FORMAT HELPERS ─────────────────────────────────────── */
function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-PH', { year:'numeric', month:'short', day:'numeric' });
}
function formatTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleTimeString('en-PH', { hour:'2-digit', minute:'2-digit' });
}
function formatTime12(t) {
  const [h, m] = t.split(':').map(Number);
  const p = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2,'0')} ${p}`;
}
function formatRelativeTime(d) {
  if (!d) return '';
  const diff = Math.floor((Date.now() - new Date(d)) / 1000);
  if (diff < 60)    return 'Just now';
  if (diff < 3600)  return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
  return formatDate(d);
}
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-PH', { style:'currency', currency:'PHP' }).format(amount);
}
function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str; return d.innerHTML;
}
function debounce(fn, delay = 300) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
}

/* ─── AVATAR UPLOAD PREVIEW ──────────────────────────────── */
function setupAvatarUpload(inputId, previewId) {
  const input   = document.getElementById(inputId);
  const preview = document.getElementById(previewId);
  if (!input || !preview) return;
  input.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { showToast('Image must be under 5MB', 'error'); return; }
    if (!file.type.startsWith('image/')) { showToast('Please select an image file', 'error'); return; }
    const reader = new FileReader();
    reader.onload = ev => { preview.src = ev.target.result; };
    reader.readAsDataURL(file);
  });
}

/* ─── TABS ───────────────────────────────────────────────── */
function initTabs(wrapperSelector) {
  document.querySelectorAll(wrapperSelector).forEach(wrapper => {
    const tabs   = wrapper.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const target = tab.dataset.tab;
        document.querySelectorAll('.tab-panel').forEach(p => {
          p.classList.toggle('active', p.id === target);
        });
      });
    });
  });
}

/* ─── AUTO-RESIZE TEXTAREA ───────────────────────────────── */
function autoResizeTextarea(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 140) + 'px';
}

/* ─── CSV EXPORT HELPER ──────────────────────────────────── */
function exportToCSV(rows, filename = 'export.csv') {
  const csv  = rows.map(row => row.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

/* ─── GLOBAL EXPORT ──────────────────────────────────────── */
window.ContractorPortal = {
  CONFIG, State,
  applyTheme, toggleTheme,
  toggleDesktopSidebar, openMobileSidebar, closeMobileSidebar,
  showToast, openModal, closeModal, initModalClose,
  apiGet, apiPost, apiPut, apiDelete, apiUpload,
  sendEmailOTP, sendPhoneOTP, verifyOTP,
  handleLogout, confirmLogout,
  formatDate, formatTime, formatTime12,
  formatRelativeTime, formatCurrency, escapeHtml,
  setupAvatarUpload, startOTPCountdown, debounce,
  initTabs, autoResizeTextarea, exportToCSV,
};
