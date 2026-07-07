const express = require('express');
const { readData } = require('../lib/db');

const router = express.Router();

// GET /api/products - list all products (optional ?category=&search=)
router.get('/', (req, res) => {
  let products = readData('products');
  const { category, search } = req.query;

  if (category) {
    products = products.filter(
      (p) => p.category.toLowerCase() === category.toLowerCase()
    );
  }
  if (search) {
    const q = search.toLowerCase();
    products = products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
    );
  }
  res.json(products);
});

// GET /api/products/:id - product detail
router.get('/:id', (req, res) => {
  const products = readData('products');
  const product = products.find((p) => p.id === parseInt(req.params.id, 10));
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json(product);
});

module.exports = router;
