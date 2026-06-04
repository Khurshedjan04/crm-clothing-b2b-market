const router = require('express').Router();
const ctrl = require('../controllers/auditController');
const { protect } = require('../middleware/auth');

router.get('/', protect(['manager']), ctrl.getLogs);

module.exports = router;
