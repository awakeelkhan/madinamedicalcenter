window.ReportsPage = {
  _active: 'summary',

  async render() {
    const el = document.getElementById('page-content');
    const fromDate = new Date(); fromDate.setDate(1);
    const defaultFrom = fromDate.toISOString().slice(0, 10);
    const s = App.settings || {};

    el.innerHTML = `
      <!-- Print-only header -->
      <div class="rep-print-hdr" id="repPrintHdr">
        ${window.amcPrintHeader('report')}
        <div style="text-align:center;font-size:11px;color:#555;margin-top:6px;font-family:Arial,sans-serif">
          <strong id="repPrintTitle">Report</strong>
          <span id="repPrintSub"></span>
          &nbsp;&middot;&nbsp; Printed: ${new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}
        </div>
      </div>

      <!-- Tab bar -->
      <div class="card mb-3 no-print">
        <div class="card-body py-2 px-3">
          <div class="rep-tab-bar">
            <button class="rep-tab active" data-rep="summary"><i class="fas fa-chart-pie"></i>Summary</button>
            <button class="rep-tab" data-rep="retail"><i class="fas fa-receipt"></i>Retail Sales</button>
            <button class="rep-tab" data-rep="history"><i class="fas fa-history"></i>Receipts</button>
            <button class="rep-tab" data-rep="topmeds"><i class="fas fa-star"></i>Top Medicines</button>
            <button class="rep-tab" data-rep="stock"><i class="fas fa-boxes"></i>Stock / Expiry</button>
            <button class="rep-tab" data-rep="balances"><i class="fas fa-users"></i>Balances</button>
            <button class="rep-tab" data-rep="profit"><i class="fas fa-chart-line"></i>Wholesale</button>
          </div>
        </div>
      </div>

      <!-- Filters bar -->
      <div class="card mb-3 no-print" id="rFiltersCard">
        <div class="card-body py-2 px-3">
          <div class="rep-filter-bar">
            <div id="rDateFilters" class="rep-filter-group">
              <span class="rep-filter-lbl">From</span>
              <input type="date" class="form-control form-control-sm" id="rFrom" value="${defaultFrom}" style="width:138px"/>
              <span class="rep-filter-lbl">To</span>
              <input type="date" class="form-control form-control-sm" id="rTo" value="${today()}" style="width:138px"/>
            </div>
            <div id="rPatientFilter" style="display:none">
              <input type="text" class="form-control form-control-sm" id="rPatient" placeholder="Search patient name / phone / NIC…" style="width:240px"/>
            </div>
            <div id="rExpiryFilter" style="display:none">
              <span class="rep-filter-lbl">Expiry within</span>
              <select class="form-select form-select-sm" id="rExpiryDays" style="width:120px">
                <option value="30">30 days</option>
                <option value="60">60 days</option>
                <option value="90" selected>90 days</option>
                <option value="180">180 days</option>
                <option value="365">1 year</option>
              </select>
            </div>
            <div class="ms-auto d-flex gap-2">
              <button class="btn btn-primary btn-sm" onclick="ReportsPage.generate()">
                <i class="fas fa-play me-1"></i>Generate
              </button>
              <button class="btn btn-outline-secondary btn-sm" onclick="ReportsPage._printReport()">
                <i class="fas fa-print me-1"></i>Print
              </button>
            </div>
          </div>
        </div>
      </div>

      <div id="reportOutput">
        <div class="card"><div class="card-body text-center text-muted py-5">
          <i class="fas fa-chart-bar fa-3x mb-3 opacity-25"></i>
          <p>Loading…</p>
        </div></div>
      </div>
    `;

    document.querySelectorAll('.rep-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.rep-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this._active = btn.dataset.rep;

        const noDate    = ['summary','balances'].includes(this._active);
        const showExpiry  = this._active === 'stock';
        const showPatient = this._active === 'history';

        document.getElementById('rDateFilters').style.display   = noDate    ? 'none' : '';
        document.getElementById('rExpiryFilter').style.display  = showExpiry  ? '' : 'none';
        document.getElementById('rPatientFilter').style.display = showPatient ? '' : 'none';

        ReportsPage.generate();
      });
    });

    this._active = 'summary';
    this.generate();
  },

  _printReport() {
    const titles = {
      summary:'Summary Report', retail:'Retail Sales Report', history:'Receipt History',
      topmeds:'Top Medicines Report', stock:'Stock & Expiry Report',
      balances:'Customer Balances', profit:'Wholesale Profit Report'
    };
    const from = document.getElementById('rFrom')?.value;
    const to   = document.getElementById('rTo')?.value;
    const el   = document.getElementById('repPrintTitle');
    const sub  = document.getElementById('repPrintSub');
    if (el) el.textContent = titles[this._active] || 'Report';
    if (sub) sub.textContent = (from && to) ? (' · ' + formatDate(from) + ' — ' + formatDate(to)) : '';
    window.print();
  },

  async generate() {
    const output = document.getElementById('reportOutput');
    output.innerHTML = '<div class="text-center py-5"><i class="fas fa-spinner fa-spin fa-2x text-muted"></i></div>';
    try {
      switch (this._active) {
        case 'summary':  await this._renderSummary(output); break;
        case 'retail':   await this._renderRetail(output); break;
        case 'history':  await this._renderHistory(output); break;
        case 'topmeds':  await this._renderTopMeds(output); break;
        case 'stock':    await this._renderStock(output); break;
        case 'balances': await this._renderBalances(output); break;
        case 'profit':   await this._renderProfit(output); break;
      }
    } catch (err) {
      output.innerHTML = `<div class="alert alert-danger">Error: ${err.message}</div>`;
    }
  },

  // ── SUMMARY ────────────────────────────────────────────────────────
  async _renderSummary(output) {
    const s = await window.api.reportRetailSummary();
    const today = s.today || {};
    const month = s.month || {};
    const year  = s.year  || {};
    const catRows = (s.topCat || []).map((c, i) => `
      <tr>
        <td><span class="badge bg-secondary me-2">${i+1}</span>${c.category || 'General'}</td>
        <td class="text-end fw-bold">${formatCurrency(c.revenue)}</td>
      </tr>`).join('');

    output.innerHTML = `
      <div class="row g-3 mb-4">
        <div class="col-6 col-md-3">
          <div class="stat-card">
            <div class="stat-icon green"><i class="fas fa-sun"></i></div>
            <div class="stat-info">
              <div class="label">Today's Revenue</div>
              <div class="value">${formatCurrency(today.rev||0)}</div>
              <div class="small text-muted">${today.cnt||0} receipts &nbsp;·&nbsp; Disc: ${formatCurrency(today.disc||0)}</div>
            </div>
          </div>
        </div>
        <div class="col-6 col-md-3">
          <div class="stat-card">
            <div class="stat-icon blue"><i class="fas fa-calendar-alt"></i></div>
            <div class="stat-info">
              <div class="label">This Month</div>
              <div class="value">${formatCurrency(month.rev||0)}</div>
              <div class="small text-muted">${month.cnt||0} receipts</div>
            </div>
          </div>
        </div>
        <div class="col-6 col-md-3">
          <div class="stat-card">
            <div class="stat-icon orange"><i class="fas fa-calendar"></i></div>
            <div class="stat-info">
              <div class="label">This Year</div>
              <div class="value">${formatCurrency(year.rev||0)}</div>
              <div class="small text-muted">${year.cnt||0} receipts</div>
            </div>
          </div>
        </div>
        <div class="col-6 col-md-3">
          <div class="stat-card">
            <div class="stat-icon purple"><i class="fas fa-tags"></i></div>
            <div class="stat-info">
              <div class="label">Avg per Receipt</div>
              <div class="value">${formatCurrency(month.cnt > 0 ? (month.rev/month.cnt) : 0)}</div>
              <div class="small text-muted">this month</div>
            </div>
          </div>
        </div>
      </div>
      <div class="row g-3">
        <div class="col-md-6">
          <div class="card h-100">
            <div class="card-header"><i class="fas fa-tags me-2 text-warning"></i>Revenue by Category (This Month)</div>
            <div class="card-body p-0">
              <table class="table table-sm mb-0">
                <thead><tr><th>Category</th><th class="text-end">Revenue</th></tr></thead>
                <tbody>${catRows || '<tr><td colspan="2" class="text-center text-muted py-4">No retail sales yet</td></tr>'}</tbody>
              </table>
            </div>
          </div>
        </div>
        <div class="col-md-6">
          <div class="card h-100">
            <div class="card-header"><i class="fas fa-lightbulb me-2 text-info"></i>Quick Actions</div>
            <div class="card-body">
              <div class="d-grid gap-2">
                <button class="btn btn-outline-success" onclick="ReportsPage._setTab('retail')">
                  <i class="fas fa-receipt me-2"></i>View Retail Sales Report
                </button>
                <button class="btn btn-outline-warning" onclick="ReportsPage._setTab('topmeds')">
                  <i class="fas fa-star me-2"></i>View Top Selling Medicines
                </button>
                <button class="btn btn-outline-danger" onclick="ReportsPage._setTab('stock')">
                  <i class="fas fa-exclamation-triangle me-2"></i>Check Stock & Expiry
                </button>
                <button class="btn btn-outline-info" onclick="ReportsPage._setTab('history')">
                  <i class="fas fa-history me-2"></i>Browse Receipt History
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>`;
  },

  _setTab(name) {
    const btn = document.querySelector(`.rep-tab[data-rep="${name}"]`);
    if (btn) btn.click();
  },

  // ── RETAIL SALES ───────────────────────────────────────────────────
  async _renderRetail(output) {
    const from = document.getElementById('rFrom').value;
    const to   = document.getElementById('rTo').value;
    const data = await window.api.reportRetailSales({ from, to });
    const rows = data.dailyRows || [];
    const grandTotal   = rows.reduce((s, r) => s + (r.total||0), 0);
    const grandCount   = rows.reduce((s, r) => s + (r.count||0), 0);
    const grandDisc    = rows.reduce((s, r) => s + (r.discount||0), 0);

    const tableRows = rows.map(r => `
      <tr>
        <td><strong>${formatDate(r.date)}</strong></td>
        <td class="text-center">${r.count}</td>
        <td class="text-end">${formatCurrency(r.discount)}</td>
        <td class="text-end fw-bold text-success">${formatCurrency(r.total)}</td>
        <td class="text-end">${r.count > 0 ? formatCurrency(r.total/r.count) : '—'}</td>
      </tr>`).join('');

    output.innerHTML = `
      <div class="row g-3 mb-3">
        <div class="col-md-4">
          <div class="stat-card"><div class="stat-icon green"><i class="fas fa-money-bill-wave"></i></div>
            <div class="stat-info"><div class="label">Total Revenue</div><div class="value">${formatCurrency(grandTotal)}</div></div></div>
        </div>
        <div class="col-md-4">
          <div class="stat-card"><div class="stat-icon blue"><i class="fas fa-receipt"></i></div>
            <div class="stat-info"><div class="label">Total Receipts</div><div class="value">${grandCount}</div></div></div>
        </div>
        <div class="col-md-4">
          <div class="stat-card"><div class="stat-icon orange"><i class="fas fa-tag"></i></div>
            <div class="stat-info"><div class="label">Total Discounts</div><div class="value">${formatCurrency(grandDisc)}</div></div></div>
        </div>
      </div>
      <div class="card">
        <div class="card-header d-flex justify-content-between">
          <span><i class="fas fa-receipt me-2 text-success"></i>Daily Retail Sales</span>
          <small class="text-muted">${formatDate(from)} — ${formatDate(to)}</small>
        </div>
        <div class="card-body p-0">
          <table class="table table-hover mb-0">
            <thead><tr><th>Date</th><th class="text-center">Receipts</th><th class="text-end">Discount</th><th class="text-end">Revenue</th><th class="text-end">Avg/Receipt</th></tr></thead>
            <tbody>${tableRows || '<tr><td colspan="5" class="text-center text-muted py-4">No retail sales in this period</td></tr>'}</tbody>
            ${rows.length ? `<tfoot class="table-light fw-bold">
              <tr><td>TOTAL</td><td class="text-center">${grandCount}</td><td class="text-end">${formatCurrency(grandDisc)}</td>
              <td class="text-end text-success">${formatCurrency(grandTotal)}</td><td></td></tr>
            </tfoot>` : ''}
          </table>
        </div>
      </div>`;
  },

  // ── RECEIPT HISTORY ────────────────────────────────────────────────
  async _renderHistory(output) {
    const from    = document.getElementById('rFrom').value;
    const to      = document.getElementById('rTo').value;
    const patient = document.getElementById('rPatient')?.value?.trim() || '';
    const receipts = await window.api.getReceipts({ from, to, patient });
    const grand = receipts.reduce((s, r) => s + (r.total||0), 0);

    const rows = receipts.map(r => `
      <tr>
        <td><code class="small">${r.receipt_no}</code></td>
        <td>${formatDate(r.date)} <span class="text-muted small">${r.time||''}</span></td>
        <td>${r.patient_name || '<span class="text-muted">—</span>'}</td>
        <td>${r.patient_phone || '<span class="text-muted">—</span>'}</td>
        <td>${r.patient_nic || '<span class="text-muted">—</span>'}</td>
        <td class="text-end">${r.discount > 0 ? formatCurrency(r.discount) : '—'}</td>
        <td class="text-end fw-bold text-success">${formatCurrency(r.total)}</td>
        <td>
          <button class="btn btn-xs btn-outline-primary" style="padding:2px 8px;font-size:11px"
            onclick="POSPage.viewReceiptDetail(${r.id})">
            <i class="fas fa-eye"></i>
          </button>
        </td>
      </tr>`).join('');

    output.innerHTML = `
      <div class="d-flex align-items-center gap-3 mb-3 px-1">
        <span class="text-muted">${receipts.length} receipts found</span>
        <strong class="text-success">${formatCurrency(grand)}</strong>
      </div>
      <div class="card">
        <div class="card-header d-flex justify-content-between">
          <span><i class="fas fa-history me-2 text-info"></i>Receipt History</span>
          <small class="text-muted">${formatDate(from)} — ${formatDate(to)}</small>
        </div>
        <div class="card-body p-0">
          <div class="table-responsive" style="max-height:500px;overflow-y:auto">
            <table class="table table-hover table-sm mb-0">
              <thead class="sticky-top bg-white">
                <tr><th>Receipt</th><th>Date/Time</th><th>Patient</th><th>Phone</th><th>NIC</th><th class="text-end">Discount</th><th class="text-end">Total</th><th></th></tr>
              </thead>
              <tbody>${rows || '<tr><td colspan="8" class="text-center text-muted py-4">No receipts found</td></tr>'}</tbody>
            </table>
          </div>
        </div>
      </div>`;
  },

  // ── TOP MEDICINES ──────────────────────────────────────────────────
  async _renderTopMeds(output) {
    const from = document.getElementById('rFrom').value;
    const to   = document.getElementById('rTo').value;
    const data = await window.api.reportTopMedicines({ from, to });
    const grandRev = data.reduce((s, r) => s + (r.revenue||0), 0);
    const grandQty = data.reduce((s, r) => s + (r.qty||0), 0);

    const rows = data.map((r, i) => {
      const pct = grandRev > 0 ? Math.round((r.revenue/grandRev)*100) : 0;
      const bar = `<div class="bg-success rounded" style="height:6px;width:${pct}%"></div>`;
      return `<tr>
        <td><span class="badge bg-secondary me-2">${i+1}</span><strong>${r.medicine_name}</strong></td>
        <td class="text-center">${r.qty}</td>
        <td class="text-center text-muted small">${r.sold_in}</td>
        <td style="min-width:120px"><div class="bg-light rounded" style="height:6px">${bar}</div></td>
        <td class="text-end fw-bold">${formatCurrency(r.revenue)}</td>
        <td class="text-end text-muted small">${pct}%</td>
      </tr>`;
    }).join('');

    output.innerHTML = `
      <div class="row g-3 mb-3">
        <div class="col-md-4">
          <div class="stat-card"><div class="stat-icon green"><i class="fas fa-money-bill-wave"></i></div>
            <div class="stat-info"><div class="label">Total Revenue</div><div class="value">${formatCurrency(grandRev)}</div></div></div>
        </div>
        <div class="col-md-4">
          <div class="stat-card"><div class="stat-icon blue"><i class="fas fa-pills"></i></div>
            <div class="stat-info"><div class="label">Units Sold</div><div class="value">${grandQty.toLocaleString()}</div></div></div>
        </div>
        <div class="col-md-4">
          <div class="stat-card"><div class="stat-icon orange"><i class="fas fa-list-ol"></i></div>
            <div class="stat-info"><div class="label">Distinct Medicines</div><div class="value">${data.length}</div></div></div>
        </div>
      </div>
      <div class="card">
        <div class="card-header d-flex justify-content-between">
          <span><i class="fas fa-star me-2 text-warning"></i>Top Selling Medicines</span>
          <small class="text-muted">${formatDate(from)} — ${formatDate(to)}</small>
        </div>
        <div class="card-body p-0">
          <table class="table table-hover mb-0">
            <thead><tr><th>Medicine</th><th class="text-center">Qty Sold</th><th class="text-center">Receipts</th><th>Share</th><th class="text-end">Revenue</th><th class="text-end">%</th></tr></thead>
            <tbody>${rows || '<tr><td colspan="6" class="text-center text-muted py-4">No retail sales in this period</td></tr>'}</tbody>
          </table>
        </div>
      </div>`;
  },

  // ── STOCK & EXPIRY ─────────────────────────────────────────────────
  async _renderStock(output) {
    const days  = parseInt(document.getElementById('rExpiryDays')?.value) || 90;
    const stock = await window.api.reportStockSummary();
    const expiry = await window.api.reportExpiry(days);

    const totalValue = stock.reduce((s, r) => s + r.quantity * r.sale_price, 0);
    const lowStock   = stock.filter(r => r.quantity > 0 && r.quantity <= 10);
    const outStock   = stock.filter(r => r.quantity <= 0);
    const expired    = expiry.filter(r => r.status === 'expired');
    const expiring   = expiry.filter(r => r.status === 'expiring');

    const expiryRows = expiry.map(r => `
      <tr>
        <td><strong>${r.medicine_name}</strong></td>
        <td><code>${r.batch_no}</code></td>
        <td class="${r.status === 'expired' ? 'expiry-expired' : 'expiry-warning'}">
          ${formatDate(r.expiry_date)}
          ${r.status === 'expired' ? '<span class="badge bg-danger ms-1">EXPIRED</span>' : '<span class="badge bg-warning text-dark ms-1">SOON</span>'}
        </td>
        <td class="text-center">${r.quantity}</td>
        <td class="text-end">${formatCurrency(r.quantity * r.sale_price)}</td>
      </tr>`).join('');

    const lowRows = lowStock.map(r => `
      <tr>
        <td><strong>${r.medicine_name}</strong></td>
        <td><code>${r.batch_no}</code></td>
        <td><span class="badge bg-warning text-dark">${r.quantity} left</span></td>
        <td>${formatCurrency(r.sale_price)}</td>
      </tr>`).join('');

    output.innerHTML = `
      <div class="row g-3 mb-3">
        <div class="col-6 col-md-3">
          <div class="stat-card"><div class="stat-icon green"><i class="fas fa-boxes"></i></div>
            <div class="stat-info"><div class="label">Stock Value</div><div class="value">${formatCurrency(totalValue)}</div></div></div>
        </div>
        <div class="col-6 col-md-3">
          <div class="stat-card border border-warning"><div class="stat-icon orange"><i class="fas fa-exclamation-triangle"></i></div>
            <div class="stat-info"><div class="label">Low Stock</div><div class="value">${lowStock.length} items</div></div></div>
        </div>
        <div class="col-6 col-md-3">
          <div class="stat-card border border-danger"><div class="stat-icon red"><i class="fas fa-times-circle"></i></div>
            <div class="stat-info"><div class="label">Expired</div><div class="value">${expired.length} batches</div></div></div>
        </div>
        <div class="col-6 col-md-3">
          <div class="stat-card border border-warning"><div class="stat-icon orange"><i class="fas fa-calendar-times"></i></div>
            <div class="stat-info"><div class="label">Expiring ≤${days}d</div><div class="value">${expiring.length} batches</div></div></div>
        </div>
      </div>
      <div class="row g-3">
        <div class="col-md-7">
          <div class="card">
            <div class="card-header"><i class="fas fa-calendar-times me-2 text-danger"></i>Expiry Alerts</div>
            <div class="card-body p-0">
              <div class="table-responsive" style="max-height:300px;overflow-y:auto">
                <table class="table table-sm table-hover mb-0">
                  <thead><tr><th>Medicine</th><th>Batch</th><th>Expiry</th><th class="text-center">Qty</th><th class="text-end">Value</th></tr></thead>
                  <tbody>${expiryRows || '<tr><td colspan="5" class="text-center text-success py-3"><i class="fas fa-check-circle me-2"></i>All clear</td></tr>'}</tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
        <div class="col-md-5">
          <div class="card">
            <div class="card-header"><i class="fas fa-exclamation-triangle me-2 text-warning"></i>Low Stock (≤10)</div>
            <div class="card-body p-0">
              <div class="table-responsive" style="max-height:300px;overflow-y:auto">
                <table class="table table-sm table-hover mb-0">
                  <thead><tr><th>Medicine</th><th>Batch</th><th>Stock</th><th>Price</th></tr></thead>
                  <tbody>${lowRows || '<tr><td colspan="4" class="text-center text-success py-3"><i class="fas fa-check-circle me-2"></i>All stocked</td></tr>'}</tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>`;
  },

  // ── CUSTOMER BALANCES ──────────────────────────────────────────────
  async _renderBalances(output) {
    const data = await window.api.reportCustomerBalances();
    const totalBalance = data.reduce((s, r) => s + r.balance, 0);
    const rows = data.map(r => `
      <tr>
        <td><strong>${r.name}</strong></td>
        <td>${r.phone || '—'}</td>
        <td class="balance-positive fs-6 text-end"><strong>${formatCurrency(r.balance)}</strong></td>
      </tr>`).join('');

    output.innerHTML = `
      <div class="card mb-3"><div class="card-body py-2">
        <span class="text-muted">Total Outstanding: </span>
        <strong class="text-danger fs-5 ms-2">${formatCurrency(totalBalance)}</strong>
        <span class="badge bg-secondary ms-2">${data.length} customers</span>
      </div></div>
      <div class="card">
        <div class="card-header"><i class="fas fa-users me-2 text-info"></i>Customer Outstanding Balances</div>
        <div class="card-body p-0">
          <table class="table table-hover mb-0">
            <thead><tr><th>Customer</th><th>Phone</th><th class="text-end">Balance</th></tr></thead>
            <tbody>${rows || '<tr><td colspan="3" class="text-center text-success py-4"><i class="fas fa-check-circle me-2"></i>No outstanding balances</td></tr>'}</tbody>
          </table>
        </div>
      </div>`;
  },

  // ── WHOLESALE PROFIT ───────────────────────────────────────────────
  async _renderProfit(output) {
    const from = document.getElementById('rFrom').value;
    const to   = document.getElementById('rTo').value;
    const data = await window.api.reportProfit({ from, to });
    const totalRevenue = data.reduce((s, r) => s + r.revenue, 0);
    const totalCost    = data.reduce((s, r) => s + r.cost, 0);
    const totalProfit  = data.reduce((s, r) => s + r.profit, 0);

    const rows = data.map(r => `
      <tr>
        <td><strong>${r.medicine_name}</strong></td>
        <td class="text-center">${r.qty_sold}</td>
        <td class="text-end">${formatCurrency(r.revenue)}</td>
        <td class="text-end">${formatCurrency(r.cost)}</td>
        <td class="text-end ${r.profit >= 0 ? 'text-success' : 'text-danger'}">
          <strong>${formatCurrency(r.profit)}</strong>
          ${r.revenue > 0 ? `<small class="ms-1 text-muted">(${Math.round(r.profit/r.revenue*100)}%)</small>` : ''}
        </td>
      </tr>`).join('');

    output.innerHTML = `
      <div class="row g-3 mb-3">
        <div class="col-md-4">
          <div class="stat-card"><div class="stat-icon blue"><i class="fas fa-dollar-sign"></i></div>
            <div class="stat-info"><div class="label">Revenue</div><div class="value">${formatCurrency(totalRevenue)}</div></div></div>
        </div>
        <div class="col-md-4">
          <div class="stat-card"><div class="stat-icon orange"><i class="fas fa-shopping-cart"></i></div>
            <div class="stat-info"><div class="label">Cost</div><div class="value">${formatCurrency(totalCost)}</div></div></div>
        </div>
        <div class="col-md-4">
          <div class="stat-card"><div class="stat-icon ${totalProfit >= 0 ? 'green' : 'red'}"><i class="fas fa-chart-line"></i></div>
            <div class="stat-info"><div class="label">Net Profit</div><div class="value">${formatCurrency(totalProfit)}</div></div></div>
        </div>
      </div>
      <div class="card">
        <div class="card-header d-flex justify-content-between">
          <span><i class="fas fa-chart-line me-2"></i>Wholesale Profit by Medicine</span>
          <small class="text-muted">${formatDate(from)} — ${formatDate(to)}</small>
        </div>
        <div class="card-body p-0">
          <table class="table table-hover mb-0">
            <thead><tr><th>Medicine</th><th class="text-center">Qty</th><th class="text-end">Revenue</th><th class="text-end">Cost</th><th class="text-end">Profit</th></tr></thead>
            <tbody>${rows || '<tr><td colspan="5" class="text-center text-muted py-4">No wholesale sales in this period</td></tr>'}</tbody>
          </table>
        </div>
      </div>`;
  }
};
