// ── Live clock ──
function updateClock() {
  const now = new Date();
  document.getElementById('footerTime').textContent =
    now.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',second:'2-digit'}) +
    ' · ' + now.toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'});
}
updateClock(); setInterval(updateClock, 1000);

// ── Coming soon toast ──
function soonClick(e, name) {
  addRipple(e);
  showToast('🔧', '#f0c5ae', name + ' — Not yet built', 'Check back later, it\'s on the list', 2200);
}

// ── Easter egg: XP level bar (clicks anywhere raise it) ──
let xpLevel = 0;
document.addEventListener('click', function () {
  xpLevel = Math.min(xpLevel + 3, 100);
  document.getElementById('levelBar').style.width = xpLevel + '%';
  if (xpLevel >= 100) {
    xpLevel = 0;
    setTimeout(function () { document.getElementById('levelBar').style.width = '0%'; }, 600);
    showToast('⭐', '#fff3cd', 'Level up!', 'You clicked enough. Nothing happens. Keep going.', 2500);
  }
});

// ── Easter egg: Toolbox 3x click → egg list modal ──
let toolboxClicks = 0, toolboxTimer;
function toolboxClick() {
  toolboxClicks++;
  clearTimeout(toolboxTimer);
  toolboxTimer = setTimeout(function () { toolboxClicks = 0; }, 800);
  if (toolboxClicks >= 3) {
    toolboxClicks = 0;
    showEggList();
  }
}

function showEggList() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-box" onclick="event.stopPropagation()" style="max-width:500px;">
      <div class="modal-eyebrow">🥚 hidden features · homepage only</div>
      <div class="modal-title">Easter Eggs</div>
      <div class="modal-body" style="display:flex;flex-direction:column;gap:10px;">
        <div style="display:flex;gap:12px;align-items:flex-start;padding:10px 12px;background:var(--surface2);border:1px solid var(--border);border-radius:8px;">
          <span style="font-size:18px;flex-shrink:0;">↑↑↓↓←→←→BA</span>
          <div><div style="font-weight:600;font-size:13px;color:var(--text);">Konami Code</div><div style="font-size:12px;color:var(--text3);margin-top:2px;">The classic. You know what to do.</div></div>
        </div>
        <div style="display:flex;gap:12px;align-items:flex-start;padding:10px 12px;background:var(--surface2);border:1px solid var(--border);border-radius:8px;">
          <span style="font-size:18px;flex-shrink:0;">⌨️</span>
          <div><div style="font-weight:600;font-size:13px;color:var(--text);">Type "concrete"</div><div style="font-size:12px;color:var(--text3);margin-top:2px;">Anywhere on the page. Go on.</div></div>
        </div>
        <div style="display:flex;gap:12px;align-items:flex-start;padding:10px 12px;background:var(--surface2);border:1px solid var(--border);border-radius:8px;">
          <span style="font-size:18px;flex-shrink:0;">⌨️</span>
          <div><div style="font-weight:600;font-size:13px;color:var(--text);">Type "engineer"</div><div style="font-size:12px;color:var(--text3);margin-top:2px;">A little acknowledgement.</div></div>
        </div>
        <div style="display:flex;gap:12px;align-items:flex-start;padding:10px 12px;background:var(--surface2);border:1px solid var(--border);border-radius:8px;">
          <span style="font-size:18px;flex-shrink:0;">🏷️</span>
          <div><div style="font-weight:600;font-size:13px;color:var(--text);">Click the version badge 7×</div><div style="font-size:12px;color:var(--text3);margin-top:2px;">Unlocks night shift mode.</div></div>
        </div>
        <div style="display:flex;gap:12px;align-items:flex-start;padding:10px 12px;background:var(--surface2);border:1px solid var(--border);border-radius:8px;">
          <span style="font-size:18px;flex-shrink:0;">📡</span>
          <div><div style="font-weight:600;font-size:13px;color:var(--text);">Click the eyebrow text</div><div style="font-size:12px;color:var(--text3);margin-top:2px;">A hint lives here.</div></div>
        </div>
        <div style="display:flex;gap:12px;align-items:flex-start;padding:10px 12px;background:var(--surface2);border:1px solid var(--border);border-radius:8px;">
          <span style="font-size:18px;flex-shrink:0;">😴</span>
          <div><div style="font-weight:600;font-size:13px;color:var(--text);">Go idle for 45 seconds</div><div style="font-size:12px;color:var(--text3);margin-top:2px;">The cards get restless without you.</div></div>
        </div>
        <div style="display:flex;gap:12px;align-items:flex-start;padding:10px 12px;background:var(--surface2);border:1px solid var(--border);border-radius:8px;">
          <span style="font-size:18px;flex-shrink:0;">🦺</span>
          <div><div style="font-weight:600;font-size:13px;color:var(--text);">Click Dillon Rose 3×</div><div style="font-size:12px;color:var(--text3);margin-top:2px;">You probably shouldn't.</div></div>
        </div>
      </div>
      <div class="modal-footer">[ click anywhere to close · there are more eggs on other pages ]</div>
    </div>
  `;
  overlay.addEventListener('click', function () { overlay.remove(); });
  document.body.appendChild(overlay);
}

// ── Easter egg: Dillon Rose 3x click ──
let dillonClicks = 0, dillonTimer;
function dillonClick() {
  dillonClicks++;
  clearTimeout(dillonTimer);
  const el = document.getElementById('dillonRose');
  el.style.animation = 'none';
  void el.offsetWidth;
  el.style.animation = 'wiggle 0.4s var(--ease-spring)';
  setTimeout(function () { el.style.animation = ''; }, 450);
  dillonTimer = setTimeout(function () { dillonClicks = 0; }, 900);
  if (dillonClicks >= 3) {
    dillonClicks = 0;
    showDillonEgg();
  }
}

function showDillonEgg() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-box" onclick="event.stopPropagation()" style="text-align:center;max-width:420px;">
      <div style="font-size:52px;margin-bottom:12px;animation:bounce-in 0.5s var(--ease-spring) both;">👷</div>
      <div class="modal-eyebrow" style="justify-content:center;">⚠ employee file · strictly confidential</div>
      <div class="modal-title" style="margin-bottom:16px;">Dillon Rose</div>
      <div class="modal-body" style="font-family:'Martian Mono',monospace;font-size:10px;line-height:2;letter-spacing:0.06em;color:var(--text2);">
        <div style="display:grid;grid-template-columns:auto 1fr;gap:4px 16px;text-align:left;background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:14px 16px;margin-bottom:14px;">
          <span style="color:var(--text3);">ROLE</span><span>Placement Site Engineer</span>
          <span style="color:var(--text3);">INSTITUTION</span><span>University of Liverpool</span>
          <span style="color:var(--text3);">YEAR</span><span>3</span>
          <span style="color:var(--text3);">THREAT LEVEL</span><span style="color:var(--green);">Minimal ✓</span>
          <span style="color:var(--text3);">SETTING OUT</span><span style="color:var(--accent);">"One seccond"</span>
          <span style="color:var(--text3);">KNOWN SKILLS</span><span>AutoCAD, GPS, worrying</span>
        </div>
        <div style="color:var(--text3);font-size:9px;">This file is auto-generated and entirely fictitious.<br>Any resemblance to a real placement student is intentional.</div>
      </div>
      <div class="modal-footer" style="text-align:center;margin-top:16px;">[ click anywhere to seal this file ]</div>
    </div>
  `;
  overlay.addEventListener('click', function () { overlay.remove(); });
  document.body.appendChild(overlay);
}

