/* ════════════════════════════════════════════════════════
   ClothCo Staff & Manager Dashboard — Vanilla JS
   ════════════════════════════════════════════════════════ */

const API = '/api/v1';

// ── State ────────────────────────────────────────────────
let token = localStorage.getItem('cc_dash_token') || null;
let currentUser = null;
let metricsInterval = null;
let cpuMemChart = null;
let rpsChart = null;
let allInventory = [];
let allOrders = [];
let currentUsersTab = 'clients';

// ── Utilities ────────────────────────────────────────────
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

function showLoading(v) { $('#loading-overlay').classList.toggle('hidden', !v); }

let toastTimer;
function showToast(msg, type = 'info') {
  const t = $('#toast');
  t.textContent = msg;
  t.className = `toast show toast-${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3500);
}

async function apiFetch(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, { ...opts, headers });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Request failed');
  return json;
}

const fmt = (n) => '£' + Number(n).toFixed(2);
const fmtDate = (d) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

// ── Auth ─────────────────────────────────────────────────
async function initAuth() {
  if (!token) { showPage('login'); showLoading(false); return; }
  try {
    const { data } = await apiFetch('/auth/me');
    currentUser = data.user;
    if (!['staff', 'manager'].includes(currentUser.role)) {
      window.location.href = '/';
      return;
    }
    mountApp();
  } catch {
    logout();
  } finally {
    showLoading(false);
  }
}

function showPage(id) {
  $$('.page').forEach(p => p.classList.remove('active'));
  $(`#page-${id}`)?.classList.add('active');
}

function logout() {
  token = null; currentUser = null;
  localStorage.removeItem('cc_dash_token');
  clearInterval(metricsInterval);
  $('#app-shell').classList.add('hidden');
  showPage('login');
}

$('#login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const err = $('#login-error');
  err.classList.add('hidden');
  const btn = $('#login-btn');
  btn.disabled = true;
  try {
    const res = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: $('#login-email').value.trim(),
        password: $('#login-password').value,
      }),
    });
    const user = res.data.user;
    if (!['staff', 'manager'].includes(user.role)) {
      // Clients get redirected to the client portal automatically
      localStorage.setItem('cc_token', res.data.token);
      window.location.href = '/';
      return;
    }
    token = res.data.token;
    currentUser = user;
    localStorage.setItem('cc_dash_token', token);
    mountApp();
  } catch (e2) {
    err.textContent = e2.message;
    err.classList.remove('hidden');
  } finally {
    btn.disabled = false;
  }
});

$('#logout-btn').addEventListener('click', logout);

// ── Mount App ─────────────────────────────────────────────
function mountApp() {
  showPage('');
  $('#app-shell').classList.remove('hidden');

  // Set user info in sidebar
  const name = currentUser.name || '—';
  $('#user-name-display').textContent = name;
  $('#user-role-display').textContent = currentUser.role;
  $('#user-avatar').textContent = name.charAt(0).toUpperCase();

  // Show manager-only items
  if (currentUser.role === 'manager') {
    $$('.manager-only').forEach(el => el.classList.remove('hidden'));
  }

  showSection('overview');
}

// ── Section Navigation ────────────────────────────────────
function showSection(id) {
  $$('.section').forEach(s => { s.classList.remove('active'); s.classList.add('hidden'); });
  $$('.nav-item').forEach(n => n.classList.remove('active'));
  const sec = $(`#section-${id}`);
  if (sec) { sec.classList.remove('hidden'); sec.classList.add('active'); }
  $$(`.nav-item[data-section="${id}"]`).forEach(n => n.classList.add('active'));

  if (id === 'overview')   loadOverview();
  if (id === 'inventory')  loadInventory();
  if (id === 'orders')     loadOrders();
  if (id === 'users')      loadUsers();
  if (id === 'metrics')    startMetrics();
  if (id !== 'metrics')    stopMetrics();
}

