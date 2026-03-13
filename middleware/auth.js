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
  if (req.isAuthenticated && req.isAuthenticated()) {
    if (req.user && req.user.role === 'admin') {
      return next();
    }
    return res.status(403).json({ error: 'Admin access required' });
  }
  res.status(401).json({ error: 'Login required', needLogin: true });
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
