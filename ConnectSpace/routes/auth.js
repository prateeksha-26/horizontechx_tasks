const express = require('express');
const bcrypt = require('bcryptjs');
const { readData, writeData, nextId } = require('../lib/db');

const router = express.Router();

// POST /api/auth/register
router.post('/register', (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }

  const users = readData('users');
  const existing = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    return res.status(409).json({ error: 'An account with that email already exists.' });
  }

  const hashed = bcrypt.hashSync(password, 10);
  const newUser = {
    id: nextId(users),
    name,
    email,
    password: hashed,
    createdAt: new Date().toISOString()
  };
  users.push(newUser);
  writeData('users', users);

  req.session.userId = newUser.id;
  res.status(201).json({ id: newUser.id, name: newUser.name, email: newUser.email });
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const users = readData('users');
  const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  req.session.userId = user.id;
  res.json({ id: user.id, name: user.name, email: user.email });
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ message: 'Logged out.' });
  });
});

// GET /api/auth/me
router.get('/me', (req, res) => {
  if (!req.session.userId) return res.json(null);
  const users = readData('users');
  const user = users.find((u) => u.id === req.session.userId);
  if (!user) return res.json(null);
  res.json({ id: user.id, name: user.name, email: user.email });
});

module.exports = router;