$$('.nav-item').forEach(item => {
  item.addEventListener('click', (e) => {
    e.preventDefault();
    if (item.dataset.section) showSection(item.dataset.section);
  });
});
$$('[data-section]').forEach(el => {
  el.addEventListener('click', () => showSection(el.dataset.section));
});

// ── Overview ──────────────────────────────────────────────
async function loadOverview() {
  try {
    const [ordersRes, productsRes, usersRes] = await Promise.all([
      apiFetch('/orders'),
      apiFetch('/products'),
      currentUser.role === 'manager' ? apiFetch('/users?role=client&isActive=true') : Promise.resolve({ data: [] }),
    ]);

    const today = new Date().toDateString();
    const todayOrders = ordersRes.data.filter(o => new Date(o.createdAt).toDateString() === today).length;
    const pending = ordersRes.data.filter(o => o.status === 'Pending').length;
    const lowStock = productsRes.data.filter(p => p.stockLevel < 20).length;
    const activeClients = currentUser.role === 'manager' ? usersRes.data.length : '—';

    $('#stat-today-orders').textContent = todayOrders;
    $('#stat-pending').textContent = pending;
    $('#stat-low-stock').textContent = lowStock;
    $('#stat-clients').textContent = activeClients;
  } catch (err) {
    showToast('Failed to load overview: ' + err.message, 'error');
  }
}

// ── Inventory ─────────────────────────────────────────────
async function loadInventory() {
  const tbody = $('#inv-tbody');
  tbody.innerHTML = `<tr><td colspan="7" style="color:var(--text-muted);padding:20px;font-family:var(--font-mono)">Loading…</td></tr>`;
  try {
    const { data } = await apiFetch('/products');
    allInventory = data;
    renderInventory(data);
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" class="form-error">Error: ${err.message}</td></tr>`;
  }
}

