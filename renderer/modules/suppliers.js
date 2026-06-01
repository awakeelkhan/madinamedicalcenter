window.SuppliersPage = {
  async render() {
    const el = document.getElementById('page-content');
    el.innerHTML = `
      <div class="card">
        <div class="card-header d-flex justify-content-between align-items-center">
          <span><i class="fas fa-industry me-2 text-warning"></i>Suppliers</span>
          <div class="d-flex gap-2">
            <input type="text" class="form-control form-control-sm" id="supSearch"
              placeholder="Search supplier..." style="width:200px" oninput="SuppliersPage.load()"/>
            <button class="btn btn-success btn-sm" onclick="SuppliersPage.addModal()">
              <i class="fas fa-plus me-1"></i>Add Supplier
            </button>
          </div>
        </div>
        <div class="card-body p-0" id="supTableWrapper">
          <div class="text-center py-5"><i class="fas fa-spinner fa-spin fa-2x text-muted"></i></div>
        </div>
      </div>`;
    await this.load();
  },

  async load() {
    const search = document.getElementById('supSearch')?.value || '';
    const suppliers = await window.api.getSuppliers(search) || [];
    const wrapper = document.getElementById('supTableWrapper');

    if (!suppliers.length) {
      wrapper.innerHTML = '<div class="text-center text-muted py-5">No suppliers found</div>';
      return;
    }

    const rows = suppliers.map(s => `
      <tr>
        <td><strong>${s.name}</strong></td>
        <td>${s.phone || '—'}</td>
        <td>${s.address || '—'}</td>
        <td>${formatDate(s.created_at)}</td>
        <td>
          <button class="btn btn-sm btn-outline-primary me-1" onclick="SuppliersPage.editModal(${JSON.stringify(s).replace(/"/g,'&quot;')})">
            <i class="fas fa-edit"></i>
          </button>
          <button class="btn btn-sm btn-outline-danger" onclick="SuppliersPage.delete(${s.id}, '${s.name.replace(/'/g,"\\'")}')">
            <i class="fas fa-trash"></i>
          </button>
        </td>
      </tr>`).join('');

    wrapper.innerHTML = `
      <div class="table-responsive">
        <table class="table table-hover mb-0">
          <thead>
            <tr><th>Name</th><th>Phone</th><th>Address</th><th>Added On</th><th>Actions</th></tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  },

  addModal() {
    showModal('Add Supplier', `
      <div class="mb-3">
        <label class="form-label">Name <span class="text-danger">*</span></label>
        <input type="text" class="form-control" id="sName"/>
      </div>
      <div class="mb-3">
        <label class="form-label">Phone</label>
        <input type="text" class="form-control" id="sPhone"/>
      </div>
      <div class="mb-3">
        <label class="form-label">Address</label>
        <input type="text" class="form-control" id="sAddress"/>
      </div>`,
      `<button class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
       <button class="btn btn-success" onclick="SuppliersPage._save()">
         <i class="fas fa-save me-1"></i>Save</button>`);
  },

  async _save() {
    const name = document.getElementById('sName').value.trim();
    if (!name) { showToast('Name required', 'danger'); return; }
    await window.api.addSupplier({
      name, phone: document.getElementById('sPhone').value.trim(),
      address: document.getElementById('sAddress').value.trim()
    });
    closeModal(); showToast('Supplier added!', 'success'); await this.load();
  },

  editModal(s) {
    showModal('Edit Supplier', `
      <input type="hidden" id="esId" value="${s.id}"/>
      <div class="mb-3">
        <label class="form-label">Name <span class="text-danger">*</span></label>
        <input type="text" class="form-control" id="esName" value="${s.name}"/>
      </div>
      <div class="mb-3">
        <label class="form-label">Phone</label>
        <input type="text" class="form-control" id="esPhone" value="${s.phone || ''}"/>
      </div>
      <div class="mb-3">
        <label class="form-label">Address</label>
        <input type="text" class="form-control" id="esAddress" value="${s.address || ''}"/>
      </div>`,
      `<button class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
       <button class="btn btn-primary" onclick="SuppliersPage._update()">
         <i class="fas fa-save me-1"></i>Update</button>`);
  },

  async _update() {
    const id = parseInt(document.getElementById('esId').value);
    const name = document.getElementById('esName').value.trim();
    if (!name) { showToast('Name required', 'danger'); return; }
    await window.api.updateSupplier({
      id, name, phone: document.getElementById('esPhone').value.trim(),
      address: document.getElementById('esAddress').value.trim()
    });
    closeModal(); showToast('Supplier updated!', 'success'); await this.load();
  },

  async delete(id, name) {
    if (!confirm(`Delete supplier "${name}"?`)) return;
    await window.api.deleteSupplier(id);
    showToast('Supplier deleted', 'warning'); await this.load();
  }
};
