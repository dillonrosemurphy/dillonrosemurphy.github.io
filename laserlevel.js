/* ══════════════════════════════════════════════════════════
   Laser Level — page-specific JS
   Requires: common.js (dark mode, showToast, addRipple)
   ══════════════════════════════════════════════════════════ */

// ── State ──
let mode = 'tbm';
let hpc  = null;
let rows = [];
let rowId = 0;

function setMode(m) {
  mode = m;
  document.getElementById('tbmInputs').style.display    = m === 'tbm'    ? '' : 'none';
  document.getElementById('directInputs').style.display = m === 'direct' ? '' : 'none';
  document.getElementById('btnModeTBM').classList.toggle('active',    m === 'tbm');
  document.getElementById('btnModeDirect').classList.toggle('active', m === 'direct');
  document.getElementById('hpcStaffVal').closest('div').style.display = m === 'tbm' ? '' : 'none';
  calculate();
}

function calculate() {
  clearStatus();

  if (mode === 'tbm') {
    const tbm = parseFloat(document.getElementById('inTBM').value);
    const bs  = parseFloat(document.getElementById('inBacksight').value);
    if (isNaN(tbm) || isNaN(bs)) { hpc = null; updateHPCDisplay(); return; }
    if (bs < 0) { setStatus('Backsight cannot be negative.', 'error'); hpc = null; updateHPCDisplay(); return; }
    if (Math.abs(bs - 1.000) < 0.0001) {
      showToast('🤨', 'var(--surface2)', 'Suspiciously round number.', "Did you actually read that staff?", 3000);
    }
    hpc = tbm + bs;
    document.getElementById('hpcStaffVal').textContent = bs.toFixed(3) + ' m';
    document.getElementById('setupMeta').textContent = `TBM ${tbm.toFixed(3)}`;
  } else {
    const direct = parseFloat(document.getElementById('inHPCdirect').value);
    if (isNaN(direct)) { hpc = null; updateHPCDisplay(); return; }
    hpc = direct;
    document.getElementById('setupMeta').textContent = 'direct entry';
  }

  updateHPCDisplay();
  updateTableRows();
  updateVisualization();
  calculateCheck();
  saveState();
}

function updateHPCDisplay() {
  const el = document.getElementById('hpcVal');
  if (hpc === null) {
    el.textContent = '—';
    document.getElementById('vizMeta').textContent = '—';
    updateVisualization();
    return;
  }
  el.textContent = hpc.toFixed(3);
  el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
  document.getElementById('vizMeta').textContent = `HPC = ${hpc.toFixed(3)} mAOD`;
}

// ── Table rows ──
let rowActionTimes = [];
function trackRowAction() {
  const now = Date.now();
  rowActionTimes.push(now);
  rowActionTimes = rowActionTimes.filter(t => now - t < 3000);
  if (rowActionTimes.length >= 5) {
    rowActionTimes = [];
    showToast('🤦', 'var(--surface2)', 'Make your mind up.', '5 changes in 3 seconds.', 2500);
  }
}

function addRow() {
  trackRowAction();
  const id = rowId++;
  rows.push({ id, label: '', reqLevel: '' });
  renderTable();
  saveState();
  setTimeout(() => {
    const inp = document.getElementById(`lbl-${id}`);
    if (inp) inp.focus();
  }, 50);
}

function deleteRow(id) {
  trackRowAction();
  rows = rows.filter(r => r.id !== id);
  renderTable();
  saveState();
}

