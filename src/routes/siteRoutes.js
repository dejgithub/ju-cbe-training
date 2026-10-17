const express = require('express');
const ctrl = require('../controllers/siteController');
const { requireAuth, requireRole } = require('../middleware/auth');
const { requireCsrf } = require('../middleware/csrf');

const router = express.Router();
const managers = requireRole('Admin', 'Coordinator');
const viewers = requireRole('Admin', 'Coordinator', 'Instructor');

router.use(requireAuth);

router.get('/', viewers, ctrl.index);
router.get('/new', managers, ctrl.newForm);
router.post('/', managers, requireCsrf, ctrl.create);

router.get('/partners', managers, ctrl.partnersIndex);
router.post('/partners', managers, requireCsrf, ctrl.createPartner);
router.get('/partners/:id', managers, ctrl.partnerDetail);
router.post('/partners/:id', managers, requireCsrf, ctrl.updatePartner);
router.post('/partners/:id/delete', managers, requireCsrf, ctrl.removePartner);
router.post('/partners/:id/users', managers, requireCsrf, ctrl.createPartnerUser);
router.post('/partners/:id/users/:userId/delete', managers, requireCsrf, ctrl.removePartnerUser);

router.get('/:id/edit', managers, ctrl.editForm);
router.post('/:id', managers, requireCsrf, ctrl.update);
router.post('/:id/delete', managers, requireCsrf, ctrl.remove);

module.exports = router;