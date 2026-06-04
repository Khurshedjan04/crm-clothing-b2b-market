const router = require('express').Router();
const ctrl = require('../controllers/activityController');
const { protect } = require('../middleware/auth');

router.get('/',       protect(['manager', 'admin']), ctrl.getActivities);
router.post('/',      protect(['manager', 'admin']), ctrl.createActivity);
router.patch('/:id',  protect(['manager', 'admin']), ctrl.updateActivity);
router.delete('/:id', protect(['manager', 'admin']), ctrl.deleteActivity);

module.exports = router;
