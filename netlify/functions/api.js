// netlify/functions/api.js
const express = require('express');
const serverless = require('serverless-http');
const mongoose = require('mongoose');
const cors = require('cors');

// Import your existing routes
const authRoutes = require('../../routes/auth');
const rentalRoutes = require('../../routes/rentalRoutes');
const productRoutes = require('../../routes/productRoutes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection (cached for serverless)
let cachedDb = null;

async function connectToDatabase() {
  if (cachedDb) return cachedDb;
  
  try {
    const connection = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    cachedDb = connection;
    console.log('MongoDB connected');
    return connection;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
}

// Connect middleware
app.use(async (req, res, next) => {
  try {
    await connectToDatabase();
    next();
  } catch (error) {
    res.status(500).json({ error: 'Database connection failed' });
  }
});

// Routes
app.use('/api/users', authRoutes);
app.use('/api/rentals', rentalRoutes);
app.use('/api/products', productRoutes);

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({ message: 'API is working!' });
});

// Export the serverless function
exports.handler = serverless(app);