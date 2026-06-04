/* ═══════════════════════════════════════════════════════
   ClothCo CRM — Vanilla JS SPA
   ═══════════════════════════════════════════════════════ */
'use strict';

// ── State ─────────────────────────────────────────────
const S = {
  token: localStorage.getItem('crm_token'),
  user:  null,
  theme: localStorage.getItem('crm_theme') || 'light',
};

// ── Utils ─────────────────────────────────────────────
const $ = (sel, ctx=document) => ctx.querySelector(sel);
const $$ = (sel, ctx=document) => [...ctx.querySelectorAll(sel)];
const el = (tag, cls='', html='') => { const e=document.createElement(tag); if(cls)e.className=cls; if(html)e.innerHTML=html; return e; };
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) : '—';
const fmtMoney = n => n != null ? '£'+Number(n).toLocaleString('en-GB',{minimumFractionDigits:0}) : '—';
const cap = s => s ? s.charAt(0).toUpperCase()+s.slice(1) : '';

// ── API ────────────────────────────────────────────────
async function api(method, path, body) {
  const opts = { method, headers: { 'Content-Type':'application/json' } };
  if (S.token) opts.headers['Authorization'] = 'Bearer '+S.token;
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch('/api/v1'+path, opts);
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Request failed');
  return json;
}
const GET  = (p)    => api('GET', p);
const POST = (p, b) => api('POST', p, b);
const PUT  = (p, b) => api('PUT', p, b);
const PATCH= (p, b) => api('PATCH', p, b);
const DEL  = (p)    => api('DELETE', p);

