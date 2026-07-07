// Shared nav bar renderer + small fetch helpers, included on every page.

async function api(path, options = {}) {
  const res = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error((data && data.error) || 'Something went wrong.');
  }
  return data;
}

async function renderNav() {
  const el = document.getElementById('nav-root');
  if (!el) return;

  let user = null;
  try {
    user = await api('/auth/me');
  } catch (e) {
    user = null;
  }

  let cartCount = 0;
  try {
    const cart = await api('/cart');
    cartCount = cart.items.reduce((n, i) => n + i.qty, 0);
  } catch (e) {}

  el.innerHTML = `
    <nav class="nav">
      <div class="container">
        <a href="/index.html" class="nav-brand">Verdant<span class="dot">&amp;</span>Co</a>
        <div class="nav-links">
          <a href="/index.html">Shop</a>
          <a href="/cart.html">Cart${cartCount ? `<span class="cart-badge">${cartCount}</span>` : ''}</a>
          ${
            user
              ? `<a href="/orders.html">My Orders</a>
                 <span class="nav-user">Hi, ${escapeHtml(user.name.split(' ')[0])}</span>
                 <button class="btn-link" id="logout-btn">Log out</button>`
              : `<a href="/login.html">Log in</a>
                 <a href="/register.html">Sign up</a>`
          }
        </div>
      </div>
    </nav>
  `;

  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await api('/auth/logout', { method: 'POST' });
      window.location.href = '/index.html';
    });
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function money(n) {
  return `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

document.addEventListener('DOMContentLoaded', renderNav);
