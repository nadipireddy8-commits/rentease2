// migrate-simple.js
const mongoose = require('mongoose');
require('dotenv').config();

// Local MongoDB
const localURI = 'mongodb://localhost:27017/rentEase';
const atlasURI = process.env.MONGODB_URI;

console.log('📍 Local URI:', localURI);
console.log('📍 Atlas URI:', atlasURI ? '✅ Set' : '❌ Not set');

async function migrate() {
  try {
    // 1. Connect to local and get products
    console.log('\n1️⃣ Connecting to Local MongoDB...');
    const localConn = await mongoose.createConnection(localURI);
    
    // Wait for connection to be ready
    await localConn.asPromise();
    console.log('✅ Local connection ready');
    
    // Get the database
    const localDb = localConn.db;
    if (!localDb) {
      throw new Error('Local database object is undefined');
    }
    
    // Get products
    const products = await localDb.collection('products').find().toArray();
    console.log(`✅ Found ${products.length} products locally`);
    
    if (products.length === 0) {
      console.log('❌ No products found!');
      return;
    }
    
    console.log('\n📋 Sample products:');
    products.slice(0, 3).forEach((p, i) => {
      console.log(`   ${i+1}. ${p.name} - ₹${p.rent}`);
    });
    
    // 2. Connect to Atlas
    console.log('\n2️⃣ Connecting to Atlas...');
    const atlasConn = await mongoose.createConnection(atlasURI);
    await atlasConn.asPromise();
    console.log('✅ Atlas connection ready');
    
    const atlasDb = atlasConn.db;
    
    // Clear existing
    await atlasDb.collection('products').deleteMany({});
    console.log('🗑️ Cleared existing products in Atlas');
    
    // Insert new
    const result = await atlasDb.collection('products').insertMany(products);
    console.log(`✅ Migrated ${result.insertedCount} products to Atlas`);
    
    // Verify
    const count = await atlasDb.collection('products').countDocuments();
    console.log(`📊 Atlas now has ${count} products`);
    
    await localConn.close();
    await atlasConn.close();
    console.log('\n🎉 Migration complete!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n🔧 Debug info:');
    console.log('1. Is MongoDB running? Should be: Yes (from your service check)');
    console.log('2. Database name: rentEase');
    console.log('3. Try connecting with MongoDB Compass to verify');
  }
}

migrate();