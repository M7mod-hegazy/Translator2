const mongoose = require('mongoose');

// Cache for serverless environments
let cachedDb = null;

const connectDB = async () => {
  // Return cached connection if available
  if (cachedDb && cachedDb.readyState === 1) {
    return cachedDb;
  }
  
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/translator', {
      bufferCommands: false,
      serverSelectionTimeoutMS: 5000,
    });
    cachedDb = conn.connection;
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return cachedDb;
  } catch (error) {
    console.error(`Error: ${error.message}`);
    throw error;
  }
};

module.exports = connectDB;
