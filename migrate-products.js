// migrate-products.js
const mongoose = require('mongoose');
require('dotenv').config();

// Local MongoDB (where your products are)
const localURI = 'mongodb://localhost:27017/rentEase';

// Atlas MongoDB (from your .env file)
const atlasURI = process.env.MONGODB_URI;

console.log('🔍 Local URI:', localURI);
console.log('🔍 Atlas URI:', atlasURI ? '✅ Found' : '❌ Not Found');

async function migrateProducts() {
  try {
    // 1. Connect to local and get products
    console.log('\n📦 Connecting to LOCAL database...');
    const localConn = await mongoose.createConnection(localURI);
    
    const products = await localConn.db.collection('products').find().toArray();
    console.log(`✅ Found ${products.length} products in LOCAL database`);

    if (products.length === 0) {
      console.log('❌ No products found in local database!');
      return;
    }

    // Show sample
    console.log('\n📋 Sample products:');
    products.slice(0, 3).forEach((p, i) => {
      console.log(`   ${i+1}. ${p.name} - ₹${p.rent}`);
    });

    // 2. Connect to Atlas and insert products
    console.log('\n☁️ Connecting to ATLAS database...');
    const atlasConn = await mongoose.createConnection(atlasURI);
    
    // Clear existing products in Atlas
    const deleted = await atlasConn.db.collection('products').deleteMany({});
    console.log(`🗑️ Cleared ${deleted.deletedCount} existing products in Atlas`);

    // Insert products
    const result = await atlasConn.db.collection('products').insertMany(products);
    console.log(`✅ Migrated ${result.insertedCount} products to ATLAS!`);

    // Verify
    const count = await atlasConn.db.collection('products').countDocuments();
    console.log(`📊 Atlas now has ${count} products`);

    await localConn.close();
    await atlasConn.close();
    console.log('\n🎉 Migration complete!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

migrateProducts();