function renderInventory(products) {
  const tbody = $('#inv-tbody');
  tbody.innerHTML = '';
  if (!products.length) {
    tbody.innerHTML = `<tr><td colspan="7" style="color:var(--text-muted);padding:20px;font-family:var(--font-mono)">No products found.</td></tr>`;
    return;
  }
  products.forEach(p => {
    const stockColor = p.stockLevel === 0 ? 'var(--danger)' : p.stockLevel < 20 ? 'var(--warning)' : 'var(--success)';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="cell-mono">${p.sku}</td>
      <td style="color:var(--text)">${p.name}</td>
      <td class="cell-mono">${p.category}</td>
      <td>
        <div class="inline-edit-wrap">
          <input class="inline-input" type="number" min="0" value="${p.stockLevel}" data-field="stockLevel" data-id="${p._id}" style="color:${stockColor}" />
          <button class="btn btn-sm btn-outline save-inline-btn" data-id="${p._id}" title="Save stock">✓</button>
        </div>
      </td>
      <td>
        <div class="inline-edit-wrap">
          <input class="inline-input" type="text" value="${p.warehouseLocation || ''}" data-field="warehouseLocation" data-id="${p._id}" style="width:130px" />
          <button class="btn btn-sm btn-outline save-inline-btn" data-id="${p._id}" title="Save location">✓</button>
        </div>
      </td>
      <td class="cell-mono">${fmt(p.pricePerUnit)}</td>
      <td>
        <button class="btn btn-sm btn-outline edit-product-btn" data-id="${p._id}">Edit</button>
        ${currentUser.role === 'manager' ? `<button class="btn btn-sm btn-danger delete-product-btn" data-id="${p._id}" data-name="${p.name}" style="margin-left:4px">Del</button>` : ''}
      </td>`;
    tbody.appendChild(tr);
  });

  // Inline save
  $$('.save-inline-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      const row = btn.closest('tr');
      const updates = {};
      $$('.inline-input[data-id="' + id + '"]', row).forEach(inp => {
        updates[inp.dataset.field] = inp.dataset.field === 'stockLevel' ? Number(inp.value) : inp.value;
      });
      try {
        await apiFetch(`/products/${id}`, { method: 'PUT', body: JSON.stringify(updates) });
        showToast('Product updated', 'success');
      } catch (err) {
        showToast('Save failed: ' + err.message, 'error');
      }
    });
  });

  $$('.edit-product-btn').forEach(btn =>
    btn.addEventListener('click', () => openProductModal(btn.dataset.id))
  );

  $$('.delete-product-btn').forEach(btn =>
    btn.addEventListener('click', () => confirmAction(
      `Deactivate "${btn.dataset.name}"?`,
      'This will soft-delete the product. It will no longer appear in the catalogue.',
      async () => {
        await apiFetch(`/products/${btn.dataset.id}`, { method: 'DELETE' });
        showToast('Product deactivated', 'info');
        loadInventory();
      }
    ))
  );
}

$('#inv-search').addEventListener('input', () => {
  const q = $('#inv-search').value.toLowerCase();
  const filtered = allInventory.filter(p =>
    p.name.toLowerCase().includes(q) ||
    p.sku.toLowerCase().includes(q) ||
    p.category.toLowerCase().includes(q)
  );
  renderInventory(filtered);
});

// Add Product button
$('#add-product-btn').addEventListener('click', () => openProductModal(null));

// Product form modal
function openProductModal(id) {
  const form = $('#product-form');
  const title = $('#product-modal-title');
  const errEl = $('#product-form-error');
  errEl.classList.add('hidden');

  if (id) {
    const product = allInventory.find(p => p._id === id);
    if (!product) return;
    title.textContent = 'Edit Product';
    $('#product-id').value = product._id;
    $('#pf-name').value = product.name;
    $('#pf-category').value = product.category;
    $('#pf-sku').value = product.sku;
    $('#pf-price').value = product.pricePerUnit;
    $('#pf-stock').value = product.stockLevel;
    $('#pf-location').value = product.warehouseLocation || '';
    $('#pf-desc').value = product.description || '';
    $('#pf-image').value = product.images?.[0] || '';
  } else {
    title.textContent = 'Add Product';
    form.reset();
    $('#product-id').value = '';
  }
  openModal('modal-product');
}

$('#product-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errEl = $('#product-form-error');
  errEl.classList.add('hidden');
  const id = $('#product-id').value;

  const payload = {
    name: $('#pf-name').value.trim(),
    category: $('#pf-category').value,
    sku: $('#pf-sku').value.trim().toUpperCase(),
    pricePerUnit: parseFloat($('#pf-price').value),
    stockLevel: parseInt($('#pf-stock').value),
    warehouseLocation: $('#pf-location').value.trim(),
    description: $('#pf-desc').value.trim(),
    images: $('#pf-image').value.trim() ? [$('#pf-image').value.trim()] : [],
  };

  try {
    if (id) {
      await apiFetch(`/products/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
      showToast('Product updated', 'success');
    } else {
      await apiFetch('/products', { method: 'POST', body: JSON.stringify(payload) });
      showToast('Product created', 'success');
    }
    closeModal('modal-product');
    loadInventory();
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.remove('hidden');
  }
});

// ── Orders ───────────────────────────────────────────────
async function loadOrders() {
  const tbody = $('#orders-tbody');
  tbody.innerHTML = `<tr><td colspan="7" style="color:var(--text-muted);font-family:var(--font-mono);padding:20px">Loading…</td></tr>`;
  try {
    const { data } = await apiFetch('/orders');
    allOrders = data;
    renderOrders(data);
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" class="form-error">${err.message}</td></tr>`;
  }
}

