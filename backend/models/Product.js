const mongoose = require('mongoose');

const tierSchema = new mongoose.Schema(
  {
    minQty: { type: Number, required: true },
    pricePerUnit: { type: Number, required: true },
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ['Hoodies', 'Cargo Pants', 'Tees', 'Jackets', 'Shorts', 'Accessories'],
      required: true,
    },
    sku: { type: String, required: true, unique: true, uppercase: true, trim: true },
    description: { type: String, trim: true },
    pricePerUnit: { type: Number, required: true },
    tierPricing: [tierSchema],
    stockLevel: { type: Number, default: 0, min: 0 },
    warehouseLocation: { type: String, trim: true },
    images: [{ type: String }],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

productSchema.index({ name: 'text', description: 'text', sku: 'text' });

module.exports = mongoose.model('Product', productSchema);
