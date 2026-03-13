require('dotenv').config();
const mongoose = require('mongoose');
const Language = require('./models/Language');
const User = require('./models/User');

const languages = [
  { code: 'en', name: 'English', nativeName: 'English', direction: 'ltr' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', direction: 'rtl' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', direction: 'ltr' },
  { code: 'fr', name: 'French', nativeName: 'Français', direction: 'ltr' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', direction: 'ltr' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', direction: 'ltr' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', direction: 'ltr' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', direction: 'ltr' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', direction: 'ltr' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', direction: 'ltr' }
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/translator');
    console.log('MongoDB connected');

    // Clear existing languages
    await Language.deleteMany({});
    console.log('Cleared languages');

    // Insert languages
    await Language.insertMany(languages);
    console.log('Inserted languages');

    // Create admin user if not exists
    const existingAdmin = await User.findOne({ username: 'admin' });
    if (!existingAdmin) {
      const admin = new User({
        username: 'admin',
        email: 'admin@translator.local',
        password: 'admin123',
        firstName: 'Admin',
        lastName: 'User',
        preferredSourceLang: 'en',
        preferredTargetLang: 'ar'
      });
      await admin.save();
      console.log('Created admin user (username: admin, password: admin123)');
    }

    console.log('\n✅ Seed completed successfully!');
    console.log('You can now start the server with: npm start');
    
    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
}

seed();
