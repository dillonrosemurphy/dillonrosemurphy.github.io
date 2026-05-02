/* ══════════════════════════════════════════════════════════
   Sewer Flow Calculator — page-specific JS
   Requires: common.js (dark mode, showToast, addRipple)
   ══════════════════════════════════════════════════════════ */

// ── Manning's n quick-set ──
function setN(val) {
  document.getElementById('inN').value = val.toFixed(3);
  calculate();
  saveState();
}

// ── SVG constants ──
const CX = 150, CY = 150, R = 108;

let waveState = { x0:0, x1:0, y:0, active:false };
let fatbergActive = false;

// ── Wave animation loop ──
let waveT = 0;
function waveLoop() {
  requestAnimationFrame(waveLoop);
  if (!waveState.active) return;
  waveT += 0.04;
  const path = document.getElementById('waterSurface');
  const { x0, x1, y } = waveState;
  const amp = 1.8, freq = 0.06;
  let d = `M ${x0} ${y}`;
  for (let x = x0; x <= x1; x += 2) {
    const wy = y + Math.sin((x * freq) + waveT) * amp;
    d += ` L ${x} ${wy}`;
  }
  path.setAttribute('d', d);
}
waveLoop();

function calculate() {
  if (fatbergActive) return;

  const D_mm = parseFloat(document.getElementById('inDiameter').value);
  const n    = parseFloat(document.getElementById('inN').value);
  const S    = parseFloat(document.getElementById('inSlope').value);
  const inv  = parseFloat(document.getElementById('inInvert').value);
  const tape = parseFloat(document.getElementById('inWater').value);

  if ([D_mm, n, S, inv, tape].some(isNaN)) return;

  const D = D_mm / 1000;
  const d = inv - tape;

  clearStatus();
  clearOptimalBadge();

  if (n <= 0 || S <= 0 || D <= 0) {
    setStatus('n, S, and diameter must all be positive.', 'error');
    resetResults(); showWarn('Check inputs'); return;
  }
  if (d < 0) {
    setStatus('Tape reading is less than depth to invert — tape is above the water surface.', 'error');
    resetResults(); showWarn('Check readings'); return;
  }

  if (Math.abs(S - 1.0) < 0.001) {
    setStatus("That's not a sewer. That's a waterfall.", 'warn');
  }
  if (D_mm >= 1200) {
    setStatus("Trunk sewer. Hope you've got confined space training.", 'warn');
  }
  if (Math.abs(n - 0.069) < 0.0001) {
    showToast('😏', 'var(--surface2)', 'nice.', '', 2000);
  }

  if (d > D) {
    setStatus('Water depth exceeds pipe diameter — pipe is surcharged.', 'warn');
    computeAndDisplay(D, D, n, S, true);
    return;
  }
  if (d === 0) {
    setStatus('No flow — water level equals invert level.', 'ok');
    resetResults(); updateVisualization(D, 0); return;
  }

  computeAndDisplay(D, d, n, S, false);
}

function computeAndDisplay(D, d, n, S, surcharged) {
  let A, P, theta;
  const dClamped = Math.min(d, D);

  if (dClamped >= D * 0.9999) {
    theta = 2 * Math.PI; A = Math.PI * D * D / 4; P = Math.PI * D;
  } else {
    theta = 2 * Math.acos(Math.max(-1, Math.min(1, 1 - 2 * dClamped / D)));
    A = (D * D / 8) * (theta - Math.sin(theta));
    P = D * theta / 2;
  }

  const R_hyd = A / P;
  const V     = (1 / n) * Math.pow(R_hyd, 2/3) * Math.pow(S, 0.5);
  const Q     = V * A;

  const A_f = Math.PI * D * D / 4;
  const R_f = D / 4;
  const V_f = (1 / n) * Math.pow(R_f, 2/3) * Math.pow(S, 0.5);
  const Q_f = V_f * A_f;

  const pctDepth = (dClamped / D) * 100;
  const pctQ     = Math.min((Q / Q_f) * 100, 100);
  const pctV     = Math.min((V / V_f) * 100, 100);

  if (pctDepth >= 93.0 && pctDepth <= 95.0 && !surcharged) {
    document.getElementById('optimalBadgeWrap').innerHTML =
      '<div class="optimal-badge">⭐ Optimal depth — textbook maximum flow</div>';
  }

  if (V < 0.75 && !surcharged && Math.abs(S - 1.0) >= 0.001) {
    setStatus(`Velocity ${V.toFixed(2)} m/s — below 0.75 m/s self-cleansing threshold.`, 'warn');
  }

  animateStat('resQ',     (Q * 1000).toFixed(2));
  animateStat('resV',     V.toFixed(3));
  animateStat('resDepth', (dClamped * 1000).toFixed(0));
  animateStat('resR',     (R_hyd * 1000).toFixed(1));

  document.getElementById('resA').textContent     = (A * 1e4).toFixed(2) + ' cm²  (' + A.toFixed(5) + ' m²)';
  document.getElementById('resP').textContent     = (P * 1000).toFixed(1) + ' mm';
  document.getElementById('resQFull').textContent = (Q_f * 1000).toFixed(2) + ' l/s';
  document.getElementById('resultsMeta').textContent = surcharged ? 'surcharged — full bore used' : `${pctDepth.toFixed(1)}% full`;

  const bar = document.getElementById('fullnessBar');
  bar.style.width = pctDepth.toFixed(1) + '%';
  bar.style.background = pctDepth > 80 ? 'var(--red)' : pctDepth > 60 ? 'var(--accent)' : 'var(--blue)';
  document.getElementById('fullnessPct').textContent = pctDepth.toFixed(1) + '%';

  document.getElementById('compareQVal').textContent     = (Q * 1000).toFixed(2) + ' l/s';
  document.getElementById('compareQFullVal').textContent = (Q_f * 1000).toFixed(2) + ' l/s';
  document.getElementById('compareVVal').textContent     = V.toFixed(3) + ' m/s';
  document.getElementById('compareVFullVal').textContent = V_f.toFixed(3) + ' m/s';
  document.getElementById('compareQBar').style.width     = pctQ.toFixed(1) + '%';
  document.getElementById('compareVBar').style.width     = pctV.toFixed(1) + '%';
  document.getElementById('compareQBar').style.background = pctDepth > 80 ? 'var(--red)' : 'var(--blue)';

  document.getElementById('vizMeta').textContent = `d/D = ${pctDepth.toFixed(1)}%  ·  Q = ${(Q*1000).toFixed(2)} l/s`;

  updateVisualization(D, dClamped);
  hideWarn();
  saveState();
}

