window.FinancePage = {
  async render() {
    const el = document.getElementById('page-content');
    el.innerHTML = `<div class="text-center py-5"><i class="fas fa-spinner fa-spin fa-2x text-muted"></i></div>`;

    const s = await window.api.getFinanceStats().catch(() => ({}));

    const dailyRows = (s.dailySales || []).map(r => {
      const barW = s.weekTotal > 0 ? Math.round((r.total / (s.weekTotal || 1)) * 100) : 0;
      return `
        <tr>
          <td>${formatDate(r.date)}</td>
          <td class="text-center">${r.receipts}</td>
          <td>
            <div class="d-flex align-items-center gap-2">
              <div class="flex-grow-1 bg-light rounded" style="height:10px">
                <div class="bg-success rounded" style="height:10px;width:${barW}%"></div>
              </div>
              <strong style="min-width:80px;text-align:right">${formatCurrency(r.total)}</strong>
            </div>
          </td>
        </tr>`;
    }).join('');

    const topMedRows = (s.topMeds || []).map((m, i) => `
      <tr>
        <td><span class="badge bg-secondary me-2">${i+1}</span>${m.medicine_name}</td>
        <td class="text-center">${m.qty}</td>
        <td class="text-end"><strong>${formatCurrency(m.revenue)}</strong></td>
      </tr>`).join('');

    const recentRows = (s.recentReceipts || []).map(r => `
      <tr>
        <td><code>${r.receipt_no}</code></td>
        <td>${formatDate(r.date)} ${r.time || ''}</td>
        <td class="text-end"><strong>${formatCurrency(r.total)}</strong></td>
        <td class="text-end text-success">${formatCurrency(r.cash_paid)}</td>
      </tr>`).join('');

    el.innerHTML = `
      <!-- Summary Cards -->
      <div class="row g-3 mb-3">
        <div class="col-6 col-md-3">
          <div class="stat-card">
            <div class="stat-icon green"><i class="fas fa-receipt"></i></div>
            <div class="stat-info">
              <div class="label">Today's Sales</div>
              <div class="value">${formatCurrency(s.todayTotal || 0)}</div>
              <div class="small text-muted">${s.todayReceipts || 0} receipts</div>
            </div>
          </div>
        </div>
        <div class="col-6 col-md-3">
          <div class="stat-card">
            <div class="stat-icon blue"><i class="fas fa-calendar-week"></i></div>
            <div class="stat-info">
              <div class="label">This Week</div>
              <div class="value">${formatCurrency(s.weekTotal || 0)}</div>
            </div>
          </div>
        </div>
        <div class="col-6 col-md-3">
          <div class="stat-card">
            <div class="stat-icon orange"><i class="fas fa-calendar-alt"></i></div>
            <div class="stat-info">
              <div class="label">This Month</div>
              <div class="value">${formatCurrency(s.monthTotal || 0)}</div>
            </div>
          </div>
        </div>
        <div class="col-6 col-md-3">
          <div class="stat-card">
            <div class="stat-icon purple"><i class="fas fa-file-invoice"></i></div>
            <div class="stat-info">
              <div class="label">Today Wholesale</div>
              <div class="value">${formatCurrency(s.todayInvoiceTotal || 0)}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="row g-3">
        <!-- Daily Sales Bar -->
        <div class="col-md-7">
          <div class="card h-100">
            <div class="card-header"><i class="fas fa-chart-bar me-2 text-success"></i>Last 7 Days — Retail Sales</div>
            <div class="card-body p-0">
              <table class="table table-hover mb-0">
                <thead><tr><th>Date</th><th class="text-center">Receipts</th><th>Revenue</th></tr></thead>
                <tbody>
                  ${dailyRows || '<tr><td colspan="3" class="text-center text-muted py-4">No sales data yet</td></tr>'}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Top Medicines -->
        <div class="col-md-5">
          <div class="card h-100">
            <div class="card-header"><i class="fas fa-star me-2 text-warning"></i>Top Selling (This Month)</div>
            <div class="card-body p-0">
              <table class="table table-sm mb-0">
                <thead><tr><th>Medicine</th><th class="text-center">Qty</th><th class="text-end">Revenue</th></tr></thead>
                <tbody>
                  ${topMedRows || '<tr><td colspan="3" class="text-center text-muted py-4">No data yet</td></tr>'}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Recent Receipts -->
        <div class="col-12">
          <div class="card">
            <div class="card-header d-flex justify-content-between align-items-center">
              <span><i class="fas fa-receipt me-2"></i>Recent Receipts</span>
              <button class="btn btn-sm btn-outline-primary" onclick="FinancePage.allReceipts()">
                <i class="fas fa-list me-1"></i>View All
              </button>
            </div>
            <div class="card-body p-0">
              <div class="table-responsive">
                <table class="table table-hover table-sm mb-0">
                  <thead><tr><th>Receipt</th><th>Date / Time</th><th class="text-end">Total</th><th class="text-end">Cash</th></tr></thead>
                  <tbody>
                    ${recentRows || '<tr><td colspan="4" class="text-center text-muted py-4">No receipts yet — go to <a href="#" onclick="navigate(\'pos\')">POS Sale</a> to start selling</td></tr>'}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  async allReceipts() {
    const fromDate = new Date();
    fromDate.setDate(1);
    const defaultFrom = fromDate.toISOString().slice(0, 10);

    showModalLg('All Receipts', `
      <div class="d-flex gap-2 mb-3">
        <input type="date" class="form-control form-control-sm" id="frFrom" value="${defaultFrom}" style="width:150px"/>
        <input type="date" class="form-control form-control-sm" id="frTo" value="${today()}" style="width:150px"/>
        <button class="btn btn-primary btn-sm" onclick="FinancePage._loadAllReceipts()">Go</button>
      </div>
      <div id="allReceiptsTable"><div class="text-center py-3"><i class="fas fa-spinner fa-spin"></i></div></div>`,
    '');
    await this._loadAllReceipts();
  },

  async _loadAllReceipts() {
    const from = document.getElementById('frFrom')?.value;
    const to = document.getElementById('frTo')?.value;
    const receipts = await window.api.getReceipts({ from, to });
    const totalAmt = receipts.reduce((s, r) => s + r.total, 0);
    const rows = receipts.map(r => `
      <tr>
        <td><code>${r.receipt_no}</code></td>
        <td>${formatDate(r.date)} ${r.time || ''}</td>
        <td class="text-end">${formatCurrency(r.total)}</td>
        <td class="text-end text-success">${formatCurrency(r.cash_paid)}</td>
      </tr>`).join('');

    const el = document.getElementById('allReceiptsTable');
    if (!el) return;
    el.innerHTML = `
      <div class="mb-2 text-muted small">${receipts.length} receipts &nbsp;|&nbsp; Total: <strong>${formatCurrency(totalAmt)}</strong></div>
      <div class="table-responsive" style="max-height:380px;overflow-y:auto">
        <table class="table table-sm table-hover mb-0">
          <thead><tr><th>Receipt</th><th>Date</th><th class="text-end">Total</th><th class="text-end">Cash</th></tr></thead>
          <tbody>${rows || '<tr><td colspan="4" class="text-center text-muted py-3">No receipts in this period</td></tr>'}</tbody>
        </table>
      </div>`;
  }
};
