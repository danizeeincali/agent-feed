/**
 * Simple Agent Dynamic Pages Router Stub
 * Minimal implementation for testing the data readiness API
 */

import express from 'express';

const router = express.Router();

// Simple stub endpoints for testing
router.get('/', (req, res) => {
  res.json({ message: 'Agent Dynamic Pages API - Stub Implementation' });
});

export default router;