function renderTable() {
  const tbody = document.getElementById('targetBody');

  if (rows.length === 0) {
    tbody.innerHTML = '';
    tbody.appendChild(buildEmptyRow());
    return;
  }

  tbody.innerHTML = '';
  rows.forEach((row, i) => {
    const reqLevel = parseFloat(row.reqLevel);
    let staffReading = '—', chipHTML = '', staffClass = 'invalid';

    if (hpc !== null && !isNaN(reqLevel)) {
      const req = hpc - reqLevel;
      staffReading = req.toFixed(3) + ' m';
      if (req < 0) {
        staffClass = 'invalid';
        staffReading = '⚠ above HPC';
        chipHTML = `<span class="cut-fill-chip chip-none">Check</span>`;
      } else {
        staffClass = 'valid-cut';
        chipHTML = `<span class="cut-fill-chip chip-cut">Set out</span>`;
      }
    }

    const tr = document.createElement('tr');
    tr.style.animationDelay = `${i * 0.04}s`;
    tr.innerHTML = `
      <td class="td-label"><input id="lbl-${row.id}" type="text" placeholder="e.g. FL at MH3" value="${row.label}" oninput="rows[${i}].label=this.value;saveState()"></td>
      <td class="td-req-level"><input id="rl-${row.id}" type="number" step="0.001" placeholder="99.500" value="${row.reqLevel}" oninput="rows[${i}].reqLevel=this.value;renderTable();updateVisualization();saveState()"></td>
      <td><span class="staff-reading ${staffClass}">${staffReading}</span></td>
      <td>${chipHTML || '<span class="cut-fill-chip chip-none">—</span>'}</td>
      <td><button class="del-btn" onclick="deleteRow(${row.id})" title="Remove"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></td>
    `;
    tbody.appendChild(tr);
  });
}

function buildEmptyRow() {
  const tr = document.createElement('tr');
  tr.className = 'empty-row'; tr.id = 'emptyRow';
  tr.innerHTML = '<td colspan="5">No targets added yet — click Add level</td>';
  return tr;
}

function updateTableRows() { renderTable(); }

// ── Check a level ──
function calculateCheck() {
  const staff  = parseFloat(document.getElementById('inCheck').value);
  const design = parseFloat(document.getElementById('inDesign').value);
  const result = document.getElementById('checkResult');
  const actual = document.getElementById('checkActual');
  const diff   = document.getElementById('checkDiff');

  if (hpc === null || isNaN(staff)) {
    actual.textContent = '—';
    diff.textContent   = hpc === null ? 'Set up laser first' : 'Enter a staff reading above';
    diff.style.color   = 'var(--text3)';
    result.className   = 'check-result';
    return;
  }

  const lvl = hpc - staff;
  actual.textContent = lvl.toFixed(3) + ' mAOD';
  actual.classList.remove('pop'); void actual.offsetWidth; actual.classList.add('pop');

  if (!isNaN(design)) {
    const delta = lvl - design;
    const absDelta = Math.abs(delta).toFixed(3);
    if (Math.abs(delta) < 0.002) {
      diff.textContent = '✓ On level';
      diff.style.color = 'var(--green)';
      result.className = 'check-result ok';
    } else if (delta > 0) {
      diff.textContent = `${absDelta} m HIGH — needs ${absDelta} m cut`;
      diff.style.color = 'var(--red)';
      result.className = 'check-result warn';
    } else {
      diff.textContent = `${absDelta} m LOW — needs ${absDelta} m fill`;
      diff.style.color = 'var(--blue)';
      result.className = 'check-result';
      result.style.background = 'var(--blue-bg)';
      result.style.borderColor = 'var(--blue-border)';
      return;
    }
  } else {
    diff.textContent = 'Enter design level to check cut / fill';
    diff.style.color = 'var(--text3)';
    result.className = 'check-result';
  }
  result.style.background = '';
  result.style.borderColor = '';
  saveState();
}

