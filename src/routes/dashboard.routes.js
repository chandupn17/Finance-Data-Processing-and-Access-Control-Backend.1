const { Router } = require('express');
const dashboardController = require('../controllers/dashboard.controller');
const { authenticate } = require('../middleware/authenticate');
const { requireRole } = require('../middleware/requireRole');
const { trendsQuerySchema, validateQuery } = require('../validators/record.validator');

const router = Router();

router.use(authenticate);

router.get('/summary', requireRole('ANALYST', 'ADMIN'), dashboardController.summary);
router.get('/by-category', requireRole('ANALYST', 'ADMIN'), dashboardController.byCategory);
router.get(
  '/trends',
  requireRole('ANALYST', 'ADMIN'),
  validateQuery(trendsQuerySchema),
  dashboardController.trends,
);
router.get('/recent', dashboardController.recent);

module.exports = router;
