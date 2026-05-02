// ── Badge: 3x click → hint modal ──
let badgeClicks = 0, badgeTimer;
function badgeClick() {
  badgeClicks++;
  clearTimeout(badgeTimer);
  badgeTimer = setTimeout(function () { badgeClicks = 0; }, 900);
  if (badgeClicks >= 3) { badgeClicks = 0; showHintModal(); }
}

function showHintModal() {
  const overlay = document.createElement('div');
  overlay.className = 'hint-overlay';
  overlay.innerHTML = `
    <div class="hint-box" onclick="event.stopPropagation()">
      <div class="hint-eyebrow">classified · site eyes only</div>
      <div class="hint-title">Easter Eggs</div>
      <div class="hint-list">
        <div class="hint-item">
          <span class="hint-key">triple-click the eyebrow</span>
          <span class="hint-desc">GPS signal lost. Coordinates drift and corrupt on screen before snapping back.</span>
        </div>
        <div class="hint-item">
          <span class="hint-key">type "oops"</span>
          <span class="hint-desc">Files a fake H&amp;S near-miss incident report, complete with reference number and a deadpan description of events.</span>
        </div>
        <div class="hint-item">
          <span class="hint-key">export 3 times</span>
          <span class="hint-desc">On the third export, a critical warning asks whether you have actually checked your coordinate system.</span>
        </div>
      </div>
      <div class="hint-footer">[ click anywhere to close ]</div>
    </div>
  `;
  overlay.addEventListener('click', function () { overlay.remove(); });
  document.body.appendChild(overlay);
}

let rawText = '', parsedRows = [], fileName = '';

// ── File input ──
document.getElementById('fileInput').addEventListener('change', function (e) {
  if (e.target.files[0]) loadFile(e.target.files[0]);
});

// ── Drag & drop ──
const zone = document.getElementById('dropZone');
zone.addEventListener('dragover',  function (e) { e.preventDefault(); zone.classList.add('dragover'); });
zone.addEventListener('dragleave', function (e) { if (!zone.contains(e.relatedTarget)) zone.classList.remove('dragover'); });
zone.addEventListener('drop', function (e) {
  e.preventDefault(); zone.classList.remove('dragover');
  if (e.dataTransfer.files[0]) loadFile(e.dataTransfer.files[0]);
});

// ── Paste from Excel ──
document.addEventListener('paste', function (e) {
  const tag = document.activeElement.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA') return;
  const text = e.clipboardData.getData('text/plain');
  if (!text || !text.trim()) return;
  e.preventDefault();
  if (rawText) { showReplaceModal(text); }
  else { loadPastedData(text); }
});

function showReplaceModal(pendingText) {
  const overlay = document.createElement('div');
  overlay.className = 'replace-overlay';
  overlay.innerHTML = `
    <div class="replace-box" onclick="event.stopPropagation()">
      <div class="replace-title">Replace loaded data?</div>
      <div class="replace-sub">You already have a file loaded. Do you want to replace it with the pasted data?</div>
      <div class="replace-btns">
        <button class="replace-btn-yes" id="replaceYes">Replace</button>
        <button class="replace-btn-no"  id="replaceNo">Keep file</button>
      </div>
    </div>
  `;
  overlay.addEventListener('click', function () { overlay.remove(); });
  document.body.appendChild(overlay);
  document.getElementById('replaceYes').onclick = function () { overlay.remove(); loadPastedData(pendingText); };
  document.getElementById('replaceNo').onclick  = function () { overlay.remove(); };
}

function detectHeaders(firstRow) {
  const xKeys = ['easting','east','e','x','grid_e','x(m)','e(m)'];
  const yKeys = ['northing','north','n','y','grid_n','y(m)','n(m)'];
  const zKeys = ['height','elevation','elev','h','z','rl','level','z(m)','h(m)'];
  const headers = firstRow.map(function (h) { return h.toLowerCase().trim(); });
  const xi = headers.findIndex(function (h) { return xKeys.includes(h); });
  const yi = headers.findIndex(function (h) { return yKeys.includes(h); });
  const zi = headers.findIndex(function (h) { return zKeys.includes(h); });
  if (xi === -1 || yi === -1 || zi === -1) return null;
  return { colX: xi + 1, colY: yi + 1, colZ: zi + 1 };
}

