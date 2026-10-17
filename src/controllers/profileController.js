const bcrypt = require('bcrypt');
const userModel = require('../models/user.model');
const { auditLog } = require('../middleware/audit');
const { ROLES } = require('../middleware/auth');

async function show(req, res) {
  const user = await userModel.findById(req.session.user.id);
  let extra = null;
  if (user.role === ROLES.STUDENT) extra = await userModel.studentByUserId(user.id);
  else if (user.role === ROLES.INSTRUCTOR) extra = await userModel.instructorByUserId(user.id);
  else if (user.role === ROLES.PARTNER) extra = await userModel.partnerLinkByUserId(user.id);
  return res.render('profile/show', {
    layout: 'layouts/main',
    title: 'My profile',
    profile: user,
    extra,
  });
}

async function passwordForm(req, res) {
  return res.render('profile/password', {
    layout: 'layouts/main',
    title: 'Change password',
    errors: [],
    forced: !!req.session.user.mustChangePassword,
  });
}

async function changePassword(req, res) {
  const { current_password, new_password, confirm_password } = req.body;
  const errors = [];
  const user = await userModel.findById(req.session.user.id);

  if (!current_password || !new_password) {
    errors.push('All password fields are required.');
  }
  if (new_password && new_password.length < 8) {
    errors.push('New password must be at least 8 characters long.');
  }
  if (new_password && !/[A-Za-z]/.test(new_password)) {
    errors.push('New password must contain at least one letter.');
  }
  if (new_password && !/[0-9]/.test(new_password)) {
    errors.push('New password must contain at least one number.');
  }
  if (new_password !== confirm_password) {
    errors.push('New password and confirmation do not match.');
  }
  const ok = await bcrypt.compare(current_password || '', user.passwordHash);
  if (!ok) {
    errors.push('Your current password is incorrect.');
  }

  if (errors.length) {
    return res.status(400).render('profile/password', {
      layout: 'layouts/main',
      title: 'Change password',
      errors,
      forced: !!req.session.user.mustChangePassword,
    });
  }

  const hash = await bcrypt.hash(new_password, 10);
  await userModel.changePassword(user.id, hash);
  req.session.user.mustChangePassword = false;
  await auditLog(req, 'PASSWORD_CHANGE', 'users', user.id);
  req.flash.success('Your password has been changed.');
  return res.redirect('/profile');
}

module.exports = { show, passwordForm, changePassword };