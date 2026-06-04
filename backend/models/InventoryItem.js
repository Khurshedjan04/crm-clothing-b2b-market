const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema(
  {
    sku:         { type: String, required: true, unique: true, uppercase: true, trim: true },
    productName: { type: String, required: true, trim: true },
    category:    { type: String, trim: true },
    quantity:    { type: Number, default: 0, min: 0 },
    price:       { type: Number, default: 0 },
    lowStockThreshold: { type: Number, default: 10 },
    supplier:    { type: String, trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('InventoryItem', inventorySchema);
