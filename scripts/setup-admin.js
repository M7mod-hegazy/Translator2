/**
 * Admin Setup Script
 * 1. Cleans up orphaned translation sessions (no createdBy)
 * 2. Creates an admin user
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');
const TranslationSession = require('../models/TranslationSession');

async function setup() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
    console.log('✓ Connected to MongoDB');

    // 1. Delete orphaned translation sessions (no createdBy)
    const deleteResult = await TranslationSession.deleteMany({
      createdBy: { $exists: false }
    });
    console.log(`✓ Deleted ${deleteResult.deletedCount} orphaned translation sessions`);

    // 2. Check if admin already exists
    const existingAdmin = await User.findOne({ role: 'admin' });
    const existingAdminUser = await User.findOne({ username: 'admin' });
    
    if (existingAdmin) {
      console.log('\n========================================');
      console.log('ADMIN ACCOUNT ALREADY EXISTS');
      console.log('========================================');
      console.log('Username:', existingAdmin.username);
      console.log('Email:', existingAdmin.email);
      console.log('Role:', existingAdmin.role);
      console.log('========================================');
      console.log('\nUse these credentials to login to the admin dashboard.');
    } else if (existingAdminUser) {
      // User 'admin' exists but is not admin role - update them
      existingAdminUser.role = 'admin';
      await existingAdminUser.save();
      console.log('\n========================================');
      console.log('ADMIN ACCOUNT UPDATED');
      console.log('========================================');
      console.log('Username:', existingAdminUser.username);
      console.log('Email:', existingAdminUser.email);
      console.log('Password: (use existing password)');
      console.log('Role: admin');
      console.log('========================================');
    } else {
      // Create admin user
      const adminUser = new User({
        username: 'admin',
        email: 'admin@translator.com',
        password: 'Admin@123',
        firstName: 'System',
        lastName: 'Admin',
        role: 'admin'
      });

      await adminUser.save();
      
      console.log('\n========================================');
      console.log('ADMIN ACCOUNT CREATED SUCCESSFULLY');
      console.log('========================================');
      console.log('Username: admin');
      console.log('Email: admin@translator.com');
      console.log('Password: Admin@123');
      console.log('========================================');
      console.log('\n⚠️  IMPORTANT: Change the password after first login!');
      console.log('Admin Dashboard URL: http://localhost:3000/admin');
    }

    await mongoose.connection.close();
    console.log('\n✓ Setup complete!');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

setup();
