const express = require('express');
const ctrl = require('../controllers/notificationController');
const { requireAuth } = require('../middleware/auth');
const { requireCsrf } = require('../middleware/csrf');

const router = express.Router();

router.use(requireAuth);

router.get('/', ctrl.index);
router.post('/read-all', requireCsrf, ctrl.markAllRead);
router.post('/:id/read', requireCsrf, ctrl.markRead);

module.exports = router;