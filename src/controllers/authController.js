const bcrypt = require('bcrypt');
const userModel = require('../models/user.model');
const { auditLog } = require('../middleware/audit');
const { ROLES } = require('../middleware/auth');

async function getLogin(req, res) {
  if (req.session.user) return res.redirect('/dashboard');
  return res.render('auth/login', {
    layout: 'layouts/auth',
    title: 'Sign in',
    error: req.query.error === 'deactivated' ? 'Your account has been deactivated. Contact the administrator.' : null,
  });
}

async function postLogin(req, res) {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).render('auth/login', {
      layout: 'layouts/auth',
      title: 'Sign in',
      error: 'Please enter your username and password.',
      username,
    });
  }

  const user = await userModel.findByUsername(String(username).trim());
  if (!user || !user.isActive) {
    await auditLog(req, 'LOGIN_FAILED', 'users', null, { username });
    return res.status(401).render('auth/login', {
      layout: 'layouts/auth',
      title: 'Sign in',
      error: 'Invalid username or password.',
      username,
    });
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    await auditLog(req, 'LOGIN_FAILED', 'users', user.id, { username });
    return res.status(401).render('auth/login', {
      layout: 'layouts/auth',
      title: 'Sign in',
      error: 'Invalid username or password.',
      username,
    });
  }

  req.session.user = {
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    departmentId: user.departmentId,
    mustChangePassword: user.mustChangePassword,
  };

  userModel.updateLastLogin(user.id);
  await auditLog(req, 'LOGIN', 'users', user.id, { role: user.role });

  const returnTo = req.session.returnTo;
  delete req.session.returnTo;

  if (user.mustChangePassword) {
    req.session.flash = { type: 'warning', text: 'You must change your password before continuing.' };
    return res.redirect('/profile/password');
  }

  if (returnTo && returnTo.startsWith('/')) return res.redirect(returnTo);
  return res.redirect('/dashboard');
}

async function getLogout(req, res) {
  const user = req.session.user;
  await auditLog(req, 'LOGOUT', 'users', user ? user.id : null);
  req.session.destroy(() => {
    res.clearCookie('cbe.sid');
    return res.redirect('/login');
  });
}

function roleRedirect(user) {
  switch (user.role) {
    case ROLES.ADMIN:
      return '/dashboard';
    default:
      return '/dashboard';
  }
}

module.exports = { getLogin, postLogin, getLogout, roleRedirect };