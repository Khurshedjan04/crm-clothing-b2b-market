/* ════════════════════════════════════════════════════════
   ClothCo Client Portal — Vanilla JS SPA
   ════════════════════════════════════════════════════════ */

const API = '/api/v1';

// ── State ────────────────────────────────────────────────
let token = localStorage.getItem('cc_token') || null;
let currentUser = null;
let allProducts = [];
let cart = JSON.parse(localStorage.getItem('cc_cart') || '[]');

// ── Utilities ────────────────────────────────────────────
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

function showLoading(show) {
  $('#loading-overlay').classList.toggle('hidden', !show);
}

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

function formatCurrency(n) {
  return '£' + Number(n).toFixed(2);
}

function formatDate(d) {
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ── Navigation ───────────────────────────────────────────
function showPage(id) {
  $$('.page').forEach(p => p.classList.remove('active'));
  $(`#page-${id}`)?.classList.add('active');
}

function showView(id) {
  $$('.view').forEach(v => v.classList.remove('active'));
  $$('.view').forEach(v => v.classList.add('hidden'));
  const view = $(`#view-${id}`);
  if (view) { view.classList.remove('hidden'); view.classList.add('active'); }
  $$('.nav-link').forEach(l => {
    l.classList.toggle('active', l.dataset.view === id);
  });
  if (id === 'catalog') loadCatalog();
  if (id === 'orders') loadOrders();
  if (id === 'account') renderAccount();
}

// ── Modals ───────────────────────────────────────────────
function openModal(id) { $(`#${id}`)?.classList.remove('hidden'); }
function closeModal(id) { $(`#${id}`)?.classList.add('hidden'); }

$$('.modal-close').forEach(btn =>
  btn.addEventListener('click', () => closeModal(btn.dataset.modal))
);
$$('.modal').forEach(modal => {
  modal.querySelector('.modal-backdrop')?.addEventListener('click', () =>
    closeModal(modal.id)
  );
});

// ── Auth ─────────────────────────────────────────────────
async function initAuth() {
  if (!token) { showPage('login'); showLoading(false); return; }
  try {
    const { data } = await apiFetch('/auth/me');
    currentUser = data.user;
    // Staff/manager tokens saved here should go to the dashboard
    if (['staff', 'manager'].includes(currentUser.role)) {
      window.location.href = '/dashboard';
      return;
    }
    showPage(''); // hide login
    $('#app-shell').classList.remove('hidden');
    showView('catalog');
  } catch {
    logout();
  } finally {
    showLoading(false);
  }
}

function logout() {
  token = null;
  currentUser = null;
  cart = [];
  localStorage.removeItem('cc_token');
  localStorage.removeItem('cc_cart');
  $('#app-shell').classList.add('hidden');
  showPage('login');
  syncCartUI();
}

$('#login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = $('#login-btn');
  const err = $('#login-error');
  err.classList.add('hidden');
  btn.disabled = true;
  $('.btn-text', btn).classList.add('hidden');
  $('.btn-loader', btn).classList.remove('hidden');
  try {
    const res = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: $('#login-email').value.trim(),
        password: $('#login-password').value,
      }),
    });
    token = res.data.token;
    currentUser = res.data.user;
    localStorage.setItem('cc_token', token);
    // Staff and managers belong on the dashboard
    if (['staff', 'manager'].includes(currentUser.role)) {
      window.location.href = '/dashboard';
      return;
    }
    $('#app-shell').classList.remove('hidden');
    showPage('');
    showView('catalog');
  } catch (err2) {
    err.textContent = err2.message;
    err.classList.remove('hidden');
  } finally {
    btn.disabled = false;
    $('.btn-text', btn).classList.remove('hidden');
    $('.btn-loader', btn).classList.add('hidden');
  }
});

$('#show-register').addEventListener('click', (e) => { e.preventDefault(); openModal('modal-register'); });

$('#register-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const err = $('#reg-error');
  err.classList.add('hidden');
  try {
    const res = await apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: $('#reg-name').value.trim(),
        email: $('#reg-email').value.trim(),
        password: $('#reg-password').value,
        companyName: $('#reg-company').value.trim(),
        phone: $('#reg-phone').value.trim(),
      }),
    });
    token = res.data.token;
    currentUser = res.data.user;
    localStorage.setItem('cc_token', token);
    closeModal('modal-register');
    $('#app-shell').classList.remove('hidden');
    showPage('');
    showView('catalog');
    showToast('Account created — welcome to ClothCo!', 'success');
  } catch (err2) {
    err.textContent = err2.message;
    err.classList.remove('hidden');
  }
});