function updateVisualization(D_m, d_m) {
  const waterFill     = document.getElementById('waterFill');
  const waterSurface  = document.getElementById('waterSurface');
  const dimDiaLabel   = document.getElementById('dimDiaLabel');
  const dimDepthLine  = document.getElementById('dimDepthLine');
  const dimDepthLabel = document.getElementById('dimDepthLabel');

  dimDiaLabel.textContent = `D = ${(D_m * 1000).toFixed(0)} mm`;

  if (d_m <= 0) {
    waterFill.setAttribute('d', '');
    waterSurface.setAttribute('d', '');
    waveState.active = false;
    dimDepthLine.setAttribute('x1','270'); dimDepthLine.setAttribute('x2','270');
    dimDepthLine.setAttribute('y1', CY+R); dimDepthLine.setAttribute('y2', CY+R);
    dimDepthLabel.textContent = 'd = 0';
    dimDepthLabel.setAttribute('y', CY+R);
    return;
  }

  const ratio  = d_m / D_m;
  const d_svg  = ratio * (2 * R);
  const y_wat  = CY + R - d_svg;
  const y_inv  = CY + R;
  const x_half = Math.sqrt(Math.max(0, R*R - (R - d_svg)*(R - d_svg)));
  const largeArc = d_svg > R ? 1 : 0;

  let path;
  if (ratio >= 0.9999) {
    path = `M ${CX} ${CY-R} A ${R} ${R} 0 1 1 ${CX} ${CY+R} A ${R} ${R} 0 1 1 ${CX} ${CY-R} Z`;
    waveState.active = false;
    waterSurface.setAttribute('d', '');
  } else {
    path = `M ${CX - x_half} ${y_wat} L ${CX + x_half} ${y_wat} A ${R} ${R} 0 ${largeArc} 1 ${CX - x_half} ${y_wat} Z`;
    waveState = { x0: CX - x_half, x1: CX + x_half, y: y_wat, active: true };
  }

  waterFill.setAttribute('d', path);

  const dxRight = 258;
  dimDepthLine.setAttribute('x1', dxRight); dimDepthLine.setAttribute('x2', dxRight);
  dimDepthLine.setAttribute('y1', y_inv);   dimDepthLine.setAttribute('y2', y_wat);
  const midY = (y_inv + y_wat) / 2;
  dimDepthLabel.textContent = `d=${(d_m*1000).toFixed(0)}mm`;
  dimDepthLabel.setAttribute('x', dxRight + 5);
  dimDepthLabel.setAttribute('y', midY + 4);
  dimDepthLine.setAttribute('stroke', 'var(--blue)');
  dimDepthLine.setAttribute('marker-start', 'url(#arr-blue-start)');
  dimDepthLine.setAttribute('marker-end', 'url(#arr-blue-end)');
}

// ── Easter egg 1: type "fatberg" ──
let typeBuf = '';
document.addEventListener('keydown', e => {
  if (e.key.length !== 1) return;
  typeBuf += e.key.toLowerCase();
  if (typeBuf.length > 12) typeBuf = typeBuf.slice(-12);
  if ((typeBuf.endsWith('fatberg') || typeBuf.endsWith('fatburg')) && !fatbergActive) {
    typeBuf = ''; triggerFatberg();
  }
  if (typeBuf.endsWith('ofwat')) {
    typeBuf = '';
    showToast('🏛️', 'var(--surface2)', 'Regulatory capture detected.', 'Nothing will happen.', 3000);
  }
});

