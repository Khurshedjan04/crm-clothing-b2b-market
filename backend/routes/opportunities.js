const router = require('express').Router();
const ctrl = require('../controllers/opportunityController');
const { protect } = require('../middleware/auth');

router.get('/',       protect(['manager', 'admin']), ctrl.getOpportunities);
router.get('/:id',    protect(['manager', 'admin']), ctrl.getOpportunity);
router.post('/',      protect(['manager', 'admin']), ctrl.createOpportunity);
router.patch('/:id',  protect(['manager', 'admin']), ctrl.updateOpportunity);
router.delete('/:id', protect(['manager', 'admin']), ctrl.deleteOpportunity);

module.exports = router;