function loadPastedData(text) {
  const isTabSep = text.includes('\t');
  const lines = text.trim().split('\n').filter(function (l) { return l.trim(); });
  if (!lines.length) return;
  const converted = isTabSep
    ? lines.map(function (l) { return l.split('\t').map(function (c) { return c.trim(); }).join(','); }).join('\n')
    : text.trim();
  const firstRow = isTabSep
    ? lines[0].split('\t').map(function (c) { return c.trim(); })
    : lines[0].split(',').map(function (c) { return c.trim(); });
  const firstRowIsNumeric = firstRow.slice(1, 4).every(function (v) { return !isNaN(parseFloat(v)); });
  let detected = null, bannerMsg = '';
  if (!firstRowIsNumeric) {
    detected = detectHeaders(firstRow);
    if (detected) {
      document.getElementById('headerRows').value = 1;
      document.getElementById('colX').value = detected.colX;
      document.getElementById('colY').value = detected.colY;
      document.getElementById('colZ').value = detected.colZ;
      bannerMsg = 'Headers detected — X=col ' + detected.colX + ', Y=col ' + detected.colY + ', Z=col ' + detected.colZ + '. Please verify before exporting.';
    } else {
      document.getElementById('headerRows').value = 1;
      document.getElementById('colX').value = 1;
      document.getElementById('colY').value = 2;
      document.getElementById('colZ').value = 3;
      bannerMsg = 'Headers found but column names weren\'t recognised. Defaulted to columns 1, 2, 3 with 1 header row skipped. Please check the mapping before exporting.';
    }
  } else {
    document.getElementById('headerRows').value = 0;
    document.getElementById('colX').value = 2;
    document.getElementById('colY').value = 3;
    document.getElementById('colZ').value = 4;
    bannerMsg = 'No headers detected — defaulted to columns 2, 3, 4. Please verify the column mapping matches your data before exporting.';
  }
  fileName = 'pasted-data.csv';
  rawText = converted;
  renderDropLoadedPaste(lines.length);
  renderPreview(rawText);
  parseAndStats();
  showPasteBanner(bannerMsg);
}

function renderDropLoadedPaste(lineCount) {
  zone.classList.add('has-file');
  document.getElementById('dropIconSvg').innerHTML = `
    <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.5" fill="none"/>
    <polyline class="check-path" points="8 12 11 15 16 9" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  `;
  const fn = document.getElementById('dropFilename');
  fn.textContent = 'Pasted data — ' + lineCount + ' rows';
  fn.style.display = 'block';
  document.getElementById('dropLabel').textContent = 'Pasted from clipboard — click to replace';
  document.getElementById('dropSub').style.display = 'none';
}

function showPasteBanner(msg) {
  document.getElementById('pasteBanner') && document.getElementById('pasteBanner').remove();
  const banner = document.createElement('div');
  banner.id = 'pasteBanner';
  banner.className = 'paste-banner';
  banner.innerHTML = `
    <div class="paste-banner-icon">⚠</div>
    <div class="paste-banner-body">
      <div class="paste-banner-title">Check your column mapping</div>
      <div class="paste-banner-sub">${msg}</div>
    </div>
    <button class="paste-banner-close" onclick="document.getElementById('pasteBanner').remove()">×</button>
  `;
  const actionsDiv = document.querySelector('.action-row').parentElement;
  actionsDiv.insertBefore(banner, actionsDiv.firstChild);
}

function loadFile(file) {
  fileName = file.name;
  document.getElementById('outputScroll').innerHTML = '<span class="out-dim">// parsing…</span>';
  showSkeleton();
  const r = new FileReader();
  r.onload = function (evt) {
    rawText = evt.target.result;
    renderDropLoaded(file);
    renderPreview(rawText);
    parseAndStats();
  };
  r.readAsText(file);
}

function showSkeleton() {
  const ps = document.getElementById('previewScroll');
  let html = '';
  [80,60,90,45,75,55,85,65,70,50].forEach(function (w) {
    html += '<div class="skeleton-line" style="width:' + w + '%"></div>';
  });
  ps.innerHTML = html;
  const bar = document.getElementById('parseBar');
  const wrap = document.getElementById('parseBarWrap');
  wrap.classList.add('visible');
  bar.style.width = '0%';
  setTimeout(function () { bar.style.width = '60%'; }, 50);
}

