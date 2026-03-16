const JwtStrategy = require('passport-jwt').Strategy;
const LocalStrategy = require('passport-local').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const bcrypt = require('bcryptjs');
const passport = require('passport');
const User = require('../models/User');

const escapeRegExp = (value) => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Local Strategy for login
passport.use(
  new LocalStrategy(async (username, password, done) => {
    try {
      const identifier = String(username || '').trim();
      console.log('LocalStrategy - lookup identifier:', identifier);
      if (!identifier) {
        return done(null, false, { message: 'Username or email is required' });
      }
      const safeIdentifier = escapeRegExp(identifier);
      const matcher = new RegExp(`^${safeIdentifier}$`, 'i');
      const user = await User.findOne({
        $or: [
          { username: { $regex: matcher } },
          { email: { $regex: matcher } }
        ]
      });
      if (!user) {
        console.log('LocalStrategy - user not found');
        return done(null, false, { message: 'Invalid username or password' });
      }
      
      console.log('LocalStrategy - user found, comparing password');
      const isMatch = await bcrypt.compare(password, user.password);
      console.log('LocalStrategy - password match:', isMatch);
      
      if (!isMatch) {
        return done(null, false, { message: 'Invalid username or password' });
      }
      
      return done(null, user);
    } catch (err) {
      console.error('LocalStrategy error:', err);
      return done(err);
    }
  })
);

// JWT Strategy for API
passport.use(
  new JwtStrategy(
    {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET || 'translator-secret'
    },
    async (payload, done) => {
      try {
        const user = await User.findById(payload.sub);
        if (user) {
          return done(null, user);
        }
        return done(null, false);
      } catch (err) {
        return done(err, false);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

module.exports = passport;
