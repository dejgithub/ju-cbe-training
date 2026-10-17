const express = require('express');
const ctrl = require('../controllers/authController');
const { requireCsrf } = require('../middleware/csrf');

const router = express.Router();

router.get('/login', ctrl.getLogin);
router.post('/login', requireCsrf, ctrl.postLogin);
router.get('/logout', ctrl.getLogout);
router.post('/logout', requireCsrf, ctrl.getLogout);

module.exports = router;