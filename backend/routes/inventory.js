const router = require('express').Router();
const ctrl = require('../controllers/inventoryController');
const { protect } = require('../middleware/auth');

router.get('/',       protect(['manager', 'admin']), ctrl.getItems);
router.post('/',      protect(['manager', 'admin']), ctrl.createItem);
router.patch('/:id',  protect(['manager', 'admin']), ctrl.updateItem);
router.delete('/:id', protect(['manager']), ctrl.deleteItem);

module.exports = router;
