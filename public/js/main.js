let allProducts = [];

async function loadProducts() {
  const grid = document.getElementById('product-grid');
  try {
    allProducts = await api('/products');
    populateCategories(allProducts);
    renderGrid(allProducts);
  } catch (e) {
    grid.innerHTML = `<p>Could not load products.</p>`;
  }
}

function populateCategories(products) {
  const select = document.getElementById('category-select');
  const categories = [...new Set(products.map((p) => p.category))];
  categories.forEach((c) => {
    const opt = document.createElement('option');
    opt.value = c;
    opt.textContent = c;
    select.appendChild(opt);
  });
}

function renderGrid(products) {
  const grid = document.getElementById('product-grid');
  if (products.length === 0) {
    grid.innerHTML = `<div class="empty-state"><h3>No products found</h3><p>Try a different search or category.</p></div>`;
    return;
  }
  grid.innerHTML = products
    .map(
      (p) => `
    <a class="product-card" href="/product.html?id=${p.id}">
      <img src="${p.image}" alt="${escapeHtml(p.name)}">
      <div class="body">
        <span class="category">${escapeHtml(p.category)}</span>
        <h3>${escapeHtml(p.name)}</h3>
        <p class="desc">${escapeHtml(p.description)}</p>
        <span class="price">${money(p.price)}</span>
      </div>
    </a>
  `
    )
    .join('');
}

function applyFilters() {
  const q = document.getElementById('search-input').value.toLowerCase();
  const cat = document.getElementById('category-select').value;
  let filtered = allProducts;
  if (cat) filtered = filtered.filter((p) => p.category === cat);
  if (q) {
    filtered = filtered.filter(
      (p) =>
        p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
    );
  }
  renderGrid(filtered);
}

document.getElementById('search-input').addEventListener('input', applyFilters);
document.getElementById('category-select').addEventListener('change', applyFilters);

loadProducts();