function renderDropLoaded(file) {
  zone.classList.add('has-file');
  document.getElementById('dropIconSvg').innerHTML = `
    <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.5" fill="none"/>
    <polyline class="check-path" points="8 12 11 15 16 9" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  `;
  const fn = document.getElementById('dropFilename');
  fn.textContent = file.name;
  fn.style.display = 'block';
  document.getElementById('dropLabel').textContent = 'File loaded — click to replace';
  document.getElementById('dropSub').style.display = 'none';
}

function renderPreview(text) {
  const bar = document.getElementById('parseBar');
  bar.style.width = '100%';
  setTimeout(function () {
    document.getElementById('parseBarWrap').classList.remove('visible');
    bar.style.width = '0%';
  }, 500);
  const lines = text.split('\n');
  let html = '';
  lines.forEach(function (l, i) {
    const delay = Math.min(i * 8, 300);
    html += '<span class="preview-line" style="animation-delay:' + delay + 'ms;display:block">' +
            '<span style="color:var(--text3);user-select:none;margin-right:14px">' + String(i + 1).padStart(4) + '</span>' +
            esc(l) + '</span>';
  });
  const previewEl = document.getElementById('previewScroll');
  previewEl.classList.remove('is-empty');
  previewEl.innerHTML = html;
  const meta = document.getElementById('previewMeta');
  meta.textContent = lines.length + ' lines';
  meta.classList.add('updated');
  setTimeout(function () { meta.classList.remove('updated'); }, 400);
}

function parseAndStats() {
  const skip = parseInt(document.getElementById('headerRows').value) || 0;
  const cx   = (parseInt(document.getElementById('colX').value) || 1) - 1;
  const cy   = (parseInt(document.getElementById('colY').value) || 1) - 1;
  const cz   = (parseInt(document.getElementById('colZ').value) || 1) - 1;
  const lines = rawText.split('\n');
  const dataLines = lines.slice(skip);
  parsedRows = [];
  let skipped = 0;
  dataLines.forEach(function (line) {
    if (!line.trim()) return;
    const row = parseCSV(line);
    const x = parseFloat(row[cx]), y = parseFloat(row[cy]), z = parseFloat(row[cz]);
    if (isNaN(x) || isNaN(y) || isNaN(z)) { skipped++; return; }
    parsedRows.push({ name: row[0] || '', x: x, y: y, z: z });
  });
  const pts = parsedRows.length;
  animateCount('statPoints',  pts,              pts > 0);
  animateCount('statSkipped', skipped,          pts > 0);
  animateCount('statRows',    dataLines.length, pts > 0);
  renderOutputPreview();
  const ok = pts > 0;
  document.getElementById('btnSingle').disabled = !ok;
  document.getElementById('btnMulti').disabled  = !ok;
  setStatus(ok
    ? '✓ ' + pts + ' valid point' + (pts !== 1 ? 's' : '') + ' ready to export'
    : '⚠ No valid points found — check column mapping',
    ok ? 'ok' : 'error'
  );
}

function animateCount(id, target, hasData) {
  const el = document.getElementById(id);
  const start = parseInt(el.textContent) || 0;
  if (isNaN(target)) { el.textContent = '—'; return; }
  el.classList.toggle('has-data', hasData);
  const duration = 600, startTime = performance.now();
  function tick(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(start + (target - start) * eased);
    if (progress < 1) { requestAnimationFrame(tick); }
    else {
      el.textContent = target;
      el.classList.add('pop');
      setTimeout(function () { el.classList.remove('pop'); }, 350);
    }
  }
  requestAnimationFrame(tick);
}

const ACI = [
  { num:1,   hex:'#e05252', name:'Red'     },
  { num:3,   hex:'#4caf72', name:'Green'   },
  { num:4,   hex:'#4ab8c9', name:'Cyan'    },
  { num:5,   hex:'#5b7fc4', name:'Blue'    },
  { num:6,   hex:'#b05ab0', name:'Magenta' },
  { num:30,  hex:'#e07c30', name:'Orange'  },
  { num:2,   hex:'#d4b800', name:'Yellow'  },
  { num:140, hex:'#8bc34a', name:'Lime'    },
  { num:170, hex:'#26a69a', name:'Teal'    },
  { num:200, hex:'#7c4dff', name:'Violet'  },
  { num:220, hex:'#ec407a', name:'Pink'    },
  { num:50,  hex:'#c09a20', name:'Gold'    },
];

