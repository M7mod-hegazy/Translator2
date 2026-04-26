require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

async function createAdmin() {
  try {
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
    await mongoose.connect(uri);
    console.log('Connected to MongoDB');
    
    // Delete existing admin
    await User.deleteOne({ username: 'admin' });
    console.log('Deleted existing admin');
    
    // Create new admin
    const user = new User({
      username: 'admin',
      email: 'admin@translator.com',
      password: 'Admin123!',
      firstName: 'System',
      lastName: 'Admin',
      role: 'admin'
    });
    
    await user.save();
    
    console.log('\n========================================');
    console.log('NEW ADMIN ACCOUNT CREATED');
    console.log('========================================');
    console.log('Username: admin');
    console.log('Password: Admin123!');
    console.log('========================================');
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

createAdmin();
