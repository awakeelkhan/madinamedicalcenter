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
            <div class="card-header"><i class="fas fa-store me-2 text-primary"></i>Pharmacy Info</div>
            <div class="card-body">
              <div class="mb-3">
                <label class="form-label">Pharmacy Name</label>
                <input type="text" class="form-control" id="setPharmacyName" value="${settings.pharmacy_name || ''}"/>
              </div>
              <div class="mb-3">
                <label class="form-label">Address</label>
                <input type="text" class="form-control" id="setAddress" value="${settings.address || ''}"/>
              </div>
              <div class="mb-3">
                <label class="form-label">Phone</label>
                <input type="text" class="form-control" id="setPhone" value="${settings.phone || ''}"/>
              </div>
              <div class="mb-3">
                <label class="form-label">Currency Symbol</label>
                <input type="text" class="form-control" id="setCurrency" value="${settings.currency || 'PKR'}" style="width:120px"/>
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
                <div class="mb-2" style="font-size:48px">💊</div>
                <h5 class="fw-bold text-primary">Wholesale Pharmacy System</h5>
                <p class="text-muted small">Version 1.0.0</p>
                <hr/>
                <div class="text-start small text-muted">
                  <div class="mb-1"><i class="fas fa-check-circle text-success me-2"></i>Offline — No internet required</div>
                  <div class="mb-1"><i class="fas fa-check-circle text-success me-2"></i>SQLite local database</div>
                  <div class="mb-1"><i class="fas fa-check-circle text-success me-2"></i>USB Backup support</div>
                  <div class="mb-1"><i class="fas fa-check-circle text-success me-2"></i>Invoice & Ledger system</div>
                  <div><i class="fas fa-check-circle text-success me-2"></i>Multi-user with roles</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  async saveSettings() {
    const s = {
      pharmacy_name: document.getElementById('setPharmacyName').value.trim(),
      address: document.getElementById('setAddress').value.trim(),
      phone: document.getElementById('setPhone').value.trim(),
      currency: document.getElementById('setCurrency').value.trim() || 'PKR'
    };
    await window.api.saveSettings(s);
    App.settings = s;
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
