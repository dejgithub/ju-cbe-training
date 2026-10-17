const express = require('express');
const ctrl = require('../controllers/publicController');
const { requireCsrf } = require('../middleware/csrf');

const router = express.Router();

router.get('/', ctrl.home);
router.get('/about', ctrl.about);
router.get('/mission', ctrl.mission);
router.get('/vision', ctrl.vision);
router.get('/contact', ctrl.contact);
router.post('/contact', requireCsrf, ctrl.postContact);

module.exports = router;