$('#logout-btn').addEventListener('click', logout);
$('#account-logout-btn').addEventListener('click', logout);

// ── Nav links ─────────────────────────────────────────────
$$('.nav-link').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    if (link.dataset.view) showView(link.dataset.view);
  });
});

// ── Catalog ──────────────────────────────────────────────
async function loadCatalog() {
  try {
    const { data } = await apiFetch('/products');
    allProducts = data;
    renderCatalog(data);
  } catch (err) {
    showToast('Failed to load catalogue: ' + err.message, 'error');
  }
}

function getStockStatus(n) {
  if (n === 0) return { label: 'Out of stock', cls: 'out-stock' };
  if (n < 20)  return { label: `Low — ${n} left`, cls: 'low-stock' };
  return { label: `${n} in stock`, cls: 'in-stock' };
}

function renderCatalog(products) {
  const grid = $('#product-grid');
  const empty = $('#catalog-empty');
  const count = $('#catalog-count');
  grid.innerHTML = '';
  count.textContent = `${products.length} item${products.length !== 1 ? 's' : ''}`;

  if (!products.length) { empty.classList.remove('hidden'); return; }
  empty.classList.add('hidden');

  products.forEach(p => {
    const stock = getStockStatus(p.stockLevel);
    const minPrice = p.tierPricing?.length
      ? Math.min(...p.tierPricing.map(t => t.pricePerUnit))
      : p.pricePerUnit;

    const card = document.createElement('div');
    card.className = 'product-card';
    card.innerHTML = `
      <img class="product-card-img" src="${p.images?.[0] || 'https://placehold.co/400x500/111d3c/c9a84c?text=ClothCo'}" alt="${p.name}" loading="lazy" />
      <div class="product-card-body">
        <div class="product-card-category">${p.category}</div>
        <div class="product-card-name">${p.name}</div>
        <div class="product-card-footer">
          <div class="product-price">from ${formatCurrency(minPrice)} <span>/ unit</span></div>
          <span class="stock-badge ${stock.cls}">${stock.label}</span>
        </div>
      </div>`;
    card.addEventListener('click', () => openProductModal(p._id));
    grid.appendChild(card);
  });
}

// Filters
function applyFilters() {
  let filtered = [...allProducts];
  const search = $('#search-input').value.toLowerCase().trim();
  const maxPrice = Number($('#price-range').value);
  const inStockOnly = $('#in-stock-toggle').checked;
  const checkedCats = $$('#category-filters input:checked').map(i => i.value);

  if (search) filtered = filtered.filter(p =>
    p.name.toLowerCase().includes(search) ||
    p.sku.toLowerCase().includes(search) ||
    p.description?.toLowerCase().includes(search)
  );
  if (checkedCats.length) filtered = filtered.filter(p => checkedCats.includes(p.category));
  if (maxPrice < 60) filtered = filtered.filter(p => p.pricePerUnit <= maxPrice);
  if (inStockOnly) filtered = filtered.filter(p => p.stockLevel >= 20);
  renderCatalog(filtered);
}

$('#search-input').addEventListener('input', applyFilters);
$('#price-range').addEventListener('input', () => {
  $('#price-range-val').textContent = `Up to £${$('#price-range').value}`;
  applyFilters();
});
$('#in-stock-toggle').addEventListener('change', applyFilters);
$$('#category-filters input').forEach(cb => cb.addEventListener('change', applyFilters));
$('#clear-filters').addEventListener('click', () => {
  $('#search-input').value = '';
  $('#price-range').value = 60;
  $('#price-range-val').textContent = 'Up to £60';
  $('#in-stock-toggle').checked = false;
  $$('#category-filters input').forEach(cb => cb.checked = false);
  renderCatalog(allProducts);
});

