const router = require('express').Router();
const ctrl = require('../controllers/customerController');
const { protect } = require('../middleware/auth');

router.get('/',      protect(['manager', 'admin']), ctrl.getCustomers);
router.get('/:id',   protect(['manager', 'admin']), ctrl.getCustomer);
router.post('/',     protect(['manager', 'admin']), ctrl.createCustomer);
router.patch('/:id', protect(['manager', 'admin']), ctrl.updateCustomer);
router.delete('/:id', protect(['manager']), ctrl.deleteCustomer);

module.exports = router;
