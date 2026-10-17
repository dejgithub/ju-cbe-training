const express = require('express');
const ctrl = require('../controllers/reportController');
const { requireAuth, requireRole } = require('../middleware/auth');
const { requireCsrf } = require('../middleware/csrf');
const { reportUpload } = require('../middleware/upload');

const router = express.Router();
const reviewers = requireRole('Admin', 'Coordinator', 'Instructor');

router.use(requireAuth);

router.get('/', ctrl.index);
router.get('/new', requireRole('Student'), ctrl.newForm);
router.post('/', requireRole('Student'), reportUpload.single('file'), requireCsrf, ctrl.submit);
router.get('/:id', ctrl.show);
router.get('/:id/download', ctrl.download);
router.post('/:id/review', reviewers, requireCsrf, ctrl.review);
router.post('/:id/comment', requireCsrf, ctrl.comment);
router.post('/:id/delete', requireRole('Admin'), requireCsrf, ctrl.remove);

module.exports = router;