// ── Product Detail Modal ──────────────────────────────────
async function openProductModal(id) {
  openModal('modal-product');
  const content = $('#product-detail-content');
  content.innerHTML = '<p style="color:var(--white-muted);padding:40px;text-align:center">Loading…</p>';

  try {
    const [pRes, tierRes] = await Promise.all([
      apiFetch(`/products/${id}`),
      apiFetch(`/products/${id}/price-tiers`),
    ]);
    const p = pRes.data;
    const tiers = tierRes.data.tiers;
    const stock = getStockStatus(p.stockLevel);

    content.innerHTML = `
      <div class="product-detail">
        <img class="product-detail-img" src="${p.images?.[0] || 'https://placehold.co/400x500/111d3c/c9a84c?text=ClothCo'}" alt="${p.name}" />
        <div class="product-detail-info">
          <div class="product-detail-category">${p.category}</div>
          <div class="product-detail-name">${p.name}</div>
          <div class="product-detail-sku">SKU: ${p.sku}</div>
          <p class="product-detail-desc">${p.description || ''}</p>
          <span class="stock-badge ${stock.cls}">${stock.label}</span>
          <div>
            <span class="tier-label">Tier Pricing</span>
            <table class="tier-table">
              <thead><tr><th>Quantity</th><th>Price / Unit</th></tr></thead>
              <tbody>
                ${tiers.map(t => `<tr><td>${t.label}</td><td>${formatCurrency(t.pricePerUnit)}</td></tr>`).join('')}
              </tbody>
            </table>
          </div>
          <div>
            <span class="tier-label">Add to Cart</span>
            <div class="add-to-cart-section">
              <input type="number" id="modal-qty" class="qty-input" value="1" min="1" max="${p.stockLevel || 999}" />
              <button class="btn btn-primary" id="modal-add-cart-btn" ${p.stockLevel === 0 ? 'disabled' : ''}>
                ${p.stockLevel === 0 ? 'Out of Stock' : 'Add to Cart'}
              </button>
            </div>
            <div class="live-price" id="modal-live-price">${formatCurrency(tiers[0].pricePerUnit)} / unit</div>
          </div>
        </div>
      </div>`;

    // Live price calculation on qty change
    const qtyInput = $('#modal-qty');
    const livePrice = $('#modal-live-price');
    const sortedTiers = [...tiers].sort((a, b) => b.minQty - a.minQty);

    function updateLivePrice() {
      const qty = parseInt(qtyInput.value) || 1;
      const tier = sortedTiers.find(t => qty >= t.minQty) || tiers[0];
      const total = tier.pricePerUnit * qty;
      livePrice.textContent = `${formatCurrency(tier.pricePerUnit)} / unit  ·  ${formatCurrency(total)} total`;
    }
    qtyInput.addEventListener('input', updateLivePrice);

    $('#modal-add-cart-btn').addEventListener('click', () => {
      const qty = parseInt(qtyInput.value) || 1;
      addToCart(p, qty);
      closeModal('modal-product');
      showToast(`${p.name} added to cart`, 'success');
    });
  } catch (err) {
    content.innerHTML = `<p class="form-error">Failed to load product: ${err.message}</p>`;
  }
}

// ── Cart ─────────────────────────────────────────────────
function resolveUnitPrice(qty, product) {
  const tiers = [...(product.tierPricing || [])].sort((a, b) => b.minQty - a.minQty);
  const match = tiers.find(t => qty >= t.minQty);
  return match ? match.pricePerUnit : product.pricePerUnit;
}

function addToCart(product, qty) {
  const existing = cart.find(i => i.productId === product._id);
  if (existing) {
    existing.quantity += qty;
  } else {
    cart.push({
      productId: product._id,
      name: product.name,
      image: product.images?.[0] || '',
      quantity: qty,
      pricePerUnit: product.pricePerUnit,
      tierPricing: product.tierPricing || [],
    });
  }
  saveCart();
  syncCartUI();
}

function saveCart() {
  localStorage.setItem('cc_cart', JSON.stringify(cart));
}

function cartTotal() {
  return cart.reduce((sum, i) => sum + resolveUnitPrice(i.quantity, i) * i.quantity, 0);
}

