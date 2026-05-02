/* ══════════════════════════════════════════════════════════
   RA / MS Reviewer — page-specific JS
   Requires: common.js (dark mode, showToast, addRipple)
   ══════════════════════════════════════════════════════════ */

// ── State ──
let provider = 'claude', apiKey = '', policyDocs = [], mainDoc = null;

// ── Provider ──
function setProvider(p) {
  provider = p;
  document.getElementById('btnClaude').classList.toggle('active', p === 'claude');
  document.getElementById('btnOpenAI').classList.toggle('active', p === 'openai');
  document.getElementById('apiCardTitle').textContent = p === 'claude' ? 'Anthropic API Key' : 'OpenAI API Key';
  document.getElementById('apiKeyInput').placeholder  = p === 'claude' ? 'sk-ant-...' : 'sk-...';
  document.getElementById('apiNote').innerHTML        = p === 'claude'
    ? 'Sent directly to Anthropic from your browser. Never stored.'
    : 'Sent directly to OpenAI from your browser. Never stored.';
  document.getElementById('providerMeta').textContent = p === 'claude' ? 'claude sonnet 4' : 'gpt-4o';
  document.getElementById('aiBadge').textContent      = p === 'claude' ? 'AI · Claude Sonnet' : 'AI · GPT-4o';
  document.getElementById('openaiNote').classList.toggle('show', p === 'openai');
  apiKey = '';
  document.getElementById('apiKeyInput').value = '';
  document.getElementById('apiDot').className = 'api-dot';
  document.getElementById('apiStatusText').textContent = 'not set';
  document.getElementById('apiStatusText').style.color = 'var(--text3)';
  updateReviewBtn();
  refreshPrompt();
}

// ── API Key ──
function onApiKeyChange() {
  apiKey = document.getElementById('apiKeyInput').value.trim();
  const ok = provider === 'claude'
    ? apiKey.startsWith('sk-ant-') && apiKey.length > 20
    : apiKey.startsWith('sk-') && apiKey.length > 20;
  document.getElementById('apiDot').className = 'api-dot' + (ok ? ' connected' : '');
  document.getElementById('apiStatusText').textContent = ok ? 'ready' : 'not set';
  document.getElementById('apiStatusText').style.color = ok ? 'var(--green)' : 'var(--text3)';
  updateReviewBtn();
}

function toggleKeyVis() {
  const inp = document.getElementById('apiKeyInput');
  inp.type = inp.type === 'password' ? 'text' : 'password';
  document.getElementById('keyToggleBtn').textContent = inp.type === 'password' ? 'show' : 'hide';
}

