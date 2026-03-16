const express = require('express');
const router = express.Router();
const passport = require('passport');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { ensureGuest, ensureAuth } = require('../middleware/auth');
const isProduction = process.env.NODE_ENV === 'production';

const authMeta = (req) => ({
  ip: req.headers['x-forwarded-for'] || req.ip || '',
  ua: req.headers['user-agent'] || '',
  host: req.headers.host || '',
  secure: req.secure,
  hasSession: !!req.session
});

// Login page
router.get('/login', ensureGuest, (req, res) => {
  res.render('accounts/login', {
    title: 'Login',
    error: null,
    user: null
  });
});

// Login process
router.post('/login', (req, res, next) => {
  console.log('[auth/login] attempt', {
    identifier: req.body.username,
    ...authMeta(req)
  });
  
  passport.authenticate('local', (err, user, info) => {
    if (err) {
      console.error('[auth/login] passport error:', err);
      return res.status(500).json({ error: 'Server error' });
    }
    if (!user) {
      console.log('[auth/login] denied:', info);
      return res.status(401).json({ error: info.message || 'Invalid credentials' });
    }
    const finalizeLogin = () => req.logIn(user, (loginErr) => {
      if (loginErr) {
        console.error('[auth/login] login error:', loginErr);
        return res.status(500).json({ error: 'Login failed' });
      }
      if (req.session) {
        req.session.save((saveErr) => {
          if (saveErr) {
            console.error('[auth/login] session save error:', saveErr);
            return res.status(500).json({ error: 'Session persistence failed' });
          }
          console.log('[auth/login] success', {
            user: user.username,
            role: user.role,
            sessionId: req.sessionID,
            secureCookie: !!(req.session.cookie && req.session.cookie.secure),
            sameSite: req.session.cookie && req.session.cookie.sameSite
          });
          return res.json({
            success: true,
            user: { id: user._id, username: user.username, email: user.email, role: user.role },
            diagnostic: isProduction ? undefined : { sessionId: req.sessionID }
          });
        });
        return;
      }
      console.log('[auth/login] success without session object', { user: user.username });
      return res.json({ success: true, user: { id: user._id, username: user.username, email: user.email, role: user.role } });
    });
    if (req.session && typeof req.session.regenerate === 'function') {
      return req.session.regenerate((regenErr) => {
        if (regenErr) {
          console.error('[auth/login] session regenerate error:', regenErr);
          return res.status(500).json({ error: 'Session initialization failed' });
        }
        return finalizeLogin();
      });
    }
    return finalizeLogin();
  })(req, res, next);
});

// Register page
router.get('/register', ensureGuest, (req, res) => {
  res.render('accounts/register', {
    title: 'Sign Up',
    error: null,
    user: null
  });
});

// Register process
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, firstName, lastName } = req.body;
    
    // Validate required fields
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }
    
    // Check if user exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }
    
    // Create user
    const user = new User({
      username,
      email,
      password,
      firstName: firstName || '',
      lastName: lastName || '',
      role: 'user'
    });
    
    await user.save();
    
    // Auto login after registration
    req.logIn(user, (err) => {
      if (err) {
        console.error('Login after registration failed:', err);
        return res.status(500).json({ error: 'Registration successful but login failed' });
      }
      res.json({ success: true, user: { id: user._id, username: user.username, email: user.email, role: user.role } });
    });
  } catch (err) {
    console.error('Registration error:', err);
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({ error: messages.join(', ') });
    }
    if (err.code === 11000) {
      return res.status(400).json({ error: 'Username or email already exists' });
    }
    res.status(500).json({ error: 'Registration failed: ' + err.message });
  }
});

// Logout
router.post('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.json({ success: true });
  });
});

// Get current user
router.get('/me', (req, res) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    res.json({ user: { id: req.user._id, username: req.user.username, email: req.user.email, role: req.user.role } });
  } else {
    console.log('[auth/me] unauthenticated', authMeta(req));
    res.json({ user: null });
  }
});

// API Login - JWT
router.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign(
      { sub: user._id, username: user.username, role: user.role },
      process.env.JWT_SECRET || 'translator-secret',
      { expiresIn: '7d' }
    );
    
    res.json({ token, user: { id: user._id, username: user.username, email: user.email, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
