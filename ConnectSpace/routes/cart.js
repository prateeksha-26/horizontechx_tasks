const express = require('express');
const { readData } = require('../lib/db');

const router = express.Router();

function getCart(req) {
  if (!req.session.cart) req.session.cart = []; // [{productId, qty}]
  return req.session.cart;
}

function hydrateCart(cart) {
  const products = readData('products');
  return cart
    .map((item) => {
      const product = products.find((p) => p.id === item.productId);
      if (!product) return null;
      return {
        productId: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
        qty: item.qty,
        subtotal: +(product.price * item.qty).toFixed(2)
      };
    })
    .filter(Boolean);
}

// GET /api/cart
router.get('/', (req, res) => {
  const cart = getCart(req);
  const items = hydrateCart(cart);
  const total = +items.reduce((sum, i) => sum + i.subtotal, 0).toFixed(2);
  res.json({ items, total });
});

// POST /api/cart  { productId, qty }
router.post('/', (req, res) => {
  const { productId, qty } = req.body;
  const products = readData('products');
  const product = products.find((p) => p.id === parseInt(productId, 10));
  if (!product) return res.status(404).json({ error: 'Product not found.' });

  const quantity = parseInt(qty, 10) || 1;
  const cart = getCart(req);
  const existing = cart.find((c) => c.productId === product.id);
  if (existing) {
    existing.qty += quantity;
  } else {
    cart.push({ productId: product.id, qty: quantity });
  }
  req.session.cart = cart;

  const items = hydrateCart(cart);
  const total = +items.reduce((sum, i) => sum + i.subtotal, 0).toFixed(2);
  res.json({ items, total });
});

// PUT /api/cart/:productId  { qty }
router.put('/:productId', (req, res) => {
  const productId = parseInt(req.params.productId, 10);
  const { qty } = req.body;
  const cart = getCart(req);
  const item = cart.find((c) => c.productId === productId);
  if (!item) return res.status(404).json({ error: 'Item not in cart.' });

  item.qty = parseInt(qty, 10);
  req.session.cart = cart.filter((c) => c.qty > 0);

  const items = hydrateCart(req.session.cart);
  const total = +items.reduce((sum, i) => sum + i.subtotal, 0).toFixed(2);
  res.json({ items, total });
});

// DELETE /api/cart/:productId
router.delete('/:productId', (req, res) => {
  const productId = parseInt(req.params.productId, 10);
  let cart = getCart(req);
  cart = cart.filter((c) => c.productId !== productId);
  req.session.cart = cart;

  const items = hydrateCart(cart);
  const total = +items.reduce((sum, i) => sum + i.subtotal, 0).toFixed(2);
  res.json({ items, total });
});

// DELETE /api/cart - clear
router.delete('/', (req, res) => {
  req.session.cart = [];
  res.json({ items: [], total: 0 });
});

module.exports = router;
