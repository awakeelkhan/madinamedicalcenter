window.SalesPage = {
  customers: [],
  items: [],
  selectedCustomer: null,

  async render() {
    const el = document.getElementById('page-content');
    this.items = [];
    this.selectedCustomer = null;
    this.customers = await window.api.getCustomers('') || [];

    const custOptions = this.customers.map(c =>
      `<option value="${c.id}" data-balance="${c.balance}" data-name="${c.name}">${c.name}</option>`
    ).join('');

    el.innerHTML = `
      <div class="row g-3">
        <!-- Left: Invoice Builder -->
        <div class="col-md-8">
          <div class="card">
            <div class="card-header d-flex justify-content-between align-items-center">
              <span><i class="fas fa-file-invoice me-2 text-success"></i>New Invoice</span>
              <div class="d-flex gap-2">
                <input type="date" class="form-control form-control-sm" id="invoiceDate" value="${today()}" style="width:150px"/>
              </div>
            </div>
            <div class="card-body">
              <!-- Customer Row -->
              <div class="row g-2 mb-3">
                <div class="col-md-6">
                  <label class="form-label">Customer <span class="text-danger">*</span></label>
                  <div class="d-flex gap-2">
                    <select class="form-select" id="customerSelect">
                      <option value="">-- Select Customer --</option>
                      ${custOptions}
                    </select>
                    <button class="btn btn-outline-success btn-sm" onclick="SalesPage.addCustomerModal()" title="Add New">
                      <i class="fas fa-plus"></i>
                    </button>
                  </div>
                </div>
                <div class="col-md-3">
                  <label class="form-label">Balance</label>
                  <input type="text" class="form-control" id="customerBalance" readonly placeholder="0 PKR"/>
                </div>
                <div class="col-md-3">
                  <label class="form-label">Phone</label>
                  <input type="text" class="form-control" id="customerPhone" readonly placeholder=""/>
                </div>
              </div>

              <!-- Medicine Search -->
              <div class="mb-2">
                <label class="form-label">Add Medicine</label>
                <div class="autocomplete-wrapper">
                  <input type="text" class="form-control" id="medicineSearch"
                    placeholder="Type medicine name to search and add..." autocomplete="off"/>
                  <div class="autocomplete-dropdown" id="medicineDropdown" style="display:none"></div>
                </div>
              </div>

              <!-- Items Table -->
              <div class="table-responsive mt-2">
                <table class="invoice-table" id="itemsTable">
                  <thead>
                    <tr>
                      <th style="width:28%">Medicine</th>
                      <th style="width:12%">Batch</th>
                      <th style="width:13%">Expiry</th>
                      <th style="width:10%">Qty</th>
                      <th style="width:12%">Price</th>
                      <th style="width:12%">Total</th>
                      <th style="width:13%">Stock</th>
                      <th style="width:4%"></th>
                    </tr>
                  </thead>
                  <tbody id="itemsBody">
                    <tr id="emptyRow">
                      <td colspan="8" class="text-center text-muted py-4">
                        <i class="fas fa-search me-2"></i>Search and add medicines above
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <!-- Right: Summary -->
        <div class="col-md-4">
          <div class="card mb-3">
            <div class="card-header"><i class="fas fa-calculator me-2 text-primary"></i>Summary</div>
            <div class="card-body">
              <div class="summary-box">
                <div class="summary-row">
                  <span>Subtotal</span>
                  <span id="subtotal">PKR 0</span>
                </div>
                <div class="summary-row">
                  <span>Discount</span>
                  <div class="input-group input-group-sm" style="width:120px">
                    <input type="number" class="form-control" id="discountInput" value="0" min="0" oninput="SalesPage.recalculate()"/>
                    <span class="input-group-text">PKR</span>
                  </div>
                </div>
                <div class="summary-row total">
                  <span>Total</span>
                  <span id="totalAmount">PKR 0</span>
                </div>
                <hr/>
                <div class="summary-row paid-row">
                  <span>Paid Now</span>
                  <div class="input-group input-group-sm" style="width:140px">
                    <input type="number" class="form-control" id="paidInput" value="0" min="0" oninput="SalesPage.recalculate()"/>
                    <span class="input-group-text">PKR</span>
                  </div>
                </div>
                <div class="summary-row remaining">
                  <span>Remaining</span>
                  <span id="remainingAmount">PKR 0</span>
                </div>
              </div>
            </div>
          </div>

          <div class="d-grid gap-2">
            <button class="btn btn-success btn-lg" onclick="SalesPage.saveInvoice()">
              <i class="fas fa-save me-2"></i>Save Invoice
            </button>
            <button class="btn btn-outline-primary" onclick="SalesPage.viewInvoices()">
              <i class="fas fa-list me-2"></i>View Invoices
            </button>
            <button class="btn btn-outline-secondary" onclick="SalesPage.render()">
              <i class="fas fa-undo me-2"></i>Clear
            </button>
          </div>

          <!-- Quick Stats -->
          <div class="card mt-3">
            <div class="card-header"><i class="fas fa-info-circle me-2"></i>Quick Info</div>
            <div class="card-body p-0">
              <div class="p-3" id="quickInfo">
                <small class="text-muted">Select a customer to see balance details.</small>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    this._bindEvents();
  },

  _bindEvents() {
    // Customer select
    document.getElementById('customerSelect').addEventListener('change', (e) => {
      const opt = e.target.selectedOptions[0];
      if (opt.value) {
        this.selectedCustomer = {
          id: parseInt(opt.value),
          name: opt.dataset.name,
          balance: parseFloat(opt.dataset.balance) || 0
        };
        document.getElementById('customerBalance').value = formatCurrency(this.selectedCustomer.balance);
        document.getElementById('quickInfo').innerHTML = `
          <div class="d-flex justify-content-between mb-1">
            <small class="text-muted">Outstanding Balance</small>
            <strong class="${this.selectedCustomer.balance > 0 ? 'text-danger' : 'text-success'}">${formatCurrency(this.selectedCustomer.balance)}</strong>
          </div>
          <button class="btn btn-sm btn-outline-info w-100 mt-1" onclick="navigate('customers')">
            <i class="fas fa-book me-1"></i>View Ledger
          </button>`;
      } else {
        this.selectedCustomer = null;
        document.getElementById('customerBalance').value = '';
        document.getElementById('quickInfo').innerHTML = '<small class="text-muted">Select a customer to see balance details.</small>';
      }
    });

    // Medicine autocomplete
    let debounceTimer;
    document.getElementById('medicineSearch').addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => this._searchMedicine(e.target.value), 250);
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.autocomplete-wrapper')) {
        document.getElementById('medicineDropdown').style.display = 'none';
      }
    });
  },

  async _searchMedicine(q) {
    const dropdown = document.getElementById('medicineDropdown');
    if (!q || q.length < 2) { dropdown.style.display = 'none'; return; }

    const results = await window.api.searchMedicine(q);
    if (!results || results.length === 0) {
      dropdown.innerHTML = '<div class="autocomplete-item text-muted">No medicines found</div>';
      dropdown.style.display = 'block';
      return;
    }

    dropdown.innerHTML = results.map(r => `
      <div class="autocomplete-item" onclick="SalesPage._addItem(${JSON.stringify(r).replace(/"/g, '&quot;')})">
        <div class="item-name">${r.name}</div>
        <div class="item-detail">
          Batch: ${r.batch_no} | Exp: ${formatDate(r.expiry_date)} | Price: ${formatCurrency(r.sale_price)} | Stock: ${r.quantity}
        </div>
      </div>`).join('');
    dropdown.style.display = 'block';
  },

  _addItem(medicine) {
    document.getElementById('medicineDropdown').style.display = 'none';
    document.getElementById('medicineSearch').value = '';

    // Check if same batch already added
    const exists = this.items.find(i => i.batch_id === medicine.batch_id);
    if (exists) { showToast('This batch is already in the invoice', 'warning'); return; }

    const item = {
      id: Date.now(),
      medicine_id: medicine.id,
      batch_id: medicine.batch_id,
      medicine_name: medicine.name,
      batch_no: medicine.batch_no,
      expiry_date: medicine.expiry_date,
      max_qty: medicine.quantity,
      price: medicine.sale_price,
      quantity: 1,
      total: medicine.sale_price
    };
    this.items.push(item);
    this._renderItems();
    this.recalculate();
  },

  _renderItems() {
    const tbody = document.getElementById('itemsBody');
    if (this.items.length === 0) {
      tbody.innerHTML = `<tr id="emptyRow"><td colspan="8" class="text-center text-muted py-4">
        <i class="fas fa-search me-2"></i>Search and add medicines above</td></tr>`;
      return;
    }
    tbody.innerHTML = this.items.map(item => `
      <tr class="invoice-row" id="row-${item.id}">
        <td><strong>${item.medicine_name}</strong></td>
        <td><code>${item.batch_no}</code></td>
        <td class="${this._expiryClass(item.expiry_date)}">${formatDate(item.expiry_date)}</td>
        <td>
          <input type="number" value="${item.quantity}" min="1" max="${item.max_qty}"
            style="width:65px" class="form-control form-control-sm"
            onchange="SalesPage._updateQty(${item.id}, this.value)"/>
        </td>
        <td>
          <input type="number" value="${item.price}" min="0" step="0.01"
            style="width:80px" class="form-control form-control-sm"
            onchange="SalesPage._updatePrice(${item.id}, this.value)"/>
        </td>
        <td><strong>${formatCurrency(item.total)}</strong></td>
        <td><span class="badge ${item.max_qty <= 10 ? 'bg-warning text-dark' : 'bg-light text-dark'}">${item.max_qty}</span></td>
        <td>
          <button class="btn-remove-row" onclick="SalesPage._removeItem(${item.id})">
            <i class="fas fa-times"></i>
          </button>
        </td>
      </tr>`).join('');
  },

  _expiryClass(date) {
    if (!date) return '';
    const d = new Date(date), n = new Date();
    n.setHours(0,0,0,0);
    const diff = Math.floor((d - n) / (1000*60*60*24));
    if (diff < 0) return 'expiry-expired';
    if (diff <= 90) return 'expiry-warning';
    return '';
  },

  _updateQty(id, val) {
    const item = this.items.find(i => i.id === id);
    if (!item) return;
    let qty = parseInt(val) || 1;
    if (qty > item.max_qty) { qty = item.max_qty; showToast(`Max stock: ${item.max_qty}`, 'warning'); }
    if (qty < 1) qty = 1;
    item.quantity = qty;
    item.total = item.price * qty;
    this._renderItems();
    this.recalculate();
  },

  _updatePrice(id, val) {
    const item = this.items.find(i => i.id === id);
    if (!item) return;
    item.price = parseFloat(val) || 0;
    item.total = item.price * item.quantity;
    this._renderItems();
    this.recalculate();
  },

  _removeItem(id) {
    this.items = this.items.filter(i => i.id !== id);
    this._renderItems();
    this.recalculate();
  },

  recalculate() {
    const subtotal = this.items.reduce((s, i) => s + i.total, 0);
    const discount = parseFloat(document.getElementById('discountInput')?.value) || 0;
    const total = Math.max(0, subtotal - discount);
    const paid = parseFloat(document.getElementById('paidInput')?.value) || 0;
    const remaining = Math.max(0, total - paid);

    document.getElementById('subtotal').textContent = formatCurrency(subtotal);
    document.getElementById('totalAmount').textContent = formatCurrency(total);
    document.getElementById('remainingAmount').textContent = formatCurrency(remaining);
  },

  async saveInvoice() {
    if (!this.selectedCustomer) { showToast('Please select a customer', 'danger'); return; }
    if (this.items.length === 0) { showToast('Please add at least one medicine', 'danger'); return; }

    const subtotal = this.items.reduce((s, i) => s + i.total, 0);
    const discount = parseFloat(document.getElementById('discountInput').value) || 0;
    const total = Math.max(0, subtotal - discount);
    const paid = parseFloat(document.getElementById('paidInput').value) || 0;
    const remaining = Math.max(0, total - paid);

    const data = {
      customer_id: this.selectedCustomer.id,
      customer_name: this.selectedCustomer.name,
      date: document.getElementById('invoiceDate').value,
      subtotal, discount, total, paid, remaining,
      created_by: App.currentUser?.id || 1,
      items: this.items.map(i => ({
        medicine_id: i.medicine_id,
        batch_id: i.batch_id,
        medicine_name: i.medicine_name,
        batch_no: i.batch_no,
        quantity: i.quantity,
        price: i.price,
        total: i.total
      }))
    };

    try {
      const result = await window.api.saveInvoice(data);
      if (result.ok) {
        showToast(`Invoice ${result.invoiceNo} saved successfully!`, 'success');
        this.render();
      } else {
        showToast('Failed to save invoice', 'danger');
      }
    } catch (err) {
      showToast('Error: ' + err.message, 'danger');
    }
  },

  async viewInvoices() {
    const invoices = await window.api.getInvoices({ from: '', to: '' });
    const rows = invoices.map(i => `
      <tr>
        <td><code>${i.invoice_no}</code></td>
        <td>${i.customer_name}</td>
        <td>${formatDate(i.date)}</td>
        <td>${formatCurrency(i.total)}</td>
        <td>${formatCurrency(i.paid)}</td>
        <td class="${i.remaining > 0 ? 'balance-positive' : 'balance-zero'}">${formatCurrency(i.remaining)}</td>
        <td>
          <button class="btn btn-sm btn-outline-primary" onclick="SalesPage.viewInvoiceDetail(${i.id}); closeModal()">
            <i class="fas fa-eye"></i>
          </button>
        </td>
      </tr>`).join('');

    showModalLg('All Invoices', `
      <div class="table-responsive" style="max-height:500px;overflow-y:auto">
        <table class="table table-hover table-sm">
          <thead>
            <tr><th>Invoice</th><th>Customer</th><th>Date</th><th>Total</th><th>Paid</th><th>Remaining</th><th>Action</th></tr>
          </thead>
          <tbody>${rows || '<tr><td colspan="7" class="text-center text-muted">No invoices yet</td></tr>'}</tbody>
        </table>
      </div>`);
  },

  async viewInvoiceDetail(id) {
    const { invoice, items } = await window.api.getInvoiceDetail(id);
    const rows = items.map(i => `
      <tr>
        <td>${i.medicine_name}</td>
        <td><code>${i.batch_no}</code></td>
        <td>${i.quantity}</td>
        <td>${formatCurrency(i.price)}</td>
        <td><strong>${formatCurrency(i.total)}</strong></td>
      </tr>`).join('');

    showModalLg(`Invoice: ${invoice.invoice_no}`, `
      <div class="row mb-3">
        <div class="col-6"><strong>Customer:</strong> ${invoice.customer_name}</div>
        <div class="col-6"><strong>Date:</strong> ${formatDate(invoice.date)}</div>
      </div>
      <div class="table-responsive">
        <table class="table table-sm table-bordered">
          <thead><tr><th>Medicine</th><th>Batch</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <div class="summary-box mt-2">
        <div class="summary-row"><span>Subtotal</span><span>${formatCurrency(invoice.subtotal)}</span></div>
        <div class="summary-row"><span>Discount</span><span>${formatCurrency(invoice.discount)}</span></div>
        <div class="summary-row total"><span>Total</span><span>${formatCurrency(invoice.total)}</span></div>
        <div class="summary-row paid-row"><span>Paid</span><span>${formatCurrency(invoice.paid)}</span></div>
        <div class="summary-row remaining"><span>Remaining</span><span>${formatCurrency(invoice.remaining)}</span></div>
      </div>`,
      `<button class="btn btn-outline-primary" onclick="window.api.printWindow()">
        <i class="fas fa-print me-2"></i>Print</button>`);
  },

  addCustomerModal() {
    showModal('Add New Customer', `
      <div class="mb-3">
        <label class="form-label">Name <span class="text-danger">*</span></label>
        <input type="text" class="form-control" id="ncName" placeholder="Customer name"/>
      </div>
      <div class="mb-3">
        <label class="form-label">Phone</label>
        <input type="text" class="form-control" id="ncPhone" placeholder="Phone number"/>
      </div>
      <div class="mb-3">
        <label class="form-label">Address</label>
        <input type="text" class="form-control" id="ncAddress" placeholder="Address"/>
      </div>`,
      `<button class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
       <button class="btn btn-success" onclick="SalesPage._saveNewCustomer()">
         <i class="fas fa-save me-1"></i>Save</button>`);
  },

  async _saveNewCustomer() {
    const name = document.getElementById('ncName').value.trim();
    if (!name) { showToast('Customer name required', 'danger'); return; }
    const c = await window.api.addCustomer({
      name, phone: document.getElementById('ncPhone').value.trim(),
      address: document.getElementById('ncAddress').value.trim()
    });
    closeModal();
    showToast('Customer added!', 'success');
    this.render();
  }
};
