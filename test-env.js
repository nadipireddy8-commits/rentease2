// test-env.js
const dotenv = require('dotenv');
const path = require('path');
const mongoose = require('mongoose');

// 1. Load .env and log its path
const envPath = path.join(__dirname, '.env');
console.log('1. Looking for .env at:', envPath);

const result = dotenv.config({ path: envPath });
if (result.error) {
    console.error('❌ Error loading .env file:', result.error);
    process.exit(1);
}
console.log('✅ .env file loaded successfully.');

// 2. Read the variable
const uri = process.env.MONGODB_URI;
console.log('2. Value of MONGODB_URI:', uri ? '✅ Found' : '❌ NOT FOUND');

if (!uri) {
    console.error('❌ MONGODB_URI is undefined. Check the variable name in your .env file.');
    console.log('   It must be exactly "MONGODB_URI=" (no spaces).');
    process.exit(1);
}

// 3. Attempt a connection
console.log('3. Attempting to connect to MongoDB Atlas...');
mongoose.connect(uri)
    .then(() => {
        console.log('✅ SUCCESS! Connected to MongoDB Atlas.');
        process.exit(0);
    })
    .catch(err => {
        console.error('❌ Connection failed. Error:', err.message);
        process.exit(1);
    });