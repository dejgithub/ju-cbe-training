const express = require('express');
const ctrl = require('../controllers/analyticsController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
const allowed = requireRole('Admin', 'Coordinator', 'Instructor');

router.use(requireAuth, allowed);

router.get('/', ctrl.index);
router.get('/students', ctrl.students);
router.get('/students.csv', ctrl.studentsCsv);
router.get('/placements', ctrl.placements);
router.get('/placements.csv', ctrl.placementsCsv);
router.get('/attendance', ctrl.attendance);
router.get('/attendance.csv', ctrl.attendanceCsv);
router.get('/assessments', ctrl.assessments);
router.get('/assessments.csv', ctrl.assessmentsCsv);
router.get('/fieldwork', ctrl.fieldwork);
router.get('/fieldwork.csv', ctrl.fieldworkCsv);
router.get('/programs', ctrl.programs);
router.get('/programs.csv', ctrl.programsCsv);
router.get('/departments', ctrl.departments);
router.get('/departments.csv', ctrl.departmentsCsv);

module.exports = router;