const ROLES = {
  ADMIN: 'Admin',
  COORDINATOR: 'Coordinator',
  INSTRUCTOR: 'Instructor',
  STUDENT: 'Student',
  PARTNER: 'Partner',
};

function requireAuth(req, res, next) {
  if (!req.session.user) {
    req.session.returnTo = req.originalUrl;
    return res.redirect('/login');
  }
  return next();
}

function requireRole(...allowed) {
  const set = new Set(allowed.map((r) => r.toLowerCase()));
  return (req, res, next) => {
    if (!req.session.user) {
      req.session.returnTo = req.originalUrl;
      return res.redirect('/login');
    }
    if (!set.has(String(req.session.user.role).toLowerCase())) {
      return res.status(403).render('errors/403', { layout: 'layouts/main', title: 'Access denied' });
    }
    return next();
  };
}

function requireApiRole(...allowed) {
  const set = new Set(allowed.map((r) => r.toLowerCase()));
  return (req, res, next) => {
    if (!set.has(String(req.session.user && req.session.user.role).toLowerCase())) {
      return res.status(403).json({ error: 'You are not authorized to perform this action.' });
    }
    return next();
  };
}

module.exports = { ROLES, requireAuth, requireRole, requireApiRole };