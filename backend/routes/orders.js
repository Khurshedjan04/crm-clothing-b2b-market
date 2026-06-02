const router = require('express').Router();
const ctrl = require('../controllers/orderController');
const { protect } = require('../middleware/auth');

router.post('/', protect(['client']), ctrl.createOrder);
router.get('/', protect(['client', 'staff', 'manager']), ctrl.getOrders);
router.get('/:id', protect(['client', 'staff', 'manager']), ctrl.getOrder);
router.patch('/:id/cancel', protect(['client']), ctrl.cancelOrder);
router.patch('/:id/status', protect(['staff', 'manager']), ctrl.updateStatus);
router.patch('/:id/payment', protect(['manager']), ctrl.updatePayment);

module.exports = router;
