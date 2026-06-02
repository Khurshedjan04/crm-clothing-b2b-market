const router = require('express').Router();
const ctrl = require('../controllers/productController');
const { protect } = require('../middleware/auth');

// Public endpoints
router.get('/', ctrl.getProducts);
router.get('/:id', ctrl.getProduct);
router.get('/:id/price-tiers', ctrl.getPriceTiers);

// Staff + Manager
router.post('/', protect(['staff', 'manager']), ctrl.createProduct);
router.put('/:id', protect(['staff', 'manager']), ctrl.updateProduct);

// Manager only
router.delete('/:id', protect(['manager']), ctrl.deleteProduct);

module.exports = router;