// ── Easter egg: version badge (click 7x = dark mode) ──
let versionClicks = 0, versionTimer;
function versionClick() {
  versionClicks++;
  clearTimeout(versionTimer);
  const vb = document.getElementById('versionBadge');
  vb.style.animation = 'count-pop 0.3s var(--ease-spring)';
  setTimeout(function () { vb.style.animation = ''; }, 350);
  if (versionClicks === 7) {
    versionClicks = 0;
    toggleDarkMode();
  } else {
    versionTimer = setTimeout(function () { versionClicks = 0; }, 1500);
  }
}

function toggleDarkMode() {
  document.body.classList.toggle('dark-mode');
  const isDark = document.body.classList.contains('dark-mode');
  localStorage.setItem('darkmode', isDark ? 'true' : 'false');
  const announce = document.createElement('div');
  announce.className = 'dark-announce';
  announce.textContent = isDark ? '' : '';
  document.body.appendChild(announce);
  setTimeout(function () { announce.remove(); }, 1500);
  document.getElementById('versionBadge').textContent = isDark
    ? 'v0.1.0 — night shift 🌑'
    : 'v0.1.0 — placement build';
  // Propagate dark mode param to all live card links
  document.querySelectorAll('a.tool-card.live').forEach(function (a) {
    const url = new URL(a.href, window.location.href);
    if (isDark) { url.searchParams.set('darkmode', 'true'); }
    else { url.searchParams.delete('darkmode'); }
    a.href = url.href;
  });
}

// Init dark mode propagation to card links on load
(function () {
  const isDark = document.body.classList.contains('dark-mode');
  if (isDark) {
    document.querySelectorAll('a.tool-card.live').forEach(function (a) {
      const url = new URL(a.href, window.location.href);
      url.searchParams.set('darkmode', 'true');
      a.href = url.href;
    });
    document.addEventListener('DOMContentLoaded', function () {
      const vb = document.getElementById('versionBadge');
      if (vb) vb.textContent = 'v0.1.0 — night shift 🌑';
    });
  }
})();

