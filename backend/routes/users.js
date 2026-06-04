const router = require('express').Router();
const ctrl = require('../controllers/userController');
const { protect } = require('../middleware/auth');

// Listing users is allowed for both roles (admins need it to assign
// customers/leads/opportunities to owners). Creating/editing/deleting
// users stays manager-only — admins cannot manage accounts.
router.get('/',    protect(['manager', 'admin']), ctrl.getUsers);
router.get('/:id', protect(['manager', 'admin']), ctrl.getUser);
router.post('/',   protect(['manager']), ctrl.createUser);
router.patch('/:id', protect(['manager']), ctrl.updateUser);
router.delete('/:id', protect(['manager']), ctrl.deleteUser);

module.exports = router;
