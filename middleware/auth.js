// Require authentication
exports.ensureAuth = (req, res, next) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'Login required', needLogin: true });
};

// Guest only (not logged in)
exports.ensureGuest = (req, res, next) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return res.redirect('/');
  }
  next();
};

// Require admin role
exports.ensureAdmin = (req, res, next) => {
  console.log('ensureAdmin check - isAuthenticated:', req.isAuthenticated ? req.isAuthenticated() : 'no method');
  console.log('ensureAdmin check - user:', req.user);
  
  if (req.isAuthenticated && req.isAuthenticated()) {
    if (req.user && req.user.role === 'admin') {
      return next();
    }
    // User is logged in but not admin
    return res.status(403).render('errors/403', { 
      title: 'Access Denied',
      message: 'You need admin privileges to access this page.'
    });
  }
  // Not logged in - show admin login page
  console.log('Rendering admin login page');
  return res.render('admin/login', {
    title: 'Admin Login',
    user: null
  });
};

// API Authentication - optional, allows anonymous access but sets user if logged in
exports.apiAuth = (req, res, next) => {
  next();
};

// Check if user owns resource
exports.checkOwnership = (model, param = 'id') => {
  return async (req, res, next) => {
    try {
      const resource = await model.findById(req.params[param]);
      if (!resource) {
        return res.status(404).json({ error: 'Resource not found' });
      }
      req.resource = resource;
      next();
    } catch (err) {
      res.status(500).json({ error: 'Server error' });
    }
  };
};