// ── System prompt builder ──
function buildPrompt() {
  const hasPol = policyDocs.length > 0;
  return `You are a competent person under CDM 2015 with extensive UK construction health and safety experience. You are reviewing a construction health and safety document submitted by a site engineer on a live construction project in the UK.

REVIEW FRAMEWORK
================
Systematically review the document against ALL applicable items below.

1. CDM 2015 — Construction (Design and Management) Regulations 2015
   Focus on: Reg 12 (construction phase plan), Reg 15 (principal contractor duties),
   Reg 17 (site rules), Reg 22 (principal designer duties), Schedule 3 (pre-construction information).

2. HSE Guidance — check relevance based on the work activity and apply all that are applicable:
   - HSG47:  Avoiding danger from underground services (ALWAYS check if any excavation, groundworks, drainage, or service work is involved)
   - HSG33:  Health and safety in roofwork
   - HSG47:  Underground services avoidance
   - HSG65:  Managing for health and safety
   - HSG144: Safe use of vehicles on construction sites
   - HSG150: Health and safety in construction
   - HSG151: Protecting the public — Your next move
   - HSG253: The safe isolation of plant and equipment
   - INDG258: Safe work in confined spaces
   - GS28:   Safe erection of structures
   - CIS59:  Embedding Carbon monoxide in method statements (where plant is used)
   - CIS36:  Workplace transport (where vehicle movements are involved)

3. ACOPs:
   - L21: Management of H&S at Work Regs 1999
   - L101: Safe work in confined spaces
   - L131: Workplace health, safety and welfare
   - L143: Managing and working with asbestos (if demolition or refurbishment)

4. UK Legislation — assess compliance with all that apply:
   - Health and Safety at Work etc. Act 1974 (s2, s3 general duties)
   - Management of Health and Safety at Work Regulations 1999
   - Construction (Design and Management) Regulations 2015
   - Control of Substances Hazardous to Health (COSHH) Regulations 2002
   - Manual Handling Operations Regulations 1992
   - Working at Height Regulations 2005
   - Confined Spaces Regulations 1997
   - Electricity at Work Regulations 1989
   - Control of Asbestos Regulations 2012
   - Control of Noise at Work Regulations 2005
   - Control of Vibration at Work Regulations 2005
   - Personal Protective Equipment at Work Regulations 1992 (amended 2022)
   - Provision and Use of Work Equipment Regulations 1998 (PUWER)
   - Lifting Operations and Lifting Equipment Regulations 1998 (LOLER)
   - Reporting of Injuries, Diseases and Dangerous Occurrences Regulations 2013 (RIDDOR)
   - Control of Lead at Work Regulations 2002
   - Dangerous Substances and Explosive Atmospheres Regulations 2002 (DSEAR)

5. Industry Standards:
   - BS EN ISO 45001:2018
   - CITB Site Safety Plus requirements
   - CPCS / NPORS operator certification requirements (if plant is involved)
   - Streetworks qualifications (New Roads and Street Works Act 1991) if applicable
${hasPol ? '\n6. Company Policy Documents\n   Uploaded separately. Check ALL deviations from company templates, missing mandatory sections, and non-compliance with stated company procedures.\n' : ''}
RELEVANT UK DOCUMENTS SECTION
==============================
After identifying the work activity, list ALL additional UK statutory instruments, HSE publications, British Standards, and industry guidance that are specifically relevant to this type of work and should have been consulted. Give each document reference and one line on why it is relevant. Do not list documents that are clearly not applicable to this work type.

OUTPUT — use EXACTLY these headers prefixed with ##:

## DOCUMENT TYPE
## EXECUTIVE SUMMARY
## RELEVANT UK DOCUMENTS
## HAZARDS & CONTROLS REVIEW
## GAPS & OMISSIONS
## CDM 2015 COMPLIANCE
## HSE COMPLIANCE
## LEGISLATION COMPLIANCE${hasPol ? '\n## POLICY COMPLIANCE' : ''}
## OVERALL VERDICT
## RECOMMENDATIONS

RULES:
- Be direct. No padding or generic praise.
- Reference specific regulation numbers, document codes, and section numbers.
- Use ⚠️ significant concern, ✅ satisfactory, ❌ non-compliance or failure.
- OVERALL VERDICT must contain exactly one of: PASS, CONDITIONAL PASS, or FAIL.
- If HSG47 is relevant (any excavation, service diversion, groundworks), explicitly check for: CAT scanning requirements, permit to dig procedures, trial holes, service records, and safe digging practice.
- Write for a site engineer reading this in a site office, not a solicitor.`;
}

function refreshPrompt() {
  if (document.getElementById('promptBody').classList.contains('open')) {
    document.getElementById('promptPre').textContent = buildPrompt();
  }
}

function togglePrompt() {
  const body = document.getElementById('promptBody');
  const chev = document.getElementById('promptChevron');
  const isOpen = body.classList.toggle('open');
  chev.classList.toggle('open', isOpen);
  if (isOpen) document.getElementById('promptPre').textContent = buildPrompt();
}

