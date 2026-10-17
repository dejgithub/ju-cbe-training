const express = require('express');
const ctrl = require('../controllers/profileController');
const { requireAuth } = require('../middleware/auth');
const { requireCsrf } = require('../middleware/csrf');

const router = express.Router();

router.use(requireAuth);

router.get('/', ctrl.show);
router.get('/password', ctrl.passwordForm);
router.post('/password', requireCsrf, ctrl.changePassword);

module.exports = router;