function renderOrders(orders) {
  const tbody = $('#orders-tbody');
  tbody.innerHTML = '';
  if (!orders.length) {
    tbody.innerHTML = `<tr><td colspan="7" style="color:var(--text-muted);font-family:var(--font-mono);padding:20px">No orders found.</td></tr>`;
    return;
  }

  const STATUSES = ['Pending', 'Processing', 'Shipped', 'Delivered'];

  orders.forEach(o => {
    const clientName = o.client?.name || '—';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="cell-mono">${o.invoiceNumber}</td>
      <td>${clientName}<br/><span style="font-size:0.7rem;color:var(--text-muted)">${o.client?.companyName || ''}</span></td>
      <td class="cell-mono">${fmtDate(o.createdAt)}</td>
      <td class="cell-mono">${fmt(o.totalAmount)}</td>
      <td><span class="status-badge status-${o.paymentStatus}">${o.paymentStatus}</span></td>
      <td>
        <select class="toolbar-input status-select" data-id="${o._id}" style="max-width:140px;padding:4px 8px;font-size:0.7rem">
          ${STATUSES.map(s => `<option ${o.status === s ? 'selected' : ''} ${o.status === 'Cancelled' && s !== 'Cancelled' ? 'disabled' : ''}>${s}</option>`).join('')}
          <option ${o.status === 'Cancelled' ? 'selected' : ''} disabled>Cancelled</option>
        </select>
      </td>
      <td>
        <button class="btn btn-sm btn-outline view-order-btn" data-id="${o._id}">View</button>
        ${currentUser.role === 'manager' ? `
          <select class="toolbar-input payment-select" data-id="${o._id}" style="max-width:110px;padding:4px 8px;font-size:0.7rem;margin-left:4px">
            <option ${o.paymentStatus === 'Unpaid' ? 'selected' : ''}>Unpaid</option>
            <option ${o.paymentStatus === 'Paid' ? 'selected' : ''}>Paid</option>
            <option ${o.paymentStatus === 'Simulated' ? 'selected' : ''}>Simulated</option>
          </select>` : ''}
      </td>`;
    tbody.appendChild(tr);
  });

  $$('.status-select').forEach(sel => {
    sel.addEventListener('change', async () => {
      try {
        await apiFetch(`/orders/${sel.dataset.id}/status`, {
          method: 'PATCH', body: JSON.stringify({ status: sel.value }),
        });
        showToast('Status updated', 'success');
      } catch (err) {
        showToast('Failed: ' + err.message, 'error');
        loadOrders();
      }
    });
  });

  $$('.payment-select').forEach(sel => {
    sel.addEventListener('change', async () => {
      try {
        await apiFetch(`/orders/${sel.dataset.id}/payment`, {
          method: 'PATCH', body: JSON.stringify({ paymentStatus: sel.value }),
        });
        showToast('Payment status updated', 'success');
      } catch (err) {
        showToast('Failed: ' + err.message, 'error');
      }
    });
  });

  $$('.view-order-btn').forEach(btn =>
    btn.addEventListener('click', () => openOrderModal(btn.dataset.id))
  );
}

$('#order-status-filter').addEventListener('change', filterOrders);
$('#order-search').addEventListener('input', filterOrders);
function filterOrders() {
  const status = $('#order-status-filter').value;
  const search = $('#order-search').value.toLowerCase();
  let filtered = [...allOrders];
  if (status) filtered = filtered.filter(o => o.status === status);
  if (search) filtered = filtered.filter(o =>
    o.invoiceNumber?.toLowerCase().includes(search) ||
    o.client?.name?.toLowerCase().includes(search) ||
    o.client?.companyName?.toLowerCase().includes(search)
  );
  renderOrders(filtered);
}

async function openOrderModal(id) {
  openModal('modal-order');
  const content = $('#order-detail-content');
  content.innerHTML = '<p style="color:var(--text-muted);font-family:var(--font-mono);padding:40px;text-align:center">Loading…</p>';
  try {
    const { data: o } = await apiFetch(`/orders/${id}`);
    content.innerHTML = `
      <div style="font-family:var(--font-mono);font-size:0.65rem;letter-spacing:0.12em;text-transform:uppercase;color:var(--text-muted);margin-bottom:4px">Order Detail</div>
      <div style="font-family:var(--font-mono);font-size:1.1rem;font-weight:600;color:var(--cyan);margin-bottom:20px">${o.invoiceNumber}</div>
      <div class="order-detail-grid">
        <div class="od-field"><span class="od-label">Client</span><span class="od-val">${o.client?.name || '—'}</span></div>
        <div class="od-field"><span class="od-label">Company</span><span class="od-val">${o.client?.companyName || '—'}</span></div>
        <div class="od-field"><span class="od-label">Status</span><span><span class="status-badge status-${o.status}">${o.status}</span></span></div>
        <div class="od-field"><span class="od-label">Payment</span><span><span class="status-badge status-${o.paymentStatus}">${o.paymentStatus}</span></span></div>
        <div class="od-field"><span class="od-label">Total</span><span class="od-val" style="color:var(--cyan)">${fmt(o.totalAmount)}</span></div>
        <div class="od-field"><span class="od-label">Placed</span><span class="od-val">${fmtDate(o.createdAt)}</span></div>
        ${o.notes ? `<div class="od-field" style="grid-column:span 2"><span class="od-label">Notes</span><span class="od-val">${o.notes}</span></div>` : ''}
      </div>
      <table class="data-table" style="margin-top:8px">
        <thead><tr><th>Product</th><th>SKU</th><th>Qty</th><th>Unit Price</th><th>Line Total</th></tr></thead>
        <tbody>
          ${o.items.map(i => `<tr>
            <td style="color:var(--text)">${i.product?.name || '—'}</td>
            <td class="cell-mono">${i.product?.sku || '—'}</td>
            <td class="cell-mono">${i.quantity}</td>
            <td class="cell-mono">${fmt(i.unitPrice)}</td>
            <td class="cell-mono">${fmt(i.unitPrice * i.quantity)}</td>
          </tr>`).join('')}
        </tbody>
      </table>`;
  } catch (err) {
    content.innerHTML = `<p class="form-error">${err.message}</p>`;
  }
}

// ── Users ────────────────────────────────────────────────
async function loadUsers(tab = currentUsersTab) {
  currentUsersTab = tab;
  $$('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  const tbody = $('#users-tbody');
  tbody.innerHTML = `<tr><td colspan="6" style="color:var(--text-muted);font-family:var(--font-mono);padding:20px">Loading…</td></tr>`;
  try {
    const role = tab === 'clients' ? 'client' : 'staff';
    const { data } = await apiFetch(`/users?role=${role}`);
    tbody.innerHTML = '';
    if (!data.length) {
      tbody.innerHTML = `<tr><td colspan="6" style="color:var(--text-muted);font-family:var(--font-mono);padding:20px">No users found.</td></tr>`;
      return;
    }
    data.forEach(u => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="color:var(--text)">${u.name}</td>
        <td class="cell-mono">${u.email}</td>
        <td>${u.companyName || '—'}</td>
        <td><span class="status-badge status-${u.isActive ? 'active' : 'inactive'}">${u.isActive ? 'Active' : 'Inactive'}</span></td>
        <td class="cell-mono">${fmtDate(u.createdAt)}</td>
        <td>
          ${u.isActive
            ? `<button class="btn btn-sm btn-danger deactivate-btn" data-id="${u._id}" data-name="${u.name}">Deactivate</button>`
            : `<button class="btn btn-sm btn-outline reactivate-btn" data-id="${u._id}">Reactivate</button>`
          }
        </td>`;
      tbody.appendChild(tr);
    });

    $$('.deactivate-btn').forEach(btn =>
      btn.addEventListener('click', () => confirmAction(
        `Deactivate "${btn.dataset.name}"?`,
        'The user will lose access to the portal.',
        async () => {
          await apiFetch(`/users/${btn.dataset.id}`, { method: 'DELETE' });
          showToast('User deactivated', 'info');
          loadUsers();
        }
      ))
    );
    $$('.reactivate-btn').forEach(btn =>
      btn.addEventListener('click', async () => {
        await apiFetch(`/users/${btn.dataset.id}`, { method: 'PATCH', body: JSON.stringify({ isActive: true }) });
        showToast('User reactivated', 'success');
        loadUsers();
      })
    );
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" class="form-error">${err.message}</td></tr>`;
  }
}

