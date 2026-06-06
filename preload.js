const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Auth
  login: (creds) => ipcRenderer.invoke('login', creds),
  loginSuccess: (user) => ipcRenderer.send('login-success', user),
  logout: () => ipcRenderer.send('logout'),
  onSetUser: (cb) => ipcRenderer.on('set-user', (e, user) => cb(user)),

  // Dashboard
  getDashboardStats: () => ipcRenderer.invoke('get-dashboard-stats'),

  // Medicines / Inventory
  getMedicines: (search) => ipcRenderer.invoke('get-medicines', search),
  addMedicine: (m) => ipcRenderer.invoke('add-medicine', m),
  updateMedicine: (m) => ipcRenderer.invoke('update-medicine', m),
  deleteMedicine: (id) => ipcRenderer.invoke('delete-medicine', id),
  searchMedicine: (q) => ipcRenderer.invoke('search-medicine', q),
  getMedicineBatches: (id) => ipcRenderer.invoke('get-medicine-batches', id),
  getAllBatchesWithStock: (search) => ipcRenderer.invoke('get-all-batches-with-stock', search),

  // Customers
  getCustomers: (search) => ipcRenderer.invoke('get-customers', search),
  addCustomer: (c) => ipcRenderer.invoke('add-customer', c),
  updateCustomer: (c) => ipcRenderer.invoke('update-customer', c),
  deleteCustomer: (id) => ipcRenderer.invoke('delete-customer', id),
  getCustomerLedger: (id) => ipcRenderer.invoke('get-customer-ledger', id),
  addPayment: (p) => ipcRenderer.invoke('add-payment', p),

  // Suppliers
  getSuppliers: (search) => ipcRenderer.invoke('get-suppliers', search),
  addSupplier: (s) => ipcRenderer.invoke('add-supplier', s),
  updateSupplier: (s) => ipcRenderer.invoke('update-supplier', s),
  deleteSupplier: (id) => ipcRenderer.invoke('delete-supplier', id),

  // Sales
  saveInvoice: (data) => ipcRenderer.invoke('save-invoice', data),
  getInvoices: (filters) => ipcRenderer.invoke('get-invoices', filters),
  getInvoiceDetail: (id) => ipcRenderer.invoke('get-invoice-detail', id),

  // Purchases
  savePurchase: (data) => ipcRenderer.invoke('save-purchase', data),
  getPurchases: (filters) => ipcRenderer.invoke('get-purchases', filters),
  getPurchaseDetail: (id) => ipcRenderer.invoke('get-purchase-detail', id),

  // Reports
  reportSales: (f) => ipcRenderer.invoke('report-sales', f),
  reportProfit: (f) => ipcRenderer.invoke('report-profit', f),
  reportExpiry: (days) => ipcRenderer.invoke('report-expiry', days),
  reportCustomerBalances: () => ipcRenderer.invoke('report-customer-balances'),
  reportStockSummary: () => ipcRenderer.invoke('report-stock-summary'),

  // Backup
  getDrives: () => ipcRenderer.invoke('get-drives'),
  selectBackupFolder: () => ipcRenderer.invoke('select-backup-folder'),
  doBackup: (dest) => ipcRenderer.invoke('do-backup', dest),
  getLastBackup: () => ipcRenderer.invoke('get-last-backup'),

  // Settings / Users
  getUsers: () => ipcRenderer.invoke('get-users'),
  addUser: (u) => ipcRenderer.invoke('add-user', u),
  updateUser: (u) => ipcRenderer.invoke('update-user', u),
  deleteUser: (id) => ipcRenderer.invoke('delete-user', id),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (s) => ipcRenderer.invoke('save-settings', s),

  // POS / Receipts
  saveReceipt: (data) => ipcRenderer.invoke('save-receipt', data),
  getReceipts: (filters) => ipcRenderer.invoke('get-receipts', filters),
  getReceiptDetail: (id) => ipcRenderer.invoke('get-receipt-detail', id),
  getFinanceStats: () => ipcRenderer.invoke('get-finance-stats'),
  getShelfView: (search) => ipcRenderer.invoke('get-shelf-view', search),

  // Retail Reports
  reportRetailSales: (f) => ipcRenderer.invoke('report-retail-sales', f),
  reportTopMedicines: (f) => ipcRenderer.invoke('report-top-medicines', f),
  reportRetailSummary: () => ipcRenderer.invoke('report-retail-summary'),

  // Front Desk
  fdGetDoctors:     ()      => ipcRenderer.invoke('fd-get-doctors'),
  fdAddDoctor:      (d)     => ipcRenderer.invoke('fd-add-doctor', d),
  fdUpdateDoctor:   (d)     => ipcRenderer.invoke('fd-update-doctor', d),
  fdDeleteDoctor:   (id)    => ipcRenderer.invoke('fd-delete-doctor', id),
  fdGetLabTests:    ()      => ipcRenderer.invoke('fd-get-lab-tests'),
  fdAddLabTest:     (t)     => ipcRenderer.invoke('fd-add-lab-test', t),
  fdUpdateLabTest:  (t)     => ipcRenderer.invoke('fd-update-lab-test', t),
  fdDeleteLabTest:  (id)    => ipcRenderer.invoke('fd-delete-lab-test', id),
  fdSaveVisit:        (d)  => ipcRenderer.invoke('fd-save-visit', d),
  fdGetVisits:        (f)  => ipcRenderer.invoke('fd-get-visits', f),
  fdGetVisitDetail:   (id) => ipcRenderer.invoke('fd-get-visit-detail', id),
  fdReportSummary:    (f)  => ipcRenderer.invoke('fd-report-summary', f),
  fdReportDaily:      (d)  => ipcRenderer.invoke('fd-report-daily', d),
  fdReportDoctors:    (f)  => ipcRenderer.invoke('fd-report-doctors', f),
  fdReportLabTests:   (f)  => ipcRenderer.invoke('fd-report-lab-tests', f),
  fdReportMonthly:      (ym) => ipcRenderer.invoke('fd-report-monthly', ym),
  pathoSearchVisits:    (q)  => ipcRenderer.invoke('patho-search-visits', q),
  pathoGetVisitTests:   (id) => ipcRenderer.invoke('patho-get-visit-tests', id),
  pathoGetResults:      (id) => ipcRenderer.invoke('patho-get-results', id),
  pathoSaveResults:     (d)  => ipcRenderer.invoke('patho-save-results', d),
  pathoGetRecent:       ()   => ipcRenderer.invoke('patho-get-recent'),
  pathoGetCatalog:      ()   => ipcRenderer.invoke('patho-get-catalog'),
  // Sehat Card
  scSearchPatients:  (q)  => ipcRenderer.invoke('sc-search-patients', q),
  scGetPatient:      (id) => ipcRenderer.invoke('sc-get-patient', id),
  scSavePatient:     (d)  => ipcRenderer.invoke('sc-save-patient', d),
  scDeletePatient:   (id) => ipcRenderer.invoke('sc-delete-patient', id),
  scGetProcedures:   ()   => ipcRenderer.invoke('sc-get-procedures'),
  scAddProcedure:    (d)  => ipcRenderer.invoke('sc-add-procedure', d),
  scUpdateProcedure: (d)  => ipcRenderer.invoke('sc-update-procedure', d),
  scDeleteProcedure: (id) => ipcRenderer.invoke('sc-delete-procedure', id),
  scSaveVisit:       (d)  => ipcRenderer.invoke('sc-save-visit', d),
  scGetVisit:        (id) => ipcRenderer.invoke('sc-get-visit', id),
  scGetVisitByPnt:   (id) => ipcRenderer.invoke('sc-get-visit-by-pnt', id),
  scGetRecent:       ()   => ipcRenderer.invoke('sc-get-recent'),
  scGetEntries:      (id) => ipcRenderer.invoke('sc-get-entries', id),
  scAddEntry:        (d)  => ipcRenderer.invoke('sc-add-entry', d),
  scUpdateEntry:     (d)  => ipcRenderer.invoke('sc-update-entry', d),
  scDeleteEntry:     (id) => ipcRenderer.invoke('sc-delete-entry', id),

  // Print
  printWindow: () => ipcRenderer.invoke('print-window'),

  // Labour Room
  lrGetAdmissions:  (f)    => ipcRenderer.invoke('lr-get-admissions', f),
  lrGetAdmission:   (id)   => ipcRenderer.invoke('lr-get-admission', id),
  lrSaveAdmission:  (d)    => ipcRenderer.invoke('lr-save-admission', d),
  lrDeleteAdmission:(id)   => ipcRenderer.invoke('lr-delete-admission', id),
  lrSaveDelivery:   (d)    => ipcRenderer.invoke('lr-save-delivery', d),
  lrGetDelivery:    (id)   => ipcRenderer.invoke('lr-get-delivery', id),
  lrGetStats:       (f, t) => ipcRenderer.invoke('lr-get-stats', f, t),

  // Logo / Branding
  selectLogoFile:  ()        => ipcRenderer.invoke('select-logo-file'),
  readFileBase64:  (filePath) => ipcRenderer.invoke('read-file-base64', filePath),

  // License
  getInstallId:    ()    => ipcRenderer.invoke('get-install-id'),
  activateLicense: (key) => ipcRenderer.invoke('activate-license', key),

  // DB Path (admin — network share)
  getDbPath:    ()    => ipcRenderer.invoke('get-db-path'),
  setDbPath:    (p)   => ipcRenderer.invoke('set-db-path', p),
  selectDbPath: ()    => ipcRenderer.invoke('select-db-path'),
});
