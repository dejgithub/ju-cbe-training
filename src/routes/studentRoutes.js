const express = require('express');
const ctrl = require('../controllers/studentController');
const { requireAuth, requireRole } = require('../middleware/auth');
const { requireCsrf } = require('../middleware/csrf');
const { csvUpload } = require('../middleware/upload');

const router = express.Router();
const staff = requireRole('Admin', 'Coordinator');
const viewers = requireRole('Admin', 'Coordinator', 'Instructor');

router.use(requireAuth);

router.get('/', viewers, ctrl.index);
router.get('/new', staff, ctrl.newForm);
router.post('/', staff, requireCsrf, ctrl.create);
router.get('/import', staff, ctrl.importForm);
router.post('/import', staff, csvUpload.single('file'), requireCsrf, ctrl.importCsv);
router.get('/:id/edit', staff, ctrl.editForm);
router.post('/:id', staff, requireCsrf, ctrl.update);
router.post('/:id/delete', staff, requireCsrf, ctrl.remove);
router.get('/:id/history', viewers, ctrl.history);

module.exports = router;