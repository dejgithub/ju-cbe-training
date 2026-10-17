const express = require('express');
const ctrl = require('../controllers/programController');
const { requireAuth, requireRole } = require('../middleware/auth');
const { requireCsrf } = require('../middleware/csrf');

const router = express.Router();
const managers = requireRole('Admin', 'Coordinator');

router.use(requireAuth);

router.get('/', ctrl.index);
router.get('/new', managers, ctrl.newForm);
router.post('/', managers, requireCsrf, ctrl.create);
router.get('/:id', ctrl.show);
router.get('/:id/edit', managers, ctrl.editForm);
router.post('/:id', managers, requireCsrf, ctrl.update);
router.post('/:id/status', managers, requireCsrf, ctrl.changeStatus);
router.post('/:id/delete', managers, requireCsrf, ctrl.remove);
router.post('/:id/activities', managers, requireCsrf, ctrl.addActivity);
router.post('/:id/activities/:activityId/delete', managers, requireCsrf, ctrl.deleteActivity);

module.exports = router;