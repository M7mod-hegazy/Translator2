const isJsonRequest = (req) => {
  const accept = String(req.headers.accept || '').toLowerCase();
  const originalUrl = String(req.originalUrl || '');
  return originalUrl.startsWith('/api/') || originalUrl.includes('/api/') || req.xhr || accept.includes('application/json');
};

const handleUnauthenticated = (req, res) => {
  if (isJsonRequest(req)) {
    return res.status(401).json({ error: 'Login required', needLogin: true });
  }
  const nextPath = encodeURIComponent(req.originalUrl || '/');
  return res.status(401).render('errors/401', {
    title: 'Login Required',
    message: 'You need to log in to access this page.',
    loginHref: `/auth/login?next=${nextPath}`
  });
};

exports.ensureAuth = (req, res, next) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  return handleUnauthenticated(req, res);
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
  return handleUnauthenticated(req, res);
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