$$('.tab-btn').forEach(btn => btn.addEventListener('click', () => loadUsers(btn.dataset.tab)));

$('#create-staff-btn').addEventListener('click', () => {
  $('#staff-form').reset();
  $('#staff-form-error').classList.add('hidden');
  openModal('modal-staff');
});
$('#staff-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errEl = $('#staff-form-error');
  errEl.classList.add('hidden');
  try {
    await apiFetch('/users/staff', {
      method: 'POST',
      body: JSON.stringify({
        name: $('#sf-name').value.trim(),
        email: $('#sf-email').value.trim(),
        password: $('#sf-password').value,
        phone: $('#sf-phone').value.trim(),
      }),
    });
    showToast('Staff account created', 'success');
    closeModal('modal-staff');
    loadUsers('staff');
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.remove('hidden');
  }
});

// ── Metrics ──────────────────────────────────────────────
function startMetrics() {
  loadMetrics();
  metricsInterval = setInterval(loadMetrics, 10000);
  updateRefreshCountdown();
}
function stopMetrics() {
  clearInterval(metricsInterval);
  metricsInterval = null;
}

let countdown = 10;
let countdownTimer;
function updateRefreshCountdown() {
  clearInterval(countdownTimer);
  countdown = 10;
  countdownTimer = setInterval(() => {
    countdown--;
    const el = $('#metrics-refresh-label');
    if (el) el.textContent = `Auto-refresh: ${countdown}s`;
    if (countdown <= 0) countdown = 10;
  }, 1000);
}

