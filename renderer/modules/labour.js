// renderer/modules/labour.js — Labour Room Module

window.LabourPage = {
  _tab: 'active',

  async render() {
    const el = document.getElementById('page-content');
    const today = new Date().toISOString().split('T')[0];

    el.innerHTML = `
    <div class="row g-2 mb-3 align-items-center">
      <div class="col-auto">
        <button class="btn btn-danger" onclick="LabourPage._admissionModal()">
          <i class="fas fa-plus me-1"></i>New Admission
        </button>
      </div>
      <div class="col-auto ms-auto">
        <div class="btn-group">
          <button class="btn btn-sm ${this._tab==='active'?'btn-primary':'btn-outline-primary'}" onclick="LabourPage._switchTab('active')">
            <i class="fas fa-procedures me-1"></i>Active
          </button>
          <button class="btn btn-sm ${this._tab==='history'?'btn-primary':'btn-outline-primary'}" onclick="LabourPage._switchTab('history')">
            <i class="fas fa-history me-1"></i>History
          </button>
          <button class="btn btn-sm ${this._tab==='stats'?'btn-primary':'btn-outline-primary'}" onclick="LabourPage._switchTab('stats')">
            <i class="fas fa-chart-bar me-1"></i>Stats
          </button>
        </div>
      </div>
    </div>

    <!-- Active Tab -->
    <div id="lrTabActive" style="display:${this._tab==='active'?'block':'none'}">
      <div id="lrActiveList"><div class="text-center py-4"><i class="fas fa-spinner fa-spin fa-2x text-muted"></i></div></div>
    </div>

    <!-- History Tab -->
    <div id="lrTabHistory" style="display:${this._tab==='history'?'block':'none'}">
      <div class="card mb-3">
        <div class="card-body py-2">
          <div class="row g-2 align-items-end">
            <div class="col-md-4">
              <input type="text" class="form-control form-control-sm" id="lrSearch"
                placeholder="Search name, husband, phone…" oninput="LabourPage._loadHistory()"/>
            </div>
            <div class="col-md-2">
              <select class="form-select form-select-sm" id="lrStatusFilter" onchange="LabourPage._loadHistory()">
                <option value="">All Status</option>
                <option value="admitted">Admitted</option>
                <option value="delivered">Delivered</option>
                <option value="discharged">Discharged</option>
              </select>
            </div>
            <div class="col-md-2">
              <input type="date" class="form-control form-control-sm" id="lrDateFrom"
                value="${today.substring(0,7)}-01" onchange="LabourPage._loadHistory()"/>
            </div>
            <div class="col-md-2">
              <input type="date" class="form-control form-control-sm" id="lrDateTo"
                value="${today}" onchange="LabourPage._loadHistory()"/>
            </div>
            <div class="col-md-2">
              <button class="btn btn-outline-secondary btn-sm w-100" onclick="LabourPage._loadHistory()">
                <i class="fas fa-search me-1"></i>Search
              </button>
            </div>
          </div>
        </div>
      </div>
      <div id="lrHistoryList"></div>
    </div>

    <!-- Stats Tab -->
    <div id="lrTabStats" style="display:${this._tab==='stats'?'block':'none'}">
      <div class="row g-2 mb-3">
        <div class="col-md-3">
          <input type="date" class="form-control form-control-sm" id="lrStatsFrom" value="${today.substring(0,7)}-01"/>
        </div>
        <div class="col-md-3">
          <input type="date" class="form-control form-control-sm" id="lrStatsTo" value="${today}"/>
        </div>
        <div class="col-auto">
          <button class="btn btn-primary btn-sm" onclick="LabourPage._loadStats()">
            <i class="fas fa-sync me-1"></i>Refresh
          </button>
        </div>
      </div>
      <div id="lrStatsArea"></div>
    </div>`;

    if (this._tab === 'active')  this._loadActive();
    if (this._tab === 'history') this._loadHistory();
    if (this._tab === 'stats')   this._loadStats();
  },

  _switchTab(tab) {
    this._tab = tab;
    ['active','history','stats'].forEach(t => {
      document.getElementById('lrTab'+t.charAt(0).toUpperCase()+t.slice(1)).style.display = t===tab?'block':'none';
    });
    document.querySelectorAll('.btn-group .btn').forEach((b,i) => {
      const tabs = ['active','history','stats'];
      b.className = b.className.replace(/btn-(outline-)?primary/,'') + (tabs[i]===tab?' btn-primary':' btn-outline-primary');
    });
    if (tab === 'active')  this._loadActive();
    if (tab === 'history') this._loadHistory();
    if (tab === 'stats')   this._loadStats();
  },

  // ── ACTIVE PATIENTS ────────────────────────────────────────────────────────
  async _loadActive() {
    const el = document.getElementById('lrActiveList');
    if (!el) return;
    const data = await window.api.lrGetAdmissions({ status: 'admitted' });
    if (!data.length) {
      el.innerHTML = `<div class="alert alert-info text-center">
        <i class="fas fa-procedures fa-2x mb-2 d-block text-muted"></i>
        No patients currently admitted in Labour Room</div>`;
      return;
    }
    el.innerHTML = `<div class="row g-3">${data.map(a => `
      <div class="col-md-6 col-xl-4">
        <div class="card border-danger h-100">
          <div class="card-header bg-danger text-white d-flex align-items-center gap-2 py-2">
            <i class="fas fa-procedures"></i>
            <strong>${a.patient_name}</strong>
            <span class="ms-auto badge bg-light text-danger">#LR-${String(a.id).padStart(4,'0')}</span>
          </div>
          <div class="card-body py-2" style="font-size:13px">
            <div><b>Husband:</b> ${a.husband_name||'—'}</div>
            <div><b>Age:</b> ${a.age||'—'} yrs &nbsp;|&nbsp; <b>G${a.gravida}P${a.para}</b> &nbsp;|&nbsp; <b>${a.gest_age||'?'} Wks</b></div>
            <div><b>Phone:</b> ${a.phone||'—'}</div>
            <div><b>BP:</b> ${a.bp||'—'} &nbsp;|&nbsp; <b>Type:</b> ${this._admType(a.admission_type)}</div>
            <div><b>Doctor:</b> ${a.doctor||'—'} &nbsp;|&nbsp; <b>Midwife:</b> ${a.midwife||'—'}</div>
            <div><b>Admitted:</b> ${this._fmt(a.admission_date)}</div>
            ${a.notes ? `<div class="text-muted small mt-1"><i class="fas fa-sticky-note me-1"></i>${a.notes}</div>` : ''}
          </div>
          <div class="card-footer py-2 d-flex gap-1 flex-wrap">
            <button class="btn btn-success btn-sm flex-grow-1" onclick="LabourPage._deliveryModal(${a.id})">
              <i class="fas fa-baby me-1"></i>Record Delivery
            </button>
            <button class="btn btn-outline-primary btn-sm" onclick="LabourPage._admissionModal(${a.id})" title="Edit">
              <i class="fas fa-edit"></i>
            </button>
            <button class="btn btn-outline-danger btn-sm" onclick="LabourPage._delete(${a.id})" title="Delete">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
      </div>`).join('')}</div>`;
  },

  // ── HISTORY TABLE ──────────────────────────────────────────────────────────
  async _loadHistory() {
    const el = document.getElementById('lrHistoryList');
    if (!el) return;
    const filter = {
      search:    (document.getElementById('lrSearch')?.value    || '').trim(),
      status:     document.getElementById('lrStatusFilter')?.value || '',
      date_from:  document.getElementById('lrDateFrom')?.value   || '',
      date_to:    document.getElementById('lrDateTo')?.value     || ''
    };
    const data = await window.api.lrGetAdmissions(filter);
    if (!data.length) {
      el.innerHTML = `<div class="alert alert-info text-center">No records found</div>`;
      return;
    }
    el.innerHTML = `<div class="card"><div class="card-body p-0">
      <div class="table-responsive">
      <table class="table table-sm table-hover mb-0">
        <thead class="table-dark">
          <tr>
            <th>#</th><th>Patient</th><th>Husband</th><th>Age/G-P</th>
            <th>Admitted</th><th>Type</th><th>Doctor</th>
            <th>Status</th><th>Delivery</th><th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${data.map(a => `<tr>
            <td><span class="badge bg-secondary">LR-${String(a.id).padStart(4,'0')}</span></td>
            <td><strong>${a.patient_name}</strong><br><small class="text-muted">${a.phone||''}</small></td>
            <td>${a.husband_name||'—'}</td>
            <td>${a.age||'?'}y / G${a.gravida}P${a.para}</td>
            <td><small>${this._fmt(a.admission_date)}</small></td>
            <td><span class="badge ${this._admTypeBadge(a.admission_type)}">${this._admType(a.admission_type)}</span></td>
            <td><small>${a.doctor||'—'}</small></td>
            <td>${this._statusBadge(a.status)}</td>
            <td><small>${a.delivery_date ? this._fmt(a.delivery_date) + '<br>' + this._delType(a.delivery_type) : '—'}</small></td>
            <td>
              <button class="btn btn-xs btn-outline-primary" style="font-size:11px;padding:2px 6px" title="View/Print"
                onclick="LabourPage._viewRecord(${a.id})"><i class="fas fa-eye"></i></button>
              ${a.status==='admitted' ? `<button class="btn btn-xs btn-outline-success" style="font-size:11px;padding:2px 6px" title="Record Delivery"
                onclick="LabourPage._deliveryModal(${a.id})"><i class="fas fa-baby"></i></button>` : ''}
              <button class="btn btn-xs btn-outline-danger" style="font-size:11px;padding:2px 6px" title="Delete"
                onclick="LabourPage._delete(${a.id})"><i class="fas fa-trash"></i></button>
            </td>
          </tr>`).join('')}
        </tbody>
      </table></div></div></div>`;
  },

  // ── STATS ──────────────────────────────────────────────────────────────────
  async _loadStats() {
    const el = document.getElementById('lrStatsArea');
    if (!el) return;
    const from = document.getElementById('lrStatsFrom')?.value || '';
    const to   = document.getElementById('lrStatsTo')?.value   || '';
    const s = await window.api.lrGetStats(from, to);
    const pending = s.total - s.delivered;
    el.innerHTML = `
    <div class="row g-3">
      ${[
        { label:'Total Admissions', val: s.total,     icon:'procedures',   color:'primary' },
        { label:'Delivered',        val: s.delivered,  icon:'baby',         color:'success' },
        { label:'Active / Pending', val: pending,      icon:'hourglass-half',color:'warning' },
        { label:'Normal (SVD)',     val: s.svd,        icon:'heart',        color:'info'    },
        { label:'C-Section (LSCS)',val: s.lscs,       icon:'syringe',      color:'danger'  },
        { label:'Boys Born',        val: s.boys,       icon:'mars',         color:'primary' },
        { label:'Girls Born',       val: s.girls,      icon:'venus',        color:'danger'  },
        { label:'Total Babies',     val: s.boys+s.girls, icon:'baby-carriage', color:'success' },
      ].map(c => `
      <div class="col-6 col-md-3">
        <div class="card text-center border-${c.color}">
          <div class="card-body py-3">
            <i class="fas fa-${c.icon} fa-2x text-${c.color} mb-2"></i>
            <h2 class="fw-bold mb-0">${c.val}</h2>
            <div class="small text-muted">${c.label}</div>
          </div>
        </div>
      </div>`).join('')}
    </div>`;
  },

  // ── ADMISSION MODAL ────────────────────────────────────────────────────────
  async _admissionModal(id = null) {
    let a = null;
    if (id) {
      const res = await window.api.lrGetAdmission(id);
      a = res.admission;
    }
    const now = new Date();
    const defDate = now.toISOString().slice(0,16);

    showModal(id ? 'Edit Admission' : 'New Admission — Labour Room', `
      <div class="row g-2">
        <div class="col-md-6">
          <label class="form-label">Patient Name <span class="text-danger">*</span></label>
          <input type="text" class="form-control form-control-sm" id="lrPN" value="${a?.patient_name||''}" placeholder="Mother's name"/>
        </div>
        <div class="col-md-6">
          <label class="form-label">Husband Name</label>
          <input type="text" class="form-control form-control-sm" id="lrHN" value="${a?.husband_name||''}"/>
        </div>
        <div class="col-md-3">
          <label class="form-label">Age (yrs)</label>
          <input type="number" class="form-control form-control-sm" id="lrAge" value="${a?.age||''}" min="10" max="60"/>
        </div>
        <div class="col-md-3">
          <label class="form-label">Phone</label>
          <input type="text" class="form-control form-control-sm" id="lrPhone" value="${a?.phone||''}"/>
        </div>
        <div class="col-md-3">
          <label class="form-label">Gravida (G)</label>
          <input type="number" class="form-control form-control-sm" id="lrG" value="${a?.gravida||1}" min="1"/>
        </div>
        <div class="col-md-3">
          <label class="form-label">Para (P)</label>
          <input type="number" class="form-control form-control-sm" id="lrP" value="${a?.para||0}" min="0"/>
        </div>
        <div class="col-md-4">
          <label class="form-label">Gestational Age (wks)</label>
          <input type="number" class="form-control form-control-sm" id="lrGA" value="${a?.gest_age||''}" min="20" max="45"/>
        </div>
        <div class="col-md-4">
          <label class="form-label">BP</label>
          <input type="text" class="form-control form-control-sm" id="lrBP" value="${a?.bp||''}" placeholder="120/80"/>
        </div>
        <div class="col-md-4">
          <label class="form-label">Admission Type</label>
          <select class="form-select form-select-sm" id="lrType">
            <option value="normal"   ${(a?.admission_type||'normal')==='normal'   ?'selected':''}>Normal Labour</option>
            <option value="emergency"${a?.admission_type==='emergency'?'selected':''}>Emergency</option>
            <option value="elective" ${a?.admission_type==='elective' ?'selected':''}>Elective C-Section</option>
            <option value="referred" ${a?.admission_type==='referred' ?'selected':''}>Referred</option>
          </select>
        </div>
        <div class="col-md-12">
          <label class="form-label">Address</label>
          <input type="text" class="form-control form-control-sm" id="lrAddr" value="${a?.address||''}"/>
        </div>
        <div class="col-md-4">
          <label class="form-label">Doctor</label>
          <input type="text" class="form-control form-control-sm" id="lrDoc" value="${a?.doctor||''}"/>
        </div>
        <div class="col-md-4">
          <label class="form-label">Midwife / Nurse</label>
          <input type="text" class="form-control form-control-sm" id="lrMid" value="${a?.midwife||''}"/>
        </div>
        <div class="col-md-4">
          <label class="form-label">Referred From</label>
          <input type="text" class="form-control form-control-sm" id="lrRef" value="${a?.refer_from||''}"/>
        </div>
        <div class="col-md-6">
          <label class="form-label">Admission Date/Time <span class="text-danger">*</span></label>
          <input type="datetime-local" class="form-control form-control-sm" id="lrADate"
            value="${a?.admission_date ? a.admission_date.slice(0,16) : defDate}"/>
        </div>
        <div class="col-md-6">
          <label class="form-label">Notes</label>
          <input type="text" class="form-control form-control-sm" id="lrNotes" value="${a?.notes||''}" placeholder="Any observations…"/>
        </div>
      </div>`,
      `<button class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
       <button class="btn btn-danger" onclick="LabourPage._saveAdmission(${id||'null'})">
         <i class="fas fa-save me-1"></i>${id ? 'Update' : 'Admit Patient'}</button>`);
  },

  async _saveAdmission(id) {
    const name = document.getElementById('lrPN').value.trim();
    if (!name) { showToast('Patient name required', 'danger'); return; }
    const data = {
      id: id || undefined,
      patient_name:   name,
      husband_name:   document.getElementById('lrHN').value.trim(),
      age:            parseInt(document.getElementById('lrAge').value)||0,
      phone:          document.getElementById('lrPhone').value.trim(),
      address:        document.getElementById('lrAddr').value.trim(),
      gravida:        parseInt(document.getElementById('lrG').value)||1,
      para:           parseInt(document.getElementById('lrP').value)||0,
      gest_age:       parseInt(document.getElementById('lrGA').value)||0,
      bp:             document.getElementById('lrBP').value.trim(),
      admission_type: document.getElementById('lrType').value,
      doctor:         document.getElementById('lrDoc').value.trim(),
      midwife:        document.getElementById('lrMid').value.trim(),
      refer_from:     document.getElementById('lrRef').value.trim(),
      admission_date: document.getElementById('lrADate').value,
      notes:          document.getElementById('lrNotes').value.trim(),
    };
    await window.api.lrSaveAdmission(data);
    closeModal();
    showToast(id ? 'Admission updated' : 'Patient admitted to Labour Room', 'success');
    this.render();
  },

  // ── DELIVERY MODAL ─────────────────────────────────────────────────────────
  async _deliveryModal(admissionId) {
    const { admission: a, delivery: d } = await window.api.lrGetAdmission(admissionId);
    const now = new Date().toISOString().slice(0,16);

    showModal(`Record Delivery — ${a.patient_name}`, `
      <div class="alert alert-info py-2 small mb-3">
        <b>Patient:</b> ${a.patient_name} | <b>G${a.gravida}P${a.para}</b> | <b>${a.gest_age||'?'} Wks</b> |
        <b>Admitted:</b> ${this._fmt(a.admission_date)}
      </div>
      <div class="row g-2">
        <div class="col-md-6">
          <label class="form-label">Delivery Date/Time <span class="text-danger">*</span></label>
          <input type="datetime-local" class="form-control form-control-sm" id="dlvDate"
            value="${d?.delivery_date?.slice(0,16)||now}"/>
        </div>
        <div class="col-md-6">
          <label class="form-label">Delivery Type <span class="text-danger">*</span></label>
          <select class="form-select form-select-sm" id="dlvType">
            <option value="svd"          ${(d?.delivery_type||'svd')==='svd'         ?'selected':''}>SVD (Normal Vaginal)</option>
            <option value="lscs"         ${d?.delivery_type==='lscs'        ?'selected':''}>LSCS (C-Section)</option>
            <option value="instrumental" ${d?.delivery_type==='instrumental' ?'selected':''}>Instrumental (Forceps/Vacuum)</option>
            <option value="stillbirth"   ${d?.delivery_type==='stillbirth'   ?'selected':''}>Stillbirth</option>
          </select>
        </div>
        <div class="col-md-3">
          <label class="form-label">Baby Gender</label>
          <select class="form-select form-select-sm" id="dlvGender">
            <option value="M" ${(d?.baby_gender||'M')==='M'?'selected':''}>Male (Boy)</option>
            <option value="F" ${d?.baby_gender==='F'?'selected':''}>Female (Girl)</option>
          </select>
        </div>
        <div class="col-md-3">
          <label class="form-label">Birth Weight (kg)</label>
          <input type="number" class="form-control form-control-sm" id="dlvWeight"
            value="${d?.baby_weight||''}" step="0.1" min="0.5" max="6" placeholder="e.g. 3.2"/>
        </div>
        <div class="col-md-3">
          <label class="form-label">APGAR Score</label>
          <input type="text" class="form-control form-control-sm" id="dlvApgar"
            value="${d?.apgar_score||''}" placeholder="e.g. 8/9"/>
        </div>
        <div class="col-md-3">
          <label class="form-label">Baby Condition</label>
          <select class="form-select form-select-sm" id="dlvBabyCondition">
            <option value="alive"          ${(d?.baby_condition||'alive')==='alive'         ?'selected':''}>Alive & Well</option>
            <option value="nicu"           ${d?.baby_condition==='nicu'           ?'selected':''}>Alive — NICU Referral</option>
            <option value="neonatal_death" ${d?.baby_condition==='neonatal_death' ?'selected':''}>Neonatal Death</option>
            <option value="stillbirth"     ${d?.baby_condition==='stillbirth'     ?'selected':''}>Stillbirth</option>
          </select>
        </div>
        <div class="col-md-6">
          <label class="form-label">Complications (if any)</label>
          <input type="text" class="form-control form-control-sm" id="dlvComp"
            value="${d?.complications||''}" placeholder="PPH, Perineal tear, etc."/>
        </div>
        <div class="col-md-6">
          <label class="form-label">Mother Condition Post-Delivery</label>
          <input type="text" class="form-control form-control-sm" id="dlvMom"
            value="${d?.mother_condition||''}" placeholder="Stable, BP 120/80, etc."/>
        </div>
        <div class="col-md-4">
          <label class="form-label">Charges (PKR)</label>
          <input type="number" class="form-control form-control-sm" id="dlvCharges"
            value="${d?.charges||0}" min="0"/>
        </div>
        <div class="col-md-4">
          <label class="form-label">Discharge Date</label>
          <input type="date" class="form-control form-control-sm" id="dlvDischarge"
            value="${d?.discharge_date||''}"/>
        </div>
        <div class="col-md-4">
          <label class="form-label">Notes</label>
          <input type="text" class="form-control form-control-sm" id="dlvNotes" value="${d?.notes||''}"/>
        </div>
      </div>`,
      `<button class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
       <button class="btn btn-success" onclick="LabourPage._saveDelivery(${admissionId})">
         <i class="fas fa-baby me-1"></i>Save Delivery Record</button>
       ${d ? `<button class="btn btn-outline-primary ms-1" onclick="LabourPage._printDelivery(${admissionId})">
         <i class="fas fa-print me-1"></i>Print</button>` : ''}`);
  },

  async _saveDelivery(admissionId) {
    const date = document.getElementById('dlvDate').value;
    if (!date) { showToast('Delivery date required', 'danger'); return; }
    const data = {
      admission_id:     admissionId,
      delivery_date:    date,
      delivery_type:    document.getElementById('dlvType').value,
      baby_gender:      document.getElementById('dlvGender').value,
      baby_weight:      parseFloat(document.getElementById('dlvWeight').value)||0,
      apgar_score:      document.getElementById('dlvApgar').value.trim(),
      baby_condition:   document.getElementById('dlvBabyCondition').value,
      complications:    document.getElementById('dlvComp').value.trim(),
      mother_condition: document.getElementById('dlvMom').value.trim(),
      charges:          parseFloat(document.getElementById('dlvCharges').value)||0,
      discharge_date:   document.getElementById('dlvDischarge').value,
      notes:            document.getElementById('dlvNotes').value.trim(),
    };
    await window.api.lrSaveDelivery(data);
    closeModal();
    showToast('Delivery record saved!', 'success');
    setTimeout(() => this._printDelivery(admissionId), 400);
    this.render();
  },

  // ── VIEW / PRINT ──────────────────────────────────────────────────────────
  async _viewRecord(id) {
    const { admission: a, delivery: d } = await window.api.lrGetAdmission(id);
    showModal(`Labour Record — LR-${String(a.id).padStart(4,'0')}`, `
      <div class="row g-2" style="font-size:13px">
        <div class="col-md-6"><b>Patient:</b> ${a.patient_name}</div>
        <div class="col-md-6"><b>Husband:</b> ${a.husband_name||'—'}</div>
        <div class="col-md-3"><b>Age:</b> ${a.age||'—'} yrs</div>
        <div class="col-md-3"><b>G${a.gravida}P${a.para}</b></div>
        <div class="col-md-3"><b>Gest. Age:</b> ${a.gest_age||'?'} Wks</div>
        <div class="col-md-3"><b>BP:</b> ${a.bp||'—'}</div>
        <div class="col-md-6"><b>Phone:</b> ${a.phone||'—'}</div>
        <div class="col-md-6"><b>Address:</b> ${a.address||'—'}</div>
        <div class="col-md-6"><b>Admitted:</b> ${this._fmt(a.admission_date)}</div>
        <div class="col-md-6"><b>Type:</b> ${this._admType(a.admission_type)}</div>
        <div class="col-md-6"><b>Doctor:</b> ${a.doctor||'—'}</div>
        <div class="col-md-6"><b>Midwife:</b> ${a.midwife||'—'}</div>
        ${d ? `
        <div class="col-12"><hr class="my-1"/><b class="text-success">Delivery Record</b></div>
        <div class="col-md-6"><b>Delivery:</b> ${this._fmt(d.delivery_date)}</div>
        <div class="col-md-6"><b>Type:</b> ${this._delType(d.delivery_type)}</div>
        <div class="col-md-3"><b>Baby:</b> ${d.baby_gender==='M'?'Boy':'Girl'}</div>
        <div class="col-md-3"><b>Weight:</b> ${d.baby_weight||'—'} kg</div>
        <div class="col-md-3"><b>APGAR:</b> ${d.apgar_score||'—'}</div>
        <div class="col-md-3"><b>Condition:</b> ${d.baby_condition}</div>
        <div class="col-md-6"><b>Complications:</b> ${d.complications||'None'}</div>
        <div class="col-md-6"><b>Mother:</b> ${d.mother_condition||'—'}</div>
        <div class="col-md-6"><b>Charges:</b> PKR ${d.charges||0}</div>
        <div class="col-md-6"><b>Discharge:</b> ${d.discharge_date||'—'}</div>
        ` : '<div class="col-12 text-warning"><i class="fas fa-clock me-1"></i>No delivery recorded yet</div>'}
      </div>`,
      `<button class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
       ${d ? `<button class="btn btn-primary" onclick="LabourPage._printDelivery(${a.id})"><i class="fas fa-print me-1"></i>Print</button>` : ''}
       <button class="btn btn-outline-warning" onclick="closeModal();LabourPage._admissionModal(${a.id})"><i class="fas fa-edit me-1"></i>Edit</button>`);
  },

  async _printDelivery(admissionId) {
    const { admission: a, delivery: d } = await window.api.lrGetAdmission(admissionId);
    const s      = App.settings || {};
    const clinic = (s.pharmacy_name || 'Al Madina Medical Center').replace(/^Madina\b/i,'Al Madina');
    const addr   = s.address || 'Batara Buner';
    const phone  = s.phone   || '';
    const lrNo   = 'LR-' + String(a.id).padStart(4,'0');
    const logoB64 = s.logo_base64 || '';
    const logoHtml = logoB64
      ? `<img src="${logoB64}" style="height:70px;object-fit:contain"/>`
      : `<svg xmlns="http://www.w3.org/2000/svg" width="70" height="70" viewBox="0 0 100 100">
           <circle cx="50" cy="50" r="48" fill="#fff" stroke="#c0392b" stroke-width="5"/>
           <rect x="47" y="10" width="6" height="20" rx="2" fill="#c0392b"/>
           <rect x="40" y="17" width="20" height="6" rx="2" fill="#c0392b"/>
           <text x="50" y="62" text-anchor="middle" font-family="Arial Black" font-size="20" fill="#c0392b">AMC</text>
         </svg>`;

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
    <style>
      * { box-sizing:border-box; margin:0; padding:0; }
      body { font-family:Arial,sans-serif; font-size:12px; padding:20px; }
      .header { display:flex; align-items:center; gap:16px; border-bottom:3px solid #1a2f5e; padding-bottom:10px; margin-bottom:14px; }
      .header .info { flex:1; text-align:center; }
      .header .info h1 { font-size:18px; color:#1a2f5e; font-weight:900; }
      .header .info p  { font-size:11px; color:#555; margin:2px 0; }
      .lrno { font-size:13px; font-weight:800; color:#c0392b; }
      .section-title { background:#1a2f5e; color:#fff; padding:4px 10px; font-weight:700; font-size:12px; margin:10px 0 6px; border-radius:4px; }
      table { width:100%; border-collapse:collapse; }
      td { padding:4px 6px; vertical-align:top; }
      td b { color:#333; }
      .row-pair td { border-bottom:1px solid #eee; }
      .baby-box { border:2px solid #27ae60; border-radius:8px; padding:10px; margin:10px 0; }
      .baby-box h3 { color:#27ae60; margin-bottom:6px; font-size:13px; }
      .sig { margin-top:30px; display:flex; justify-content:space-between; }
      .sig-line { text-align:center; width:180px; }
      .sig-line div { border-top:1px solid #000; margin-top:30px; padding-top:4px; font-size:11px; }
      .footer { margin-top:20px; text-align:center; font-size:10px; color:#999; border-top:1px solid #eee; padding-top:8px; }
      @media print { body { padding:10px; } }
    </style></head><body>
    <div class="header">
      ${logoHtml}
      <div class="info">
        <h1>${clinic}</h1>
        <p>${addr}${phone ? ' | Tel: '+phone : ''}</p>
        <p>Labour Room — Delivery Record</p>
      </div>
      <div style="text-align:right">
        <div class="lrno">${lrNo}</div>
        <div style="font-size:11px;color:#555;margin-top:4px">
          ${new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}
        </div>
      </div>
    </div>

    <div class="section-title">Mother Information</div>
    <table>
      <tr class="row-pair">
        <td width="50%"><b>Patient Name:</b> ${a.patient_name}</td>
        <td width="50%"><b>Husband Name:</b> ${a.husband_name||'—'}</td>
      </tr>
      <tr class="row-pair">
        <td><b>Age:</b> ${a.age||'—'} years</td>
        <td><b>Obstetric History:</b> G${a.gravida} P${a.para}</td>
      </tr>
      <tr class="row-pair">
        <td><b>Gestational Age:</b> ${a.gest_age||'?'} Weeks</td>
        <td><b>Blood Pressure:</b> ${a.bp||'—'}</td>
      </tr>
      <tr class="row-pair">
        <td><b>Phone:</b> ${a.phone||'—'}</td>
        <td><b>Address:</b> ${a.address||'—'}</td>
      </tr>
      <tr class="row-pair">
        <td><b>Admission:</b> ${this._fmt(a.admission_date)}</td>
        <td><b>Type:</b> ${this._admType(a.admission_type)}</td>
      </tr>
      <tr class="row-pair">
        <td><b>Doctor:</b> ${a.doctor||'—'}</td>
        <td><b>Midwife/Nurse:</b> ${a.midwife||'—'}</td>
      </tr>
    </table>

    ${d ? `
    <div class="section-title">Delivery Details</div>
    <table>
      <tr class="row-pair">
        <td><b>Delivery Date/Time:</b> ${this._fmt(d.delivery_date)}</td>
        <td><b>Delivery Type:</b> ${this._delType(d.delivery_type)}</td>
      </tr>
      <tr class="row-pair">
        <td><b>Complications:</b> ${d.complications||'None'}</td>
        <td><b>Mother Condition:</b> ${d.mother_condition||'—'}</td>
      </tr>
      ${d.discharge_date ? `<tr class="row-pair"><td><b>Discharge Date:</b> ${d.discharge_date}</td><td></td></tr>` : ''}
    </table>

    <div class="baby-box">
      <h3><i>&#9786;</i> Baby Details</h3>
      <table>
        <tr>
          <td><b>Gender:</b> ${d.baby_gender==='M'?'Male (Boy)':'Female (Girl)'}</td>
          <td><b>Birth Weight:</b> ${d.baby_weight||'—'} kg</td>
          <td><b>APGAR Score:</b> ${d.apgar_score||'—'}</td>
          <td><b>Condition:</b> ${d.baby_condition}</td>
        </tr>
      </table>
    </div>

    <div style="text-align:right;font-size:12px"><b>Charges: PKR ${d.charges||0}</b></div>
    ` : '<div class="section-title">No Delivery Recorded Yet</div>'}

    <div class="sig">
      <div class="sig-line"><div>Midwife / Nurse</div></div>
      <div class="sig-line"><div>Doctor Signature</div></div>
      <div class="sig-line"><div>In-Charge</div></div>
    </div>

    <div class="footer">Powered by HyperCloud.pk &nbsp;|&nbsp; 0313-9986357 &nbsp;|&nbsp; ${lrNo}</div>
    <script>window.onload=function(){window.print();}<\/script>
    </body></html>`;

    const w = window.open('', '_blank', 'width=750,height=700');
    w.document.write(html);
    w.document.close();
  },

  async _delete(id) {
    if (!confirm('Delete this admission record?')) return;
    await window.api.lrDeleteAdmission(id);
    showToast('Record deleted', 'warning');
    this.render();
  },

  // ── HELPERS ────────────────────────────────────────────────────────────────
  _fmt(dt) {
    if (!dt) return '—';
    try { return new Date(dt).toLocaleString('en-GB',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}); }
    catch(_) { return dt; }
  },
  _admType(t) {
    return {normal:'Normal Labour',emergency:'Emergency',elective:'Elective C-Section',referred:'Referred'}[t]||t;
  },
  _admTypeBadge(t) {
    return {normal:'bg-success',emergency:'bg-danger',elective:'bg-warning text-dark',referred:'bg-info'}[t]||'bg-secondary';
  },
  _delType(t) {
    return {svd:'SVD (Normal)',lscs:'LSCS (C-Section)',instrumental:'Instrumental',stillbirth:'Stillbirth'}[t]||t;
  },
  _statusBadge(s) {
    const map = { admitted:'<span class="badge bg-danger">Admitted</span>',
                  delivered:'<span class="badge bg-success">Delivered</span>',
                  discharged:'<span class="badge bg-secondary">Discharged</span>' };
    return map[s]||`<span class="badge bg-secondary">${s}</span>`;
  }
};
