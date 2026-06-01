window.ShelfPage = {
  async render() {
    const el = document.getElementById('page-content');
    el.innerHTML = `
      <div class="d-flex gap-2 mb-3 align-items-center flex-wrap">
        <div class="input-group" style="max-width:280px">
          <span class="input-group-text"><i class="fas fa-search"></i></span>
          <input type="text" class="form-control" id="shelfSearch"
            placeholder="Search medicine..." oninput="ShelfPage.load()"/>
        </div>
        <div class="d-flex gap-2 ms-auto">
          <button class="btn btn-sm btn-outline-secondary shelf-filter active" data-filter="all" onclick="ShelfPage._filter(this,'all')">
            All
          </button>
          <button class="btn btn-sm btn-outline-warning shelf-filter" data-filter="low" onclick="ShelfPage._filter(this,'low')">
            <i class="fas fa-exclamation-triangle me-1"></i>Low Stock
          </button>
          <button class="btn btn-sm btn-outline-danger shelf-filter" data-filter="expiring" onclick="ShelfPage._filter(this,'expiring')">
            <i class="fas fa-calendar-times me-1"></i>Expiring Soon
          </button>
        </div>
      </div>
      <div id="shelfContainer">
        <div class="text-center py-5"><i class="fas fa-spinner fa-spin fa-2x text-muted"></i></div>
      </div>
    `;
    this._currentFilter = 'all';
    await this.load();
  },

  _sellItem(item) {
    window.POSPage._pendingAdd = item;
    navigate('pos');
  },

  _currentFilter: 'all',

  _filter(btn, f) {
    document.querySelectorAll('.shelf-filter').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    this._currentFilter = f;
    this.load();
  },

  async load() {
    const search = document.getElementById('shelfSearch')?.value || '';
    let items = await window.api.getShelfView(search) || [];

    const today = new Date();
    const in90 = new Date(today.getTime() + 90 * 86400000);

    if (this._currentFilter === 'low') {
      items = items.filter(i => i.quantity <= 10);
    } else if (this._currentFilter === 'expiring') {
      items = items.filter(i => new Date(i.expiry_date) <= in90);
    }

    const container = document.getElementById('shelfContainer');
    if (!container) return;

    if (!items.length) {
      container.innerHTML = `<div class="text-center text-muted py-5">
        <i class="fas fa-box-open fa-3x mb-3 opacity-25"></i>
        <p>No medicines found</p>
      </div>`;
      return;
    }

    const cards = items.map(item => {
      const expDate = new Date(item.expiry_date);
      const daysLeft = Math.floor((expDate - today) / 86400000);
      const isExpired = daysLeft < 0;
      const isExpiring = daysLeft >= 0 && daysLeft <= 90;
      const isLow = item.quantity <= 10;

      const cardClass = isExpired ? 'shelf-card expired' :
                        isExpiring ? 'shelf-card expiring' :
                        isLow ? 'shelf-card low' : 'shelf-card';

      const stockBadge = item.quantity === 0
        ? `<span class="badge bg-danger">Out of Stock</span>`
        : isLow
        ? `<span class="badge bg-warning text-dark">${item.quantity} left</span>`
        : `<span class="badge bg-success">${item.quantity} in stock</span>`;

      const expiryBadge = isExpired
        ? `<span class="badge bg-danger">Expired</span>`
        : isExpiring
        ? `<span class="badge bg-warning text-dark">${daysLeft}d left</span>`
        : '';

      return `
        <div class="${cardClass}">
          <div class="shelf-card-icon">💊</div>
          <div class="shelf-card-name">${item.medicine_name}</div>
          ${item.generic_name ? `<div class="shelf-card-generic">${item.generic_name}</div>` : ''}
          <div class="shelf-card-price">${formatCurrency(item.sale_price)}</div>
          <div class="shelf-card-meta">
            Batch: <code>${item.batch_no}</code><br/>
            Exp: ${formatDate(item.expiry_date)} ${expiryBadge}
          </div>
          <div class="shelf-card-stock mt-2">${stockBadge}</div>
          <button class="btn btn-sm btn-outline-primary mt-2 w-100"
            onclick="ShelfPage._sellItem(${JSON.stringify({
              id: item.medicine_id,
              batch_id: item.batch_id,
              name: item.medicine_name,
              batch_no: item.batch_no,
              expiry_date: item.expiry_date,
              quantity: item.quantity,
              sale_price: item.sale_price
            }).replace(/"/g,'&quot;')})">
            <i class="fas fa-cart-plus me-1"></i>Sell
          </button>
        </div>`;
    }).join('');

    const total = items.length;
    const outOfStock = items.filter(i => i.quantity === 0).length;
    const lowStock = items.filter(i => i.quantity > 0 && i.quantity <= 10).length;
    const expiring = items.filter(i => { const d = Math.floor((new Date(i.expiry_date) - today) / 86400000); return d >= 0 && d <= 90; }).length;

    container.innerHTML = `
      <div class="row g-2 mb-3">
        <div class="col-auto">
          <div class="d-flex align-items-center gap-2 px-3 py-2 bg-white rounded shadow-sm border">
            <i class="fas fa-pills text-primary"></i>
            <div><div class="fw-bold">${total}</div><div class="small text-muted">Total Items</div></div>
          </div>
        </div>
        <div class="col-auto">
          <div class="d-flex align-items-center gap-2 px-3 py-2 bg-white rounded shadow-sm border">
            <i class="fas fa-exclamation-triangle text-warning"></i>
            <div><div class="fw-bold">${lowStock}</div><div class="small text-muted">Low Stock</div></div>
          </div>
        </div>
        <div class="col-auto">
          <div class="d-flex align-items-center gap-2 px-3 py-2 bg-white rounded shadow-sm border">
            <i class="fas fa-calendar-times text-danger"></i>
            <div><div class="fw-bold">${expiring}</div><div class="small text-muted">Expiring</div></div>
          </div>
        </div>
      </div>
      <div class="shelf-grid">${cards}</div>
    `;
  }
};