async function loadMetrics() {
  try {
    const { data: metrics } = await apiFetch('/metrics/live');
    renderServerCards(metrics);
    renderCharts(metrics);
    countdown = 10;
  } catch (err) {
    showToast('Failed to load metrics: ' + err.message, 'error');
  }
}

function renderServerCards(metrics) {
  if (!metrics.length) return;
  // Get latest snapshot per instance
  const latest = {};
  metrics.forEach(m => { latest[m.serverInstance] = m; });
  const container = $('#server-cards');
  container.innerHTML = Object.values(latest).map(m => {
    const cpu = Math.round(m.cpuUsage);
    const mem = Math.round(m.memoryUsage);
    const healthCls = cpu > 85 || mem > 85 ? 'crit' : cpu > 70 || mem > 70 ? 'warn' : '';
    return `
      <div class="server-card">
        <div class="server-card-top">
          <span class="server-instance">${m.serverInstance}</span>
          <span class="server-health ${healthCls}" title="${healthCls === 'crit' ? 'Critical' : healthCls === 'warn' ? 'Warning' : 'Healthy'}"></span>
        </div>
        <div class="server-region">${m.region}</div>
        <div class="server-metrics">
          <div class="server-metric-row"><span class="server-metric-label">CPU</span><span class="server-metric-val" style="color:${cpu > 85 ? 'var(--danger)' : cpu > 70 ? 'var(--warning)' : 'var(--success)'}">${cpu}%</span></div>
          <div class="server-metric-row"><span class="server-metric-label">Memory</span><span class="server-metric-val" style="color:${mem > 85 ? 'var(--danger)' : mem > 70 ? 'var(--warning)' : 'var(--success)'}">${mem}%</span></div>
          <div class="server-metric-row"><span class="server-metric-label">Connections</span><span class="server-metric-val">${m.activeConnections}</span></div>
          <div class="server-metric-row"><span class="server-metric-label">Req/s</span><span class="server-metric-val">${m.requestsPerSecond}</span></div>
        </div>
      </div>`;
  }).join('');
}