// ── Easter egg: eyebrow click (morse code hint) ──
let eyebrowClicks = 0;
function eyebrowClick() {
  eyebrowClicks++;
  if (eyebrowClicks === 1) {
    showToast('📡', 'var(--accent-bg)', 'Signal detected', 'Try the Konami code. Go on.', 3000);
  } else if (eyebrowClicks === 5) {
    eyebrowClicks = 0;
    showToast('📡', 'var(--accent-bg)', '↑↑↓↓←→←→BA', 'That\'s the sequence. Now you know.', 3500);
  }
}

// ── Easter egg: type "concrete" anywhere ──
let concreteBuffer = '';
document.addEventListener('keypress', function (e) {
  concreteBuffer += e.key.toLowerCase();
  if (concreteBuffer.length > 10) concreteBuffer = concreteBuffer.slice(-10);
  if (concreteBuffer.endsWith('concrete')) {
    concreteBuffer = '';
    spawnConcreteSplats();
  }
});

function spawnConcreteSplats() {
  const emojis = ['🪨', '💧', '🏗️', '🧱', '⚙️'];
  for (let i = 0; i < 6; i++) {
    setTimeout(function () {
      const s = document.createElement('div');
      s.className = 'concrete-splat';
      s.textContent = emojis[Math.floor(Math.random() * emojis.length)];
      s.style.left = (10 + Math.random() * 80) + 'vw';
      s.style.top  = (10 + Math.random() * 80) + 'vh';
      document.body.appendChild(s);
      setTimeout(function () { s.remove(); }, 1300);
    }, i * 120);
  }
  showToast('🧱', '#e8e0d4', 'Concrete poured', 'You typed "concrete". Classic engineer.', 2500);
}

// ── Easter egg: Idle 45s = cards wobble ──
let idleTimer, wobbling = false;
function resetIdleTimer() {
  clearTimeout(idleTimer);
  if (wobbling) {
    wobbling = false;
    document.querySelectorAll('.tool-card').forEach(function (c) { c.classList.remove('wobbling'); });
  }
  idleTimer = setTimeout(function () {
    wobbling = true;
    document.querySelectorAll('.tool-card').forEach(function (c) { c.classList.add('wobbling'); });
    showToast('😴', 'var(--accent-bg)', 'Still there?', 'Your cards are getting restless.', 3000);
  }, 45000);
}
['mousemove', 'keydown', 'click', 'scroll'].forEach(function (ev) {
  document.addEventListener(ev, resetIdleTimer);
});
resetIdleTimer();

// ── Easter egg: Konami code ──
const KONAMI = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
let konamiIdx = 0;
document.addEventListener('keydown', function (e) {
  if (e.key === KONAMI[konamiIdx]) {
    konamiIdx++;
    if (konamiIdx === KONAMI.length) {
      konamiIdx = 0;
      triggerKonami();
    }
  } else {
    konamiIdx = (e.key === KONAMI[0]) ? 1 : 0;
  }
});

function triggerKonami() {
  const overlay = document.createElement('div');
  overlay.className = 'konami-overlay';
  overlay.innerHTML = `
    <div class="konami-box" onclick="event.stopPropagation()">
      <div class="konami-title">Cheat Unlocked.</div>
      <div class="konami-seq">↑ ↑ ↓ ↓ ← → ← → B A</div>
      <div class="konami-msg">
        CONGRATULATIONS, SITE ENGINEER<br><br>
        YOU HAVE SUCCESSFULLY COMPLETED<br>
        THE MOST USELESS TASK ON SITE<br><br>
        YOUR SETTING OUT IS STILL WRONG<br>
        AND THE CONCRETE IS STILL CURING<br><br>
      </div>
      <div class="konami-sub">[ click anywhere to return to actual work ]</div>
    </div>
  `;
  overlay.addEventListener('click', function () {
    overlay.style.transition = 'opacity 0.2s';
    overlay.style.opacity = '0';
    setTimeout(function () { overlay.remove(); }, 220);
  });
  document.body.appendChild(overlay);
}

// ── Easter egg: type "engineer" ──
let engBuffer = '';
document.addEventListener('keypress', function (e) {
  engBuffer += e.key.toLowerCase();
  if (engBuffer.length > 12) engBuffer = engBuffer.slice(-12);
  if (engBuffer.endsWith('engineer')) {
    engBuffer = '';
    showToast('🎓', '#edf7f2', 'University of Liverpool', 'Civil Engineering, Year 2→3. You earned it.', 3500);
  }
});
