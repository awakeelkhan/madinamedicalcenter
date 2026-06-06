// database/db.js — sql.js (pure JS/WASM SQLite, no native build needed)
const path = require('path');
const fs = require('fs');
const { app } = require('electron');
const crypto = require('crypto');

let db = null;
let dbPath = null;

function getDbPath() { return dbPath; }
function hash(str) { return crypto.createHash('sha256').update(str).digest('hex'); }

// ─── Core Helpers ─────────────────────────────────────────────────────────────
function _toObjects(results) {
  if (!results || !results.length) return [];
  const { columns, values } = results[0];
  return values.map(row => Object.fromEntries(columns.map((c, i) => [c, row[i]])));
}

function all(sql, params = []) {
  try {
    const results = db.exec(sql, params);
    return _toObjects(results);
  } catch (e) { throw e; }
}

function get(sql, params = []) {
  return all(sql, params)[0] || null;
}

function run(sql, params = []) {
  db.run(sql, params);
  const row = get('SELECT last_insert_rowid() as id');
  return row ? row.id : null;
}

function persist() {
  if (!db || !dbPath) return;
  try {
    const data = db.export();
    fs.writeFileSync(dbPath, Buffer.from(data));
  } catch(e) { console.error('persist error:', e); }
}

function transaction(fn) {
  db.run('BEGIN TRANSACTION');
  try {
    const result = fn();
    db.run('COMMIT');
    persist();
    return result;
  } catch (e) {
    try { db.run('ROLLBACK'); } catch(_) {}
    throw e;
  }
}

