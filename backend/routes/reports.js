const router = require('express').Router();
const ctrl = require('../controllers/reportController');
const { protect } = require('../middleware/auth');

router.get('/summary',    protect(['manager', 'admin']), ctrl.getSummary);
router.get('/growth',     protect(['manager', 'admin']), ctrl.getCustomerGrowth);
router.get('/pipeline',   protect(['manager', 'admin']), ctrl.getPipeline);
router.get('/sources',    protect(['manager', 'admin']), ctrl.getLeadSources);
router.get('/employees',  protect(['manager']), ctrl.getEmployeePerformance);

module.exports = router;