function getGroups() {
  const groups = {};
  parsedRows.forEach(function (r) {
    const key = r.name ? r.name.replace(/\d+$/, '').trim() || 'GROUP' : 'GROUP';
    (groups[key] = groups[key] || []).push(r);
  });
  return groups;
}

function renderOutputPreview() {
  if (!parsedRows.length) {
    document.getElementById('outputScroll').innerHTML = '<span class="out-dim">// no valid points — check column mapping</span>';
    return;
  }
  const fmt = document.getElementById('outputFormat').value;
  const groups = getGroups();
  const keys = Object.keys(groups);
  const isMultiGroup = keys.length > 1 && fmt === 'scr';
  let html = '', lineIdx = 0;
  const delay = function (i) { return 'animation-delay:' + (i * 16) + 'ms'; };
  if (isMultiGroup) {
    keys.slice(0, 4).forEach(function (key, gi) {
      const color = ACI[gi % ACI.length];
      html += '<span class="out-line out-cmd" style="' + delay(lineIdx++) + '">LAYER N ' + key + ' COLOR ' + color.num + ' ' + key + '</span>';
      html += '<span class="out-line out-dim" style="' + delay(lineIdx++) + '"> </span>';
    });
    if (keys.length > 4) html += '<span class="out-line out-dim" style="' + delay(lineIdx++) + '">… ' + (keys.length - 4) + ' more layers</span>';
    keys.slice(0, 4).forEach(function (key, gi) {
      html += '<span class="out-line out-cmd" style="' + delay(lineIdx++) + '">CLAYER ' + key + '</span>';
      groups[key].slice(0, 3).forEach(function (r) {
        html += '<span class="out-line out-coord" style="' + delay(lineIdx++) + '">_POINT ' + r.x + ',' + r.y + ',' + r.z + '</span>';
      });
      if (groups[key].length > 3) html += '<span class="out-line out-dim" style="' + delay(lineIdx++) + '">  … ' + (groups[key].length - 3) + ' more in ' + key + '</span>';
    });
    html += '<span class="out-line out-cmd" style="' + delay(lineIdx++) + '">CLAYER 0</span>';
    html += '<span class="out-line out-dim" style="' + delay(lineIdx++) + '">PDMODE 3</span>';
    html += '<span class="out-line out-dim" style="' + delay(lineIdx++) + '">PDSIZE 0.25</span>';
    html += '<span class="out-line out-cmd" style="' + delay(lineIdx++) + '">ZOOM E</span>';
  } else if (fmt === 'scr') {
    html += '<span class="out-line out-cmd" style="' + delay(lineIdx++) + '">_MULTIPLE _POINT</span>';
    parsedRows.slice(0, 30).forEach(function (r) {
      html += '<span class="out-line out-coord" style="' + delay(lineIdx++) + '">' + r.x + ',' + r.y + ',' + r.z + '</span>';
    });
    if (parsedRows.length > 30) html += '<span class="out-line out-dim" style="' + delay(lineIdx) + '">… ' + (parsedRows.length - 30) + ' more points</span>';
  } else {
    html += '<span class="out-line out-cmd" style="' + delay(lineIdx++) + '">name,x,y,z</span>';
    parsedRows.slice(0, 30).forEach(function (r) {
      html += '<span class="out-line out-coord" style="' + delay(lineIdx++) + '">' + r.name + ',' + r.x + ',' + r.y + ',' + r.z + '</span>';
    });
    if (parsedRows.length > 30) html += '<span class="out-line out-dim" style="' + delay(lineIdx) + '">… ' + (parsedRows.length - 30) + ' more rows</span>';
  }
  document.getElementById('outputScroll').innerHTML = html;
  const meta = document.getElementById('outputMeta');
  if (isMultiGroup) {
    meta.textContent = keys.length + ' colour groups';
    meta.classList.add('updated'); setTimeout(function () { meta.classList.remove('updated'); }, 400);
  } else {
    meta.textContent = 'first 30 lines';
  }
}

