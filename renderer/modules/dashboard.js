window.DashboardPage = {
  async render() {
    const el = document.getElementById('page-content');
    try {
      const s = await window.api.getDashboardStats();
      el.innerHTML = `
        <!-- Stat Cards -->
        <div class="row g-3 mb-4">
          <div class="col-md-3">
            <div class="stat-card">
              <div class="stat-icon green"><i class="fas fa-receipt"></i></div>
              <div class="stat-info">
                <div class="label">Today's Sales</div>
                <div class="value">${formatCurrency(s.todaySales)}</div>
                <div class="sub">${formatDate(today())}</div>
              </div>
            </div>
          </div>
          <div class="col-md-3">
            <div class="stat-card">
              <div class="stat-icon blue"><i class="fas fa-calendar-alt"></i></div>
              <div class="stat-info">
                <div class="label">This Month</div>
                <div class="value">${formatCurrency(s.monthSales)}</div>
                <div class="sub">Monthly Revenue</div>
              </div>
            </div>
          </div>
          <div class="col-md-3">
            <div class="stat-card">
              <div class="stat-icon orange"><i class="fas fa-hand-holding-usd"></i></div>
              <div class="stat-info">
                <div class="label">Total Receivable</div>
                <div class="value">${formatCurrency(s.totalReceivable)}</div>
                <div class="sub">Outstanding balances</div>
              </div>
            </div>
          </div>
          <div class="col-md-3">
            <div class="stat-card">
              <div class="stat-icon teal"><i class="fas fa-pills"></i></div>
              <div class="stat-info">
                <div class="label">Medicines</div>
                <div class="value">${s.totalMedicines}</div>
                <div class="sub">${s.totalCustomers} customers</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Alert Row -->
        <div class="row g-3 mb-4">
          <div class="col-md-6">
            <div class="stat-card ${s.lowStock > 0 ? 'border border-warning' : ''}">
              <div class="stat-icon ${s.lowStock > 0 ? 'orange' : 'green'}"><i class="fas fa-box-open"></i></div>
              <div class="stat-info">
                <div class="label">Low Stock Items</div>
                <div class="value">${s.lowStock}</div>
                <div class="sub">Items with qty ≤ 10</div>
              </div>
              ${s.lowStock > 0 ? '<span class="badge bg-warning text-dark ms-auto">⚠ Check</span>' : ''}
            </div>
          </div>
          <div class="col-md-6">
            <div class="stat-card ${s.expiringIn30 > 0 ? 'border border-danger' : ''}">
              <div class="stat-icon ${s.expiringIn30 > 0 ? 'red' : 'green'}"><i class="fas fa-calendar-times"></i></div>
              <div class="stat-info">
                <div class="label">Expiring (30 days)</div>
                <div class="value">${s.expiringIn30}</div>
                <div class="sub">Batches near expiry</div>
              </div>
              ${s.expiringIn30 > 0 ? '<span class="badge bg-danger ms-auto">⚠ Urgent</span>' : ''}
            </div>
          </div>
        </div>

        <!-- Tables Row -->
        <div class="row g-3">
          <div class="col-md-7">
            <div class="card">
              <div class="card-header d-flex justify-content-between align-items-center">
                <span><i class="fas fa-history me-2 text-primary"></i>Recent Invoices</span>
                <button class="btn btn-sm btn-outline-primary" onclick="navigate('sales')">View All</button>
              </div>
              <div class="card-body p-0">
                <table class="table table-hover mb-0">
                  <thead>
                    <tr>
                      <th>Invoice</th>
                      <th>Customer</th>
                      <th>Date</th>
                      <th>Total</th>
                      <th>Remaining</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${s.recentInvoices.length ? s.recentInvoices.map(i => `
                      <tr>
                        <td><span class="badge bg-light text-dark">${i.invoice_no}</span></td>
                        <td>${i.customer_name}</td>
                        <td>${formatDate(i.date)}</td>
                        <td>${formatCurrency(i.total)}</td>
                        <td class="${i.remaining > 0 ? 'balance-positive' : 'balance-zero'}">
                          ${i.remaining > 0 ? formatCurrency(i.remaining) : '<i class="fas fa-check-circle text-success"></i> Clear'}
                        </td>
                      </tr>`).join('') : '<tr><td colspan="5" class="text-center text-muted py-3">No invoices yet</td></tr>'}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div class="col-md-5">
            <div class="card">
              <div class="card-header d-flex justify-content-between align-items-center">
                <span><i class="fas fa-exclamation-triangle me-2 text-warning"></i>Expiry Alerts</span>
                <button class="btn btn-sm btn-outline-warning" onclick="navigate('reports')">Full Report</button>
              </div>
              <div class="card-body p-0">
                <table class="table mb-0">
                  <thead>
                    <tr>
                      <th>Medicine</th>
                      <th>Batch</th>
                      <th>Expiry</th>
                      <th>Stock</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${s.expiryAlerts.length ? s.expiryAlerts.map(a => `
                      <tr>
                        <td>${a.medicine_name}</td>
                        <td><code>${a.batch_no}</code></td>
                        <td class="expiry-warning">${formatDate(a.expiry_date)}</td>
                        <td>${a.quantity}</td>
                      </tr>`).join('') : '<tr><td colspan="4" class="text-center text-muted py-3"><i class="fas fa-check-circle text-success"></i> All good!</td></tr>'}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      `;
    } catch (err) {
      el.innerHTML = `<div class="alert alert-danger">Failed to load dashboard: ${err.message}</div>`;
    }
  }
};
