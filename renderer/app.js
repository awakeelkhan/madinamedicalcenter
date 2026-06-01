// ─── Global State ────────────────────────────────────────────────────────────
window.App = {
  currentUser: null,
  currentPage: 'dashboard',
  settings: {}
};

// ─── Utility Functions ────────────────────────────────────────────────────────
window.showToast = function(msg, type = 'success') {
  const toast = document.getElementById('appToast');
  const toastMsg = document.getElementById('toastMsg');
  toast.className = `toast align-items-center border-0 text-white bg-${type}`;
  toastMsg.textContent = msg;
  const t = bootstrap.Toast.getOrCreateInstance(toast, { delay: 3000 });
  t.show();
};

window.formatCurrency = function(n) {
  const currency = (App.settings && App.settings.currency) || 'PKR';
  return currency + ' ' + Number(n || 0).toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
};

window.formatDate = function(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

window.today = function() {
  return new Date().toISOString().slice(0, 10);
};

window.confirm2 = function(msg) {
  return window.confirm(msg);
};

window.showModal = function(title, bodyHtml, footerHtml = '') {
  document.getElementById('modalContainer').innerHTML = `
    <div class="modal fade" id="dynModal" tabindex="-1">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">${title}</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">${bodyHtml}</div>
          ${footerHtml ? `<div class="modal-footer">${footerHtml}</div>` : ''}
        </div>
      </div>
    </div>`;
  const m = new bootstrap.Modal(document.getElementById('dynModal'));
  m.show();
  return m;
};

window.showModalLg = function(title, bodyHtml, footerHtml = '') {
  document.getElementById('modalContainer').innerHTML = `
    <div class="modal fade" id="dynModal" tabindex="-1">
      <div class="modal-dialog modal-dialog-centered modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">${title}</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">${bodyHtml}</div>
          ${footerHtml ? `<div class="modal-footer">${footerHtml}</div>` : ''}
        </div>
      </div>
    </div>`;
  const m = new bootstrap.Modal(document.getElementById('dynModal'));
  m.show();
  return m;
};

window.closeModal = function() {
  const el = document.getElementById('dynModal');
  if (el) bootstrap.Modal.getInstance(el)?.hide();
};

// ─── AMC Print Header ─────────────────────────────────────────────────────────
window.amcPrintHeader = function(mode = 'report', subtitle = '') {
  const s       = App.settings || {};
  const rawName = s.pharmacy_name || 'Al Madina Medical Center';
  const clinic  = rawName.replace(/^Madina\b/i, 'Al Madina');
  const address = s.address || 'Batara Buner';
  const phone   = s.phone  || '';

  const badge = (sz) => `<svg xmlns="http://www.w3.org/2000/svg" width="${sz}" height="${sz}" viewBox="0 0 100 100">
    <circle cx="50" cy="50" r="48" fill="#fff" stroke="#c0392b" stroke-width="5"/>
    <circle cx="50" cy="50" r="40" fill="#fff5f5" stroke="#c0392b" stroke-width="1.2"/>
    <rect x="47" y="10" width="6" height="20" rx="2" fill="#c0392b"/>
    <rect x="40" y="17" width="20" height="6" rx="2" fill="#c0392b"/>
    <text x="50" y="58" text-anchor="middle" font-family="Arial Black,Arial" font-size="27" font-weight="900" fill="#c0392b">AMC</text>
    <text x="50" y="70" text-anchor="middle" font-family="Arial,sans-serif" font-size="7" fill="#444">AL MADINA MEDICAL</text>
    <text x="50" y="79" text-anchor="middle" font-family="Arial,sans-serif" font-size="7" fill="#444">&amp; SURGICAL CENTER</text>
    <text x="50" y="88" text-anchor="middle" font-family="Arial,sans-serif" font-size="7" fill="#444">BATARA BUNER</text>
  </svg>`;

  if (mode === 'receipt') {
    return `<div style="text-align:center;padding:0 0 8px;font-family:'Courier New',monospace">
      ${badge(64)}
      <div style="font-size:15px;font-weight:bold;margin-top:4px">${clinic}</div>
      ${address ? `<div style="font-size:11px">${address}</div>` : ''}
      ${phone   ? `<div style="font-size:11px">&#9742; ${phone}</div>` : ''}
      ${subtitle ? `<div style="margin-top:6px;padding:4px 0;border-top:1px dashed #000;border-bottom:1px dashed #000;font-size:13px;font-weight:bold;letter-spacing:1px">${subtitle}</div>` : '<div style="border-top:1px dashed #000;margin-top:6px"></div>'}
    </div>`;
  }

  /* ── A4 / wide report ── */
  const navyCircle = `<div style="display:inline-flex;width:82px;height:82px;border-radius:50%;background:linear-gradient(135deg,#1a2f5e,#2a4a9e);align-items:center;justify-content:center">
    <div style="color:#fff;font-family:Arial,sans-serif;font-size:7.5px;font-weight:700;text-align:center;line-height:1.55;padding:8px">AL MADINA<br/>MEDICAL<br/>CENTER<br/>BATARA<br/>BUNER</div>
  </div>`;

  return `<table width="100%" border="0" cellpadding="0" cellspacing="0" style="border-collapse:collapse">
    <tr>
      <td width="92" valign="middle" align="center">${badge(86)}</td>
      <td valign="middle" align="center" style="padding:4px 12px">
        <div style="font-size:22px;font-weight:900;color:#1a2f5e;letter-spacing:.5px;font-family:Arial,sans-serif">${clinic}</div>
        ${address ? `<div style="font-size:12px;color:#555;margin-top:3px;font-family:Arial,sans-serif">${address}</div>` : ''}
        ${phone   ? `<div style="font-size:12px;color:#555;font-family:Arial,sans-serif">Tel: ${phone}</div>` : ''}
        ${subtitle ? `<div style="margin-top:10px;font-size:15px;font-weight:800;color:#c0392b;letter-spacing:2px;font-family:Arial,sans-serif;text-transform:uppercase;border-top:1px solid #ddd;padding-top:6px">${subtitle}</div>` : ''}
      </td>
      <td width="92" valign="middle" align="center">${navyCircle}</td>
    </tr>
  </table>
  <div style="margin-top:8px;height:6px;background:linear-gradient(90deg,#1a2f5e 0%,#c0392b 50%,#1a2f5e 100%);border-radius:3px"></div>`;
};

// ─── Router ───────────────────────────────────────────────────────────────────
const pages = {
  pos:       { title: 'POS Sale',          render: () => window.POSPage.render() },
  shelf:     { title: 'Shelf / Stock',     render: () => window.ShelfPage.render() },
  finance:   { title: 'Finance',           render: () => window.FinancePage.render() },
  dashboard: { title: 'Dashboard',         render: () => window.DashboardPage.render() },
  sales:     { title: 'Wholesale Invoice', render: () => window.SalesPage.render() },
  purchases: { title: 'Add Stock',         render: () => window.PurchasesPage.render() },
  inventory: { title: 'Inventory',         render: () => window.InventoryPage.render() },
  customers: { title: 'Customers',         render: () => window.CustomersPage.render() },
  suppliers: { title: 'Suppliers',         render: () => window.SuppliersPage.render() },
  reports:   { title: 'Reports',           render: () => window.ReportsPage.render() },
  backup:    { title: 'Backup',            render: () => window.BackupPage.render() },
  settings:  { title: 'Settings',          render: () => window.SettingsPage.render() },
  frontdesk:  { title: 'Front Desk',         render: () => window.FrontDeskPage.render() },
  pathology:  { title: 'Pathology',          render: () => window.PathologyPage.render() },
  sehatcard:  { title: 'Sehat Card (SSP)',   render: () => window.SehatCardPage.render() },
};

function navigate(page) {
  if (!pages[page]) return;
  App.currentPage = page;

  // Update sidebar active state
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });

  document.getElementById('pageTitle').textContent = pages[page].title;

  const content = document.getElementById('page-content');
  content.innerHTML = '<div class="text-center py-5"><i class="fas fa-spinner fa-spin text-muted fa-2x"></i></div>';

  try {
    pages[page].render();
  } catch (err) {
    content.innerHTML = `<div class="alert alert-danger">Error loading page: ${err.message}</div>`;
  }
}

// ─── Init ─────────────────────────────────────────────────────────────────────
async function init() {
  // Load settings
  try {
    App.settings = await window.api.getSettings();
    const name = App.settings.pharmacy_name || 'Pharmacy';
    document.getElementById('sidebarPharmacyName').textContent = name;
    document.title = name;
  } catch(_) {}

  // Update topbar date
  function updateClock() {
    const now = new Date();
    const opts = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
                   hour: '2-digit', minute: '2-digit' };
    document.getElementById('topbarDate').textContent = now.toLocaleDateString('en-GB', opts);
  }
  updateClock();
  setInterval(updateClock, 30000);

  // Set user info from login
  window.api.onSetUser((user) => {
    App.currentUser = user;
    document.getElementById('sidebarUser').textContent = user.username;
    document.getElementById('sidebarRole').textContent = user.role;
  });

  // Sidebar navigation
  document.querySelectorAll('.nav-item').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      navigate(el.dataset.page);
    });
  });

  // Logout
  document.getElementById('logoutBtn').addEventListener('click', () => {
    if (confirm('Are you sure you want to logout?')) {
      window.api.logout();
    }
  });

  // Initial page
  navigate('pos');
}

document.addEventListener('DOMContentLoaded', init);
