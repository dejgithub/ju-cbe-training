const express = require('express');
const ctrl = require('../controllers/placementController');
const { requireAuth, requireRole } = require('../middleware/auth');
const { requireCsrf } = require('../middleware/csrf');

const router = express.Router();
const managers = requireRole('Admin', 'Coordinator');
const viewers = requireRole('Admin', 'Coordinator', 'Instructor', 'Student');

router.use(requireAuth);

router.get('/', viewers, ctrl.index);
router.get('/new', managers, ctrl.newForm);
router.post('/', managers, requireCsrf, ctrl.create);
router.post('/bulk', managers, requireCsrf, ctrl.bulkAssign);
router.get('/:id/edit', managers, ctrl.editForm);
router.post('/:id', managers, requireCsrf, ctrl.update);
router.post('/:id/delete', managers, requireCsrf, ctrl.remove);

module.exports = router;