function doConvert(e, mode) {
  if (!parsedRows.length) return;
  addRipple(e);
  const fmt  = document.getElementById('outputFormat').value;
  const ext  = fmt === 'scr' ? '.scr' : '.csv';
  const base = fileName.replace(/\.[^.]+$/, '');
  if (mode === 'single') {
    download(buildSingleContent(parsedRows, fmt), base + ext);
    flashExport();
    setStatus('✓ Saved ' + base + ext, 'ok');
  } else {
    const groups = getGroups();
    const keys = Object.keys(groups);
    if (fmt === 'scr' && keys.length > 1) {
      download(buildColorScript(groups), base + '_coloured.scr');
      flashExport();
      setStatus('✓ Exported ' + keys.length + ' colour groups → ' + base + '_coloured.scr', 'ok');
    } else if (keys.length <= 1) {
      const size = 500; let i = 0, n = 0;
      while (i < parsedRows.length) {
        n++;
        const c = parsedRows.slice(i, i + size);
        (function (ch, nm) { setTimeout(function () { download(buildSingleContent(ch, fmt), nm); }, (n - 1) * 250); })(c, base + '_part' + n + ext);
        i += size;
      }
      flashExport();
      setStatus('✓ Exported ' + n + ' files (' + size + '-point chunks)', 'ok');
    } else {
      keys.forEach(function (k, i) {
        setTimeout(function () { download(buildSingleContent(groups[k], fmt), base + '_' + k + ext); }, i * 200);
      });
      flashExport();
      setStatus('✓ Exported ' + keys.length + ' CSV group files', 'ok');
    }
  }
  maybeWrongCRS();
}

function flashExport() {
  if (!document.getElementById('exportFlashStyle')) {
    const s = document.createElement('style');
    s.id = 'exportFlashStyle';
    s.textContent = `
      @keyframes exportFlash  { 0%{opacity:0} 10%{opacity:1} 100%{opacity:0} }
      @keyframes exportRing   { 0%{opacity:1;transform:scale(0.94)} 100%{opacity:0;transform:scale(1.06)} }
      @keyframes exportRing2  { 0%{opacity:0.6;transform:scale(0.97)} 100%{opacity:0;transform:scale(1.1)} }
      @keyframes toastSlideUp { 0%{opacity:0;transform:translateY(18px) scale(0.95)} 18%{opacity:1;transform:translateY(0) scale(1)} 75%{opacity:1;transform:translateY(0) scale(1)} 100%{opacity:0;transform:translateY(-8px) scale(0.97)} }
      @keyframes arrowBounce  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
      @keyframes checkPop     { 0%{transform:scale(0)} 60%{transform:scale(1.2)} 100%{transform:scale(1)} }
    `;
    document.head.appendChild(s);
  }
  const flash = document.createElement('div');
  flash.style.cssText = 'position:fixed;inset:0;z-index:100;pointer-events:none;background:radial-gradient(ellipse at 50% 50%, transparent 30%, rgba(46,125,85,0.18) 60%, rgba(46,125,85,0.55) 100%);animation:exportFlash 1s ease both;';
  document.body.appendChild(flash);
  setTimeout(function () { flash.remove(); }, 1050);
  const ring = document.createElement('div');
  ring.style.cssText = 'position:fixed;inset:0;z-index:101;pointer-events:none;border:4px solid rgba(46,125,85,0.7);animation:exportRing 0.7s cubic-bezier(0.16,1,0.3,1) both;';
  document.body.appendChild(ring);
  setTimeout(function () { ring.remove(); }, 750);
  const ring2 = document.createElement('div');
  ring2.style.cssText = 'position:fixed;inset:8px;z-index:101;pointer-events:none;border:2px solid rgba(108,196,154,0.5);animation:exportRing2 0.9s cubic-bezier(0.16,1,0.3,1) 0.08s both;';
  document.body.appendChild(ring2);
  setTimeout(function () { ring2.remove(); }, 1050);
  const toast = document.createElement('div');
  toast.style.cssText = 'position:fixed;bottom:36px;left:0;right:0;margin:0 auto;width:fit-content;z-index:300;pointer-events:none;background:#1a2e24;border:1px solid #3a7d55;border-radius:14px;padding:14px 22px;display:flex;align-items:center;justify-content:center;gap:14px;box-shadow:0 8px 32px rgba(0,0,0,0.3),0 0 0 1px rgba(46,125,85,0.2);animation:toastSlideUp 2.8s cubic-bezier(0.16,1,0.3,1) both;white-space:nowrap;';
  toast.innerHTML = `
    <div style="width:28px;height:28px;border-radius:50%;background:#2e7d55;display:flex;align-items:center;justify-content:center;flex-shrink:0;animation:checkPop 0.4s cubic-bezier(0.34,1.56,0.64,1) 0.15s both;opacity:0;animation-fill-mode:both;">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
    </div>
    <div style="display:flex;flex-direction:column;gap:1px;">
      <span style="font-family:'Instrument Sans',sans-serif;font-size:13px;font-weight:600;color:#e8f5ee;">File exported successfully</span>
      <span style="font-family:'Martian Mono',monospace;font-size:10px;color:#6cc49a;letter-spacing:0.05em;">Check your downloads folder</span>
    </div>
    <div style="display:flex;flex-direction:column;align-items:center;gap:3px;margin-left:4px;animation:arrowBounce 0.8s ease-in-out 0.4s infinite;">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4caf72" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>
    </div>
  `;
  document.body.appendChild(toast);
  setTimeout(function () { toast.remove(); }, 3000);
}

