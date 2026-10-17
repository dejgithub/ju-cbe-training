const crypto = require('crypto');

function ensureToken(req) {
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  }
  return req.session.csrfToken;
}

function csrfSetup(req, res, next) {
  const token = ensureToken(req);
  res.locals.csrfToken = token;
  res.locals.csrfField = `<input type="hidden" name="_csrf" value="${token}">`;
  next();
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function requireCsrf(req, res, next) {
  if (SAFE_METHODS.has(req.method)) return next();
  const token = req.body && req.body._csrf;
  if (!token || token !== req.session.csrfToken) {
    const isJson = req.xhr || (req.headers.accept && req.headers.accept.includes('application/json'));
    if (isJson) {
      return res.status(403).json({ error: 'Invalid CSRF token. Please refresh the page and try again.' });
    }
    return res.status(403).render('errors/403', { layout: res.locals.currentUser ? 'layouts/main' : 'layouts/public', title: 'Access denied', message: 'Invalid CSRF token. Refresh the page and try again.' });
  }
  return next();
}

module.exports = { csrfSetup, requireCsrf };