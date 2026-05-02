/* ══════════════════════════════════════════════════════════
   Site Engineers Toolbox v2 — Shared JS
   New maximalist design · dark-mode retired
   ══════════════════════════════════════════════════════════ */

// Dark mode is retired in v2 — keep stub so tool pages don't error
function toggleDark() {}
function _syncDarkUI() {}

// ── Toast factory (same signature as v1 for tool-page compatibility) ──
function showToast(icon, iconBg, title, sub, duration) {
  if (duration === undefined) duration = 2500;
  document.querySelectorAll('.toast').forEach(function (t) { t.remove(); });
  var t = document.createElement('div');
  t.className = 'toast';
  t.innerHTML =
    '<div class="toast-icon" style="background:' + iconBg + '">' + icon + '</div>' +
    '<div>' +
      '<div class="toast-title">' + title + '</div>' +
      (sub ? '<div class="toast-sub">' + sub + '</div>' : '') +
    '</div>';
  document.body.appendChild(t);
  setTimeout(function () {
    t.style.transition = 'opacity 0.3s, transform 0.3s';
    t.style.opacity = '0';
    t.style.transform = 'translateY(8px)';
    setTimeout(function () { t.remove(); }, 320);
  }, duration);
}

// ── Ripple — visually suppressed in v2 but kept for API compat ──
function addRipple(e) {
  var el   = e.currentTarget;
  var rect = el.getBoundingClientRect();
  var size = Math.max(el.offsetWidth, el.offsetHeight);
  var x    = e.clientX - rect.left  - size / 2;
  var y    = e.clientY - rect.top   - size / 2;
  var rip  = document.createElement('span');
  rip.className = 'ripple';
  rip.style.cssText = 'width:' + size + 'px;height:' + size + 'px;left:' + x + 'px;top:' + y + 'px';
  el.appendChild(rip);
  setTimeout(function () { rip.remove(); }, 600);
}