function syncCartUI() {
  const count = cart.reduce((s, i) => s + i.quantity, 0);
  const countBadge = $('#cart-count');
  countBadge.textContent = count;
  countBadge.classList.toggle('hidden', count === 0);

  const itemsEl = $('#cart-items');
  const emptyMsg = $('#cart-empty-msg');
  const footer = $('#cart-footer');

  if (!cart.length) {
    itemsEl.innerHTML = '';
    emptyMsg.classList.remove('hidden');
    footer.classList.add('hidden');
    return;
  }
  emptyMsg.classList.add('hidden');
  footer.classList.remove('hidden');
  $('#cart-total-val').textContent = formatCurrency(cartTotal());

  itemsEl.innerHTML = cart.map((item, idx) => {
    const unit = resolveUnitPrice(item.quantity, item);
    return `
      <div class="cart-item">
        <img class="cart-item-img" src="${item.image || 'https://placehold.co/60x75/111d3c/c9a84c?text=CC'}" alt="${item.name}" />
        <div class="cart-item-info">
          <div class="cart-item-name">${item.name}</div>
          <div class="cart-item-price">${formatCurrency(unit)} / unit</div>
          <div class="cart-item-actions">
            <button class="qty-btn" data-idx="${idx}" data-delta="-1">−</button>
            <span class="qty-val">${item.quantity}</span>
            <button class="qty-btn" data-idx="${idx}" data-delta="1">+</button>
            <button class="cart-item-remove" data-idx="${idx}">Remove</button>
          </div>
        </div>
      </div>`;
  }).join('');

  $$('.qty-btn', itemsEl).forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = +btn.dataset.idx;
      cart[idx].quantity += +btn.dataset.delta;
      if (cart[idx].quantity <= 0) cart.splice(idx, 1);
      saveCart();
      syncCartUI();
    });
  });
  $$('.cart-item-remove', itemsEl).forEach(btn => {
    btn.addEventListener('click', () => {
      cart.splice(+btn.dataset.idx, 1);
      saveCart();
      syncCartUI();
    });
  });
}

// Cart drawer toggle
$('#cart-toggle-btn').addEventListener('click', () => {
  const drawer = $('#cart-drawer');
  drawer.classList.toggle('hidden');
  setTimeout(() => drawer.classList.toggle('open'), 10);
});
function closeCartDrawer() {
  const drawer = $('#cart-drawer');
  drawer.classList.remove('open');
  setTimeout(() => drawer.classList.add('hidden'), 350);
}
$('#cart-close-btn').addEventListener('click', closeCartDrawer);
$('#cart-backdrop').addEventListener('click', closeCartDrawer);

$('#checkout-btn').addEventListener('click', () => {
  closeCartDrawer();
  openCheckoutModal();
});

function openCheckoutModal() {
  const summary = $('#checkout-summary');
  summary.innerHTML = cart.map(i => {
    const unit = resolveUnitPrice(i.quantity, i);
    return `<div class="checkout-line"><span>${i.name} × ${i.quantity}</span><span>${formatCurrency(unit * i.quantity)}</span></div>`;
  }).join('') + `<div class="checkout-line total"><span>Total</span><span>${formatCurrency(cartTotal())}</span></div>`;
  openModal('modal-checkout');
}

$('#checkout-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const err = $('#checkout-error');
  err.classList.add('hidden');

  const items = cart.map(i => ({ product: i.productId, quantity: i.quantity }));
  const notes = $('#checkout-notes').value.trim();

  try {
    const res = await apiFetch('/orders', {
      method: 'POST',
      body: JSON.stringify({ items, notes }),
    });
    const order = res.data;
    closeModal('modal-checkout');
    cart = [];
    saveCart();
    syncCartUI();
    $('#confirm-invoice').textContent = order.invoiceNumber;
    openModal('modal-confirmation');
  } catch (err2) {
    err.textContent = err2.message;
    err.classList.remove('hidden');
  }
});

$('#confirm-done-btn').addEventListener('click', () => {
  closeModal('modal-confirmation');
  showView('orders');
});

