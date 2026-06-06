window.SettingsPage = {
  async render() {
    const el = document.getElementById('page-content');
    const settings = await window.api.getSettings().catch(() => ({}));
    const users = await window.api.getUsers().catch(() => []);

    const userRows = users.map(u => `
      <tr>
        <td>${u.id}</td>
        <td><strong>${u.username}</strong></td>
        <td>
          <span class="badge ${u.role === 'admin' ? 'bg-danger' : 'bg-primary'}">${u.role}</span>
        </td>
        <td>${formatDate(u.created_at)}</td>
        <td>
          <button class="btn btn-sm btn-outline-primary me-1" onclick="SettingsPage.editUserModal(${JSON.stringify(u).replace(/"/g,'&quot;')})">
            <i class="fas fa-edit"></i>
          </button>
          ${u.id !== 1 ? `<button class="btn btn-sm btn-outline-danger" onclick="SettingsPage.deleteUser(${u.id}, '${u.username}')">
            <i class="fas fa-trash"></i></button>` : ''}
        </td>
      </tr>`).join('');

    el.innerHTML = `
      <div class="row g-3">
        <!-- Pharmacy Settings -->
        <div class="col-md-6">
          <div class="card">
            <div class="card-header"><i class="fas fa-hospital me-2 text-primary"></i>Hospital / Clinic Info</div>
            <div class="card-body">

              <!-- Logo upload -->
              <div class="mb-3">
                <label class="form-label fw-semibold">Hospital Logo</label>
                <div class="d-flex align-items-center gap-3">
                  <div id="logoPreview" style="width:90px;height:64px;border:2px dashed #ccc;border-radius:8px;display:flex;align-items:center;justify-content:center;background:#f8f9fa;overflow:hidden;flex-shrink:0">
                    ${settings.logo_base64
                      ? `<img src="${settings.logo_base64}" style="max-width:100%;max-height:100%;object-fit:contain"/>`
                      : `<i class="fas fa-hospital fa-2x text-muted"></i>`}
                  </div>
                  <div>
                    <button class="btn btn-outline-primary btn-sm d-block mb-1" onclick="SettingsPage._uploadLogo()">
                      <i class="fas fa-upload me-1"></i>Upload Logo
                    </button>
                    <button class="btn btn-outline-danger btn-sm d-block" onclick="SettingsPage._clearLogo()">
                      <i class="fas fa-times me-1"></i>Remove
                    </button>
                    <div class="text-muted mt-1" style="font-size:10px">PNG, JPG, SVG — max 500KB<br/>Used on all printouts</div>
                  </div>
                </div>
              </div>

              <div class="mb-3">
                <label class="form-label">Hospital / Clinic Name</label>
                <input type="text" class="form-control" id="setPharmacyName" value="${settings.pharmacy_name || ''}"/>
              </div>
              <div class="mb-3">
                <label class="form-label">Tagline / Speciality</label>
                <input type="text" class="form-control" id="setTagline"
                  value="${settings.tagline || ''}" placeholder="e.g. Quality Healthcare for All"/>
              </div>
              <div class="row g-2 mb-3">
                <div class="col-8">
                  <label class="form-label">Address</label>
                  <input type="text" class="form-control" id="setAddress" value="${settings.address || ''}"/>
                </div>
                <div class="col-4">
                  <label class="form-label">Reg. No.</label>
                  <input type="text" class="form-control" id="setRegNo"
                    value="${settings.reg_no || ''}" placeholder="KP-2024-001"/>
                </div>
              </div>
              <div class="row g-2 mb-3">
                <div class="col-7">
                  <label class="form-label">Phone</label>
                  <input type="text" class="form-control" id="setPhone" value="${settings.phone || ''}"/>
                </div>
                <div class="col-5">
                  <label class="form-label">Currency</label>
                  <input type="text" class="form-control" id="setCurrency" value="${settings.currency || 'PKR'}"/>
                </div>
              </div>
              <button class="btn btn-primary" onclick="SettingsPage.saveSettings()">
                <i class="fas fa-save me-1"></i>Save Settings
              </button>
            </div>
          </div>
        </div>

        <!-- User Management -->
        <div class="col-md-6">
          <div class="card">
            <div class="card-header d-flex justify-content-between align-items-center">
              <span><i class="fas fa-users-cog me-2 text-success"></i>User Management</span>
              <button class="btn btn-success btn-sm" onclick="SettingsPage.addUserModal()">
                <i class="fas fa-user-plus me-1"></i>Add User
              </button>
            </div>
            <div class="card-body p-0">
              <table class="table table-hover mb-0">
                <thead>
                  <tr><th>#</th><th>Username</th><th>Role</th><th>Created</th><th>Actions</th></tr>
                </thead>
                <tbody id="usersTableBody">
                  ${userRows || '<tr><td colspan="5" class="text-center text-muted">No users</td></tr>'}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Change Password -->
        <div class="col-md-6">
          <div class="card">
            <div class="card-header"><i class="fas fa-key me-2 text-warning"></i>Change My Password</div>
            <div class="card-body">
              <div class="mb-3">
                <label class="form-label">New Password</label>
                <input type="password" class="form-control" id="newPass" placeholder="Enter new password"/>
              </div>
              <div class="mb-3">
                <label class="form-label">Confirm Password</label>
                <input type="password" class="form-control" id="confirmPass" placeholder="Confirm new password"/>
              </div>
              <button class="btn btn-warning" onclick="SettingsPage.changePassword()">
                <i class="fas fa-key me-1"></i>Change Password
              </button>
            </div>
          </div>
        </div>

        <!-- About -->
        <div class="col-md-6">
          <div class="card">
            <div class="card-header"><i class="fas fa-info-circle me-2"></i>About</div>
            <div class="card-body">
              <div class="text-center py-2">
                <div class="mb-2" style="font-size:48px">🏥</div>
                <h5 class="fw-bold text-primary">Al Madina Medical Center</h5>
                <p class="text-muted small">Version 1.0.0 &mdash; HyperCloud.pk</p>
                <hr/>
                <div class="text-start small text-muted">
                  <div class="mb-1"><i class="fas fa-check-circle text-success me-2"></i>Offline — No internet required</div>
                  <div class="mb-1"><i class="fas fa-check-circle text-success me-2"></i>SQLite local / network database</div>
                  <div class="mb-1"><i class="fas fa-check-circle text-success me-2"></i>USB Backup support</div>
                  <div class="mb-1"><i class="fas fa-check-circle text-success me-2"></i>Invoice &amp; Ledger system</div>
                  <div><i class="fas fa-check-circle text-success me-2"></i>Multi-user with roles</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        ${App.currentUser && App.currentUser.role === 'admin' ? `
        <!-- Admin: Shared DB Path -->
        <div class="col-md-6">
          <div class="card border-warning">
            <div class="card-header bg-warning text-dark">
              <i class="fas fa-database me-2"></i>Shared Database Path
              <span class="badge bg-dark ms-2" style="font-size:9px">ADMIN ONLY</span>
            </div>
            <div class="card-body">
              <p class="small text-muted mb-2">
                Set a network path so all departments share one database.
                Leave empty to use local. <strong>Restart required after change.</strong>
              </p>
              <div class="input-group mb-2">
                <input type="text" class="form-control form-control-sm font-monospace" id="dbPathInput"
                  placeholder="e.g. \\\\SERVER\\share\\pharmacy.db"/>
                <button class="btn btn-outline-secondary btn-sm" title="Browse" onclick="SettingsPage._browseDbPath()">
                  <i class="fas fa-folder-open"></i>
                </button>
              </div>
              <div class="d-flex gap-2 mb-2">
                <button class="btn btn-warning btn-sm" onclick="SettingsPage._saveDbPath()">
                  <i class="fas fa-save me-1"></i>Save Path
                </button>
                <button class="btn btn-outline-danger btn-sm" onclick="SettingsPage._clearDbPath()">
                  <i class="fas fa-times me-1"></i>Clear (use local)
                </button>
              </div>
              <div class="small text-muted" id="dbPathCurrent">Loading…</div>
            </div>
          </div>
        </div>

        <!-- Admin: License -->
        <div class="col-md-6">
          <div class="card border-success">
            <div class="card-header bg-success text-white">
              <i class="fas fa-shield-alt me-2"></i>License
              <span class="badge bg-dark ms-2" style="font-size:9px">ADMIN ONLY</span>
            </div>
            <div class="card-body">
              <div class="d-flex align-items-center gap-2 mb-2">
                <i class="fas fa-check-circle text-success fa-lg"></i>
                <span class="fw-bold">Software Activated</span>
              </div>
              <p class="small text-muted mb-1">Powered by HyperCloud.pk</p>
              <hr class="my-2"/>
              <div class="small"><strong>Support:</strong> HyperCloud.pk &nbsp;|&nbsp; Abdul Wakeel</div>
              <div class="small text-muted mt-1"><i class="fab fa-whatsapp text-success me-1"></i><strong>0313-9986357</strong></div>
            </div>
          </div>
        </div>
        ` : ''}

      </div>
    `;
    if (App.currentUser && App.currentUser.role === 'admin') this._loadDbPath();
  },

  async _loadDbPath() {
    const res = await window.api.getDbPath();
    const inp = document.getElementById('dbPathInput');
    const cur = document.getElementById('dbPathCurrent');
    if (!inp || !cur) return;
    if (res && res.current) {
      inp.value = res.current;
      cur.innerHTML = '<i class="fas fa-server text-warning me-1"></i>Active: <code style="font-size:11px">' + res.current + '</code>';
    } else {
      cur.innerHTML = '<i class="fas fa-database text-success me-1"></i>Using local database (default)';
    }
  },

  async _browseDbPath() {
    const p = await window.api.selectDbPath();
    if (p) document.getElementById('dbPathInput').value = p;
  },

  async _saveDbPath() {
    const val = (document.getElementById('dbPathInput').value || '').trim();
    if (!val) { showToast('Enter a path first', 'warning'); return; }
    await window.api.setDbPath(val);
    showToast('Path saved. Restart app to apply.', 'success');
    this._loadDbPath();
  },

  async _clearDbPath() {
    await window.api.setDbPath('');
    document.getElementById('dbPathInput').value = '';
    showToast('Cleared. Restart app to use local database.', 'success');
    this._loadDbPath();
  },

  async _uploadLogo() {
    const filePath = await window.api.selectLogoFile();
    if (!filePath) return;
    const res = await window.api.readFileBase64(filePath);
    if (!res || !res.ok) { showToast(res?.error || 'Failed to read image', 'danger'); return; }
    await window.api.saveSettings({ logo_base64: res.data });
    App.settings.logo_base64 = res.data;
    document.getElementById('logoPreview').innerHTML =
      `<img src="${res.data}" style="max-width:100%;max-height:100%;object-fit:contain"/>`;
    showToast('Logo updated! Will appear on all printouts.', 'success');
  },

  async _clearLogo() {
    await window.api.saveSettings({ logo_base64: '' });
    App.settings.logo_base64 = '';
    document.getElementById('logoPreview').innerHTML =
      `<i class="fas fa-hospital fa-2x text-muted"></i>`;
    showToast('Logo removed.', 'success');
  },

  async saveSettings() {
    const s = {
      pharmacy_name: document.getElementById('setPharmacyName').value.trim(),
      tagline:       (document.getElementById('setTagline')?.value  || '').trim(),
      reg_no:        (document.getElementById('setRegNo')?.value    || '').trim(),
      address:       document.getElementById('setAddress').value.trim(),
      phone:         document.getElementById('setPhone').value.trim(),
      currency:      document.getElementById('setCurrency').value.trim() || 'PKR'
    };
    await window.api.saveSettings(s);
    Object.assign(App.settings, s);
    document.getElementById('sidebarPharmacyName').textContent = s.pharmacy_name || 'Pharmacy';
    showToast('Settings saved!', 'success');
  },

  addUserModal() {
    showModal('Add User', `
      <div class="mb-3">
        <label class="form-label">Username <span class="text-danger">*</span></label>
        <input type="text" class="form-control" id="auUsername"/>
      </div>
      <div class="mb-3">
        <label class="form-label">Password <span class="text-danger">*</span></label>
        <input type="password" class="form-control" id="auPassword"/>
      </div>
      <div class="mb-3">
        <label class="form-label">Role</label>
        <select class="form-select" id="auRole">
          <option value="operator">Operator</option>
          <option value="admin">Admin</option>
        </select>
      </div>`,
      `<button class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
       <button class="btn btn-success" onclick="SettingsPage._saveUser()">
         <i class="fas fa-save me-1"></i>Save</button>`);
  },

  async _saveUser() {
    const username = document.getElementById('auUsername').value.trim();
    const password = document.getElementById('auPassword').value;
    if (!username || !password) { showToast('Username and password required', 'danger'); return; }
    await window.api.addUser({ username, password, role: document.getElementById('auRole').value });
    closeModal(); showToast('User added!', 'success'); await this.render();
  },

  editUserModal(u) {
    showModal('Edit User', `
      <input type="hidden" id="euId" value="${u.id}"/>
      <div class="mb-3">
        <label class="form-label">Username</label>
        <input type="text" class="form-control" id="euUsername" value="${u.username}"/>
      </div>
      <div class="mb-3">
        <label class="form-label">New Password <small class="text-muted">(leave blank to keep current)</small></label>
        <input type="password" class="form-control" id="euPassword" placeholder="Leave blank to keep"/>
      </div>
      <div class="mb-3">
        <label class="form-label">Role</label>
        <select class="form-select" id="euRole">
          <option value="operator" ${u.role === 'operator' ? 'selected' : ''}>Operator</option>
          <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option>
        </select>
      </div>`,
      `<button class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
       <button class="btn btn-primary" onclick="SettingsPage._updateUser()">
         <i class="fas fa-save me-1"></i>Update</button>`);
  },

  async _updateUser() {
    const id = parseInt(document.getElementById('euId').value);
    const username = document.getElementById('euUsername').value.trim();
    const password = document.getElementById('euPassword').value;
    if (!username) { showToast('Username required', 'danger'); return; }
    await window.api.updateUser({ id, username, password: password || null, role: document.getElementById('euRole').value });
    closeModal(); showToast('User updated!', 'success'); await this.render();
  },

  async deleteUser(id, username) {
    if (id === 1) { showToast('Cannot delete the primary admin', 'danger'); return; }
    if (!confirm(`Delete user "${username}"?`)) return;
    await window.api.deleteUser(id);
    showToast('User deleted', 'warning'); await this.render();
  },

  async changePassword() {
    const np = document.getElementById('newPass').value;
    const cp = document.getElementById('confirmPass').value;
    if (!np) { showToast('Enter new password', 'danger'); return; }
    if (np !== cp) { showToast('Passwords do not match', 'danger'); return; }
    if (np.length < 4) { showToast('Password must be at least 4 characters', 'warning'); return; }
    const userId = App.currentUser?.id || 1;
    await window.api.updateUser({ id: userId, password: np });
    document.getElementById('newPass').value = '';
    document.getElementById('confirmPass').value = '';
    showToast('Password changed successfully!', 'success');
  }
};