// ── Elevation SVG ──
function updateVisualization() {
  const noData  = document.getElementById('noDataText');
  const laser   = document.getElementById('laserBeam');
  const hpcLbl  = document.getElementById('hpcLineLabel');
  const staffTbm = document.getElementById('staffTbm');
  const staffTbmTick = document.getElementById('staffTbmTick');
  const staffTbmLabel = document.getElementById('staffTbmLabel');
  const tbmLvlTxt = document.getElementById('tbmLevel');
  const staffTarget = document.getElementById('staffTarget');
  const staffTargetTick = document.getElementById('staffTargetTick');
  const staffTargetLabel = document.getElementById('staffTargetLabel');
  const targetLvlTxt = document.getElementById('targetLevelLabel');
  const dimHpc  = document.getElementById('dimHpcLine');
  const dimTgt  = document.getElementById('dimTargetLine');

  if (hpc === null) {
    noData.setAttribute('opacity','1');
    laser.setAttribute('opacity','0');
    hpcLbl.setAttribute('opacity','0');
    [staffTbm,staffTbmTick,staffTbmLabel,staffTarget,staffTargetTick,staffTargetLabel,dimHpc,dimTgt].forEach(e=>e.setAttribute('opacity','0'));
    return;
  }

  noData.setAttribute('opacity','0');
  laser.setAttribute('opacity','0.8');
  hpcLbl.setAttribute('opacity','1');
  [staffTbm,staffTbmTick,staffTbmLabel,staffTarget,staffTargetTick,staffTargetLabel,dimHpc,dimTgt].forEach(e=>e.setAttribute('opacity','1'));

  const gndY   = 170;
  const maxH   = 140;
  let bs = 0;

  if (mode === 'tbm') {
    bs = parseFloat(document.getElementById('inBacksight').value) || 1.0;
  } else {
    const tbm = parseFloat(document.getElementById('inTBM').value);
    bs = isNaN(tbm) ? 1.0 : hpc - (tbm || hpc - 1.0);
  }

  let reqStaff = 1.0, reqLevel = null;
  const firstValid = rows.find(r => !isNaN(parseFloat(r.reqLevel)));
  if (firstValid) {
    reqLevel = parseFloat(firstValid.reqLevel);
    reqStaff = hpc - reqLevel;
  }

  const refLen = Math.max(Math.abs(bs), Math.abs(reqStaff), 0.5);
  const scale  = Math.min(maxH / refLen, 60);

  const laserY = gndY - bs * scale;
  const laserYclamped = Math.max(20, Math.min(gndY - 4, laserY));

  staffTbm.setAttribute('y',    laserYclamped);
  staffTbm.setAttribute('height', gndY - laserYclamped);
  staffTbmTick.setAttribute('y1', laserYclamped); staffTbmTick.setAttribute('y2', laserYclamped);
  staffTbmTick.setAttribute('x1', 53); staffTbmTick.setAttribute('x2', 67);
  staffTbmLabel.setAttribute('y', laserYclamped + 4);
  staffTbmLabel.textContent = bs.toFixed(3) + ' m';

  laser.setAttribute('y1', laserYclamped); laser.setAttribute('y2', laserYclamped);
  hpcLbl.setAttribute('y', laserYclamped - 5);
  hpcLbl.textContent = `HPC = ${hpc.toFixed(3)} mAOD`;

  const tbmLvl = mode === 'tbm' ? parseFloat(document.getElementById('inTBM').value) : hpc - bs;
  tbmLvlTxt.textContent = isNaN(tbmLvl) ? '' : tbmLvl.toFixed(3);

  dimHpc.setAttribute('y1', laserYclamped); dimHpc.setAttribute('y2', gndY);

  if (reqLevel !== null && reqStaff > 0) {
    const tgtY = gndY - reqStaff * scale;
    const tgtYclamped = Math.max(20, Math.min(gndY - 4, tgtY));
    staffTarget.setAttribute('y',      laserYclamped);
    staffTarget.setAttribute('height', gndY - laserYclamped);
    staffTargetTick.setAttribute('y1', tgtYclamped); staffTargetTick.setAttribute('y2', tgtYclamped);
    staffTargetLabel.setAttribute('y', tgtYclamped + 4);
    staffTargetLabel.textContent = reqStaff.toFixed(3) + ' m';
    targetLvlTxt.textContent = reqLevel.toFixed(3);
    dimTgt.setAttribute('y1', laserYclamped); dimTgt.setAttribute('y2', gndY);
    staffTarget.setAttribute('opacity','1');
    staffTargetTick.setAttribute('opacity','1');
    staffTargetLabel.setAttribute('opacity','1');
    dimTgt.setAttribute('opacity','0.6');
    targetLvlTxt.setAttribute('opacity','1');
  } else {
    staffTarget.setAttribute('opacity','0');
    staffTargetTick.setAttribute('opacity','0');
    staffTargetLabel.setAttribute('opacity','0');
    dimTgt.setAttribute('opacity','0');
    targetLvlTxt.setAttribute('opacity','0');
  }
}