function buildSingleContent(rows, fmt) {
  if (fmt === 'scr') return '_MULTIPLE _POINT\n' + rows.map(function (r) { return r.x + ',' + r.y + ',' + r.z; }).join('\n') + '\nZOOM E\n';
  return 'name,x,y,z\n' + rows.map(function (r) { return r.name + ',' + r.x + ',' + r.y + ',' + r.z; }).join('\n');
}

function buildColorScript(groups) {
  const keys = Object.keys(groups);
  let script = '';
  keys.forEach(function (key, idx) {
    const color = ACI[idx % ACI.length];
    script += 'LAYER N ' + key + ' COLOR ' + color.num + ' ' + key + '\n\n';
  });
  keys.forEach(function (key) {
    script += 'CLAYER ' + key + '\n';
    groups[key].forEach(function (r) { script += '_POINT ' + r.x + ',' + r.y + ',' + r.z + '\n'; });
  });
  script += 'CLAYER 0\nPDMODE 3\nPDSIZE 0.25\nZOOM E\n';
  return script;
}

function download(content, filename) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([content], { type: 'text/plain' }));
  a.download = filename; a.click(); URL.revokeObjectURL(a.href);
}

function clearAll() {
  rawText = ''; parsedRows = []; fileName = '';
  zone.classList.remove('has-file');
  document.getElementById('dropFilename').style.display = 'none';
  document.getElementById('dropLabel').textContent = 'Drop your GPS file here';
  document.getElementById('dropSub').textContent   = 'or click to browse — .csv, .txt — or paste from Excel';
  document.getElementById('dropSub').style.display = '';
  document.getElementById('pasteBanner') && document.getElementById('pasteBanner').remove();
  document.getElementById('dropIconSvg').innerHTML = `
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
    <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
  `;
  const ps = document.getElementById('previewScroll');
  ps.classList.add('is-empty');
  ps.innerHTML = `
    <div class="preview-empty">
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/>
      </svg>
      <span>No file loaded yet</span>
    </div>`;
  document.getElementById('previewMeta').textContent  = '—';
  document.getElementById('outputScroll').innerHTML   = '<span class="out-dim">// load a file to preview output…</span>';
  ['statPoints','statSkipped','statRows'].forEach(function (id) {
    const el = document.getElementById(id);
    el.textContent = '—'; el.classList.remove('has-data');
  });
  document.getElementById('btnSingle').disabled = true;
  document.getElementById('btnMulti').disabled  = true;
  document.getElementById('fileInput').value    = '';
  setStatus('', '');
}

function spin(id, d) {
  const el = document.getElementById(id);
  el.value = Math.max(0, (parseInt(el.value) || 0) + d);
  if (rawText) parseAndStats();
}

['headerRows','colX','colY','colZ'].forEach(function (id) {
  document.getElementById(id).addEventListener('change', function () { if (rawText) parseAndStats(); });
});
document.getElementById('outputFormat').addEventListener('change', renderOutputPreview);

function setStatus(msg, type) {
  const el = document.getElementById('statusMsg');
  el.style.animation = 'none';
  void el.offsetHeight;
  el.textContent = msg;
  el.className = 'status-msg ' + type;
}

// ── Easter egg 1: GPS drift (triple-click eyebrow) ──
let eyebrowClicks = 0, eyebrowTimer;
document.querySelector('.header-eyebrow').addEventListener('click', function () {
  eyebrowClicks++;
  clearTimeout(eyebrowTimer);
  eyebrowTimer = setTimeout(function () { eyebrowClicks = 0; }, 900);
  if (eyebrowClicks >= 3) { eyebrowClicks = 0; triggerGpsDrift(); }
});

