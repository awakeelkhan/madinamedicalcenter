window.SehatCardPage = {
  _procs:[], _visit:null, _patient:null, _entries:[],

  async render() {
    this._procs = await window.api.scGetProcedures();
    this._visit = null; this._patient = null; this._entries = [];
    const el = document.getElementById('page-content');
    el.innerHTML = `
      <link href="https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;700&display=swap" rel="stylesheet"/>
      <div class="sc-wrap">
        <div class="sc-left">
          <div class="sc-left-tabs">
            <button class="sc-ltab active" data-ltab="list" onclick="SehatCardPage._ltab(this)"><i class="fas fa-list me-1"></i>Patients</button>
            <button class="sc-ltab" data-ltab="newreg" onclick="SehatCardPage._ltab(this)"><i class="fas fa-user-plus me-1"></i>New Reg</button>
            <button class="sc-ltab" data-ltab="procs" onclick="SehatCardPage._ltab(this)"><i class="fas fa-cog me-1"></i>Procedures</button>
          </div>
          <div class="sc-lpanel" id="sc-lp-list">
            <div class="sc-search-wrap">
              <i class="fas fa-search sc-search-ico"></i>
              <input type="text" class="sc-search-input" id="scSearch" placeholder="Search name, CNIC, phone…" oninput="SehatCardPage._searchPatients(this.value)"/>
            </div>
            <div id="scPatientList" class="sc-patient-list"></div>
          </div>
          <div class="sc-lpanel" id="sc-lp-newreg" style="display:none"><div id="scRegFormWrap"></div></div>
          <div class="sc-lpanel" id="sc-lp-procs" style="display:none"><div id="scProcsWrap"></div></div>
        </div>
        <div class="sc-right"><div id="scRightContent">
          <div class="sc-empty-state">
            <div class="sc-hero-badge">SSP</div>
            <div class="sc-hero-urdu">سہولت صحت پروگرام</div>
            <div class="sc-hero-en">Sehat Sahulat Program</div>
            <p class="text-muted mt-3 small">Select a patient or register a new one.</p>
          </div>
        </div></div>
      </div>
      <div id="scPrintArea" style="display:none"><div id="scPrintContent"></div></div>`;
    this._loadList(); this._renderRegForm(null); this._renderProcs();
  },

  _ltab(btn) {
    document.querySelectorAll('.sc-ltab').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.sc-lpanel').forEach(p=>p.style.display='none');
    document.getElementById('sc-lp-'+btn.dataset.ltab).style.display='';
    if(btn.dataset.ltab==='list') this._loadList();
    if(btn.dataset.ltab==='newreg') this._renderRegForm(null);
    if(btn.dataset.ltab==='procs') this._renderProcs();
  },

  async _loadList() {
    const data = await window.api.scGetRecent();
    const el = document.getElementById('scPatientList'); if(!el) return;
    const seen = {}; const list=[];
    data.forEach(v=>{ if(!seen[v.patient_id]){ seen[v.patient_id]=1; list.push(v); }});
    if(!list.length){ el.innerHTML='<p class="text-muted small text-center py-3">No registrations yet</p>'; return; }
    el.innerHTML = list.map(v=>`
      <div class="sc-pnt-row ${this._patient?.id===v.patient_id?'active':''}" onclick="SehatCardPage._selectPnt(${v.patient_id})">
        <div class="sc-pnt-av">${v.pnt_name.charAt(0).toUpperCase()}</div>
        <div class="sc-pnt-info">
          <div class="sc-pnt-name">${v.pnt_name}</div>
          <div class="sc-pnt-meta">${v.father_name||''} ${v.cnic?'· '+v.cnic:''}</div>
        </div>
        ${v.entry_count?`<span class="badge bg-success" style="font-size:10px">${v.entry_count}</span>`:''}
      </div>`).join('');
  },

  async _searchPatients(q) {
    if(!q.trim()) return this._loadList();
    const data = await window.api.scSearchPatients(q.trim());
    const el = document.getElementById('scPatientList'); if(!el) return;
    if(!data.length){ el.innerHTML='<p class="text-muted small text-center py-3">No match</p>'; return; }
    el.innerHTML = data.map(p=>`
      <div class="sc-pnt-row" onclick="SehatCardPage._selectPnt(${p.id})">
        <div class="sc-pnt-av">${p.pnt_name.charAt(0).toUpperCase()}</div>
        <div class="sc-pnt-info"><div class="sc-pnt-name">${p.pnt_name}</div>
        <div class="sc-pnt-meta">${p.father_name||''} ${p.cnic?'· '+p.cnic:''}</div></div>
      </div>`).join('');
  },

  async _selectPnt(id) {
    this._patient = await window.api.scGetPatient(id);
    this._visit   = await window.api.scGetVisitByPnt(id);
    this._entries = this._visit ? await window.api.scGetEntries(this._visit.id) : [];
    this._renderRight(); this._loadList();
  },

  _renderRegForm(p) {
    const w=document.getElementById('scRegFormWrap'); if(!w) return;
    w.innerHTML=`
      <div class="sc-form-title">${p?'<i class="fas fa-edit me-1"></i>Edit Patient':'<i class="fas fa-user-plus me-1 text-success"></i>New Registration'}</div>
      <div class="row g-2">
        <div class="col-12"><label class="sc-lbl">Patient Name *</label>
          <input class="form-control form-control-sm" id="rName" value="${p?.pnt_name||''}" placeholder="Full Name"/></div>
        <div class="col-12"><label class="sc-lbl">Father / Husband Name</label>
          <input class="form-control form-control-sm" id="rFather" value="${p?.father_name||''}" placeholder="Father Name"/></div>
        <div class="col-6"><label class="sc-lbl">CNIC / Form-B</label>
          <input class="form-control form-control-sm" id="rCNIC" value="${p?.cnic||''}" placeholder="XXXXXXXXXXXXX" maxlength="15"/></div>
        <div class="col-3"><label class="sc-lbl">Age</label>
          <input class="form-control form-control-sm" id="rAge" value="${p?.age||''}" placeholder="35Y"/></div>
        <div class="col-3"><label class="sc-lbl">Gender</label>
          <select class="form-select form-select-sm" id="rGender">
            <option value="M" ${(p?.gender||'M')==='M'?'selected':''}>Male</option>
            <option value="F" ${p?.gender==='F'?'selected':''}>Female</option>
            <option value="C" ${p?.gender==='C'?'selected':''}>Child</option>
          </select></div>
        <div class="col-12"><label class="sc-lbl">Phone</label>
          <input class="form-control form-control-sm" id="rPhone" value="${p?.phone||''}" placeholder="03XXXXXXXXX"/></div>
        <div class="col-12"><label class="sc-lbl">Address</label>
          <input class="form-control form-control-sm" id="rAddress" value="${p?.address||''}" placeholder="Village / City / District"/></div>
        <div class="col-12 mt-1">
          <button class="btn btn-success btn-sm w-100" onclick="SehatCardPage._savePatient(${p?.id||0})">
            <i class="fas fa-save me-1"></i>${p?'Update':'Register Patient'}
          </button>
          ${p?`<button class="btn btn-outline-secondary btn-sm w-100 mt-1" onclick="SehatCardPage._renderRegForm(null)">Cancel</button>`:''}
        </div>
      </div>`;
  },

  async _savePatient(editId) {
    const name = document.getElementById('rName')?.value.trim();
    if(!name) return showToast('Enter patient name','warning');
    const saved = await window.api.scSavePatient({
      id:editId||0, pnt_name:name,
      father_name:document.getElementById('rFather').value.trim(),
      cnic:document.getElementById('rCNIC').value.trim(),
      age:document.getElementById('rAge').value.trim(),
      gender:document.getElementById('rGender').value,
      phone:document.getElementById('rPhone').value.trim(),
      address:document.getElementById('rAddress').value.trim(),
    });
    showToast(editId?'Patient updated':'Patient registered','success');
    await this._selectPnt(saved.id);
    document.querySelectorAll('.sc-ltab').forEach(b=>b.classList.toggle('active',b.dataset.ltab==='list'));
    document.querySelectorAll('.sc-lpanel').forEach(p=>p.style.display='none');
    document.getElementById('sc-lp-list').style.display='';
    this._loadList();
  },

  _editPatient() {
    if(!this._patient) return;
    document.querySelectorAll('.sc-ltab').forEach(b=>b.classList.toggle('active',b.dataset.ltab==='newreg'));
    document.querySelectorAll('.sc-lpanel').forEach(p=>p.style.display='none');
    document.getElementById('sc-lp-newreg').style.display='';
    this._renderRegForm(this._patient);
  },

  async _deletePatient() {
    if(!this._patient) return;
    if(!confirm(`Delete ${this._patient.pnt_name}?`)) return;
    await window.api.scDeletePatient(this._patient.id);
    this._patient=null; this._visit=null; this._entries=[];
    document.getElementById('scRightContent').innerHTML=`<div class="sc-empty-state"><div class="sc-hero-badge">SSP</div><p class="text-muted mt-2 small">Patient deleted.</p></div>`;
    this._loadList();
  },

  // ── RIGHT PANEL ──────────────────────────────────────────────────────────────
  _renderRight() {
    const p=this._patient, v=this._visit;
    if(!p) return;
    const gLabel = p.gender==='M'?'Male':p.gender==='F'?'Female':'Child';
    document.getElementById('scRightContent').innerHTML=`
      <div class="sc-pcard">
        <div class="sc-pcard-top">
          <div>
            <div class="sc-pcard-name">${p.pnt_name}</div>
            <div class="sc-pcard-meta">
              ${p.father_name?`S/D: <b>${p.father_name}</b> &nbsp;·&nbsp; `:''}${p.age||''} ${p.age?'·':''} ${gLabel}
              ${p.cnic?` &nbsp;·&nbsp; CNIC: <b>${p.cnic}</b>`:''}
              ${p.phone?` &nbsp;·&nbsp; <i class="fas fa-phone-alt fa-xs"></i> ${p.phone}`:''}
            </div>
            ${p.address?`<div class="sc-pcard-addr"><i class="fas fa-map-marker-alt fa-xs me-1"></i>${p.address}</div>`:''}
          </div>
          <div class="d-flex gap-2 align-items-start">
            <button class="btn btn-sm btn-outline-secondary" onclick="SehatCardPage._editPatient()"><i class="fas fa-edit"></i></button>
            <button class="btn btn-sm btn-outline-danger" onclick="SehatCardPage._deletePatient()"><i class="fas fa-trash"></i></button>
          </div>
        </div>
      </div>

      <div class="sc-ssp-box">
        <div class="sc-ssp-box-header">
          <span>
            <span class="sc-ssp-badge-sm">SSP</span>
            <span class="sc-urdu-title">سہولت صحت پروگرام</span>
            <span class="text-muted ms-2" style="font-size:11px">— Sehat Sahulat Entry</span>
          </span>
          <div class="d-flex gap-2">
            ${v?`<button class="btn btn-sm btn-outline-info" onclick="SehatCardPage._printProforma()"><i class="fas fa-file-alt me-1"></i>Proforma</button>
            <button class="btn btn-sm btn-success" onclick="SehatCardPage._printSlip()"><i class="fas fa-print me-1"></i>Print</button>`:''}
          </div>
        </div>

        <div id="scVisitFormWrap">${this._visitFormHTML(v)}</div>

        <div class="sc-proc-section">
          <div class="sc-proc-hdr">
            <span class="fw-bold" style="font-size:13px"><i class="fas fa-procedures me-1 text-primary"></i>Procedures / Packages &nbsp;<span class="sc-urdu-sm">طریقہ کار</span></span>
            <button class="btn btn-sm btn-primary" onclick="SehatCardPage._toggleAddProc()"><i class="fas fa-plus me-1"></i>Add</button>
          </div>
          <div id="scAddProcPanel" style="display:none">${this._addProcHTML()}</div>
          <div id="scEntriesList">${this._entriesHTML()}</div>
        </div>
      </div>`;
  },

  _visitFormHTML(v) {
    return `<div class="row g-2 mb-2">
      <div class="col-4"><label class="sc-lbl">Ref No (Sehat Card)</label>
        <input class="form-control form-control-sm" id="vRefNo" value="${v?.ref_no||''}" placeholder="Reference #"/></div>
      <div class="col-4"><label class="sc-lbl">Card Holder CNIC</label>
        <input class="form-control form-control-sm" id="vCardNIC" value="${v?.card_holder_nic||''}" placeholder="XXXXXXXXXXXXX"/></div>
      <div class="col-4"><label class="sc-lbl">Relation with Patient</label>
        <select class="form-select form-select-sm" id="vRelation">
          ${['Self','Father','Mother','Spouse','Son','Daughter','Brother','Sister','Other'].map(r=>`<option ${(v?.relation||'')==r?'selected':''}>${r}</option>`).join('')}
        </select></div>
      <div class="col-4"><label class="sc-lbl">Admitted By (Doctor)</label>
        <input class="form-control form-control-sm" id="vDoctor" value="${v?.doctor||''}" placeholder="Doctor Name"/></div>
      <div class="col-4"><label class="sc-lbl">Refer From</label>
        <select class="form-select form-select-sm" id="vReferFrom">
          ${['OPD','Emergency','Referral','Walk-in'].map(r=>`<option ${(v?.refer_from||'OPD')===r?'selected':''}>${r}</option>`).join('')}
        </select></div>
      <div class="col-4"><label class="sc-lbl">Attendant Name</label>
        <input class="form-control form-control-sm" id="vAttName" value="${v?.attendant_name||''}" placeholder="Attendant"/></div>
      <div class="col-4"><label class="sc-lbl">Attendant CNIC</label>
        <input class="form-control form-control-sm" id="vAttNIC" value="${v?.attendant_nic||''}" placeholder="XXXXXXXXXXXXX"/></div>
      <div class="col-4"><label class="sc-lbl">Attendant Relation</label>
        <input class="form-control form-control-sm" id="vAttRel" value="${v?.attendant_rel||''}" placeholder="Father / Spouse…"/></div>
      <div class="col-4 d-flex align-items-end">
        <button class="btn btn-primary btn-sm w-100" onclick="SehatCardPage._saveVisit()">
          <i class="fas fa-save me-1"></i>${v?'Update Info':'Save SSP Entry'}
        </button>
      </div>
    </div>`;
  },

  async _saveVisit() {
    if(!this._patient) return;
    const d = {
      id: this._visit?.id||0, patient_id: this._patient.id,
      ref_no:         document.getElementById('vRefNo')?.value.trim()||'',
      card_holder_nic:document.getElementById('vCardNIC')?.value.trim()||'',
      relation:       document.getElementById('vRelation')?.value||'',
      doctor:         document.getElementById('vDoctor')?.value.trim()||'',
      refer_from:     document.getElementById('vReferFrom')?.value||'OPD',
      attendant_name: document.getElementById('vAttName')?.value.trim()||'',
      attendant_nic:  document.getElementById('vAttNIC')?.value.trim()||'',
      attendant_rel:  document.getElementById('vAttRel')?.value.trim()||'',
    };
    this._visit = await window.api.scSaveVisit(d);
    this._entries = await window.api.scGetEntries(this._visit.id);
    showToast('SSP entry saved','success');
    this._renderRight();
  },

  // ── PROCEDURE SELECTOR ───────────────────────────────────────────────────────
  _addProcHTML() {
    const cats = [...new Set(this._procs.map(p=>p.department))];
    return `<div class="sc-add-proc-panel">
      <div class="row g-2 align-items-end">
        <div class="col-12">
          <label class="sc-lbl">Search Procedure</label>
          <div style="position:relative">
            <i class="fas fa-search" style="position:absolute;left:9px;top:50%;transform:translateY(-50%);color:#9aa3b0;font-size:12px;pointer-events:none"></i>
            <input type="text" class="form-control form-control-sm" id="procSearch" style="padding-left:28px"
              placeholder="Search by name or department…" oninput="SehatCardPage._filterProcList(this.value)" autocomplete="off"/>
          </div>
        </div>
        <div class="col-12">
          <div id="procListBox" class="sc-proc-list-box">${this._procListHTML('')}</div>
        </div>
        <div class="col-8"><label class="sc-lbl">Or type custom procedure</label>
          <input class="form-control form-control-sm" id="procCustom" placeholder="Custom procedure name"/></div>
        <div class="col-4"><label class="sc-lbl">Department</label>
          <select class="form-select form-select-sm" id="procCustomCat">
            ${cats.map(c=>`<option>${c}</option>`).join('')}
            <option>General</option>
          </select></div>
        <div class="col-3"><label class="sc-lbl">Days</label>
          <input type="number" class="form-control form-control-sm" id="procDays" value="1" min="1"/></div>
        <div class="col-3"><label class="sc-lbl">Govt Fee (PKR)</label>
          <input type="number" class="form-control form-control-sm" id="procFee" value="0" min="0"/></div>
        <div class="col-3"><label class="sc-lbl">Charge %</label>
          <input type="number" class="form-control form-control-sm" id="procCharge" value="100" min="0" max="200"/></div>
        <div class="col-3 d-flex align-items-end">
          <button class="btn btn-success btn-sm w-100" onclick="SehatCardPage._addEntry()">
            <i class="fas fa-plus me-1"></i>Add
          </button>
        </div>
      </div>
    </div>`;
  },

  _procListHTML(q) {
    const filtered = q ? this._procs.filter(p=>p.name.toLowerCase().includes(q.toLowerCase())||p.department.toLowerCase().includes(q.toLowerCase())) : this._procs.slice(0,15);
    if(!filtered.length) return `<div class="text-muted small p-2">No match</div>`;
    return filtered.map(p=>`
      <div class="sc-proc-pick-row" onclick="SehatCardPage._pickProc(${p.id},'${p.name.replace(/'/g,"\\'")}','${p.name_ur.replace(/'/g,"\\'")}','${p.department}',${p.fee})">
        <div>
          <div style="font-size:12px;font-weight:600">${p.name}</div>
          ${p.name_ur?`<div class="sc-urdu-sm">${p.name_ur}</div>`:''}
        </div>
        <div class="text-end">
          <div style="font-size:10px;color:#6c757d">${p.department}</div>
          <div style="font-size:11px;font-weight:700;color:#1abc8a">PKR ${p.fee.toLocaleString()}</div>
        </div>
      </div>`).join('');
  },

  _filterProcList(q) {
    const el = document.getElementById('procListBox'); if(el) el.innerHTML = this._procListHTML(q);
  },

  _pickProc(id, name, nameUr, dept, fee) {
    document.getElementById('procCustom').value  = name;
    document.getElementById('procCustomCat').value = dept;
    document.getElementById('procFee').value     = fee;
    this._selectedProc = {id, name, nameUr, dept, fee};
    document.querySelectorAll('.sc-proc-pick-row').forEach(r=>r.classList.remove('selected'));
    event.currentTarget.classList.add('selected');
  },

  _toggleAddProc() {
    const p = document.getElementById('scAddProcPanel');
    p.style.display = p.style.display==='none' ? '' : 'none';
  },

  async _addEntry() {
    if(!this._visit) { showToast('Save SSP info first','warning'); return; }
    const name = (this._selectedProc?.name || document.getElementById('procCustom')?.value.trim());
    if(!name) return showToast('Select or type a procedure','warning');
    const entry = {
      visit_id:    this._visit.id,
      proc_id:     this._selectedProc?.id||0,
      proc_name:   name,
      proc_name_ur:this._selectedProc?.nameUr || '',
      department:  document.getElementById('procCustomCat')?.value||'General',
      days:        parseInt(document.getElementById('procDays')?.value)||1,
      fee:         parseFloat(document.getElementById('procFee')?.value)||0,
      charge_pct:  parseFloat(document.getElementById('procCharge')?.value)||100,
    };
    await window.api.scAddEntry(entry);
    this._entries = await window.api.scGetEntries(this._visit.id);
    this._selectedProc = null;
    showToast('Procedure added','success');
    const el = document.getElementById('scEntriesList');
    if(el) el.innerHTML = this._entriesHTML();
    const panel = document.getElementById('scAddProcPanel');
    if(panel) panel.style.display='none';
  },

  async _deleteEntry(id) {
    if(!confirm('Remove this procedure?')) return;
    await window.api.scDeleteEntry(id);
    this._entries = await window.api.scGetEntries(this._visit.id);
    const el = document.getElementById('scEntriesList');
    if(el) el.innerHTML = this._entriesHTML();
  },

  _entriesHTML() {
    if(!this._entries.length) return `<p class="text-muted small text-center py-3">No procedures added yet.</p>`;
    const total = this._entries.reduce((s,e)=>s+e.total,0);
    return `<table class="table table-sm table-hover mb-0 mt-1" style="font-size:12px">
      <thead><tr>
        <th>Procedure</th><th class="sc-urdu-th">اردو نام</th>
        <th>Dept</th><th class="text-center">Days</th>
        <th class="text-end">Fee</th><th class="text-center">%</th>
        <th class="text-end">Total</th><th></th>
      </tr></thead>
      <tbody>
        ${this._entries.map(e=>`<tr>
          <td><strong>${e.proc_name}</strong></td>
          <td class="sc-urdu-cell">${e.proc_name_ur||'—'}</td>
          <td><span class="badge bg-light text-dark border" style="font-size:10px">${e.department}</span></td>
          <td class="text-center">${e.days}</td>
          <td class="text-end">${formatCurrency(e.fee)}</td>
          <td class="text-center">${e.charge_pct}%</td>
          <td class="text-end fw-bold text-success">${formatCurrency(e.total)}</td>
          <td><button class="btn btn-xs btn-outline-danger" style="font-size:10px;padding:1px 5px"
            onclick="SehatCardPage._deleteEntry(${e.id})"><i class="fas fa-times"></i></button></td>
        </tr>`).join('')}
      </tbody>
      <tfoot class="table-light fw-bold">
        <tr><td colspan="6" class="text-end">TOTAL</td>
          <td class="text-end text-success">${formatCurrency(total)}</td><td></td></tr>
      </tfoot>
    </table>`;
  },

  // ── PROCEDURES MANAGEMENT ────────────────────────────────────────────────────
  async _renderProcs() {
    const el = document.getElementById('scProcsWrap'); if(!el) return;
    const cats = [...new Set(this._procs.map(p=>p.department))];
    el.innerHTML = `
      <div class="sc-form-title"><i class="fas fa-cog me-1"></i>Manage Procedures</div>
      <div class="row g-2 mb-2">
        <div class="col-12"><input class="form-control form-control-sm" id="npName" placeholder="Procedure name (English)"/></div>
        <div class="col-12"><input class="form-control form-control-sm sc-urdu-input" id="npNameUr" placeholder="اردو نام" dir="rtl"/></div>
        <div class="col-6"><input class="form-control form-control-sm" id="npDept" placeholder="Department" list="deptList"/></div>
        <div class="col-6"><input type="number" class="form-control form-control-sm" id="npFee" placeholder="Govt Fee" min="0"/></div>
        <datalist id="deptList">${cats.map(c=>`<option value="${c}">`).join('')}</datalist>
        <div class="col-12">
          <button class="btn btn-success btn-sm w-100" onclick="SehatCardPage._addProc()">
            <i class="fas fa-plus me-1"></i>Add Procedure
          </button>
        </div>
      </div>
      <div style="max-height:340px;overflow-y:auto;border:1px solid #e9ecef;border-radius:8px">
        ${this._procs.map(p=>`
          <div class="sc-proc-manage-row">
            <div style="flex:1;min-width:0">
              <div style="font-size:12px;font-weight:600">${p.name}</div>
              ${p.name_ur?`<div class="sc-urdu-sm">${p.name_ur}</div>`:''}
              <div style="font-size:10px;color:#6c757d">${p.department} · PKR ${p.fee.toLocaleString()}</div>
            </div>
            <button class="btn btn-xs btn-outline-danger" style="font-size:10px;padding:1px 6px"
              onclick="SehatCardPage._delProc(${p.id})"><i class="fas fa-trash"></i></button>
          </div>`).join('')}
      </div>`;
  },

  async _addProc() {
    const name = document.getElementById('npName')?.value.trim();
    if(!name) return showToast('Enter procedure name','warning');
    await window.api.scAddProcedure({
      name, name_ur:document.getElementById('npNameUr')?.value.trim()||'',
      department:document.getElementById('npDept')?.value.trim()||'General',
      fee:parseFloat(document.getElementById('npFee')?.value)||0,
    });
    this._procs = await window.api.scGetProcedures();
    showToast('Procedure added','success');
    this._renderProcs();
  },

  async _delProc(id) {
    if(!confirm('Remove this procedure?')) return;
    await window.api.scDeleteProcedure(id);
    this._procs = await window.api.scGetProcedures();
    this._renderProcs();
  },

  // ── PROCEDURE CRITERIA LOOKUP ─────────────────────────────────────────────
  _procCriteria(name, dept) {
    const n = name.toLowerCase();
    if(n.includes('appendect')) return {
      title:'Appendectomy — Clinical Criteria (Modified RIPASA)',
      sections:[
        {head:'Age of Patient', items:['Less than 39.9 years □','40 years or above □']},
        {head:'Gender', items:['Male □','Female □']},
        {head:'Presenting Symptoms', items:['Right iliac fossa (RIF) pain □','Migration of pain to RIF □','Nausea / Vomiting □','Anorexia □','Fever □']},
        {head:'Clinical Signs', items:['RIF Tenderness □','Guarding □','Rebound Tenderness □','Rovsing Sign □']},
        {head:'Duration of Symptoms', items:['Less than 48 hours □','48 hours or more □']},
        {head:'Required Investigations (Please Attach)', items:['WBC Count □','CRP □','Negative Urine Analysis □','USG Abdomen □','CT Scan (on prior approval) □']},
      ]};
    if(n.includes('c-section')||n.includes('lscs')||n.includes('caesarean')||n.includes('cesarean')) return {
      title:'Caesarean Section — Clinical Indications',
      sections:[
        {head:'Absolute Indications', items:['Failure to progress during labour □','Non-reassuring fetal status □','Abnormal placentation (placenta previa / accreta) □','Fetal bleeding diatheses □','Fundic presentation or cord prolapse □','Uterine rupture □','Mechanical obstruction to vaginal birth □']},
        {head:'Maternal Factors', items:['Maternal infection with significant perinatal transmission risk □','Previous C-Section □','Prior uterine surgery (myomectomy) □','Invasive cervical cancer □','Active perianal inflammatory bowel disease □','History of VVF / pelvic organ prolapse repair □']},
        {head:'Fetal Factors', items:['Suspected macrosomia (>5000g / >4500g with diabetes) □','Transverse lie □','Fetal distress — Meconium stained liquor □','Fetal distress — Fetal bradycardia □','Cord around neck □','Folting Breech □']},
        {head:'Obstetric Complications', items:['Severe Pre-eclampsia □','HELLP Syndrome □','Cephalo-pelvic disproportion (CPD) □','C-section on maternal request □']},
      ]};
    if(n.includes('cataract')) return {
      title:'Cataract Surgery — Clinical Requirements',
      sections:[
        {head:'Pre-operative Requirements', items:['Visual acuity documented (< 6/18 or worse) □','Slit lamp examination done □','IOP measured □','Biometry done (IOL power calculated) □','Blood pressure under control □','Blood sugar within acceptable range □','Consent obtained □']},
        {head:'Intra-operative Requirements', items:['Quality of IOL is non-rigid and within prescribed standard □','Phacoemulsification technique used □','Foldable IOL implanted □']},
        {head:'Post-operative', items:['Follow-up appointment scheduled □','Eye shield applied □','Medications prescribed □']},
      ]};
    if(n.includes('cholecyst')||n.includes('gallbladder')||n.includes('cholelith')) return {
      title:'Cholecystectomy — Clinical Indications',
      sections:[
        {head:'Indications for Laparoscopic Cholecystectomy', items:['Symptomatic cholelithiasis □','Acalculous cholecystitis □','Gallbladder polyps > 0.5 cm □','Porcelain gallbladder □','Prophylactic cholecystectomy (increased risk) □','Concomitant cholecystectomy during abdominal operation □']},
        {head:'Indications for Open Surgery', items:['Inability to safely complete laparoscopic approach □','Haemodynamic instability / significant cardiorespiratory comorbidity □','Refractory coagulopathy □','Suspected gallbladder cancer □','Intra-abdominal pathology requiring open approach □']},
        {head:'Relative Indications for Open', items:['Prior upper abdominal surgery □','History of cholecysto-enteric fistula □','Patient pregnant (third trimester) □','Cirrhosis / portal hypertension □']},
      ]};
    if(n.includes('haemorrhoid')||n.includes('hemorrhoid')) return {
      title:'Haemorrhoidectomy — Clinical Criteria',
      sections:[
        {head:'Grade of Haemorrhoids', items:['Grade I □','Grade II □','Grade III □','Grade IV □']},
        {head:'Indications', items:['Failed conservative / medical management □','Prolapsed haemorrhoids □','Thrombosed external haemorrhoids □','Mixed (internal + external) haemorrhoids □','Bleeding not controlled by banding □']},
        {head:'Pre-operative Workup', items:['Proctoscopy done □','Anaemia corrected □','Bowel prep done □','Consent obtained □']},
      ]};
    if(n.includes('hernia')) return {
      title:'Hernia Repair — Clinical Criteria',
      sections:[
        {head:'Type of Hernia', items:['Inguinal (Direct) □','Inguinal (Indirect) □','Umbilical □','Femoral □','Incisional □','Epigastric □']},
        {head:'Indications', items:['Symptomatic reducible hernia □','Irreducible (incarcerated) hernia □','Obstructed hernia □','Strangulated hernia (emergency) □']},
        {head:'Pre-operative Workup', items:['Clinical examination documented □','USG if diagnosis uncertain □','Fitness for anaesthesia assessed □','Consent obtained □']},
      ]};
    if(n.includes('hysterectomy')) return {
      title:'Hysterectomy — Clinical Indications',
      sections:[
        {head:'Benign Indications', items:['Fibroid uterus (symptomatic) □','Dysfunctional uterine bleeding (failed medical management) □','Uterine prolapse □','Endometriosis □','Chronic pelvic pain □','Adenomyosis □']},
        {head:'Malignant Indications', items:['Cervical carcinoma □','Endometrial carcinoma □','Ovarian carcinoma □']},
        {head:'Emergency Indications', items:['PPH not responding to conservative measures □','Uterine rupture □']},
        {head:'Pre-operative Workup', items:['Pap smear done □','Endometrial biopsy if indicated □','USG Pelvis done □','Haemoglobin optimised □','Consent obtained □']},
      ]};
    if(n.includes('tonsil')) return {
      title:'Tonsillectomy — Clinical Criteria',
      sections:[
        {head:'Frequency Criteria (any one)', items:['7+ episodes in last 12 months □','5+ episodes/year for 2 consecutive years □','3+ episodes/year for 3 consecutive years □']},
        {head:'Severity Criteria', items:['Temperature > 38.3°C □','Cervical lymphadenopathy □','Tonsillar exudate □','Positive group A beta-haemolytic strep □']},
        {head:'Other Indications', items:['Obstructive sleep apnoea □','Peritonsillar abscess □','Suspected malignancy □','Halitosis refractory to treatment □']},
      ]};
    if(n.includes('knee replacement')||n.includes('tkr')) return {
      title:'Knee Replacement (TKR) — Clinical Criteria',
      sections:[
        {head:'Indications', items:['Severe osteoarthritis (grade III-IV Kellgren-Lawrence) □','Severe pain refractory to conservative management □','Significant functional limitation □','Rheumatoid arthritis with joint destruction □']},
        {head:'Conservative Management Tried', items:['Physiotherapy (≥6 months) □','Analgesics / NSAIDs □','Intra-articular injection □','Weight reduction □']},
        {head:'Pre-operative Workup', items:['Weight-bearing X-rays (AP + lateral) □','Vascular assessment done □','Cardiac fitness assessed □','Diabetes controlled □','Consent obtained □']},
      ]};
    if(n.includes('hip replacement')) return {
      title:'Hip Replacement — Clinical Criteria',
      sections:[
        {head:'Indications', items:['Avascular necrosis (AVN) of femoral head □','Severe osteoarthritis □','Displaced femoral neck fracture □','Failed internal fixation □','Rheumatoid arthritis □']},
        {head:'Pre-operative Workup', items:['X-Ray pelvis with both hips □','MRI if AVN suspected □','Cardiac fitness assessed □','Haemoglobin optimised □','Consent obtained □']},
      ]};
    if(n.includes('fracture')||n.includes('orif')||n.includes('nailing')) return {
      title:'Fracture Fixation — Clinical Criteria',
      sections:[
        {head:'Type / Location of Fracture', items:['Femur shaft □','Distal femur □','Tibial plateau □','Tibia shaft □','Radius / Ulna □','Humerus shaft □','Clavicle □','Patella □']},
        {head:'Classification', items:['Closed fracture □','Open fracture (Grade I) □','Open fracture (Grade II) □','Open fracture (Grade III) □','Comminuted □','Displaced □']},
        {head:'Justification for Surgery', items:['Unstable fracture □','Failed conservative treatment □','Polytrauma □','Open fracture requiring debridement □']},
        {head:'Pre-operative Workup', items:['X-rays (2 views minimum) □','Neurovascular status documented □','Haemoglobin optimised □','Consent obtained □']},
      ]};
    // Generic fallback by department
    if(dept==='Gynecology') return {
      title:`${name} — Clinical Criteria`,
      sections:[
        {head:'Indication', items:['Clinical indication documented by gynaecologist □','Ultrasound / investigations done □','Conservative management tried □','Consent obtained □']},
        {head:'Pre-operative Workup', items:['Haemoglobin > 8 g/dL □','Blood group and crossmatch □','Anaesthesia fitness □','Blood pressure controlled □']},
      ]};
    if(dept==='Cardiology') return {
      title:`${name} — Clinical Criteria`,
      sections:[
        {head:'Cardiac Work-up', items:['ECG done □','Echocardiogram done □','Coronary angiography done □','Troponin level documented □','Cardiology consultation □']},
        {head:'Risk Stratification', items:['TIMI / GRACE score documented □','Ejection fraction documented □','Haemodynamic stability assessed □']},
      ]};
    if(dept==='Neurosurgery') return {
      title:`${name} — Clinical Criteria`,
      sections:[
        {head:'Neurological Work-up', items:['CT scan brain done □','MRI brain / spine done □','GCS documented □','Neurosurgery consultation □']},
        {head:'Pre-operative Assessment', items:['Haemodynamic stability □','Coagulation profile normal □','Anaesthesia fitness □','Consent obtained □']},
      ]};
    return {
      title:`${name} — Clinical Criteria`,
      sections:[
        {head:'General Criteria', items:['Clinical indication clearly documented □','Relevant investigations attached □','Specialist consultation done □','Conservative treatment tried (if applicable) □','Consent obtained □']},
        {head:'Pre-operative Workup', items:['CBC done □','Liver function tests □','Renal function tests □','Blood sugar □','Chest X-ray □','ECG (if > 40 years) □','Anaesthesia fitness □']},
      ]};
  },

  _printPatientInfoTable(p, v, clinic, s) {
    const date = new Date().toLocaleDateString('en-GB');
    const gender = p.gender==='M'?'Male':p.gender==='F'?'Female':'Child';
    const lbl = 'font-weight:700;padding:6px 8px;white-space:nowrap;width:15%;font-size:12px;text-align:right';
    const val = 'padding:6px 8px;font-size:12px';
    return `
      <table width="98%" border="1" cellpadding="7" cellspacing="0" align="center" style="border-collapse:collapse;margin-bottom:10px">
        <tr>
          <td colspan="6" align="center" bgcolor="#000000" style="color:#fff;font-weight:700;padding:7px 10px;font-size:13px;letter-spacing:1px">
            PATIENT &amp; PACKAGE INFORMATION
          </td>
        </tr>
        <tr>
          <td style="${lbl}">PRN / Name</td>
          <td colspan="3" style="${val}"><b>${p.pnt_name.toUpperCase()}</b>&nbsp; S/D of &nbsp;<b>${(p.father_name||'—').toUpperCase()}</b></td>
          <td style="${lbl}">Age / Gender</td>
          <td style="${val}">${p.age||'—'} / ${gender}</td>
        </tr>
        <tr>
          <td style="${lbl}">CNIC / Form-B</td><td style="${val}">${p.cnic||'—'}</td>
          <td style="${lbl}">Contact No</td><td style="${val}">${p.phone||'—'}</td>
          <td style="${lbl}">Date</td><td style="${val}">${date}</td>
        </tr>
        <tr>
          <td style="${lbl}">Address</td>
          <td colspan="5" style="${val}">${p.address||'—'}</td>
        </tr>
        <tr>
          <td style="${lbl}">SSP Ref No</td><td style="${val}">${v.ref_no||'—'}</td>
          <td style="${lbl}">Card Holder CNIC</td><td style="${val}">${v.card_holder_nic||'—'}</td>
          <td style="${lbl}">Relation</td><td style="${val}">${v.relation||'—'}</td>
        </tr>
        <tr>
          <td style="${lbl}">Admitted By</td><td style="${val}">${v.doctor||'—'}</td>
          <td style="${lbl}">Refer From</td><td style="${val}">${v.refer_from||'—'}</td>
          <td style="${lbl}">Ward / Room</td><td style="${val}">—</td>
        </tr>
        <tr>
          <td style="${lbl}">Attendant</td><td style="${val}">${v.attendant_name||'—'}</td>
          <td style="${lbl}">Att. CNIC</td><td style="${val}">${v.attendant_nic||'—'}</td>
          <td style="${lbl}">Att. Relation</td><td style="${val}">${v.attendant_rel||'—'}</td>
        </tr>
        <tr>
          <td style="${lbl}">Package(s)</td>
          <td colspan="5" style="${val};font-weight:600">${this._entries.map(e=>e.department+' — '+e.proc_name).join('&nbsp;&nbsp;|&nbsp;&nbsp;')}</td>
        </tr>
      </table>`;
  },

  _assetsBase() {
    return location.href.replace(/\/renderer\/[^/]*$/, '') + '/assets/';
  },

  _amcLogoSvg(size = 90) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="48" fill="#fff" stroke="#c0392b" stroke-width="5"/>
      <circle cx="50" cy="50" r="40" fill="#fff5f5" stroke="#c0392b" stroke-width="1.2"/>
      <rect x="47" y="10" width="6" height="20" rx="2" fill="#c0392b"/>
      <rect x="40" y="17" width="20" height="6" rx="2" fill="#c0392b"/>
      <text x="50" y="58" text-anchor="middle" font-family="Arial Black,Arial" font-size="27" font-weight="900" fill="#c0392b">AMC</text>
      <text x="50" y="70" text-anchor="middle" font-family="Arial,sans-serif" font-size="7" fill="#444">AL MADINA MEDICAL</text>
      <text x="50" y="79" text-anchor="middle" font-family="Arial,sans-serif" font-size="7" fill="#444">&amp; SURGICAL CENTER</text>
      <text x="50" y="88" text-anchor="middle" font-family="Arial,sans-serif" font-size="7" fill="#444">BATARA BUNER</text>
    </svg>`;
  },

  _sehatLogoSvg(w = 120, h = 52) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 145 62" preserveAspectRatio="xMidYMid meet">
      <path d="M4,30 Q4,4 32,4 Q60,4 60,30" fill="none" stroke="#1a7a5e" stroke-width="4" stroke-linecap="round"/>
      <line x1="4"  y1="30" x2="4"  y2="40" stroke="#1a7a5e" stroke-width="3.5" stroke-linecap="round"/>
      <line x1="60" y1="30" x2="60" y2="40" stroke="#1a7a5e" stroke-width="3.5" stroke-linecap="round"/>
      <circle cx="16" cy="42" r="4.5" fill="#1a7a5e"/>
      <rect x="12.5" y="47" width="7" height="11" rx="2" fill="#1a7a5e"/>
      <line x1="13" y1="58" x2="10" y2="62" stroke="#1a7a5e" stroke-width="2.5" stroke-linecap="round"/>
      <line x1="19" y1="58" x2="22" y2="62" stroke="#1a7a5e" stroke-width="2.5" stroke-linecap="round"/>
      <circle cx="32" cy="43" r="4" fill="#27ae60"/>
      <path d="M27,48 Q32,62 37,48 Z" fill="#27ae60"/>
      <circle cx="48" cy="46" r="3.5" fill="#58d68d"/>
      <rect x="45" y="50" width="6" height="9" rx="1.5" fill="#58d68d"/>
      <line x1="46" y1="59" x2="43" y2="62" stroke="#58d68d" stroke-width="2" stroke-linecap="round"/>
      <line x1="50" y1="59" x2="53" y2="62" stroke="#58d68d" stroke-width="2" stroke-linecap="round"/>
      <text x="70" y="40" font-family="Arial Black,Impact,Arial" font-size="28" font-weight="900" fill="#1e6e3a">SEHAT</text>
      <line x1="70" y1="44" x2="142" y2="44" stroke="#27ae60" stroke-width="1.5"/>
      <text x="71" y="57" font-family="Arial,sans-serif" font-size="10" font-weight="700" fill="#27ae60" letter-spacing="1">SAHULAT PROGRAM</text>
    </svg>`;
  },

  _printHeader(clinic, s) {
    return `
      <table width="98%" border="0" cellpadding="2" cellspacing="0" align="center">
        <tr>
          <td width="16%" align="center" valign="middle">${this._amcLogoSvg(90)}</td>
          <td align="center" valign="middle">
            <h1 style="margin:0;font-size:20px;font-weight:900;color:#000">${clinic}</h1>
            <h3 style="margin:3px 0;font-size:12px;font-weight:400;color:#000">${s.address||'Batara Buner'}</h3>
            <h3 style="margin:3px 0;font-size:13px;font-weight:700;color:#000">SEHAT SAHULAT PROGRAM</h3>
          </td>
          <td width="23%" align="center" valign="middle" style="overflow:hidden">${this._sehatLogoSvg(120,52)}</td>
        </tr>
      </table>
      <hr style="border:0;border-top:2px solid #000;margin:6px 0"/>`;
  },

  _sigLine() {
    return `<br/>
      <table width="100%" border="0" cellpadding="2" cellspacing="0" style="margin-top:26px">
        <tr>
          <td width="32%" align="center">____________________________</td>
          <td width="4%"></td>
          <td width="32%" align="center">____________________________</td>
          <td width="4%"></td>
          <td width="28%" align="center">____________________________</td>
        </tr>
        <tr>
          <td align="center" style="font-size:11px;padding-top:4px">Attending Surgeon<br/>Signature &amp; Stamp</td>
          <td></td>
          <td align="center" style="font-size:11px;padding-top:4px">Medical Superintendent<br/>Signature &amp; Stamp</td>
          <td></td>
          <td align="center" style="font-size:11px;padding-top:4px">Date</td>
        </tr>
      </table>`;
  },

  // ── NUMBER TO WORDS ──────────────────────────────────────────────────────────
  _numToWords(n) {
    if(n===0) return 'Zero';
    const ones=['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
    const tens=['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
    const convert = x => {
      if(x<20) return ones[x];
      if(x<100) return tens[Math.floor(x/10)]+(x%10?' '+ones[x%10]:'');
      return ones[Math.floor(x/100)]+' Hundred'+(x%100?' '+convert(x%100):'');
    };
    let result='', num=Math.floor(n);
    if(num>=100000){ result+=convert(Math.floor(num/100000))+' Lakh '; num%=100000; }
    if(num>=1000)  { result+=convert(Math.floor(num/1000))+' Thousand '; num%=1000; }
    if(num>0)      { result+=convert(num); }
    return result.trim();
  },

  // ── PRINT ────────────────────────────────────────────────────────────────────
  _printSlip() {
    if(!this._patient || !this._visit) return showToast('No SSP entry to print','warning');
    const p=this._patient, v=this._visit, s=App.settings||{};
    const clinic = (s.pharmacy_name||'Al Madina Medical Center').replace(/^Madina\b/i,'Al Madina');
    const total  = this._entries.reduce((sum,e)=>sum+e.total,0);

    // PAGE 1 — SSP Entry Slip
    const procRows = this._entries.map((e,i)=>`
      <tr style="background:${i%2===0?'#fff':'#f8faff'}">
        <td style="padding:7px 10px;border:1px solid #ddd">${e.proc_name}</td>
        <td style="padding:7px 10px;border:1px solid #ddd;font-family:'Noto Nastaliq Urdu',serif;direction:rtl;text-align:right;font-size:13px">${e.proc_name_ur||'—'}</td>
        <td style="padding:7px 10px;border:1px solid #ddd;text-align:center">${e.department}</td>
        <td style="padding:7px 10px;border:1px solid #ddd;text-align:center">${e.days}</td>
        <td style="padding:7px 10px;border:1px solid #ddd;text-align:right">${e.fee.toLocaleString()}</td>
        <td style="padding:7px 10px;border:1px solid #ddd;text-align:center">${e.charge_pct}%</td>
        <td style="padding:7px 10px;border:1px solid #ddd;text-align:right;font-weight:700;color:#16a34a">${e.total.toLocaleString()}</td>
      </tr>`).join('');

    const page1 = `
      ${this._printHeader(clinic,s)}
      <div style="text-align:center;margin:10px 0">
        <span style="border-radius:50px;background:#000;color:#fff;padding:6px 24px;font-family:Verdana,Arial,sans-serif;font-size:13px;font-weight:700;letter-spacing:1px">SSP ENTRY SLIP</span>
      </div>
      ${this._printPatientInfoTable(p,v,clinic,s)}
      <br/>
      <table width="98%" align="center" border="0" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:12px">
        <thead>
          <tr>
            <th style="background:#1a2f5e;color:#fff;padding:8px 10px;border:1px solid #1a2f5e;text-align:left">Procedure (English)</th>
            <th style="background:#1a2f5e;color:#fff;padding:8px 10px;border:1px solid #1a2f5e;font-family:'Noto Nastaliq Urdu',serif;direction:rtl;text-align:right">اردو نام</th>
            <th style="background:#1a2f5e;color:#fff;padding:8px 10px;border:1px solid #1a2f5e;text-align:center">Department</th>
            <th style="background:#1a2f5e;color:#fff;padding:8px 10px;border:1px solid #1a2f5e;text-align:center">Days</th>
            <th style="background:#1a2f5e;color:#fff;padding:8px 10px;border:1px solid #1a2f5e;text-align:right">Govt Fee (PKR)</th>
            <th style="background:#1a2f5e;color:#fff;padding:8px 10px;border:1px solid #1a2f5e;text-align:center">%</th>
            <th style="background:#1a2f5e;color:#fff;padding:8px 10px;border:1px solid #1a2f5e;text-align:right">Amount (PKR)</th>
          </tr>
        </thead>
        <tbody>${procRows}</tbody>
        <tfoot>
          <tr style="background:#e8f0fe">
            <td colspan="6" style="padding:8px 10px;border:1px solid #ddd;text-align:right;font-weight:700;font-size:13px">TOTAL AMOUNT</td>
            <td style="padding:8px 10px;border:1px solid #ddd;text-align:right;font-weight:800;color:#16a34a;font-size:14px">${total.toLocaleString()}</td>
          </tr>
          <tr style="background:#f8faff">
            <td colspan="7" style="padding:6px 10px;border:1px solid #ddd;font-size:11px;color:#555">
              Amount in Words: <em><b>${this._numToWords(total)}</b> Rupees Only</em>
            </td>
          </tr>
        </tfoot>
      </table>
      ${this._sigLine()}
      <div style="text-align:center;margin-top:12px;font-size:10px;color:#999;border-top:1px solid #eee;padding-top:6px">
        Page 1 of ${this._entries.length+3} &nbsp;·&nbsp; Sehat Sahulat Program &nbsp;·&nbsp; ${new Date().toLocaleDateString('en-GB')} &nbsp;·&nbsp; HyperCloud.pk
      </div>`;

    // PAGE 2 — Urdu Consent / اجازت نامہ برائے آپریشن
    const procLabel = this._entries.map(e=>e.department+' - '+e.proc_name).join(', ');
    const urFnt = `font-family:'Noto Nastaliq Urdu','Jameel Noori Nastaleeq','Urdu Typesetting',serif`;
    const lbl4 = `background:#efefef;${urFnt};text-align:right;padding:5px 8px;border:1px solid #aaa;font-size:12px;white-space:nowrap`;
    const val4 = `padding:5px 8px;border:1px solid #aaa;font-size:12px;font-weight:700;color:#000`;
    const page2 = `
      ${this._printHeader(clinic,s)}
      <div align="center" style="margin:8px 0">
        <span style="border-radius:50px;background:#000;color:#fff;padding:8px 26px;${urFnt};font-size:18px;font-weight:700">اجازت نامہ برائے آپریشن</span>
      </div>
      <table width="98%" border="1" cellpadding="0" cellspacing="0" align="center"
        style="border-collapse:collapse;margin:8px auto;border:1px solid #aaa">
        <tr>
          <td style="${lbl4}">سائل / مریض</td>
          <td style="${val4}">${(p.pnt_name||'—').toUpperCase()}</td>
          <td style="${lbl4}">ساکن</td>
          <td style="${val4}">${p.address||'—'}</td>
        </tr>
        <tr>
          <td style="${lbl4}">ولد / بنت</td>
          <td style="${val4}">${(p.father_name||'—').toUpperCase()}</td>
          <td style="${lbl4}">زوجہ / خاوند</td>
          <td style="${val4}">${(v.attendant_name||'—').toUpperCase()}</td>
        </tr>
        <tr>
          <td style="${lbl4}">رابطہ نمبر</td>
          <td style="${val4}">${p.phone||'—'}</td>
          <td style="${lbl4}">شناختی کارڈ</td>
          <td style="${val4}">${v.card_holder_nic||p.cnic||'—'}</td>
        </tr>
      </table>
      <div style="${urFnt};direction:rtl;font-size:14.5px;line-height:2.7;padding:6px 14px;text-align:justify;color:#000">
        <p>میں <strong>${p.pnt_name}</strong> ولد / بنت <strong>${p.father_name||'—'}</strong> ساکن <strong>${p.address||'—'}</strong>، المدینہ میڈیکل اینڈ سرجیکل سنٹر بٹارہ بونیر میں اپنا / اپنے مریض کا آپریشن کروانے کے متعلق مندرجہ ذیل تمام باتوں کا خوشی سے اقرار کرتا / کرتی ہوں۔</p>
        <p>میں نے ہسپتال کے متعلقہ ڈاکٹر سے المدینہ میڈیکل سرجیکل سینٹر بٹارہ بونیر میں آپریشن کروانے کے بارے میں مکمل معلومات حاصل کر لی ہیں، مجھے المدینہ میڈیکل سرجیکل سینٹر بٹارہ بونیر کے ڈاکٹروں کو اس آپریشن کے متعلق میرے مریض سے متعلق انتظامات پر اور میرے لیے جو ضروری سمجھیں کرنے کی اجازت دے دی ہے۔ میں اپنے آپریشن کی اجازت دینے اور ہر قسم کے آپریشن پر اپنے بہتر مفاد میں نیک نیتی سے رضامندی دیتا / دیتی ہوں۔</p>
        <p>اگر طبی لحاظ سے مریض کے جسم کا کوئی حصہ زیادہ کاٹنا / علیحدہ کرنا پڑے تو اس کی بھی اجازت ہے۔ آپریشن کے دوران اور بعد ہسپتال سٹاف کو مریض کو پیچیدگیوں سے بچانے کا اختیار دیا جاتا ہے۔ اگر ہسپتال کے سٹاف کی ضرورت ہو تو وہ مریض کو خون چڑھانے یا دینے کا انتظام کر سکتے ہیں۔</p>
        <p>میں یہ اقرار کرتا / کرتی ہوں کہ اس صورت میں ذمہ صرف ممکنہ تکالیف اور پیچیدگیوں کی ذمہ داری میں خود لیتا / لیتی ہوں، نہ ہسپتال، نہ ہمارے رشتہ دار۔ کسی بھی قسم کی شکایت زبانی یا تحریری یا کوئی بھی قانونی چارہ جوئی اور میڈیا پر پروپیگنڈا نہیں کروں گا / کروں گی۔</p>
        <p>مجھے خود پڑھا اور سمجھایا گیا، مجھے پڑھوایا گیا اور سمجھایا گیا اور مجھے پڑھ کر سمجھ آ گئی اور نیچے دستخط / انگوٹھا ثبت کیا ہے۔</p>
      </div>
      <table width="98%" border="0" cellpadding="0" cellspacing="0" align="center" style="margin-top:8px">
        <tr>
          <td width="63%" valign="top">
            <table width="100%" border="1" cellpadding="5" cellspacing="0"
              style="border-collapse:collapse;border:1px solid #888;font-size:11px">
              <tr>
                <td style="${lbl4};width:32%">سرجن / SURGEON</td>
                <td style="${val4}" colspan="2">${v.doctor||'—'}</td>
              </tr>
              <tr>
                <td style="${lbl4}">طریقہ آپریشن / DEPT</td>
                <td style="${val4}" colspan="2">${procLabel}</td>
              </tr>
              <tr>
                <td style="${lbl4}">پی آر نمبر / PRN</td>
                <td style="${val4};width:32%">${v.ref_no||'—'}</td>
                <td style="${lbl4}">روم نمبر</td>
              </tr>
              <tr>
                <td style="${lbl4}">رابطہ نمبر / CONTACT</td>
                <td style="${val4}">${p.phone||'—'}</td>
                <td style="${val4};font-size:10px">شناختی کارڈ: ${v.card_holder_nic||p.cnic||'—'}</td>
              </tr>
            </table>
          </td>
          <td width="37%" align="center" valign="middle">
            <div style="${urFnt};font-size:14px;margin-bottom:6px;text-align:center;direction:rtl">انگوٹھا :</div>
            <div style="border:2px solid #000;width:150px;height:95px;margin:0 auto"></div>
          </td>
        </tr>
      </table>
      <div style="text-align:center;margin-top:8px;font-size:10px;color:#999;border-top:1px solid #eee;padding-top:5px">
        Page 2 &nbsp;·&nbsp; اجازت نامہ برائے آپریشن &nbsp;·&nbsp; ${new Date().toLocaleDateString('en-GB')}
      </div>`;

    // ── New pages ──────────────────────────────────────────────────────────────
    const assetsBase  = this._assetsBase();
    const buildingImg  = assetsBase + 'amc_building.jpg';
    const fallbackImg  = assetsBase + 'bmc_pic.jpg';
    const now  = new Date();
    const date = now.toLocaleDateString('en-GB');
    const timeStr = now.toLocaleTimeString('en-GB');
    const isDelivery = this._entries.some(e=>e.proc_name.toLowerCase().includes('normal delivery'));

    // PAGE 2 — Patient & Package Info + Treatment Chart
    const pagePtChart = `
      <div style="page-break-before:always"></div>
      ${this._printHeader(clinic,s)}
      ${this._printPatientInfoTable(p,v,clinic,s)}
      <div align="center" style="margin:8px 0"><span style="border-radius:50px;background:#000;color:#fff;padding:8px 24px;font-family:Verdana,Arial,sans-serif;font-size:13px;font-weight:700">Treatment Chart</span></div>
      <table width="98%" border="1" cellpadding="4" cellspacing="0" align="center" style="border-collapse:collapse;font-size:11px">
        <thead><tr>
          <th style="background:#333;color:#fff;padding:6px;width:12%">DATE</th>
          <th style="background:#333;color:#fff;padding:6px;width:36%">RX (Medicine)</th>
          <th style="background:#333;color:#fff;padding:6px;width:12%">DOSE</th>
          <th style="background:#333;color:#fff;padding:6px;width:12%">ROUTE</th>
          <th style="background:#333;color:#fff;padding:6px;width:12%">TIME</th>
          <th style="background:#333;color:#fff;padding:6px;width:16%">SIGNATURE</th>
        </tr></thead>
        <tbody>${Array(18).fill('<tr><td style="height:24px;border:1px solid #ccc">&nbsp;</td><td style="border:1px solid #ccc"></td><td style="border:1px solid #ccc"></td><td style="border:1px solid #ccc"></td><td style="border:1px solid #ccc"></td><td style="border:1px solid #ccc"></td></tr>').join('')}</tbody>
      </table>`;

    // PAGE 3 — Operative Notes
    const pageOpNotes = `
      <div style="page-break-before:always"></div>
      ${this._printHeader(clinic,s)}
      ${this._printPatientInfoTable(p,v,clinic,s)}
      <div align="center" style="margin:8px 0"><span style="border-radius:50px;background:#000;color:#fff;padding:8px 24px;font-family:Verdana,Arial,sans-serif;font-size:13px;font-weight:700">Operative Notes</span></div>
      <div style="padding:8px 4px">
        ${[['Diagnosis',''],['Investigation',''],['Procedure',procLabel],['Consultant',v.doctor||''],['Anesthetist',''],['OT Assistant',''],['OP Findings',''],['Procedure','']].map(([l,val])=>
          `<div style="display:flex;align-items:flex-end;margin:10px 0;font-size:12px"><span style="min-width:130px;font-weight:700">${l}</span><span style="flex:1;border-bottom:1px solid #555;padding-left:4px;min-height:18px">${val}</span></div>`
        ).join('')}
        ${Array(6).fill('<div style="display:flex;margin:10px 0"><span style="min-width:130px"></span><span style="flex:1;border-bottom:1px solid #ccc;min-height:18px"></span></div>').join('')}
      </div>
      <table width="100%" border="0" cellpadding="4" cellspacing="0" style="margin-top:24px">
        <tr><td width="33%"></td><td width="33%" align="center">____________________________</td><td></td></tr>
        <tr><td></td><td align="center" style="font-size:11px">Signature &amp; Stamp of Consultant<br/><b>${v.doctor||'—'}</b></td><td></td></tr>
      </table>`;

    // PAGE 6+ — STP Clinical Criteria (surgical / non-delivery procedures only)
    const stpEntries = this._entries.filter(e=>!e.proc_name.toLowerCase().includes('normal delivery'));
    const page3 = stpEntries.map((e) => {
      const crit = this._procCriteria(e.proc_name, e.department);
      const badgeTitle = e.proc_name.toUpperCase()+' \u2014 STP';
      const hd  = 'background:#1a2f5e;color:#fff;font-weight:700;padding:5px 10px;font-size:11px;letter-spacing:.4px';
      const itm = 'padding:5px 8px;font-size:11px;border-bottom:1px solid #e0e8f0;vertical-align:middle;color:#111';
      const cb  = 'text-align:center;width:34px;border-bottom:1px solid #e0e8f0;border-left:1px solid #c8d6e8;vertical-align:middle';
      const box = 'width:22px;height:22px;border:1.5px solid #444;display:inline-block;border-radius:2px;background:#fff';
      const sectionsHTML = crit.sections.map(sec => {
        const pairs = [];
        for (let i = 0; i < sec.items.length; i += 2) pairs.push([sec.items[i], sec.items[i+1]||null]);
        const rows = pairs.map(([a,b]) => `
          <tr>
            <td style="${itm}">${a.replace(/[\u25a1\u2610]/g,'').trim()}</td>
            <td style="${cb}"><div style="${box}"></div></td>
            ${b
              ? `<td style="${itm};border-left:2px solid #c8d6e8">${b.replace(/[\u25a1\u2610]/g,'').trim()}</td><td style="${cb}"><div style="${box}"></div></td>`
              : `<td colspan="2" style="${itm};border-left:2px solid #c8d6e8;background:#f5f8fb"></td>`}
          </tr>`).join('');
        return `<tr><td colspan="4" style="${hd}">${sec.head}</td></tr>${rows}`;
      }).join('');

      return `
        <div style="page-break-before:always"></div>
        ${this._printHeader(clinic,s)}
        <div style="background:#1a2f5e;color:#fff;padding:4px 10px;font-size:10px;display:flex;justify-content:space-between;flex-wrap:wrap;gap:6px;margin:4px 0 6px">
          <span>PRN: <b>${v.ref_no||'\u2014'}</b></span>
          <span>Patient: <b>${(p.pnt_name||'').toUpperCase()||'\u2014'}</b></span>
          <span>Age: <b>${p.age||'\u2014'}</b></span>
          <span>Gender: <b>${p.gender==='M'?'Male':p.gender==='F'?'Female':'\u2014'}</b></span>
          <span>Consultant: <b>${v.doctor||'\u2014'}</b></span>
          <span>Date: <b>${date}</b></span>
        </div>
        <div align="center" style="margin:5px 0 8px">
          <span style="background:#c0392b;color:#fff;padding:5px 24px;font-family:Arial,sans-serif;font-size:12px;font-weight:700;letter-spacing:1.5px;border-radius:3px;display:inline-block">${badgeTitle}</span>
        </div>
        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #c8d6e8;border-radius:4px;overflow:hidden">
          ${sectionsHTML}
        </table>
        <table width="100%" border="0" cellpadding="4" cellspacing="0" style="margin-top:20px">
          <tr>
            <td width="36%" align="center">________________________</td>
            <td></td>
            <td width="36%" align="center">________________________</td>
          </tr>
          <tr>
            <td align="center" style="font-size:10px;color:#333">Signature &amp; Stamp of Attending Physician</td>
            <td></td>
            <td align="center" style="font-size:10px;color:#333">Date</td>
          </tr>
        </table>`;
    }).join('');

    // PAGE 4 — Discharge Slip with hospital building photo
    const pageLast = `
      <div style="page-break-before:always"></div>
      ${this._printHeader(clinic,s)}
      <div align="center" style="margin:6px 0">
        <span style="border-radius:4px;background:#1a2f5e;color:#fff;padding:6px 28px;font-family:Arial,sans-serif;font-size:13px;font-weight:700;letter-spacing:1px;display:inline-block">Discharge Slip</span>
      </div>
      <div style="margin:8px 1% 10px;overflow:hidden;border-radius:6px;box-shadow:0 2px 8px rgba(0,0,0,.18)">
        <img src="${buildingImg}" style="width:100%;height:300px;object-fit:cover;display:block" border="0"
          onerror="this.onerror=null;this.src='${fallbackImg}';"/>
      </div>
      <table width="98%" border="0" cellpadding="0" cellspacing="0" align="center"
        style="border-collapse:collapse;font-size:12px;color:#000;border:1px solid #1a2f5e;margin-bottom:8px">
        <tr>
          <td style="background:#1a2f5e;color:#fff;font-weight:700;padding:5px 8px;width:10%;font-size:11px;border-right:1px solid #3a5f9e">PRN</td>
          <td style="padding:5px 8px;width:18%;border-right:1px solid #d0d7e8;color:#000">${v.ref_no||'—'}</td>
          <td style="background:#1a2f5e;color:#fff;font-weight:700;padding:5px 8px;width:14%;font-size:11px;border-right:1px solid #3a5f9e">Sehat Ref No</td>
          <td style="padding:5px 8px;width:18%;border-right:1px solid #d0d7e8;color:#000">${v.ref_no||'—'}</td>
          <td style="background:#1a2f5e;color:#fff;font-weight:700;padding:5px 8px;width:14%;font-size:11px;border-right:1px solid #3a5f9e">Patient Name</td>
          <td style="padding:5px 8px;color:#000;font-weight:600">${(p.pnt_name||'').toUpperCase()}</td>
        </tr>
        <tr style="border-top:1px solid #d0d7e8">
          <td style="background:#eef1f7;font-weight:700;padding:5px 8px;font-size:11px;border-right:1px solid #d0d7e8;color:#1a2f5e">Gender</td>
          <td style="padding:5px 8px;border-right:1px solid #d0d7e8;color:#000">${p.gender==='M'?'Male':p.gender==='F'?'Female':'—'}</td>
          <td style="background:#eef1f7;font-weight:700;padding:5px 8px;font-size:11px;border-right:1px solid #d0d7e8;color:#1a2f5e">Age</td>
          <td style="padding:5px 8px;border-right:1px solid #d0d7e8;color:#000">${p.age||'—'}</td>
          <td style="background:#eef1f7;font-weight:700;padding:5px 8px;font-size:11px;border-right:1px solid #d0d7e8;color:#1a2f5e">Address</td>
          <td style="padding:5px 8px;color:#000">${p.address||'—'}</td>
        </tr>
        <tr style="border-top:1px solid #d0d7e8">
          <td style="background:#1a2f5e;color:#fff;font-weight:700;padding:5px 8px;font-size:11px;border-right:1px solid #3a5f9e">Admission</td>
          <td style="padding:5px 8px;border-right:1px solid #d0d7e8;color:#000">${date}</td>
          <td style="background:#1a2f5e;color:#fff;font-weight:700;padding:5px 8px;font-size:11px;border-right:1px solid #3a5f9e">Discharge</td>
          <td style="padding:5px 8px;border-right:1px solid #d0d7e8;color:#000">_______________</td>
          <td style="background:#1a2f5e;color:#fff;font-weight:700;padding:5px 8px;font-size:11px;border-right:1px solid #3a5f9e">Ward / Room</td>
          <td style="padding:5px 8px;color:#000">_______________</td>
        </tr>
        <tr style="border-top:1px solid #d0d7e8">
          <td style="background:#eef1f7;font-weight:700;padding:5px 8px;font-size:11px;border-right:1px solid #d0d7e8;color:#1a2f5e">Consultant</td>
          <td style="padding:5px 8px;border-right:1px solid #d0d7e8;color:#000">${v.doctor||'—'}</td>
          <td style="background:#eef1f7;font-weight:700;padding:5px 8px;font-size:11px;border-right:1px solid #d0d7e8;color:#1a2f5e">Relation</td>
          <td style="padding:5px 8px;border-right:1px solid #d0d7e8;color:#000">${v.relation||'—'}</td>
          <td style="background:#eef1f7;font-weight:700;padding:5px 8px;font-size:11px;border-right:1px solid #d0d7e8;color:#1a2f5e">Refer From</td>
          <td style="padding:5px 8px;color:#000">${v.refer_from||'—'}</td>
        </tr>
        <tr style="border-top:1px solid #d0d7e8">
          <td style="background:#1a2f5e;color:#fff;font-weight:700;padding:5px 8px;font-size:11px;border-right:1px solid #3a5f9e">Procedure</td>
          <td colspan="5" style="padding:5px 8px;color:#000;font-weight:600">${procLabel}</td>
        </tr>
      </table>
      <div style="font-size:13px;font-weight:700;margin:10px 0 6px 10px">Treatment at Home:</div>
      <table width="98%" border="0" align="center" cellpadding="2" cellspacing="0">
        ${Array(10).fill('<tr><td style="border-bottom:1px solid #ccc;padding:10px 6px">&nbsp;</td></tr>').join('')}
      </table>
      <table width="100%" border="0" cellpadding="4" cellspacing="0" style="margin-top:14px">
        <tr><td width="30%" align="center">____________________________</td><td width="5%"></td><td width="30%" align="center">____________________________</td><td width="5%"></td><td width="30%" align="center">____________________________</td></tr>
        <tr><td align="center" style="font-size:11px">Attending Doctor<br/>Signature &amp; Stamp</td><td></td><td align="center" style="font-size:11px">Medical Superintendent<br/>Signature &amp; Stamp</td><td></td><td align="center" style="font-size:11px">Date</td></tr>
      </table>`;

    // PAGE 5 — Birth Certificate (Normal Delivery only)
    const pageBirth = isDelivery ? `
      <div style="page-break-before:always"></div>
      <table width="98%" border="0" cellpadding="2" cellspacing="0" align="center" style="border-bottom:2px solid #000;margin-bottom:10px"><tr>
        <td width="18%" align="center" valign="middle">${this._amcLogoSvg(80)}</td>
        <td align="center" valign="middle"><div style="font-size:24px;font-weight:900;letter-spacing:1px">BIRTH CERTIFICATE</div><div style="font-size:12px">${clinic}, ${s.address||'Batara Buner'}</div></td>
        <td width="22%" align="right" valign="middle" style="overflow:hidden">${this._sehatLogoSvg(115,50)}</td>
      </tr></table>
      <table width="98%" align="center" cellpadding="0" cellspacing="0" border="0" style="font-size:12px;margin-bottom:8px">
        <tr><td>Mother&apos;s PRN: <b>${v.ref_no||'—'}</b></td><td align="right">Print Date: <b>${date}</b> &nbsp; Time: <b>${timeStr}</b></td></tr>
      </table>
      <div style="text-align:center;font-size:13px;margin:10px 0">This is to certify that a baby with following details:</div>
      <div style="font-size:14px;line-height:2.8;margin:0 30px">
        <div><b>Gender:</b> <span style="display:inline-block;min-width:120px;border-bottom:1px solid #000">&nbsp;</span> &nbsp;&nbsp; <b>Mother&apos;s Name:</b> <span style="display:inline-block;min-width:200px;border-bottom:1px solid #000">${p.pnt_name.toUpperCase()}</span></div>
        <div><b>Father&apos;s Name:</b> <span style="display:inline-block;min-width:200px;border-bottom:1px solid #000">${(p.father_name||'—').toUpperCase()}</span> &nbsp;&nbsp; <b>Father&apos;s CNIC:</b> <span style="display:inline-block;min-width:160px;border-bottom:1px solid #000">${v.card_holder_nic||p.cnic||'—'}</span></div>
        <div><b>Address:</b> <span style="display:inline-block;min-width:350px;border-bottom:1px solid #000">${p.address||'—'}</span></div>
        <div style="margin-top:14px">was born on <b>${date}</b> at <b>${clinic}</b>.</div>
      </div>
      <table width="100%" border="0" cellpadding="4" cellspacing="0" style="margin-top:50px">
        <tr><td width="30%" align="center">____________________________</td><td width="40%"></td><td width="30%" align="center">____________________________</td></tr>
        <tr><td align="center" style="font-size:11px">Consultant<br/><b>${v.doctor||'—'}</b></td><td></td><td align="center" style="font-size:11px">Stamp</td></tr>
      </table>` : '';

    const fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
      <style>
        @font-face {
          font-family: 'Noto Nastaliq Urdu';
          src: url('${assetsBase}NotoNastaliqUrdu.ttf') format('truetype');
          font-weight: 100 900;
        }
        * { box-sizing:border-box; margin:0; padding:0; }
        body { font-family:Arial,sans-serif; font-size:12px; color:#000; padding:12px; }
        h1,h2,h3 { margin:0; }
        table { border-collapse:collapse; }
        @media print { @page { size:A4; margin:8mm 10mm; } }
      </style></head><body>
      ${page2}${pagePtChart}${pageOpNotes}${pageLast}${pageBirth}${page3}
      <script>window.onload=function(){
        if(document.fonts&&document.fonts.ready){
          document.fonts.ready.then(function(){window.print();});
        } else { setTimeout(function(){window.print();},800); }
      };<\/script>
    </body></html>`;
    const w = window.open('','_blank','width=900,height=700,scrollbars=yes');
    w.document.write(fullHtml);
    w.document.close();
  },

  _printProforma() { this._printSlip(); },
};
