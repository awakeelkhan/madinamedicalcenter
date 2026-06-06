// database/appconfig.js — app-level config (license, DB path). Separate from pharmacy.db
const path = require('path');
const fs   = require('fs');
const crypto = require('crypto');

const SECRET = 'HC-AMC-2026-WAKEEL-MADINAMEDICAL';

function _dir() {
  const portable = process.env.PORTABLE_EXECUTABLE_DIR;
  if (portable) {
    const d = path.join(portable, 'AlMadina-data');
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
    return d;
  }
  const { app } = require('electron');
  return app.getPath('userData');
}

function _cfgPath() { return path.join(_dir(), 'appconfig.json'); }

function load() {
  try {
    if (fs.existsSync(_cfgPath())) return JSON.parse(fs.readFileSync(_cfgPath(), 'utf8'));
  } catch(_) {}
  return {};
}

function save(cfg) {
  fs.writeFileSync(_cfgPath(), JSON.stringify(cfg, null, 2), 'utf8');
}

function getInstallId() {
  const cfg = load();
  if (!cfg.installId) {
    cfg.installId = crypto.randomBytes(4).toString('hex').toUpperCase();
    save(cfg);
  }
  return cfg.installId;
}

function isLicensed() {
  const cfg = load();
  if (!cfg.licenseKey || !cfg.installId) return false;
  const expected = crypto.createHash('sha256')
    .update(SECRET + cfg.installId)
    .digest('hex').substring(0, 16).toUpperCase();
  const entered = cfg.licenseKey.replace(/-/g, '').substring(0, 16).toUpperCase();
  return entered === expected;
}

function saveLicense(key) {
  const cfg = load();
  cfg.licenseKey = key.toUpperCase().replace(/\s/g, '');
  save(cfg);
}

function getDbPath()    { return load().dbPath || null; }
function saveDbPath(p)  { const cfg = load(); cfg.dbPath = p || null; save(cfg); }

module.exports = { getInstallId, isLicensed, saveLicense, getDbPath, saveDbPath, load };