// ─── Init ─────────────────────────────────────────────────────────────────────
async function init() {
  const initSqlJs = require('sql.js');
  const SQL = await initSqlJs({
    locateFile: file => {
      if (app.isPackaged) {
        return path.join(
          process.resourcesPath,
          'app.asar.unpacked', 'node_modules', 'sql.js', 'dist', file
        );
      }
      return path.join(__dirname, '..', 'node_modules', 'sql.js', 'dist', file);
    }
  });

  const appconfig = require('./appconfig');
  const configuredPath = appconfig.getDbPath();
  if (configuredPath) {
    const dir = path.dirname(configuredPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    dbPath = configuredPath;
  } else {
    const portableDir = process.env.PORTABLE_EXECUTABLE_DIR;
    if (portableDir) {
      const dataDir = path.join(portableDir, 'AlMadina-data');
      if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
      dbPath = path.join(dataDir, 'pharmacy.db');
    } else {
      dbPath = path.join(app.getPath('userData'), 'pharmacy.db');
    }
  }

  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  db.run('PRAGMA foreign_keys = ON');

  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'operator',
    created_at TEXT DEFAULT (datetime('now','localtime'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS medicines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    generic_name TEXT DEFAULT '',
    manufacturer TEXT DEFAULT '',
    category TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now','localtime'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS batches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    medicine_id INTEGER NOT NULL,
    medicine_name TEXT NOT NULL,
    batch_no TEXT NOT NULL,
    expiry_date TEXT NOT NULL,
    purchase_price REAL NOT NULL DEFAULT 0,
    sale_price REAL NOT NULL DEFAULT 0,
    quantity INTEGER NOT NULL DEFAULT 0
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS suppliers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT DEFAULT '',
    address TEXT DEFAULT '',
    balance REAL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT DEFAULT '',
    address TEXT DEFAULT '',
    balance REAL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_no TEXT UNIQUE NOT NULL,
    customer_id INTEGER NOT NULL,
    customer_name TEXT NOT NULL,
    date TEXT NOT NULL,
    subtotal REAL NOT NULL DEFAULT 0,
    discount REAL NOT NULL DEFAULT 0,
    total REAL NOT NULL DEFAULT 0,
    paid REAL NOT NULL DEFAULT 0,
    remaining REAL NOT NULL DEFAULT 0,
    created_by INTEGER,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS invoice_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_id INTEGER NOT NULL,
    medicine_id INTEGER,
    batch_id INTEGER,
    medicine_name TEXT NOT NULL,
    batch_no TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    price REAL NOT NULL,
    total REAL NOT NULL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS purchases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    purchase_no TEXT UNIQUE NOT NULL,
    supplier_id INTEGER,
    supplier_name TEXT NOT NULL,
    date TEXT NOT NULL,
    total_cost REAL NOT NULL DEFAULT 0,
    created_by INTEGER,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS purchase_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    purchase_id INTEGER NOT NULL,
    medicine_id INTEGER,
    batch_id INTEGER,
    medicine_name TEXT NOT NULL,
    batch_no TEXT NOT NULL,
    expiry_date TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    cost_price REAL NOT NULL,
    total REAL NOT NULL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS ledger (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    type TEXT NOT NULL,
    ref_no TEXT DEFAULT '',
    debit REAL DEFAULT 0,
    credit REAL DEFAULT 0,
    balance REAL DEFAULT 0,
    note TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now','localtime'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS receipts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    receipt_no TEXT UNIQUE NOT NULL,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    subtotal REAL NOT NULL DEFAULT 0,
    discount REAL NOT NULL DEFAULT 0,
    total REAL NOT NULL DEFAULT 0,
    cash_paid REAL NOT NULL DEFAULT 0,
    change_amount REAL NOT NULL DEFAULT 0,
    created_by INTEGER,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS receipt_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    receipt_id INTEGER NOT NULL,
    medicine_id INTEGER,
    batch_id INTEGER,
    medicine_name TEXT NOT NULL,
    batch_no TEXT DEFAULT '',
    quantity INTEGER NOT NULL,
    price REAL NOT NULL,
    total REAL NOT NULL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS backup_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    path TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  )`);

  // Seed admin
  const adminExists = get('SELECT id FROM users WHERE username = ?', ['admin']);
  if (!adminExists) {
    run('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', ['admin', hash('admin123'), 'admin']);
  }

  // Seed default settings
  const defaults = { pharmacy_name: 'Madina Pharmacy', address: '', phone: '', currency: 'PKR' };
  Object.keys(defaults).forEach(k => {
    const row = get('SELECT key FROM settings WHERE key = ?', [k]);
    if (!row) run('INSERT INTO settings (key, value) VALUES (?, ?)', [k, defaults[k]]);
  });

  // Migrate: add patient columns to receipts if not present
  const rcols = all('PRAGMA table_info(receipts)');
  if (!rcols.some(c => c.name === 'patient_name')) {
    db.run("ALTER TABLE receipts ADD COLUMN patient_name TEXT DEFAULT ''");
    db.run("ALTER TABLE receipts ADD COLUMN patient_phone TEXT DEFAULT ''");
    db.run("ALTER TABLE receipts ADD COLUMN patient_nic TEXT DEFAULT ''");
  }

  // Seed KPK generic medicines (idempotent — skips names that already exist)
  seedKPKMedicines();

  // Front Desk tables + seed
  fdInitTables();

  // Pathology
  pathoInitTable();

  // Sehat Card
  scInitTables();

  // Labour Room
  lrInitTables();

  persist();
}

function seedKPKMedicines() {
  const EXP  = '2028-12-31';
  const BATCH = 'INIT-001';
  const QTY   = 50;

  const meds = [
    // ── Analgesics / NSAIDs ───────────────────────────────────────────
    ['Paracetamol 500mg Tab',        'Paracetamol',                  'Analgesic'],
    ['Paracetamol 250mg Syrup',      'Paracetamol',                  'Analgesic'],
    ['Ibuprofen 400mg Tab',          'Ibuprofen',                    'Analgesic'],
    ['Ibuprofen 200mg Syrup',        'Ibuprofen',                    'Analgesic'],
    ['Diclofenac Sodium 50mg Tab',   'Diclofenac Sodium',            'Analgesic'],
    ['Diclofenac Sodium Inj 75mg',   'Diclofenac Sodium',            'Analgesic'],
    ['Diclofenac Gel 1%',            'Diclofenac Diethylamine',      'Analgesic'],
    ['Mefenamic Acid 500mg Cap',     'Mefenamic Acid',               'Analgesic'],
    ['Naproxen 500mg Tab',           'Naproxen',                     'Analgesic'],
    ['Aspirin 75mg Tab',             'Aspirin',                      'Analgesic'],
    ['Aspirin 300mg Tab',            'Aspirin',                      'Analgesic'],
    ['Tramadol 50mg Cap',            'Tramadol HCl',                 'Analgesic'],
    ['Tramadol 100mg Inj',           'Tramadol HCl',                 'Analgesic'],
    ['Celecoxib 200mg Cap',          'Celecoxib',                    'Analgesic'],
    ['Piroxicam 20mg Cap',           'Piroxicam',                    'Analgesic'],
    ['Ketorolac 10mg Tab',           'Ketorolac',                    'Analgesic'],
    ['Ketorolac 30mg Inj',           'Ketorolac',                    'Analgesic'],
    ['Morphine 10mg Inj',            'Morphine Sulphate',            'Analgesic'],
    // ── Antibiotics ──────────────────────────────────────────────────
    ['Amoxicillin 500mg Cap',        'Amoxicillin',                  'Antibiotic'],
    ['Amoxicillin 250mg Syrup',      'Amoxicillin',                  'Antibiotic'],
    ['Amoxicillin-Clavulanate 625mg','Amoxicillin + Clavulanic Acid','Antibiotic'],
    ['Amoxicillin-Clavulanate Syrup','Amoxicillin + Clavulanic Acid','Antibiotic'],
    ['Ampicillin 500mg Cap',         'Ampicillin',                   'Antibiotic'],
    ['Ampicillin 1g Inj',            'Ampicillin',                   'Antibiotic'],
    ['Cloxacillin 500mg Cap',        'Cloxacillin',                  'Antibiotic'],
    ['Ciprofloxacin 500mg Tab',      'Ciprofloxacin',                'Antibiotic'],
    ['Ciprofloxacin 250mg Tab',      'Ciprofloxacin',                'Antibiotic'],
    ['Ciprofloxacin IV 200mg',       'Ciprofloxacin',                'Antibiotic'],
    ['Levofloxacin 500mg Tab',       'Levofloxacin',                 'Antibiotic'],
    ['Levofloxacin 750mg Tab',       'Levofloxacin',                 'Antibiotic'],
    ['Moxifloxacin 400mg Tab',       'Moxifloxacin',                 'Antibiotic'],
    ['Azithromycin 500mg Tab',       'Azithromycin',                 'Antibiotic'],
    ['Azithromycin 200mg Syrup',     'Azithromycin',                 'Antibiotic'],
    ['Clarithromycin 500mg Tab',     'Clarithromycin',               'Antibiotic'],
    ['Erythromycin 500mg Tab',       'Erythromycin',                 'Antibiotic'],
    ['Erythromycin 125mg Syrup',     'Erythromycin',                 'Antibiotic'],
    ['Doxycycline 100mg Cap',        'Doxycycline',                  'Antibiotic'],
    ['Tetracycline 500mg Cap',       'Tetracycline',                 'Antibiotic'],
    ['Metronidazole 400mg Tab',      'Metronidazole',                'Antibiotic'],
    ['Metronidazole 200mg Syrup',    'Metronidazole',                'Antibiotic'],
    ['Metronidazole IV 500mg',       'Metronidazole',                'Antibiotic'],
    ['Co-trimoxazole 480mg Tab',     'Sulfamethoxazole+Trimethoprim','Antibiotic'],
    ['Co-trimoxazole Syrup',         'Sulfamethoxazole+Trimethoprim','Antibiotic'],
    ['Cephalexin 500mg Cap',         'Cephalexin',                   'Antibiotic'],
    ['Cefixime 400mg Tab',           'Cefixime',                     'Antibiotic'],
    ['Cefixime 100mg Syrup',         'Cefixime',                     'Antibiotic'],
    ['Cefuroxime 500mg Tab',         'Cefuroxime',                   'Antibiotic'],
    ['Ceftriaxone 1g Inj',           'Ceftriaxone',                  'Antibiotic'],
    ['Ceftriaxone 500mg Inj',        'Ceftriaxone',                  'Antibiotic'],
    ['Cefotaxime 1g Inj',            'Cefotaxime',                   'Antibiotic'],
    ['Gentamicin 80mg Inj',          'Gentamicin',                   'Antibiotic'],
    ['Nitrofurantoin 100mg Tab',     'Nitrofurantoin',               'Antibiotic'],
    ['Linezolid 600mg Tab',          'Linezolid',                    'Antibiotic'],
    ['Vancomycin 500mg Inj',         'Vancomycin',                   'Antibiotic'],
    ['Meropenem 1g Inj',             'Meropenem',                    'Antibiotic'],
    // ── Antiparasitic / Antihelminthic ───────────────────────────────
    ['Albendazole 400mg Tab',        'Albendazole',                  'Antiparasitic'],
    ['Mebendazole 100mg Tab',        'Mebendazole',                  'Antiparasitic'],
    ['Piperazine Syrup',             'Piperazine',                   'Antiparasitic'],
    ['Ivermectin 6mg Tab',           'Ivermectin',                   'Antiparasitic'],
    ['Chloroquine 250mg Tab',        'Chloroquine',                  'Antiparasitic'],
    ['Artemether+Lumefantrine Tab',  'Artemether + Lumefantrine',    'Antiparasitic'],
    ['Quinine 300mg Tab',            'Quinine Sulphate',             'Antiparasitic'],
    ['Tinidazole 500mg Tab',         'Tinidazole',                   'Antiparasitic'],
    // ── Antifungals ──────────────────────────────────────────────────
    ['Fluconazole 150mg Cap',        'Fluconazole',                  'Antifungal'],
    ['Fluconazole 50mg Cap',         'Fluconazole',                  'Antifungal'],
    ['Clotrimazole Cream 1%',        'Clotrimazole',                 'Antifungal'],
    ['Clotrimazole Vaginal Tab',     'Clotrimazole',                 'Antifungal'],
    ['Miconazole Cream 2%',          'Miconazole',                   'Antifungal'],
    ['Nystatin Oral Drop',           'Nystatin',                     'Antifungal'],
    ['Terbinafine 250mg Tab',        'Terbinafine',                  'Antifungal'],
    ['Griseofulvin 500mg Tab',       'Griseofulvin',                 'Antifungal'],
    ['Itraconazole 100mg Cap',       'Itraconazole',                 'Antifungal'],
    // ── Antihistamines / Allergy ─────────────────────────────────────
    ['Chlorpheniramine 4mg Tab',     'Chlorpheniramine Maleate',     'Antihistamine'],
    ['Cetirizine 10mg Tab',          'Cetirizine HCl',               'Antihistamine'],
    ['Cetirizine 5mg Syrup',         'Cetirizine HCl',               'Antihistamine'],
    ['Loratadine 10mg Tab',          'Loratadine',                   'Antihistamine'],
    ['Fexofenadine 120mg Tab',       'Fexofenadine',                 'Antihistamine'],
    ['Fexofenadine 180mg Tab',       'Fexofenadine',                 'Antihistamine'],
    ['Diphenhydramine 25mg Cap',     'Diphenhydramine',              'Antihistamine'],
    ['Promethazine 25mg Tab',        'Promethazine',                 'Antihistamine'],
    ['Levocetirizine 5mg Tab',       'Levocetirizine',               'Antihistamine'],
    ['Bilastine 20mg Tab',           'Bilastine',                    'Antihistamine'],
    // ── Cough & Cold ─────────────────────────────────────────────────
    ['Salbutamol 4mg Tab',           'Salbutamol',                   'Respiratory'],
    ['Salbutamol Inhaler 100mcg',    'Salbutamol',                   'Respiratory'],
    ['Salbutamol 2mg Syrup',         'Salbutamol',                   'Respiratory'],
    ['Salbutamol Nebule 2.5mg',      'Salbutamol',                   'Respiratory'],
    ['Ipratropium Inhaler 20mcg',    'Ipratropium Bromide',          'Respiratory'],
    ['Budesonide Inhaler 200mcg',    'Budesonide',                   'Respiratory'],
    ['Beclomethasone Inhaler',       'Beclomethasone',               'Respiratory'],
    ['Montelukast 10mg Tab',         'Montelukast',                  'Respiratory'],
    ['Theophylline 200mg Tab',       'Theophylline',                 'Respiratory'],
    ['Ambroxol 30mg Tab',            'Ambroxol HCl',                 'Respiratory'],
    ['Ambroxol Syrup',               'Ambroxol HCl',                 'Respiratory'],
    ['Bromhexine 8mg Tab',           'Bromhexine',                   'Respiratory'],
    ['Dextromethorphan Syrup',       'Dextromethorphan',             'Respiratory'],
    ['Guaifenesin Syrup',            'Guaifenesin',                  'Respiratory'],
    ['Pseudoephedrine 60mg Tab',     'Pseudoephedrine',              'Respiratory'],
    ['Oxymetazoline Nasal Spray',    'Oxymetazoline',                'Respiratory'],
    ['Xylometazoline Nasal Drops',   'Xylometazoline',               'Respiratory'],
    // ── GI / Stomach ─────────────────────────────────────────────────
    ['Omeprazole 20mg Cap',          'Omeprazole',                   'Gastro'],
    ['Omeprazole 40mg Cap',          'Omeprazole',                   'Gastro'],
    ['Pantoprazole 40mg Tab',        'Pantoprazole',                 'Gastro'],
    ['Esomeprazole 40mg Tab',        'Esomeprazole',                 'Gastro'],
    ['Ranitidine 150mg Tab',         'Ranitidine',                   'Gastro'],
    ['Famotidine 20mg Tab',          'Famotidine',                   'Gastro'],
    ['Domperidone 10mg Tab',         'Domperidone',                  'Gastro'],
    ['Domperidone 5mg Syrup',        'Domperidone',                  'Gastro'],
    ['Metoclopramide 10mg Tab',      'Metoclopramide',               'Gastro'],
    ['Metoclopramide Inj 10mg',      'Metoclopramide',               'Gastro'],
    ['Ondansetron 4mg Tab',          'Ondansetron',                  'Gastro'],
    ['Ondansetron 8mg Tab',          'Ondansetron',                  'Gastro'],
    ['Ondansetron Inj 4mg',          'Ondansetron',                  'Gastro'],
    ['Loperamide 2mg Cap',           'Loperamide',                   'Gastro'],
    ['Bisacodyl 5mg Tab',            'Bisacodyl',                    'Gastro'],
    ['Lactulose Syrup',              'Lactulose',                    'Gastro'],
    ['ORS Sachets',                  'Oral Rehydration Salts',       'Gastro'],
    ['Simethicone 80mg Tab',         'Simethicone',                  'Gastro'],
    ['Antacid Suspension',           'Aluminium+Magnesium Hydroxide','Gastro'],
    ['Sucralfate 1g Tab',            'Sucralfate',                   'Gastro'],
    ['Hyoscine Butylbromide 10mg',   'Hyoscine Butylbromide',        'Gastro'],
    ['Mesalazine 400mg Tab',         'Mesalazine',                   'Gastro'],
    ['Ursodeoxycholic Acid 300mg',   'Ursodeoxycholic Acid',         'Gastro'],
    // ── Antidiabetics ────────────────────────────────────────────────
    ['Metformin 500mg Tab',          'Metformin HCl',                'Antidiabetic'],
    ['Metformin 850mg Tab',          'Metformin HCl',                'Antidiabetic'],
    ['Metformin 1000mg Tab',         'Metformin HCl',                'Antidiabetic'],
    ['Glibenclamide 5mg Tab',        'Glibenclamide',                'Antidiabetic'],
    ['Gliclazide 80mg Tab',          'Gliclazide',                   'Antidiabetic'],
    ['Gliclazide MR 60mg Tab',       'Gliclazide Modified Release',  'Antidiabetic'],
    ['Glimepiride 1mg Tab',          'Glimepiride',                  'Antidiabetic'],
    ['Glimepiride 2mg Tab',          'Glimepiride',                  'Antidiabetic'],
    ['Glimepiride 4mg Tab',          'Glimepiride',                  'Antidiabetic'],
    ['Sitagliptin 100mg Tab',        'Sitagliptin',                  'Antidiabetic'],
    ['Vildagliptin 50mg Tab',        'Vildagliptin',                 'Antidiabetic'],
    ['Pioglitazone 15mg Tab',        'Pioglitazone',                 'Antidiabetic'],
    ['Insulin Regular 100IU/ml',     'Insulin Regular',              'Antidiabetic'],
    ['Insulin NPH 100IU/ml',         'Insulin Isophane (NPH)',       'Antidiabetic'],
    ['Insulin Glargine 100IU/ml',    'Insulin Glargine',             'Antidiabetic'],
    ['Insulin Detemir 100IU/ml',     'Insulin Detemir',              'Antidiabetic'],
    // ── Cardiovascular / Antihypertensive ────────────────────────────
    ['Amlodipine 5mg Tab',           'Amlodipine Besylate',          'Cardiovascular'],
    ['Amlodipine 10mg Tab',          'Amlodipine Besylate',          'Cardiovascular'],
    ['Atenolol 50mg Tab',            'Atenolol',                     'Cardiovascular'],
    ['Atenolol 100mg Tab',           'Atenolol',                     'Cardiovascular'],
    ['Bisoprolol 5mg Tab',           'Bisoprolol Fumarate',          'Cardiovascular'],
    ['Bisoprolol 10mg Tab',          'Bisoprolol Fumarate',          'Cardiovascular'],
    ['Metoprolol 50mg Tab',          'Metoprolol Tartrate',          'Cardiovascular'],
    ['Carvedilol 6.25mg Tab',        'Carvedilol',                   'Cardiovascular'],
    ['Lisinopril 5mg Tab',           'Lisinopril',                   'Cardiovascular'],
    ['Lisinopril 10mg Tab',          'Lisinopril',                   'Cardiovascular'],
    ['Enalapril 5mg Tab',            'Enalapril Maleate',            'Cardiovascular'],
    ['Enalapril 10mg Tab',           'Enalapril Maleate',            'Cardiovascular'],
    ['Ramipril 5mg Cap',             'Ramipril',                     'Cardiovascular'],
    ['Ramipril 10mg Cap',            'Ramipril',                     'Cardiovascular'],
    ['Losartan 50mg Tab',            'Losartan Potassium',           'Cardiovascular'],
    ['Losartan 100mg Tab',           'Losartan Potassium',           'Cardiovascular'],
    ['Valsartan 80mg Tab',           'Valsartan',                    'Cardiovascular'],
    ['Valsartan 160mg Tab',          'Valsartan',                    'Cardiovascular'],
    ['Telmisartan 40mg Tab',         'Telmisartan',                  'Cardiovascular'],
    ['Telmisartan 80mg Tab',         'Telmisartan',                  'Cardiovascular'],
    ['Hydrochlorothiazide 25mg Tab', 'Hydrochlorothiazide',          'Cardiovascular'],
    ['Furosemide 40mg Tab',          'Furosemide',                   'Cardiovascular'],
    ['Furosemide 20mg Inj',          'Furosemide',                   'Cardiovascular'],
    ['Spironolactone 25mg Tab',      'Spironolactone',               'Cardiovascular'],
    ['Nifedipine 10mg Cap',          'Nifedipine',                   'Cardiovascular'],
    ['Nifedipine SR 20mg Tab',       'Nifedipine',                   'Cardiovascular'],
    ['Verapamil 80mg Tab',           'Verapamil HCl',                'Cardiovascular'],
    ['Diltiazem 60mg Tab',           'Diltiazem HCl',                'Cardiovascular'],
    ['Digoxin 0.25mg Tab',           'Digoxin',                      'Cardiovascular'],
    ['Warfarin 5mg Tab',             'Warfarin Sodium',              'Cardiovascular'],
    ['Clopidogrel 75mg Tab',         'Clopidogrel',                  'Cardiovascular'],
    ['Atorvastatin 10mg Tab',        'Atorvastatin',                 'Cardiovascular'],
    ['Atorvastatin 20mg Tab',        'Atorvastatin',                 'Cardiovascular'],
    ['Atorvastatin 40mg Tab',        'Atorvastatin',                 'Cardiovascular'],
    ['Rosuvastatin 10mg Tab',        'Rosuvastatin',                 'Cardiovascular'],
    ['Rosuvastatin 20mg Tab',        'Rosuvastatin',                 'Cardiovascular'],
    ['Simvastatin 20mg Tab',         'Simvastatin',                  'Cardiovascular'],
    ['GTN 0.5mg Sublingual Tab',     'Glyceryl Trinitrate',          'Cardiovascular'],
    ['Isosorbide Mononitrate 20mg',  'Isosorbide Mononitrate',       'Cardiovascular'],
    // ── CNS / Neurological ───────────────────────────────────────────
    ['Diazepam 5mg Tab',             'Diazepam',                     'CNS'],
    ['Diazepam 10mg Inj',            'Diazepam',                     'CNS'],
    ['Alprazolam 0.25mg Tab',        'Alprazolam',                   'CNS'],
    ['Alprazolam 0.5mg Tab',         'Alprazolam',                   'CNS'],
    ['Clonazepam 0.5mg Tab',         'Clonazepam',                   'CNS'],
    ['Clonazepam 1mg Tab',           'Clonazepam',                   'CNS'],
    ['Lorazepam 1mg Tab',            'Lorazepam',                    'CNS'],
    ['Phenobarbitone 30mg Tab',      'Phenobarbitone',               'CNS'],
    ['Phenytoin 100mg Tab',          'Phenytoin Sodium',             'CNS'],
    ['Carbamazepine 200mg Tab',      'Carbamazepine',                'CNS'],
    ['Sodium Valproate 200mg Tab',   'Sodium Valproate',             'CNS'],
    ['Sodium Valproate 500mg Tab',   'Sodium Valproate',             'CNS'],
    ['Levetiracetam 500mg Tab',      'Levetiracetam',                'CNS'],
    ['Amitriptyline 25mg Tab',       'Amitriptyline',                'CNS'],
    ['Sertraline 50mg Tab',          'Sertraline HCl',               'CNS'],
    ['Fluoxetine 20mg Cap',          'Fluoxetine HCl',               'CNS'],
    ['Escitalopram 10mg Tab',        'Escitalopram',                 'CNS'],
    ['Paroxetine 20mg Tab',          'Paroxetine',                   'CNS'],
    ['Haloperidol 5mg Tab',          'Haloperidol',                  'CNS'],
    ['Risperidone 1mg Tab',          'Risperidone',                  'CNS'],
    ['Risperidone 2mg Tab',          'Risperidone',                  'CNS'],
    ['Olanzapine 5mg Tab',           'Olanzapine',                   'CNS'],
    ['Tramadol+Paracetamol Tab',     'Tramadol + Paracetamol',       'CNS'],
    ['Levodopa+Carbidopa 250mg Tab', 'Levodopa + Carbidopa',         'CNS'],
    ['Pregabalin 75mg Cap',          'Pregabalin',                   'CNS'],
    ['Pregabalin 150mg Cap',         'Pregabalin',                   'CNS'],
    ['Gabapentin 300mg Cap',         'Gabapentin',                   'CNS'],
    ['Sumatriptan 50mg Tab',         'Sumatriptan',                  'CNS'],
    ['Donepezil 5mg Tab',            'Donepezil HCl',                'CNS'],
    ['Melatonin 3mg Tab',            'Melatonin',                    'CNS'],
    // ── Vitamins & Supplements ───────────────────────────────────────
    ['Vitamin C 500mg Tab',          'Ascorbic Acid',                'Vitamins'],
    ['Vitamin C 1000mg Tab',         'Ascorbic Acid',                'Vitamins'],
    ['Vitamin B Complex Tab',        'Vitamin B Complex',            'Vitamins'],
    ['Vitamin B12 1000mcg Inj',      'Cyanocobalamin',               'Vitamins'],
    ['Vitamin D3 1000IU Cap',        'Cholecalciferol',              'Vitamins'],
    ['Vitamin D3 5000IU Cap',        'Cholecalciferol',              'Vitamins'],
    ['Vitamin D3 50000IU Cap',       'Cholecalciferol',              'Vitamins'],
    ['Vitamin E 400IU Cap',          'Tocopherol Acetate',           'Vitamins'],
    ['Folic Acid 5mg Tab',           'Folic Acid',                   'Vitamins'],
    ['Ferrous Sulphate 200mg Tab',   'Ferrous Sulphate',             'Vitamins'],
    ['Iron + Folic Acid Tab',        'Ferrous Sulphate + Folic Acid','Vitamins'],
    ['Iron Syrup',                   'Iron Polymaltose',             'Vitamins'],
    ['Calcium Carbonate 500mg Tab',  'Calcium Carbonate',            'Vitamins'],
    ['Calcium + Vit D3 Tab',         'Calcium Carbonate + Vit D3',   'Vitamins'],
    ['Zinc Sulphate 20mg Tab',       'Zinc Sulphate',                'Vitamins'],
    ['Zinc Syrup',                   'Zinc Sulphate',                'Vitamins'],
    ['Multivitamin Tab',             'Multivitamins',                'Vitamins'],
    ['Multivitamin Syrup',           'Multivitamins',                'Vitamins'],
    ['Omega-3 Fish Oil 1000mg',      'Omega-3 Fatty Acids',          'Vitamins'],
    ['Magnesium 250mg Tab',          'Magnesium',                    'Vitamins'],
    ['Vitamin A 50000IU Cap',        'Retinol Acetate',              'Vitamins'],
    // ── Steroids & Hormones ──────────────────────────────────────────
    ['Prednisolone 5mg Tab',         'Prednisolone',                 'Steroids'],
    ['Prednisolone 10mg Tab',        'Prednisolone',                 'Steroids'],
    ['Prednisolone Syrup 5mg/5ml',   'Prednisolone',                 'Steroids'],
    ['Dexamethasone 4mg Inj',        'Dexamethasone',                'Steroids'],
    ['Dexamethasone 0.5mg Tab',      'Dexamethasone',                'Steroids'],
    ['Hydrocortisone 100mg Inj',     'Hydrocortisone',               'Steroids'],
    ['Methylprednisolone 500mg Inj', 'Methylprednisolone',           'Steroids'],
    ['Betamethasone 0.5mg Tab',      'Betamethasone',                'Steroids'],
    ['Levothyroxine 50mcg Tab',      'Levothyroxine Sodium',         'Hormones'],
    ['Levothyroxine 100mcg Tab',     'Levothyroxine Sodium',         'Hormones'],
    ['OCP Lo-Femenal Tab',           'Ethinylestradiol+Levonorgestrel','Hormones'],
    ['Medroxyprogesterone 10mg Tab', 'Medroxyprogesterone Acetate',  'Hormones'],
    ['Oxytocin 10IU Inj',            'Oxytocin',                     'Hormones'],
    ['Testosterone 250mg Inj',       'Testosterone Enanthate',       'Hormones'],
    // ── Dermatology ──────────────────────────────────────────────────
    ['Betamethasone Cream 0.1%',     'Betamethasone Valerate',       'Dermatology'],
    ['Betamethasone + Clotrimazole', 'Betamethasone + Clotrimazole', 'Dermatology'],
    ['Hydrocortisone Cream 1%',      'Hydrocortisone',               'Dermatology'],
    ['Fusidic Acid Cream 2%',        'Fusidic Acid',                 'Dermatology'],
    ['Mupirocin Ointment 2%',        'Mupirocin',                    'Dermatology'],
    ['Benzoyl Peroxide Gel 5%',      'Benzoyl Peroxide',             'Dermatology'],
    ['Tretinoin Cream 0.05%',        'Tretinoin',                    'Dermatology'],
    ['Salicylic Acid 6% Ointment',   'Salicylic Acid',               'Dermatology'],
    ['Permethrin Cream 5%',          'Permethrin',                   'Dermatology'],
    ['Calamine Lotion',              'Calamine',                     'Dermatology'],
    ['Silver Sulfadiazine Cream 1%', 'Silver Sulfadiazine',          'Dermatology'],
    ['Povidone Iodine 10% Solution', 'Povidone Iodine',              'Dermatology'],
    ['Zinc Oxide Ointment',          'Zinc Oxide',                   'Dermatology'],
    // ── Eye & Ear ────────────────────────────────────────────────────
    ['Chloramphenicol Eye Drops',    'Chloramphenicol',              'Eye & Ear'],
    ['Ciprofloxacin Eye Drops',      'Ciprofloxacin',                'Eye & Ear'],
    ['Tobramycin Eye Drops',         'Tobramycin',                   'Eye & Ear'],
    ['Artificial Tears Eye Drops',   'Carboxymethylcellulose',       'Eye & Ear'],
    ['Timolol 0.5% Eye Drops',       'Timolol Maleate',              'Eye & Ear'],
    ['Dexamethasone Eye Drops',      'Dexamethasone',                'Eye & Ear'],
    ['Ofloxacin Eye/Ear Drops',      'Ofloxacin',                    'Eye & Ear'],
    ['Ciprofloxacin+Dexa Ear Drops', 'Ciprofloxacin + Dexamethasone','Eye & Ear'],
    ['Otrivin Ear Drops',            'Xylometazoline',               'Eye & Ear'],
    ['Antazoline+Xylometazoline',    'Antazoline + Xylometazoline',  'Eye & Ear'],
    // ── Injections & IV Fluids ───────────────────────────────────────
    ['Normal Saline 0.9% 1L',        'Sodium Chloride 0.9%',         'IV Fluids'],
    ['Normal Saline 0.9% 500ml',     'Sodium Chloride 0.9%',         'IV Fluids'],
    ['Dextrose 5% 1L',               'Dextrose 5%',                  'IV Fluids'],
    ['Dextrose 5% 500ml',            'Dextrose 5%',                  'IV Fluids'],
    ['Dextrose 50% 50ml',            'Dextrose 50%',                 'IV Fluids'],
    ["Ringer's Lactate 1L",          "Ringer's Lactate",             'IV Fluids'],
    ["Ringer's Lactate 500ml",       "Ringer's Lactate",             'IV Fluids'],
    ['Metronidazole IV 500ml',       'Metronidazole',                'IV Fluids'],
    ['KCl 7.45% 10ml Inj',           'Potassium Chloride',           'IV Fluids'],
    ['Heparin 5000IU Inj',           'Heparin Sodium',               'IV Fluids'],
    // ── Urological ───────────────────────────────────────────────────
    ['Tamsulosin 0.4mg Cap',         'Tamsulosin HCl',               'Urological'],
    ['Doxazosin 4mg Tab',            'Doxazosin',                    'Urological'],
    ['Finasteride 5mg Tab',          'Finasteride',                  'Urological'],
    ['Oxybutynin 5mg Tab',           'Oxybutynin HCl',               'Urological'],
    ['Solifenacin 5mg Tab',          'Solifenacin',                  'Urological'],
    // ── Musculoskeletal ──────────────────────────────────────────────
    ['Methocarbamol 750mg Tab',      'Methocarbamol',                'Musculoskeletal'],
    ['Cyclobenzaprine 5mg Tab',      'Cyclobenzaprine',              'Musculoskeletal'],
    ['Baclofen 10mg Tab',            'Baclofen',                     'Musculoskeletal'],
    ['Colchicine 0.5mg Tab',         'Colchicine',                   'Musculoskeletal'],
    ['Allopurinol 100mg Tab',        'Allopurinol',                  'Musculoskeletal'],
    ['Allopurinol 300mg Tab',        'Allopurinol',                  'Musculoskeletal'],
    ['Calcium + Vit D3 + Zinc Tab',  'Calcium+Vit D3+Zinc',          'Musculoskeletal'],
    ['Diclofenac SR 100mg Tab',      'Diclofenac Sodium SR',         'Musculoskeletal'],
    // ── Miscellaneous ────────────────────────────────────────────────
    ['Activated Charcoal Tab',       'Activated Charcoal',           'Miscellaneous'],
    ['Atropine 0.6mg Inj',           'Atropine Sulphate',            'Miscellaneous'],
    ['Adrenaline 1mg Inj',           'Epinephrine',                  'Miscellaneous'],
    ['Sodium Bicarbonate Tab',       'Sodium Bicarbonate',           'Miscellaneous'],
    ['Dextrose 25% 25ml',            'Dextrose',                     'Miscellaneous'],
    ['Paracetamol+Codeine Tab',      'Paracetamol + Codeine',        'Miscellaneous'],
    ['Vitamin K1 10mg Inj',          'Phytomenadione',               'Miscellaneous'],
    ['Oxytocin 5IU Inj',             'Oxytocin',                     'Miscellaneous'],
    ['Magnesium Sulphate 50% Inj',   'Magnesium Sulphate',           'Miscellaneous'],
    ['Diazepam Rectal Gel',          'Diazepam',                     'Miscellaneous'],
    ['Erythropoietin 4000IU Inj',    'Erythropoietin',               'Miscellaneous'],
  ];

  meds.forEach(([name, generic, category]) => {
    const existing = get('SELECT id FROM medicines WHERE name = ?', [name]);
    if (existing) return;
    const medId = run(
      'INSERT INTO medicines (name, generic_name, manufacturer, category) VALUES (?, ?, ?, ?)',
      [name, generic, '', category]
    );
    run(
      `INSERT INTO batches (medicine_id, medicine_name, batch_no, expiry_date, quantity, purchase_price, sale_price)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [medId, name, BATCH, EXP, QTY, 0, 0]
    );
  });
}

