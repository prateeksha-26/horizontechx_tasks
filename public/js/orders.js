const STATUS_FLOW = ['Processing', 'Shipped', 'Out for Delivery', 'Delivered'];

async function init() {
  const params = new URLSearchParams(window.location.search);
  const user = await api('/auth/me');

  if (!user) {
    document.getElementById('orders-list').innerHTML = `
      <div class="empty-state">
        <h3>Please log in</h3>
        <p>Log in to view your orders and order tracking.</p>
        <a href="/login.html" class="btn btn-primary" style="margin-top:14px;display:inline-flex;">Log in</a>
      </div>`;
    return;
  }

  if (params.get('checkout') === '1') {
    await renderCheckout();
  }
  await renderOrders();
}

async function renderCheckout() {
  const section = document.getElementById('checkout-section');
  const { items, total } = await api('/cart');

  if (items.length === 0) {
    section.innerHTML = '';
    return;
  }

  section.innerHTML = `
    <div class="card" style="margin-top:32px;">
      <h2 style="margin-top:0;">Checkout</h2>
      <div id="checkout-error"></div>
      <p style="color:var(--muted);">${items.length} item(s) — Total: <strong>${money(total)}</strong></p>
      <form id="checkout-form">
        <div class="form-group">
          <label for="address">Shipping address</label>
          <textarea id="address" rows="3" required placeholder="Street, City, State, ZIP"></textarea>
        </div>
        <button type="submit" class="btn btn-primary">Place order</button>
      </form>
    </div>
  `;

  document.getElementById('checkout-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const shippingAddress = document.getElementById('address').value;
    try {
      await api('/orders', {
        method: 'POST',
        body: JSON.stringify({ shippingAddress })
      });
      window.history.replaceState({}, '', '/orders.html');
      section.innerHTML = `<div class="success-box" style="margin-top:32px;">Order placed successfully!</div>`;
      renderNav();
      renderOrders();
    } catch (err) {
      document.getElementById('checkout-error').innerHTML = `<div class="error-box">${escapeHtml(err.message)}</div>`;
    }
  });
}

async function renderOrders() {
  const list = document.getElementById('orders-list');
  const orders = await api('/orders');

  if (orders.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <h3>No orders yet</h3>
        <p>Once you place an order, it'll show up here with live tracking.</p>
      </div>`;
    return;
  }

  list.innerHTML = orders.map((o) => renderOrderCard(o)).join('');
}

function renderOrderCard(order) {
  const stepIndex = STATUS_FLOW.indexOf(order.status);
  const steps = STATUS_FLOW.map((s, i) => {
    let cls = '';
    if (i < stepIndex) cls = 'done';
    else if (i === stepIndex) cls = 'active';
    return `<div class="step ${cls}"><div class="bubble">${i < stepIndex ? '✓' : i + 1}</div>${s}</div>`;
  }).join('');

  return `
    <div class="order-card">
      <div class="head">
        <div>
          <strong>Order #${order.id}</strong>
          <div style="color:var(--muted);font-size:0.85rem;">${new Date(order.placedAt).toLocaleString()}</div>
        </div>
        <span class="status-pill ${order.status === 'Delivered' ? 'Delivered' : ''}">${order.status}</span>
      </div>
      <div class="tracker">${steps}</div>
      <div style="margin-top:16px;font-size:0.9rem;color:var(--muted);">
        Shipping to: ${escapeHtml(order.shippingAddress)}
      </div>
      <div style="margin-top:14px;">
        ${order.items.map((i) => `<div style="display:flex;justify-content:space-between;font-size:0.9rem;padding:4px 0;"><span>${i.qty} × ${escapeHtml(i.name)}</span><span>${money(i.subtotal)}</span></div>`).join('')}
      </div>
      <div style="text-align:right;font-weight:700;margin-top:10px;border-top:1px solid var(--border);padding-top:10px;">
        Total: ${money(order.total)}
      </div>
    </div>
  `;
}

init();
