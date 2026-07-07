import express from 'express';
import { signToken } from '../utils/jwt.js';
import { authMiddleware } from '../middleware/auth.js';
import User from '../models/User.js';

const router = express.Router();

const NAME_REGEX = /^[a-zA-Z\s]{2,30}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[!@#$%^&*]).{8,}$/;

function validateRegisterInput({ name, email, password }) {
  const errors = [];

  if (!name || !NAME_REGEX.test(name.trim())) {
    errors.push({ field: 'name', message: 'Please enter a valid name (letters only)' });
  }

  if (!email || !EMAIL_REGEX.test(email.trim())) {
    errors.push({ field: 'email', message: 'Please enter a valid email address' });
  }

  if (!password || !PASSWORD_REGEX.test(password)) {
    errors.push({ field: 'password', message: 'Password must meet all requirements' });
  }

  return errors;
}

router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const errors = validateRegisterInput({ name, email, password });

    if (errors.length > 0) {
      return res.status(400).json({ message: errors[0].message, errors });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ message: 'An account with this email already exists', errors: [{ field: 'email', message: 'An account with this email already exists' }] });
    }

    const user = await User.create({ name: name.trim(), email: normalizedEmail, password });
    const token = signToken(user._id);

    res.status(201).json({ user, token });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please enter your password' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Incorrect email or password. Please try again.' });
    }

    const token = signToken(user._id);
    res.json({ user, token });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/me', authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

export default router;
