const express = require('express');
const ctrl = require('../controllers/adminController');
const { requireAuth, requireRole } = require('../middleware/auth');
const { requireCsrf } = require('../middleware/csrf');

const router = express.Router();

router.use(requireAuth, requireRole('Admin'));

router.get('/', (req, res) => res.redirect('/admin/users'));

router.get('/users', ctrl.usersIndex);
router.get('/users/new', ctrl.userNewForm);
router.post('/users', requireCsrf, ctrl.userCreate);
router.get('/users/:id/edit', ctrl.userEditForm);
router.post('/users/:id', requireCsrf, ctrl.userUpdate);
router.post('/users/:id/reset-password', requireCsrf, ctrl.userResetPassword);
router.post('/users/:id/toggle-active', requireCsrf, ctrl.userToggleActive);
router.post('/users/:id/delete', requireCsrf, ctrl.userDelete);

router.get('/departments', ctrl.departmentsIndex);
router.post('/departments', requireCsrf, ctrl.departmentCreate);
router.post('/departments/:id', requireCsrf, ctrl.departmentUpdate);
router.post('/departments/:id/delete', requireCsrf, ctrl.departmentDelete);

router.get('/years', ctrl.yearsIndex);
router.post('/years', requireCsrf, ctrl.yearCreate);
router.post('/years/:id', requireCsrf, ctrl.yearUpdate);

router.get('/groups', ctrl.groupsIndex);
router.post('/groups', requireCsrf, ctrl.groupCreate);
router.post('/groups/:id', requireCsrf, ctrl.groupUpdate);
router.post('/groups/:id/delete', requireCsrf, ctrl.groupDelete);

router.get('/announcements', ctrl.announcementsIndex);
router.post('/announcements', requireCsrf, ctrl.announcementCreate);
router.post('/announcements/:id', requireCsrf, ctrl.announcementUpdate);
router.post('/announcements/:id/delete', requireCsrf, ctrl.announcementDelete);

router.get('/settings', ctrl.settingsIndex);
router.post('/settings', requireCsrf, ctrl.settingsUpdate);

router.get('/audit', ctrl.auditIndex);

module.exports = router;