// ── Toast ──────────────────────────────────────────────
function toast(msg, type='info') {
  const c = $('#toast-container');
  const t = el('div', 'toast '+type, `<span class="toast-dot"></span><span>${msg}</span>`);
  c.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

// ── Theme ──────────────────────────────────────────────
function applyTheme(t) {
  S.theme = t;
  document.documentElement.setAttribute('data-theme', t);
  localStorage.setItem('crm_theme', t);
  const sunIcon = $('.icon-sun');
  const moonIcon = $('.icon-moon');
  if (t === 'dark') { sunIcon?.classList.add('hidden'); moonIcon?.classList.remove('hidden'); }
  else              { sunIcon?.classList.remove('hidden'); moonIcon?.classList.add('hidden'); }
}

$('#theme-toggle')?.addEventListener('click', () => applyTheme(S.theme === 'light' ? 'dark' : 'light'));

// ── Modal ──────────────────────────────────────────────
function openModal(title, bodyHTML, wide=false) {
  $('#modal-title').textContent = title;
  $('#modal-body').innerHTML = bodyHTML;
  if (wide) $('#modal').style.maxWidth = '720px';
  else $('#modal').style.maxWidth = '';
  $('#modal-overlay').classList.remove('hidden');
}
function closeModal() { $('#modal-overlay').classList.add('hidden'); }
$('#modal-close')?.addEventListener('click', closeModal);
$('#modal-overlay')?.addEventListener('click', e => { if(e.target===e.currentTarget) closeModal(); });

// ── Confirm Dialog ─────────────────────────────────────
function confirm(title, msg) {
  return new Promise(resolve => {
    $('#confirm-title').textContent = title;
    $('#confirm-msg').textContent = msg;
    $('#confirm-overlay').classList.remove('hidden');
    const ok = $('#confirm-ok');
    const cancel = $('#confirm-cancel');
    const cleanup = (val) => { $('#confirm-overlay').classList.add('hidden'); ok.onclick=null; cancel.onclick=null; resolve(val); };
    ok.onclick = () => cleanup(true);
    cancel.onclick = () => cleanup(false);
  });
}
$('#confirm-overlay')?.addEventListener('click', e => { if(e.target===e.currentTarget) $('#confirm-overlay').classList.add('hidden'); });

// ── Auth ───────────────────────────────────────────────
async function initAuth() {
  applyTheme(S.theme);
  if (!S.token) { showLogin(); return; }
  try {
    const { data } = await GET('/auth/me');
    S.user = data.user;
    mountApp();
  } catch { logout(); }
  finally { $('#app-loading').classList.add('hidden'); }
}

function showLogin() {
  $('#app-loading').classList.add('hidden');
  $('#login-page').classList.remove('hidden');
}

function logout() {
  S.token = null; S.user = null;
  localStorage.removeItem('crm_token');
  $('#app-shell').classList.add('hidden');
  $('#login-page').classList.remove('hidden');
}

$('#login-form')?.addEventListener('submit', async e => {
  e.preventDefault();
  const btn = $('#login-btn');
  const err = $('#login-error');
  err.classList.add('hidden');
  btn.disabled = true; btn.textContent = 'Signing in…';
  try {
    const { data } = await POST('/auth/login', {
      email: $('#login-email').value.trim(),
      password: $('#login-password').value,
    });
    S.token = data.token; S.user = data.user;
    localStorage.setItem('crm_token', S.token);
    $('#login-page').classList.add('hidden');
    mountApp();
  } catch(ex) {
    err.textContent = ex.message; err.classList.remove('hidden');
  } finally { btn.disabled=false; btn.textContent='Sign in'; }
});

$('#logout-btn')?.addEventListener('click', async () => {
  try { await POST('/auth/logout'); } catch {}
  logout();
});

// ── Mount App ──────────────────────────────────────────
function mountApp() {
  $('#app-shell').classList.remove('hidden');
  const name = S.user.name;
  $('#sidebar-name').textContent = name;
  $('#sidebar-role').textContent = cap(S.user.role);
  $('#sidebar-avatar').textContent = name.charAt(0).toUpperCase();
  $('#topbar-avatar').textContent  = name.charAt(0).toUpperCase();

  if (S.user.role === 'manager') $$('.manager-only').forEach(el => el.classList.remove('hidden'));

  const saved = location.hash.slice(1) || 'dashboard';
  navigate(saved);

  $$('.nav-item').forEach(item => item.addEventListener('click', e => {
    e.preventDefault();
    navigate(item.dataset.view);
  }));
  $$('.qa-buttons [data-view]').forEach(b => b.addEventListener('click', () => navigate(b.dataset.view)));

  $('#sidebar-toggle')?.addEventListener('click', () => {
    $('#sidebar').classList.toggle('collapsed');
  });
}

// ── Router ─────────────────────────────────────────────
const TITLES = { dashboard:'Dashboard', customers:'Customers', leads:'Leads', opportunities:'Opportunities', activities:'Activities', inventory:'Inventory', reports:'Reports', users:'Users', audit:'Audit Logs', profile:'Profile' };

function navigate(view) {
  if (!VIEWS[view]) view = 'dashboard';
  if ((view === 'users' || view === 'audit') && S.user.role !== 'manager') { toast('Access denied','error'); return; }
  location.hash = view;
  $$('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.view === view));
  $('#page-title').textContent = TITLES[view] || cap(view);
  const vc = $('#view-container');
  vc.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:200px"><div class="loading-ring"></div></div>';
  VIEWS[view]();
}

// ── Chart helpers ──────────────────────────────────────
function chartDefaults() {
  const dark = S.theme === 'dark';
  return {
    gridColor: dark ? 'rgba(255,255,255,.07)' : 'rgba(0,0,0,.06)',
    textColor: dark ? '#94a3b8' : '#64748b',
  };
}

let _charts = {};
function makeChart(id, type, data, opts={}) {
  const canvas = $('#'+id);
  if (!canvas) return;
  if (_charts[id]) _charts[id].destroy();
  const { gridColor, textColor } = chartDefaults();
  _charts[id] = new Chart(canvas, {
    type,
    data,
    options: {
      responsive: true,
      animation: { duration: 400 },
      plugins: { legend: { labels: { color: textColor, font: { family:'Inter', size:12 }, boxWidth: 12 } } },
      scales: type !== 'doughnut' && type !== 'pie' ? {
        x: { ticks: { color: textColor, font:{size:11} }, grid: { color: gridColor } },
        y: { ticks: { color: textColor, font:{size:11} }, grid: { color: gridColor } },
      } : undefined,
      ...opts,
    }
  });
}

// ═══════════════════════════════════════════════════════
// VIEWS
// ═══════════════════════════════════════════════════════
const VIEWS = {};

// ── DASHBOARD ─────────────────────────────────────────
VIEWS.dashboard = async () => {
  const vc = $('#view-container');
  try {
    const [sum, growth, pipe, sources, emp] = await Promise.all([
      GET('/reports/summary'),
      GET('/reports/growth'),
      GET('/reports/pipeline'),
      GET('/reports/sources'),
      S.user.role === 'manager' ? GET('/reports/employees') : Promise.resolve({data:[]}),
    ]);
    const s = sum.data;
    const isManager = S.user.role === 'manager';

    vc.innerHTML = `
    <div class="view-header"><div><div class="view-title">Welcome back, ${S.user.name.split(' ')[0]} 👋</div><div class="view-subtitle">${new Date().toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</div></div></div>

    <div class="kpi-grid">
      <div class="kpi-card"><div class="kpi-icon purple" style="float:right"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg></div><div class="kpi-label">Total Customers</div><div class="kpi-value">${s.totalCustomers}</div><div class="kpi-sub"><span class="kpi-trend up">+${s.newCustomersThisMonth}</span> this month</div></div>
      <div class="kpi-card"><div class="kpi-icon blue" style="float:right"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg></div><div class="kpi-label">Active Leads</div><div class="kpi-value">${s.activeLeads}</div><div class="kpi-sub">of ${s.totalLeads} total</div></div>
      <div class="kpi-card"><div class="kpi-icon green" style="float:right"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg></div><div class="kpi-label">${isManager?'Total Revenue':'Pipeline Value'}</div><div class="kpi-value">${fmtMoney(isManager?s.totalRevenue:s.pipelineValue)}</div><div class="kpi-sub">won opportunities</div></div>
      <div class="kpi-card"><div class="kpi-icon amber" style="float:right"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/></svg></div><div class="kpi-label">Open Activities</div><div class="kpi-value">${s.openActivities}</div><div class="kpi-sub">pending follow-ups</div></div>
    </div>

    <div class="charts-grid">
      <div class="chart-card"><div class="chart-title">Customer Growth <span class="chart-subtitle">— last 12 months</span></div><canvas id="chart-growth"></canvas></div>
      <div class="chart-card"><div class="chart-title">Lead Sources</div><canvas id="chart-sources"></canvas></div>
    </div>

    ${isManager ? `<div class="charts-grid"><div class="chart-card"><div class="chart-title">Pipeline by Stage</div><canvas id="chart-pipeline"></canvas></div><div class="chart-card"><div class="chart-title">Employee Performance <span class="chart-subtitle">— deals won</span></div><canvas id="chart-emp"></canvas></div></div>` : `<div class="chart-card mb-20"><div class="chart-title">Opportunity Pipeline by Stage</div><canvas id="chart-pipeline"></canvas></div>`}
    `;

    const INDIGO='#6366f1', GREEN='#10b981', AMBER='#f59e0b', RED='#ef4444', CYAN='#06b6d4', PURPLE='#8b5cf6';
    const STAGE_COLORS = { prospecting:CYAN, proposal:AMBER, negotiation:PURPLE, won:GREEN, lost:RED };

    makeChart('chart-growth','line',{
      labels: growth.data.labels,
      datasets:[{ label:'New Customers', data:growth.data.data, borderColor:INDIGO, backgroundColor:'rgba(99,102,241,.12)', fill:true, tension:.45, pointRadius:3 }]
    });

    const src = sources.data.data;
    makeChart('chart-sources','doughnut',{
      labels: src.map(d=>cap(d.source)),
      datasets:[{ data:src.map(d=>d.count), backgroundColor:[INDIGO,GREEN,AMBER,RED,CYAN,PURPLE], borderWidth:0 }]
    },{plugins:{legend:{position:'right'}}});

    const pipeData = pipe.data.data;
    makeChart('chart-pipeline','bar',{
      labels: pipeData.map(d=>cap(d.stage)),
      datasets:[{ label:'Opportunities', data:pipeData.map(d=>d.count), backgroundColor:pipeData.map(d=>STAGE_COLORS[d.stage]||INDIGO), borderRadius:4 }]
    },{ plugins:{legend:{display:false}} });

    if (isManager && emp.data.length) {
      makeChart('chart-emp','bar',{
        labels: emp.data.map(d=>d.name.split(' ')[0]),
        datasets:[{ label:'Deals Won', data:emp.data.map(d=>d.won), backgroundColor:GREEN, borderRadius:4 }]
      },{ plugins:{legend:{display:false}} });
    }
  } catch(ex) { vc.innerHTML = `<p class="text-muted">${ex.message}</p>`; }
};

// ── CUSTOMERS ─────────────────────────────────────────
VIEWS.customers = async () => {
  const vc = $('#view-container');
  let customers = [], users = [];
  try {
    [{ data: customers }, { data: users }] = await Promise.all([GET('/customers'), GET('/users')]);
  } catch {}

  const isManager = S.user.role === 'manager';

  const render = (list) => {
    const tbody = $('#cust-tbody');
    if (!tbody) return;
    tbody.innerHTML = list.length ? list.map(c => `
      <tr>
        <td><div class="cell-primary">${c.name}</div><div style="font-size:.75rem;color:var(--text-dim)">${c.company||'—'}</div></td>
        <td>${c.email||'—'}</td>
        <td>${c.phone||'—'}</td>
        <td>${c.industry||'—'}</td>
        <td><span class="pill pill-${c.status}">${cap(c.status)}</span></td>
        <td>${c.assignedTo?.name||'—'}</td>
        <td class="table-actions">
          <button class="btn btn-ghost btn-sm" onclick="editCustomer('${c._id}')">Edit</button>
          ${isManager?`<button class="btn btn-danger btn-sm" onclick="delCustomer('${c._id}','${c.name}')">Del</button>`:''}
        </td>
      </tr>`).join('') : '<tr class="empty-row"><td colspan="7">No customers found</td></tr>';
  };

  vc.innerHTML = `
  <div class="view-header">
    <div><div class="view-title">Customers</div><div class="view-subtitle">${customers.length} total</div></div>
    <button class="btn btn-primary" onclick="openNewCustomer()">+ Add Customer</button>
  </div>
  <div class="table-card">
    <div class="table-card-header">
      <div class="table-card-title">All Customers</div>
      <div class="table-toolbar">
        <input type="text" class="toolbar-input" id="cust-search" placeholder="Search…" />
        <select class="toolbar-input" id="cust-status-filter">
          <option value="">All Statuses</option><option>active</option><option>inactive</option><option>prospect</option>
        </select>
      </div>
    </div>
    <div style="overflow-x:auto">
    <table class="data-table"><thead><tr><th>Name / Company</th><th>Email</th><th>Phone</th><th>Industry</th><th>Status</th><th>Assigned To</th><th></th></tr></thead><tbody id="cust-tbody"></tbody></table>
    </div>
  </div>`;

  render(customers);

  const filterFn = () => {
    const q = $('#cust-search').value.toLowerCase();
    const st = $('#cust-status-filter').value;
    render(customers.filter(c => {
      const match = !q || [c.name,c.company,c.email].some(v=>(v||'').toLowerCase().includes(q));
      return match && (!st || c.status===st);
    }));
  };
  $('#cust-search').addEventListener('input', filterFn);
  $('#cust-status-filter').addEventListener('change', filterFn);

  window.openNewCustomer = () => openCustomerModal(null, users, customers);
  window.editCustomer = (id) => openCustomerModal(customers.find(c=>c._id===id), users, customers);
  window.delCustomer = async (id, name) => {
    if (!await confirm('Delete customer', `Delete "${name}"? This cannot be undone.`)) return;
    try { await DEL('/customers/'+id); toast('Customer deleted'); VIEWS.customers(); } catch(ex){ toast(ex.message,'error'); }
  };
};

function openCustomerModal(c, users) {
  const isEdit = !!c;
  const userOpts = users.filter(u=>u.role==='admin').map(u=>`<option value="${u._id}" ${c?.assignedTo?._id===u._id?'selected':''}>${u.name}</option>`).join('');
  openModal(isEdit?'Edit Customer':'New Customer', `
    <form id="cust-form">
      <div class="form-row"><div class="form-group"><label class="form-label">Full Name *</label><input class="form-input" id="cf-name" value="${c?.name||''}" required /></div>
      <div class="form-group"><label class="form-label">Company</label><input class="form-input" id="cf-company" value="${c?.company||''}" /></div></div>
      <div class="form-row"><div class="form-group"><label class="form-label">Email</label><input type="email" class="form-input" id="cf-email" value="${c?.email||''}" /></div>
      <div class="form-group"><label class="form-label">Phone</label><input class="form-input" id="cf-phone" value="${c?.phone||''}" /></div></div>
      <div class="form-row"><div class="form-group"><label class="form-label">Status</label><select class="form-select" id="cf-status"><option value="prospect" ${c?.status==='prospect'?'selected':''}>Prospect</option><option value="active" ${c?.status==='active'?'selected':''}>Active</option><option value="inactive" ${c?.status==='inactive'?'selected':''}>Inactive</option></select></div>
      <div class="form-group"><label class="form-label">Industry</label><input class="form-input" id="cf-industry" value="${c?.industry||''}" /></div></div>
      <div class="form-row"><div class="form-group"><label class="form-label">Assigned To</label><select class="form-select" id="cf-assigned"><option value="">Unassigned</option>${userOpts}</select></div>
      <div class="form-group"><label class="form-label">Address</label><input class="form-input" id="cf-address" value="${c?.address||''}" /></div></div>
      <div class="form-group"><label class="form-label">Notes</label><textarea class="form-textarea" id="cf-notes">${c?.notes||''}</textarea></div>
      <div id="cust-form-err" class="form-error hidden"></div>
      <div style="display:flex;gap:10px;justify-content:flex-end"><button type="button" class="btn btn-ghost" onclick="closeModal()">Cancel</button><button type="submit" class="btn btn-primary">${isEdit?'Save Changes':'Create Customer'}</button></div>
    </form>`);

  $('#cust-form').addEventListener('submit', async e => {
    e.preventDefault();
    const payload = { name:$('#cf-name').value.trim(), company:$('#cf-company').value.trim(), email:$('#cf-email').value.trim(), phone:$('#cf-phone').value.trim(), status:$('#cf-status').value, industry:$('#cf-industry').value.trim(), address:$('#cf-address').value.trim(), notes:$('#cf-notes').value.trim(), assignedTo:$('#cf-assigned').value||null };
    try {
      if (isEdit) await PATCH('/customers/'+c._id, payload); else await POST('/customers', payload);
      toast(isEdit?'Customer updated':'Customer created','success');
      closeModal(); VIEWS.customers();
    } catch(ex) { const err=$('#cust-form-err'); err.textContent=ex.message; err.classList.remove('hidden'); }
  });
}

// ── LEADS ─────────────────────────────────────────────
VIEWS.leads = async () => {
  const vc = $('#view-container');
  let leads=[], users=[];
  try { [{data:leads},{data:users}]=await Promise.all([GET('/leads'),GET('/users')]); } catch{}

  const render = (list) => {
    const tbody = $('#leads-tbody');
    if (!tbody) return;
    tbody.innerHTML = list.length ? list.map(l=>`
      <tr>
        <td><div class="cell-primary">${l.name}</div><div style="font-size:.75rem;color:var(--text-dim)">${l.company||'—'}</div></td>
        <td>${l.email||'—'}</td>
        <td><span class="pill pill-${l.source?.replace('-','')}" style="background:var(--surface-2);color:var(--text-muted)">${cap(l.source)}</span></td>
        <td><span class="pill pill-${l.status}">${cap(l.status)}</span></td>
        <td>${fmtMoney(l.value)}</td>
        <td>${l.owner?.name||'—'}</td>
        <td class="table-actions">
          <button class="btn btn-ghost btn-sm" onclick="editLead('${l._id}')">Edit</button>
          <button class="btn btn-danger btn-sm" onclick="delLead('${l._id}','${l.name}')">Del</button>
        </td>
      </tr>`).join('') : '<tr class="empty-row"><td colspan="7">No leads</td></tr>';
  };

  vc.innerHTML = `
  <div class="view-header">
    <div><div class="view-title">Leads</div><div class="view-subtitle">${leads.length} total</div></div>
    <button class="btn btn-primary" onclick="openNewLead()">+ Add Lead</button>
  </div>
  <div class="table-card">
    <div class="table-card-header">
      <div class="table-card-title">All Leads</div>
      <div class="table-toolbar">
        <input type="text" class="toolbar-input" id="lead-search" placeholder="Search…" />
        <select class="toolbar-input" id="lead-status-filter"><option value="">All Statuses</option><option>new</option><option>contacted</option><option>qualified</option><option>lost</option></select>
      </div>
    </div>
    <div style="overflow-x:auto"><table class="data-table"><thead><tr><th>Name</th><th>Email</th><th>Source</th><th>Status</th><th>Value</th><th>Owner</th><th></th></tr></thead><tbody id="leads-tbody"></tbody></table></div>
  </div>`;

  render(leads);
  const f=()=>{ const q=$('#lead-search').value.toLowerCase(),st=$('#lead-status-filter').value; render(leads.filter(l=>(!q||[l.name,l.company,l.email].some(v=>(v||'').toLowerCase().includes(q)))&&(!st||l.status===st))); };
  $('#lead-search').addEventListener('input',f); $('#lead-status-filter').addEventListener('change',f);
  window.openNewLead = () => openLeadModal(null, users);
  window.editLead = id => openLeadModal(leads.find(l=>l._id===id), users);
  window.delLead = async (id,name) => {
    if (!await confirm('Delete lead',`Delete "${name}"?`)) return;
    try { await DEL('/leads/'+id); toast('Lead deleted'); VIEWS.leads(); } catch(ex){toast(ex.message,'error');}
  };
};

function openLeadModal(l, users) {
  const isEdit=!!l;
  const ownerOpts=users.map(u=>`<option value="${u._id}" ${l?.owner?._id===u._id?'selected':''}>${u.name}</option>`).join('');
  openModal(isEdit?'Edit Lead':'New Lead',`
    <form id="lead-form">
      <div class="form-row"><div class="form-group"><label class="form-label">Name *</label><input class="form-input" id="lf-name" value="${l?.name||''}" required /></div>
      <div class="form-group"><label class="form-label">Company</label><input class="form-input" id="lf-company" value="${l?.company||''}" /></div></div>
      <div class="form-row"><div class="form-group"><label class="form-label">Email</label><input type="email" class="form-input" id="lf-email" value="${l?.email||''}" /></div>
      <div class="form-group"><label class="form-label">Phone</label><input class="form-input" id="lf-phone" value="${l?.phone||''}" /></div></div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Source</label><select class="form-select" id="lf-source">${['website','referral','social','email','cold-call','other'].map(s=>`<option value="${s}" ${l?.source===s?'selected':''}>${cap(s)}</option>`).join('')}</select></div>
        <div class="form-group"><label class="form-label">Status</label><select class="form-select" id="lf-status">${['new','contacted','qualified','lost'].map(s=>`<option value="${s}" ${l?.status===s?'selected':''}>${cap(s)}</option>`).join('')}</select></div>
      </div>
      <div class="form-row"><div class="form-group"><label class="form-label">Value (£)</label><input type="number" class="form-input" id="lf-value" value="${l?.value||0}" /></div>
      <div class="form-group"><label class="form-label">Owner</label><select class="form-select" id="lf-owner">${ownerOpts}</select></div></div>
      <div class="form-group"><label class="form-label">Notes</label><textarea class="form-textarea" id="lf-notes">${l?.notes||''}</textarea></div>
      <div id="lead-form-err" class="form-error hidden"></div>
      <div style="display:flex;gap:10px;justify-content:flex-end"><button type="button" class="btn btn-ghost" onclick="closeModal()">Cancel</button><button type="submit" class="btn btn-primary">${isEdit?'Save':'Create Lead'}</button></div>
    </form>`);
  $('#lead-form').addEventListener('submit', async e=>{
    e.preventDefault();
    const payload={name:$('#lf-name').value.trim(),company:$('#lf-company').value.trim(),email:$('#lf-email').value.trim(),phone:$('#lf-phone').value.trim(),source:$('#lf-source').value,status:$('#lf-status').value,value:Number($('#lf-value').value),owner:$('#lf-owner').value,notes:$('#lf-notes').value.trim()};
    try{if(isEdit)await PATCH('/leads/'+l._id,payload);else await POST('/leads',payload);toast(isEdit?'Lead updated':'Lead created','success');closeModal();VIEWS.leads();}catch(ex){const e2=$('#lead-form-err');e2.textContent=ex.message;e2.classList.remove('hidden');}
  });
}

// ── OPPORTUNITIES ─────────────────────────────────────
VIEWS.opportunities = async () => {
  const vc=$('#view-container');
  let opps=[],customers=[],users=[];
  try{[{data:opps},{data:customers},{data:users}]=await Promise.all([GET('/opportunities'),GET('/customers'),GET('/users')]);}catch{}

  const stageInfo={prospecting:{color:'var(--info)',label:'Prospecting'},proposal:{color:'var(--warning)',label:'Proposal'},negotiation:{color:'var(--purple)',label:'Negotiation'},won:{color:'var(--success)',label:'Won'},lost:{color:'var(--danger)',label:'Lost'}};
  const stageCounts={};
  for(const o of opps){ stageCounts[o.stage]=(stageCounts[o.stage]||0)+1; }

  const render=(list)=>{
    const tbody=$('#opp-tbody');
    if(!tbody)return;
    tbody.innerHTML=list.length?list.map(o=>`
      <tr>
        <td class="cell-primary">${o.title}</td>
        <td>${o.customer?.name||'—'}<div style="font-size:.75rem;color:var(--text-dim)">${o.customer?.company||''}</div></td>
        <td><span class="pill pill-${o.stage}">${cap(o.stage)}</span></td>
        <td>${fmtMoney(o.amount)}</td>
        <td>${o.probability}%</td>
        <td>${o.owner?.name||'—'}</td>
        <td>${fmtDate(o.closeDate)}</td>
        <td class="table-actions"><button class="btn btn-ghost btn-sm" onclick="editOpp('${o._id}')">Edit</button><button class="btn btn-danger btn-sm" onclick="delOpp('${o._id}','${o.title.replace(/'/g,'`')}')">Del</button></td>
      </tr>`).join(''):'<tr class="empty-row"><td colspan="8">No opportunities</td></tr>';
  };

  vc.innerHTML=`
  <div class="view-header"><div><div class="view-title">Opportunities</div></div><button class="btn btn-primary" onclick="openNewOpp()">+ New Opportunity</button></div>
  <div class="pipeline-stages">
    ${['prospecting','proposal','negotiation','won','lost'].map(s=>`<div class="pipeline-stage"><div class="pipeline-stage-label">${cap(s)}</div><div class="pipeline-stage-count" style="color:${stageInfo[s].color}">${stageCounts[s]||0}</div><div class="pipeline-stage-value">${fmtMoney(opps.filter(o=>o.stage===s).reduce((a,o)=>a+o.amount,0))}</div></div>`).join('')}
  </div>
  <div class="table-card">
    <div class="table-card-header"><div class="table-card-title">All Opportunities</div>
    <div class="table-toolbar"><input type="text" class="toolbar-input" id="opp-search" placeholder="Search…" /><select class="toolbar-input" id="opp-stage-filter"><option value="">All Stages</option>${['prospecting','proposal','negotiation','won','lost'].map(s=>`<option>${s}</option>`).join('')}</select></div></div>
    <div style="overflow-x:auto"><table class="data-table"><thead><tr><th>Title</th><th>Customer</th><th>Stage</th><th>Amount</th><th>Probability</th><th>Owner</th><th>Close Date</th><th></th></tr></thead><tbody id="opp-tbody"></tbody></table></div>
  </div>`;

  render(opps);
  const f=()=>{const q=$('#opp-search').value.toLowerCase(),st=$('#opp-stage-filter').value;render(opps.filter(o=>(!q||(o.title||'').toLowerCase().includes(q))&&(!st||o.stage===st)));};
  $('#opp-search').addEventListener('input',f);$('#opp-stage-filter').addEventListener('change',f);
  window.openNewOpp=()=>openOppModal(null,customers,users);
  window.editOpp=id=>openOppModal(opps.find(o=>o._id===id),customers,users);
  window.delOpp=async(id,title)=>{if(!await confirm('Delete opportunity',`Delete "${title}"?`))return;try{await DEL('/opportunities/'+id);toast('Deleted');VIEWS.opportunities();}catch(ex){toast(ex.message,'error');}};
};

function openOppModal(o,customers,users){
  const isEdit=!!o;
  const custOpts=customers.map(c=>`<option value="${c._id}" ${o?.customer?._id===c._id?'selected':''}>${c.name} — ${c.company||'—'}</option>`).join('');
  const ownerOpts=users.map(u=>`<option value="${u._id}" ${o?.owner?._id===u._id?'selected':''}>${u.name}</option>`).join('');
  const closeVal=o?.closeDate?new Date(o.closeDate).toISOString().split('T')[0]:'';
  openModal(isEdit?'Edit Opportunity':'New Opportunity',`
    <form id="opp-form">
      <div class="form-group"><label class="form-label">Title *</label><input class="form-input" id="of-title" value="${o?.title||''}" required /></div>
      <div class="form-row"><div class="form-group"><label class="form-label">Customer</label><select class="form-select" id="of-customer"><option value="">— Select —</option>${custOpts}</select></div>
      <div class="form-group"><label class="form-label">Stage</label><select class="form-select" id="of-stage">${['prospecting','proposal','negotiation','won','lost'].map(s=>`<option value="${s}" ${o?.stage===s?'selected':''}>${cap(s)}</option>`).join('')}</select></div></div>
      <div class="form-row"><div class="form-group"><label class="form-label">Amount (£)</label><input type="number" class="form-input" id="of-amount" value="${o?.amount||0}" /></div>
      <div class="form-group"><label class="form-label">Probability (%)</label><input type="number" class="form-input" id="of-prob" min="0" max="100" value="${o?.probability||0}" /></div></div>
      <div class="form-row"><div class="form-group"><label class="form-label">Owner</label><select class="form-select" id="of-owner">${ownerOpts}</select></div>
      <div class="form-group"><label class="form-label">Close Date</label><input type="date" class="form-input" id="of-close" value="${closeVal}" /></div></div>
      <div class="form-group"><label class="form-label">Notes</label><textarea class="form-textarea" id="of-notes">${o?.notes||''}</textarea></div>
      <div id="opp-form-err" class="form-error hidden"></div>
      <div style="display:flex;gap:10px;justify-content:flex-end"><button type="button" class="btn btn-ghost" onclick="closeModal()">Cancel</button><button type="submit" class="btn btn-primary">${isEdit?'Save':'Create'}</button></div>
    </form>`);
  $('#opp-form').addEventListener('submit',async e=>{
    e.preventDefault();
    const payload={title:$('#of-title').value.trim(),customer:$('#of-customer').value||null,stage:$('#of-stage').value,amount:Number($('#of-amount').value),probability:Number($('#of-prob').value),owner:$('#of-owner').value,closeDate:$('#of-close').value||null,notes:$('#of-notes').value.trim()};
    try{if(isEdit)await PATCH('/opportunities/'+o._id,payload);else await POST('/opportunities',payload);toast(isEdit?'Updated':'Created','success');closeModal();VIEWS.opportunities();}catch(ex){const e2=$('#opp-form-err');e2.textContent=ex.message;e2.classList.remove('hidden');}
  });
}

// ── ACTIVITIES ─────────────────────────────────────────
VIEWS.activities = async () => {
  const vc=$('#view-container');
  let acts=[],users=[];
  try{[{data:acts},{data:users}]=await Promise.all([GET('/activities'),GET('/users')]);}catch{}

  const render=(list)=>{
    const tbody=$('#act-tbody');
    if(!tbody)return;
    tbody.innerHTML=list.length?list.map(a=>`
      <tr class="${a.completed?'completed-row':''}">
        <td><span class="pill pill-${a.type}">${cap(a.type)}</span></td>
        <td class="cell-primary" style="max-width:260px">${a.note||'—'}</td>
        <td>${a.owner?.name||'—'}</td>
        <td>${fmtDate(a.dueDate)}</td>
        <td><span class="pill ${a.completed?'pill-active':'pill-prospect'}">${a.completed?'Done':'Pending'}</span></td>
        <td class="table-actions">
          ${!a.completed?`<button class="btn btn-success btn-sm" onclick="completeAct('${a._id}')">✓ Done</button>`:''}
          <button class="btn btn-ghost btn-sm" onclick="editAct('${a._id}')">Edit</button>
          <button class="btn btn-danger btn-sm" onclick="delAct('${a._id}')">Del</button>
        </td>
      </tr>`).join(''):'<tr class="empty-row"><td colspan="6">No activities</td></tr>';
  };

  vc.innerHTML=`
  <div class="view-header"><div><div class="view-title">Activities</div></div><button class="btn btn-primary" onclick="openNewAct()">+ Log Activity</button></div>
  <div class="table-card">
    <div class="table-card-header"><div class="table-card-title">Activity Log</div>
    <div class="table-toolbar">
      <select class="toolbar-input" id="act-type-filter"><option value="">All Types</option><option>call</option><option>email</option><option>meeting</option><option>task</option></select>
      <select class="toolbar-input" id="act-done-filter"><option value="">All</option><option value="false">Pending</option><option value="true">Completed</option></select>
    </div></div>
    <div style="overflow-x:auto"><table class="data-table"><thead><tr><th>Type</th><th>Note</th><th>Owner</th><th>Due Date</th><th>Status</th><th></th></tr></thead><tbody id="act-tbody"></tbody></table></div>
  </div>`;

  render(acts);
  const f=()=>{const t=$('#act-type-filter').value,d=$('#act-done-filter').value;render(acts.filter(a=>(!t||a.type===t)&&(d===''||String(a.completed)===d)));};
  $('#act-type-filter').addEventListener('change',f);$('#act-done-filter').addEventListener('change',f);
  window.openNewAct=()=>openActModal(null,users);
  window.editAct=id=>openActModal(acts.find(a=>a._id===id),users);
  window.completeAct=async(id)=>{try{await PATCH('/activities/'+id,{completed:true});toast('Marked complete','success');VIEWS.activities();}catch(ex){toast(ex.message,'error');}};
  window.delAct=async(id)=>{if(!await confirm('Delete activity','Delete this activity?'))return;try{await DEL('/activities/'+id);toast('Deleted');VIEWS.activities();}catch(ex){toast(ex.message,'error');}};
};

function openActModal(a,users){
  const isEdit=!!a;
  const ownerOpts=users.map(u=>`<option value="${u._id}" ${a?.owner?._id===u._id?'selected':''}>${u.name}</option>`).join('');
  const dueVal=a?.dueDate?new Date(a.dueDate).toISOString().split('T')[0]:'';
  openModal(isEdit?'Edit Activity':'Log Activity',`
    <form id="act-form">
      <div class="form-row"><div class="form-group"><label class="form-label">Type *</label><select class="form-select" id="af-type">${['call','email','meeting','task'].map(t=>`<option value="${t}" ${a?.type===t?'selected':''}>${cap(t)}</option>`).join('')}</select></div>
      <div class="form-group"><label class="form-label">Due Date</label><input type="date" class="form-input" id="af-due" value="${dueVal}" /></div></div>
      <div class="form-group"><label class="form-label">Owner</label><select class="form-select" id="af-owner">${ownerOpts}</select></div>
      <div class="form-group"><label class="form-label">Note</label><textarea class="form-textarea" id="af-note">${a?.note||''}</textarea></div>
      ${isEdit?`<label class="checkbox-item"><input type="checkbox" id="af-done" ${a?.completed?'checked':''} /><span>Mark as completed</span></label>`:''}
      <div id="act-form-err" class="form-error hidden"></div>
      <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:16px"><button type="button" class="btn btn-ghost" onclick="closeModal()">Cancel</button><button type="submit" class="btn btn-primary">${isEdit?'Save':'Log Activity'}</button></div>
    </form>`);
  $('#act-form').addEventListener('submit',async e=>{
    e.preventDefault();
    const payload={type:$('#af-type').value,note:$('#af-note').value.trim(),dueDate:$('#af-due').value||null,owner:$('#af-owner').value,...(isEdit?{completed:$('#af-done')?.checked}:{})};
    try{if(isEdit)await PATCH('/activities/'+a._id,payload);else await POST('/activities',payload);toast(isEdit?'Updated':'Logged','success');closeModal();VIEWS.activities();}catch(ex){const e2=$('#act-form-err');e2.textContent=ex.message;e2.classList.remove('hidden');}
  });
}

// ── INVENTORY ──────────────────────────────────────────
VIEWS.inventory = async () => {
  const vc=$('#view-container');
  let items=[];
  try{({data:items}=await GET('/inventory'));}catch{}
  const isManager=S.user.role==='manager';

  const render=(list)=>{
    const tbody=$('#inv-tbody');
    if(!tbody)return;
    tbody.innerHTML=list.length?list.map(i=>{const low=i.quantity<=i.lowStockThreshold;return`<tr>
      <td class="cell-mono">${i.sku}</td>
      <td class="cell-primary">${i.productName}</td>
      <td>${i.category||'—'}</td>
      <td><span style="color:${low?'var(--danger)':'var(--success)'}">${i.quantity}</span>${low?` <span class="pill pill-lost" style="font-size:.65rem">Low</span>`:''}</td>
      <td>${fmtMoney(i.price)}</td>
      <td>${i.supplier||'—'}</td>
      <td class="table-actions">
        <button class="btn btn-ghost btn-sm" onclick="editItem('${i._id}')">Edit</button>
        ${isManager?`<button class="btn btn-danger btn-sm" onclick="delItem('${i._id}','${i.productName.replace(/'/g,'`')}')">Del</button>`:''}
      </td></tr>`;}).join(''):'<tr class="empty-row"><td colspan="7">No items</td></tr>';
  };

  vc.innerHTML=`
  <div class="view-header"><div><div class="view-title">Inventory</div></div><button class="btn btn-primary" onclick="openNewItem()">+ Add Item</button></div>
  <div class="table-card">
    <div class="table-card-header"><div class="table-card-title">Stock</div>
    <div class="table-toolbar"><input type="text" class="toolbar-input" id="inv-search" placeholder="Search…" /><label class="checkbox-item"><input type="checkbox" id="inv-low-filter" /><span>Low stock only</span></label></div></div>
    <div style="overflow-x:auto"><table class="data-table"><thead><tr><th>SKU</th><th>Product</th><th>Category</th><th>Qty</th><th>Price</th><th>Supplier</th><th></th></tr></thead><tbody id="inv-tbody"></tbody></table></div>
  </div>`;

  render(items);
  const f=()=>{const q=$('#inv-search').value.toLowerCase(),low=$('#inv-low-filter').checked;render(items.filter(i=>(!q||[i.sku,i.productName,i.category].some(v=>(v||'').toLowerCase().includes(q)))&&(!low||i.quantity<=i.lowStockThreshold)));};
  $('#inv-search').addEventListener('input',f);$('#inv-low-filter').addEventListener('change',f);
  window.openNewItem=()=>openItemModal(null);
  window.editItem=id=>openItemModal(items.find(i=>i._id===id));
  window.delItem=async(id,name)=>{if(!await confirm('Delete item',`Delete "${name}"?`))return;try{await DEL('/inventory/'+id);toast('Deleted');VIEWS.inventory();}catch(ex){toast(ex.message,'error');}};
};

function openItemModal(it){
  const isEdit=!!it;
  openModal(isEdit?'Edit Item':'Add Inventory Item',`
    <form id="item-form">
      <div class="form-row"><div class="form-group"><label class="form-label">SKU *</label><input class="form-input" id="if-sku" value="${it?.sku||''}" required /></div>
      <div class="form-group"><label class="form-label">Product Name *</label><input class="form-input" id="if-name" value="${it?.productName||''}" required /></div></div>
      <div class="form-row"><div class="form-group"><label class="form-label">Category</label><input class="form-input" id="if-cat" value="${it?.category||''}" /></div>
      <div class="form-group"><label class="form-label">Supplier</label><input class="form-input" id="if-supplier" value="${it?.supplier||''}" /></div></div>
      <div class="form-row"><div class="form-group"><label class="form-label">Quantity</label><input type="number" class="form-input" id="if-qty" value="${it?.quantity||0}" min="0" /></div>
      <div class="form-group"><label class="form-label">Price (£)</label><input type="number" class="form-input" id="if-price" value="${it?.price||0}" step="0.01" /></div></div>
      <div class="form-group"><label class="form-label">Low Stock Threshold</label><input type="number" class="form-input" id="if-thresh" value="${it?.lowStockThreshold||10}" min="0" /></div>
      <div id="item-form-err" class="form-error hidden"></div>
      <div style="display:flex;gap:10px;justify-content:flex-end"><button type="button" class="btn btn-ghost" onclick="closeModal()">Cancel</button><button type="submit" class="btn btn-primary">${isEdit?'Save':'Add Item'}</button></div>
    </form>`);
  $('#item-form').addEventListener('submit',async e=>{
    e.preventDefault();
    const payload={sku:$('#if-sku').value.trim().toUpperCase(),productName:$('#if-name').value.trim(),category:$('#if-cat').value.trim(),supplier:$('#if-supplier').value.trim(),quantity:Number($('#if-qty').value),price:Number($('#if-price').value),lowStockThreshold:Number($('#if-thresh').value)};
    try{if(isEdit)await PATCH('/inventory/'+it._id,payload);else await POST('/inventory',payload);toast(isEdit?'Updated':'Created','success');closeModal();VIEWS.inventory();}catch(ex){const e2=$('#item-form-err');e2.textContent=ex.message;e2.classList.remove('hidden');}
  });
}

// ── REPORTS ───────────────────────────────────────────
VIEWS.reports = async () => {
  const vc=$('#view-container');
  try{
    const[sum,growth,pipe,sources,emp]=await Promise.all([GET('/reports/summary'),GET('/reports/growth'),GET('/reports/pipeline'),GET('/reports/sources'),S.user.role==='manager'?GET('/reports/employees'):Promise.resolve({data:[]})]);
    const s=sum.data;
    vc.innerHTML=`
    <div class="view-header"><div class="view-title">Reports & Analytics</div></div>
    <div class="kpi-grid" style="grid-template-columns:repeat(3,1fr)">
      <div class="kpi-card"><div class="kpi-label">Total Revenue (Won)</div><div class="kpi-value">${fmtMoney(s.totalRevenue)}</div></div>
      <div class="kpi-card"><div class="kpi-label">Pipeline Value</div><div class="kpi-value">${fmtMoney(s.pipelineValue)}</div></div>
      <div class="kpi-card"><div class="kpi-label">Lead Conversion</div><div class="kpi-value">${s.totalLeads?Math.round((s.activeLeads/s.totalLeads)*100):0}%</div></div>
    </div>
    <div class="charts-grid">
      <div class="chart-card"><div class="chart-title">Customer Acquisition — last 12 months</div><canvas id="r-growth"></canvas></div>
      <div class="chart-card"><div class="chart-title">Lead Source Distribution</div><canvas id="r-sources"></canvas></div>
    </div>
    <div class="charts-grid">
      <div class="chart-card"><div class="chart-title">Pipeline Value by Stage</div><canvas id="r-pipe"></canvas></div>
      ${S.user.role==='manager'?`<div class="chart-card"><div class="chart-title">Revenue by Team Member</div><canvas id="r-emp"></canvas></div>`:'<div class="chart-card"><div class="chart-title">Opportunities by Stage</div><canvas id="r-opps"></canvas></div>'}
    </div>`;

    const COLORS=['#6366f1','#10b981','#f59e0b','#ef4444','#06b6d4','#8b5cf6'];
    makeChart('r-growth','line',{labels:growth.data.labels,datasets:[{label:'New Customers',data:growth.data.data,borderColor:'#6366f1',backgroundColor:'rgba(99,102,241,.1)',fill:true,tension:.4}]});
    const src=sources.data.data;
    makeChart('r-sources','doughnut',{labels:src.map(d=>cap(d.source)),datasets:[{data:src.map(d=>d.count),backgroundColor:COLORS,borderWidth:0}]},{plugins:{legend:{position:'right'}}});
    const pd=pipe.data.data;
    makeChart('r-pipe','bar',{labels:pd.map(d=>cap(d.stage)),datasets:[{label:'Pipeline Value (£)',data:pd.map(d=>d.value),backgroundColor:COLORS,borderRadius:4}]},{plugins:{legend:{display:false}}});
    if(S.user.role==='manager'&&emp.data.length){
      makeChart('r-emp','bar',{labels:emp.data.map(d=>d.name.split(' ')[0]),datasets:[{label:'Revenue Won (£)',data:emp.data.map(d=>d.revenue),backgroundColor:'#10b981',borderRadius:4}]},{plugins:{legend:{display:false}}});
    } else {
      makeChart('r-opps','bar',{labels:pd.map(d=>cap(d.stage)),datasets:[{label:'Count',data:pd.map(d=>d.count),backgroundColor:COLORS,borderRadius:4}]},{plugins:{legend:{display:false}}});
    }
  }catch(ex){vc.innerHTML=`<p class="text-muted">${ex.message}</p>`;}
};

// ── USERS (Manager only) ───────────────────────────────
VIEWS.users = async () => {
  const vc=$('#view-container');
  if(S.user.role!=='manager'){vc.innerHTML='<p class="text-muted">Access denied.</p>';return;}
  let users=[];
  try{({data:users}=await GET('/users'));}catch{}

  const render=(list)=>{
    const tbody=$('#usr-tbody');
    if(!tbody)return;
    tbody.innerHTML=list.length?list.map(u=>`
      <tr>
        <td><div class="cell-primary">${u.name}</div></td>
        <td>${u.email}</td>
        <td><span class="pill pill-${u.role}">${cap(u.role)}</span></td>
        <td><span class="pill ${u.isActive?'pill-active':'pill-inactive'}">${u.isActive?'Active':'Inactive'}</span></td>
        <td>${fmtDate(u.createdAt)}</td>
        <td class="table-actions">
          <button class="btn btn-ghost btn-sm" onclick="editUser('${u._id}')">Edit</button>
          ${u._id!==S.user._id?`<button class="btn btn-danger btn-sm" onclick="deactivateUser('${u._id}','${u.name}','${u.isActive}')"> ${u.isActive?'Deactivate':'Reactivate'}</button>`:''}
        </td>
      </tr>`).join(''):'<tr class="empty-row"><td colspan="6">No users</td></tr>';
  };

  vc.innerHTML=`
  <div class="view-header"><div><div class="view-title">User Management</div></div><button class="btn btn-primary" onclick="openNewUser()">+ Create User</button></div>
  <div class="table-card">
    <div class="table-card-header"><div class="table-card-title">All Users</div>
    <div class="table-toolbar"><select class="toolbar-input" id="usr-role-filter"><option value="">All Roles</option><option>manager</option><option>admin</option></select></div></div>
    <div style="overflow-x:auto"><table class="data-table"><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Joined</th><th></th></tr></thead><tbody id="usr-tbody"></tbody></table></div>
  </div>`;

  render(users);
  $('#usr-role-filter').addEventListener('change',()=>{const r=$('#usr-role-filter').value;render(r?users.filter(u=>u.role===r):users);});
  window.openNewUser=()=>openUserModal(null);
  window.editUser=id=>openUserModal(users.find(u=>u._id===id));
  window.deactivateUser=async(id,name,isActive)=>{
    const action=isActive==='true'?'deactivate':'reactivate';
    if(!await confirm(`${cap(action)} user`,`${cap(action)} "${name}"?`))return;
    try{await PATCH('/users/'+id,{isActive:isActive!=='true'});toast(`User ${action}d`,'success');VIEWS.users();}catch(ex){toast(ex.message,'error');}
  };
};

function openUserModal(u){
  const isEdit=!!u;
  openModal(isEdit?'Edit User':'Create User',`
    <form id="usr-form">
      <div class="form-row"><div class="form-group"><label class="form-label">Full Name *</label><input class="form-input" id="uf-name" value="${u?.name||''}" required /></div>
      <div class="form-group"><label class="form-label">Email *</label><input type="email" class="form-input" id="uf-email" value="${u?.email||''}" required /></div></div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Role</label><select class="form-select" id="uf-role"><option value="admin" ${u?.role==='admin'?'selected':''}>Admin</option><option value="manager" ${u?.role==='manager'?'selected':''}>Manager</option></select></div>
        ${!isEdit?`<div class="form-group"><label class="form-label">Password *</label><input type="password" class="form-input" id="uf-pass" required /></div>`:''}
      </div>
      <div id="usr-form-err" class="form-error hidden"></div>
      <div style="display:flex;gap:10px;justify-content:flex-end"><button type="button" class="btn btn-ghost" onclick="closeModal()">Cancel</button><button type="submit" class="btn btn-primary">${isEdit?'Save':'Create'}</button></div>
    </form>`);
  $('#usr-form').addEventListener('submit',async e=>{
    e.preventDefault();
    const payload={name:$('#uf-name').value.trim(),email:$('#uf-email').value.trim(),role:$('#uf-role').value,...(!isEdit&&{password:$('#uf-pass').value})};
    try{if(isEdit)await PATCH('/users/'+u._id,payload);else await POST('/users',payload);toast(isEdit?'Updated':'Created','success');closeModal();VIEWS.users();}catch(ex){const e2=$('#usr-form-err');e2.textContent=ex.message;e2.classList.remove('hidden');}
  });
}

// ── AUDIT LOGS (Manager only) ──────────────────────────
VIEWS.audit = async () => {
  const vc=$('#view-container');
  if(S.user.role!=='manager'){vc.innerHTML='<p class="text-muted">Access denied.</p>';return;}
  let logs=[];
  try{({data:logs}=await GET('/audit'));}catch{}

  vc.innerHTML=`
  <div class="view-header"><div class="view-title">Audit Logs</div></div>
  <div class="table-card">
    <div class="table-card-header"><div class="table-card-title">System Activity</div>
    <div class="table-toolbar"><select class="toolbar-input" id="audit-entity-filter"><option value="">All Entities</option><option>Customer</option><option>Lead</option><option>Opportunity</option><option>User</option><option>InventoryItem</option></select></div></div>
    <div style="overflow-x:auto"><table class="data-table"><thead><tr><th>Timestamp</th><th>User</th><th>Action</th><th>Entity</th><th>Details</th></tr></thead><tbody id="audit-tbody"></tbody></table></div>
  </div>`;

  const render=(list)=>{
    $('#audit-tbody').innerHTML=list.length?list.map(l=>`
      <tr>
        <td class="cell-mono" style="white-space:nowrap">${new Date(l.timestamp).toLocaleString('en-GB')}</td>
        <td>${l.userName||l.user?.name||'—'}</td>
        <td><span class="pill pill-${l.action==='DELETE'?'lost':l.action==='CREATE'?'qualified':l.action==='LOGIN'?'new':'contacted'}">${l.action}</span></td>
        <td>${l.entity}</td>
        <td style="font-size:.75rem;color:var(--text-dim)">${JSON.stringify(l.details||{})}</td>
      </tr>`).join(''):'<tr class="empty-row"><td colspan="5">No logs</td></tr>';
  };

  render(logs);
  $('#audit-entity-filter').addEventListener('change',()=>{const e=$('#audit-entity-filter').value;render(e?logs.filter(l=>l.entity===e):logs);});
};

// ── PROFILE ────────────────────────────────────────────
VIEWS.profile = async () => {
  const vc=$('#view-container');
  const u=S.user;
  vc.innerHTML=`
  <div class="view-header"><div class="view-title">My Profile</div></div>
  <div style="max-width:520px">
    <div class="table-card" style="padding:28px;display:flex;gap:20px;align-items:center;margin-bottom:20px">
      <div style="width:64px;height:64px;border-radius:50%;background:var(--primary);color:#fff;display:flex;align-items:center;justify-content:center;font-size:1.6rem;font-weight:700;flex-shrink:0">${u.name.charAt(0)}</div>
      <div><div style="font-size:1.1rem;font-weight:700;color:var(--text)">${u.name}</div><div style="color:var(--text-muted)">${u.email}</div><div style="margin-top:4px"><span class="pill pill-${u.role}">${cap(u.role)}</span></div></div>
    </div>
    <div class="table-card" style="padding:24px">
      <div style="display:grid;gap:12px">
        <div class="flex-between"><span class="text-muted">Member since</span><span>${fmtDate(u.createdAt)}</span></div>
        <div class="divider"></div>
        <div class="flex-between"><span class="text-muted">Role</span><span>${cap(u.role)}</span></div>
        <div class="divider"></div>
        <div class="flex-between"><span class="text-muted">Status</span><span class="pill pill-active">Active</span></div>
      </div>
    </div>
    <button class="btn btn-danger w-full" style="margin-top:16px" onclick="document.getElementById('logout-btn').click()">Sign out</button>
  </div>`;
};

// ── BOOT ───────────────────────────────────────────────
window.closeModal = closeModal;
initAuth();
