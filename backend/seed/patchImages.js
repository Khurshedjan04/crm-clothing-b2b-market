require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const Product = require('../models/Product');

const IMAGES = {
  'HOD-001': ['https://images.unsplash.com/photo-1556821840-3a63f15732ce?w=600&h=750&fit=crop&auto=format'],
  'HOD-002': ['https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=600&h=750&fit=crop&auto=format'],
  'HOD-003': ['https://images.unsplash.com/photo-1509942774463-acf339cf87d5?w=600&h=750&fit=crop&auto=format'],
  'CGO-001': ['https://images.unsplash.com/photo-1542272604-787c3835535d?w=600&h=750&fit=crop&auto=format'],
  'CGO-002': ['https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=600&h=750&fit=crop&auto=format'],
  'CGO-003': ['https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=600&h=750&fit=crop&auto=format'],
  'TEE-001': ['https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=600&h=750&fit=crop&auto=format'],
  'TEE-002': ['https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=600&h=750&fit=crop&auto=format'],
  'TEE-003': ['https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=600&h=750&fit=crop&auto=format'],
  'JKT-001': ['https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600&h=750&fit=crop&auto=format'],
  'JKT-002': ['https://images.unsplash.com/photo-1548126032-079a0fb0099d?w=600&h=750&fit=crop&auto=format'],
  'JKT-003': ['https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=600&h=750&fit=crop&auto=format'],
  'SHT-001': ['https://images.unsplash.com/photo-1591195853828-11db59a44f43?w=600&h=750&fit=crop&auto=format'],
  'SHT-002': ['https://images.unsplash.com/photo-1562183241-b937e95585b6?w=600&h=750&fit=crop&auto=format'],
  'ACC-001': ['https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=600&h=750&fit=crop&auto=format'],
  'ACC-002': ['https://images.unsplash.com/photo-1510598155651-00e18c84d31e?w=600&h=750&fit=crop&auto=format'],
  'ACC-003': ['https://images.unsplash.com/photo-1547949003-9792a18a2601?w=600&h=750&fit=crop&auto=format'],
  'ACC-004': ['https://images.unsplash.com/photo-1554284126-aa88f22d8b74?w=600&h=750&fit=crop&auto=format'],
};

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected — patching product images...');
  let count = 0;
  for (const [sku, images] of Object.entries(IMAGES)) {
    const result = await Product.updateOne({ sku }, { $set: { images } });
    if (result.modifiedCount) { console.log(`  ✓ ${sku}`); count++; }
    else console.log(`  – ${sku} (not found or unchanged)`);
  }
  console.log(`Done. ${count} products updated.`);
  await mongoose.disconnect();
}

run().catch(err => { console.error(err); process.exit(1); });
