const express = require('express');
const ctrl = require('../controllers/assessmentController');
const { requireAuth, requireRole } = require('../middleware/auth');
const { requireCsrf } = require('../middleware/csrf');

const router = express.Router();
const managers = requireRole('Admin', 'Coordinator');
const evaluators = requireRole('Admin', 'Coordinator', 'Instructor');

router.use(requireAuth);

router.get('/', ctrl.index);

router.get('/:id/criteria', managers, ctrl.criteriaPage);
router.post('/:id/criteria', managers, requireCsrf, ctrl.addCriterion);
router.post('/:id/criteria/:criterionId', managers, requireCsrf, ctrl.updateCriterion);
router.post('/:id/criteria/:criterionId/delete', managers, requireCsrf, ctrl.deleteCriterion);

router.get('/:id/evaluate', evaluators, ctrl.evaluateForm);
router.post('/:id/evaluate', evaluators, requireCsrf, ctrl.saveEvaluation);

router.post('/:id/compute', managers, requireCsrf, ctrl.compute);
router.post('/:id/release', managers, requireCsrf, ctrl.release);
router.post('/:id/revoke', managers, requireCsrf, ctrl.revoke);

module.exports = router;