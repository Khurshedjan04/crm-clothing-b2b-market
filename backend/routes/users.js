const router = require('express').Router();
const ctrl = require('../controllers/userController');
const { protect } = require('../middleware/auth');

router.get('/', protect(['manager']), ctrl.getUsers);
router.get('/:id', protect(['manager']), ctrl.getUser);
router.post('/staff', protect(['manager']), ctrl.createStaff);
router.patch('/:id', protect(['manager']), ctrl.updateUser);
router.delete('/:id', protect(['manager']), ctrl.deactivateUser);

module.exports = router;
