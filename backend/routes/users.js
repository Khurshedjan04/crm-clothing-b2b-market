const router = require('express').Router();
const ctrl = require('../controllers/userController');
const { protect } = require('../middleware/auth');

router.get('/',    protect(['manager']), ctrl.getUsers);
router.get('/:id', protect(['manager']), ctrl.getUser);
router.post('/',   protect(['manager']), ctrl.createUser);
router.patch('/:id', protect(['manager']), ctrl.updateUser);
router.delete('/:id', protect(['manager']), ctrl.deleteUser);

module.exports = router;