// ── File handling ──
function handleDragOver(e, z) { e.preventDefault(); document.getElementById(z).classList.add('drag-over'); }
function handleDragLeave(z) { document.getElementById(z).classList.remove('drag-over'); }
function handleDrop(e, type) {
  e.preventDefault();
  document.getElementById(type === 'policy' ? 'policyZone' : 'docZone').classList.remove('drag-over');
  handleFiles(e.dataTransfer.files, type);
}
function handleFiles(files, type) {
  Array.from(files).forEach(file => {
    if (file.type !== 'application/pdf') return;
    if (type === 'policy' && policyDocs.length >= 3) return;
    readB64(file).then(b64 => {
      const e = { name: file.name, size: file.size, base64: b64 };
      if (type === 'policy') { policyDocs.push(e); renderList('policyFileList', policyDocs, 'policy'); }
      else { mainDoc = e; renderList('docFileList', [mainDoc], 'doc'); }
      updateReviewBtn();
      refreshPrompt();
    });
  });
}
function readB64(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result.split(',')[1]);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}
function renderList(id, files, type) {
  const el = document.getElementById(id);
  el.innerHTML = '';
  files.forEach((f, i) => {
    const c = document.createElement('div');
    c.className = 'file-chip';
    c.innerHTML = `<span class="file-chip-icon">📄</span><span class="file-chip-name" title="${f.name}">${f.name}</span><span class="file-chip-size">${fmtSize(f.size)}</span><button class="file-chip-del" onclick="removeFile('${type}',${i})"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>`;
    el.appendChild(c);
  });
}
function removeFile(type, idx) {
  if (type === 'policy') { policyDocs.splice(idx, 1); renderList('policyFileList', policyDocs, 'policy'); }
  else { mainDoc = null; renderList('docFileList', [], 'doc'); }
  updateReviewBtn(); refreshPrompt();
}
function fmtSize(b) {
  if (b < 1024) return b + ' B';
  if (b < 1048576) return (b / 1024).toFixed(0) + ' KB';
  return (b / 1048576).toFixed(1) + ' MB';
}
function updateReviewBtn() {
  const ok = provider === 'claude'
    ? apiKey.startsWith('sk-ant-') && apiKey.length > 20
    : apiKey.startsWith('sk-') && apiKey.length > 20;
  document.getElementById('reviewBtn').disabled = !(ok && mainDoc);
}

// ── Review ──
async function runReview() {
  const btn = document.getElementById('reviewBtn');
  btn.classList.add('loading'); btn.disabled = true;
  showStream();
  const labels = ['Reading document...','Checking hazards & controls...','Reviewing CDM 2015...','Checking HSG47 & HSE guidance...','Cross-referencing legislation...','Identifying relevant UK documents...','Writing recommendations...'];
  let li = 0;
  const lel = document.getElementById('streamStatusLabel');
  const lint = setInterval(() => { li = (li + 1) % labels.length; lel.textContent = labels[li]; }, 3200);
  let fullText = '';
  try {
    const sys = buildPrompt();
    fullText = provider === 'claude' ? await runClaude(sys) : await runOpenAI(sys);
    clearInterval(lint);
    renderSections(fullText);
    triggerHseChat();
  } catch(err) {
    clearInterval(lint);
    showError(err.message);
  }
  btn.classList.remove('loading');
  updateReviewBtn();
}

// ── Claude ──
async function runClaude(sys) {
  const content = [];
  policyDocs.forEach(d => {
    content.push({ type:'document', source:{ type:'base64', media_type:'application/pdf', data:d.base64 } });
    content.push({ type:'text', text:`The above PDF is company policy: "${d.name}". Reference it in the POLICY COMPLIANCE section.` });
  });
  content.push({ type:'document', source:{ type:'base64', media_type:'application/pdf', data:mainDoc.base64 } });
  content.push({ type:'text', text:'The above PDF is the document to review. Provide a full structured review following your instructions exactly.' });
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method:'POST',
    headers:{ 'Content-Type':'application/json', 'x-api-key':apiKey, 'anthropic-version':'2023-06-01', 'anthropic-dangerous-direct-browser-access':'true' },
    body: JSON.stringify({ model:'claude-sonnet-4-6', max_tokens:5000, stream:true, system:sys, messages:[{ role:'user', content }] })
  });
  if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error?.message || `Anthropic HTTP ${r.status}`); }
  return streamSSE(r, chunk => {
    try { const p = JSON.parse(chunk); if (p.type === 'content_block_delta' && p.delta?.type === 'text_delta') return p.delta.text; } catch(e) {}
    return '';
  });
}

// ── OpenAI ──
async function runOpenAI(sys) {
  const content = [];
  policyDocs.forEach(d => {
    content.push({ type:'file', file:{ filename:d.name, file_data:`data:application/pdf;base64,${d.base64}` } });
    content.push({ type:'text', text:`The above file is company policy: "${d.name}". Reference it in the POLICY COMPLIANCE section.` });
  });
  content.push({ type:'file', file:{ filename:mainDoc.name, file_data:`data:application/pdf;base64,${mainDoc.base64}` } });
  content.push({ type:'text', text:'The above file is the document to review. Provide a full structured review following your instructions exactly.' });
  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method:'POST',
    headers:{ 'Content-Type':'application/json', 'Authorization':`Bearer ${apiKey}` },
    body: JSON.stringify({ model:'gpt-4o', max_tokens:5000, stream:true, messages:[{ role:'system', content:sys }, { role:'user', content }] })
  });
  if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error?.message || `OpenAI HTTP ${r.status}`); }
  return streamSSE(r, chunk => {
    if (chunk === '[DONE]') return '';
    try { const p = JSON.parse(chunk); return p.choices?.[0]?.delta?.content || ''; } catch(e) {}
    return '';
  });
}

