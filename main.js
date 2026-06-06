const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const db = require('./database/db');
const appconfig = require('./database/appconfig');

let mainWindow   = null;
let loginWindow  = null;
let licenseWindow = null;

function createLicenseWindow() {
  licenseWindow = new BrowserWindow({
    width: 520, height: 580, resizable: false, center: true, frame: true,
    webPreferences: { nodeIntegration: false, contextIsolation: true, preload: path.join(__dirname, 'preload.js') }
  });
  licenseWindow.loadFile(path.join(__dirname, 'renderer', 'license.html'));
  licenseWindow.setMenuBarVisibility(false);
}

function createLoginWindow() {
  loginWindow = new BrowserWindow({
    width: 480,
    height: 580,
    resizable: false,
    center: true,
    frame: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });
  loginWindow.loadFile(path.join(__dirname, 'renderer', 'login.html'));
  loginWindow.setMenuBarVisibility(false);
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 768,
    minWidth: 1024,
    minHeight: 600,
    center: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });
  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  mainWindow.setMenuBarVisibility(false);
  mainWindow.maximize();
  mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(async () => {
  if (!appconfig.isLicensed()) {
    createLicenseWindow();
  } else {
    await db.init();
    createLoginWindow();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ─── AUTH ───────────────────────────────────────────────────────────────────
ipcMain.handle('login', (e, { username, password }) => db.login(username, password));

ipcMain.on('login-success', (e, user) => {
  createMainWindow();
  mainWindow.webContents.once('did-finish-load', () => {
    mainWindow.webContents.send('set-user', user);
  });
  if (loginWindow) { loginWindow.close(); loginWindow = null; }
});

ipcMain.on('logout', () => {
  createLoginWindow();
  if (mainWindow) { mainWindow.close(); mainWindow = null; }
});

// ─── DASHBOARD ───────────────────────────────────────────────────────────────
ipcMain.handle('get-dashboard-stats', () => db.getDashboardStats());

// ─── MEDICINES ────────────────────────────────────────────────────────────────
ipcMain.handle('get-medicines', (e, search) => db.getMedicines(search));
ipcMain.handle('add-medicine', (e, m) => db.addMedicine(m));
ipcMain.handle('update-medicine', (e, m) => db.updateMedicine(m));
ipcMain.handle('delete-medicine', (e, id) => db.deleteMedicine(id));
ipcMain.handle('search-medicine', (e, q) => db.searchMedicine(q));
ipcMain.handle('get-medicine-batches', (e, medicineId) => db.getMedicineBatches(medicineId));
ipcMain.handle('get-all-batches-with-stock', (e, search) => db.getAllBatchesWithStock(search));

// ─── CUSTOMERS ───────────────────────────────────────────────────────────────
ipcMain.handle('get-customers', (e, search) => db.getCustomers(search));
ipcMain.handle('add-customer', (e, c) => db.addCustomer(c));
ipcMain.handle('update-customer', (e, c) => db.updateCustomer(c));
ipcMain.handle('delete-customer', (e, id) => db.deleteCustomer(id));
ipcMain.handle('get-customer-ledger', (e, id) => db.getCustomerLedger(id));
ipcMain.handle('add-payment', (e, p) => db.addPayment(p));

// ─── SUPPLIERS ────────────────────────────────────────────────────────────────
ipcMain.handle('get-suppliers', (e, search) => db.getSuppliers(search));
ipcMain.handle('add-supplier', (e, s) => db.addSupplier(s));
ipcMain.handle('update-supplier', (e, s) => db.updateSupplier(s));
ipcMain.handle('delete-supplier', (e, id) => db.deleteSupplier(id));

// ─── SALES / INVOICES ────────────────────────────────────────────────────────
ipcMain.handle('save-invoice', (e, data) => db.saveInvoice(data));
ipcMain.handle('get-invoices', (e, filters) => db.getInvoices(filters));
ipcMain.handle('get-invoice-detail', (e, id) => db.getInvoiceDetail(id));

// ─── PURCHASES ───────────────────────────────────────────────────────────────
ipcMain.handle('save-purchase', (e, data) => db.savePurchase(data));
ipcMain.handle('get-purchases', (e, filters) => db.getPurchases(filters));
ipcMain.handle('get-purchase-detail', (e, id) => db.getPurchaseDetail(id));

// ─── REPORTS ─────────────────────────────────────────────────────────────────
ipcMain.handle('report-sales', (e, f) => db.reportSales(f));
ipcMain.handle('report-profit', (e, f) => db.reportProfit(f));
ipcMain.handle('report-expiry', (e, days) => db.reportExpiry(days));
ipcMain.handle('report-customer-balances', () => db.reportCustomerBalances());
ipcMain.handle('report-stock-summary', () => db.reportStockSummary());

// ─── BACKUP ───────────────────────────────────────────────────────────────────
ipcMain.handle('get-drives', () => {
  const drives = [];
  'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').forEach(l => {
    try { if (fs.existsSync(`${l}:\\`)) drives.push({ letter: l, path: `${l}:\\` }); }
    catch (_) {}
  });
  return drives;
});

ipcMain.handle('select-backup-folder', async () => {
  const win = mainWindow || BrowserWindow.getFocusedWindow();
  const result = await dialog.showOpenDialog(win, { properties: ['openDirectory'] });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('do-backup', (e, destDir) => {
  try {
    const src = db.getDbPath();
    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const dest = path.join(destDir, `pharmacy_backup_${ts}.db`);
    fs.copyFileSync(src, dest);
    db.saveBackupInfo(dest);
    return { ok: true, dest };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('get-last-backup', () => db.getLastBackupInfo());

// ─── SETTINGS / USERS ────────────────────────────────────────────────────────
ipcMain.handle('get-users', () => db.getUsers());
ipcMain.handle('add-user', (e, u) => db.addUser(u));
ipcMain.handle('update-user', (e, u) => db.updateUser(u));
ipcMain.handle('delete-user', (e, id) => db.deleteUser(id));
ipcMain.handle('get-settings', () => db.getSettings());
ipcMain.handle('save-settings', (e, s) => db.saveSettings(s));

// ─── POS / RECEIPTS ──────────────────────────────────────────────────────────
ipcMain.handle('save-receipt', (e, data) => db.saveReceipt(data));
ipcMain.handle('get-receipts', (e, filters) => db.getReceipts(filters));
ipcMain.handle('get-receipt-detail', (e, id) => db.getReceiptDetail(id));
ipcMain.handle('get-finance-stats', () => db.getFinanceStats());
ipcMain.handle('get-shelf-view', (e, search) => db.getShelfView(search));
ipcMain.handle('report-retail-sales', (e, f) => db.reportRetailSales(f));
ipcMain.handle('report-top-medicines', (e, f) => db.reportTopMedicines(f));
ipcMain.handle('report-retail-summary', () => db.reportRetailSummary());

// ─── FRONT DESK ──────────────────────────────────────────────────────────────
ipcMain.handle('fd-get-doctors',    ()       => db.fdGetDoctors());
ipcMain.handle('fd-add-doctor',     (e, d)   => db.fdAddDoctor(d));
ipcMain.handle('fd-update-doctor',  (e, d)   => db.fdUpdateDoctor(d));
ipcMain.handle('fd-delete-doctor',  (e, id)  => db.fdDeleteDoctor(id));
ipcMain.handle('fd-get-lab-tests',  ()       => db.fdGetLabTests());
ipcMain.handle('fd-add-lab-test',   (e, t)   => db.fdAddLabTest(t));
ipcMain.handle('fd-update-lab-test',(e, t)   => db.fdUpdateLabTest(t));
ipcMain.handle('fd-delete-lab-test',(e, id)  => db.fdDeleteLabTest(id));
ipcMain.handle('fd-save-visit',     (e, d)   => db.fdSaveVisit(d));
ipcMain.handle('fd-get-visits',     (e, f)   => db.fdGetVisits(f));
ipcMain.handle('fd-get-visit-detail',   (e, id) => db.fdGetVisitDetail(id));
ipcMain.handle('fd-report-summary',     (e, f)  => db.fdReportSummary(f));
ipcMain.handle('fd-report-daily',       (e, d)  => db.fdReportDaily(d));
ipcMain.handle('fd-report-doctors',     (e, f)  => db.fdReportDoctors(f));
ipcMain.handle('fd-report-lab-tests',   (e, f)  => db.fdReportLabTests(f));
ipcMain.handle('fd-report-monthly',       (e, ym) => db.fdReportMonthly(ym));
ipcMain.handle('patho-search-visits',     (e, q)  => db.pathoSearchVisits(q));
ipcMain.handle('patho-get-visit-tests',   (e, id) => db.pathoGetVisitTests(id));
ipcMain.handle('patho-get-results',       (e, id) => db.pathoGetResults(id));
ipcMain.handle('patho-save-results',      (e, d)  => db.pathoSaveResults(d.visitId, d.patient, d.rows));
ipcMain.handle('patho-get-recent',        ()      => db.pathoGetRecentResults(30));
ipcMain.handle('patho-get-catalog',       ()      => db.pathoGetCatalogDefaults());
// Sehat Card
ipcMain.handle('sc-search-patients',  (e,q)   => db.scSearchPatients(q));
ipcMain.handle('sc-get-patient',      (e,id)  => db.scGetPatient(id));
ipcMain.handle('sc-save-patient',     (e,d)   => db.scSavePatient(d));
ipcMain.handle('sc-delete-patient',   (e,id)  => db.scDeletePatient(id));
ipcMain.handle('sc-get-procedures',   ()      => db.scGetProcedures());
ipcMain.handle('sc-add-procedure',    (e,d)   => db.scAddProcedure(d));
ipcMain.handle('sc-update-procedure', (e,d)   => db.scUpdateProcedure(d));
ipcMain.handle('sc-delete-procedure', (e,id)  => db.scDeleteProcedure(id));
ipcMain.handle('sc-save-visit',       (e,d)   => db.scSaveVisit(d));
ipcMain.handle('sc-get-visit',        (e,id)  => db.scGetVisit(id));
ipcMain.handle('sc-get-visit-by-pnt', (e,id)  => db.scGetVisitByPatient(id));
ipcMain.handle('sc-get-recent',       ()      => db.scGetRecentVisits(50));
ipcMain.handle('sc-get-entries',      (e,id)  => db.scGetEntries(id));
ipcMain.handle('sc-add-entry',        (e,d)   => db.scAddEntry(d));
ipcMain.handle('sc-update-entry',     (e,d)   => db.scUpdateEntry(d));
ipcMain.handle('sc-delete-entry',     (e,id)  => db.scDeleteEntry(id));

// ─── PRINT ───────────────────────────────────────────────────────────────────
ipcMain.handle('print-window', async () => {
  if (mainWindow) {
    mainWindow.webContents.print({ silent: false, printBackground: true });
  }
  return true;
});

// ─── LICENSE ─────────────────────────────────────────────────────────────────
ipcMain.handle('get-install-id', () => appconfig.getInstallId());

ipcMain.handle('activate-license', async (e, key) => {
  appconfig.saveLicense(key);
  if (appconfig.isLicensed()) {
    await db.init();
    createLoginWindow();
    if (licenseWindow) { licenseWindow.close(); licenseWindow = null; }
    return { ok: true };
  }
  return { ok: false, error: 'Invalid license key. Contact HyperCloud.pk.' };
});

// ─── DB PATH (network share config) ─────────────────────────────────────────
ipcMain.handle('get-db-path', () => ({ current: appconfig.getDbPath() || db.getDbPath() }));

ipcMain.handle('set-db-path', (e, newPath) => {
  appconfig.saveDbPath(newPath || '');
  return { ok: true };
});

ipcMain.handle('select-db-path', async () => {
  const win = mainWindow || BrowserWindow.getFocusedWindow();
  const result = await dialog.showOpenDialog(win, {
    title: 'Select or create pharmacy.db location',
    properties: ['openFile', 'showHiddenFiles'],
    filters: [{ name: 'SQLite Database', extensions: ['db'] }]
  });
  return result.canceled ? null : result.filePaths[0];
});
