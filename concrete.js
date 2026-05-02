// concrete.js
// ─────────────────────────────────────────────────────────────────────────────
// Concrete Curing Calculator — Eurocode 2 / ASTM C1074 / CIRIA C660
// ─────────────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  // FIX Error 1: default pour date to TODAY (not 7 days ago)
  const dateInput = document.getElementById('pourDate');
  const today = new Date();
  dateInput.value = today.toISOString().split('T')[0];

  // FIX Error 4: set max to today + 14 days (API forecast limit)
  const maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() + 14);
  dateInput.max = maxDate.toISOString().split('T')[0];

  initCharts();
  renderPourHistory();
});

// ─── Chart instances ───────────────────────────────────────────────────────
let myChart = null;
let tempChart = null;
let maturityChart = null;

// ─── Concrete type → fck lookup ────────────────────────────────────────────
// FIX Error 9: use descriptive keys instead of raw MPa values to disambiguate
const CONCRETE_FCK = {
  // Reinforced Concrete (BS EN 206 / EC2 Table 3.1)
  'RC20': 20, 'RC25': 25, 'RC28': 28, 'RC32': 32, 'RC35': 35, 'RC40': 40,
  // General Concrete (BS 8500-2)
  'GEN0': 8,  'GEN1': 12, 'GEN2': 16, 'GEN3': 20,
  // Standardised Prescribed
  'ST1': 8,   'ST2': 12,  'ST3': 16,  'ST4': 20,  'ST5': 25,
  // Paving
  'PAV1': 30, 'PAV2': 35,
  // Foundation
  'FND2': 25, 'FND3': 35, 'FND4': 40,
};

function toggleCustomFck() {
  const concreteType = document.getElementById('concreteType').value;
  const customFckDiv = document.getElementById('customFckDiv');
  customFckDiv.style.display = concreteType === 'custom' ? 'block' : 'none';
}

// ─── Peak hydration hour by cement class (S coefficient) ──────────────────
// E1 improvement: peakHour varies with cement class
function getPeakHydrationHour(sClass) {
  // Rapid (s=0.20) → fast hydration, peak ~12h
  // Normal (s=0.25) → peak ~24–30h
  // Slow (s=0.38) → peak ~48h
  if (sClass <= 0.20) return 12;
  if (sClass <= 0.25) return 28;
  return 48;
}

// ─── Crush row helpers ─────────────────────────────────────────────────────
function addCrushRow() {
  const container = document.getElementById('crushList');
  const row = document.createElement('div');
  row.className = 'crush-row';
  row.innerHTML = `
    <input type="number" class="crush-day" placeholder="e.g. 56" min="1">
    <input type="number" class="crush-str" placeholder="e.g. 40" min="0">
    <button class="remove-btn" onclick="this.parentElement.remove()" title="Remove">✕</button>
  `;
  container.appendChild(row);
}

function addMilestoneRow() {
  const container = document.getElementById('milestoneList');
  const row = document.createElement('div');
  row.className = 'crush-row milestone-row';
  row.innerHTML = `
    <input type="number" class="mile-str" placeholder="e.g. 15" min="1">
    <button class="remove-btn" onclick="this.parentElement.remove()" title="Remove">✕</button>
  `;
  container.appendChild(row);
}

// ─── Geolocation ──────────────────────────────────────────────────────────
function getLocation() {
  const btn = document.getElementById('btnLocate');
  const locDisp = document.getElementById('locDisplay');
  const latIn = document.getElementById('lat');
  const lonIn = document.getElementById('lon');

  if (!navigator.geolocation) {
    locDisp.textContent = 'Geolocation is not supported by your browser.';
    return;
  }

  btn.innerHTML = 'Locating…';
  btn.style.pointerEvents = 'none';

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const lat = pos.coords.latitude.toFixed(4);
      const lon = pos.coords.longitude.toFixed(4);
      latIn.value = lat;
      lonIn.value = lon;
      locDisp.textContent = `Located: ${lat}, ${lon}`;
      btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg> Get My Location`;
      btn.style.pointerEvents = 'all';
    },
    (err) => {
      console.error(err);
      locDisp.textContent = 'Unable to retrieve location.';
      btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg> Get My Location`;
      btn.style.pointerEvents = 'all';
    }
  );
}

