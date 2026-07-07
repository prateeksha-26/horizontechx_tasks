const params = new URLSearchParams(window.location.search);
const productId = params.get('id');

async function loadProduct() {
  const el = document.getElementById('product-detail');
  if (!productId) {
    el.innerHTML = `<p>No product specified.</p>`;
    return;
  }
  try {
    const p = await api(`/products/${productId}`);
    el.innerHTML = `
      <img src="${p.image}" alt="${escapeHtml(p.name)}">
      <div>
        <span class="category" style="color:#B87F1B;font-weight:700;font-size:0.75rem;text-transform:uppercase;">${escapeHtml(p.category)}</span>
        <h1>${escapeHtml(p.name)}</h1>
        <p>${escapeHtml(p.description)}</p>
        <div class="price">${money(p.price)}</div>
        <p class="stock-note">${p.stock > 0 ? `${p.stock} in stock` : 'Out of stock'}</p>
        <div class="qty-row">
          <label for="qty">Qty</label>
          <input type="number" id="qty" value="1" min="1" max="${p.stock}">
          <button class="btn btn-primary" id="add-btn" ${p.stock === 0 ? 'disabled' : ''}>Add to cart</button>
        </div>
        <p id="add-msg" class="success-box" style="display:none;">Added to cart!</p>
      </div>
    `;

    document.getElementById('add-btn').addEventListener('click', async () => {
      const qty = parseInt(document.getElementById('qty').value, 10) || 1;
      try {
        await api('/cart', {
          method: 'POST',
          body: JSON.stringify({ productId: p.id, qty })
        });
        const msg = document.getElementById('add-msg');
        msg.style.display = 'block';
        renderNav();
        setTimeout(() => (msg.style.display = 'none'), 2000);
      } catch (e) {
        alert(e.message);
      }
    });
  } catch (e) {
    el.innerHTML = `<p>Product not found.</p>`;
  }
}

loadProduct();