function triggerGpsDrift() {
  if (!parsedRows.length) {
    showToast('📡', 'var(--accent-bg)', 'No signal', 'Load a file first. The GPS needs something to lose.', 2800);
    return;
  }
  showToast('📡', '#fdf0ef', 'GPS signal lost', 'Multipath error detected. Coordinates drifting…', 3500);
  const preview = document.getElementById('previewScroll');
  const output  = document.getElementById('outputScroll');
  const origPrev = preview.innerHTML;
  const origOut  = output.innerHTML;
  let tick = 0;
  const interval = setInterval(function () {
    tick++;
    preview.querySelectorAll('.preview-line').forEach(function (line) {
      if (Math.random() < 0.3) {
        line.style.color = 'hsl(' + (Math.random() * 30) + ',70%,55%)';
        line.style.transform = 'translateX(' + ((Math.random() - 0.5) * 6) + 'px)';
      }
    });
    output.querySelectorAll('.out-coord').forEach(function (el) {
      if (Math.random() < 0.5) {
        const num = parseFloat(el.textContent);
        if (!isNaN(num)) el.textContent = (num + (Math.random() - 0.5) * 50).toFixed(3);
      }
    });
    if (tick >= 8) {
      clearInterval(interval);
      preview.innerHTML = origPrev;
      output.innerHTML  = origOut;
      preview.querySelectorAll('.preview-line').forEach(function (l) { l.style.color = ''; l.style.transform = ''; });
      showToast('✅', 'var(--green-bg)', 'Signal reacquired', 'Coordinates restored. Probably fine.', 2500);
    }
  }, 280);
}

// ── Easter egg 2: type "oops" → incident report ──
let oopsBuffer = '';
document.addEventListener('keypress', function (e) {
  if (document.activeElement.tagName === 'INPUT') return;
  oopsBuffer += e.key.toLowerCase();
  if (oopsBuffer.length > 6) oopsBuffer = oopsBuffer.slice(-6);
  if (oopsBuffer.endsWith('oops')) { oopsBuffer = ''; triggerIncidentReport(); }
});

function triggerIncidentReport() {
  const existing = document.getElementById('incidentOverlay');
  if (existing) { existing.remove(); return; }
  const d = new Date();
  const dateStr = d.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}).toUpperCase();
  const ref = 'NM-' + Math.floor(1000 + Math.random() * 9000);
  const overlay = document.createElement('div');
  overlay.id = 'incidentOverlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:9500;display:flex;align-items:center;justify-content:center;background:rgba(26,23,20,0.7);backdrop-filter:blur(4px);animation:fadeIn 0.25s ease both;cursor:pointer;';
  overlay.innerHTML = `
    <div onclick="event.stopPropagation()" style="background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:32px 36px;max-width:460px;width:90%;box-shadow:0 24px 60px rgba(0,0,0,0.2);animation:slideUp 0.4s var(--ease-spring) both;cursor:default;position:relative;">
      <div style="font-family:'Martian Mono',monospace;font-size:9px;letter-spacing:0.2em;color:var(--red);text-transform:uppercase;margin-bottom:4px;">⚠ Near-Miss Report · ${ref}</div>
      <div style="font-family:'DM Serif Display',serif;font-size:26px;color:var(--text);margin-bottom:20px;line-height:1.2;">Site Incident<br><em style="color:var(--accent)">Notification</em></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:18px;">
        <div style="background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:10px 12px;"><div style="font-family:'Martian Mono',monospace;font-size:9px;color:var(--text3);letter-spacing:0.12em;text-transform:uppercase;margin-bottom:3px;">Date</div><div style="font-size:12px;font-weight:600;color:var(--text)">${dateStr}</div></div>
        <div style="background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:10px 12px;"><div style="font-family:'Martian Mono',monospace;font-size:9px;color:var(--text3);letter-spacing:0.12em;text-transform:uppercase;margin-bottom:3px;">Location</div><div style="font-size:12px;font-weight:600;color:var(--text)">Converter · Screen</div></div>
        <div style="background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:10px 12px;"><div style="font-family:'Martian Mono',monospace;font-size:9px;color:var(--text3);letter-spacing:0.12em;text-transform:uppercase;margin-bottom:3px;">Category</div><div style="font-size:12px;font-weight:600;color:var(--red)">Coordinate Error</div></div>
        <div style="background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:10px 12px;"><div style="font-family:'Martian Mono',monospace;font-size:9px;color:var(--text3);letter-spacing:0.12em;text-transform:uppercase;margin-bottom:3px;">Severity</div><div style="font-size:12px;font-weight:600;color:var(--amber)">Medium</div></div>
      </div>
      <div style="background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:12px 14px;margin-bottom:18px;">
        <div style="font-family:'Martian Mono',monospace;font-size:9px;color:var(--text3);letter-spacing:0.12em;text-transform:uppercase;margin-bottom:6px;">Description of Event</div>
        <div style="font-size:12.5px;color:var(--text2);line-height:1.6;">Operative typed "oops" into the coordinate converter. Immediate near-miss flagged. No coordinates were harmed. The SCR script has been placed in a safe location pending investigation. A toolbox talk has been scheduled.</div>
      </div>
      <div style="font-family:'Martian Mono',monospace;font-size:9px;color:var(--text3);letter-spacing:0.08em;display:flex;justify-content:space-between;align-items:center;">
        <span>Reported by: D. Rose · Site Engineer</span>
        <span style="color:var(--accent);cursor:pointer;" onclick="document.getElementById('incidentOverlay').remove()">[ dismiss ]</span>
      </div>
    </div>
  `;
  overlay.addEventListener('click', function () { overlay.remove(); });
  document.body.appendChild(overlay);
}

