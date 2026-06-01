window.CustomersPage = {
  async render() {
    const el = document.getElementById('page-content');
    el.innerHTML = `
      <div class="card">
        <div class="card-header d-flex justify-content-between align-items-center">
          <span><i class="fas fa-users me-2 text-primary"></i>Customers & Ledger</span>
          <div class="d-flex gap-2">
            <input type="text" class="form-control form-control-sm" id="custSearch"
              placeholder="Search customer..." style="width:200px" oninput="CustomersPage.load()"/>
            <button class="btn btn-success btn-sm" onclick="CustomersPage.addModal()">
              <i class="fas fa-plus me-1"></i>Add Customer
            </button>
          </div>
        </div>
        <div class="card-body p-0" id="custTableWrapper">
          <div class="text-center py-5"><i class="fas fa-spinner fa-spin fa-2x text-muted"></i></div>
        </div>
      </div>`;
    await this.load();
  },

  async load() {
    const search = document.getElementById('custSearch')?.value || '';
    const customers = await window.api.getCustomers(search) || [];
    const wrapper = document.getElementById('custTableWrapper');

    if (!customers.length) {
      wrapper.innerHTML = '<div class="text-center text-muted py-5">No customers found</div>';
      return;
    }

    const rows = customers.map(c => `
      <tr>
        <td><strong>${c.name}</strong></td>
        <td>${c.phone || '—'}</td>
        <td>${c.address || '—'}</td>
        <td class="${c.balance > 0 ? 'balance-positive' : 'balance-zero'}">
          <strong>${formatCurrency(c.balance)}</strong>
        </td>
        <td>
          <button class="btn btn-sm btn-outline-info me-1" onclick="CustomersPage.viewLedger(${c.id}, '${c.name.replace(/'/g,"\\'")}')">
            <i class="fas fa-book me-1"></i>Ledger
          </button>
          <button class="btn btn-sm btn-outline-success me-1" onclick="CustomersPage.addPaymentModal(${c.id}, '${c.name.replace(/'/g,"\\'")}', ${c.balance})">
            <i class="fas fa-money-bill-wave me-1"></i>Payment
          </button>
          <button class="btn btn-sm btn-outline-primary me-1" onclick="CustomersPage.editModal(${JSON.stringify(c).replace(/"/g,'&quot;')})">
            <i class="fas fa-edit"></i>
          </button>
          <button class="btn btn-sm btn-outline-danger" onclick="CustomersPage.delete(${c.id}, '${c.name.replace(/'/g,"\\'")}')">
            <i class="fas fa-trash"></i>
          </button>
        </td>
      </tr>`).join('');

    wrapper.innerHTML = `
      <div class="table-responsive">
        <table class="table table-hover mb-0">
          <thead>
            <tr><th>Name</th><th>Phone</th><th>Address</th><th>Balance</th><th>Actions</th></tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  },

  async viewLedger(id, name) {
    const { customer, entries } = await window.api.getCustomerLedger(id);

    const rows = entries.length ? entries.map(e => `
      <tr>
        <td>${formatDate(e.date)}</td>
        <td><span class="badge ${e.type === 'invoice' ? 'bg-primary' : 'bg-success'}">${e.type}</span></td>
        <td><code>${e.ref_no || '—'}</code></td>
        <td class="${e.debit > 0 ? 'ledger-debit' : ''}">${e.debit > 0 ? formatCurrency(e.debit) : '—'}</td>
        <td class="${e.credit > 0 ? 'ledger-credit' : ''}">${e.credit > 0 ? formatCurrency(e.credit) : '—'}</td>
        <td class="${e.balance > 0 ? 'balance-positive' : 'balance-zero'}"><strong>${formatCurrency(e.balance)}</strong></td>
        <td class="text-muted small">${e.note || ''}</td>
      </tr>`).join('') :
      '<tr><td colspan="7" class="text-center text-muted py-3">No transactions yet</td></tr>';

    showModalLg(`Ledger: ${name}`, `
      <div class="d-flex justify-content-between mb-3">
        <div>
          <strong>${customer?.phone || ''}</strong>
        </div>
        <div>
          Current Balance:
          <strong class="${customer?.balance > 0 ? 'text-danger' : 'text-success'} fs-5">
            ${formatCurrency(customer?.balance || 0)}
          </strong>
        </div>
      </div>
      <div class="table-responsive" style="max-height:400px;overflow-y:auto">
        <table class="table table-sm table-hover">
          <thead>
            <tr><th>Date</th><th>Type</th><th>Ref</th><th>Debit</th><th>Credit</th><th>Balance</th><th>Note</th></tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`,
      `<button class="btn btn-success" onclick="CustomersPage.addPaymentModal(${id}, '${name.replace(/'/g,"\\'")}', ${customer?.balance || 0}); closeModal()">
         <i class="fas fa-money-bill-wave me-1"></i>Add Payment
       </button>`);
  },

  addPaymentModal(id, name, currentBalance) {
    showModal(`Add Payment — ${name}`, `
      <div class="alert-ribbon mb-3">
        <i class="fas fa-info-circle text-warning"></i>
        Current Balance: <strong>${formatCurrency(currentBalance)}</strong>
      </div>
      <div class="mb-3">
        <label class="form-label">Payment Amount <span class="text-danger">*</span></label>
        <input type="number" class="form-control" id="payAmount" placeholder="Enter amount" min="1"/>
      </div>
      <div class="mb-3">
        <label class="form-label">Date</label>
        <input type="date" class="form-control" id="payDate" value="${today()}"/>
      </div>
      <div class="mb-3">
        <label class="form-label">Note</label>
        <input type="text" class="form-control" id="payNote" placeholder="Optional note"/>
      </div>`,
      `<button class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
       <button class="btn btn-success" onclick="CustomersPage.savePayment(${id})">
         <i class="fas fa-save me-1"></i>Save Payment</button>`);
  },

  async savePayment(customerId) {
    const amount = parseFloat(document.getElementById('payAmount').value);
    if (!amount || amount <= 0) { showToast('Enter valid amount', 'danger'); return; }
    const result = await window.api.addPayment({
      customer_id: customerId,
      amount,
      date: document.getElementById('payDate').value,
      note: document.getElementById('payNote').value.trim()
    });
    if (result.ok) {
      closeModal();
      showToast(`Payment of ${formatCurrency(amount)} recorded!`, 'success');
      await this.load();
    } else {
      showToast('Error: ' + result.error, 'danger');
    }
  },

  addModal() {
    showModal('Add Customer', `
      <div class="mb-3">
        <label class="form-label">Name <span class="text-danger">*</span></label>
        <input type="text" class="form-control" id="cName"/>
      </div>
      <div class="mb-3">
        <label class="form-label">Phone</label>
        <input type="text" class="form-control" id="cPhone"/>
      </div>
      <div class="mb-3">
        <label class="form-label">Address</label>
        <input type="text" class="form-control" id="cAddress"/>
      </div>`,
      `<button class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
       <button class="btn btn-success" onclick="CustomersPage._save()">
         <i class="fas fa-save me-1"></i>Save</button>`);
  },

  async _save() {
    const name = document.getElementById('cName').value.trim();
    if (!name) { showToast('Name required', 'danger'); return; }
    await window.api.addCustomer({
      name, phone: document.getElementById('cPhone').value.trim(),
      address: document.getElementById('cAddress').value.trim()
    });
    closeModal(); showToast('Customer added!', 'success'); await this.load();
  },

  editModal(c) {
    showModal('Edit Customer', `
      <input type="hidden" id="ecId" value="${c.id}"/>
      <div class="mb-3">
        <label class="form-label">Name <span class="text-danger">*</span></label>
        <input type="text" class="form-control" id="ecName" value="${c.name}"/>
      </div>
      <div class="mb-3">
        <label class="form-label">Phone</label>
        <input type="text" class="form-control" id="ecPhone" value="${c.phone || ''}"/>
      </div>
      <div class="mb-3">
        <label class="form-label">Address</label>
        <input type="text" class="form-control" id="ecAddress" value="${c.address || ''}"/>
      </div>`,
      `<button class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
       <button class="btn btn-primary" onclick="CustomersPage._update()">
         <i class="fas fa-save me-1"></i>Update</button>`);
  },

  async _update() {
    const id = parseInt(document.getElementById('ecId').value);
    const name = document.getElementById('ecName').value.trim();
    if (!name) { showToast('Name required', 'danger'); return; }
    await window.api.updateCustomer({
      id, name, phone: document.getElementById('ecPhone').value.trim(),
      address: document.getElementById('ecAddress').value.trim()
    });
    closeModal(); showToast('Customer updated!', 'success'); await this.load();
  },

  async delete(id, name) {
    if (!confirm(`Delete customer "${name}"? This cannot be undone.`)) return;
    await window.api.deleteCustomer(id);
    showToast('Customer deleted', 'warning'); await this.load();
  }
};
