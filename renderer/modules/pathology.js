window.PathologyPage = {
  _patient: null,   // { name, father_name, age, gender, visitId }
  _rows: [],        // { test_name, category, result, unit, ref_range, flag }
  _catalog: [],
  _visitId: 0,

  async render() {
    this._patient = null;
    this._rows = [];
    this._visitId = 0;
    this._catalog = await window.api.pathoGetCatalog();

    const el = document.getElementById('page-content');
    el.innerHTML = `
      <div class="patho-wrap">

        <!-- LEFT: Patient + search -->
        <div class="patho-left">

          <!-- Search visit -->
          <div class="patho-box">
            <div class="patho-box-title"><i class="fas fa-search me-2 text-primary"></i>Find Patient / Visit</div>
            <div class="patho-search-wrap">
              <i class="fas fa-search patho-search-ico"></i>
              <input type="text" id="pathoSearch" class="patho-search-input"
                placeholder="Name, NIC, phone or visit #…"
                oninput="PathologyPage._searchVisits(this.value)"/>
            </div>
            <div id="pathoSearchResults" class="patho-search-results"></div>
          </div>

          <!-- Patient card -->
          <div id="pathoPatientCard" class="patho-box patho-patient-card" style="display:none">
            <div class="d-flex justify-content-between align-items-start">
              <div>
                <div class="patho-patient-name" id="ppName">—</div>
                <div class="patho-patient-meta" id="ppMeta"></div>
              </div>
              <button class="btn btn-xs btn-outline-secondary" style="font-size:11px;padding:2px 8px"
                onclick="PathologyPage._clearPatient()">
                <i class="fas fa-times me-1"></i>Clear
              </button>
            </div>
          </div>

          <!-- OR: walk-in patient -->
          <div class="patho-box" id="pathoWalkIn">
            <div class="patho-box-title"><i class="fas fa-user-plus me-2 text-success"></i>Walk-in / Manual Entry</div>
            <div class="row g-2">
              <div class="col-12">
                <input type="text" class="form-control form-control-sm" id="wiName" placeholder="Patient Name *"/>
              </div>
              <div class="col-6">
                <input type="text" class="form-control form-control-sm" id="wiFather" placeholder="Father Name"/>
              </div>
              <div class="col-3">
                <input type="text" class="form-control form-control-sm" id="wiAge" placeholder="Age"/>
              </div>
              <div class="col-3">
                <select class="form-select form-select-sm" id="wiGender">
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                  <option value="C">Child</option>
                </select>
              </div>
              <div class="col-12">
                <button class="btn btn-success btn-sm w-100" onclick="PathologyPage._setWalkIn()">
                  <i class="fas fa-check me-1"></i>Set Patient
                </button>
              </div>
            </div>
          </div>

          <!-- Add a test -->
          <div class="patho-box">
            <div class="patho-box-title"><i class="fas fa-plus-circle me-2 text-info"></i>Add Test</div>
            <div class="patho-search-wrap mb-2">
              <i class="fas fa-search patho-search-ico"></i>
              <input type="text" id="pathoTestSearch" class="patho-search-input"
                placeholder="Search catalog or type new name…"
                oninput="PathologyPage._filterCatalog(this.value)"/>
            </div>
            <div id="pathoCatalogList" class="patho-catalog-list"></div>
            <div class="d-flex gap-2 mt-2">
              <input type="text" id="pathoCustomTest" class="form-control form-control-sm"
                placeholder="Custom test name"/>
              <select id="pathoCustomCat" class="form-select form-select-sm" style="width:140px">
                ${[...new Set(this._catalog.map(c=>c.category))].map(c=>`<option>${c}</option>`).join('')}
                <option value="General">General</option>
              </select>
              <button class="btn btn-outline-info btn-sm" onclick="PathologyPage._addCustomTest()">
                <i class="fas fa-plus"></i>
              </button>
            </div>
          </div>

          <!-- Recent results -->
          <div class="patho-box">
            <div class="patho-box-title"><i class="fas fa-history me-2 text-warning"></i>Recent Reports</div>
            <div id="pathoRecent"></div>
          </div>

        </div>

        <!-- RIGHT: Result entry sheet -->
        <div class="patho-right">
          <div class="patho-sheet-header">
            <span><i class="fas fa-flask me-2"></i>Lab Result Sheet</span>
            <div class="d-flex gap-2">
              <button class="btn btn-sm btn-outline-danger" onclick="PathologyPage._clearAll()">
                <i class="fas fa-trash me-1"></i>Clear
              </button>
              <button class="btn btn-sm btn-success" onclick="PathologyPage._saveAndPrint()">
                <i class="fas fa-print me-2"></i>Save & Print
              </button>
            </div>
          </div>

          <div id="pathoSheetBody" class="patho-sheet-body">
            <div class="patho-empty-state">
              <i class="fas fa-microscope fa-3x mb-3 opacity-25 text-muted"></i>
              <p class="text-muted">Search a patient or add a walk-in patient,<br>then add tests to enter results.</p>
            </div>
          </div>
        </div>

      </div>

      <!-- Print area -->
      <div id="pathoReportPrint" style="display:none">
        <div id="pathoReportContent"></div>
      </div>
    `;

    this._renderCatalog('');
    this._loadRecent();
  },

  // ── PATIENT SEARCH ───────────────────────────────────────────────────────────
  async _searchVisits(q) {
    const el = document.getElementById('pathoSearchResults');
    if (!q || q.trim().length < 2) { el.innerHTML = ''; return; }
    const data = await window.api.pathoSearchVisits(q.trim());
    if (!data.length) {
      el.innerHTML = '<div class="text-muted small p-2">No visits found</div>';
      return;
    }
    el.innerHTML = data.map(v => `
      <div class="patho-visit-row" onclick="PathologyPage._selectVisit(${v.id})">
        <div>
          <span class="fw-bold">${v.patient_name}</span>
          <span class="badge bg-secondary ms-1" style="font-size:9px">#${String(v.id).padStart(4,'0')}</span>
          ${v.test_count ? `<span class="badge bg-info ms-1" style="font-size:9px">${v.test_count} lab tests</span>` : ''}
        </div>
        <div style="font-size:10px;color:#9aa3b0">${v.father_name||''} ${v.nic?'· '+v.nic:''} · ${formatDate(v.visit_date)}</div>
      </div>`).join('');
  },

  async _selectVisit(id) {
    document.getElementById('pathoSearchResults').innerHTML = '';
    document.getElementById('pathoSearch').value = '';

    const tests    = await window.api.pathoGetVisitTests(id);
    const existing = await window.api.pathoGetResults(id);
    const visits   = await window.api.pathoSearchVisits(String(id));
    const v        = visits.find(x => x.id === id) || visits[0];
    if (!v) return;

    this._visitId = id;
    this._patient = { name: v.patient_name, father_name: v.father_name||'', age: v.age||'', gender: v.gender||'M' };

    if (existing.length) {
      this._rows = existing.map(r => ({ test_name:r.test_name, category:r.category, result:r.result, unit:r.unit, ref_range:r.ref_range, flag:r.flag }));
    } else {
      this._rows = tests.map(t => ({ test_name:t.test_name, category:t.category||'General', result:'', unit:t.unit||'', ref_range:t.ref_range||'', flag:'N' }));
    }

    this._showPatientCard();
    this._renderSheet();
    document.getElementById('pathoWalkIn').style.display = 'none';
  },

  _clearPatient() {
    this._patient = null; this._rows = []; this._visitId = 0;
    document.getElementById('pathoPatientCard').style.display = 'none';
    document.getElementById('pathoWalkIn').style.display = '';
    this._renderSheet();
  },

  _setWalkIn() {
    const name = document.getElementById('wiName').value.trim();
    if (!name) return showToast('Enter patient name', 'warning');
    this._visitId = 0;
    this._patient = {
      name,
      father_name: document.getElementById('wiFather').value.trim(),
      age:         document.getElementById('wiAge').value.trim(),
      gender:      document.getElementById('wiGender').value,
    };
    this._showPatientCard();
    this._renderSheet();
    document.getElementById('pathoWalkIn').style.display = 'none';
  },

  _showPatientCard() {
    const p = this._patient;
    document.getElementById('ppName').textContent = p.name;
    document.getElementById('ppMeta').textContent =
      [p.father_name, p.age ? 'Age: '+p.age : '', p.gender==='M'?'Male':p.gender==='F'?'Female':'Child']
      .filter(Boolean).join(' · ');
    document.getElementById('pathoPatientCard').style.display = '';
  },

  // ── CATALOG ──────────────────────────────────────────────────────────────────
  _renderCatalog(q) {
    const el = document.getElementById('pathoCatalogList');
    if (!el) return;
    const filtered = q
      ? this._catalog.filter(t => t.name.toLowerCase().includes(q.toLowerCase()) || t.category.toLowerCase().includes(q.toLowerCase()))
      : this._catalog.slice(0, 20);
    if (!filtered.length) {
      el.innerHTML = q ? `<div class="text-muted small p-1">No match — use custom field below</div>` : '';
      return;
    }
    el.innerHTML = filtered.map(t => `
      <div class="patho-cat-row" onclick="PathologyPage._addFromCatalog('${t.name.replace(/'/g,"\\'")}','${t.category.replace(/'/g,"\\'")}','${(t.unit||'').replace(/'/g,"\\'")}')">
        <span>${t.name}</span>
        <span class="text-muted" style="font-size:10px">${t.category}</span>
      </div>`).join('');
  },

  _filterCatalog(q) { this._renderCatalog(q); },

  _addFromCatalog(name, category, unit) {
    if (!this._patient) return showToast('Set patient first', 'warning');
    if (this._rows.find(r => r.test_name === name)) return showToast('Already added', 'warning');
    this._rows.push({ test_name: name, category, result: '', unit: unit||'', ref_range: '', flag: 'N' });
    this._renderSheet();
    document.getElementById('pathoTestSearch').value = '';
    this._renderCatalog('');
  },

  _addCustomTest() {
    if (!this._patient) return showToast('Set patient first', 'warning');
    const name = document.getElementById('pathoCustomTest').value.trim();
    if (!name) return showToast('Enter test name', 'warning');
    const cat = document.getElementById('pathoCustomCat').value || 'General';
    if (this._rows.find(r => r.test_name === name)) return showToast('Already added', 'warning');
    this._rows.push({ test_name: name, category: cat, result: '', unit: '', ref_range: '', flag: 'N' });
    document.getElementById('pathoCustomTest').value = '';
    this._renderSheet();
  },

  // ── RESULT SHEET ─────────────────────────────────────────────────────────────
  _renderSheet() {
    const el = document.getElementById('pathoSheetBody');
    if (!el) return;
    if (!this._rows.length) {
      el.innerHTML = `<div class="patho-empty-state">
        <i class="fas fa-microscope fa-3x mb-3 opacity-25 text-muted"></i>
        <p class="text-muted">${this._patient ? 'Add tests using the panel on the left.' : 'Search a patient or add a walk-in patient,<br>then add tests to enter results.'}</p>
      </div>`;
      return;
    }

    const cats = [...new Set(this._rows.map(r => r.category))];
    el.innerHTML = cats.map(cat => {
      const tests = this._rows.filter(r => r.category === cat);
      return `<div class="patho-cat-section">
        <div class="patho-cat-label">
          <i class="fas fa-tag me-1"></i>${cat}
          <span class="badge bg-secondary ms-1" style="font-size:9px">${tests.length}</span>
        </div>
        <table class="patho-table">
          <thead><tr>
            <th style="width:36%">Test</th>
            <th style="width:18%">Result</th>
            <th style="width:12%">Unit</th>
            <th style="width:18%">Ref. Range</th>
            <th style="width:10%">Flag</th>
            <th style="width:6%"></th>
          </tr></thead>
          <tbody>
            ${tests.map((r, gi) => {
              const i = this._rows.indexOf(r);
              return `<tr class="patho-row ${r.flag==='H'?'flag-high':r.flag==='L'?'flag-low':r.flag==='C'?'flag-critical':''}">
                <td class="patho-test-name">${r.test_name}</td>
                <td><input type="text" class="patho-input patho-result ${r.flag==='H'||r.flag==='C'?'result-abnormal':r.flag==='L'?'result-low':''}"
                  value="${r.result}" placeholder="—"
                  oninput="PathologyPage._update(${i},'result',this.value)"
                  onkeydown="if(event.key==='Enter'||event.key==='Tab'){event.preventDefault();PathologyPage._nextResult(${i})}"
                /></td>
                <td><input type="text" class="patho-input patho-unit"
                  value="${r.unit}" placeholder="e.g. mg/dL"
                  oninput="PathologyPage._update(${i},'unit',this.value)"
                /></td>
                <td><input type="text" class="patho-input"
                  value="${r.ref_range}" placeholder="e.g. 70-100"
                  oninput="PathologyPage._update(${i},'ref_range',this.value)"
                /></td>
                <td>
                  <select class="patho-flag-select flag-${r.flag||'N'}"
                    onchange="PathologyPage._setFlag(${i},this.value)">
                    <option value="N" ${r.flag==='N'?'selected':''}>Normal</option>
                    <option value="L" ${r.flag==='L'?'selected':''}>Low ↓</option>
                    <option value="H" ${r.flag==='H'?'selected':''}>High ↑</option>
                    <option value="C" ${r.flag==='C'?'selected':''}>Critical !</option>
                  </select>
                </td>
                <td><button class="patho-del-btn" onclick="PathologyPage._removeRow(${i})">
                  <i class="fas fa-times"></i>
                </button></td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>`;
    }).join('');
  },

  _update(i, field, val) {
    if (this._rows[i]) this._rows[i][field] = val;
  },

  _setFlag(i, val) {
    if (!this._rows[i]) return;
    this._rows[i].flag = val;
    this._renderSheet();
  },

  _removeRow(i) {
    this._rows.splice(i, 1);
    this._renderSheet();
  },

  _clearAll() {
    this._rows = [];
    this._renderSheet();
  },

  _nextResult(i) {
    const inputs = document.querySelectorAll('.patho-result');
    const next = inputs[i + 1];
    if (next) next.focus();
  },

  // ── SAVE + PRINT ─────────────────────────────────────────────────────────────
  async _saveAndPrint() {
    if (!this._patient) return showToast('Set patient first', 'warning');
    if (!this._rows.length) return showToast('Add at least one test', 'warning');

    // Collect live values from inputs
    document.querySelectorAll('[oninput*="_update"]').forEach(inp => {});

    await window.api.pathoSaveResults({
      visitId: this._visitId,
      patient: this._patient,
      rows: this._rows,
    });

    showToast('Results saved', 'success');
    this._printReport();
    this._loadRecent();
  },

  _printReport() {
    const p   = this._patient;
    const s   = App.settings || {};
    const clinic = s.pharmacy_name || 'Clinic / Lab';
    const addr   = s.address || '';
    const phone  = s.phone  || '';
    const now    = new Date();
    const dateStr = now.toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
    const cats   = [...new Set(this._rows.map(r => r.category))];

    const sections = cats.map(cat => {
      const tests = this._rows.filter(r => r.category === cat);
      const rows  = tests.map(t => {
        const flagLabel = t.flag==='H'?'↑ HIGH':t.flag==='L'?'↓ LOW':t.flag==='C'?'!! CRITICAL':'';
        const style     = (t.flag==='H'||t.flag==='C'||t.flag==='L') ? 'font-weight:bold;color:#c0392b' : '';
        return `<tr>
          <td style="padding:3px 6px">${t.test_name}</td>
          <td style="padding:3px 6px;text-align:right;${style}">${t.result||'—'}</td>
          <td style="padding:3px 6px;color:#666">${t.unit||''}</td>
          <td style="padding:3px 6px;color:#666">${t.ref_range||''}</td>
          <td style="padding:3px 6px;${style}">${flagLabel}</td>
        </tr>`;
      }).join('');
      return `<tr><td colspan="5" style="background:#f0f4f8;padding:4px 6px;font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:.5px">${cat}</td></tr>${rows}`;
    }).join('');

    const html = `
      <style>
        #pathoReportContent { font-family: Arial, sans-serif; max-width: 680px; margin: 0 auto; font-size: 12px; color: #000; padding: 16px; }
        .rp-header { text-align: center; border-bottom: 2px solid #1a2f5e; padding-bottom: 10px; margin-bottom: 12px; }
        .rp-title  { font-size: 18px; font-weight: 800; color: #1a2f5e; }
        .rp-sub    { font-size: 11px; color: #666; }
        .rp-patient{ width:100%; border-collapse:collapse; border:1px solid #d0d7e2; border-radius:6px; margin-bottom:14px; font-size:12px; overflow:hidden; }
        .rp-patient td { padding:6px 10px; vertical-align:middle; }
        .rp-lbl { font-weight:700; color:#1a2f5e; white-space:nowrap; width:130px; border-right:1px solid #d0d7e2; background:#eef1f7; }
        .rp-val { color:#111; }
        .rp-patient tr:nth-child(even) td { background:#f4f7fb; }
        .rp-patient tr:nth-child(even) td.rp-lbl { background:#dce3f0; }
        .rp-table  { width: 100%; border-collapse: collapse; }
        .rp-table th { background: #1a2f5e; color: #fff; padding: 5px 6px; font-size: 11px; text-align: left; }
        .rp-table tr:nth-child(even) { background: #f8f9fa; }
        .rp-footer { text-align: center; margin-top: 16px; font-size: 10px; color: #999; border-top: 1px solid #eee; padding-top: 8px; }
      </style>
      ${window.amcPrintHeader('report', 'Laboratory Report')}
      <div style="text-align:right;font-size:11px;color:#666;font-family:Arial,sans-serif;margin-top:6px">Date: ${dateStr}${this._visitId ? ' &nbsp;·&nbsp; Visit #'+String(this._visitId).padStart(4,'0') : ''}</div>
      <table class="rp-patient">
        <tr>
          <td class="rp-lbl">Patient Name</td>
          <td class="rp-val" style="width:38%">${p.name||'—'}</td>
          <td class="rp-lbl">Father / Husband</td>
          <td class="rp-val">${p.father_name||'—'}</td>
        </tr>
        <tr>
          <td class="rp-lbl">Age</td>
          <td class="rp-val">${p.age||'—'}</td>
          <td class="rp-lbl">Gender</td>
          <td class="rp-val">${p.gender==='M'?'Male':p.gender==='F'?'Female':p.gender==='C'?'Child':'—'}</td>
        </tr>
        ${(p.phone||p.nic) ? `<tr>
          <td class="rp-lbl">${p.nic?'NIC / CNIC':''}</td>
          <td class="rp-val">${p.nic||''}</td>
          <td class="rp-lbl">${p.phone?'Phone':''}</td>
          <td class="rp-val">${p.phone||''}</td>
        </tr>` : ''}
      </table>
      <table class="rp-table">
        <thead><tr>
          <th style="width:36%">Test</th>
          <th style="width:16%;text-align:right">Result</th>
          <th style="width:12%">Unit</th>
          <th style="width:20%">Ref. Range</th>
          <th style="width:16%">Flag</th>
        </tr></thead>
        <tbody>${sections}</tbody>
      </table>
      <div class="rp-footer">
        This report is generated electronically. · Powered by HyperCloud.pk
      </div>`;

    document.getElementById('pathoReportContent').innerHTML = html;
    document.getElementById('pathoReportPrint').style.display = 'block';
    window.print();
    setTimeout(() => { document.getElementById('pathoReportPrint').style.display = 'none'; }, 1200);
  },

  // ── RECENT REPORTS ────────────────────────────────────────────────────────────
  async _loadRecent() {
    const data = await window.api.pathoGetRecent();
    const el   = document.getElementById('pathoRecent');
    if (!el) return;
    if (!data.length) {
      el.innerHTML = '<p class="text-muted small text-center py-2">No reports yet</p>';
      return;
    }
    el.innerHTML = data.map(r => `
      <div class="patho-recent-row" onclick="PathologyPage._reopenReport(${r.visit_id},'${r.patient_name.replace(/'/g,"\\'")}')">
        <div>
          <span class="fw-bold" style="font-size:12px">${r.patient_name}</span>
          <span class="text-muted ms-1" style="font-size:10px">${r.test_count} tests</span>
        </div>
        <div style="font-size:10px;color:#9aa3b0">${formatDate(r.sample_date)}</div>
      </div>`).join('');
  },

  async _reopenReport(visitId, patientName) {
    const rows = await window.api.pathoGetResults(visitId);
    if (!rows.length) return showToast('No results found', 'warning');
    const r = rows[0];
    this._visitId = visitId;
    this._patient = { name: r.patient_name, father_name: r.father_name||'', age: r.age||'', gender: r.gender||'M' };
    this._rows    = rows.map(x => ({ test_name:x.test_name, category:x.category, result:x.result, unit:x.unit, ref_range:x.ref_range, flag:x.flag }));
    this._showPatientCard();
    this._renderSheet();
    document.getElementById('pathoWalkIn').style.display = 'none';
    showToast(`Loaded ${rows.length} results for ${r.patient_name}`);
  },
};
