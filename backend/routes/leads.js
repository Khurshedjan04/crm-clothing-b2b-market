const router = require('express').Router();
const ctrl = require('../controllers/leadController');
const { protect } = require('../middleware/auth');

router.get('/',       protect(['manager', 'admin']), ctrl.getLeads);
router.get('/:id',    protect(['manager', 'admin']), ctrl.getLead);
router.post('/',      protect(['manager', 'admin']), ctrl.createLead);
router.patch('/:id',  protect(['manager', 'admin']), ctrl.updateLead);
router.delete('/:id', protect(['manager', 'admin']), ctrl.deleteLead);

module.exports = router;
