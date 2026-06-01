window.FrontDeskPage = {
  _charges: [],
  _doctors: [],
  _labTests: [],
  _activeTab: 'new',  // new | history | doctors | labtests

  async render() {
    this._charges = [];
    const el = document.getElementById('page-content');
    el.innerHTML = `
      <div class="fd-wrapper">
        <!-- LEFT PANEL -->
        <div class="fd-left">

          <!-- Tab bar -->
          <div class="fd-tabs">
            <button class="fd-tab active" data-tab="new"><i class="fas fa-user-plus me-1"></i>New Visit</button>
            <button class="fd-tab" data-tab="history"><i class="fas fa-history me-1"></i>History</button>
            <button class="fd-tab" data-tab="doctors"><i class="fas fa-user-md me-1"></i>Doctors</button>
            <button class="fd-tab" data-tab="labtests"><i class="fas fa-flask me-1"></i>Lab Tests</button>
            <button class="fd-tab" data-tab="reports"><i class="fas fa-chart-bar me-1"></i>Reports</button>
          </div>

          <!-- NEW VISIT panel -->
          <div id="fd-panel-new" class="fd-panel">

            <!-- Patient Info -->
            <div class="fd-section-title"><i class="fas fa-id-card me-2 text-primary"></i>Patient Information</div>
            <div class="fd-patient-form">
              <div class="row g-2">
                <div class="col-6">
                  <input type="text" class="form-control form-control-sm" id="fdPatientName" placeholder="Patient Name *"/>
                </div>
                <div class="col-6">
                  <input type="text" class="form-control form-control-sm" id="fdFatherName" placeholder="Father / Husband Name"/>
                </div>
                <div class="col-4">
                  <input type="text" class="form-control form-control-sm" id="fdNIC" placeholder="NIC / CNIC"/>
                </div>
                <div class="col-4">
                  <input type="text" class="form-control form-control-sm" id="fdPhone" placeholder="Phone"/>
                </div>
                <div class="col-2">
                  <input type="text" class="form-control form-control-sm" id="fdAge" placeholder="Age"/>
                </div>
                <div class="col-2">
                  <select class="form-select form-select-sm" id="fdGender">
                    <option value="M">Male</option>
                    <option value="F">Female</option>
                    <option value="C">Child</option>
                  </select>
                </div>
              </div>
            </div>

            <!-- Quick Charge Buttons -->
            <div class="fd-section-title mt-3"><i class="fas fa-plus-circle me-2 text-success"></i>Add Charges</div>
            <div class="fd-charge-btns">
              <button class="fd-charge-btn btn-doctor" onclick="FrontDeskPage._showDoctors()">
                <i class="fas fa-user-md fa-lg mb-1"></i><br>Doctor Fee
              </button>
              <button class="fd-charge-btn btn-lab" onclick="FrontDeskPage._showLabTests()">
                <i class="fas fa-flask fa-lg mb-1"></i><br>Lab Test
              </button>
              <button class="fd-charge-btn btn-custom" onclick="FrontDeskPage._addCustomCharge()">
                <i class="fas fa-tag fa-lg mb-1"></i><br>Custom Fee
              </button>
            </div>

            <!-- Browse area: doctors / lab tests / empty -->
            <div id="fdBrowse" class="fd-browse"></div>

          </div>

          <!-- HISTORY panel -->
          <div id="fd-panel-history" class="fd-panel" style="display:none">
            <div class="d-flex gap-2 mb-2 align-items-center flex-wrap">
              <input type="date" id="fdHistFrom" class="form-control form-control-sm" style="width:140px" value="${today()}"/>
              <input type="date" id="fdHistTo" class="form-control form-control-sm" style="width:140px" value="${today()}"/>
              <input type="text" id="fdHistSearch" class="form-control form-control-sm" placeholder="Search name / NIC / phone…" style="flex:1;min-width:160px"/>
              <button class="btn btn-primary btn-sm" onclick="FrontDeskPage._loadHistory()">
                <i class="fas fa-search me-1"></i>Search
              </button>
            </div>
            <div id="fdHistoryList"></div>
          </div>

          <!-- DOCTORS management panel -->
          <div id="fd-panel-doctors" class="fd-panel" style="display:none">
            <div class="d-flex justify-content-between align-items-center mb-2">
              <span class="fw-bold text-muted small">DOCTORS LIST</span>
              <button class="btn btn-success btn-sm" onclick="FrontDeskPage._doctorForm()">
                <i class="fas fa-plus me-1"></i>Add Doctor
              </button>
            </div>
            <div id="fdDoctorsList"></div>
          </div>

          <!-- REPORTS panel -->
          <div id="fd-panel-reports" class="fd-panel" style="display:none">
            <!-- sub-nav -->
            <div class="fd-rep-subnav" id="fdRepSubnav">
              <button class="fd-rep-tab active" data-rep="summary">Summary</button>
              <button class="fd-rep-tab" data-rep="daily">Daily</button>
              <button class="fd-rep-tab" data-rep="doctors">Doctor Wise</button>
              <button class="fd-rep-tab" data-rep="labtests">Lab Tests</button>
              <button class="fd-rep-tab" data-rep="monthly">Monthly</button>
            </div>
            <div id="fdRepContent"></div>
          </div>

          <!-- LAB TESTS management panel -->
          <div id="fd-panel-labtests" class="fd-panel" style="display:none">
            <div class="d-flex justify-content-between align-items-center mb-2">
              <span class="fw-bold text-muted small">LAB TESTS CATALOG</span>
              <button class="btn btn-success btn-sm" onclick="FrontDeskPage._labForm()">
                <i class="fas fa-plus me-1"></i>Add Test
              </button>
            </div>
            <div id="fdLabList"></div>
          </div>

        </div>

        <!-- RIGHT PANEL: Charges Cart + Payment -->
        <div class="fd-right">
          <div class="fd-cart-header">
            <i class="fas fa-receipt me-2"></i>Charges
            <span class="badge bg-danger ms-1" id="fdChargeCount">0</span>
            <button class="btn btn-sm btn-outline-danger ms-auto" onclick="FrontDeskPage._clearCharges()">
              <i class="fas fa-trash-alt me-1"></i>Clear
            </button>
          </div>

          <div id="fdChargeList" class="fd-charge-list"></div>

          <!-- Totals -->
          <div class="fd-totals">
            <div class="d-flex justify-content-between py-1">
              <span class="text-muted small">Subtotal</span>
              <span id="fdSubtotal">PKR 0</span>
            </div>
            <div class="d-flex justify-content-between py-1 align-items-center">
              <span class="text-muted small">Discount</span>
              <div class="d-flex align-items-center gap-1">
                <input type="number" id="fdDiscount" class="form-control form-control-sm text-end"
                  style="width:90px" value="0" min="0" oninput="FrontDeskPage._calcTotals()"/>
                <span class="text-muted small">PKR</span>
              </div>
            </div>
            <div class="d-flex justify-content-between py-1 fw-bold fs-6">
              <span>TOTAL</span>
              <span id="fdTotal" class="text-danger">PKR 0</span>
            </div>
            <div class="d-flex justify-content-between py-1 align-items-center">
              <span class="text-muted small">Cash Paid</span>
              <input type="number" id="fdPaid" class="form-control form-control-sm text-end"
                style="width:120px" value="0" min="0" oninput="FrontDeskPage._calcTotals()"/>
            </div>
            <div class="d-flex justify-content-between py-1">
              <span class="text-muted small">Change</span>
              <span id="fdChange" class="text-success fw-bold">PKR 0</span>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="fd-actions">
            <button class="btn btn-outline-secondary w-100 mb-2" onclick="FrontDeskPage._showHistory()">
              <i class="fas fa-history me-1"></i>Visit History
            </button>
            <button class="btn btn-success w-100 btn-lg" onclick="FrontDeskPage._completeVisit()">
              <i class="fas fa-check-circle me-2"></i>Complete & Print Receipt
            </button>
          </div>
        </div>
      </div>

      <!-- Receipt for printing -->
      <div id="fdReceiptPrint" style="display:none">
        <div id="fdReceiptContent"></div>
      </div>
    `;

    this._bindTabs();
    this._doctors = await window.api.fdGetDoctors();
    this._labTests = await window.api.fdGetLabTests();
    this._renderChargeList();
  },

  _bindTabs() {
    document.querySelectorAll('.fd-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.fd-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const tab = btn.dataset.tab;
        document.querySelectorAll('.fd-panel').forEach(p => p.style.display = 'none');
        document.getElementById('fd-panel-' + tab).style.display = '';
        this._activeTab = tab;
        if (tab === 'history') this._loadHistory();
        if (tab === 'doctors') this._renderDoctorsManage();
        if (tab === 'labtests') this._renderLabManage();
        if (tab === 'reports') this._initReports();
      });
    });
  },

  // ── BROWSE DOCTORS ───────────────────────────────────────────────────────────
  _showDoctors() {
    const browse = document.getElementById('fdBrowse');
    if (!browse) return;
    browse.innerHTML = `
      <div class="fd-browse-title"><i class="fas fa-user-md me-2 text-primary"></i>Select Doctor</div>
      <div class="fd-card-grid">
        ${this._doctors.map(d => `
          <div class="fd-item-card doctor-card" onclick="FrontDeskPage._addDoctorFee(${d.id},'${d.name.replace(/'/g,"\\'")}',${d.fee})">
            <div class="fd-item-name">${d.name}</div>
            <div class="fd-item-sub">${d.specialty || ''}</div>
            <div class="fd-item-price">${formatCurrency(d.fee)}</div>
          </div>`).join('') || '<p class="text-muted small p-3">No doctors found. Add from Doctors tab.</p>'}
      </div>`;
  },

  _addDoctorFee(id, name, fee) {
    this._charges.push({ type: 'doctor', description: name, ref_id: id, amount: fee, qty: 1 });
    this._renderChargeList();
    document.getElementById('fdBrowse').innerHTML = '';
    showToast(`${name} fee added`);
  },

  // ── BROWSE LAB TESTS ─────────────────────────────────────────────────────────
  _showLabTests() {
    const browse = document.getElementById('fdBrowse');
    if (!browse) return;
    const cats = [...new Set(this._labTests.map(t => t.category))];
    const catCounts = {};
    this._labTests.forEach(t => { catCounts[t.category] = (catCounts[t.category] || 0) + 1; });

    browse.innerHTML = `
      <div class="fd-lab-header">
        <span class="fd-browse-title" style="margin-bottom:0">
          <i class="fas fa-flask me-1 text-info"></i>Select Lab Test
          <span class="text-muted fw-normal ms-1" style="font-size:10px">${this._labTests.length} available</span>
        </span>
        <button class="fd-browse-close" onclick="document.getElementById('fdBrowse').innerHTML=''">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="fd-lab-search-wrap">
        <i class="fas fa-search fd-lab-search-icon"></i>
        <input type="text" id="fdLabSearch" class="fd-lab-search"
          placeholder="Search by name or category…" oninput="FrontDeskPage._renderLabCards()" autocomplete="off"/>
        <button class="fd-lab-search-clear" id="fdLabClear" style="display:none"
          onclick="document.getElementById('fdLabSearch').value='';FrontDeskPage._renderLabCards()">
          <i class="fas fa-times-circle"></i>
        </button>
      </div>
      <div class="fd-lab-cats" id="fdLabCatBar">
        <button class="fd-cat-pill active" data-cat="__all__"
          onclick="FrontDeskPage._setCat(this)">All <span class="fd-cat-count">${this._labTests.length}</span></button>
        ${cats.map(c => `
          <button class="fd-cat-pill" data-cat="${c}" onclick="FrontDeskPage._setCat(this)">
            ${c} <span class="fd-cat-count">${catCounts[c]}</span>
          </button>`).join('')}
      </div>
      <div id="fdLabCards" class="fd-lab-list"></div>`;

    this._activeCat = '__all__';
    this._renderLabCards();

    // Focus search after render
    setTimeout(() => document.getElementById('fdLabSearch')?.focus(), 50);
  },

  _setCat(btn) {
    document.querySelectorAll('#fdLabCatBar .fd-cat-pill').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    this._activeCat = btn.dataset.cat;
    this._renderLabCards();
  },

  _renderLabCards() {
    const q   = (document.getElementById('fdLabSearch')?.value || '').toLowerCase().trim();
    const cat = this._activeCat || '__all__';
    const clearBtn = document.getElementById('fdLabClear');
    if (clearBtn) clearBtn.style.display = q ? '' : 'none';

    const filtered = this._labTests.filter(t => {
      const matchCat  = cat === '__all__' || t.category === cat;
      const matchText = !q || t.name.toLowerCase().includes(q) || t.category.toLowerCase().includes(q);
      return matchCat && matchText;
    });

    const el = document.getElementById('fdLabCards');
    if (!el) return;

    if (!filtered.length) {
      el.innerHTML = `<div class="fd-lab-empty">
        <i class="fas fa-search-minus fa-2x mb-2 opacity-25 text-muted"></i>
        <p class="text-muted small mb-0">No tests found${q ? ` for "<strong>${q}</strong>"` : ''}</p>
      </div>`;
      return;
    }

    el.innerHTML = filtered.map(t => {
      const nameHl = this._hl(t.name, q);
      const catHl  = this._hl(t.category, q);
      return `<div class="fd-lab-row" onclick="FrontDeskPage._addLabTest(${t.id},'${t.name.replace(/'/g,"\\'")}',${t.price})">
        <div class="fd-lab-row-icon"><i class="fas fa-vial"></i></div>
        <div class="fd-lab-row-info">
          <div class="fd-lab-row-name">${nameHl}</div>
          <div class="fd-lab-row-cat">${catHl}</div>
        </div>
        <div class="fd-lab-row-price">${formatCurrency(t.price)}</div>
        <div class="fd-lab-row-add"><i class="fas fa-plus-circle"></i></div>
      </div>`;
    }).join('');
  },

  _hl(text, q) {
    if (!q) return text;
    const i = text.toLowerCase().indexOf(q);
    if (i === -1) return text;
    return text.slice(0, i) +
      `<mark class="fd-hl">${text.slice(i, i + q.length)}</mark>` +
      text.slice(i + q.length);
  },

  _addLabTest(id, name, price) {
    this._charges.push({ type: 'lab', description: name, ref_id: id, amount: price, qty: 1 });
    this._renderChargeList();
    showToast(`${name} added`);
  },

  // ── CUSTOM CHARGE ────────────────────────────────────────────────────────────
  _addCustomCharge() {
    showModal('Add Custom Fee',
      `<div class="mb-3">
        <label class="form-label">Description *</label>
        <input type="text" class="form-control" id="custDesc" placeholder="e.g. Registration Fee, Dressing…"/>
      </div>
      <div class="mb-3">
        <label class="form-label">Amount (PKR) *</label>
        <input type="number" class="form-control" id="custAmt" value="0" min="0"/>
      </div>`,
      `<button class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
       <button class="btn btn-success" onclick="FrontDeskPage._confirmCustom()">Add</button>`
    );
  },

  _confirmCustom() {
    const desc = document.getElementById('custDesc').value.trim();
    const amt  = parseFloat(document.getElementById('custAmt').value) || 0;
    if (!desc) return showToast('Enter a description', 'warning');
    if (amt <= 0) return showToast('Enter a valid amount', 'warning');
    this._charges.push({ type: 'custom', description: desc, ref_id: 0, amount: amt, qty: 1 });
    this._renderChargeList();
    closeModal();
    showToast(`${desc} added`);
  },

  // ── CHARGE LIST ──────────────────────────────────────────────────────────────
  _renderChargeList() {
    const list = document.getElementById('fdChargeList');
    const count = document.getElementById('fdChargeCount');
    if (!list) return;
    if (!this._charges.length) {
      list.innerHTML = `<div class="text-center text-muted py-4">
        <i class="fas fa-receipt fa-2x mb-2 opacity-25"></i>
        <p class="small">No charges added yet</p></div>`;
      if (count) count.textContent = '0';
      this._calcTotals();
      return;
    }
    list.innerHTML = this._charges.map((c, i) => `
      <div class="fd-charge-row">
        <div class="fd-charge-icon ${c.type}">
          <i class="fas ${c.type==='doctor'?'fa-user-md':c.type==='lab'?'fa-flask':'fa-tag'}"></i>
        </div>
        <div class="fd-charge-info">
          <div class="fd-charge-desc">${c.description}</div>
          <div class="fd-charge-type">${c.type==='doctor'?'Doctor Fee':c.type==='lab'?'Lab Test':'Custom'}</div>
        </div>
        <div class="fd-charge-amt">${formatCurrency(c.amount)}</div>
        <button class="fd-remove-btn" onclick="FrontDeskPage._removeCharge(${i})">
          <i class="fas fa-times"></i>
        </button>
      </div>`).join('');
    if (count) count.textContent = this._charges.length;
    this._calcTotals();
  },

  _removeCharge(i) {
    this._charges.splice(i, 1);
    this._renderChargeList();
  },

  _clearCharges() {
    this._charges = [];
    this._renderChargeList();
    document.getElementById('fdBrowse').innerHTML = '';
  },

  _calcTotals() {
    const subtotal  = this._charges.reduce((s, c) => s + c.amount * c.qty, 0);
    const discount  = parseFloat(document.getElementById('fdDiscount')?.value) || 0;
    const total     = Math.max(0, subtotal - discount);
    const paid      = parseFloat(document.getElementById('fdPaid')?.value) || 0;
    const change    = Math.max(0, paid - total);
    const el = id => document.getElementById(id);
    if (el('fdSubtotal')) el('fdSubtotal').textContent = formatCurrency(subtotal);
    if (el('fdTotal'))    el('fdTotal').textContent    = formatCurrency(total);
    if (el('fdChange'))   el('fdChange').textContent   = formatCurrency(change);
    return { subtotal, discount, total, paid, change };
  },

  // ── COMPLETE VISIT ───────────────────────────────────────────────────────────
  async _completeVisit() {
    const name = document.getElementById('fdPatientName')?.value.trim();
    if (!name) return showToast('Patient name is required', 'danger');
    if (!this._charges.length) return showToast('Add at least one charge', 'warning');

    const { subtotal, discount, total, paid, change } = this._calcTotals();
    const patient = {
      name,
      father_name: document.getElementById('fdFatherName').value.trim(),
      nic:         document.getElementById('fdNIC').value.trim(),
      phone:       document.getElementById('fdPhone').value.trim(),
      age:         document.getElementById('fdAge').value.trim(),
      gender:      document.getElementById('fdGender').value,
    };

    try {
      const result = await window.api.fdSaveVisit({
        patient, charges: this._charges,
        subtotal, discount, total, paid, change_amount: change
      });
      showToast(`Visit #${result.id} saved`, 'success');
      this._printReceipt(result.id, patient, this._charges, subtotal, discount, total, paid, change);
      this._charges = [];
      this._renderChargeList();
      document.getElementById('fdPatientName').value = '';
      document.getElementById('fdFatherName').value = '';
      document.getElementById('fdNIC').value = '';
      document.getElementById('fdPhone').value = '';
      document.getElementById('fdAge').value = '';
      document.getElementById('fdDiscount').value = '0';
      document.getElementById('fdPaid').value = '0';
      document.getElementById('fdBrowse').innerHTML = '';
    } catch (err) {
      showToast('Error: ' + err.message, 'danger');
    }
  },

  // ── PRINT RECEIPT ────────────────────────────────────────────────────────────
  _printReceipt(visitId, patient, charges, subtotal, discount, total, paid, change) {
    const settings = App.settings || {};
    const clinic   = settings.pharmacy_name || 'Clinic';
    const address  = settings.address || '';
    const phone    = settings.phone || '';
    const now      = new Date();
    const dateStr  = now.toLocaleDateString('en-GB', { day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit' });

    const rows = charges.map(c => `
      <tr>
        <td>${c.description}</td>
        <td style="text-align:center">${c.type==='doctor'?'Doctor':c.type==='lab'?'Lab':'Other'}</td>
        <td style="text-align:right">${formatCurrency(c.amount)}</td>
      </tr>`).join('');

    const html = `
      <style>
        #fdReceiptContent { font-family: 'Courier New', monospace; width: 320px; margin: 0 auto; font-size: 12px; color: #000; }
        .rc-center { text-align: center; }
        .rc-bold   { font-weight: bold; }
        .rc-divider{ border-top: 1px dashed #000; margin: 4px 0; }
        .rc-table  { width: 100%; border-collapse: collapse; margin: 4px 0; }
        .rc-table td { padding: 2px 4px; vertical-align: top; }
        .rc-total-row td { font-weight: bold; border-top: 1px dashed #000; }
      </style>
      ${window.amcPrintHeader('receipt', 'VISIT RECEIPT')}
      <div><b>Visit #:</b> ${String(visitId).padStart(4,'0')}</div>
      <div><b>Date:</b> ${dateStr}</div>
      <div class="rc-divider"></div>
      <div><b>Patient:</b> ${patient.name}</div>
      ${patient.father_name ? `<div><b>Father/Husband:</b> ${patient.father_name}</div>` : ''}
      ${patient.nic   ? `<div><b>NIC:</b> ${patient.nic}</div>` : ''}
      ${patient.phone ? `<div><b>Phone:</b> ${patient.phone}</div>` : ''}
      ${patient.age   ? `<div><b>Age:</b> ${patient.age} | <b>Gender:</b> ${patient.gender==='M'?'Male':patient.gender==='F'?'Female':'Child'}</div>` : ''}
      <div class="rc-divider"></div>
      <table class="rc-table">
        <tr><td><b>Description</b></td><td style="text-align:center"><b>Type</b></td><td style="text-align:right"><b>Amount</b></td></tr>
        <tr><td colspan="3"><hr style="margin:2px 0;border-color:#000"/></td></tr>
        ${rows}
        ${discount > 0 ? `<tr><td>Discount</td><td></td><td style="text-align:right">- ${formatCurrency(discount)}</td></tr>` : ''}
        <tr class="rc-total-row">
          <td colspan="2">TOTAL</td>
          <td style="text-align:right">${formatCurrency(total)}</td>
        </tr>
        <tr>
          <td colspan="2">Cash Paid</td>
          <td style="text-align:right">${formatCurrency(paid)}</td>
        </tr>
        <tr>
          <td colspan="2">Change</td>
          <td style="text-align:right">${formatCurrency(change)}</td>
        </tr>
      </table>
      <div class="rc-divider"></div>
      <div class="rc-center">Thank you for visiting</div>
      <div class="rc-center">${clinic}</div>
      <div class="rc-center" style="margin-top:6px;font-size:9px;color:#999">Powered by HyperCloud.pk</div>
      <br/>`;

    const container = document.getElementById('fdReceiptContent');
    container.innerHTML = html;
    document.getElementById('fdReceiptPrint').style.display = 'block';
    window.print();
    setTimeout(() => { document.getElementById('fdReceiptPrint').style.display = 'none'; }, 1000);
  },

  // ── HISTORY ──────────────────────────────────────────────────────────────────
  _showHistory() {
    document.querySelectorAll('.fd-tab').forEach(b => b.classList.remove('active'));
    document.querySelector('[data-tab="history"]').classList.add('active');
    document.querySelectorAll('.fd-panel').forEach(p => p.style.display = 'none');
    document.getElementById('fd-panel-history').style.display = '';
    this._loadHistory();
  },

  async _loadHistory() {
    const from   = document.getElementById('fdHistFrom')?.value || today();
    const to     = document.getElementById('fdHistTo')?.value || today();
    const search = document.getElementById('fdHistSearch')?.value.trim() || '';
    const list   = document.getElementById('fdHistoryList');
    if (!list) return;
    list.innerHTML = '<div class="text-center py-3"><i class="fas fa-spinner fa-spin text-muted"></i></div>';
    const data = await window.api.fdGetVisits({ from, to, search });
    if (!data.length) {
      list.innerHTML = '<div class="text-center text-muted py-4 small">No visits found</div>';
      return;
    }
    list.innerHTML = `
      <div class="table-responsive">
        <table class="table table-sm table-hover mb-0">
          <thead><tr>
            <th>#</th><th>Patient</th><th>Phone</th><th>NIC</th>
            <th>Date</th><th class="text-end">Total</th><th></th>
          </tr></thead>
          <tbody>
            ${data.map(v => `
              <tr>
                <td><span class="badge bg-secondary">${String(v.id).padStart(4,'0')}</span></td>
                <td><strong>${v.patient_name}</strong><br>
                  <small class="text-muted">${v.father_name||''}</small></td>
                <td>${v.phone||'—'}</td>
                <td>${v.nic||'—'}</td>
                <td><small>${formatDate(v.visit_date)}</small></td>
                <td class="text-end fw-bold">${formatCurrency(v.total)}</td>
                <td>
                  <button class="btn btn-xs btn-outline-primary" style="font-size:11px;padding:2px 8px"
                    onclick="FrontDeskPage._viewVisit(${v.id})">
                    <i class="fas fa-eye"></i>
                  </button>
                  <button class="btn btn-xs btn-outline-secondary" style="font-size:11px;padding:2px 8px"
                    onclick="FrontDeskPage._reprintVisit(${v.id})">
                    <i class="fas fa-print"></i>
                  </button>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  },

  async _viewVisit(id) {
    const { visit: v, charges } = await window.api.fdGetVisitDetail(id);
    const rows = charges.map(c => `
      <tr>
        <td>${c.description}</td>
        <td><span class="badge bg-${c.charge_type==='doctor'?'primary':c.charge_type==='lab'?'info':'secondary'}">${c.charge_type}</span></td>
        <td class="text-end">${formatCurrency(c.amount)}</td>
      </tr>`).join('');
    showModalLg(`Visit #${String(v.id).padStart(4,'0')} — ${v.patient_name}`,
      `<div class="row g-2 mb-3">
        <div class="col-6"><small class="text-muted">Father/Husband</small><div>${v.father_name||'—'}</div></div>
        <div class="col-6"><small class="text-muted">NIC</small><div>${v.nic||'—'}</div></div>
        <div class="col-6"><small class="text-muted">Phone</small><div>${v.phone||'—'}</div></div>
        <div class="col-3"><small class="text-muted">Age</small><div>${v.age||'—'}</div></div>
        <div class="col-3"><small class="text-muted">Gender</small><div>${v.gender==='M'?'Male':v.gender==='F'?'Female':'Child'}</div></div>
        <div class="col-12"><small class="text-muted">Date</small><div>${formatDate(v.visit_date)}</div></div>
      </div>
      <table class="table table-sm">
        <thead><tr><th>Description</th><th>Type</th><th class="text-end">Amount</th></tr></thead>
        <tbody>${rows}</tbody>
        <tfoot class="table-light fw-bold">
          <tr><td colspan="2">Total</td><td class="text-end">${formatCurrency(v.total)}</td></tr>
          <tr><td colspan="2">Paid</td><td class="text-end">${formatCurrency(v.paid)}</td></tr>
        </tfoot>
      </table>`,
      `<button class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
       <button class="btn btn-primary" onclick="FrontDeskPage._reprintVisit(${v.id});closeModal()">
         <i class="fas fa-print me-1"></i>Reprint
       </button>`
    );
  },

  async _reprintVisit(id) {
    const { visit: v, charges } = await window.api.fdGetVisitDetail(id);
    this._printReceipt(v.id,
      { name: v.patient_name, father_name: v.father_name, nic: v.nic,
        phone: v.phone, age: v.age, gender: v.gender },
      charges.map(c => ({ description: c.description, type: c.charge_type, amount: c.amount, qty: c.qty })),
      v.subtotal, v.discount, v.total, v.paid, v.change_amount
    );
  },

  // ── DOCTORS MANAGEMENT ───────────────────────────────────────────────────────
  async _renderDoctorsManage() {
    this._doctors = await window.api.fdGetDoctors();
    const el = document.getElementById('fdDoctorsList');
    if (!el) return;
    if (!this._doctors.length) {
      el.innerHTML = '<p class="text-muted small text-center py-3">No doctors added yet.</p>';
      return;
    }
    el.innerHTML = `<table class="table table-sm table-hover">
      <thead><tr><th>Name</th><th>Specialty</th><th class="text-end">Fee</th><th></th></tr></thead>
      <tbody>
        ${this._doctors.map(d => `
          <tr>
            <td><strong>${d.name}</strong></td>
            <td>${d.specialty||'—'}</td>
            <td class="text-end">${formatCurrency(d.fee)}</td>
            <td class="text-end">
              <button class="btn btn-xs btn-outline-primary me-1" style="font-size:11px;padding:2px 8px"
                onclick="FrontDeskPage._doctorForm(${JSON.stringify(d).replace(/"/g,'&quot;')})">
                <i class="fas fa-edit"></i>
              </button>
              <button class="btn btn-xs btn-outline-danger" style="font-size:11px;padding:2px 8px"
                onclick="FrontDeskPage._deleteDoctor(${d.id})">
                <i class="fas fa-trash"></i>
              </button>
            </td>
          </tr>`).join('')}
      </tbody>
    </table>`;
  },

  _doctorForm(doc) {
    const isEdit = doc && doc.id;
    showModal(isEdit ? 'Edit Doctor' : 'Add Doctor',
      `<div class="mb-3"><label class="form-label">Name *</label>
        <input class="form-control" id="dName" value="${isEdit ? doc.name : ''}"/></div>
       <div class="mb-3"><label class="form-label">Specialty</label>
        <input class="form-control" id="dSpec" value="${isEdit ? (doc.specialty||'') : ''}" placeholder="e.g. General Physician"/></div>
       <div class="mb-3"><label class="form-label">Consultation Fee (PKR)</label>
        <input type="number" class="form-control" id="dFee" value="${isEdit ? doc.fee : 0}" min="0"/></div>`,
      `<button class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
       <button class="btn btn-success" onclick="FrontDeskPage._saveDoctor(${isEdit ? doc.id : 0})">Save</button>`
    );
  },

  async _saveDoctor(id) {
    const name = document.getElementById('dName').value.trim();
    if (!name) return showToast('Name is required', 'warning');
    const data = {
      id,
      name,
      specialty: document.getElementById('dSpec').value.trim(),
      fee: parseFloat(document.getElementById('dFee').value) || 0,
      active: 1
    };
    if (id) { await window.api.fdUpdateDoctor(data); }
    else     { await window.api.fdAddDoctor(data); }
    closeModal();
    showToast('Doctor saved');
    this._doctors = await window.api.fdGetDoctors();
    this._renderDoctorsManage();
  },

  async _deleteDoctor(id) {
    if (!confirm('Remove this doctor?')) return;
    await window.api.fdDeleteDoctor(id);
    this._doctors = await window.api.fdGetDoctors();
    this._renderDoctorsManage();
  },

  // ── LAB TESTS MANAGEMENT ─────────────────────────────────────────────────────
  async _renderLabManage() {
    this._labTests = await window.api.fdGetLabTests();
    const el = document.getElementById('fdLabList');
    if (!el) return;
    const cats = [...new Set(this._labTests.map(t => t.category))];
    el.innerHTML = cats.map(cat => {
      const tests = this._labTests.filter(t => t.category === cat);
      return `<div class="mb-3">
        <div class="fw-bold text-muted small border-bottom pb-1 mb-1">${cat}</div>
        ${tests.map(t => `
          <div class="d-flex align-items-center justify-content-between py-1 border-bottom border-light">
            <span style="font-size:13px">${t.name}</span>
            <div class="d-flex align-items-center gap-2">
              <strong style="min-width:80px;text-align:right">${formatCurrency(t.price)}</strong>
              <button class="btn btn-xs btn-outline-primary" style="font-size:11px;padding:2px 8px"
                onclick="FrontDeskPage._labForm(${JSON.stringify(t).replace(/"/g,'&quot;')})">
                <i class="fas fa-edit"></i>
              </button>
              <button class="btn btn-xs btn-outline-danger" style="font-size:11px;padding:2px 8px"
                onclick="FrontDeskPage._deleteLabTest(${t.id})">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>`).join('')}
      </div>`;
    }).join('') || '<p class="text-muted small text-center py-3">No lab tests added yet.</p>';
  },

  _labForm(test) {
    const isEdit = test && test.id;
    showModal(isEdit ? 'Edit Lab Test' : 'Add Lab Test',
      `<div class="mb-3"><label class="form-label">Test Name *</label>
        <input class="form-control" id="ltName" value="${isEdit ? test.name : ''}"/></div>
       <div class="mb-3"><label class="form-label">Category</label>
        <input class="form-control" id="ltCat" value="${isEdit ? (test.category||'General') : 'General'}"
          placeholder="e.g. Haematology, Biochemistry…"/></div>
       <div class="mb-3"><label class="form-label">Price (PKR)</label>
        <input type="number" class="form-control" id="ltPrice" value="${isEdit ? test.price : 0}" min="0"/></div>`,
      `<button class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
       <button class="btn btn-success" onclick="FrontDeskPage._saveLabTest(${isEdit ? test.id : 0})">Save</button>`
    );
  },

  async _saveLabTest(id) {
    const name = document.getElementById('ltName').value.trim();
    if (!name) return showToast('Test name is required', 'warning');
    const data = {
      id,
      name,
      category: document.getElementById('ltCat').value.trim() || 'General',
      price: parseFloat(document.getElementById('ltPrice').value) || 0,
      active: 1
    };
    if (id) { await window.api.fdUpdateLabTest(data); }
    else     { await window.api.fdAddLabTest(data); }
    closeModal();
    showToast('Lab test saved');
    this._labTests = await window.api.fdGetLabTests();
    this._renderLabManage();
  },

  async _deleteLabTest(id) {
    if (!confirm('Remove this lab test?')) return;
    await window.api.fdDeleteLabTest(id);
    this._labTests = await window.api.fdGetLabTests();
    this._renderLabManage();
  },

  // ── REPORTS ──────────────────────────────────────────────────────────────────
  _initReports() {
    this._activeRep = 'summary';
    document.querySelectorAll('.fd-rep-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.fd-rep-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this._activeRep = btn.dataset.rep;
        this._loadReport(btn.dataset.rep);
      });
    });
    this._loadReport('summary');
  },

  async _loadReport(type) {
    const el = document.getElementById('fdRepContent');
    if (!el) return;
    el.innerHTML = '<div class="text-center py-4"><i class="fas fa-spinner fa-spin text-muted fa-lg"></i></div>';
    if (type === 'summary')  { await this._repSummary(el); return; }
    if (type === 'daily')    { await this._repDaily(el);   return; }
    if (type === 'doctors')  { await this._repDoctors(el); return; }
    if (type === 'labtests') { await this._repLabTests(el); return; }
    if (type === 'monthly')  { await this._repMonthly(el); return; }
  },

  // ── SUMMARY REPORT ───────────────────────────────────────────────────────────
  async _repSummary(el) {
    const mStart = today().slice(0,7) + '-01';
    el.innerHTML = `
      <div class="d-flex gap-2 flex-wrap align-items-center mt-1 mb-2">
        <input type="date" id="rSumFrom" class="form-control form-control-sm" style="width:140px" value="${mStart}"/>
        <span class="text-muted small">to</span>
        <input type="date" id="rSumTo" class="form-control form-control-sm" style="width:140px" value="${today()}"/>
        <button class="btn btn-primary btn-sm" onclick="FrontDeskPage._runRepSummary()">
          <i class="fas fa-search me-1"></i>Go
        </button>
      </div>
      <div id="rSumResult"></div>`;
    await this._runRepSummary();
  },

  async _runRepSummary() {
    const from = document.getElementById('rSumFrom')?.value || today().slice(0,7)+'-01';
    const to   = document.getElementById('rSumTo')?.value   || today();
    const d    = await window.api.fdReportSummary({ from, to });
    const o    = d.overview || {};
    const maxRev = Math.max(...(d.topDoctors||[]).map(x=>x.revenue), 1);
    const maxCnt = Math.max(...(d.topTests||[]).map(x=>x.cnt), 1);
    const typeColor = { doctor:'primary', lab:'info', custom:'warning' };

    document.getElementById('rSumResult').innerHTML = `
      <div class="row g-2 mb-3">
        ${this._statCard('Total Visits',    o.total_visits   ||0, 'fa-calendar-check','#3b82f6')}
        ${this._statCard('Total Revenue',   formatCurrency(o.total_revenue||0), 'fa-coins','#1abc8a')}
        ${this._statCard('Total Discounts', formatCurrency(o.total_discounts||0), 'fa-tag','#f59e0b')}
        ${this._statCard('Collected Cash',  formatCurrency(o.total_collected||0), 'fa-hand-holding-usd','#8b5cf6')}
      </div>
      <div class="row g-3 mb-3">
        <div class="col-5">
          <div class="fd-rep-box">
            <div class="fd-rep-box-title">Revenue by Type</div>
            ${(d.byType||[]).map(t=>`
              <div class="d-flex justify-content-between align-items-center py-1">
                <span class="badge bg-${typeColor[t.charge_type]||'secondary'} me-2">${t.charge_type}</span>
                <span class="small">${t.cnt} charges</span>
                <strong>${formatCurrency(t.revenue)}</strong>
              </div>`).join('') || '<p class="text-muted small">No data</p>'}
          </div>
        </div>
        <div class="col-7">
          <div class="fd-rep-box">
            <div class="fd-rep-box-title">Top Doctors</div>
            ${(d.topDoctors||[]).map(doc=>`
              <div class="mb-1">
                <div class="d-flex justify-content-between" style="font-size:12px">
                  <span>${doc.name}</span>
                  <span class="text-primary">${formatCurrency(doc.revenue)}</span>
                </div>
                <div class="fd-rep-bar" style="width:${Math.round(doc.revenue/maxRev*100)}%;background:#3b82f6"></div>
              </div>`).join('') || '<p class="text-muted small">No doctor visits</p>'}
          </div>
        </div>
      </div>
      <div class="fd-rep-box">
        <div class="fd-rep-box-title">Top Lab Tests Ordered</div>
        <div class="row g-1">
          ${(d.topTests||[]).map(t=>`
            <div class="col-12">
              <div class="d-flex align-items-center gap-2" style="font-size:12px">
                <span style="min-width:200px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${t.name}</span>
                <div class="fd-rep-bar-track flex-1">
                  <div class="fd-rep-bar" style="width:${Math.round(t.cnt/maxCnt*100)}%;background:#06b6d4"></div>
                </div>
                <span class="text-muted" style="min-width:30px">${t.cnt}×</span>
                <strong style="min-width:70px;text-align:right">${formatCurrency(t.revenue)}</strong>
              </div>
            </div>`).join('') || '<p class="text-muted small">No lab tests</p>'}
        </div>
      </div>`;
  },

  // ── DAILY REPORT ─────────────────────────────────────────────────────────────
  async _repDaily(el) {
    el.innerHTML = `
      <div class="d-flex gap-2 align-items-center mt-1 mb-2">
        <label class="small fw-bold text-muted">Date:</label>
        <input type="date" id="rDailyDate" class="form-control form-control-sm" style="width:160px" value="${today()}"/>
        <button class="btn btn-primary btn-sm" onclick="FrontDeskPage._runRepDaily()">
          <i class="fas fa-search me-1"></i>Load
        </button>
      </div>
      <div id="rDailyResult"></div>`;
    await this._runRepDaily();
  },

  async _runRepDaily() {
    const date = document.getElementById('rDailyDate')?.value || today();
    const d    = await window.api.fdReportDaily(date);
    const s    = d.summary || {};
    const typeColor = { doctor:'primary', lab:'info', custom:'warning' };
    document.getElementById('rDailyResult').innerHTML = `
      <div class="row g-2 mb-2">
        ${this._statCard('Visits', s.visits||0, 'fa-users','#3b82f6')}
        ${this._statCard('Revenue', formatCurrency(s.revenue||0), 'fa-coins','#1abc8a')}
        ${this._statCard('Discounts', formatCurrency(s.discounts||0), 'fa-tag','#f59e0b')}
        ${this._statCard('Collected', formatCurrency(s.collected||0), 'fa-hand-holding-usd','#8b5cf6')}
      </div>
      <div class="row g-2 mb-2">
        <div class="col-5">
          <div class="fd-rep-box">
            <div class="fd-rep-box-title">By Charge Type</div>
            ${(d.byType||[]).map(t=>`
              <div class="d-flex justify-content-between py-1">
                <span class="badge bg-${typeColor[t.charge_type]||'secondary'}">${t.charge_type}</span>
                <strong>${formatCurrency(t.revenue)}</strong>
              </div>`).join('') || '<p class="text-muted small">No charges</p>'}
          </div>
        </div>
        <div class="col-7">
          <div class="fd-rep-box">
            <div class="fd-rep-box-title">Charge Breakdown</div>
            ${(d.items||[]).length
              ? `<table class="table table-sm mb-0" style="font-size:11px">
                   <thead><tr><th>Description</th><th>Type</th><th class="text-end">Amount</th></tr></thead>
                   <tbody>${(d.items||[]).map(i=>`
                     <tr><td>${i.description}</td>
                       <td><span class="badge bg-${typeColor[i.charge_type]||'secondary'}">${i.charge_type}</span></td>
                       <td class="text-end">${formatCurrency(i.revenue)}</td>
                     </tr>`).join('')}</tbody>
                 </table>`
              : '<p class="text-muted small">No data</p>'}
          </div>
        </div>
      </div>
      <div class="fd-rep-box">
        <div class="fd-rep-box-title">Patient Visits (${(d.visits||[]).length})</div>
        ${(d.visits||[]).length
          ? `<table class="table table-sm table-hover mb-0" style="font-size:11px">
               <thead><tr><th>#</th><th>Patient</th><th>Phone</th><th class="text-end">Total</th><th></th></tr></thead>
               <tbody>${(d.visits||[]).map(v=>`
                 <tr>
                   <td>${String(v.id).padStart(4,'0')}</td>
                   <td>${v.patient_name}</td>
                   <td>${v.phone||'—'}</td>
                   <td class="text-end fw-bold">${formatCurrency(v.total)}</td>
                   <td><button class="btn btn-xs btn-outline-secondary" style="font-size:10px;padding:1px 6px"
                     onclick="FrontDeskPage._reprintVisit(${v.id})"><i class="fas fa-print"></i></button></td>
                 </tr>`).join('')}
               </tbody>
             </table>`
          : '<p class="text-muted small text-center py-2">No visits on this date</p>'}
      </div>`;
  },

  // ── DOCTOR-WISE REPORT ────────────────────────────────────────────────────────
  async _repDoctors(el) {
    const mStart = today().slice(0,7) + '-01';
    el.innerHTML = `
      <div class="d-flex gap-2 flex-wrap align-items-center mt-1 mb-2">
        <input type="date" id="rDocFrom" class="form-control form-control-sm" style="width:140px" value="${mStart}"/>
        <span class="text-muted small">to</span>
        <input type="date" id="rDocTo" class="form-control form-control-sm" style="width:140px" value="${today()}"/>
        <button class="btn btn-primary btn-sm" onclick="FrontDeskPage._runRepDoctors()">
          <i class="fas fa-search me-1"></i>Go
        </button>
      </div>
      <div id="rDocResult"></div>`;
    await this._runRepDoctors();
  },

  async _runRepDoctors() {
    const from = document.getElementById('rDocFrom')?.value || today().slice(0,7)+'-01';
    const to   = document.getElementById('rDocTo')?.value   || today();
    const data = await window.api.fdReportDoctors({ from, to });
    const total = data.reduce((s,d)=>s+d.revenue,0);
    const maxRev = Math.max(...data.map(d=>d.revenue), 1);
    document.getElementById('rDocResult').innerHTML = !data.length
      ? '<p class="text-muted small text-center py-4">No doctor consultations in this period</p>'
      : `<div class="fd-rep-box mb-2">
           <div class="d-flex justify-content-between mb-2">
             <div class="fd-rep-box-title">Doctor Wise Collections</div>
             <strong class="text-success">${formatCurrency(total)}</strong>
           </div>
           ${data.map(d=>`
             <div class="mb-2">
               <div class="d-flex justify-content-between" style="font-size:12px">
                 <span class="fw-bold">${d.doctor}</span>
                 <div class="d-flex gap-3">
                   <span class="text-muted">${d.visits} visits</span>
                   <strong class="text-primary">${formatCurrency(d.revenue)}</strong>
                 </div>
               </div>
               <div class="fd-rep-bar-track mt-1">
                 <div class="fd-rep-bar" style="width:${Math.round(d.revenue/maxRev*100)}%;background:#3b82f6"></div>
               </div>
             </div>`).join('')}
         </div>
         <table class="table table-sm table-bordered" style="font-size:12px">
           <thead class="table-light"><tr><th>Doctor</th><th class="text-center">Visits</th>
             <th class="text-end">Revenue</th><th class="text-end">Avg/Visit</th></tr></thead>
           <tbody>${data.map(d=>`
             <tr>
               <td><i class="fas fa-user-md text-primary me-1"></i>${d.doctor}</td>
               <td class="text-center">${d.visits}</td>
               <td class="text-end fw-bold">${formatCurrency(d.revenue)}</td>
               <td class="text-end text-muted">${formatCurrency(d.visits?d.revenue/d.visits:0)}</td>
             </tr>`).join('')}
           </tbody>
           <tfoot class="table-light fw-bold">
             <tr><td>TOTAL</td><td class="text-center">${data.reduce((s,d)=>s+d.visits,0)}</td>
               <td class="text-end">${formatCurrency(total)}</td><td></td></tr>
           </tfoot>
         </table>`;
  },

  // ── LAB TESTS REPORT ─────────────────────────────────────────────────────────
  async _repLabTests(el) {
    const mStart = today().slice(0,7) + '-01';
    el.innerHTML = `
      <div class="d-flex gap-2 flex-wrap align-items-center mt-1 mb-2">
        <input type="date" id="rLabFrom" class="form-control form-control-sm" style="width:140px" value="${mStart}"/>
        <span class="text-muted small">to</span>
        <input type="date" id="rLabTo" class="form-control form-control-sm" style="width:140px" value="${today()}"/>
        <button class="btn btn-primary btn-sm" onclick="FrontDeskPage._runRepLabTests()">
          <i class="fas fa-search me-1"></i>Go
        </button>
      </div>
      <div id="rLabResult"></div>`;
    await this._runRepLabTests();
  },

  async _runRepLabTests() {
    const from = document.getElementById('rLabFrom')?.value || today().slice(0,7)+'-01';
    const to   = document.getElementById('rLabTo')?.value   || today();
    const d    = await window.api.fdReportLabTests({ from, to });
    const total = (d.tests||[]).reduce((s,t)=>s+t.revenue,0);
    const maxCnt = Math.max(...(d.tests||[]).map(t=>t.cnt), 1);
    document.getElementById('rLabResult').innerHTML = !(d.tests||[]).length
      ? '<p class="text-muted small text-center py-4">No lab tests in this period</p>'
      : `<div class="row g-2 mb-2">
           ${(d.byCat||[]).map(c=>`
             <div class="col-6 col-md-4">
               <div class="fd-rep-box text-center">
                 <div style="font-size:11px;color:#6c757d">${c.category||'Uncategorized'}</div>
                 <div class="fw-bold" style="font-size:13px;color:#06b6d4">${formatCurrency(c.revenue)}</div>
                 <div style="font-size:10px;color:#9aa3b0">${c.cnt} tests</div>
               </div>
             </div>`).join('')}
         </div>
         <div class="fd-rep-box">
           <div class="d-flex justify-content-between mb-2">
             <div class="fd-rep-box-title">Test-wise Orders</div>
             <strong class="text-info">${formatCurrency(total)}</strong>
           </div>
           <table class="table table-sm table-hover mb-0" style="font-size:11px">
             <thead><tr><th>Test Name</th><th class="text-center">Orders</th><th class="text-end">Revenue</th></tr></thead>
             <tbody>
               ${(d.tests||[]).map(t=>`
                 <tr>
                   <td>
                     ${t.name}
                     <div class="fd-rep-bar-track mt-1" style="height:3px">
                       <div class="fd-rep-bar" style="width:${Math.round(t.cnt/maxCnt*100)}%;background:#06b6d4;height:3px"></div>
                     </div>
                   </td>
                   <td class="text-center">${t.cnt}</td>
                   <td class="text-end fw-bold">${formatCurrency(t.revenue)}</td>
                 </tr>`).join('')}
             </tbody>
           </table>
         </div>`;
  },

  // ── MONTHLY REPORT ────────────────────────────────────────────────────────────
  async _repMonthly(el) {
    const ym = today().slice(0,7);
    el.innerHTML = `
      <div class="d-flex gap-2 align-items-center mt-1 mb-2">
        <label class="small fw-bold text-muted">Month:</label>
        <input type="month" id="rMonthYM" class="form-control form-control-sm" style="width:160px" value="${ym}"/>
        <button class="btn btn-primary btn-sm" onclick="FrontDeskPage._runRepMonthly()">
          <i class="fas fa-search me-1"></i>Load
        </button>
      </div>
      <div id="rMonthResult"></div>`;
    await this._runRepMonthly();
  },

  async _runRepMonthly() {
    const ym  = document.getElementById('rMonthYM')?.value || today().slice(0,7);
    const d   = await window.api.fdReportMonthly(ym);
    const t   = d.totals || {};
    const maxRev = Math.max(...(d.days||[]).map(x=>x.revenue), 1);
    document.getElementById('rMonthResult').innerHTML = `
      <div class="row g-2 mb-3">
        ${this._statCard('Total Visits', t.visits||0, 'fa-calendar-check','#3b82f6')}
        ${this._statCard('Total Revenue', formatCurrency(t.revenue||0), 'fa-coins','#1abc8a')}
        ${this._statCard('Doctor Fees', formatCurrency(d.doctorRevenue?.revenue||0), 'fa-user-md','#8b5cf6')}
        ${this._statCard('Lab Revenue', formatCurrency(d.labRevenue?.revenue||0), 'fa-flask','#06b6d4')}
      </div>
      ${!(d.days||[]).length
        ? '<p class="text-muted small text-center py-4">No visits this month</p>'
        : `<div class="fd-rep-box">
             <div class="fd-rep-box-title mb-2">Daily Breakdown — ${ym}</div>
             <table class="table table-sm table-hover mb-0" style="font-size:12px">
               <thead><tr><th>Date</th><th class="text-center">Visits</th><th class="text-end">Revenue</th><th class="text-end">Discount</th><th>Trend</th></tr></thead>
               <tbody>
                 ${(d.days||[]).map(day=>`
                   <tr>
                     <td>${formatDate(day.day)}</td>
                     <td class="text-center">${day.visits}</td>
                     <td class="text-end fw-bold text-success">${formatCurrency(day.revenue)}</td>
                     <td class="text-end text-warning">${formatCurrency(day.discounts)}</td>
                     <td style="width:100px">
                       <div class="fd-rep-bar-track" style="height:6px">
                         <div class="fd-rep-bar" style="width:${Math.round(day.revenue/maxRev*100)}%;background:#1abc8a;height:6px;border-radius:3px"></div>
                       </div>
                     </td>
                   </tr>`).join('')}
               </tbody>
               <tfoot class="table-light fw-bold">
                 <tr><td>TOTAL</td><td class="text-center">${t.visits||0}</td>
                   <td class="text-end text-success">${formatCurrency(t.revenue||0)}</td>
                   <td class="text-end text-warning">${formatCurrency(t.discounts||0)}</td><td></td></tr>
               </tfoot>
             </table>
           </div>`}`;
  },

  // ── HELPERS ───────────────────────────────────────────────────────────────────
  _statCard(label, value, icon, color) {
    return `<div class="col-6 col-md-3">
      <div class="fd-stat-card">
        <div class="fd-stat-icon" style="background:${color}">
          <i class="fas ${icon}"></i>
        </div>
        <div>
          <div class="fd-stat-val">${value}</div>
          <div class="fd-stat-label">${label}</div>
        </div>
      </div>
    </div>`;
  },
};
