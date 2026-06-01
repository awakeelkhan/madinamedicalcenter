window.POSPage = {
  cart: [],
  _searchResults: [],
  _allItems: [],
  _activeCategory: 'All',

  async render() {
    const el = document.getElementById('page-content');
    this.cart = [];
    el.innerHTML = `
      <div class="pos-wrapper">
        <!-- LEFT: Search + Category + Grid -->
        <div class="pos-left">
          <div class="pos-search-bar">
            <div class="autocomplete-wrapper w-100">
              <span class="pos-search-icon"><i class="fas fa-search"></i></span>
              <input type="text" id="posSearch" class="pos-search-input"
                placeholder="Search medicine by name..." autocomplete="off"/>
              <div class="autocomplete-dropdown" id="posDropdown" style="display:none;width:100%"></div>
            </div>
          </div>
          <div id="posCategoryBar" class="pos-category-bar">
            <div class="text-center py-2 text-muted small"><i class="fas fa-spinner fa-spin me-1"></i>Loading…</div>
          </div>
          <div id="posGrid" class="pos-grid">
            <div class="text-center text-muted py-5 w-100">
              <i class="fas fa-spinner fa-spin fa-2x mb-3"></i>
            </div>
          </div>
        </div>

        <!-- RIGHT: Cart + Payment -->
        <div class="pos-right">
          <div class="pos-cart-header">
            <i class="fas fa-shopping-cart me-2"></i>Cart
            <span class="badge bg-success ms-1" id="cartCount">0</span>
            <button class="btn btn-sm btn-outline-danger ms-auto" onclick="POSPage.clearCart()">
              <i class="fas fa-trash me-1"></i>Clear
            </button>
          </div>

          <div class="pos-cart-items" id="cartItems">
            <div class="text-center text-muted py-4" id="emptyCart">
              <i class="fas fa-shopping-basket fa-2x mb-2 opacity-25"></i>
              <p class="small">Cart is empty</p>
            </div>
          </div>

          <div class="pos-totals">
            <div class="pos-total-row">
              <span>Subtotal</span><span id="posSubtotal">PKR 0</span>
            </div>
            <div class="pos-total-row">
              <span>Discount</span>
              <div class="input-group input-group-sm" style="width:110px">
                <input type="number" class="form-control text-end" id="posDiscount"
                  value="0" min="0" oninput="POSPage._recalc()"/>
                <span class="input-group-text">PKR</span>
              </div>
            </div>
            <div class="pos-total-row pos-grand-total">
              <span>TOTAL</span><span id="posTotal">PKR 0</span>
            </div>
            <div class="pos-total-row mt-2">
              <span class="text-success fw-bold">Cash Paid</span>
              <input type="number" class="form-control form-control-sm text-end fw-bold"
                id="posCash" value="0" min="0" style="width:130px"
                oninput="POSPage._recalc()" onkeydown="if(event.key==='Enter') POSPage.completeSale()"/>
            </div>
            <div class="pos-total-row">
              <span class="text-primary fw-bold">Change</span>
              <span id="posChange" class="text-primary fw-bold fs-5">PKR 0</span>
            </div>
          </div>

          <!-- Patient Info (optional) -->
          <div class="pos-patient">
            <div class="pos-patient-toggle" onclick="POSPage._togglePatient()">
              <i class="fas fa-user-circle me-2 text-muted"></i>
              <span class="small text-muted">Patient Info <span class="text-muted">(optional)</span></span>
              <i class="fas fa-chevron-down ms-auto text-muted" id="patientChevron"></i>
            </div>
            <div id="patientFields" style="display:none;padding:8px 0 4px">
              <input type="text" class="form-control form-control-sm mb-1" id="patientName"
                placeholder="Patient Name"/>
              <div class="d-flex gap-1">
                <input type="text" class="form-control form-control-sm" id="patientPhone"
                  placeholder="Phone"/>
                <input type="text" class="form-control form-control-sm" id="patientNIC"
                  placeholder="NIC / CNIC"/>
              </div>
            </div>
          </div>

          <div class="pos-actions">
            <button class="btn btn-outline-secondary" onclick="POSPage.viewReceipts()">
              <i class="fas fa-list me-1"></i>History
            </button>
            <button class="btn btn-success btn-lg flex-grow-1" id="posCompleteBtn"
              onclick="POSPage.completeSale()">
              <i class="fas fa-check-circle me-2"></i>Complete Sale
            </button>
          </div>
        </div>
      </div>

      <!-- Hidden Receipt for Printing -->
      <div id="receiptPrint" style="display:none">
        <div class="receipt-paper" id="receiptContent"></div>
      </div>
    `;
    this._bindSearch();
    await this._loadShelf();

    // If navigated from Shelf "Sell" button, pre-add that medicine
    if (this._pendingAdd) {
      this._addToCart(this._pendingAdd);
      this._pendingAdd = null;
    }
  },

  async _loadShelf() {
    this._allItems = await window.api.getShelfView('') || [];
    this._activeCategory = 'All';
    this._buildCategoryBar();
    this._renderGrid('All');
  },

  _buildCategoryBar() {
    const cats = ['All', ...new Set(this._allItems.map(i => i.generic_name ? i.generic_name.split(' ')[0] : 'Other'))];
    // Use medicine categories from names
    const categories = ['All'];
    const seen = new Set();
    this._allItems.forEach(i => {
      const cat = this._guessCategory(i.medicine_name);
      if (!seen.has(cat)) { seen.add(cat); categories.push(cat); }
    });

    const bar = document.getElementById('posCategoryBar');
    if (!bar) return;
    bar.innerHTML = categories.map(c => `
      <button class="pos-cat-btn ${c === this._activeCategory ? 'active' : ''}"
        onclick="POSPage._selectCategory('${c.replace(/'/g,"\\'")}')">
        ${this._catIcon(c)} ${c}
      </button>`).join('');
  },

  _guessCategory(name) {
    const n = name.toLowerCase();
    if (n.includes('paracetamol')||n.includes('ibuprofen')||n.includes('diclofenac')||n.includes('mefenamic')||n.includes('naproxen')||n.includes('aspirin')||n.includes('tramadol')||n.includes('celecoxib')||n.includes('piroxicam')||n.includes('ketorolac')||n.includes('morphine')) return 'Analgesic';
    if (n.includes('amoxicillin')||n.includes('ampicillin')||n.includes('ciprofloxacin')||n.includes('levofloxacin')||n.includes('azithromycin')||n.includes('clarithromycin')||n.includes('erythromycin')||n.includes('doxycycline')||n.includes('metronidazole')||n.includes('cefixime')||n.includes('ceftriaxone')||n.includes('cloxacillin')||n.includes('cephalexin')||n.includes('moxifloxacin')||n.includes('co-trimoxazole')||n.includes('tetracycline')||n.includes('nitrofurantoin')||n.includes('linezolid')||n.includes('vancomycin')||n.includes('meropenem')||n.includes('gentamicin')||n.includes('cefuroxime')||n.includes('cefotaxime')) return 'Antibiotic';
    if (n.includes('omeprazole')||n.includes('pantoprazole')||n.includes('esomeprazole')||n.includes('ranitidine')||n.includes('famotidine')||n.includes('domperidone')||n.includes('metoclopramide')||n.includes('ondansetron')||n.includes('loperamide')||n.includes('bisacodyl')||n.includes('lactulose')||n.includes('ors')||n.includes('antacid')||n.includes('sucralfate')||n.includes('hyoscine')||n.includes('simethicone')||n.includes('mesalazine')) return 'Gastro';
    if (n.includes('cetirizine')||n.includes('loratadine')||n.includes('fexofenadine')||n.includes('chlorpheniramine')||n.includes('diphenhydramine')||n.includes('promethazine')||n.includes('levocetirizine')||n.includes('bilastine')) return 'Antihistamine';
    if (n.includes('salbutamol')||n.includes('ipratropium')||n.includes('budesonide')||n.includes('beclomethasone')||n.includes('montelukast')||n.includes('theophylline')||n.includes('ambroxol')||n.includes('bromhexine')||n.includes('dextromethorphan')||n.includes('guaifenesin')||n.includes('pseudoephedrine')||n.includes('oxymetazoline')||n.includes('xylometazoline')||n.includes('inhaler')||n.includes('nasal')) return 'Respiratory';
    if (n.includes('metformin')||n.includes('glibenclamide')||n.includes('gliclazide')||n.includes('glimepiride')||n.includes('sitagliptin')||n.includes('vildagliptin')||n.includes('pioglitazone')||n.includes('insulin')) return 'Diabetic';
    if (n.includes('amlodipine')||n.includes('atenolol')||n.includes('bisoprolol')||n.includes('lisinopril')||n.includes('enalapril')||n.includes('ramipril')||n.includes('losartan')||n.includes('valsartan')||n.includes('telmisartan')||n.includes('furosemide')||n.includes('digoxin')||n.includes('warfarin')||n.includes('clopidogrel')||n.includes('atorvastatin')||n.includes('rosuvastatin')||n.includes('simvastatin')||n.includes('nifedipine')||n.includes('verapamil')||n.includes('diltiazem')||n.includes('spironolactone')||n.includes('metoprolol')||n.includes('carvedilol')||n.includes('hydrochlorothiazide')||n.includes('gtn')||n.includes('isosorbide')) return 'Cardiac';
    if (n.includes('vitamin')||n.includes('folic')||n.includes('ferrous')||n.includes('calcium')||n.includes('zinc')||n.includes('multivitamin')||n.includes('omega')||n.includes('magnesium')||n.includes('iron syrup')||n.includes('iron +')) return 'Vitamins';
    if (n.includes('prednisolone')||n.includes('dexamethasone')||n.includes('hydrocortisone')||n.includes('methylprednisolone')||n.includes('betamethasone')||n.includes('levothyroxine')) return 'Steroids';
    if (n.includes('diazepam')||n.includes('alprazolam')||n.includes('clonazepam')||n.includes('phenobarbitone')||n.includes('phenytoin')||n.includes('carbamazepine')||n.includes('valproate')||n.includes('sertraline')||n.includes('fluoxetine')||n.includes('amitriptyline')||n.includes('haloperidol')||n.includes('risperidone')||n.includes('olanzapine')||n.includes('pregabalin')||n.includes('gabapentin')||n.includes('levetiracetam')||n.includes('lorazepam')) return 'CNS';
    if (n.includes('fluconazole')||n.includes('clotrimazole')||n.includes('miconazole')||n.includes('nystatin')||n.includes('terbinafine')||n.includes('itraconazole')||n.includes('griseofulvin')) return 'Antifungal';
    if (n.includes('cream')||n.includes('ointment')||n.includes('lotion')||n.includes('gel')||n.includes('povidone')||n.includes('calamine')||n.includes('benzoyl')||n.includes('tretinoin')||n.includes('silver sulfa')||n.includes('salicylic')) return 'Derma';
    if (n.includes('eye')||n.includes('ear')||n.includes('otrivin')||n.includes('artificial tear')) return 'Eye/Ear';
    if (n.includes('saline')||n.includes('dextrose')||n.includes('ringer')||n.includes('kcl')||n.includes('heparin')) return 'IV Fluids';
    if (n.includes('albendazole')||n.includes('mebendazole')||n.includes('chloroquine')||n.includes('artemether')||n.includes('ivermectin')||n.includes('quinine')||n.includes('tinidazole')) return 'Antiparasitic';
    return 'Other';
  },

  _catIcon(cat) {
    const icons = {
      All:'🔍', Analgesic:'💊', Antibiotic:'🦠', Gastro:'🫁', Antihistamine:'🌿',
      Respiratory:'🫀', Diabetic:'🩸', Cardiac:'❤️', Vitamins:'🌟',
      Steroids:'💉', CNS:'🧠', Antifungal:'🍄', Derma:'🧴',
      'Eye/Ear':'👁️', 'IV Fluids':'🧪', Antiparasitic:'🔬', Other:'📦'
    };
    return icons[cat] || '💊';
  },

  _selectCategory(cat) {
    this._activeCategory = cat;
    // Update active button
    document.querySelectorAll('.pos-cat-btn').forEach(b => {
      b.classList.toggle('active', b.textContent.trim().endsWith(cat) || b.textContent.includes(cat));
    });
    // Clear search
    const s = document.getElementById('posSearch');
    if (s) s.value = '';
    const dd = document.getElementById('posDropdown');
    if (dd) dd.style.display = 'none';
    this._renderGrid(cat);
  },

  _renderGrid(cat) {
    const grid = document.getElementById('posGrid');
    if (!grid) return;
    const items = cat === 'All'
      ? this._allItems
      : this._allItems.filter(i => this._guessCategory(i.medicine_name) === cat);

    if (!items.length) {
      grid.innerHTML = `<div class="text-center text-muted py-5 w-100">
        <i class="fas fa-box-open fa-2x mb-2 opacity-25"></i>
        <p class="small">No medicines in this category</p></div>`;
      return;
    }

    grid.innerHTML = items.map(item => {
      const low = item.quantity <= 10;
      return `
        <div class="pos-med-card" onclick="POSPage._addToCart(${JSON.stringify({
          id: item.medicine_id,
          batch_id: item.batch_id,
          name: item.medicine_name,
          batch_no: item.batch_no,
          expiry_date: item.expiry_date,
          quantity: item.quantity,
          sale_price: item.sale_price
        }).replace(/"/g,'&quot;')})">
          <div class="pos-med-name">${item.medicine_name}</div>
          ${item.generic_name ? `<div class="pos-med-generic">${item.generic_name.split(' ').slice(0,2).join(' ')}</div>` : ''}
          <div class="pos-med-price">${formatCurrency(item.sale_price)}</div>
          <div class="pos-med-stock ${low ? 'low' : ''}">${item.quantity} left</div>
        </div>`;
    }).join('');
  },

  _renderGridItems(items) {
    const grid = document.getElementById('posGrid');
    if (!grid) return;
    if (!items.length) {
      grid.innerHTML = `<div class="text-center text-muted py-5 w-100"><i class="fas fa-search fa-2x mb-2 opacity-25"></i><p class="small">No results found</p></div>`;
      return;
    }
    grid.innerHTML = items.map(item => {
      const low = item.quantity <= 10;
      return `
        <div class="pos-med-card" onclick="POSPage._addToCart(${JSON.stringify({
          id: item.medicine_id,
          batch_id: item.batch_id,
          name: item.medicine_name,
          batch_no: item.batch_no,
          expiry_date: item.expiry_date,
          quantity: item.quantity,
          sale_price: item.sale_price
        }).replace(/"/g,'&quot;')})">
          <div class="pos-med-name">${item.medicine_name}</div>
          ${item.generic_name ? `<div class="pos-med-generic">${item.generic_name.split(' ').slice(0,2).join(' ')}</div>` : ''}
          <div class="pos-med-price">${formatCurrency(item.sale_price)}</div>
          <div class="pos-med-stock ${low ? 'low' : ''}">${item.quantity} left</div>
        </div>`;
    }).join('');
  },

  _togglePatient() {
    const f = document.getElementById('patientFields');
    const c = document.getElementById('patientChevron');
    if (!f) return;
    const open = f.style.display === 'none';
    f.style.display = open ? '' : 'none';
    c.className = open ? 'fas fa-chevron-up ms-auto text-muted' : 'fas fa-chevron-down ms-auto text-muted';
  },

  _bindSearch() {
    let timer;
    document.getElementById('posSearch').addEventListener('input', (e) => {
      clearTimeout(timer);
      const q = e.target.value.trim().toLowerCase();
      // Filter the grid live
      if (q.length > 0) {
        const filtered = this._allItems.filter(i =>
          i.medicine_name.toLowerCase().includes(q) ||
          (i.generic_name && i.generic_name.toLowerCase().includes(q))
        );
        this._renderGridItems(filtered);
        // Deactivate category buttons
        document.querySelectorAll('.pos-cat-btn').forEach(b => b.classList.remove('active'));
      } else {
        this._renderGrid(this._activeCategory);
        this._buildCategoryBar();
      }
      timer = setTimeout(() => this._search(e.target.value), 200);
    });
    document.getElementById('posSearch').addEventListener('focus', (e) => {
      if (e.target.value.length >= 1) this._search(e.target.value);
    });
    document.addEventListener('click', (e) => {
      if (!e.target.closest('#posSearch') && !e.target.closest('#posDropdown')) {
        const dd = document.getElementById('posDropdown');
        if (dd) dd.style.display = 'none';
      }
    });
  },

  async _search(q) {
    const dropdown = document.getElementById('posDropdown');
    const grid = document.getElementById('posGrid');
    if (!q || q.length < 1) { if (dropdown) dropdown.style.display = 'none'; return; }

    const results = await window.api.searchMedicine(q);
    this._searchResults = results || [];

    if (!results || results.length === 0) {
      dropdown.innerHTML = `<div class="autocomplete-item text-muted"><i class="fas fa-times me-2"></i>No medicines found for "${q}"</div>`;
      dropdown.style.display = 'block';
      return;
    }

    dropdown.innerHTML = results.slice(0, 10).map(r => `
      <div class="autocomplete-item" onclick="POSPage._addToCart(${JSON.stringify(r).replace(/"/g,'&quot;')})">
        <div class="item-name">${r.name}</div>
        <div class="item-detail">
          Batch: <strong>${r.batch_no}</strong> &nbsp;|&nbsp;
          Exp: ${formatDate(r.expiry_date)} &nbsp;|&nbsp;
          Price: <strong>${formatCurrency(r.sale_price)}</strong> &nbsp;|&nbsp;
          Stock: <span class="${r.quantity <= 10 ? 'text-warning fw-bold' : ''}">${r.quantity}</span>
        </div>
      </div>`).join('');
    dropdown.style.display = 'block';
  },

  _addToCart(med) {
    const dd = document.getElementById('posDropdown');
    if (dd) dd.style.display = 'none';
    document.getElementById('posSearch').value = '';
    document.getElementById('posSearch').focus();

    const exists = this.cart.find(i => i.batch_id === med.batch_id);
    if (exists) {
      if (exists.qty < exists.max_qty) { exists.qty++; exists.total = exists.qty * exists.price; }
      else { showToast(`Max stock: ${exists.max_qty}`, 'warning'); }
      this._renderCart();
      return;
    }

    this.cart.push({
      id: Date.now(),
      medicine_id: med.id,
      batch_id: med.batch_id,
      medicine_name: med.name,
      batch_no: med.batch_no,
      expiry_date: med.expiry_date,
      max_qty: med.quantity,
      price: med.sale_price,
      qty: 1,
      total: med.sale_price
    });
    this._renderCart();
  },

  _renderCart() {
    const el = document.getElementById('cartItems');
    const count = document.getElementById('cartCount');
    count.textContent = this.cart.length;

    if (this.cart.length === 0) {
      el.innerHTML = `<div class="text-center text-muted py-4" id="emptyCart">
        <i class="fas fa-shopping-basket fa-2x mb-2 opacity-25"></i>
        <p class="small">Cart is empty</p></div>`;
      this._recalc();
      return;
    }

    el.innerHTML = this.cart.map(item => `
      <div class="cart-item">
        <div class="cart-item-info">
          <div class="cart-item-name">${item.medicine_name}</div>
          <div class="cart-item-meta">
            ${formatCurrency(item.price)} × 
            <input type="number" class="cart-qty-input" value="${item.qty}" min="1" max="${item.max_qty}"
              onchange="POSPage._updateQty(${item.id}, this.value)"/>
            <span class="cart-item-total">${formatCurrency(item.total)}</span>
          </div>
        </div>
        <button class="cart-item-remove" onclick="POSPage._removeItem(${item.id})">
          <i class="fas fa-times"></i>
        </button>
      </div>`).join('');
    this._recalc();
  },

  _updateQty(id, val) {
    const item = this.cart.find(i => i.id === id);
    if (!item) return;
    let qty = parseInt(val) || 1;
    if (qty > item.max_qty) { qty = item.max_qty; showToast(`Max: ${item.max_qty}`, 'warning'); }
    if (qty < 1) qty = 1;
    item.qty = qty;
    item.total = item.price * qty;
    this._renderCart();
  },

  _removeItem(id) {
    this.cart = this.cart.filter(i => i.id !== id);
    this._renderCart();
  },

  clearCart() {
    this.cart = [];
    this._renderCart();
    const disc = document.getElementById('posDiscount');
    const cash = document.getElementById('posCash');
    if (disc) disc.value = 0;
    if (cash) cash.value = 0;
    this._recalc();
  },

  _recalc() {
    const subtotal = this.cart.reduce((s, i) => s + i.total, 0);
    const discount = parseFloat(document.getElementById('posDiscount')?.value) || 0;
    const total = Math.max(0, subtotal - discount);
    const cash = parseFloat(document.getElementById('posCash')?.value) || 0;
    const change = Math.max(0, cash - total);

    const s = document.getElementById('posSubtotal');
    const t = document.getElementById('posTotal');
    const c = document.getElementById('posChange');
    if (s) s.textContent = formatCurrency(subtotal);
    if (t) t.textContent = formatCurrency(total);
    if (c) c.textContent = formatCurrency(change);

    const btn = document.getElementById('posCompleteBtn');
    if (btn) btn.disabled = this.cart.length === 0;
  },

  async completeSale() {
    if (this.cart.length === 0) { showToast('Add medicines to cart first', 'danger'); return; }

    const subtotal = this.cart.reduce((s, i) => s + i.total, 0);
    const discount = parseFloat(document.getElementById('posDiscount').value) || 0;
    const total = Math.max(0, subtotal - discount);
    const cash_paid = parseFloat(document.getElementById('posCash').value) || 0;
    const change_amount = Math.max(0, cash_paid - total);

    const btn = document.getElementById('posCompleteBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Saving...';

    try {
      const result = await window.api.saveReceipt({
        date: today(),
        subtotal, discount, total,
        cash_paid: cash_paid || total,
        change_amount,
        patient_name: document.getElementById('patientName')?.value?.trim() || '',
        patient_phone: document.getElementById('patientPhone')?.value?.trim() || '',
        patient_nic: document.getElementById('patientNIC')?.value?.trim() || '',
        created_by: App.currentUser?.id || 1,
        items: this.cart.map(i => ({
          medicine_id: i.medicine_id,
          batch_id: i.batch_id,
          medicine_name: i.medicine_name,
          batch_no: i.batch_no,
          quantity: i.qty,
          price: i.price,
          total: i.total
        }))
      });

      const patName  = document.getElementById('patientName')?.value?.trim() || '';
      const patPhone = document.getElementById('patientPhone')?.value?.trim() || '';
      const patNIC   = document.getElementById('patientNIC')?.value?.trim() || '';
      if (result.ok) {
        this._showReceipt(result.receiptNo, subtotal, discount, total, cash_paid, change_amount, patName, patPhone, patNIC);
        this.clearCart();
        showToast(`Receipt ${result.receiptNo} saved!`, 'success');
      }
    } catch (err) {
      showToast('Error: ' + err.message, 'danger');
    }
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-check-circle me-2"></i>Complete Sale';
  },

  _showReceipt(receiptNo, subtotal, discount, total, cashPaid, change, patName, patPhone, patNIC) {
    const settings = App.settings || {};
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    const rows = this.cart.map(i => `
      <tr>
        <td style="padding:2px 4px">${i.medicine_name}</td>
        <td style="padding:2px 4px;text-align:center">${i.qty}</td>
        <td style="padding:2px 4px;text-align:right">${i.price}</td>
        <td style="padding:2px 4px;text-align:right"><strong>${i.total}</strong></td>
      </tr>`).join('');

    const html = `
      <div style="font-family:'Courier New',monospace;font-size:12px;width:330px;margin:0 auto;padding:10px">
        ${window.amcPrintHeader('receipt')}
        <div style="padding:4px 0;margin:4px 0;text-align:center">
          Receipt #: <strong>${receiptNo}</strong><br/>
          ${formatDate(today())} &nbsp; ${timeStr}
          ${patName  ? `<br/>Patient: <strong>${patName}</strong>` : ''}
          ${patPhone ? `<br/>Phone: ${patPhone}` : ''}
          ${patNIC   ? `<br/>NIC: ${patNIC}` : ''}
        </div>
        <div style="border-bottom:1px dashed #000;margin-bottom:6px"></div>
        <table style="width:100%;border-collapse:collapse">
          <thead>
            <tr style="border-bottom:1px solid #ccc">
              <th style="padding:2px 4px;text-align:left">Item</th>
              <th style="padding:2px 4px;text-align:center">Qty</th>
              <th style="padding:2px 4px;text-align:right">Price</th>
              <th style="padding:2px 4px;text-align:right">Total</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <div style="border-top:1px dashed #000;margin-top:6px;padding-top:6px">
          <div style="display:flex;justify-content:space-between"><span>Subtotal</span><span>${subtotal}</span></div>
          ${discount > 0 ? `<div style="display:flex;justify-content:space-between"><span>Discount</span><span>-${discount}</span></div>` : ''}
          <div style="display:flex;justify-content:space-between;font-weight:bold;font-size:14px;border-top:1px solid #000;margin-top:4px;padding-top:4px">
            <span>TOTAL</span><span>${total}</span>
          </div>
          <div style="display:flex;justify-content:space-between"><span>Cash</span><span>${cashPaid || total}</span></div>
          ${change > 0 ? `<div style="display:flex;justify-content:space-between"><span>Change</span><span>${change}</span></div>` : ''}
        </div>
        <div style="text-align:center;margin-top:10px;border-top:1px dashed #000;padding-top:8px">
          <div>Thank you! Come again.</div>
          <div style="margin-top:4px">💊 Get Well Soon 💊</div>
        </div>
      </div>`;

    showModal(`Receipt: ${receiptNo}`, html,
      `<button class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
       <button class="btn btn-primary" onclick="POSPage._printReceipt(${JSON.stringify(html).replace(/"/g,'&quot;')})">
         <i class="fas fa-print me-2"></i>Print Receipt
       </button>`);
  },

  _printReceipt(html) {
    const win = window.open('', '_blank', 'width=380,height=600');
    win.document.write(`<!DOCTYPE html><html><head><title>Receipt</title>
      <style>body{margin:0;padding:10px} @media print{body{margin:0}}</style>
      </head><body>${html}
      <script>window.onload=()=>{window.print();setTimeout(()=>window.close(),500)}<\/script>
      </body></html>`);
    win.document.close();
  },

  async viewReceipts() {
    const receipts = await window.api.getReceipts({});
    const rows = receipts.map(r => `
      <tr>
        <td><code>${r.receipt_no}</code></td>
        <td>${formatDate(r.date)} ${r.time || ''}</td>
        <td>${formatCurrency(r.total)}</td>
        <td class="text-success">${formatCurrency(r.cash_paid)}</td>
        <td>
          <button class="btn btn-sm btn-outline-primary" onclick="POSPage.viewReceiptDetail(${r.id}); closeModal()">
            <i class="fas fa-eye"></i>
          </button>
        </td>
      </tr>`).join('');

    showModalLg('Receipt History', `
      <div class="table-responsive" style="max-height:450px;overflow-y:auto">
        <table class="table table-hover table-sm">
          <thead><tr><th>Receipt</th><th>Date / Time</th><th>Total</th><th>Cash</th><th></th></tr></thead>
          <tbody>${rows || '<tr><td colspan="5" class="text-center text-muted">No receipts yet</td></tr>'}</tbody>
        </table>
      </div>`);
  },

  async viewReceiptDetail(id) {
    const { receipt, items } = await window.api.getReceiptDetail(id);
    const rows = items.map(i => `
      <tr>
        <td>${i.medicine_name}</td>
        <td class="text-center">${i.quantity}</td>
        <td class="text-end">${formatCurrency(i.price)}</td>
        <td class="text-end"><strong>${formatCurrency(i.total)}</strong></td>
      </tr>`).join('');

    showModal(`Receipt: ${receipt.receipt_no}`, `
      <p class="text-muted small mb-2">${formatDate(receipt.date)} at ${receipt.time || ''}</p>
      <table class="table table-sm table-bordered">
        <thead><tr><th>Medicine</th><th class="text-center">Qty</th><th class="text-end">Price</th><th class="text-end">Total</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="summary-box">
        <div class="summary-row"><span>Subtotal</span><span>${formatCurrency(receipt.subtotal)}</span></div>
        ${receipt.discount > 0 ? `<div class="summary-row"><span>Discount</span><span>-${formatCurrency(receipt.discount)}</span></div>` : ''}
        <div class="summary-row total"><span>Total</span><span>${formatCurrency(receipt.total)}</span></div>
        <div class="summary-row paid-row"><span>Cash</span><span>${formatCurrency(receipt.cash_paid)}</span></div>
        ${receipt.change_amount > 0 ? `<div class="summary-row"><span>Change</span><span>${formatCurrency(receipt.change_amount)}</span></div>` : ''}
      </div>`);
  }
};