// ── Easter egg 3: export 3x → wrong CRS warning ──
let exportCount = 0;
function maybeWrongCRS() {
  exportCount++;
  if (exportCount !== 3) return;
  exportCount = 0;
  setTimeout(function () {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:9500;display:flex;align-items:center;justify-content:center;background:rgba(192,57,43,0.15);backdrop-filter:blur(2px);animation:fadeIn 0.3s ease both;cursor:pointer;';
    overlay.innerHTML = `
      <div onclick="event.stopPropagation()" style="background:var(--surface);border:2px solid var(--red);border-radius:16px;padding:32px 36px;max-width:420px;width:90%;box-shadow:0 0 0 6px rgba(192,57,43,0.08),0 24px 60px rgba(0,0,0,0.2);animation:scaleIn 0.4s var(--ease-spring) both;cursor:default;text-align:center;">
        <div style="font-size:36px;margin-bottom:12px;">🌍</div>
        <div style="font-family:'Martian Mono',monospace;font-size:9px;letter-spacing:0.2em;color:var(--red);text-transform:uppercase;margin-bottom:8px;">Critical Warning</div>
        <div style="font-family:'DM Serif Display',serif;font-size:24px;color:var(--text);margin-bottom:14px;line-height:1.3;">Are you in the right<br><em style="color:var(--red)">coordinate system?</em></div>
        <div style="font-family:'Martian Mono',monospace;font-size:10px;color:var(--text3);line-height:1.8;margin-bottom:20px;">Your file has been exported.<br>But is it OSGB36? BNG? WGS84?<br>ITM? Local grid? Site datum?<br><br>Nobody knows. Least of all AutoCAD.</div>
        <div style="display:flex;gap:10px;justify-content:center;">
          <button onclick="this.closest('div').closest('div').parentElement.remove()" style="font-family:'Martian Mono',monospace;font-size:10px;padding:8px 16px;border-radius:100px;border:1px solid var(--green);background:var(--green-bg);color:var(--green);cursor:pointer;letter-spacing:0.08em;">Yes, I checked ✓</button>
          <button onclick="this.closest('div').closest('div').parentElement.remove()" style="font-family:'Martian Mono',monospace;font-size:10px;padding:8px 16px;border-radius:100px;border:1px solid var(--red);background:var(--red-bg);color:var(--red);cursor:pointer;letter-spacing:0.08em;">I have not checked</button>
        </div>
        <div style="font-family:'Martian Mono',monospace;font-size:9px;color:var(--text3);margin-top:16px;letter-spacing:0.06em;">[ click anywhere to dismiss and panic quietly ]</div>
      </div>
    `;
    overlay.addEventListener('click', function () { overlay.remove(); });
    document.body.appendChild(overlay);
  }, 1800);
}

function parseCSV(line) {
  const out = []; let cur = '', inQ = false;
  for (const c of line) {
    if (c === '"') { inQ = !inQ; continue; }
    if (c === ',' && !inQ) { out.push(cur.trim()); cur = ''; continue; }
    cur += c;
  }
  out.push(cur.trim()); return out;
}

function esc(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
