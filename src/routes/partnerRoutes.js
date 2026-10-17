const express = require('express');
const ctrl = require('../controllers/partnerController');
const { requireAuth, requireRole } = require('../middleware/auth');
const { requireCsrf } = require('../middleware/csrf');

const router = express.Router();

router.use(requireAuth, requireRole('Partner'));

router.get('/', ctrl.index);
router.post('/confirm', requireCsrf, ctrl.confirm);
router.post('/feedback', requireCsrf, ctrl.feedback);

module.exports = router;