// ─── Chart initialisation ──────────────────────────────────────────────────
function initCharts() {
  const isDark = document.body.classList.contains('dark-mode');
  const textColor = isDark ? '#b3b3b3' : '#666';
  const gridColor = isDark ? '#2a2a2a' : '#eaeaea';

  Chart.defaults.color = textColor;
  Chart.defaults.font.family = "'Instrument Sans', sans-serif";

  // ── Strength Chart ──
  // FIX: Use type:'linear' x-axis so scatter {x,y} points and line {x,y} data
  // share the same continuous numeric axis — previously category axis caused
  // scatter points to not render at the correct position.
  const ctx = document.getElementById('strengthChart').getContext('2d');
  myChart = new Chart(ctx, {
    type: 'line',
    data: {
      datasets: [
        {
          label: 'Expected Strength (Temp-Adjusted)',
          data: [], // {x: days, y: MPa}
          borderColor: '#c9622f', backgroundColor: 'rgba(201,98,47,0.1)',
          borderWidth: 2, tension: 0.3, fill: true, pointRadius: 0
        },
        {
          label: 'Baseline 20°C',
          data: [], // {x: days, y: MPa}
          borderColor: '#6cc49a', borderWidth: 2, borderDash: [5, 5],
          tension: 0.3, pointRadius: 0, fill: false
        },
        {
          label: 'Actual Cube Results',
          data: [], // {x: days, y: MPa}
          type: 'scatter',
          backgroundColor: '#3a7d55', borderColor: '#ffffff',
          borderWidth: 2, pointRadius: 7, pointHoverRadius: 10,
          pointStyle: 'circle'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          type: 'linear',   // ← CRITICAL: continuous numeric axis
          title: { display: true, text: 'Time since pour (Days)' },
          grid: { color: gridColor },
          ticks: { stepSize: 7 }
        },
        y: {
          title: { display: true, text: 'Compressive Strength f_cm(t) (N/mm²)' },
          grid: { color: gridColor },
          beginAtZero: true
        }
      },
      plugins: {
        tooltip: {
          mode: 'nearest',
          intersect: false,
          callbacks: {
            title: (items) => `Day ${parseFloat(items[0].parsed.x).toFixed(1)}`,
            label: (item) => `${item.dataset.label}: ${item.parsed.y.toFixed(1)} N/mm²`
          }
        }
      }
    }
  });

  // ── Temperature Chart ── (linear axis for consistency)
  const ctxTemp = document.getElementById('tempChart').getContext('2d');
  tempChart = new Chart(ctxTemp, {
    type: 'line',
    data: {
      datasets: [
        { label: 'Internal Core Temp (°C)', data: [], borderColor: '#d9534f', borderWidth: 2, tension: 0.3, pointRadius: 0 },
        { label: 'Ambient Air (°C)',         data: [], borderColor: '#5bc0de', borderWidth: 1, borderDash: [3, 3], tension: 0.3, pointRadius: 0 }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { type: 'linear', display: true, title: { display: true, text: 'Days since pour' }, grid: { color: gridColor }, ticks: { stepSize: 7 } },
        y: { title: { display: true, text: 'Temp (°C)' }, grid: { color: gridColor } }
      },
      plugins: { tooltip: { mode: 'nearest', intersect: false } }
    }
  });

  // ── Maturity Chart ── (linear axis for consistency)
  const ctxMat = document.getElementById('maturityChart').getContext('2d');
  maturityChart = new Chart(ctxMat, {
    type: 'line',
    data: {
      datasets: [
        { label: 'Arrhenius Equivalent Age (Days)', data: [], borderColor: '#f0ad4e', borderWidth: 2, tension: 0.3, pointRadius: 0 },
        { label: 'Actual Clock Age (Days)',          data: [], borderColor: '#aaa',    borderWidth: 1, borderDash: [4, 4], pointRadius: 0 }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { type: 'linear', title: { display: true, text: 'Time since pour (Days)' }, grid: { color: gridColor }, ticks: { stepSize: 7 } },
        y: { title: { display: true, text: 'Equivalent Age (Days)' }, grid: { color: gridColor }, beginAtZero: true }
      },
      plugins: { tooltip: { mode: 'nearest', intersect: false } }
    }
  });
}

function updateChartTheme() {
  if (!myChart) return;
  const isDark = document.body.classList.contains('dark-mode');
  const c = isDark ? '#2a2a2a' : '#eaeaea';
  const t = isDark ? '#b3b3b3' : '#666';
  Chart.defaults.color = t;
  [myChart, tempChart, maturityChart].forEach(chart => {
    if (!chart) return;
    if (chart.options.scales.x) chart.options.scales.x.grid.color = c;
    if (chart.options.scales.y) chart.options.scales.y.grid.color = c;
    chart.update();
  });
}