function setStatus(msg, type) {
  const el = document.getElementById('statusMsg');
  el.textContent = msg; el.className = 'status-msg ' + type;
}
function clearStatus() { setStatus('',''); }

// ── Easter egg: keyboard sequences ──
let eeBuf = '';
document.addEventListener('keydown', e => {
  if (e.key.length !== 1) return;
  eeBuf += e.key.toLowerCase();
  if (eeBuf.length > 12) eeBuf = eeBuf.slice(-12);
  if (eeBuf.endsWith('monday')) { eeBuf = ''; triggerMonday(); }
  if (eeBuf.endsWith('raining')) { eeBuf = ''; triggerRain(); }
  if (eeBuf.endsWith('hs2')) { eeBuf = ''; triggerHS2(); }
});

function triggerMonday() {
  const app = document.querySelector('.app');
  app.classList.remove('untilting');
  app.classList.add('tilted');
  showToast('😩', 'var(--surface2)', "Site's not level.", "Neither is your mood.", 3000);
  setTimeout(() => {
    app.classList.remove('tilted');
    app.classList.add('untilting');
    setTimeout(() => app.classList.remove('untilting'), 1300);
  }, 3000);
}

let rainInterval = null;
function triggerRain() {
  if (rainInterval) return;
  const wrap = document.getElementById('vizWrap');
  const laser = document.getElementById('laserBeam');
  showToast('🌧️', 'var(--blue-bg)', 'Lovely day on site.', 'Laser struggling in the rain.', 3500);

  let flickerCount = 0;
  const flicker = setInterval(() => {
    const op = Math.random() > 0.4 ? '0.8' : '0.2';
    laser.setAttribute('opacity', op);
    if (++flickerCount > 30) { clearInterval(flicker); laser.setAttribute('opacity','0.8'); }
  }, 120);

  rainInterval = setInterval(() => {
    const drop = document.createElement('div');
    drop.className = 'rain-drop';
    const h = 8 + Math.random() * 14;
    drop.style.left   = (Math.random() * 100) + '%';
    drop.style.top    = '0px';
    drop.style.height = h + 'px';
    const dur = 0.5 + Math.random() * 0.4;
    drop.style.animationDuration = dur + 's';
    wrap.appendChild(drop);
    setTimeout(() => drop.remove(), dur * 1000 + 100);
  }, 60);

  setTimeout(() => {
    clearInterval(rainInterval);
    rainInterval = null;
    wrap.querySelectorAll('.rain-drop').forEach(d => d.remove());
  }, 5000);
}

let idleTimer;
let tbmSunk = false;
function resetIdle() {
  clearTimeout(idleTimer);
  if (tbmSunk) {
    tbmSunk = false;
    const tri = document.getElementById('tbmTriangle');
    tri.classList.remove('sinking');
    void tri.offsetWidth;
  }
  idleTimer = setTimeout(() => {
    tbmSunk = true;
    document.getElementById('tbmTriangle').classList.add('sinking');
    showToast('📉', 'var(--surface2)', 'Settlement detected.', 'TBM is on the move. Re-level.', 4000);
  }, 60000);
}
['mousemove','keydown','click','scroll'].forEach(ev => document.addEventListener(ev, resetIdle));
resetIdle();