function triggerFatberg() {
  fatbergActive = true;
  waveState.active = false;

  const overlay = document.createElement('div');
  overlay.className = 'fatberg-overlay';
  document.body.appendChild(overlay);

  setStatus('🧀 FATBERG DETECTED — pipe blocked', 'error');
  showWarn('FATBERG');
  document.getElementById('waterFill').setAttribute('fill', '#c45f51');
  document.getElementById('waterFill').setAttribute('opacity', '0.35');
  animateStat('resQ', '0.00'); animateStat('resV', '0.000');
  document.getElementById('vizMeta').textContent = 'BLOCKAGE — Q = 0.00 l/s';
  document.getElementById('fullnessBar').style.background = '#c45f51';

  setTimeout(() => {
    overlay.remove();
    fatbergActive = false;
    document.getElementById('waterFill').setAttribute('fill', 'var(--blue)');
    document.getElementById('waterFill').setAttribute('opacity', '0.22');
    calculate();
  }, 3000);
}

// ── Easter egg: badge 3x → hint modal ──
let badgeClicks = 0, badgeTimer;
document.getElementById('bsenBadge').addEventListener('click', () => {
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
        <div class="hint-item"><span class="hint-key">type "fatberg"</span><span class="hint-desc">Trigger a blockage event. Background flashes red. (also works with "fatburg")</span></div>
        <div class="hint-item"><span class="hint-key">n = 0.069</span><span class="hint-desc">Set Manning's n to exactly 0.069.</span></div>
        <div class="hint-item"><span class="hint-key">d/D = 93–95%</span><span class="hint-desc">Hit the theoretical maximum flow depth for a circular pipe under Manning's formula.</span></div>
        <div class="hint-item"><span class="hint-key">S = 1.0</span><span class="hint-desc">Set the bed slope to 1 in 1.</span></div>
        <div class="hint-item"><span class="hint-key">D ≥ 1200mm</span><span class="hint-desc">Enter a trunk sewer diameter.</span></div>
        <div class="hint-item"><span class="hint-key">type "ofwat"</span><span class="hint-desc">Invoke the regulator.</span></div>
      </div>
      <div class="hint-footer">[ click anywhere to close ]</div>
    </div>
  `;
  overlay.addEventListener('click', () => overlay.remove());
  document.body.appendChild(overlay);
}

// ── Helpers ──
function showWarn(msg) {
  const w = document.getElementById('warnText');
  w.textContent = msg; w.setAttribute('opacity','1');
}
function hideWarn() { document.getElementById('warnText').setAttribute('opacity','0'); }

function clearOptimalBadge() {
  document.getElementById('optimalBadgeWrap').innerHTML = '';
}

function animateStat(id, val) {
  const el = document.getElementById(id);
  el.textContent = val; el.classList.add('has-data');
  el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
}

function resetResults() {
  ['resQ','resV','resDepth','resR'].forEach(id => {
    const el = document.getElementById(id);
    el.textContent = '—'; el.classList.remove('has-data','pop');
  });
  ['resA','resP','resQFull'].forEach(id => document.getElementById(id).textContent = '—');
  document.getElementById('resultsMeta').textContent = '—';
  document.getElementById('fullnessBar').style.width = '0%';
  document.getElementById('fullnessPct').textContent = '—';
  document.getElementById('compareQBar').style.width = '0%';
  document.getElementById('compareVBar').style.width = '0%';
  ['compareQVal','compareQFullVal','compareVVal','compareVFullVal'].forEach(id => document.getElementById(id).textContent = '—');
  document.getElementById('vizMeta').textContent = '—';
  waveState.active = false;
  document.getElementById('waterSurface').setAttribute('d','');
}

function setStatus(msg, type) {
  const el = document.getElementById('statusMsg');
  el.textContent = msg; el.className = 'status-msg ' + type;
}
function clearStatus() { setStatus('',''); }

// ── Persistence ──
const STORE_KEY = 'sewerflow_v1';

function saveState() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify({
      diameter: document.getElementById('inDiameter').value,
      n:        document.getElementById('inN').value,
      slope:    document.getElementById('inSlope').value,
      invert:   document.getElementById('inInvert').value,
      water:    document.getElementById('inWater').value,
    }));
  } catch(e) {}
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return;
    const s = JSON.parse(raw);
    if (s.diameter) document.getElementById('inDiameter').value = s.diameter;
    if (s.n)        document.getElementById('inN').value        = s.n;
    if (s.slope)    document.getElementById('inSlope').value    = s.slope;
    if (s.invert)   document.getElementById('inInvert').value   = s.invert;
    if (s.water)    document.getElementById('inWater').value    = s.water;
  } catch(e) {}
}

// Init
loadState();
calculate();
