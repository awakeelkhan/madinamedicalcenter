window.BackupPage = {
  selectedPath: '',

  async render() {
    const el = document.getElementById('page-content');
    const lastBackup = await window.api.getLastBackup().catch(() => null);
    const drives = await window.api.getDrives().catch(() => []);

    const driveOptions = drives.map(d =>
      `<option value="${d.path}">${d.letter}:\\ — Drive ${d.letter}</option>`
    ).join('');

    el.innerHTML = `
      <div class="row g-3 justify-content-center">
        <div class="col-md-7">
          <!-- Status Card -->
          <div class="card mb-3">
            <div class="card-header"><i class="fas fa-history me-2"></i>Last Backup Status</div>
            <div class="card-body">
              ${lastBackup ? `
                <div class="d-flex align-items-center gap-3">
                  <div class="stat-icon green" style="width:48px;height:48px;font-size:20px">
                    <i class="fas fa-check"></i>
                  </div>
                  <div>
                    <div class="fw-bold text-success">Backup Successful ✅</div>
                    <div class="text-muted small">Date: ${formatDate(lastBackup.created_at)}</div>
                    <div class="text-muted small" style="word-break:break-all">Path: ${lastBackup.path}</div>
                  </div>
                </div>` : `
                <div class="d-flex align-items-center gap-3">
                  <div class="stat-icon orange" style="width:48px;height:48px;font-size:20px">
                    <i class="fas fa-exclamation-triangle"></i>
                  </div>
                  <div>
                    <div class="fw-bold text-warning">No backup found</div>
                    <div class="text-muted small">Please create your first backup below.</div>
                  </div>
                </div>`}
            </div>
          </div>

          <!-- Backup Card -->
          <div class="card">
            <div class="card-header"><i class="fas fa-database me-2 text-primary"></i>Create Backup</div>
            <div class="card-body">
              <div class="mb-3">
                <label class="form-label">Backup Destination</label>
                <div class="row g-2">
                  <div class="col">
                    <input type="text" class="form-control" id="backupPath"
                      placeholder="e.g. D:\\PharmacyBackup or click Browse..."
                      value="${this.selectedPath}"/>
                  </div>
                  <div class="col-auto">
                    <button class="btn btn-outline-secondary" onclick="BackupPage.browsePath()">
                      <i class="fas fa-folder-open me-1"></i>Browse
                    </button>
                  </div>
                </div>
                <div class="form-text">Select folder where backup file will be saved.</div>
              </div>

              ${drives.length > 0 ? `
              <div class="mb-3">
                <label class="form-label">Quick Select Drive</label>
                <select class="form-select" id="driveSelect" onchange="BackupPage._selectDrive(this.value)">
                  <option value="">-- Select Drive --</option>
                  ${driveOptions}
                </select>
              </div>` : ''}

              <div class="alert alert-info d-flex gap-2" role="alert">
                <i class="fas fa-info-circle mt-1"></i>
                <div>
                  <strong>How it works:</strong><br/>
                  <small>The backup copies the pharmacy database file to your selected location with a timestamp.
                  You can restore it later by replacing the database file.</small>
                </div>
              </div>

              <button class="btn btn-primary btn-lg w-100" id="backupBtn" onclick="BackupPage.doBackup()">
                <i class="fas fa-download me-2"></i>Backup Now
              </button>

              <div id="backupStatus" class="mt-3" style="display:none"></div>
            </div>
          </div>
        </div>

        <!-- Info Card -->
        <div class="col-md-4">
          <div class="card">
            <div class="card-header"><i class="fas fa-shield-alt me-2 text-success"></i>Backup Tips</div>
            <div class="card-body">
              <ul class="list-unstyled" style="font-size:13px">
                <li class="mb-3">
                  <i class="fas fa-usb text-primary me-2"></i>
                  <strong>USB Backup:</strong><br/>
                  <small class="text-muted">Insert your USB drive, select it from the dropdown or browse, then click Backup Now.</small>
                </li>
                <li class="mb-3">
                  <i class="fas fa-clock text-warning me-2"></i>
                  <strong>Daily Backup:</strong><br/>
                  <small class="text-muted">Recommended to backup at end of each business day.</small>
                </li>
                <li class="mb-3">
                  <i class="fas fa-folder text-info me-2"></i>
                  <strong>Backup File:</strong><br/>
                  <small class="text-muted">Files are named <code>pharmacy_backup_YYYY-MM-DD.db</code> with timestamp.</small>
                </li>
                <li>
                  <i class="fas fa-redo text-danger me-2"></i>
                  <strong>Restore:</strong><br/>
                  <small class="text-muted">To restore, contact your system admin to replace the database file.</small>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  _selectDrive(path) {
    if (path) {
      document.getElementById('backupPath').value = path + 'PharmacyBackup';
      this.selectedPath = path + 'PharmacyBackup';
    }
  },

  async browsePath() {
    const folder = await window.api.selectBackupFolder();
    if (folder) {
      document.getElementById('backupPath').value = folder;
      this.selectedPath = folder;
    }
  },

  async doBackup() {
    const dest = document.getElementById('backupPath').value.trim();
    if (!dest) { showToast('Please select a backup destination first', 'danger'); return; }

    const btn = document.getElementById('backupBtn');
    const status = document.getElementById('backupStatus');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Backing up...';
    status.style.display = 'none';

    try {
      const result = await window.api.doBackup(dest);
      if (result.ok) {
        status.innerHTML = `
          <div class="alert alert-success d-flex gap-2 mb-0">
            <i class="fas fa-check-circle mt-1"></i>
            <div>
              <strong>Backup successful!</strong><br/>
              <small style="word-break:break-all">Saved to: ${result.dest}</small>
            </div>
          </div>`;
        status.style.display = 'block';
        showToast('Backup completed successfully!', 'success');
        this.selectedPath = dest;
      } else {
        status.innerHTML = `<div class="alert alert-danger mb-0"><i class="fas fa-times me-2"></i>${result.error}</div>`;
        status.style.display = 'block';
        showToast('Backup failed: ' + result.error, 'danger');
      }
    } catch (err) {
      status.innerHTML = `<div class="alert alert-danger mb-0">${err.message}</div>`;
      status.style.display = 'block';
      showToast('Error: ' + err.message, 'danger');
    }

    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-download me-2"></i>Backup Now';
  }
};