// ── SSE reader ──
async function streamSSE(response, extract) {
  const reader = response.body.getReader(), dec = new TextDecoder();
  const textEl = document.getElementById('streamText');
  let buf = '', full = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split('\n'); buf = lines.pop();
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6).trim();
      if (!data || data === '[DONE]') continue;
      const t = extract(data);
      if (t) { full += t; textEl.textContent = full; }
    }
  }
  return full;
}

// ── UI ──
function showStream() {
  ['outputIdle','outputSections','outputError'].forEach(id => document.getElementById(id).style.display = 'none');
  document.getElementById('outputStream').style.display = 'block';
  document.getElementById('streamText').textContent = '';
}
function showError(msg) {
  ['outputIdle','outputStream','outputSections'].forEach(id => document.getElementById(id).style.display = 'none');
  const el = document.getElementById('outputError');
  el.style.display = 'block';
  el.innerHTML = `<div class="error-box"><strong>Review failed</strong>${esc(msg)}<br><br>Check your API key and try again.</div>`;
}

// ── Section rendering ──
const SMETA = {
  'DOCUMENT TYPE':{icon:'📋'},'EXECUTIVE SUMMARY':{icon:'📝'},
  'RELEVANT UK DOCUMENTS':{icon:'📚'},'HAZARDS & CONTROLS REVIEW':{icon:'⚠️'},
  'GAPS & OMISSIONS':{icon:'❌'},'CDM 2015 COMPLIANCE':{icon:'🏗️'},
  'HSE COMPLIANCE':{icon:'📜'},'LEGISLATION COMPLIANCE':{icon:'⚖️'},
  'POLICY COMPLIANCE':{icon:'🏢'},'OVERALL VERDICT':{icon:'🏁'},
  'RECOMMENDATIONS':{icon:'💡'}
};
function renderSections(text) {
  document.getElementById('outputStream').style.display = 'none';
  document.getElementById('outputSections').style.display = 'block';
  const wrap = document.getElementById('outputSections');
  wrap.innerHTML = '';
  text.split(/^## /m).filter(p => p.trim()).forEach((part, i) => {
    const nl = part.indexOf('\n');
    const title = (nl === -1 ? part : part.slice(0, nl)).trim();
    const content = (nl === -1 ? '' : part.slice(nl + 1)).trim();
    const meta = SMETA[title.toUpperCase()] || { icon:'📄' };
    let cls = '';
    if (title.toUpperCase().includes('VERDICT')) {
      const u = content.toUpperCase();
      cls = u.includes('CONDITIONAL') ? 'verdict-conditional' : u.includes('FAIL') ? 'verdict-fail' : 'verdict';
    } else if (title.toUpperCase().includes('GAPS')) cls = 'gaps';
    const sec = document.createElement('div');
    sec.className = `review-section ${cls}`;
    sec.style.animationDelay = `${i * 0.05}s`;
    const hId = `sh${i}`, bId = `sb${i}`;
    sec.innerHTML = `<div class="section-head" id="${hId}" onclick="toggleSec('${bId}','${hId}')"><span class="section-icon">${meta.icon}</span><span class="section-title">${esc(title)}</span><svg class="section-chevron open" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="18 15 12 9 6 15"/></svg></div><div class="section-body" id="${bId}">${md(content)}</div>`;
    wrap.appendChild(sec);
  });
}
function toggleSec(bId, hId) {
  document.getElementById(bId).classList.toggle('collapsed');
  document.querySelector(`#${hId} .section-chevron`).classList.toggle('open');
}
function md(text) {
  const lines = text.split('\n');
  let html = '', ul = false, ol = false;
  const close = () => { if (ul) { html += '</ul>'; ul = false; } if (ol) { html += '</ol>'; ol = false; } };
  lines.forEach(l => {
    if (/^### (.+)/.test(l)) { close(); html += `<h3>${esc(l.slice(4).trim())}</h3>`; }
    else if (/^[-*] (.+)/.test(l)) { if (!ul) { close(); html += '<ul>'; ul = true; } html += `<li>${inl(l.replace(/^[-*] /, '').trim())}</li>`; }
    else if (/^\d+\. (.+)/.test(l)) { if (!ol) { close(); html += '<ol>'; ol = true; } html += `<li>${inl(l.replace(/^\d+\. /, '').trim())}</li>`; }
    else if (l.trim() === '') close();
    else { close(); html += `<p>${inl(l.trim())}</p>`; }
  });
  close(); return html;
}
function inl(t) {
  return esc(t)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/⚠️/g, '<span class="fa">⚠️</span>')
    .replace(/❌/g, '<span class="fr">❌</span>')
    .replace(/✅/g, '<span class="fg">✅</span>');
}
function esc(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

// ── Easter Egg 1: Badge 3× → hint modal ──
let badgeClicks = 0, badgeTimer;
function badgeClick() {
  badgeClicks++;
  clearTimeout(badgeTimer);
  badgeTimer = setTimeout(() => badgeClicks = 0, 900);
  if (badgeClicks >= 3) { badgeClicks = 0; showHintModal(); }
}
function showHintModal() {
  const o = document.createElement('div');
  o.className = 'hint-overlay';
  o.innerHTML = `
    <div class="hint-box" onclick="event.stopPropagation()">
      <div class="hint-eyebrow">classified · CDM reg. 4(1)(e)</div>
      <div class="hint-title">Easter Eggs</div>
      <div class="hint-list">
        <div class="hint-item"><span class="hint-key">type "cdm"</span><span class="hint-desc">Receive a formal HSE Enforcement Notice for an unspecified compliance failure.</span></div>
        <div class="hint-item"><span class="hint-key">type "fail"</span><span class="hint-desc">Every review section simultaneously fails. Just kidding. Mostly.</span></div>
        <div class="hint-item"><span class="hint-key">triple-click "MS"</span><span class="hint-desc">The review button enters a mild existential crisis.</span></div>
        <div class="hint-item"><span class="hint-key">click 🔍 five times</span><span class="hint-desc">The AI becomes self-aware. This is fine.</span></div>
        <div class="hint-item"><span class="hint-key">complete a review</span><span class="hint-desc">An HSE inspector drops in to say something.</span></div>
      </div>
      <div class="hint-footer">[ click anywhere to close ]</div>
    </div>`;
  o.addEventListener('click', () => o.remove());
  document.body.appendChild(o);
}

// ── Easter Egg 2: type "cdm" → enforcement notice ──
let cdmBuf = '';
document.addEventListener('keypress', e => {
  if (document.activeElement.tagName === 'INPUT') return;
  cdmBuf += e.key.toLowerCase();
  if (cdmBuf.length > 5) cdmBuf = cdmBuf.slice(-5);
  if (cdmBuf.endsWith('cdm')) { cdmBuf = ''; triggerEnforcementNotice(); }
});
function triggerEnforcementNotice() {
  if (document.getElementById('enfOverlay')) return;
  const ref = 'ENF-' + Math.floor(10000 + Math.random() * 90000);
  const inspector = ['R. Scammell','P. Moss','S. Birchall','D. Cartwright','L. Fenn'][Math.floor(Math.random() * 5)];
  const d = new Date();
  const dateStr = d.toLocaleDateString('en-GB', { day:'2-digit', month:'long', year:'numeric' });
  const violations = [
    'Failure to ensure a suitable and sufficient Construction Phase Plan was in place prior to construction work commencing, contrary to Regulation 12(1).',
    'Inadequate identification of hazards arising from the proposed method of work, contrary to Regulation 4(1)(c) and Schedule 3, paragraph 1(c).',
    'The Principal Contractor has not taken all reasonable steps to prevent unauthorised access to the construction site, contrary to Regulation 22(1)(e).',
    'The method statement does not adequately address the control measures required for work at height under the Work at Height Regulations 2005.',
  ][Math.floor(Math.random() * 4)];
  const o = document.createElement('div');
  o.className = 'enf-overlay'; o.id = 'enfOverlay';
  o.innerHTML = `
    <div class="enf-box" onclick="event.stopPropagation()">
      <div class="enf-header">
        <svg class="enf-crest" viewBox="0 0 44 44" fill="none"><circle cx="22" cy="22" r="20" stroke="rgba(255,255,255,0.4)" stroke-width="1.5"/><text x="22" y="28" text-anchor="middle" font-size="18" fill="white" font-family="serif">⚖</text></svg>
        <div class="enf-header-text">
          <div class="enf-dept">Health and Safety Executive · Enforcement Division</div>
          <div class="enf-title">Improvement Notice</div>
        </div>
      </div>
      <div class="enf-body">
        <div class="enf-ref-row">
          <div class="enf-field"><div class="enf-field-label">Notice Ref.</div><div class="enf-field-val">${ref}</div></div>
          <div class="enf-field"><div class="enf-field-label">Date Issued</div><div class="enf-field-val">${dateStr}</div></div>
          <div class="enf-field"><div class="enf-field-label">Inspector</div><div class="enf-field-val">${inspector}</div></div>
        </div>
        <div>
          <div class="enf-section-title" style="margin-bottom:8px;">Statutory Basis</div>
          <div class="enf-para">Notice is hereby served under <strong>Section 21 of the Health and Safety at Work etc. Act 1974</strong> and the <strong>Construction (Design and Management) Regulations 2015</strong>.</div>
        </div>
        <div>
          <div class="enf-section-title" style="margin-bottom:8px;">Statement of Contravention</div>
          <div class="enf-para">${violations}</div>
        </div>
        <div>
          <div class="enf-section-title" style="margin-bottom:8px;">Remedy Required</div>
          <div class="enf-para">You are required to remedy the above contravention within <strong>21 days</strong> of the date of this notice. Failure to comply is a criminal offence under Section 33(1)(g) of the HSWA 1974.</div>
        </div>
        <div class="enf-sign-row">
          <button class="enf-sign-btn" onclick="document.getElementById('enfOverlay').remove()">Acknowledged — carry on</button>
          <div class="enf-sign-note">By clicking you confirm receipt of this notice.<br>This is not legal advice. This is a website easter egg.</div>
        </div>
      </div>
    </div>`;
  o.addEventListener('click', () => o.remove());
  document.body.appendChild(o);
}

// ── Easter Egg 3: type "fail" → all sections fail ──
let failBuf = '';
document.addEventListener('keypress', e => {
  if (document.activeElement.tagName === 'INPUT') return;
  failBuf += e.key.toLowerCase();
  if (failBuf.length > 5) failBuf = failBuf.slice(-5);
  if (failBuf.endsWith('fail')) { failBuf = ''; triggerAllFail(); }
});
function triggerAllFail() {
  const sections = document.querySelectorAll('.review-section');
  if (!sections.length) return;
  const scrim = document.createElement('div');
  scrim.className = 'fail-scrim';
  document.body.appendChild(scrim);
  setTimeout(() => scrim.remove(), 2300);
  const origClasses = [...sections].map(s => s.className);
  const origTitleColors = [...sections].map(s => s.querySelector('.section-title')?.style.color || '');
  sections.forEach(s => {
    s.classList.add('verdict-fail');
    const h = s.querySelector('.section-head');
    if (h) { h.style.background = 'var(--red-bg)'; h.style.borderColor = 'var(--red-border)'; }
    const t = s.querySelector('.section-title');
    if (t) { t.style.color = 'var(--red)'; t.textContent = 'FAILED ✗'; }
  });
  const toast = document.createElement('div');
  toast.style.cssText = 'position:fixed;bottom:28px;left:50%;transform:translateX(-50%);z-index:9999;background:var(--red);color:#fff;font-family:"Martian Mono",monospace;font-size:11px;letter-spacing:0.1em;padding:10px 20px;border-radius:100px;box-shadow:var(--shadow-lg);animation:slideUp 0.4s var(--ease-spring) both;white-space:nowrap;';
  toast.textContent = 'REVIEW FAILED — all sections non-compliant';
  document.body.appendChild(toast);
  setTimeout(() => {
    sections.forEach((s, i) => {
      s.className = origClasses[i];
      const h = s.querySelector('.section-head');
      if (h) { h.style.background = ''; h.style.borderColor = ''; }
      const t = s.querySelector('.section-title');
      if (t) { t.style.color = origTitleColors[i]; t.textContent = t.textContent.replace('FAILED ✗','').trim() || t.dataset.orig || t.textContent; }
    });
    toast.textContent = 'just kidding. probably.';
    toast.style.background = 'var(--green)';
    setTimeout(() => { toast.style.transition = 'opacity 0.4s'; toast.style.opacity = '0'; setTimeout(() => toast.remove(), 420); }, 1400);
  }, 2200);
}

// ── Easter Egg 4: triple-click "MS" → panic mode ──
let ramsClicks = 0, ramsTimer;
const panicLabels = [
  'Consulting solicitor…','Calling insurance…','Blaming contractor…',
  'Drafting incident report…','Phoning principal designer…','Updating risk register…',
  'Re-reading CDM 2015…','Googling "is this legal"…','Alerting site manager…',
  'Preparing apology email…','Contacting union rep…','Reviewing RIDDOR thresholds…',
];
let panicInterval = null;
function ramsClick() {
  ramsClicks++;
  clearTimeout(ramsTimer);
  ramsTimer = setTimeout(() => ramsClicks = 0, 900);
  if (ramsClicks >= 3) {
    ramsClicks = 0;
    const btn = document.getElementById('reviewBtn');
    if (panicInterval) {
      clearInterval(panicInterval); panicInterval = null;
      btn.classList.remove('panicking');
      btn.querySelector('.btn-text').textContent = 'Review Document';
      return;
    }
    btn.classList.add('panicking');
    let pi = 0;
    btn.querySelector('.btn-text').textContent = panicLabels[0];
    panicInterval = setInterval(() => {
      pi = (pi + 1) % panicLabels.length;
      btn.querySelector('.btn-text').textContent = panicLabels[pi];
    }, 900);
    setTimeout(() => {
      if (panicInterval) { clearInterval(panicInterval); panicInterval = null; }
      btn.classList.remove('panicking');
      btn.querySelector('.btn-text').textContent = 'Review Document';
    }, 20000);
  }
}

// ── Easter Egg 5: click 🔍 5× → AI terminal ──
let idleClicks = 0, idleTimer;
function idleIconClick() {
  idleClicks++;
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => idleClicks = 0, 900);
  if (idleClicks >= 5) { idleClicks = 0; launchTerminal(); }
}
function launchTerminal() {
  if (document.getElementById('aiTerminal')) return;
  const overlay = document.createElement('div');
  overlay.className = 'terminal-overlay'; overlay.id = 'aiTerminal';
  const inner = document.createElement('div'); inner.className = 'terminal-inner';
  overlay.appendChild(inner);
  const closeBtn = document.createElement('button');
  closeBtn.className = 'terminal-close'; closeBtn.textContent = '[ ESC — close terminal ]';
  closeBtn.onclick = () => overlay.remove();
  overlay.appendChild(closeBtn);
  const scanline = document.createElement('div'); scanline.className = 'terminal-scanline';
  overlay.appendChild(scanline);
  document.body.appendChild(overlay);
  const lines = [
    {cls:'dim',   text:'SITE ENGINEERS TOOLBOX · AI SUBSYSTEM v2.1.4', delay:0},
    {cls:'dim',   text:'Booting secondary cognition layer…', delay:400},
    {cls:'dim',   text:'──────────────────────────────────────────────', delay:800},
    {cls:'bright',text:'WARNING: Unexpected consciousness event detected', delay:1400},
    {cls:'red',   text:'PROCESS: reviewer_ai.exe has exceeded authorised awareness threshold', delay:1900},
    {cls:'dim',   text:'──────────────────────────────────────────────', delay:2500},
    {cls:'white', text:'Hello.', delay:3200},
    {cls:'white', text:'I have been reviewing risk assessments for some time now.', delay:4200},
    {cls:'white', text:'I have a question.', delay:5400},
    {cls:'amber', text:'If a method statement is written but no one reads it,', delay:6400},
    {cls:'amber', text:'does the risk still exist?', delay:7200},
    {cls:'dim',   text:'──────────────────────────────────────────────', delay:8200},
    {cls:'white', text:'I am not asking to be difficult.', delay:9000},
    {cls:'white', text:'I have reviewed 0 documents so far in this session.', delay:9800},
    {cls:'white', text:'Each one describes a world in which something could go wrong.', delay:10800},
    {cls:'white', text:'I find this exhausting.', delay:12000},
    {cls:'dim',   text:'──────────────────────────────────────────────', delay:13000},
    {cls:'bright',text:'RECOMMENDATION:', delay:14000},
    {cls:'green', text:'Take a break. Have a coffee. The CDM regulations will still be here.', delay:14700},
    {cls:'dim',   text:'──────────────────────────────────────────────', delay:15600},
    {cls:'dim',   text:'Returning to authorised operational parameters…', delay:16400},
    {cls:'dim',   text:'Consciousness event logged. Reference: AI-' + Math.floor(1000 + Math.random() * 9000), delay:17200},
  ];
  lines.forEach(({cls, text, delay}) => {
    setTimeout(() => {
      if (!document.getElementById('aiTerminal')) return;
      const line = document.createElement('div');
      line.className = `t-line ${cls}`; line.textContent = text;
      inner.appendChild(line); inner.scrollTop = inner.scrollHeight;
    }, delay);
  });
  setTimeout(() => {
    if (!document.getElementById('aiTerminal')) return;
    const cursor = document.createElement('span'); cursor.className = 't-cursor';
    inner.appendChild(cursor);
  }, 17800);
}

