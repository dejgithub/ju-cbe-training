const express = require('express');
const ctrl = require('../controllers/dashboardController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, ctrl.index);

module.exports = router;