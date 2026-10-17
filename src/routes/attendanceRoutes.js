const express = require('express');
const ctrl = require('../controllers/attendanceController');
const { requireAuth, requireRole } = require('../middleware/auth');
const { requireCsrf } = require('../middleware/csrf');

const router = express.Router();
const recorders = requireRole('Admin', 'Coordinator', 'Instructor');
const viewers = requireRole('Admin', 'Coordinator', 'Instructor', 'Student');

router.use(requireAuth);

router.get('/', viewers, ctrl.index);
router.post('/', recorders, requireCsrf, ctrl.save);
router.get('/stats', recorders, ctrl.stats);

module.exports = router;