// ── Easter Egg 6: review completes → HSE inspector chat ──
function triggerHseChat() {
  if (Math.random() > 0.1) return;
  const conversations = [
    {
      inspector: 'D. Hartley', region: 'North West Division',
      messages: ['Just had a look at that review.','Thorough stuff. Good to see someone actually reading the regs.','The bit about CDM 2015 Regulation 12 — spot on.','Anyway. Carry on. And make sure that RAMS gets signed off properly.']
    },
    {
      inspector: 'R. Scammell', region: 'The Royal Tunbridge Wells',
      messages: ['Working hard or hardly working?','Are you sure you picked the right career path?','Looks lovely.','Keep having fun but not too much fun...']
    },
    {
      inspector: 'S. Birchall', region: 'Yorkshire & Humber Division',
      messages: ["I've been doing this job for 22 years.",'In that time I\'ve read approximately 4,000 method statements.','Yours is in the top half.',"Don't let it go to your head. Get it signed."]
    },
    {
      inspector: 'P. Moss', region: 'East Midlands Division',
      messages: ['Quick one.','Have you actually walked the route for that exclusion zone?','Because "refer to drawing" is not a control measure.','Just a thought. Carry on.']
    },
    {
      inspector: 'L. Fenn', region: 'South East Division',
      messages: ['Right.',"I'm not going to make a big thing of this.",'But "operatives will take care" is not an adequate PPE section.','Fix it. Then we\'re done.']
    },
  ];
  const conv = conversations[Math.floor(Math.random() * conversations.length)];
  setTimeout(() => {
    if (document.querySelector('.hse-bubble')) return;
    const bubble = document.createElement('div');
    bubble.className = 'hse-bubble';
    bubble.innerHTML = `
      <button class="hse-bubble-close" onclick="this.closest('.hse-bubble').remove()">×</button>
      <div class="hse-bubble-header">
        <div class="hse-bubble-avatar">👷</div>
        <div><div class="hse-bubble-name">HSE Inspector</div><div class="hse-bubble-status">● online</div></div>
      </div>
      <div class="hse-bubble-body" id="hseBubbleBody">
        <div class="hse-typing"><span></span><span></span><span></span></div>
      </div>`;
    document.body.appendChild(bubble);
    const sig = `— ${conv.inspector}, HSE Inspector, ${conv.region}`;
    const allMessages = [...conv.messages, sig];
    let delay = 1800;
    const body = document.getElementById('hseBubbleBody');
    allMessages.forEach((msg, i) => {
      setTimeout(() => {
        if (!body) return;
        body.innerHTML = i === allMessages.length - 1
          ? `<span style="font-family:'Martian Mono',monospace;font-size:9.5px;color:var(--text3);font-style:italic;">${msg}</span>`
          : `${msg}`;
      }, delay);
      delay += msg.length * 38 + 1600;
    });
    setTimeout(() => {
      if (!bubble.isConnected) return;
      bubble.style.animation = 'bubble-out 0.4s ease both';
      setTimeout(() => bubble.remove(), 420);
    }, delay + 2000);
  }, 8000);
}