const ob = new MutationObserver(updateChartTheme);
ob.observe(document.body, { attributes: true, attributeFilter: ['class'] });

// ─── Location mode toggle ─────────────────────────────────────────────────
function setLocMode(mode) {
  document.getElementById('apiLocPanel').style.display  = mode === 'api'    ? 'flex' : 'none';
  document.getElementById('manualTempPanel').style.display = mode === 'manual' ? 'block' : 'none';
  document.querySelectorAll('.loc-mode-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
}

// ─── Main calculation ──────────────────────────────────────────────────────
async function calculateStrength() {
  const pourDateStr = document.getElementById('pourDate').value;
  const pourTimeStr = document.getElementById('pourTime').value;

  const typeVal = document.getElementById('concreteType').value;
  let fck;
  if (typeVal === 'custom') {
    fck = parseFloat(document.getElementById('fck').value);
  } else {
    fck = CONCRETE_FCK[typeVal] || 32;
  }

  const sClass      = parseFloat(document.getElementById('cementClass').value);
  const thicknessM  = parseFloat(document.getElementById('pourThickness').value) / 1000;
  const formwork    = parseFloat(document.getElementById('formworkType').value);
  const cementContent = parseFloat(document.getElementById('cementContent').value) || 350;
  const maxDaysToPlot = parseInt(document.getElementById('analysisPeriod').value) || 56;

  const statusWrap  = document.getElementById('statusMsg');
  const weatherStatus = document.getElementById('weatherStatus');

  if (!pourDateStr) {
    statusWrap.textContent = 'Please provide a Pour Date.';
    statusWrap.className = 'status-msg error';
    return;
  }

  const pourDateTime = new Date(`${pourDateStr}T${pourTimeStr}`);

  // ── Determine location mode ──────────────────────────────────────────────
  const isManual = document.querySelector('.loc-mode-btn.active')?.dataset.mode === 'manual';

  if (isManual) {
    // Manual temperature mode: build synthetic constant-temperature dataset
    const manualTemp = parseFloat(document.getElementById('manualTemp').value);
    if (isNaN(manualTemp) || manualTemp < -20 || manualTemp > 60) {
      statusWrap.textContent = 'Please enter a valid ambient temperature (−20 to 60 °C).';
      statusWrap.className = 'status-msg error';
      return;
    }
    statusWrap.className = 'status-msg';
    statusWrap.textContent = '';

    // Synthesise hourly array starting at pour time
    const totalHours = maxDaysToPlot * 24 + 48;
    const syntheticTimes = [];
    const syntheticTemps = [];
    for (let h = 0; h < totalHours; h++) {
      const t = new Date(pourDateTime.getTime() + h * 3_600_000);
      syntheticTimes.push(t.toISOString().slice(0, 16));
      syntheticTemps.push(manualTemp);
    }
    processMaturity(
      { hourly: { time: syntheticTimes, temperature_2m: syntheticTemps } },
      pourDateTime, fck, sClass, thicknessM, formwork, cementContent, maxDaysToPlot,
      `Constant ${manualTemp}°C (manual)`
    );
    return;
  }

  // ── Weather API mode ─────────────────────────────────────────────────────
  const lat = document.getElementById('lat').value;
  const lon = document.getElementById('lon').value;
  if (!lat || !lon) {
    statusWrap.textContent = 'Please provide Latitude & Longitude, or switch to Manual Temperature mode.';
    statusWrap.className = 'status-msg error';
    return;
  }

  statusWrap.className = 'status-msg';
  statusWrap.textContent = '';
  weatherStatus.classList.add('active');

  const now = new Date();
  const pastDays = 90;
  const forecastDays = 14;
  const peakAhead = (pourDateTime - now) / (1000 * 60 * 60 * 24);

  const apiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&past_days=${pastDays}&forecast_days=${forecastDays}&hourly=temperature_2m&timezone=auto`;

  try {
    const res = await fetch(apiUrl);
    if (!res.ok) throw new Error('Failed to fetch weather data');
    const data = await res.json();
    weatherStatus.classList.remove('active');

    if (peakAhead > forecastDays) {
      statusWrap.textContent = 'Note: Pour date is more than 14 days ahead — temperatures beyond the forecast window use a 15°C fallback.';
      statusWrap.className = 'status-msg';
    }
    processMaturity(data, pourDateTime, fck, sClass, thicknessM, formwork, cementContent, maxDaysToPlot);
  } catch (err) {
    weatherStatus.classList.remove('active');
    statusWrap.textContent = `API Error: ${err.message}`;
    statusWrap.className = 'status-msg error';
    console.error(err);
  }
}

// ─── Maturity processing ───────────────────────────────────────────────────
function processMaturity(weatherData, pourStart, fck, sClass, thicknessM, formwork, cementContent, maxDaysToPlot, tempLabel) {
  const hourlyTime = weatherData.hourly.time;
  const hourlyTemp = weatherData.hourly.temperature_2m;

  // Actual Tests
  const actuals = [];
  document.querySelectorAll('.crush-row:not(.milestone-row)').forEach(row => {
    const d = parseFloat(row.querySelector('.crush-day').value);
    const s = parseFloat(row.querySelector('.crush-str').value);
    if (!isNaN(d) && !isNaN(s)) actuals.push({ x: d, y: s });
  });

  // User milestones
  const milestones = [];
  document.querySelectorAll('.milestone-row').forEach(row => {
    const mStr = parseFloat(row.querySelector('.mile-str').value);
    if (!isNaN(mStr)) milestones.push({ target: mStr, achievedDays: null });
  });

  // E5: Auto-add formwork strike milestone at 70% fck,28 (f_cm basis)
  const fCm28 = fck + 8; // EC2 Table 3.1: f_cm = fck + 8 MPa
  const strikeTarget = 0.70 * fCm28;
  const strikeMilestone = { target: strikeTarget, achievedDays: null, isStrike: true };
  milestones.push(strikeMilestone);

  const timeStepDays = 1 / 24; // 1 hour

  // FIX Error 5: properly find pour start; abort with user error if not found
  let startIndex = hourlyTime.findIndex(t => new Date(t) >= pourStart);
  if (startIndex === -1) {
    const statusWrap = document.getElementById('statusMsg');
    statusWrap.textContent = 'Error: Pour date/time is outside the available weather data range. Try a date within the past 90 days or within 14 days ahead.';
    statusWrap.className = 'status-msg error';
    document.getElementById('weatherStatus').classList.remove('active');
    return;
  }
  if (startIndex >= hourlyTime.length) {
    startIndex = hourlyTime.length - 1;
  }

  // ── Data arrays — all use {x, y} so the linear x-axis can render them ──
  const expectedData    = []; // {x: days, y: MPa}
  const baselineData    = []; // {x: days, y: MPa}
  const tempCoreData    = []; // {x: days, y: °C}
  const tempAmbientData = []; // {x: days, y: °C}
  const matEqData       = []; // {x: days, y: eq-days}
  const matActData      = []; // {x: days, y: days}

  let currentEqAge = 0;
  let currentActualAge = 0;
  let current28StrEquiv = null;
  let targetAchievedDays = null;

  // E1: peakHour varies with cement class
  const peakHour = getPeakHydrationHour(sClass);

  // E1: CIRIA C660 heat model — ΔT_peak from cement content, thickness, formwork
  // Basis: Q_total = cementContent × H_OPC (≈400 J/g) / (ρ_conc × c_p) × insulation factor / path-length factor
  // Simplified to a scalar validated against CIRIA C660 Table 4.1 nominal values.
  const maxDeltaT = Math.min((cementContent * 0.40 * thicknessM * formwork) / 3.0, 60);

  // E2 & E3: tracking
  let peakDeltaT = 0;
  let minAmbient =  Infinity;
  let maxAmbient = -Infinity;

  // ── Strength development function (EC2 §3.1.2 / ASTM C1074) ──────────────
  // β_cc(t) = exp(s × (1 − √(28/t_e)))   [EC2 Eq. 3.2]
  // f_cm(t) = β_cc(t) × f_cm,28          [EC2 Eq. 3.1]
  // f_cm,28 = fck + 8 MPa                [EC2 Table 3.1]
  // Verified: at t_e = 28d → β_cc = 1.0 → f_cm(28) = fck + 8 ✓
  //           at t_e = 7d, s=0.25 → β_cc ≈ 0.78 ✓
  const Ea_R  = 5000;    // K  (Ea ≈ 40 kJ/mol OPC — ASTM C1074 / RILEM TC 119)
  const T_ref = 293.15;  // K  (20°C reference temperature)
  const calcStr = (eqA) => {
    if (eqA < 0.5) return 0;
    const b_cc = Math.exp(sClass * (1 - Math.sqrt(28 / eqA)));
    return Math.max(0, b_cc * fCm28);
  };

  let sampleOffset = 0;

  for (let i = startIndex; i < hourlyTime.length; i++) {
    let tAmbient = hourlyTemp[i];
    if (tAmbient === null || tAmbient === undefined) tAmbient = 15.0;

    if (tAmbient < minAmbient) minAmbient = tAmbient;
    if (tAmbient > maxAmbient) maxAmbient = tAmbient;

    // E1: bell-curve hydration heat model
    const hoursSincePour = currentActualAge * 24;
    const heatGain = maxDeltaT * (hoursSincePour / peakHour) * Math.exp(1 - hoursSincePour / peakHour);
    const tCore   = tAmbient + heatGain;
    const deltaT  = tCore - tAmbient;
    if (deltaT > peakDeltaT) peakDeltaT = deltaT;

    // ASTM C1074 Arrhenius equivalent age increment
    // Verified: at 20°C → exp(5000 × 0) = 1.0 → te = actual age ✓
    //           at 10°C → multiplier ≈ 0.55 (curing slows) ✓
    //           at 30°C → multiplier ≈ 1.77 (curing accelerates) ✓
    const eqAgeDelta = timeStepDays * Math.exp(Ea_R * (1 / T_ref - 1 / (273.15 + tCore)));
    currentEqAge     += eqAgeDelta;
    currentActualAge += timeStepDays;

    if (currentActualAge > maxDaysToPlot) break;

    const eqStrength   = calcStr(currentEqAge);
    const baseStrength = calcStr(currentActualAge); // equivalent to 20°C curing

    milestones.forEach(m => {
      if (eqStrength >= m.target && m.achievedDays === null) m.achievedDays = currentActualAge;
    });

    if (currentActualAge >= 28  && current28StrEquiv  === null) current28StrEquiv  = eqStrength;
    if (eqStrength       >= fCm28 && targetAchievedDays === null) targetAchievedDays = currentActualAge;

    // Sample every 6 hours (offset-relative) — push {x,y} for linear axis
    if (sampleOffset % 6 === 0) {
      const x = parseFloat(currentActualAge.toFixed(3));
      expectedData.push(   { x, y: eqStrength });
      baselineData.push(   { x, y: baseStrength });
      tempAmbientData.push({ x, y: tAmbient });
      tempCoreData.push(   { x, y: tCore });
      matEqData.push(      { x, y: currentEqAge });
      matActData.push(     { x, y: currentActualAge });
    }
    sampleOffset++;
  }

  // ── Update charts — no labels array needed; linear axis uses {x,y} directly ──
  myChart.data.datasets[0].data = expectedData;
  myChart.data.datasets[1].data = baselineData;
  myChart.data.datasets[2].data = actuals;   // scatter {x: day, y: MPa}
  // Update the label to name the temperature source
  myChart.data.datasets[0].label = tempLabel
    ? `Expected Strength (${tempLabel})`
    : 'Expected Strength (Temp-Adjusted)';
  myChart.update();

  tempChart.data.datasets[0].data = tempCoreData;
  tempChart.data.datasets[1].data = tempAmbientData;
  tempChart.update();

  maturityChart.data.datasets[0].data = matEqData;
  maturityChart.data.datasets[1].data = matActData;
  maturityChart.update();

  // ── Show results ──────────────────────────────────────────────────────────
  document.getElementById('extraChartsCard').style.display = 'block';
  const resCard = document.getElementById('resultsCard');
  const statsGrid = document.getElementById('statsGrid');
  resCard.style.display = 'block';

  // E4: BS EN 206 Conformity Check
  const en206Result = checkConformityBSEN206(actuals, fck);

  // E2: Thermal Crack Risk
  const crackRisk = getThermalCrackRisk(peakDeltaT);

  // E3: Weather Warnings
  const weatherWarnings = getWeatherWarnings(minAmbient, maxAmbient);

  // Milestone HTML (including formwork strike)
  let milestoneHTML = '';
  milestones.forEach(m => {
    const dayStr = m.achievedDays ? m.achievedDays.toFixed(1) + 'd' : `>${maxDaysToPlot}d`;
    const label = m.isStrike
      ? `Formwork Strike (≥${strikeTarget.toFixed(0)} N/mm²)`
      : `${m.target} N/mm² Milestone`;
    const accentStyle = m.isStrike ? 'color:#f0ad4e' : 'color:var(--accent)';
    milestoneHTML += `<div class="stat"><div class="stat-val" style="${accentStyle}">${dayStr}</div><div class="stat-lbl">${label}</div></div>`;
  });

  // Helper: shared badge wrapper — text-align:left overrides .stat{text-align:center}
  const badge = (color, title, body) => `
    <div class="stat" style="grid-column:1/-1;text-align:left;">
      <div style="display:flex;align-items:flex-start;gap:12px;background:var(--surface2);border-radius:8px;padding:12px 16px;border:1px solid ${color}33;">
        <div style="width:10px;height:10px;border-radius:50%;background:${color};flex-shrink:0;margin-top:3px;box-shadow:0 0 8px ${color}88;"></div>
        <div style="min-width:0;">
          <div style="font-weight:600;font-size:13px;color:${color};">${title}</div>
          <div style="font-size:11px;color:var(--text3);margin-top:3px;line-height:1.5;">${body}</div>
        </div>
      </div>
    </div>`;

  const crackBadge = badge(
    crackRisk.color,
    crackRisk.label,
    `${crackRisk.desc} Peak ΔT = ${peakDeltaT.toFixed(1)}°C (core vs ambient). ${crackRisk.action}`
  );

  const en206Badge = en206Result ? badge(
    en206Result.color,
    `BS EN 206: ${en206Result.verdict}`,
    en206Result.detail
  ) : '';

  const weatherBadge = weatherWarnings.map(w => badge(w.color, 'Weather Notice', w.msg)).join('');

  const fckStr = `f<sub>ck</sub> = ${fck} N/mm²`;
  const fCmStr = `f<sub>cm,28</sub> = ${fCm28} N/mm²`;

  statsGrid.innerHTML = `
    <div class="stat"><div class="stat-val">${currentEqAge.toFixed(1)}d</div><div class="stat-lbl">Final Equiv. Age (ASTM C1074)</div></div>
    <div class="stat"><div class="stat-val">${targetAchievedDays ? targetAchievedDays.toFixed(1) + 'd' : `>${maxDaysToPlot}d`}</div><div class="stat-lbl">Days to ${fCmStr}</div></div>
    <div class="stat"><div class="stat-val">${current28StrEquiv ? current28StrEquiv.toFixed(1) : '–'}</div><div class="stat-lbl">Predicted f<sub>cm</sub>(28) N/mm²</div></div>
    ${milestoneHTML}
    ${crackBadge}
    ${en206Badge}
    ${weatherBadge}
  `;
}

// ─── E4: BS EN 206 Conformity Check ──────────────────────────────────────
function checkConformityBSEN206(actuals, fck) {
  // Requires at least one result to run
  if (!actuals || actuals.length === 0) return null;

  // Filter to results at or near 28 days (±5 days tolerance)
  const results28 = actuals.filter(a => a.x >= 23 && a.x <= 33).map(a => a.y);

  if (results28.length === 0) {
    return {
      verdict: 'AWAITING 28d DATA',
      detail: 'No 28-day cube results entered. Add results at day 23–33 for conformity check.',
      color: '#f0ad4e'
    };
  }

  // BS EN 206 Criterion 1: mean – 4 ≥ fck  (for n < 15 results, use mean only)
  const mean28 = results28.reduce((a, b) => a + b, 0) / results28.length;
  const minResult = Math.min(...results28);

  // Criterion 1: mean ≥ fck + 4 (for small batches per BS EN 206:2013 Table 14)
  const passes_c1 = mean28 >= fck + 4;
  // Criterion 2: every individual result ≥ fck – 4
  const passes_c2 = minResult >= fck - 4;

  const allPass = passes_c1 && passes_c2;
  return {
    verdict: allPass ? 'CONFORMING ✓' : 'NON-CONFORMING ✗',
    detail: allPass
      ? `Mean (n=${results28.length}): ${mean28.toFixed(1)} N/mm² ≥ f<sub>ck</sub> + 4 = ${(fck + 4).toFixed(0)}. Min individual: ${minResult.toFixed(1)} N/mm² ≥ f<sub>ck</sub> − 4 = ${(fck - 4).toFixed(0)}. Batch conforms to BS EN 206 Criterion A.`
      : `${!passes_c1 ? `Mean ${mean28.toFixed(1)} < ${(fck + 4).toFixed(0)} N/mm² (f<sub>ck</sub>+4). ` : ''}${!passes_c2 ? `Minimum result ${minResult.toFixed(1)} < ${(fck - 4).toFixed(0)} N/mm² (f<sub>ck</sub>−4). ` : ''}Non-conformance — investigation required per BS EN 206:2013 Cl. 8.3.`,
    color: allPass ? '#5cb85c' : '#d9534f'
  };
}

// ─── E2: Thermal Crack Risk ────────────────────────────────────────────────
function getThermalCrackRisk(peakDeltaT) {
  // CIRIA C660: ΔT core–surface limit ≤ 20°C for conventional concrete
  if (peakDeltaT < 15) {
    return { label: 'THERMAL CRACK RISK: LOW', color: '#5cb85c', desc: 'ΔT within acceptable limits (CIRIA C660).', action: 'Standard curing precautions apply.' };
  } else if (peakDeltaT < 20) {
    return { label: 'THERMAL CRACK RISK: MEDIUM', color: '#f0ad4e', desc: 'Approaching CIRIA C660 ΔT ≤ 20°C limit.', action: 'Monitor core temperature; consider insulated curing blankets.' };
  } else {
    return { label: 'THERMAL CRACK RISK: HIGH', color: '#d9534f', desc: 'Exceeds CIRIA C660 maximum ΔT of 20°C.', action: 'Thermal cracking likely — review pour size, cement content, or specify low-heat cement (GGBS/PFA blend).' };
  }
}

// ─── E3: Cold / Hot Weather Warnings ─────────────────────────────────────
function getWeatherWarnings(minAmbient, maxAmbient) {
  const warnings = [];
  // BS 8500-2 Cl 11.5 / CIRIA R135: below 5°C hydration effectively ceases
  if (minAmbient < 5) {
    warnings.push({
      msg: `⚠ Cold Weather Concreting: Ambient dropped to ${minAmbient.toFixed(1)}°C during the analysis period. Below 5°C hydration effectively ceases (BS 8500-2 Cl 11.5). Insulated formwork, heated curing, or anti-freeze admixtures are required.`,
      color: '#5bc0de'
    });
  }
  // Hot weather: > 30°C — plastic shrinkage / rapid moisture loss risk
  if (maxAmbient > 30) {
    warnings.push({
      msg: `⚠ Hot Weather Concreting: Ambient reached ${maxAmbient.toFixed(1)}°C. Above 30°C, rapid moisture loss increases plastic shrinkage cracking risk. Use sunshading, mist spraying, or cool mixing water (BS 8500 / ACI 305R).`,
      color: '#f0ad4e'
    });
  }
  return warnings;
}

// ─────────────────────────────────────────────────────────────────────────────
// LOCAL STORAGE — Pour History
// ─────────────────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'concretePours_v1';

function getPours() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function savePours(pours) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(pours));
}

/** Collect current form state into a plain object */
function getCurrentPourData() {
  const typeVal = document.getElementById('concreteType').value;
  const fck = typeVal === 'custom'
    ? parseFloat(document.getElementById('fck').value)
    : (CONCRETE_FCK[typeVal] || 32);

  const crushedTests = [];
  document.querySelectorAll('.crush-row:not(.milestone-row)').forEach(row => {
    const d = parseFloat(row.querySelector('.crush-day').value);
    const s = parseFloat(row.querySelector('.crush-str').value);
    if (!isNaN(d) && !isNaN(s)) crushedTests.push({ day: d, str: s });
  });

  const milestones = [];
  document.querySelectorAll('.milestone-row').forEach(row => {
    const v = parseFloat(row.querySelector('.mile-str').value);
    if (!isNaN(v)) milestones.push(v);
  });

  return {
    concreteType: typeVal,
    fck,
    cementClass: document.getElementById('cementClass').value,
    pourDate: document.getElementById('pourDate').value,
    pourTime: document.getElementById('pourTime').value,
    pourThickness: document.getElementById('pourThickness').value,
    formworkType: document.getElementById('formworkType').value,
    cementContent: document.getElementById('cementContent').value,
    analysisPeriod: document.getElementById('analysisPeriod').value,
    humidity: document.getElementById('humidityInput').value,
    lat: document.getElementById('lat').value,
    lon: document.getElementById('lon').value,
    crushedTests,
    milestones,
  };
}

/** Restore form from a saved pour object */
function restorePourData(pour) {
  const setVal = (id, val) => { const el = document.getElementById(id); if (el && val != null) el.value = val; };
  setVal('concreteType', pour.concreteType);
  toggleCustomFck();
  if (pour.concreteType === 'custom') setVal('fck', pour.fck);
  setVal('cementClass', pour.cementClass);
  setVal('pourDate', pour.pourDate);
  setVal('pourTime', pour.pourTime);
  setVal('pourThickness', pour.pourThickness);
  setVal('formworkType', pour.formworkType);
  setVal('cementContent', pour.cementContent);
  setVal('analysisPeriod', pour.analysisPeriod);
  setVal('humidityInput', pour.humidity);
  setVal('lat', pour.lat);
  setVal('lon', pour.lon);

  // Rebuild crush rows
  const crushList = document.getElementById('crushList');
  crushList.querySelectorAll('.crush-row').forEach(r => r.remove());
  (pour.crushedTests || []).forEach(t => {
    const row = document.createElement('div');
    row.className = 'crush-row';
    row.innerHTML = `
      <input type="number" class="crush-day" value="${t.day}" min="1">
      <input type="number" class="crush-str" value="${t.str}" min="0">
      <button class="remove-btn" onclick="this.parentElement.remove()" title="Remove">✕</button>`;
    crushList.appendChild(row);
  });

  // Rebuild milestone rows
  const milestoneList = document.getElementById('milestoneList');
  milestoneList.querySelectorAll('.milestone-row').forEach(r => r.remove());
  (pour.milestones || []).forEach(v => {
    const row = document.createElement('div');
    row.className = 'crush-row milestone-row';
    row.innerHTML = `
      <input type="number" class="mile-str" value="${v}" min="1">
      <button class="remove-btn" onclick="this.parentElement.remove()" title="Remove">✕</button>`;
    milestoneList.appendChild(row);
  });

  if (pour.lat && pour.lon) {
    document.getElementById('locDisplay').textContent = `Loaded: ${pour.lat}, ${pour.lon}`;
  }
}

function savePour() {
  const labelRaw = prompt('Label this pour (optional):', 'Slab Pour – ' + new Date().toLocaleDateString('en-GB'));
  if (labelRaw === null) return; // cancelled

  const data = getCurrentPourData();
  const pour = {
    id: Date.now().toString(),
    savedAt: new Date().toISOString(),
    label: labelRaw.trim() || ('Pour ' + new Date().toLocaleDateString('en-GB')),
    ...data,
  };

  const pours = getPours();
  pours.unshift(pour); // newest first
  savePours(pours);
  renderPourHistory();
  showToast('💾', '#3a7d55', 'Pour Saved', pour.label, 2500);
}

function loadPour(id) {
  const pours = getPours();
  const pour = pours.find(p => p.id === id);
  if (!pour) return;
  restorePourData(pour);
  showToast('📂', '#c9622f', 'Pour Loaded', pour.label, 2500);
  // Auto-calculate if location is set
  if (pour.lat && pour.lon) {
    calculateStrength();
  }
  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function deletePour(id) {
  if (!confirm('Delete this saved pour?')) return;
  const pours = getPours().filter(p => p.id !== id);
  savePours(pours);
  renderPourHistory();
  showToast('🗑', '#d9534f', 'Pour Deleted', '', 2000);
}

function renderPourHistory() {
  const container = document.getElementById('pourHistoryList');
  const emptyMsg = document.getElementById('pourHistoryEmpty');
  const countEl = document.getElementById('historyCount');
  if (!container) return;

  const pours = getPours();

  // Update the count badge in the collapsible header
  if (countEl) countEl.textContent = pours.length > 0 ? `${pours.length} saved` : '';

  if (pours.length === 0) {
    // Put the empty message back inside the grid
    container.innerHTML = '';
    if (emptyMsg) {
      emptyMsg.style.display = 'block';
      container.appendChild(emptyMsg);
    }
    return;
  }

  // Hide empty message and render cards
  if (emptyMsg) emptyMsg.style.display = 'none';
  container.innerHTML = pours.map(p => {
    const savedDate = new Date(p.savedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    const fckDisplay = p.fck ? `f<sub>ck</sub> ${p.fck} MPa` : '';
    const locDisplay = (p.lat && p.lon) ? `${parseFloat(p.lat).toFixed(2)}°, ${parseFloat(p.lon).toFixed(2)}°` : 'No location';
    const typeLabel = p.concreteType === 'custom' ? 'Custom' : p.concreteType;

    return `
      <div class="history-item" id="history-${p.id}">
        <div class="history-info">
          <div class="history-label">${escapeHtml(p.label)}</div>
          <div class="history-meta">${savedDate} · ${typeLabel} · ${fckDisplay} · ${locDisplay}</div>
        </div>
        <div class="history-actions">
          <button class="hist-btn hist-load" onclick="loadPour('${p.id}')" title="Load pour">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.5"/></svg>
            Load
          </button>
          <button class="hist-btn hist-delete" onclick="deletePour('${p.id}')" title="Delete pour">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
          </button>
        </div>
      </div>`;
  }).join('');
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.appendChild(document.createTextNode(str));
  return d.innerHTML;
}
