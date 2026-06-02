const router = require('express').Router();
const ctrl = require('../controllers/metricController');
const { protect } = require('../middleware/auth');

router.get('/live', protect(['manager']), ctrl.getLiveMetrics);
router.post('/simulate', protect(['manager']), ctrl.simulateMetric);

module.exports = router;