// ── Orders ───────────────────────────────────────────────
async function loadOrders() {
  const tbody = $('#orders-tbody');
  const empty = $('#orders-empty');
  tbody.innerHTML = '<tr><td colspan="7" style="color:var(--white-muted);padding:24px">Loading…</td></tr>';
  try {
    const { data } = await apiFetch('/orders');
    tbody.innerHTML = '';
    if (!data.length) {
      tbody.innerHTML = '';
      empty.classList.remove('hidden');
      return;
    }
    empty.classList.add('hidden');
    data.forEach(order => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="mono">${order.invoiceNumber}</td>
        <td>${formatDate(order.createdAt)}</td>
        <td>${order.items.length} item${order.items.length !== 1 ? 's' : ''}</td>
        <td class="mono">${formatCurrency(order.totalAmount)}</td>
        <td><span class="status-badge status-${order.paymentStatus}">${order.paymentStatus}</span></td>
        <td><span class="status-badge status-${order.status}">${order.status}</span></td>
        <td>
          <button class="btn btn-ghost" style="padding:6px 12px;font-size:0.8rem" data-order-id="${order._id}">View</button>
          ${order.status === 'Pending' ? `<button class="btn btn-danger" style="padding:6px 12px;font-size:0.8rem;margin-left:6px" data-cancel-id="${order._id}">Cancel</button>` : ''}
        </td>`;
      tbody.appendChild(tr);
    });

    $$('[data-order-id]').forEach(btn =>
      btn.addEventListener('click', () => openOrderModal(btn.dataset.orderId))
    );
    $$('[data-cancel-id]').forEach(btn =>
      btn.addEventListener('click', () => cancelOrder(btn.dataset.cancelId))
    );
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" class="form-error">Failed to load orders: ${err.message}</td></tr>`;
  }
}

async function cancelOrder(id) {
  if (!confirm('Cancel this order?')) return;
  try {
    await apiFetch(`/orders/${id}/cancel`, { method: 'PATCH' });
    showToast('Order cancelled', 'info');
    loadOrders();
  } catch (err) {
    showToast('Could not cancel order: ' + err.message, 'error');
  }
}

async function openOrderModal(id) {
  openModal('modal-order');
  const content = $('#order-detail-content');
  content.innerHTML = '<p style="color:var(--white-muted);padding:40px;text-align:center">Loading…</p>';
  try {
    const { data: o } = await apiFetch(`/orders/${id}`);
    content.innerHTML = `
      <div class="order-detail-header">
        <div style="font-family:var(--font-mono);font-size:0.7rem;letter-spacing:0.12em;text-transform:uppercase;color:var(--gold);margin-bottom:4px">Order Details</div>
        <div style="font-family:var(--font-serif);font-size:1.6rem;font-weight:700;color:var(--white)">${o.invoiceNumber}</div>
      </div>
      <div class="order-detail-meta">
        <div class="order-meta-field"><span class="order-meta-label">Status</span><span><span class="status-badge status-${o.status}">${o.status}</span></span></div>
        <div class="order-meta-field"><span class="order-meta-label">Payment</span><span><span class="status-badge status-${o.paymentStatus}">${o.paymentStatus}</span></span></div>
        <div class="order-meta-field"><span class="order-meta-label">Placed</span><span class="order-meta-val">${formatDate(o.createdAt)}</span></div>
        <div class="order-meta-field"><span class="order-meta-label">Total</span><span class="order-meta-val" style="font-family:var(--font-mono);color:var(--gold-bright)">${formatCurrency(o.totalAmount)}</span></div>
        ${o.notes ? `<div class="order-meta-field" style="grid-column:span 2"><span class="order-meta-label">Notes</span><span class="order-meta-val">${o.notes}</span></div>` : ''}
      </div>
      <table class="data-table">
        <thead><tr><th>Product</th><th>SKU</th><th>Qty</th><th>Unit Price</th><th>Line Total</th></tr></thead>
        <tbody>
          ${o.items.map(i => `
            <tr>
              <td>${i.product?.name || '—'}</td>
              <td class="mono">${i.product?.sku || '—'}</td>
              <td class="mono">${i.quantity}</td>
              <td class="mono">${formatCurrency(i.unitPrice)}</td>
              <td class="mono">${formatCurrency(i.unitPrice * i.quantity)}</td>
            </tr>`).join('')}
        </tbody>
      </table>`;
  } catch (err) {
    content.innerHTML = `<p class="form-error">Failed to load order: ${err.message}</p>`;
  }
}

// ── Account ───────────────────────────────────────────────
function renderAccount() {
  if (!currentUser) return;
  $('#acc-name').textContent = currentUser.name || '—';
  $('#acc-email').textContent = currentUser.email || '—';
  $('#acc-company').textContent = currentUser.companyName || '—';
  $('#acc-phone').textContent = currentUser.phone || '—';
  $('#acc-role').textContent = currentUser.role || '—';
  $('#acc-since').textContent = currentUser.createdAt ? formatDate(currentUser.createdAt) : '—';
}

// ── Boot ─────────────────────────────────────────────────
syncCartUI();
initAuth();
