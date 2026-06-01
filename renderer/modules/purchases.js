window.PurchasesPage = {
  suppliers: [],
  items: [],

  async render() {
    const el = document.getElementById('page-content');
    this.items = [];
    this.suppliers = await window.api.getSuppliers('') || [];

    const supOptions = this.suppliers.map(s =>
      `<option value="${s.id}" data-name="${s.name}">${s.name}</option>`
    ).join('');

    el.innerHTML = `
      <div class="row g-3">
        <div class="col-md-8">
          <div class="card">
            <div class="card-header d-flex justify-content-between align-items-center">
              <span><i class="fas fa-truck me-2 text-warning"></i>New Purchase</span>
              <input type="date" class="form-control form-control-sm" id="purchaseDate" value="${today()}" style="width:150px"/>
            </div>
            <div class="card-body">
              <div class="row g-2 mb-3">
                <div class="col-md-7">
                  <label class="form-label">Supplier</label>
                  <div class="d-flex gap-2">
                    <select class="form-select" id="supplierSelect">
                      <option value="">-- Select Supplier (Optional) --</option>
                      ${supOptions}
                    </select>
                    <button class="btn btn-outline-success btn-sm" onclick="PurchasesPage.addSupplierModal()">
                      <i class="fas fa-plus"></i>
                    </button>
                  </div>
                </div>
                <div class="col-md-5">
                  <label class="form-label">Supplier Name (if not in list)</label>
                  <input type="text" class="form-control" id="supplierNameFree" placeholder="Or type supplier name"/>
                </div>
              </div>

              <!-- Items Table -->
              <div class="d-flex justify-content-between align-items-center mb-2">
                <label class="form-label mb-0">Purchase Items</label>
                <button class="btn btn-outline-success btn-sm" onclick="PurchasesPage.addRow()">
                  <i class="fas fa-plus me-1"></i>Add Row
                </button>
              </div>
              <div class="table-responsive">
                <table class="invoice-table" id="purchaseTable">
                  <thead>
                    <tr>
                      <th style="width:24%">Medicine Name</th>
                      <th style="width:12%">Batch No</th>
                      <th style="width:13%">Expiry Date</th>
                      <th style="width:8%">Qty</th>
                      <th style="width:11%">Cost Price</th>
                      <th style="width:11%">Sale Price</th>
                      <th style="width:11%">Total</th>
                      <th style="width:4%"></th>
                    </tr>
                  </thead>
                  <tbody id="purchaseBody">
                    <tr id="emptyPurchaseRow">
                      <td colspan="8" class="text-center text-muted py-4">
                        <i class="fas fa-plus-circle me-2"></i>Click "Add Row" to start adding items
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div class="col-md-4">
          <div class="card mb-3">
            <div class="card-header"><i class="fas fa-calculator me-2 text-primary"></i>Summary</div>
            <div class="card-body">
              <div class="summary-box">
                <div class="summary-row total">
                  <span>Total Cost</span>
                  <span id="purchaseTotal">${formatCurrency(0)}</span>
                </div>
                <div class="summary-row">
                  <span>Items</span>
                  <span id="purchaseItemCount">0 items</span>
                </div>
              </div>
            </div>
          </div>

          <div class="d-grid gap-2">
            <button class="btn btn-warning btn-lg text-dark" onclick="PurchasesPage.savePurchase()">
              <i class="fas fa-save me-2"></i>Save Purchase
            </button>
            <button class="btn btn-outline-primary" onclick="PurchasesPage.viewPurchases()">
              <i class="fas fa-list me-2"></i>View Purchases
            </button>
            <button class="btn btn-outline-secondary" onclick="PurchasesPage.render()">
              <i class="fas fa-undo me-2"></i>Clear
            </button>
          </div>

          <div class="card mt-3">
            <div class="card-body">
              <small class="text-muted">
                <i class="fas fa-info-circle me-1"></i>
                Saving a purchase will automatically update the inventory stock.
                If a batch already exists, its quantity will be increased.
              </small>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  addRow() {
    const tbody = document.getElementById('purchaseBody');
    const emptyRow = document.getElementById('emptyPurchaseRow');
    if (emptyRow) emptyRow.remove();

    const id = Date.now();
    this.items.push({ id });

    const tr = document.createElement('tr');
    tr.id = `prow-${id}`;
    tr.className = 'invoice-row';
    tr.innerHTML = `
      <td><input type="text" class="form-control form-control-sm" placeholder="Medicine name"
            id="pm-${id}" list="medicinesList" oninput="PurchasesPage._updateTotal(${id})"/></td>
      <td><input type="text" class="form-control form-control-sm" placeholder="Batch" id="pb-${id}"/></td>
      <td><input type="date" class="form-control form-control-sm" id="pe-${id}"/></td>
      <td><input type="number" class="form-control form-control-sm" value="1" min="1" id="pq-${id}"
            oninput="PurchasesPage._updateTotal(${id})"/></td>
      <td><input type="number" class="form-control form-control-sm" value="0" min="0" step="0.01" id="pc-${id}"
            oninput="PurchasesPage._updateTotal(${id})"/></td>
      <td><input type="number" class="form-control form-control-sm" value="0" min="0" step="0.01" id="ps-${id}"/></td>
      <td><span id="pt-${id}">${formatCurrency(0)}</span></td>
      <td><button class="btn-remove-row" onclick="PurchasesPage.removeRow(${id})"><i class="fas fa-times"></i></button></td>
    `;
    tbody.appendChild(tr);
    document.getElementById(`pm-${id}`).focus();
    this._recalcTotal();
  },

  _updateTotal(id) {
    const qty = parseFloat(document.getElementById(`pq-${id}`)?.value) || 0;
    const cost = parseFloat(document.getElementById(`pc-${id}`)?.value) || 0;
    const total = qty * cost;
    const el = document.getElementById(`pt-${id}`);
    if (el) el.textContent = formatCurrency(total);
    this._recalcTotal();
  },

  _recalcTotal() {
    let total = 0;
    this.items.forEach(item => {
      const qty = parseFloat(document.getElementById(`pq-${item.id}`)?.value) || 0;
      const cost = parseFloat(document.getElementById(`pc-${item.id}`)?.value) || 0;
      total += qty * cost;
    });
    const countEl = document.getElementById('purchaseItemCount');
    const totalEl = document.getElementById('purchaseTotal');
    if (countEl) countEl.textContent = `${this.items.length} item${this.items.length !== 1 ? 's' : ''}`;
    if (totalEl) totalEl.textContent = formatCurrency(total);
  },

  removeRow(id) {
    this.items = this.items.filter(i => i.id !== id);
    const row = document.getElementById(`prow-${id}`);
    if (row) row.remove();
    if (this.items.length === 0) {
      document.getElementById('purchaseBody').innerHTML = `
        <tr id="emptyPurchaseRow">
          <td colspan="8" class="text-center text-muted py-4">
            <i class="fas fa-plus-circle me-2"></i>Click "Add Row" to start adding items
          </td>
        </tr>`;
    }
    this._recalcTotal();
  },

  async savePurchase() {
    if (this.items.length === 0) { showToast('Add at least one item', 'danger'); return; }

    const supplierEl = document.getElementById('supplierSelect');
    const supplier_id = supplierEl.value ? parseInt(supplierEl.value) : null;
    const supplier_name = supplier_id
      ? supplierEl.selectedOptions[0].dataset.name
      : (document.getElementById('supplierNameFree').value.trim() || 'Walk-in');

    const purchaseItems = [];
    let total_cost = 0;
    let valid = true;

    for (const item of this.items) {
      const medicine_name = document.getElementById(`pm-${item.id}`)?.value.trim();
      const batch_no = document.getElementById(`pb-${item.id}`)?.value.trim();
      const expiry_date = document.getElementById(`pe-${item.id}`)?.value;
      const quantity = parseInt(document.getElementById(`pq-${item.id}`)?.value) || 0;
      const cost_price = parseFloat(document.getElementById(`pc-${item.id}`)?.value) || 0;
      const sale_price = parseFloat(document.getElementById(`ps-${item.id}`)?.value) || 0;

      if (!medicine_name || !batch_no || !expiry_date || quantity <= 0) {
        showToast('Please fill all required fields (Medicine, Batch, Expiry, Qty)', 'danger');
        valid = false; break;
      }

      const lineTotal = quantity * cost_price;
      total_cost += lineTotal;
      purchaseItems.push({ medicine_name, batch_no, expiry_date, quantity, cost_price, sale_price, total: lineTotal });
    }

    if (!valid) return;

    try {
      const result = await window.api.savePurchase({
        supplier_id, supplier_name,
        date: document.getElementById('purchaseDate').value,
        total_cost, items: purchaseItems,
        created_by: App.currentUser?.id || 1
      });
      if (result.ok) {
        showToast(`Purchase ${result.purchaseNo} saved! Inventory updated.`, 'success');
        this.render();
      } else {
        showToast('Failed to save purchase', 'danger');
      }
    } catch (err) {
      showToast('Error: ' + err.message, 'danger');
    }
  },

  async viewPurchases() {
    const purchases = await window.api.getPurchases({});
    const rows = purchases.map(p => `
      <tr>
        <td><code>${p.purchase_no}</code></td>
        <td>${p.supplier_name}</td>
        <td>${formatDate(p.date)}</td>
        <td>${formatCurrency(p.total_cost)}</td>
        <td>
          <button class="btn btn-sm btn-outline-primary" onclick="PurchasesPage.viewPurchaseDetail(${p.id}); closeModal()">
            <i class="fas fa-eye"></i>
          </button>
        </td>
      </tr>`).join('');

    showModalLg('All Purchases', `
      <div class="table-responsive" style="max-height:500px;overflow-y:auto">
        <table class="table table-hover table-sm">
          <thead>
            <tr><th>Purchase No</th><th>Supplier</th><th>Date</th><th>Total Cost</th><th>Action</th></tr>
          </thead>
          <tbody>${rows || '<tr><td colspan="5" class="text-center text-muted">No purchases yet</td></tr>'}</tbody>
        </table>
      </div>`);
  },

  async viewPurchaseDetail(id) {
    const { purchase, items } = await window.api.getPurchaseDetail(id);
    const rows = items.map(i => `
      <tr>
        <td>${i.medicine_name}</td>
        <td><code>${i.batch_no}</code></td>
        <td>${formatDate(i.expiry_date)}</td>
        <td>${i.quantity}</td>
        <td>${formatCurrency(i.cost_price)}</td>
        <td><strong>${formatCurrency(i.total)}</strong></td>
      </tr>`).join('');

    showModalLg(`Purchase: ${purchase.purchase_no}`, `
      <div class="row mb-3">
        <div class="col-6"><strong>Supplier:</strong> ${purchase.supplier_name}</div>
        <div class="col-6"><strong>Date:</strong> ${formatDate(purchase.date)}</div>
      </div>
      <div class="table-responsive">
        <table class="table table-sm table-bordered">
          <thead><tr><th>Medicine</th><th>Batch</th><th>Expiry</th><th>Qty</th><th>Cost</th><th>Total</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <div class="summary-box mt-2">
        <div class="summary-row total"><span>Total Cost</span><span>${formatCurrency(purchase.total_cost)}</span></div>
      </div>`);
  },

  addSupplierModal() {
    showModal('Add Supplier', `
      <div class="mb-3">
        <label class="form-label">Name <span class="text-danger">*</span></label>
        <input type="text" class="form-control" id="nsName"/>
      </div>
      <div class="mb-3">
        <label class="form-label">Phone</label>
        <input type="text" class="form-control" id="nsPhone"/>
      </div>
      <div class="mb-3">
        <label class="form-label">Address</label>
        <input type="text" class="form-control" id="nsAddress"/>
      </div>`,
      `<button class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
       <button class="btn btn-success" onclick="PurchasesPage._saveNewSupplier()">
         <i class="fas fa-save me-1"></i>Save</button>`);
  },

  async _saveNewSupplier() {
    const name = document.getElementById('nsName').value.trim();
    if (!name) { showToast('Name required', 'danger'); return; }
    await window.api.addSupplier({
      name, phone: document.getElementById('nsPhone').value.trim(),
      address: document.getElementById('nsAddress').value.trim()
    });
    closeModal();
    showToast('Supplier added!', 'success');
    this.render();
  }
};
