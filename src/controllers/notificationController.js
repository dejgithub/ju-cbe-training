const notificationModel = require('../models/notification.model');
const adminModel = require('../models/admin.model');

async function index(req, res) {
  const userId = req.session.user.id;
  const notifications = await notificationModel.forUser(userId, { limit: 100 });
  const announcements = await adminModel.activeAnnouncementsForRoles([req.session.user.role, 'All']);
  return res.render('notifications/index', {
    layout: 'layouts/main',
    title: 'Notifications',
    notifications,
    announcements,
  });
}

async function markRead(req, res) {
  await notificationModel.markRead(req.params.id, req.session.user.id);
  if (req.body.link && String(req.body.link).startsWith('/')) {
    return res.redirect(req.body.link);
  }
  return res.redirect('/notifications');
}

async function markAllRead(req, res) {
  await notificationModel.markAllRead(req.session.user.id);
  req.flash.success('All notifications marked as read.');
  return res.redirect('/notifications');
}

module.exports = { index, markRead, markAllRead };