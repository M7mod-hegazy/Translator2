// No auth required - direct access
exports.ensureAuth = (req, res, next) => {
  next();
};

exports.ensureGuest = (req, res, next) => {
  next();
};

// API Authentication - optional, allows anonymous access
exports.apiAuth = (req, res, next) => {
  next();
};

// Check if user owns resource - skip check
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