function renderCharts(metrics) {
  const labels = metrics.map((_, i) => `T-${metrics.length - i}`).reverse();
  const cpuData = metrics.map(m => Math.round(m.cpuUsage));
  const memData = metrics.map(m => Math.round(m.memoryUsage));

  // CPU / Memory line chart
  const cpuCtx = document.getElementById('chart-cpu-mem');
  if (cpuMemChart) {
    cpuMemChart.data.labels = labels;
    cpuMemChart.data.datasets[0].data = cpuData;
    cpuMemChart.data.datasets[1].data = memData;
    cpuMemChart.update('none');
  } else {
    cpuMemChart = new Chart(cpuCtx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          { label: 'CPU %', data: cpuData, borderColor: '#00f0c8', backgroundColor: 'rgba(0,240,200,0.08)', tension: 0.4, pointRadius: 2 },
          { label: 'Memory %', data: memData, borderColor: '#b39ddb', backgroundColor: 'rgba(179,157,219,0.08)', tension: 0.4, pointRadius: 2 },
        ],
      },
      options: chartOptions(100),
    });
  }

  // Requests/s bar chart — aggregate per instance
  const instanceMap = {};
  metrics.forEach(m => {
    if (!instanceMap[m.serverInstance]) instanceMap[m.serverInstance] = [];
    instanceMap[m.serverInstance].push(m.requestsPerSecond);
  });
  const rpsLabels = Object.keys(instanceMap);
  const rpsValues = rpsLabels.map(k => {
    const arr = instanceMap[k];
    return Math.round((arr.reduce((s, v) => s + v, 0) / arr.length) * 10) / 10;
  });

  const rpsCtx = document.getElementById('chart-rps');
  if (rpsChart) {
    rpsChart.data.labels = rpsLabels;
    rpsChart.data.datasets[0].data = rpsValues;
    rpsChart.update('none');
  } else {
    rpsChart = new Chart(rpsCtx, {
      type: 'bar',
      data: {
        labels: rpsLabels,
        datasets: [{ label: 'Avg Req/s', data: rpsValues, backgroundColor: 'rgba(0,240,200,0.25)', borderColor: '#00f0c8', borderWidth: 1 }],
      },
      options: chartOptions(null),
    });
  }
}

function chartOptions(yMax) {
  return {
    responsive: true,
    animation: false,
    plugins: { legend: { labels: { color: '#9a9a9a', font: { family: 'JetBrains Mono', size: 11 } } } },
    scales: {
      x: { ticks: { color: '#555', font: { family: 'JetBrains Mono', size: 10 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
      y: { ...(yMax ? { max: yMax } : {}), min: 0, ticks: { color: '#555', font: { family: 'JetBrains Mono', size: 10 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
    },
  };
}

$('#simulate-btn').addEventListener('click', async () => {
  try {
    await apiFetch('/metrics/simulate', { method: 'POST', body: JSON.stringify({ spike: true }) });
    showToast('Load spike simulated', 'success');
    loadMetrics();
    updateRefreshCountdown();
  } catch (err) {
    showToast('Simulation failed: ' + err.message, 'error');
  }
});

$('#refresh-metrics-btn').addEventListener('click', () => {
  loadMetrics();
  updateRefreshCountdown();
});

// ── Modals ───────────────────────────────────────────────
function openModal(id) { $(`#${id}`)?.classList.remove('hidden'); }
function closeModal(id) { $(`#${id}`)?.classList.add('hidden'); }

$$('.modal-close').forEach(btn =>
  btn.addEventListener('click', () => closeModal(btn.dataset.modal))
);
$$('.modal').forEach(m => {
  m.querySelector('.modal-backdrop')?.addEventListener('click', () => closeModal(m.id));
});

// ── Confirm Modal ─────────────────────────────────────────
let confirmCallback = null;
function confirmAction(title, msg, cb) {
  $('#confirm-title').textContent = title;
  $('#confirm-msg-text').textContent = msg;
  confirmCallback = cb;
  openModal('modal-confirm');
}
$('#confirm-ok-btn').addEventListener('click', async () => {
  if (confirmCallback) {
    try { await confirmCallback(); } catch (err) { showToast(err.message, 'error'); }
    confirmCallback = null;
  }
  closeModal('modal-confirm');
});
$('#confirm-cancel-btn').addEventListener('click', () => {
  confirmCallback = null;
  closeModal('modal-confirm');
});

// ── Boot ─────────────────────────────────────────────────
initAuth();