// ─── AUTH ─────────────────────────────────────────────────────────────────────
function login(username, password) {
  return get('SELECT id, username, role FROM users WHERE username = ? AND password = ?',
             [username, hash(password)]);
}

// ─── DASHBOARD ───────────────────────────────────────────────────────────────
function getDashboardStats() {
  const today = new Date().toISOString().slice(0, 10);
  const thisMonth = today.slice(0, 7);

  const todaySales = get('SELECT COALESCE(SUM(total),0) as val FROM invoices WHERE date = ?', [today]);
  const monthSales = get("SELECT COALESCE(SUM(total),0) as val FROM invoices WHERE date LIKE ?", [`${thisMonth}%`]);
  const totalReceivable = get('SELECT COALESCE(SUM(balance),0) as val FROM customers');
  const lowStock = get('SELECT COUNT(*) as val FROM batches WHERE quantity > 0 AND quantity <= 10');
  const expiringIn30 = get("SELECT COUNT(*) as val FROM batches WHERE quantity > 0 AND expiry_date <= date('now','+30 days') AND expiry_date >= date('now')");
  const totalMedicines = get('SELECT COUNT(*) as val FROM medicines');
  const totalCustomers = get('SELECT COUNT(*) as val FROM customers');
  const recentInvoices = all('SELECT invoice_no, customer_name, date, total, remaining FROM invoices ORDER BY id DESC LIMIT 5');
  const expiryAlerts = all("SELECT medicine_name, batch_no, expiry_date, quantity FROM batches WHERE quantity > 0 AND expiry_date <= date('now','+60 days') ORDER BY expiry_date ASC LIMIT 5");

  return {
    todaySales: todaySales?.val || 0,
    monthSales: monthSales?.val || 0,
    totalReceivable: totalReceivable?.val || 0,
    lowStock: lowStock?.val || 0,
    expiringIn30: expiringIn30?.val || 0,
    totalMedicines: totalMedicines?.val || 0,
    totalCustomers: totalCustomers?.val || 0,
    recentInvoices,
    expiryAlerts
  };
}

// ─── MEDICINES ────────────────────────────────────────────────────────────────
function getMedicines(search) {
  const q = search ? `%${search}%` : '%';
  return all('SELECT * FROM medicines WHERE name LIKE ? OR generic_name LIKE ? ORDER BY name', [q, q]);
}

function addMedicine(m) {
  const id = run('INSERT INTO medicines (name, generic_name, manufacturer, category) VALUES (?, ?, ?, ?)',
    [m.name, m.generic_name || '', m.manufacturer || '', m.category || '']);
  persist();
  return { id, ...m };
}

function updateMedicine(m) {
  if (m._batchId) {
    run('UPDATE batches SET batch_no=?, expiry_date=?, quantity=?, purchase_price=?, sale_price=? WHERE id=?',
      [m.batch_no, m.expiry_date, m.quantity, m.purchase_price, m.sale_price, m._batchId]);
    persist();
    return true;
  }
  run('UPDATE medicines SET name=?, generic_name=?, manufacturer=?, category=? WHERE id=?',
    [m.name, m.generic_name || '', m.manufacturer || '', m.category || '', m.id]);
  persist();
  return true;
}

function deleteMedicine(id) {
  const batch = get('SELECT id FROM batches WHERE id = ?', [id]);
  if (batch) {
    run('DELETE FROM batches WHERE id = ?', [id]);
  } else {
    run('DELETE FROM medicines WHERE id = ?', [id]);
  }
  persist();
  return true;
}

function searchMedicine(q) {
  return all(`
    SELECT m.id, m.name, m.generic_name, b.id as batch_id, b.batch_no,
           b.expiry_date, b.sale_price, b.quantity
    FROM medicines m
    JOIN batches b ON b.medicine_id = m.id
    WHERE (m.name LIKE ? OR m.generic_name LIKE ?) AND b.quantity > 0
    ORDER BY m.name, b.expiry_date`, [`%${q}%`, `%${q}%`]);
}

function getMedicineBatches(medicineId) {
  return all('SELECT * FROM batches WHERE medicine_id = ? ORDER BY expiry_date', [medicineId]);
}

function getAllBatchesWithStock(search) {
  const q = search ? `%${search}%` : '%';
  return all(`
    SELECT b.*, m.generic_name, m.manufacturer
    FROM batches b
    JOIN medicines m ON m.id = b.medicine_id
    WHERE b.medicine_name LIKE ? OR m.generic_name LIKE ?
    ORDER BY b.medicine_name, b.expiry_date`, [q, q]);
}

// ─── CUSTOMERS ────────────────────────────────────────────────────────────────
function getCustomers(search) {
  const q = search ? `%${search}%` : '%';
  return all('SELECT * FROM customers WHERE name LIKE ? OR phone LIKE ? ORDER BY name', [q, q]);
}

function addCustomer(c) {
  const id = run('INSERT INTO customers (name, phone, address, balance) VALUES (?, ?, ?, 0)',
    [c.name, c.phone || '', c.address || '']);
  persist();
  return { id, ...c, balance: 0 };
}

function updateCustomer(c) {
  run('UPDATE customers SET name=?, phone=?, address=? WHERE id=?',
    [c.name, c.phone || '', c.address || '', c.id]);
  persist();
  return true;
}

function deleteCustomer(id) {
  run('DELETE FROM customers WHERE id = ?', [id]);
  persist();
  return true;
}

function getCustomerLedger(customerId) {
  const customer = get('SELECT * FROM customers WHERE id = ?', [customerId]);
  const entries = all('SELECT * FROM ledger WHERE customer_id = ? ORDER BY id ASC', [customerId]);
  return { customer, entries };
}

function addPayment(p) {
  const customer = get('SELECT * FROM customers WHERE id = ?', [p.customer_id]);
  if (!customer) return { ok: false, error: 'Customer not found' };
  const newBalance = customer.balance - p.amount;
  transaction(() => {
    run('UPDATE customers SET balance = ? WHERE id = ?', [newBalance, p.customer_id]);
    run(`INSERT INTO ledger (customer_id, date, type, ref_no, debit, credit, balance, note)
         VALUES (?, ?, 'payment', ?, 0, ?, ?, ?)`,
      [p.customer_id, p.date, p.ref_no || '', p.amount, newBalance, p.note || '']);
  });
  return { ok: true, newBalance };
}

// ─── SUPPLIERS ────────────────────────────────────────────────────────────────
function getSuppliers(search) {
  const q = search ? `%${search}%` : '%';
  return all('SELECT * FROM suppliers WHERE name LIKE ? OR phone LIKE ? ORDER BY name', [q, q]);
}

function addSupplier(s) {
  const id = run('INSERT INTO suppliers (name, phone, address) VALUES (?, ?, ?)',
    [s.name, s.phone || '', s.address || '']);
  persist();
  return { id, ...s };
}

function updateSupplier(s) {
  run('UPDATE suppliers SET name=?, phone=?, address=? WHERE id=?',
    [s.name, s.phone || '', s.address || '', s.id]);
  persist();
  return true;
}

function deleteSupplier(id) {
  run('DELETE FROM suppliers WHERE id = ?', [id]);
  persist();
  return true;
}

