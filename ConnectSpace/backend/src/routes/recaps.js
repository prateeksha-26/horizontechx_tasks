import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import Recap from '../models/Recap.js';

const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
  try {
    const recaps = await Recap.find({ owner: req.user._id })
      .sort({ createdAt: -1 })
      .lean();

    res.json({ recaps });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:recapId', authMiddleware, async (req, res) => {
  try {
    const recap = await Recap.findOne({ _id: req.params.recapId, owner: req.user._id }).lean();
    if (!recap) {
      return res.status(404).json({ error: 'Recap not found' });
    }

    res.json({ recap });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