function triggerHS2() {
  const overlay = document.createElement('div');
  overlay.className = 'hs2-overlay';
  overlay.innerHTML = `<div class="hs2-text">Project cancelled.<br><span style="font-size:18px;color:var(--text3);font-family:'Martian Mono',monospace;font-size:13px;letter-spacing:0.08em;">Scope changed. Budget revised.<br>Start again.</span></div>`;
  document.body.appendChild(overlay);
  setTimeout(() => {
    overlay.style.transition = 'opacity 0.5s';
    overlay.style.opacity = '0';
    setTimeout(() => overlay.remove(), 520);
    showToast('🚄', 'var(--surface2)', 'HS2 Phase 3 cancelled.', 'Nothing unusual here.', 3000);
  }, 3000);
}

let badgeClicks = 0, badgeTimer;
document.getElementById('settingOutBadge').addEventListener('click', () => {
  badgeClicks++;
  clearTimeout(badgeTimer);
  badgeTimer = setTimeout(() => { badgeClicks = 0; }, 1200);
  if (badgeClicks >= 3) { badgeClicks = 0; showHintModal(); }
});

function showHintModal() {
  const overlay = document.createElement('div');
  overlay.className = 'hint-overlay';
  overlay.innerHTML = `
    <div class="hint-box" onclick="event.stopPropagation()">
      <div class="hint-eyebrow">classified · site eyes only</div>
      <div class="hint-title">Easter Eggs</div>
      <div class="hint-list">
        <div class="hint-item"><span class="hint-key">type "monday"</span><span class="hint-desc">Page tilts 2° off level. Slowly corrects itself.</span></div>
        <div class="hint-item"><span class="hint-key">type "raining"</span><span class="hint-desc">Rain falls through the diagram. Laser starts flickering.</span></div>
        <div class="hint-item"><span class="hint-key">idle 60 seconds</span><span class="hint-desc">The TBM slowly sinks into the ground. Settlement detected.</span></div>
        <div class="hint-item"><span class="hint-key">backsight = 1.000</span><span class="hint-desc">Did you actually read that staff?</span></div>
        <div class="hint-item"><span class="hint-key">type "hs2"</span><span class="hint-desc">Project cancelled. Scope changed. Start again.</span></div>
        <div class="hint-item"><span class="hint-key">add / delete 5 rows in 3s</span><span class="hint-desc">Make your mind up.</span></div>
      </div>
      <div class="hint-footer">[ click anywhere to close ]</div>
    </div>
  `;
  overlay.addEventListener('click', () => overlay.remove());
  document.body.appendChild(overlay);
}

// ── Persistence ──
const STORE_KEY = 'laserlevel_v1';

function saveState() {
  const state = {
    mode,
    tbm:       document.getElementById('inTBM').value,
    backsight: document.getElementById('inBacksight').value,
    hpcDirect: document.getElementById('inHPCdirect').value,
    checkStaff: document.getElementById('inCheck').value,
    checkDesign: document.getElementById('inDesign').value,
    rows: rows.map(r => ({ label: r.label, reqLevel: r.reqLevel }))
  };
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch(e) {}
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return;
    const s = JSON.parse(raw);
    if (s.tbm)        document.getElementById('inTBM').value        = s.tbm;
    if (s.backsight)  document.getElementById('inBacksight').value  = s.backsight;
    if (s.hpcDirect)  document.getElementById('inHPCdirect').value  = s.hpcDirect;
    if (s.checkStaff) document.getElementById('inCheck').value      = s.checkStaff;
    if (s.checkDesign)document.getElementById('inDesign').value     = s.checkDesign;
    if (s.rows && s.rows.length) {
      rows = s.rows.map(r => ({ id: rowId++, label: r.label, reqLevel: r.reqLevel }));
    }
    if (s.mode) setMode(s.mode);
  } catch(e) {}
}

// Init
setMode('tbm');
loadState();
calculate();
