const express = require('express');
const { readData, writeData, nextId } = require('../lib/db');
const { requireAuth } = require('../lib/auth');

const router = express.Router();

const STATUS_FLOW = ['Processing', 'Shipped', 'Out for Delivery', 'Delivered'];

// POST /api/orders - place an order from current session cart
router.post('/', requireAuth, (req, res) => {
  const cart = req.session.cart || [];
  if (cart.length === 0) {
    return res.status(400).json({ error: 'Your cart is empty.' });
  }

  const { shippingAddress } = req.body;
  if (!shippingAddress) {
    return res.status(400).json({ error: 'Shipping address is required.' });
  }

  const products = readData('products');
  const items = cart
    .map((c) => {
      const product = products.find((p) => p.id === c.productId);
      if (!product) return null;
      return {
        productId: product.id,
        name: product.name,
        price: product.price,
        qty: c.qty,
        subtotal: +(product.price * c.qty).toFixed(2)
      };
    })
    .filter(Boolean);

  const total = +items.reduce((sum, i) => sum + i.subtotal, 0).toFixed(2);

  const orders = readData('orders');
  const newOrder = {
    id: nextId(orders),
    userId: req.session.userId,
    items,
    total,
    shippingAddress,
    status: STATUS_FLOW[0],
    placedAt: new Date().toISOString()
  };
  orders.push(newOrder);
  writeData('orders', orders);

  // clear cart after order
  req.session.cart = [];

  res.status(201).json(newOrder);
});

// GET /api/orders - list current user's orders
router.get('/', requireAuth, (req, res) => {
  const orders = readData('orders').filter((o) => o.userId === req.session.userId);
  // simulate progressing status based on time elapsed since placed, for demo purposes
  const updated = orders.map((o) => ({ ...o, status: simulateStatus(o) }));
  res.json(updated.sort((a, b) => new Date(b.placedAt) - new Date(a.placedAt)));
});

// GET /api/orders/:id - order detail / tracking
router.get('/:id', requireAuth, (req, res) => {
  const orders = readData('orders');
  const order = orders.find(
    (o) => o.id === parseInt(req.params.id, 10) && o.userId === req.session.userId
  );
  if (!order) return res.status(404).json({ error: 'Order not found.' });
  res.json({ ...order, status: simulateStatus(order) });
});

// Simulate order progressing through statuses over time (for demo tracking)
function simulateStatus(order) {
  const minutesElapsed = (Date.now() - new Date(order.placedAt).getTime()) / 60000;
  const stepIndex = Math.min(
    STATUS_FLOW.length - 1,
    Math.floor(minutesElapsed / 2) // advances a stage every 2 minutes for demo
  );
  return STATUS_FLOW[stepIndex];
}

module.exports = router;