// ─── SALES / INVOICES ────────────────────────────────────────────────────────
function generateInvoiceNo() {
  const d = new Date();
  const prefix = `INV-${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
  const last = get('SELECT invoice_no FROM invoices WHERE invoice_no LIKE ? ORDER BY id DESC LIMIT 1', [`${prefix}%`]);
  if (!last) return `${prefix}-001`;
  const num = parseInt(last.invoice_no.split('-').pop()) + 1;
  return `${prefix}-${String(num).padStart(3,'0')}`;
}

function saveInvoice(data) {
  const invoiceNo = generateInvoiceNo();
  let invoiceId;

  transaction(() => {
    invoiceId = run(`INSERT INTO invoices
      (invoice_no, customer_id, customer_name, date, subtotal, discount, total, paid, remaining, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [invoiceNo, data.customer_id, data.customer_name, data.date,
       data.subtotal, data.discount, data.total, data.paid, data.remaining, data.created_by || 1]);

    for (const item of data.items) {
      run(`INSERT INTO invoice_items
        (invoice_id, medicine_id, batch_id, medicine_name, batch_no, quantity, price, total)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [invoiceId, item.medicine_id || null, item.batch_id || null,
         item.medicine_name, item.batch_no, item.quantity, item.price, item.total]);

      if (item.batch_id) {
        run('UPDATE batches SET quantity = quantity - ? WHERE id = ?', [item.quantity, item.batch_id]);
      }
    }

    const customer = get('SELECT balance FROM customers WHERE id = ?', [data.customer_id]);
    const newBalance = (customer?.balance || 0) + data.remaining;
    run('UPDATE customers SET balance = ? WHERE id = ?', [newBalance, data.customer_id]);

    if (data.remaining > 0) {
      run(`INSERT INTO ledger (customer_id, date, type, ref_no, debit, credit, balance, note)
           VALUES (?, ?, 'invoice', ?, ?, 0, ?, ?)`,
        [data.customer_id, data.date, invoiceNo, data.remaining, newBalance, `Invoice ${invoiceNo}`]);
    }
  });

  return { ok: true, invoiceId, invoiceNo };
}

function getInvoices(filters) {
  const params = [];
  let where = 'WHERE 1=1';
  if (filters && filters.from) { where += ' AND date >= ?'; params.push(filters.from); }
  if (filters && filters.to)   { where += ' AND date <= ?'; params.push(filters.to); }
  if (filters && filters.customer_id) { where += ' AND customer_id = ?'; params.push(filters.customer_id); }
  return all(`SELECT * FROM invoices ${where} ORDER BY id DESC LIMIT 200`, params);
}

function getInvoiceDetail(id) {
  const invoice = get('SELECT * FROM invoices WHERE id = ?', [id]);
  const items = all('SELECT * FROM invoice_items WHERE invoice_id = ?', [id]);
  return { invoice, items };
}

// ─── PURCHASES ───────────────────────────────────────────────────────────────
function generatePurchaseNo() {
  const d = new Date();
  const prefix = `PUR-${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
  const last = get('SELECT purchase_no FROM purchases WHERE purchase_no LIKE ? ORDER BY id DESC LIMIT 1', [`${prefix}%`]);
  if (!last) return `${prefix}-001`;
  const num = parseInt(last.purchase_no.split('-').pop()) + 1;
  return `${prefix}-${String(num).padStart(3,'0')}`;
}

function savePurchase(data) {
  const purchaseNo = generatePurchaseNo();
  let purchaseId;

  transaction(() => {
    purchaseId = run(`INSERT INTO purchases
      (purchase_no, supplier_id, supplier_name, date, total_cost, created_by)
      VALUES (?, ?, ?, ?, ?, ?)`,
      [purchaseNo, data.supplier_id || null, data.supplier_name, data.date,
       data.total_cost, data.created_by || 1]);

    for (const item of data.items) {
      let medicine = get('SELECT id FROM medicines WHERE name = ?', [item.medicine_name]);
      if (!medicine) {
        const mid = run('INSERT INTO medicines (name) VALUES (?)', [item.medicine_name]);
        medicine = { id: mid };
      }

      let batch = get('SELECT id FROM batches WHERE medicine_id = ? AND batch_no = ?',
                      [medicine.id, item.batch_no]);
      if (batch) {
        run('UPDATE batches SET quantity = quantity + ?, purchase_price = ?, sale_price = ?, expiry_date = ? WHERE id = ?',
          [item.quantity, item.cost_price, item.sale_price || Math.round(item.cost_price * 1.2),
           item.expiry_date, batch.id]);
      } else {
        const bid = run(`INSERT INTO batches
          (medicine_id, medicine_name, batch_no, expiry_date, purchase_price, sale_price, quantity)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [medicine.id, item.medicine_name, item.batch_no, item.expiry_date,
           item.cost_price, item.sale_price || Math.round(item.cost_price * 1.2), item.quantity]);
        batch = { id: bid };
      }

      run(`INSERT INTO purchase_items
        (purchase_id, medicine_id, batch_id, medicine_name, batch_no, expiry_date, quantity, cost_price, total)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [purchaseId, medicine.id, batch.id, item.medicine_name, item.batch_no,
         item.expiry_date, item.quantity, item.cost_price, item.total]);
    }
  });

  return { ok: true, purchaseId, purchaseNo };
}

function getPurchases(filters) {
  const params = [];
  let where = 'WHERE 1=1';
  if (filters && filters.from) { where += ' AND date >= ?'; params.push(filters.from); }
  if (filters && filters.to)   { where += ' AND date <= ?'; params.push(filters.to); }
  return all(`SELECT * FROM purchases ${where} ORDER BY id DESC LIMIT 200`, params);
}

function getPurchaseDetail(id) {
  const purchase = get('SELECT * FROM purchases WHERE id = ?', [id]);
  const items = all('SELECT * FROM purchase_items WHERE purchase_id = ?', [id]);
  return { purchase, items };
}

// ─── REPORTS ─────────────────────────────────────────────────────────────────
function reportSales(f) {
  return all(`
    SELECT date, COUNT(*) as count, SUM(total) as total, SUM(paid) as paid, SUM(remaining) as remaining
    FROM invoices WHERE date BETWEEN ? AND ?
    GROUP BY date ORDER BY date DESC`, [f.from, f.to]);
}

function reportProfit(f) {
  return all(`
    SELECT ii.medicine_name, SUM(ii.quantity) as qty_sold,
           SUM(ii.total) as revenue,
           SUM(ii.quantity * COALESCE(b.purchase_price, 0)) as cost,
           SUM(ii.total) - SUM(ii.quantity * COALESCE(b.purchase_price, 0)) as profit
    FROM invoice_items ii
    JOIN invoices inv ON inv.id = ii.invoice_id
    LEFT JOIN batches b ON b.id = ii.batch_id
    WHERE inv.date BETWEEN ? AND ?
    GROUP BY ii.medicine_name
    ORDER BY profit DESC`, [f.from, f.to]);
}

function reportExpiry(days) {
  const d = days || 90;
  return all(`
    SELECT b.medicine_name, b.batch_no, b.expiry_date, b.quantity, b.sale_price,
           CASE WHEN b.expiry_date < date('now') THEN 'expired'
                WHEN b.expiry_date <= date('now','+'||?||' days') THEN 'expiring'
                ELSE 'ok' END as status
    FROM batches b
    WHERE b.quantity > 0 AND b.expiry_date <= date('now','+'||?||' days')
    ORDER BY b.expiry_date ASC`, [d, d]);
}

function reportCustomerBalances() {
  return all('SELECT id, name, phone, balance FROM customers WHERE balance > 0 ORDER BY balance DESC');
}

function reportStockSummary() {
  return all(`SELECT b.medicine_name, b.batch_no, b.expiry_date, b.quantity, b.purchase_price, b.sale_price
              FROM batches b WHERE b.quantity > 0 ORDER BY b.medicine_name, b.expiry_date`);
}

// ─── BACKUP ───────────────────────────────────────────────────────────────────
function saveBackupInfo(dest) {
  run('INSERT INTO backup_log (path) VALUES (?)', [dest]);
  persist();
}

function getLastBackupInfo() {
  return get('SELECT * FROM backup_log ORDER BY id DESC LIMIT 1');
}

// ─── SETTINGS / USERS ────────────────────────────────────────────────────────
function getUsers() {
  return all('SELECT id, username, role, created_at FROM users ORDER BY id');
}

function addUser(u) {
  const id = run('INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
    [u.username, hash(u.password), u.role || 'operator']);
  persist();
  return { id };
}

function updateUser(u) {
  if (u.password) {
    run('UPDATE users SET username=?, password=?, role=? WHERE id=?',
      [u.username, hash(u.password), u.role || 'operator', u.id]);
  } else {
    run('UPDATE users SET username=?, role=? WHERE id=?',
      [u.username, u.role || 'operator', u.id]);
  }
  persist();
  return true;
}

function deleteUser(id) {
  run('DELETE FROM users WHERE id = ?', [id]);
  persist();
  return true;
}

function getSettings() {
  const rows = all('SELECT key, value FROM settings');
  const obj = {};
  rows.forEach(r => { obj[r.key] = r.value; });
  return obj;
}

function saveSettings(s) {
  transaction(() => {
    Object.keys(s).forEach(k => {
      run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [k, s[k]]);
    });
  });
  return true;
}

// ─── POS / RECEIPTS ──────────────────────────────────────────────────────────
function generateReceiptNo() {
  const d = new Date();
  const prefix = `RCP-${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
  const last = get('SELECT receipt_no FROM receipts WHERE receipt_no LIKE ? ORDER BY id DESC LIMIT 1', [`${prefix}%`]);
  if (!last) return `${prefix}-001`;
  const num = parseInt(last.receipt_no.split('-').pop()) + 1;
  return `${prefix}-${String(num).padStart(3,'0')}`;
}

function saveReceipt(data) {
  const receiptNo = generateReceiptNo();
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  let receiptId;
  transaction(() => {
    receiptId = run(`INSERT INTO receipts
      (receipt_no, date, time, subtotal, discount, total, cash_paid, change_amount, created_by,
       patient_name, patient_phone, patient_nic)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [receiptNo, data.date, timeStr, data.subtotal, data.discount,
       data.total, data.cash_paid, data.change_amount, data.created_by || 1,
       data.patient_name || '', data.patient_phone || '', data.patient_nic || '']);
    for (const item of data.items) {
      run(`INSERT INTO receipt_items
        (receipt_id, medicine_id, batch_id, medicine_name, batch_no, quantity, price, total)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [receiptId, item.medicine_id || null, item.batch_id || null,
         item.medicine_name, item.batch_no || '', item.quantity, item.price, item.total]);
      if (item.batch_id) {
        run('UPDATE batches SET quantity = quantity - ? WHERE id = ?', [item.quantity, item.batch_id]);
      }
    }
  });
  return { ok: true, receiptId, receiptNo };
}

function getReceipts(filters) {
  const params = [];
  let where = 'WHERE 1=1';
  if (filters && filters.from)    { where += ' AND date >= ?'; params.push(filters.from); }
  if (filters && filters.to)      { where += ' AND date <= ?'; params.push(filters.to); }
  if (filters && filters.patient) { where += ' AND (patient_name LIKE ? OR patient_phone LIKE ? OR patient_nic LIKE ?)'; const p = `%${filters.patient}%`; params.push(p,p,p); }
  return all(`SELECT * FROM receipts ${where} ORDER BY id DESC LIMIT 500`, params);
}

function getReceiptDetail(id) {
  const receipt = get('SELECT * FROM receipts WHERE id = ?', [id]);
  const items = all('SELECT * FROM receipt_items WHERE receipt_id = ?', [id]);
  return { receipt, items };
}

function getFinanceStats() {
  const t = new Date().toISOString().slice(0, 10);
  const wStart = new Date(); wStart.setDate(wStart.getDate() - wStart.getDay()); const ws = wStart.toISOString().slice(0, 10);
  const mStart = t.slice(0, 7) + '-01';
  const todayR  = get('SELECT COUNT(*) as cnt, COALESCE(SUM(total),0) as total FROM receipts WHERE date = ?', [t]);
  const weekR   = get('SELECT COUNT(*) as cnt, COALESCE(SUM(total),0) as total FROM receipts WHERE date >= ?', [ws]);
  const monthR  = get('SELECT COUNT(*) as cnt, COALESCE(SUM(total),0) as total FROM receipts WHERE date >= ?', [mStart]);
  const todayInv = get('SELECT COALESCE(SUM(total),0) as total FROM invoices WHERE date = ?', [t]);
  const recentReceipts = all('SELECT * FROM receipts ORDER BY id DESC LIMIT 10');
  const topMeds = all(`SELECT ri.medicine_name, SUM(ri.quantity) as qty, SUM(ri.total) as revenue
    FROM receipt_items ri JOIN receipts r ON r.id = ri.receipt_id
    WHERE r.date >= ? GROUP BY ri.medicine_name ORDER BY revenue DESC LIMIT 8`, [mStart]);
  const dailySales = all(`SELECT date, COUNT(*) as receipts, SUM(total) as total
    FROM receipts WHERE date >= ? GROUP BY date ORDER BY date DESC LIMIT 7`,
    [new Date(Date.now() - 6*86400000).toISOString().slice(0, 10)]);
  return { todayReceipts: todayR?.cnt||0, todayTotal: todayR?.total||0,
           weekTotal: weekR?.total||0, monthTotal: monthR?.total||0,
           todayInvoiceTotal: todayInv?.total||0,
           recentReceipts, topMeds, dailySales };
}

// ─── RETAIL REPORTS ──────────────────────────────────────────────────────────
function reportRetailSales(filters) {
  const params = [];
  let where = 'WHERE 1=1';
  if (filters && filters.from) { where += ' AND date >= ?'; params.push(filters.from); }
  if (filters && filters.to)   { where += ' AND date <= ?'; params.push(filters.to); }
  const dailyRows = all(
    `SELECT date, COUNT(*) as count, SUM(total) as total, SUM(discount) as discount, SUM(cash_paid) as cash
     FROM receipts ${where} GROUP BY date ORDER BY date DESC`, params);
  const allReceipts = all(
    `SELECT * FROM receipts ${where} ORDER BY id DESC`, params);
  return { dailyRows, allReceipts };
}

function reportTopMedicines(filters) {
  const params = [];
  let where = 'WHERE 1=1';
  if (filters && filters.from) { where += ' AND r.date >= ?'; params.push(filters.from); }
  if (filters && filters.to)   { where += ' AND r.date <= ?'; params.push(filters.to); }
  return all(
    `SELECT ri.medicine_name, SUM(ri.quantity) as qty, SUM(ri.total) as revenue,
            COUNT(DISTINCT ri.receipt_id) as sold_in
     FROM receipt_items ri JOIN receipts r ON r.id = ri.receipt_id
     ${where} GROUP BY ri.medicine_name ORDER BY revenue DESC LIMIT 50`, params);
}

function reportRetailSummary() {
  const t = new Date().toISOString().slice(0,10);
  const mStart = t.slice(0,7)+'-01';
  const yStart = t.slice(0,4)+'-01-01';
  const today  = get('SELECT COUNT(*) as cnt, COALESCE(SUM(total),0) as rev, COALESCE(SUM(discount),0) as disc FROM receipts WHERE date=?',[t]);
  const month  = get('SELECT COUNT(*) as cnt, COALESCE(SUM(total),0) as rev FROM receipts WHERE date>=?',[mStart]);
  const year   = get('SELECT COUNT(*) as cnt, COALESCE(SUM(total),0) as rev FROM receipts WHERE date>=?',[yStart]);
  const topCat = all(`SELECT m.category, SUM(ri.total) as revenue
    FROM receipt_items ri JOIN receipts r ON r.id=ri.receipt_id
    JOIN medicines m ON m.name=ri.medicine_name
    WHERE r.date>=? GROUP BY m.category ORDER BY revenue DESC LIMIT 8`,[mStart]);
  return { today, month, year, topCat };
}

function getShelfView(search) {
  const q = search ? `%${search}%` : '%';
  return all(`
    SELECT b.id as batch_id, m.id as medicine_id, b.medicine_name, b.batch_no, b.expiry_date,
           b.quantity, b.sale_price, b.purchase_price, m.generic_name, m.manufacturer
    FROM batches b JOIN medicines m ON m.id = b.medicine_id
    WHERE (b.medicine_name LIKE ? OR m.generic_name LIKE ?) AND b.quantity > 0
    ORDER BY b.medicine_name, b.expiry_date`, [q, q]);
}

// ─── FRONT DESK ───────────────────────────────────────────────────────────────

function fdInitTables() {
  db.run(`CREATE TABLE IF NOT EXISTS fd_doctors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    specialty TEXT DEFAULT '',
    fee REAL DEFAULT 0,
    active INTEGER DEFAULT 1
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS fd_lab_tests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT DEFAULT 'General',
    price REAL DEFAULT 0,
    active INTEGER DEFAULT 1
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS fd_visits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_name TEXT NOT NULL,
    father_name TEXT DEFAULT '',
    nic TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    age TEXT DEFAULT '',
    gender TEXT DEFAULT 'M',
    visit_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    subtotal REAL DEFAULT 0,
    discount REAL DEFAULT 0,
    total REAL DEFAULT 0,
    paid REAL DEFAULT 0,
    change_amount REAL DEFAULT 0,
    notes TEXT DEFAULT ''
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS fd_visit_charges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    visit_id INTEGER REFERENCES fd_visits(id),
    charge_type TEXT NOT NULL,
    description TEXT NOT NULL,
    ref_id INTEGER DEFAULT 0,
    amount REAL NOT NULL,
    qty INTEGER DEFAULT 1
  )`);

  // Seed default doctors
  const docCount = get('SELECT COUNT(*) as c FROM fd_doctors');
  if (!docCount || docCount.c === 0) {
    const doctors = [
      { name: 'Dr. Ahmad Khan', specialty: 'General Physician', fee: 500 },
      { name: 'Dr. Sara Malik', specialty: 'Gynecologist', fee: 800 },
      { name: 'Dr. Usman Ali', specialty: 'Pediatrician', fee: 600 },
      { name: 'Dr. Bilal Rehman', specialty: 'Cardiologist', fee: 1000 },
      { name: 'Dr. Hina Yousaf', specialty: 'Dermatologist', fee: 700 },
    ];
    doctors.forEach(d => db.run(
      'INSERT INTO fd_doctors(name,specialty,fee) VALUES(?,?,?)',
      [d.name, d.specialty, d.fee]
    ));
  }

  // Seed default lab tests
  const labCount = get('SELECT COUNT(*) as c FROM fd_lab_tests');
  if (!labCount || labCount.c === 0) {
    const tests = [
      { name: 'CBC (Complete Blood Count)', category: 'Haematology', price: 400 },
      { name: 'ESR', category: 'Haematology', price: 150 },
      { name: 'Blood Group', category: 'Haematology', price: 200 },
      { name: 'Haemoglobin (Hb)', category: 'Haematology', price: 150 },
      { name: 'Platelet Count', category: 'Haematology', price: 200 },
      { name: 'Peripheral Film', category: 'Haematology', price: 300 },
      { name: 'Blood Sugar Fasting (BSF)', category: 'Biochemistry', price: 200 },
      { name: 'Blood Sugar Random (BSR)', category: 'Biochemistry', price: 200 },
      { name: 'HbA1c', category: 'Biochemistry', price: 700 },
      { name: 'Lipid Profile', category: 'Biochemistry', price: 900 },
      { name: 'LFT (Liver Function Tests)', category: 'Biochemistry', price: 800 },
      { name: 'RFT (Renal Function Tests)', category: 'Biochemistry', price: 800 },
      { name: 'Serum Urea', category: 'Biochemistry', price: 250 },
      { name: 'Serum Creatinine', category: 'Biochemistry', price: 250 },
      { name: 'Serum Electrolytes', category: 'Biochemistry', price: 600 },
      { name: 'Serum Uric Acid', category: 'Biochemistry', price: 300 },
      { name: 'Thyroid Profile (T3,T4,TSH)', category: 'Hormones', price: 1200 },
      { name: 'TSH', category: 'Hormones', price: 500 },
      { name: 'Prolactin', category: 'Hormones', price: 700 },
      { name: 'Urine D/R (Urine Routine)', category: 'Urine', price: 200 },
      { name: 'Urine C/S (Culture)', category: 'Urine', price: 600 },
      { name: 'Pregnancy Test (Urine)', category: 'Urine', price: 200 },
      { name: 'Stool D/R', category: 'Stool', price: 250 },
      { name: 'Stool C/S', category: 'Stool', price: 600 },
      { name: 'Hepatitis B (HBsAg)', category: 'Serology', price: 400 },
      { name: 'Hepatitis C (Anti-HCV)', category: 'Serology', price: 400 },
      { name: 'HIV', category: 'Serology', price: 500 },
      { name: 'Widal Test', category: 'Serology', price: 300 },
      { name: 'CRP (C-Reactive Protein)', category: 'Serology', price: 400 },
      { name: 'Rheumatoid Factor (RF)', category: 'Serology', price: 400 },
      { name: 'ASOT', category: 'Serology', price: 400 },
      { name: 'Blood Culture & Sensitivity', category: 'Microbiology', price: 900 },
      { name: 'Sputum AFB', category: 'Microbiology', price: 400 },
      { name: 'Malaria Parasite (MP)', category: 'Microbiology', price: 300 },
      { name: 'Dengue NS1 Antigen', category: 'Microbiology', price: 800 },
      { name: 'Dengue IgG/IgM', category: 'Microbiology', price: 800 },
      { name: 'X-Ray Chest', category: 'Radiology', price: 500 },
      { name: 'X-Ray Spine', category: 'Radiology', price: 600 },
      { name: 'Ultrasound Abdomen', category: 'Radiology', price: 1200 },
      { name: 'Ultrasound Pelvis', category: 'Radiology', price: 1200 },
      { name: 'Ultrasound Obstetric', category: 'Radiology', price: 1500 },
      { name: 'ECG', category: 'Cardiology', price: 400 },
      { name: 'ECHO (Echocardiogram)', category: 'Cardiology', price: 2500 },
    ];
    tests.forEach(t => db.run(
      'INSERT INTO fd_lab_tests(name,category,price) VALUES(?,?,?)',
      [t.name, t.category, t.price]
    ));
  }
}

function fdGetDoctors() {
  return all('SELECT * FROM fd_doctors WHERE active=1 ORDER BY name');
}
function fdAddDoctor(d) {
  run('INSERT INTO fd_doctors(name,specialty,fee) VALUES(?,?,?)',
    [d.name, d.specialty || '', d.fee || 0]);
  persist();
}
function fdUpdateDoctor(d) {
  run('UPDATE fd_doctors SET name=?,specialty=?,fee=?,active=? WHERE id=?',
    [d.name, d.specialty || '', d.fee || 0, d.active ?? 1, d.id]);
  persist();
}
function fdDeleteDoctor(id) {
  run('UPDATE fd_doctors SET active=0 WHERE id=?', [id]);
  persist();
}

function fdGetLabTests() {
  return all('SELECT * FROM fd_lab_tests WHERE active=1 ORDER BY category,name');
}
function fdAddLabTest(t) {
  run('INSERT INTO fd_lab_tests(name,category,price) VALUES(?,?,?)',
    [t.name, t.category || 'General', t.price || 0]);
  persist();
}
function fdUpdateLabTest(t) {
  run('UPDATE fd_lab_tests SET name=?,category=?,price=?,active=? WHERE id=?',
    [t.name, t.category || 'General', t.price || 0, t.active ?? 1, t.id]);
  persist();
}
function fdDeleteLabTest(id) {
  run('UPDATE fd_lab_tests SET active=0 WHERE id=?', [id]);
  persist();
}

function fdSaveVisit(data) {
  const { patient, charges, subtotal, discount, total, paid, change_amount, notes } = data;
  run(`INSERT INTO fd_visits
    (patient_name,father_name,nic,phone,age,gender,subtotal,discount,total,paid,change_amount,notes)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`,
    [patient.name, patient.father_name || '', patient.nic || '',
     patient.phone || '', patient.age || '', patient.gender || 'M',
     subtotal || 0, discount || 0, total || 0, paid || 0, change_amount || 0, notes || '']);
  const visit = get('SELECT last_insert_rowid() as id');
  const visitId = visit.id;
  (charges || []).forEach(c => {
    run(`INSERT INTO fd_visit_charges(visit_id,charge_type,description,ref_id,amount,qty)
         VALUES(?,?,?,?,?,?)`,
      [visitId, c.type, c.description, c.ref_id || 0, c.amount, c.qty || 1]);
  });
  persist();
  return { id: visitId };
}

function fdGetVisits(filters = {}) {
  const from = filters.from || '2000-01-01';
  const to   = filters.to   || '2099-12-31';
  const q    = filters.search ? `%${filters.search}%` : '%';
  return all(`SELECT * FROM fd_visits
    WHERE date(visit_date)>=? AND date(visit_date)<=?
    AND (patient_name LIKE ? OR phone LIKE ? OR nic LIKE ?)
    ORDER BY visit_date DESC LIMIT 200`,
    [from, to, q, q, q]);
}

function fdGetVisitDetail(id) {
  const visit = get('SELECT * FROM fd_visits WHERE id=?', [id]);
  const charges = all('SELECT * FROM fd_visit_charges WHERE visit_id=?', [id]);
  return { visit, charges };
}

function fdReportSummary(filters = {}) {
  const from = filters.from || '2000-01-01';
  const to   = filters.to   || '2099-12-31';
  const overview = get(`
    SELECT COUNT(*) as total_visits, COALESCE(SUM(total),0) as total_revenue,
           COALESCE(SUM(discount),0) as total_discounts, COALESCE(SUM(paid),0) as total_collected
    FROM fd_visits WHERE date(visit_date)>=? AND date(visit_date)<=?`, [from, to]);
  const byType = all(`
    SELECT vc.charge_type, COALESCE(SUM(vc.amount*vc.qty),0) as revenue, COUNT(*) as cnt
    FROM fd_visit_charges vc JOIN fd_visits v ON v.id=vc.visit_id
    WHERE date(v.visit_date)>=? AND date(v.visit_date)<=?
    GROUP BY vc.charge_type`, [from, to]);
  const topDoctors = all(`
    SELECT vc.description as name, COALESCE(SUM(vc.amount*vc.qty),0) as revenue, COUNT(*) as visits
    FROM fd_visit_charges vc JOIN fd_visits v ON v.id=vc.visit_id
    WHERE vc.charge_type='doctor' AND date(v.visit_date)>=? AND date(v.visit_date)<=?
    GROUP BY vc.description ORDER BY revenue DESC LIMIT 8`, [from, to]);
  const topTests = all(`
    SELECT vc.description as name, COALESCE(SUM(vc.amount*vc.qty),0) as revenue, COUNT(*) as cnt
    FROM fd_visit_charges vc JOIN fd_visits v ON v.id=vc.visit_id
    WHERE vc.charge_type='lab' AND date(v.visit_date)>=? AND date(v.visit_date)<=?
    GROUP BY vc.description ORDER BY cnt DESC LIMIT 10`, [from, to]);
  return { overview, byType, topDoctors, topTests };
}

function fdReportDaily(date) {
  const d = date || new Date().toISOString().slice(0,10);
  const summary = get(`
    SELECT COUNT(*) as visits, COALESCE(SUM(total),0) as revenue,
           COALESCE(SUM(discount),0) as discounts, COALESCE(SUM(paid),0) as collected
    FROM fd_visits WHERE date(visit_date)=?`, [d]);
  const visits = all(`SELECT * FROM fd_visits WHERE date(visit_date)=? ORDER BY visit_date DESC`, [d]);
  const byType = all(`
    SELECT vc.charge_type, COALESCE(SUM(vc.amount*vc.qty),0) as revenue, COUNT(*) as cnt
    FROM fd_visit_charges vc JOIN fd_visits v ON v.id=vc.visit_id
    WHERE date(v.visit_date)=? GROUP BY vc.charge_type`, [d]);
  const items = all(`
    SELECT vc.description, vc.charge_type, COALESCE(SUM(vc.amount*vc.qty),0) as revenue, COUNT(*) as cnt
    FROM fd_visit_charges vc JOIN fd_visits v ON v.id=vc.visit_id
    WHERE date(v.visit_date)=? GROUP BY vc.description, vc.charge_type ORDER BY revenue DESC`, [d]);
  return { summary, visits, byType, items };
}

function fdReportDoctors(filters = {}) {
  const from = filters.from || '2000-01-01';
  const to   = filters.to   || '2099-12-31';
  return all(`
    SELECT vc.description as doctor, COALESCE(SUM(vc.amount*vc.qty),0) as revenue,
           COUNT(DISTINCT vc.visit_id) as visits
    FROM fd_visit_charges vc JOIN fd_visits v ON v.id=vc.visit_id
    WHERE vc.charge_type='doctor' AND date(v.visit_date)>=? AND date(v.visit_date)<=?
    GROUP BY vc.description ORDER BY revenue DESC`, [from, to]);
}

function fdReportLabTests(filters = {}) {
  const from = filters.from || '2000-01-01';
  const to   = filters.to   || '2099-12-31';
  const byCat = all(`
    SELECT t.category, COALESCE(SUM(vc.amount*vc.qty),0) as revenue, COUNT(*) as cnt
    FROM fd_visit_charges vc JOIN fd_visits v ON v.id=vc.visit_id
    LEFT JOIN fd_lab_tests t ON t.id=vc.ref_id
    WHERE vc.charge_type='lab' AND date(v.visit_date)>=? AND date(v.visit_date)<=?
    GROUP BY t.category ORDER BY revenue DESC`, [from, to]);
  const tests = all(`
    SELECT vc.description as name, COALESCE(SUM(vc.amount*vc.qty),0) as revenue, COUNT(*) as cnt
    FROM fd_visit_charges vc JOIN fd_visits v ON v.id=vc.visit_id
    WHERE vc.charge_type='lab' AND date(v.visit_date)>=? AND date(v.visit_date)<=?
    GROUP BY vc.description ORDER BY cnt DESC`, [from, to]);
  return { byCat, tests };
}

function fdReportMonthly(yearMonth) {
  const ym = yearMonth || new Date().toISOString().slice(0,7);
  const days = all(`
    SELECT date(visit_date) as day, COUNT(*) as visits,
           COALESCE(SUM(total),0) as revenue, COALESCE(SUM(discount),0) as discounts
    FROM fd_visits WHERE strftime('%Y-%m', visit_date)=?
    GROUP BY date(visit_date) ORDER BY day`, [ym]);
  const totals = get(`
    SELECT COUNT(*) as visits, COALESCE(SUM(total),0) as revenue, COALESCE(SUM(discount),0) as discounts
    FROM fd_visits WHERE strftime('%Y-%m', visit_date)=?`, [ym]);
  const doctorRevenue = get(`
    SELECT COALESCE(SUM(vc.amount*vc.qty),0) as revenue
    FROM fd_visit_charges vc JOIN fd_visits v ON v.id=vc.visit_id
    WHERE vc.charge_type='doctor' AND strftime('%Y-%m', v.visit_date)=?`, [ym]);
  const labRevenue = get(`
    SELECT COALESCE(SUM(vc.amount*vc.qty),0) as revenue
    FROM fd_visit_charges vc JOIN fd_visits v ON v.id=vc.visit_id
    WHERE vc.charge_type='lab' AND strftime('%Y-%m', v.visit_date)=?`, [ym]);
  return { days, totals, doctorRevenue, labRevenue };
}

// ─── PATHOLOGY ───────────────────────────────────────────────────────────────

function pathoInitTable() {
  db.run(`CREATE TABLE IF NOT EXISTS fd_lab_results (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    visit_id     INTEGER DEFAULT 0,
    patient_name TEXT NOT NULL,
    father_name  TEXT DEFAULT '',
    age          TEXT DEFAULT '',
    gender       TEXT DEFAULT '',
    sample_date  DATETIME DEFAULT CURRENT_TIMESTAMP,
    test_name    TEXT NOT NULL,
    category     TEXT DEFAULT 'General',
    result       TEXT DEFAULT '',
    unit         TEXT DEFAULT '',
    ref_range    TEXT DEFAULT '',
    flag         TEXT DEFAULT 'N',
    notes        TEXT DEFAULT ''
  )`);
}

function pathoSearchVisits(q) {
  const s = `%${q}%`;
  return all(`
    SELECT v.*, COUNT(vc.id) as test_count
    FROM fd_visits v
    LEFT JOIN fd_visit_charges vc ON vc.visit_id=v.id AND vc.charge_type='lab'
    WHERE v.patient_name LIKE ? OR v.nic LIKE ? OR v.phone LIKE ? OR CAST(v.id AS TEXT) LIKE ?
    GROUP BY v.id ORDER BY v.visit_date DESC LIMIT 20`, [s,s,s,s]);
}

function pathoGetVisitTests(visitId) {
  return all(`
    SELECT vc.id, vc.description as test_name, vc.ref_id,
           COALESCE(t.category,'General') as category,
           '' as unit, '' as ref_range
    FROM fd_visit_charges vc
    LEFT JOIN fd_lab_tests t ON t.id=vc.ref_id
    WHERE vc.visit_id=? AND vc.charge_type='lab'
    ORDER BY category, test_name`, [visitId]);
}

function pathoGetResults(visitId) {
  return all(`SELECT * FROM fd_lab_results WHERE visit_id=? ORDER BY category, test_name`, [visitId]);
}

function pathoSaveResults(visitId, patient, rows) {
  db.run(`DELETE FROM fd_lab_results WHERE visit_id=?`, [visitId]);
  rows.forEach(r => {
    db.run(`INSERT INTO fd_lab_results
      (visit_id,patient_name,father_name,age,gender,test_name,category,result,unit,ref_range,flag,notes)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`,
      [visitId, patient.name||'', patient.father_name||'', patient.age||'',
       patient.gender||'', r.test_name, r.category||'General',
       r.result||'', r.unit||'', r.ref_range||'', r.flag||'N', r.notes||'']);
  });
  persist();
  return { ok: true };
}

function pathoGetRecentResults(limit) {
  const n = limit || 30;
  return all(`
    SELECT visit_id, patient_name, father_name, age, gender,
           MAX(sample_date) as sample_date, COUNT(*) as test_count
    FROM fd_lab_results
    GROUP BY visit_id, patient_name
    ORDER BY sample_date DESC LIMIT ?`, [n]);
}

function pathoGetCatalogDefaults() {
  return all(`SELECT name, category,
    CASE category
      WHEN 'Haematology'  THEN 'cells/μL'
      WHEN 'Biochemistry' THEN 'mg/dL'
      WHEN 'Urine'        THEN ''
      ELSE ''
    END as unit
    FROM fd_lab_tests WHERE active=1 ORDER BY category, name`);
}

module.exports = {
  init, getDbPath,
  login,
  getDashboardStats,
  getMedicines, addMedicine, updateMedicine, deleteMedicine, searchMedicine,
  getMedicineBatches, getAllBatchesWithStock,
  getCustomers, addCustomer, updateCustomer, deleteCustomer, getCustomerLedger, addPayment,
  getSuppliers, addSupplier, updateSupplier, deleteSupplier,
  saveInvoice, getInvoices, getInvoiceDetail,
  savePurchase, getPurchases, getPurchaseDetail,
  reportSales, reportProfit, reportExpiry, reportCustomerBalances, reportStockSummary,
  saveBackupInfo, getLastBackupInfo,
  getUsers, addUser, updateUser, deleteUser,
  getSettings, saveSettings,
  saveReceipt, getReceipts, getReceiptDetail, getFinanceStats, getShelfView,
  reportRetailSales, reportTopMedicines, reportRetailSummary,
  fdGetDoctors, fdAddDoctor, fdUpdateDoctor, fdDeleteDoctor,
  fdGetLabTests, fdAddLabTest, fdUpdateLabTest, fdDeleteLabTest,
  fdSaveVisit, fdGetVisits, fdGetVisitDetail,
  fdReportSummary, fdReportDaily, fdReportDoctors, fdReportLabTests, fdReportMonthly,
  pathoSearchVisits, pathoGetVisitTests, pathoGetResults, pathoSaveResults,
  pathoGetRecentResults, pathoGetCatalogDefaults,
  lrInitTables, lrGetAdmissions, lrGetAdmission, lrSaveAdmission, lrDeleteAdmission,
  lrSaveDelivery, lrGetDelivery, lrGetStats,
  scInitTables,
  scSearchPatients, scGetPatient, scSavePatient, scDeletePatient,
  scGetProcedures, scAddProcedure, scUpdateProcedure, scDeleteProcedure,
  scSaveVisit, scGetVisit, scGetVisitByPatient, scGetRecentVisits,
  scAddEntry, scUpdateEntry, scDeleteEntry, scGetEntries
};

// ─── SEHAT CARD (Sehat Sahulat Program) ──────────────────────────────────────

function scInitTables() {
  db.run(`CREATE TABLE IF NOT EXISTS sc_patients (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    pnt_name    TEXT NOT NULL,
    father_name TEXT DEFAULT '',
    cnic        TEXT DEFAULT '',
    age         TEXT DEFAULT '',
    gender      TEXT DEFAULT 'M',
    phone       TEXT DEFAULT '',
    address     TEXT DEFAULT '',
    reg_date    DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS sc_procedures (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL,
    name_ur    TEXT DEFAULT '',
    department TEXT DEFAULT 'General',
    fee        REAL DEFAULT 0,
    active     INTEGER DEFAULT 1
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS sc_visits (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id       INTEGER REFERENCES sc_patients(id),
    ref_no           TEXT DEFAULT '',
    card_holder_nic  TEXT DEFAULT '',
    relation         TEXT DEFAULT '',
    doctor           TEXT DEFAULT '',
    refer_from       TEXT DEFAULT 'OPD',
    attendant_name   TEXT DEFAULT '',
    attendant_nic    TEXT DEFAULT '',
    attendant_rel    TEXT DEFAULT '',
    visit_date       DATETIME DEFAULT CURRENT_TIMESTAMP,
    notes            TEXT DEFAULT ''
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS sc_ssp_entries (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    visit_id       INTEGER REFERENCES sc_visits(id),
    proc_id        INTEGER DEFAULT 0,
    proc_name      TEXT NOT NULL,
    proc_name_ur   TEXT DEFAULT '',
    department     TEXT DEFAULT '',
    days           INTEGER DEFAULT 1,
    fee            REAL DEFAULT 0,
    charge_pct     REAL DEFAULT 100,
    total          REAL DEFAULT 0,
    entry_date     DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Seed procedures if none exist or old short list (<100)
  const cnt = get(`SELECT COUNT(*) as n FROM sc_procedures`);
  if (!cnt || cnt.n < 100) {
    db.run(`DELETE FROM sc_procedures`);

    const procs = [
      // ─── General Surgery ───────────────────────────────────────────────────
      ['Appendectomy (Open)',             'اپینڈکس آپریشن (اوپن)',        'General Surgery',  35000],
      ['Appendectomy (Laparoscopic)',     'اپینڈکس آپریشن (لیپرو)',       'General Surgery',  45000],
      ['Hernia Repair (Inguinal)',        'کمر ہرنیا آپریشن',             'General Surgery',  30000],
      ['Hernia Repair (Umbilical)',       'ناف ہرنیا آپریشن',             'General Surgery',  28000],
      ['Hernia Repair (Femoral)',         'فیمورل ہرنیا آپریشن',          'General Surgery',  32000],
      ['Hernia Repair (Incisional)',      'چیرے والا ہرنیا آپریشن',       'General Surgery',  40000],
      ['Laparoscopic Cholecystectomy',   'پتہ آپریشن (لیپرو)',            'General Surgery',  50000],
      ['Open Cholecystectomy',           'پتہ آپریشن (اوپن)',             'General Surgery',  40000],
      ['Hydrocele Repair',               'ہائیڈروسیل آپریشن',            'General Surgery',  25000],
      ['Circumcision',                   'ختنہ',                          'General Surgery',  10000],
      ['Abscess Drainage',               'پھوڑا آپریشن',                  'General Surgery',  15000],
      ['Wound Debridement',              'زخم صفائی',                     'General Surgery',  12000],
      ['Pilonidal Sinus Excision',       'پائلونائیڈل سائنس آپریشن',     'General Surgery',  30000],
      ['Haemorrhoidectomy',              'بواسیر آپریشن',                 'General Surgery',  28000],
      ['Fissurectomy',                   'فشر آپریشن',                    'General Surgery',  20000],
      ['Fistulectomy (Anal)',            'فسٹولا آپریشن',                 'General Surgery',  25000],
      ['Rectal Prolapse Repair',         'ملاشی آپریشن',                  'General Surgery',  35000],
      ['Thyroidectomy (Total)',           'تھائرائیڈ آپریشن',             'General Surgery',  60000],
      ['Thyroidectomy (Partial)',         'تھائرائیڈ آپریشن (جزوی)',      'General Surgery',  50000],
      ['Lymph Node Biopsy/Excision',     'غدود آپریشن',                   'General Surgery',  20000],
      ['Mastectomy (Simple)',             'چھاتی آپریشن',                  'General Surgery',  55000],
      ['Mastectomy (Modified Radical)',   'چھاتی آپریشن (جڑ سمیت)',       'General Surgery',  75000],
      ['Breast Lumpectomy',              'چھاتی کی گلٹی آپریشن',         'General Surgery',  35000],
      ['Gastrectomy (Partial)',           'معدہ آپریشن',                   'General Surgery',  80000],
      ['Colostomy',                      'آنت سوراخ آپریشن',              'General Surgery',  50000],
      ['Colostomy Closure',              'آنت سوراخ بند آپریشن',          'General Surgery',  45000],
      ['Bowel Resection',                'آنت کٹائی آپریشن',              'General Surgery',  70000],
      ['Splenectomy',                    'تلی آپریشن',                    'General Surgery',  65000],
      ['Exploratory Laparotomy',         'پیٹ کھول آپریشن',               'General Surgery',  50000],
      ['Peritoneal Lavage',              'پیٹ دھلائی آپریشن',             'General Surgery',  35000],
      ['Intestinal Obstruction Relief',  'آنت رکاوٹ آپریشن',              'General Surgery',  55000],
      ['Appendicular Abscess Drain',     'اپینڈکس پھوڑا نکاسی',          'General Surgery',  30000],
      ['Liver Abscess Drain',            'جگر پھوڑا نکاسی',               'General Surgery',  45000],
      ['Varicocelectomy',                'ویریکوسیل آپریشن',              'General Surgery',  30000],
      ['Excision of Skin Tumor',         'جلد رسولی آپریشن',              'General Surgery',  18000],
      ['Excision of Sebaceous Cyst',     'چربی گلٹی آپریشن',              'General Surgery',  15000],
      ['Amputation (BK)',                'ٹانگ کٹائی آپریشن',             'General Surgery',  40000],
      ['Amputation (AK)',                'ران کٹائی آپریشن',               'General Surgery',  45000],
      ['Tracheostomy',                   'گلے میں سوراخ آپریشن',          'General Surgery',  30000],
      ['Vascular Bypass (Peripheral)',   'خون نلی بائی پاس آپریشن',       'General Surgery',  80000],
      // ─── Gynecology & Obstetrics ─────────────────────────────────────────
      ['Normal Delivery',                'نارمل ڈیلیوری',                  'Gynecology',       20000],
      ['C-Section (LSCS)',               'آپریشن ڈیلیوری',                 'Gynecology',       45000],
      ['C-Section (Emergency)',          'ہنگامی آپریشن ڈیلیوری',          'Gynecology',       55000],
      ['D&C (Dilation & Curettage)',     'رحم صفائی آپریشن',               'Gynecology',       20000],
      ['Hysterectomy (Abdominal)',       'بچہ دانی آپریشن (پیٹ سے)',       'Gynecology',       60000],
      ['Hysterectomy (Vaginal)',         'بچہ دانی آپریشن (نیچے سے)',      'Gynecology',       55000],
      ['Myomectomy',                     'رحم رسولی آپریشن',               'Gynecology',       50000],
      ['Tubectomy (Sterilization)',      'نس بندی آپریشن',                  'Gynecology',       25000],
      ['Ectopic Pregnancy Surgery',      'ایکٹوپک حمل آپریشن',             'Gynecology',       50000],
      ['Ovarian Cystectomy',             'انڈے دانی رسولی آپریشن',         'Gynecology',       45000],
      ['Ovarian Cyst Drainage',          'انڈے دانی پانی نکاسی',           'Gynecology',       30000],
      ['Repair of Uterine Rupture',      'رحم پھٹنے کا آپریشن',            'Gynecology',       65000],
      ['Cervical Cerclage',              'گردن رحم ٹانکا آپریشن',           'Gynecology',       35000],
      ['Bartholin Cyst Drainage',        'بارتھولین رسولی نکاسی',          'Gynecology',       18000],
      ['Pelvic Floor Repair',            'پیڑو آپریشن',                    'Gynecology',       50000],
      ['Uterine Prolapse Repair',        'رحم گرنے کا آپریشن',             'Gynecology',       55000],
      ['Vesico-Vaginal Fistula Repair',  'پیشاب راستہ آپریشن',             'Gynecology',       65000],
      ['Laparoscopic Sterilization',     'لیپرواسکوپک نس بندی',            'Gynecology',       30000],
      ['Management of PPH',              'نفاس خون روکنے کا علاج',         'Gynecology',       40000],
      ['Perineal Repair (3rd/4th deg)', 'زیریں حصہ ٹانکے آپریشن',         'Gynecology',       25000],
      // ─── Orthopedic ──────────────────────────────────────────────────────
      ['Fracture Femur (ORIF)',          'ران ہڈی جوڑ آپریشن',             'Orthopedic',       65000],
      ['Fracture Tibia (ORIF)',          'پنڈلی ہڈی جوڑ آپریشن',           'Orthopedic',       55000],
      ['Fracture Radius/Ulna (ORIF)',    'بازو ہڈی جوڑ آپریشن',            'Orthopedic',       45000],
      ['Fracture Humerus (ORIF)',        'اوپری بازو ہڈی آپریشن',          'Orthopedic',       55000],
      ['Fracture Clavicle (ORIF)',       'کالر ہڈی آپریشن',                'Orthopedic',       40000],
      ['Fracture Patella (ORIF)',        'گھٹنے کی ٹوپی آپریشن',           'Orthopedic',       45000],
      ['Hip Replacement (Total)',        'ہپ ریپلیسمنٹ',                   'Orthopedic',      120000],
      ['Hip Replacement (Hemi)',         'ہپ ریپلیسمنٹ (جزوی)',            'Orthopedic',       90000],
      ['Knee Replacement (TKR)',         'گھٹنہ ریپلیسمنٹ',               'Orthopedic',      120000],
      ['Shoulder Replacement',           'کندھا ریپلیسمنٹ',               'Orthopedic',      110000],
      ['Plaster Application (POP)',      'پلاستر',                         'Orthopedic',        8000],
      ['Arthroscopy (Knee)',             'گھٹنہ آرتھروسکوپی',              'Orthopedic',       45000],
      ['Arthroscopy (Shoulder)',         'کندھا آرتھروسکوپی',              'Orthopedic',       50000],
      ['Meniscectomy',                   'گھٹنہ مینسکس آپریشن',            'Orthopedic',       40000],
      ['ACL Reconstruction',             'اے سی ایل آپریشن',               'Orthopedic',       70000],
      ['DHS Fixation (Hip Fracture)',    'ہپ ڈی ایچ ایس آپریشن',           'Orthopedic',       60000],
      ['IM Nailing (Femur/Tibia)',       'ہڈی کیل آپریشن',                 'Orthopedic',       55000],
      ['Spine Surgery (Discectomy)',     'ریڑھ کی ہڈی آپریشن',             'Orthopedic',       80000],
      ['Spine Fusion (PLIF/TLIF)',       'ریڑھ ہڈی جوڑ آپریشن',            'Orthopedic',      120000],
      ['Scoliosis Correction',           'ریڑھ ہڈی ٹیڑھ آپریشن',           'Orthopedic',      150000],
      ['Trigger Finger Release',         'انگلی اکڑن آپریشن',              'Orthopedic',       15000],
      ['Carpal Tunnel Release',          'کارپل ٹنل آپریشن',               'Orthopedic',       25000],
      ['Tendon Repair',                  'پٹھا جوڑ آپریشن',                'Orthopedic',       35000],
      ['External Fixation',              'بیرونی ہڈی فکسیشن',              'Orthopedic',       35000],
      ['Bone Graft',                     'ہڈی پیوند آپریشن',               'Orthopedic',       45000],
      ['Sequestrectomy (Osteomyelitis)', 'ہڈی پیپ آپریشن',                 'Orthopedic',       40000],
      ['Amputation (Digit)',             'انگلی کٹائی آپریشن',             'Orthopedic',       15000],
      // ─── Ophthalmology ───────────────────────────────────────────────────
      ['Cataract Surgery (Phaco)',       'موتیا آپریشن (فیکو)',             'Ophthalmology',    25000],
      ['Cataract Surgery (ECCE)',        'موتیا آپریشن (ای سی سی ای)',     'Ophthalmology',    20000],
      ['Cataract Surgery (SICS)',        'موتیا آپریشن (ایس آئی سی ایس)', 'Ophthalmology',    18000],
      ['Pterygium Excision',             'آنکھ جھلی آپریشن',               'Ophthalmology',    20000],
      ['Glaucoma Surgery (Trab)',        'گلاکوما ٹریبکیولیکٹومی',         'Ophthalmology',    40000],
      ['Strabismus Correction',          'بھینگا آپریشن',                   'Ophthalmology',    30000],
      ['Entropion/Ectropion Repair',     'پپوٹا آپریشن',                   'Ophthalmology',    22000],
      ['Chalazion Excision',             'آنکھ گلٹی آپریشن',               'Ophthalmology',    12000],
      ['Dacryocystorhinostomy (DCR)',    'آنسو نلی آپریشن',                'Ophthalmology',    35000],
      ['Retinal Detachment Surgery',     'ریٹنا آپریشن',                   'Ophthalmology',    60000],
      ['Corneal Transplant',             'آنکھ پیوند آپریشن',              'Ophthalmology',    80000],
      ['Vitrectomy',                     'آنکھ اندرونی آپریشن',            'Ophthalmology',    70000],
      ['Evisceration / Enucleation',    'آنکھ نکالنے کا آپریشن',           'Ophthalmology',    30000],
      ['Eyelid Repair',                  'پپوٹا ٹانکا آپریشن',             'Ophthalmology',    18000],
      ['Sub-Tenon Injection',            'آنکھ انجکشن',                    'Ophthalmology',     8000],
      // ─── ENT ─────────────────────────────────────────────────────────────
      ['Tonsillectomy',                  'ٹانسل آپریشن',                   'ENT',              20000],
      ['Tonsillectomy & Adenoidectomy', 'ٹانسل اور ایڈینائیڈ آپریشن',    'ENT',              28000],
      ['Adenoidectomy',                  'ایڈینائیڈ آپریشن',               'ENT',              18000],
      ['Septoplasty',                    'ناک پردہ آپریشن',                'ENT',              35000],
      ['Rhinoplasty (Functional)',       'ناک آپریشن',                     'ENT',              45000],
      ['FESS (Sinus Surgery)',           'سائنس آپریشن',                   'ENT',              40000],
      ['Myringotomy with Grommet',      'کان پردہ آپریشن',                'ENT',              15000],
      ['Mastoidectomy',                  'کان ہڈی آپریشن',                 'ENT',              50000],
      ['Tympanoplasty',                  'کان پردہ جوڑ آپریشن',            'ENT',              45000],
      ['Ossiculoplasty',                 'کان ہڈی چین آپریشن',             'ENT',              50000],
      ['Laryngoscopy + Biopsy',         'گلے کیمرہ اور ٹکڑا',             'ENT',              20000],
      ['Microlaryngoscopy',              'مائیکرولیرینگوسکوپی',            'ENT',              35000],
      ['Foreign Body Removal (Ear)',    'کان اجنبی چیز نکالنا',            'ENT',              10000],
      ['Foreign Body Removal (Nose)',   'ناک اجنبی چیز نکالنا',            'ENT',              10000],
      ['Nasal Polyp Excision',          'ناک پھول آپریشن',                'ENT',              25000],
      ['Parotid Gland Surgery',         'کان کے سامنے غدود آپریشن',       'ENT',              55000],
      ['Submandibular Gland Surgery',   'جبڑے غدود آپریشن',               'ENT',              50000],
      ['Tracheostomy (ENT)',             'گلے میں سوراخ آپریشن',           'ENT',              30000],
      ['Cochlear Implant',              'کان امپلانٹ',                     'ENT',             200000],
      // ─── Urology ─────────────────────────────────────────────────────────
      ['Nephrolithiasis (PCNL)',         'گردے پتھری (پی سی این ایل)',    'Urology',          60000],
      ['Nephrolithiasis (ESWL)',         'گردے پتھری (ای ایس ڈبلیو ایل)','Urology',          25000],
      ['URS (Ureteroscopy)',             'پیشاب نلی کیمرہ آپریشن',        'Urology',          40000],
      ['TURP (Prostate)',                'پروسٹیٹ آپریشن (ٹی یو آر پی)',  'Urology',          55000],
      ['Prostatectomy (Open)',           'پروسٹیٹ آپریشن (اوپن)',          'Urology',          65000],
      ['Nephrectomy (Simple)',           'گردہ نکالنا آپریشن',             'Urology',          70000],
      ['Nephrectomy (Radical)',          'گردہ جڑ سمیت آپریشن',            'Urology',          90000],
      ['Pyeloplasty',                   'گردے پیلیس آپریشن',              'Urology',          60000],
      ['Cystolithotripsy',              'مثانہ پتھری آپریشن',             'Urology',          35000],
      ['Cystoscopy + Biopsy',           'مثانہ کیمرہ اور ٹکڑا',           'Urology',          20000],
      ['Hypospadias Repair',            'ہائپوسپیڈیاس آپریشن',            'Urology',          40000],
      ['Urethral Stricture (OIU)',      'پیشاب رکاوٹ آپریشن',             'Urology',          30000],
      ['Urethral Stricture Urethroplasty','پیشاب نلی آپریشن',             'Urology',          55000],
      ['Orchidopexy (Undescended Testis)','خصیہ آپریشن',                  'Urology',          30000],
      ['Orchidectomy',                  'خصیہ نکالنا آپریشن',              'Urology',          25000],
      ['Varicocelectomy',               'ویریکوسیل آپریشن',               'Urology',          30000],
      ['Cystectomy (Bladder)',           'مثانہ نکالنا آپریشن',            'Urology',         100000],
      ['Nephroureterectomy',            'گردہ نلی آپریشن',                 'Urology',          90000],
      ['DJ Stent Insertion/Removal',    'ڈی جے اسٹینٹ آپریشن',            'Urology',          20000],
      // ─── Cardiology / Cardiac Surgery ────────────────────────────────────
      ['Coronary Angioplasty (PTCA)',    'دل کی نلی کھول آپریشن',          'Cardiology',      150000],
      ['Coronary Bypass (CABG)',         'دل کا بائی پاس آپریشن',          'Cardiology',      300000],
      ['Pacemaker Insertion',           'دل مشین لگانا',                   'Cardiology',      120000],
      ['Pacemaker Change',              'دل مشین تبدیل کرنا',              'Cardiology',       80000],
      ['Valve Replacement (Open)',       'دل والو آپریشن',                  'Cardiology',      250000],
      ['Valve Repair',                  'دل والو مرمت آپریشن',             'Cardiology',      200000],
      ['PDA Ligation',                  'دل نلی بند آپریشن',               'Cardiology',      100000],
      ['ASD Closure',                   'دل سوراخ بند آپریشن',             'Cardiology',      150000],
      ['VSD Closure',                   'دل سوراخ (وی ایس ڈی) آپریشن',   'Cardiology',      150000],
      ['Cardiac Catheterization',       'دل کیتھیٹر',                     'Cardiology',       50000],
      ['Acute MI Management (Thrombo)', 'دل کا دورہ (تھرومبو) علاج',      'Cardiology',       80000],
      ['CCU Management',                'دل وارڈ علاج',                    'Cardiology',       50000],
      // ─── Neurology / Neurosurgery ─────────────────────────────────────────
      ['Craniotomy',                    'دماغ آپریشن',                     'Neurosurgery',    150000],
      ['VP Shunt',                      'دماغ شنٹ آپریشن',                 'Neurosurgery',     80000],
      ['Burr Hole (EDH/SDH)',           'دماغ خون نکاسی آپریشن',           'Neurosurgery',     60000],
      ['Laminectomy / Discectomy',      'ریڑھ ہڈی آپریشن',                 'Neurosurgery',     80000],
      ['Spine Fixation',                'ریڑھ ہڈی پکڑ آپریشن',             'Neurosurgery',    120000],
      ['Brain Tumor Resection',         'دماغ رسولی آپریشن',               'Neurosurgery',    200000],
      ['Stroke Management (Ischemic)',  'فالج علاج (خون کی کمی)',           'Neurosurgery',     70000],
      ['Stroke Management (Hemorrhagic)','فالج علاج (خون)',                'Neurosurgery',     80000],
      ['Head Injury Management',        'سر چوٹ علاج',                    'Neurosurgery',     60000],
      ['Epilepsy Surgery',              'مرگی آپریشن',                     'Neurosurgery',    100000],
      ['Stereotactic Biopsy',           'دماغ ٹکڑا آپریشن',                'Neurosurgery',     80000],
      // ─── Pediatric Surgery ────────────────────────────────────────────────
      ['Neonatal Surgery (General)',    'نوزائیدہ بچہ آپریشن',             'Pediatrics',       45000],
      ['Neonatal Care (NICU)',          'نوزائیدہ بچہ دیکھ بھال',          'Pediatrics',       35000],
      ['Cleft Lip Repair',             'کٹے ہونٹ آپریشن',                  'Pediatrics',       40000],
      ['Cleft Palate Repair',          'کٹے تالو آپریشن',                  'Pediatrics',       50000],
      ['Hypertrophic Pyloric Stenosis', 'بچوں کا پیلورس آپریشن',           'Pediatrics',       45000],
      ['Intussusception (Reduction)',   'آنت چڑھنے کا آپریشن',             'Pediatrics',       40000],
      ['Hirschsprung Disease Surgery',  'آنت اعصاب آپریشن',                'Pediatrics',       70000],
      ['Meningocele/Myelomeningocele',  'ریڑھ ہڈی بیماری آپریشن',          'Pediatrics',       80000],
      ['Hydrocephalus (VP Shunt)',      'پانی سر آپریشن',                  'Pediatrics',       70000],
      ['Anorectal Malformation Repair', 'پیدائشی مقعد آپریشن',             'Pediatrics',       55000],
      ['Pediatric Appendectomy',       'بچوں کا اپینڈکس آپریشن',          'Pediatrics',       35000],
      ['Pediatric Hernia Repair',      'بچوں کا ہرنیا آپریشن',            'Pediatrics',       25000],
      ['Pediatric Circumcision',       'بچوں کا ختنہ',                    'Pediatrics',        8000],
      ['Tracheo-Esophageal Fistula',   'خوراک نلی آپریشن',                'Pediatrics',       80000],
      ['Pediatric Burns Management',   'بچوں جلنے کا علاج',               'Pediatrics',       50000],
      ['Patent Ductus Arteriosus (PDA)','دل نلی بچہ آپریشن',             'Pediatrics',      100000],
      // ─── Medical (IPD) ────────────────────────────────────────────────────
      ['Acute MI Management',           'دل کا دورہ علاج',                'Medical IPD',      80000],
      ['Dengue Fever Management',       'ڈینگی بخار علاج',                'Medical IPD',      25000],
      ['Typhoid Fever Management',      'ٹائیفائیڈ علاج',                 'Medical IPD',      20000],
      ['Pneumonia Treatment',           'نمونیا علاج',                    'Medical IPD',      30000],
      ['Respiratory Failure (ICU)',     'سانس فیل آئی سی یو',             'Medical IPD',      80000],
      ['Diabetic Ketoacidosis (DKA)',   'شوگر پیچیدگی علاج',              'Medical IPD',      40000],
      ['Hepatic Failure Management',    'جگر فیل علاج',                   'Medical IPD',      70000],
      ['Renal Failure (Dialysis)',      'گردہ فیل ڈائیلیسس',              'Medical IPD',      60000],
      ['Meningitis Treatment',          'دماغی بخار علاج',                'Medical IPD',      50000],
      ['Malaria (Complicated)',          'ملیریا پیچیدہ علاج',             'Medical IPD',      30000],
      ['Asthma (Severe Attack)',        'دمہ شدید علاج',                  'Medical IPD',      25000],
      ['Anaphylaxis Management',        'الرجی شاک علاج',                 'Medical IPD',      20000],
      ['Septicemia Management',         'خون زہر علاج',                   'Medical IPD',      60000],
      ['Pancreatitis (Acute)',          'لبلبہ سوزش علاج',                'Medical IPD',      50000],
      ['GI Bleed Management',           'معدہ خون بہنا علاج',             'Medical IPD',      40000],
      ['Liver Cirrhosis Management',    'جگر سکڑنا علاج',                 'Medical IPD',      60000],
      ['Tuberculosis (IPD)',            'ٹی بی علاج داخل',                'Medical IPD',      40000],
      ['Stroke Rehabilitation (IPD)',   'فالج بحالی علاج',                'Medical IPD',      50000],
      ['Epilepsy Status Management',    'مرگی دورہ علاج',                 'Medical IPD',      30000],
      // ─── Burns ────────────────────────────────────────────────────────────
      ['Burns Management (<20% BSA)',   'جلنے کا علاج (20 فیصد سے کم)',   'Burns',            50000],
      ['Burns Management (20-40% BSA)', 'جلنے کا علاج (20-40 فیصد)',      'Burns',            80000],
      ['Burns Management (>40% BSA)',   'جلنے کا علاج (40 فیصد سے زیادہ)','Burns',           120000],
      ['Skin Grafting (Split Thickness)','جلد پیوند آپریشن',               'Burns',            45000],
      ['Escharotomy',                   'جلے ہوئے حصے کا آپریشن',          'Burns',            30000],
      ['Contracture Release',           'جلنے کے بعد سکڑن آپریشن',        'Burns',            40000],
      // ─── Cancer / Oncology ───────────────────────────────────────────────
      ['Chemotherapy Session',          'کیموتھراپی',                      'Oncology',         40000],
      ['Radiotherapy Session',          'ریڈیوتھراپی',                    'Oncology',         30000],
      ['Mastectomy for Cancer',         'سرطانی چھاتی آپریشن',             'Oncology',         90000],
      ['Laryngectomy (Cancer)',         'گلے کا سرطانی آپریشن',            'Oncology',        100000],
      ['Whipple Procedure',             'لبلبہ سرطانی آپریشن',             'Oncology',        200000],
      ['Colectomy for Cancer',          'آنت سرطانی آپریشن',               'Oncology',        100000],
      ['Nephrectomy for Cancer',        'گردہ سرطانی آپریشن',              'Oncology',        100000],
      ['Cystectomy for Cancer',         'مثانہ سرطانی آپریشن',             'Oncology',        120000],
      ['Bone Marrow Biopsy',            'ہڈی گودا ٹکڑا',                   'Oncology',         15000],
      ['Lymphoma Management',           'غدود سرطان علاج',                 'Oncology',         60000],
      ['Leukemia Management',           'خون کا سرطان علاج',               'Oncology',         70000],
      ['Palliative Care (IPD)',          'آرام دیہ علاج',                  'Oncology',         30000],
      // ─── Transplant ──────────────────────────────────────────────────────
      ['Kidney Transplant',             'گردہ پیوند',                      'Transplant',      500000],
      ['Liver Transplant',              'جگر پیوند',                       'Transplant',      800000],
      ['Corneal Transplant (Trans)',     'آنکھ قرنیہ پیوند',               'Transplant',       80000],
      ['Bone Marrow Transplant',        'ہڈی گودا پیوند',                  'Transplant',      600000],
      // ─── Dental ──────────────────────────────────────────────────────────
      ['Dental Extraction',             'دانت نکالنا',                    'Dental',             5000],
      ['Impacted Wisdom Tooth',         'دانت عقل آپریشن',                'Dental',            15000],
      ['Jaw Fracture Fixation',         'جبڑہ ہڈی آپریشن',               'Dental',            45000],
      ['Dental Implant',                'دانت لگانا',                     'Dental',            40000],
      ['Cleft Lip/Palate (Dental)',     'کٹے ہونٹ دانت علاج',             'Dental',            20000],
      // ─── Dermatology ─────────────────────────────────────────────────────
      ['Skin Grafting',                 'جلد پیوند',                      'Dermatology',       35000],
      ['Excision of Melanoma',          'سرطانی تل آپریشن',               'Dermatology',       25000],
      ['Keloid Excision',               'کیلوئیڈ آپریشن',                 'Dermatology',       20000],
      ['Nail Avulsion',                 'ناخن آپریشن',                    'Dermatology',        8000],
      ['Incision & Drainage (Skin)',    'جلد پھوڑا نکاسی',                'Dermatology',       10000],
      // ─── Radiology / Interventional ──────────────────────────────────────
      ['Angiography (Diagnostic)',      'انجیوگرافی',                     'Radiology',         35000],
      ['Angioplasty (Peripheral)',      'انجیوپلاسٹی',                    'Radiology',         80000],
      ['CT Guided Biopsy',              'سی ٹی بائیوپسی',                 'Radiology',         25000],
      ['Ultrasound Guided Aspiration',  'الٹراساؤنڈ نکاسی',               'Radiology',         15000],
      ['Thrombolysis',                  'جمے خون علاج',                   'Radiology',         40000],
    ];
    procs.forEach(([name, name_ur, dept, fee]) => {
      db.run(`INSERT INTO sc_procedures(name,name_ur,department,fee) VALUES(?,?,?,?)`, [name, name_ur, dept, fee]);
    });
  }
}

// ── PATIENTS ────────────────────────────────────────────────────────────────
function scSearchPatients(q) {
  const s = `%${q}%`;
  return all(`SELECT * FROM sc_patients WHERE pnt_name LIKE ? OR cnic LIKE ? OR phone LIKE ?
              ORDER BY reg_date DESC LIMIT 30`, [s,s,s]);
}
function scGetPatient(id) { return get(`SELECT * FROM sc_patients WHERE id=?`, [id]); }
function scSavePatient(d) {
  if (d.id) {
    db.run(`UPDATE sc_patients SET pnt_name=?,father_name=?,cnic=?,age=?,gender=?,phone=?,address=? WHERE id=?`,
      [d.pnt_name,d.father_name,d.cnic,d.age,d.gender,d.phone,d.address,d.id]);
  } else {
    db.run(`INSERT INTO sc_patients(pnt_name,father_name,cnic,age,gender,phone,address) VALUES(?,?,?,?,?,?,?)`,
      [d.pnt_name,d.father_name||'',d.cnic||'',d.age||'',d.gender||'M',d.phone||'',d.address||'']);
  }
  persist();
  return get(`SELECT * FROM sc_patients ORDER BY id DESC LIMIT 1`);
}
function scDeletePatient(id) { db.run(`DELETE FROM sc_patients WHERE id=?`,[id]); persist(); }

// ── PROCEDURES ───────────────────────────────────────────────────────────────
function scGetProcedures() { return all(`SELECT * FROM sc_procedures WHERE active=1 ORDER BY department,name`); }
function scAddProcedure(d) {
  db.run(`INSERT INTO sc_procedures(name,name_ur,department,fee) VALUES(?,?,?,?)`,
    [d.name,d.name_ur||'',d.department||'General',d.fee||0]);
  persist();
}
function scUpdateProcedure(d) {
  db.run(`UPDATE sc_procedures SET name=?,name_ur=?,department=?,fee=? WHERE id=?`,
    [d.name,d.name_ur||'',d.department||'General',d.fee||0,d.id]);
  persist();
}
function scDeleteProcedure(id) { db.run(`UPDATE sc_procedures SET active=0 WHERE id=?`,[id]); persist(); }

// ── VISITS ───────────────────────────────────────────────────────────────────
function scSaveVisit(d) {
  if (d.id) {
    db.run(`UPDATE sc_visits SET ref_no=?,card_holder_nic=?,relation=?,doctor=?,refer_from=?,
            attendant_name=?,attendant_nic=?,attendant_rel=?,notes=? WHERE id=?`,
      [d.ref_no||'',d.card_holder_nic||'',d.relation||'',d.doctor||'',d.refer_from||'OPD',
       d.attendant_name||'',d.attendant_nic||'',d.attendant_rel||'',d.notes||'',d.id]);
  } else {
    db.run(`INSERT INTO sc_visits(patient_id,ref_no,card_holder_nic,relation,doctor,refer_from,attendant_name,attendant_nic,attendant_rel,notes)
            VALUES(?,?,?,?,?,?,?,?,?,?)`,
      [d.patient_id,d.ref_no||'',d.card_holder_nic||'',d.relation||'',d.doctor||'',d.refer_from||'OPD',
       d.attendant_name||'',d.attendant_nic||'',d.attendant_rel||'',d.notes||'']);
  }
  persist();
  return get(`SELECT * FROM sc_visits ORDER BY id DESC LIMIT 1`);
}
function scGetVisit(id) { return get(`SELECT * FROM sc_visits WHERE id=?`,[id]); }
function scGetVisitByPatient(patientId) {
  return get(`SELECT * FROM sc_visits WHERE patient_id=? ORDER BY id DESC LIMIT 1`,[patientId]);
}
function scGetRecentVisits(limit) {
  return all(`SELECT v.*, p.pnt_name, p.father_name, p.cnic, p.age, p.gender, p.phone,
              (SELECT COUNT(*) FROM sc_ssp_entries e WHERE e.visit_id=v.id) as entry_count,
              (SELECT COALESCE(SUM(e.total),0) FROM sc_ssp_entries e WHERE e.visit_id=v.id) as total_amount
              FROM sc_visits v JOIN sc_patients p ON p.id=v.patient_id
              ORDER BY v.visit_date DESC LIMIT ?`, [limit||50]);
}

// ── SSP ENTRIES ──────────────────────────────────────────────────────────────
function scGetEntries(visitId) {
  return all(`SELECT * FROM sc_ssp_entries WHERE visit_id=? ORDER BY id`, [visitId]);
}
function scAddEntry(d) {
  const total = (d.days||1) * (d.fee||0) * (d.charge_pct||100) / 100;
  db.run(`INSERT INTO sc_ssp_entries(visit_id,proc_id,proc_name,proc_name_ur,department,days,fee,charge_pct,total)
          VALUES(?,?,?,?,?,?,?,?,?)`,
    [d.visit_id,d.proc_id||0,d.proc_name,d.proc_name_ur||'',d.department||'',
     d.days||1,d.fee||0,d.charge_pct||100,total]);
  persist();
  return get(`SELECT * FROM sc_ssp_entries ORDER BY id DESC LIMIT 1`);
}
function scUpdateEntry(d) {
  const total = (d.days||1) * (d.fee||0) * (d.charge_pct||100) / 100;
  db.run(`UPDATE sc_ssp_entries SET proc_id=?,proc_name=?,proc_name_ur=?,department=?,days=?,fee=?,charge_pct=?,total=? WHERE id=?`,
    [d.proc_id||0,d.proc_name,d.proc_name_ur||'',d.department||'',
     d.days||1,d.fee||0,d.charge_pct||100,total,d.id]);
  persist();
}
function scDeleteEntry(id) { db.run(`DELETE FROM sc_ssp_entries WHERE id=?`,[id]); persist(); }

// ─── LABOUR ROOM ──────────────────────────────────────────────────────────────

function lrInitTables() {
  db.run(`CREATE TABLE IF NOT EXISTS lr_admissions (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_name     TEXT NOT NULL,
    husband_name     TEXT DEFAULT '',
    age              INTEGER DEFAULT 0,
    phone            TEXT DEFAULT '',
    address          TEXT DEFAULT '',
    gravida          INTEGER DEFAULT 1,
    para             INTEGER DEFAULT 0,
    gest_age         INTEGER DEFAULT 0,
    admission_date   TEXT NOT NULL,
    admission_type   TEXT DEFAULT 'normal',
    doctor           TEXT DEFAULT '',
    midwife          TEXT DEFAULT '',
    refer_from       TEXT DEFAULT '',
    bp               TEXT DEFAULT '',
    status           TEXT DEFAULT 'admitted',
    notes            TEXT DEFAULT '',
    created_at       TEXT DEFAULT (datetime('now','localtime'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS lr_deliveries (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    admission_id     INTEGER NOT NULL REFERENCES lr_admissions(id),
    delivery_date    TEXT NOT NULL,
    delivery_type    TEXT DEFAULT 'svd',
    baby_gender      TEXT DEFAULT 'M',
    baby_weight      REAL DEFAULT 0,
    apgar_score      TEXT DEFAULT '',
    baby_condition   TEXT DEFAULT 'alive',
    complications    TEXT DEFAULT '',
    mother_condition TEXT DEFAULT '',
    discharge_date   TEXT DEFAULT '',
    charges          REAL DEFAULT 0,
    notes            TEXT DEFAULT '',
    created_at       TEXT DEFAULT (datetime('now','localtime'))
  )`);
}

function lrGetAdmissions(filter = {}) {
  const { search = '', status = '', date_from = '', date_to = '' } = filter;
  let q = `SELECT a.*, d.delivery_type, d.delivery_date, d.baby_gender, d.id as delivery_id
           FROM lr_admissions a
           LEFT JOIN lr_deliveries d ON d.admission_id = a.id
           WHERE 1=1`;
  const p = [];
  if (search) { q += ` AND (a.patient_name LIKE ? OR a.husband_name LIKE ? OR a.phone LIKE ?)`; const s = `%${search}%`; p.push(s,s,s); }
  if (status) { q += ` AND a.status = ?`; p.push(status); }
  if (date_from) { q += ` AND DATE(a.admission_date) >= ?`; p.push(date_from); }
  if (date_to)   { q += ` AND DATE(a.admission_date) <= ?`; p.push(date_to); }
  q += ` ORDER BY a.id DESC LIMIT 200`;
  return all(q, p);
}

function lrGetAdmission(id) {
  const a = get(`SELECT * FROM lr_admissions WHERE id=?`, [id]);
  const d = get(`SELECT * FROM lr_deliveries WHERE admission_id=?`, [id]);
  return { admission: a, delivery: d || null };
}

function lrSaveAdmission(data) {
  if (data.id) {
    db.run(`UPDATE lr_admissions SET patient_name=?,husband_name=?,age=?,phone=?,address=?,
            gravida=?,para=?,gest_age=?,admission_date=?,admission_type=?,
            doctor=?,midwife=?,refer_from=?,bp=?,status=?,notes=? WHERE id=?`,
      [data.patient_name, data.husband_name||'', data.age||0, data.phone||'', data.address||'',
       data.gravida||1, data.para||0, data.gest_age||0, data.admission_date,
       data.admission_type||'normal', data.doctor||'', data.midwife||'',
       data.refer_from||'', data.bp||'', data.status||'admitted', data.notes||'', data.id]);
    persist();
    return get(`SELECT * FROM lr_admissions WHERE id=?`, [data.id]);
  }
  db.run(`INSERT INTO lr_admissions
    (patient_name,husband_name,age,phone,address,gravida,para,gest_age,
     admission_date,admission_type,doctor,midwife,refer_from,bp,status,notes)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [data.patient_name, data.husband_name||'', data.age||0, data.phone||'', data.address||'',
     data.gravida||1, data.para||0, data.gest_age||0, data.admission_date,
     data.admission_type||'normal', data.doctor||'', data.midwife||'',
     data.refer_from||'', data.bp||'', 'admitted', data.notes||'']);
  persist();
  return get(`SELECT * FROM lr_admissions ORDER BY id DESC LIMIT 1`);
}

function lrDeleteAdmission(id) {
  db.run(`DELETE FROM lr_deliveries WHERE admission_id=?`, [id]);
  db.run(`DELETE FROM lr_admissions WHERE id=?`, [id]);
  persist();
}

function lrSaveDelivery(data) {
  const existing = get(`SELECT id FROM lr_deliveries WHERE admission_id=?`, [data.admission_id]);
  if (existing) {
    db.run(`UPDATE lr_deliveries SET delivery_date=?,delivery_type=?,baby_gender=?,baby_weight=?,
            apgar_score=?,baby_condition=?,complications=?,mother_condition=?,
            discharge_date=?,charges=?,notes=? WHERE admission_id=?`,
      [data.delivery_date, data.delivery_type||'svd', data.baby_gender||'M', data.baby_weight||0,
       data.apgar_score||'', data.baby_condition||'alive', data.complications||'',
       data.mother_condition||'', data.discharge_date||'', data.charges||0,
       data.notes||'', data.admission_id]);
  } else {
    db.run(`INSERT INTO lr_deliveries
      (admission_id,delivery_date,delivery_type,baby_gender,baby_weight,apgar_score,
       baby_condition,complications,mother_condition,discharge_date,charges,notes)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`,
      [data.admission_id, data.delivery_date, data.delivery_type||'svd', data.baby_gender||'M',
       data.baby_weight||0, data.apgar_score||'', data.baby_condition||'alive',
       data.complications||'', data.mother_condition||'', data.discharge_date||'',
       data.charges||0, data.notes||'']);
  }
  const status = data.discharge_date ? 'discharged' : 'delivered';
  db.run(`UPDATE lr_admissions SET status=? WHERE id=?`, [status, data.admission_id]);
  persist();
  return get(`SELECT * FROM lr_deliveries WHERE admission_id=?`, [data.admission_id]);
}

function lrGetDelivery(admissionId) {
  return get(`SELECT * FROM lr_deliveries WHERE admission_id=?`, [admissionId]);
}

function lrGetStats(dateFrom, dateTo) {
  const p = [dateFrom || '2000-01-01', dateTo || '2099-12-31'];
  const total     = get(`SELECT COUNT(*) as c FROM lr_admissions WHERE DATE(admission_date) BETWEEN ? AND ?`, p);
  const delivered = get(`SELECT COUNT(*) as c FROM lr_admissions WHERE status IN ('delivered','discharged') AND DATE(admission_date) BETWEEN ? AND ?`, p);
  const svd       = get(`SELECT COUNT(*) as c FROM lr_deliveries d JOIN lr_admissions a ON a.id=d.admission_id WHERE d.delivery_type='svd' AND DATE(a.admission_date) BETWEEN ? AND ?`, p);
  const lscs      = get(`SELECT COUNT(*) as c FROM lr_deliveries d JOIN lr_admissions a ON a.id=d.admission_id WHERE d.delivery_type='lscs' AND DATE(a.admission_date) BETWEEN ? AND ?`, p);
  const boys      = get(`SELECT COUNT(*) as c FROM lr_deliveries d JOIN lr_admissions a ON a.id=d.admission_id WHERE d.baby_gender='M' AND DATE(a.admission_date) BETWEEN ? AND ?`, p);
  const girls     = get(`SELECT COUNT(*) as c FROM lr_deliveries d JOIN lr_admissions a ON a.id=d.admission_id WHERE d.baby_gender='F' AND DATE(a.admission_date) BETWEEN ? AND ?`, p);
  return {
    total: total?.c || 0, delivered: delivered?.c || 0,
    svd: svd?.c || 0, lscs: lscs?.c || 0,
    boys: boys?.c || 0, girls: girls?.c || 0
  };
}

