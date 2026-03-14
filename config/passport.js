const JwtStrategy = require('passport-jwt').Strategy;
const LocalStrategy = require('passport-local').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const bcrypt = require('bcryptjs');
const passport = require('passport');
const User = require('../models/User');

// Local Strategy for login
passport.use(
  new LocalStrategy(async (username, password, done) => {
    try {
      console.log('LocalStrategy - looking for user:', username);
      // Case-insensitive username search
      const user = await User.findOne({ username: { $regex: new RegExp(`^${username}$`, 'i') } });
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
