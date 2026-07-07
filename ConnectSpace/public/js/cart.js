async function loadCart() {
  const container = document.getElementById('cart-page');
  try {
    const { items, total } = await api('/cart');
    if (items.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1;">
          <h3>Your cart is empty</h3>
          <p>Browse the shop to find something you like.</p>
          <a href="/index.html" class="btn btn-primary" style="margin-top:14px;display:inline-flex;">Go to shop</a>
        </div>`;
      return;
    }

    container.innerHTML = `
      <div>
        ${items
          .map(
            (i) => `
          <div class="cart-item" data-id="${i.productId}">
            <img src="${i.image}" alt="${escapeHtml(i.name)}">
            <div class="info">
              <h3>${escapeHtml(i.name)}</h3>
              <div class="qty-controls">
                <button class="qty-dec">−</button>
                <span>${i.qty}</span>
                <button class="qty-inc">+</button>
              </div>
              <button class="remove-link">Remove</button>
            </div>
            <div class="price">${money(i.subtotal)}</div>
          </div>
        `
          )
          .join('')}
      </div>
      <div class="cart-summary card">
        <div class="summary-row"><span>Subtotal</span><span>${money(total)}</span></div>
        <div class="summary-row"><span>Shipping</span><span>Free</span></div>
        <div class="summary-row total"><span>Total</span><span>${money(total)}</span></div>
        <a href="/checkout-note" id="checkout-btn" class="btn btn-primary btn-block" style="margin-top:18px;">Proceed to checkout</a>
      </div>
    `;

    container.querySelectorAll('.qty-inc').forEach((btn) =>
      btn.addEventListener('click', (e) => changeQty(e, 1))
    );
    container.querySelectorAll('.qty-dec').forEach((btn) =>
      btn.addEventListener('click', (e) => changeQty(e, -1))
    );
    container.querySelectorAll('.remove-link').forEach((btn) =>
      btn.addEventListener('click', (e) => removeItem(e))
    );

    document.getElementById('checkout-btn').addEventListener('click', async (e) => {
      e.preventDefault();
      const user = await api('/auth/me');
      if (!user) {
        window.location.href = '/login.html?next=checkout';
        return;
      }
      window.location.href = '/orders.html?checkout=1';
    });
  } catch (e) {
    container.innerHTML = `<p>Could not load cart.</p>`;
  }
}

async function changeQty(e, delta) {
  const row = e.target.closest('.cart-item');
  const productId = row.dataset.id;
  const currentQty = parseInt(row.querySelector('.qty-controls span').textContent, 10);
  const newQty = currentQty + delta;
  if (newQty < 1) return removeItem(e);
  await api(`/cart/${productId}`, {
    method: 'PUT',
    body: JSON.stringify({ qty: newQty })
  });
  loadCart();
  renderNav();
}

async function removeItem(e) {
  const row = e.target.closest('.cart-item');
  const productId = row.dataset.id;
  await api(`/cart/${productId}`, { method: 'DELETE' });
  loadCart();
  renderNav();
}

loadCart();
