const assessmentModel = require('../models/assessment.model');
const programModel = require('../models/program.model');
const adminModel = require('../models/admin.model');
const attendanceModel = require('../models/attendance.model');
const userModel = require('../models/user.model');
const placementModel = require('../models/placement.model');
const notificationModel = require('../models/notification.model');
const db = require('../config/db');
const { auditLog } = require('../middleware/audit');
const { sanitizeString } = require('../middleware/validation');
const { gradeForScore } = require('../utils/helpers');
const { ROLES } = require('../middleware/auth');

async function index(req, res) {
  const user = req.session.user;
  if (user.role === ROLES.STUDENT) {
    return myResults(req, res);
  }
  const programs = await programModel.findAll();
  const selectedProgram = req.query.program_id || (programs[0] ? programs[0].id : '');
  let program = null;
  let criteria = [];
  let results = [];
  let students = [];
  let supervisorId = null;
  if (selectedProgram) {
    program = await programModel.findById(selectedProgram);
    criteria = await assessmentModel.criteriaForProgram(selectedProgram, { includeInactive: true });
    results = await assessmentModel.resultsForProgram(selectedProgram);
    students = await attendanceModel.programStudents(selectedProgram);
    if (user.role === ROLES.INSTRUCTOR) {
      const instructor = await userModel.instructorByUserId(user.id);
      if (instructor) {
        supervisorId = instructor.id;
        const placements = await placementModel.findAll({ programId: selectedProgram });
        const allowed = new Set(placements.filter((p) => p.supervisor_id === instructor.id).map((p) => p.student_pk));
        students = students.filter((s) => allowed.has(s.id));
        results = results.filter((r) => allowed.has(r.student_id));
      }
    }
  }
  const weightsSum = criteria.filter((c) => c.is_active).reduce((s, c) => s + Number(c.weight), 0);
  return res.render('assessments/index', {
    layout: 'layouts/main',
    title: 'Assessments',
    programs,
    program,
    criteria,
    results,
    students,
    weightsSum,
    selectedProgram: String(selectedProgram),
    supervisorId,
  });
}

async function criteriaPage(req, res) {
  const program = await programModel.findById(req.params.id);
  if (!program) {
    req.flash.error('Program not found.');
    return res.redirect('/assessments');
  }
  const criteria = await assessmentModel.criteriaForProgram(program.id, { includeInactive: true });
  return res.render('assessments/criteria', {
    layout: 'layouts/main',
    title: `Assessment criteria - ${program.name}`,
    program,
    criteria,
    weightsSum: criteria.filter((c) => c.is_active).reduce((s, c) => s + Number(c.weight), 0),
  });
}

async function addCriterion(req, res) {
  const programId = req.params.id;
  const name = sanitizeString(req.body.name, 100);
  const weight = Number(req.body.weight);
  if (!name) {
    req.flash.error('Criterion name is required.');
    return res.redirect(`/assessments/${programId}/criteria`);
  }
  if (Number.isNaN(weight) || weight < 0 || weight > 100) {
    req.flash.error('Weight must be a number between 0 and 100.');
    return res.redirect(`/assessments/${programId}/criteria`);
  }
  const id = await assessmentModel.createCriterion({
    cbe_program_id: programId,
    name,
    description: sanitizeString(req.body.description, 2000),
    weight,
  });
  await auditLog(req, 'CREATE', 'assessment_criteria', id, { programId });
  req.flash.success('Assessment criterion added.');
  return res.redirect(`/assessments/${programId}/criteria`);
}

async function updateCriterion(req, res) {
  const programId = req.params.id;
  const name = sanitizeString(req.body.name, 100);
  const weight = Number(req.body.weight);
  if (!name || Number.isNaN(weight) || weight < 0 || weight > 100) {
    req.flash.error('Provide a valid name and a weight between 0 and 100.');
    return res.redirect(`/assessments/${programId}/criteria`);
  }
  await assessmentModel.updateCriterion(req.params.criterionId, {
    name,
    description: sanitizeString(req.body.description, 2000),
    weight,
    isActive: req.body.is_active === '1' || req.body.is_active === 'on',
  });
  await auditLog(req, 'UPDATE', 'assessment_criteria', req.params.criterionId);
  req.flash.success('Criterion updated.');
  return res.redirect(`/assessments/${programId}/criteria`);
}

async function deleteCriterion(req, res) {
  const programId = req.params.id;
  await assessmentModel.removeCriterion(req.params.criterionId);
  await auditLog(req, 'DELETE', 'assessment_criteria', req.params.criterionId);
  req.flash.success('Criterion deleted.');
  return res.redirect(`/assessments/${programId}/criteria`);
}

async function evaluateForm(req, res) {
  const programId = req.params.id;
  const program = await programModel.findById(programId);
  if (!program) {
    req.flash.error('Program not found.');
    return res.redirect('/assessments');
  }
  const criteria = await assessmentModel.criteriaForProgram(programId);
  let students = await attendanceModel.programStudents(programId);
  const user = req.session.user;
  if (user.role === ROLES.INSTRUCTOR) {
    const instructor = await userModel.instructorByUserId(user.id);
    if (instructor) {
      const placements = await placementModel.findAll({ programId });
      const allowed = new Set(placements.filter((p) => p.supervisor_id === instructor.id).map((p) => p.student_pk));
      students = students.filter((s) => allowed.has(s.id));
    } else {
      students = [];
    }
  }
  const scoreMap = {};
  for (const student of students) {
    const scores = await assessmentModel.scoresForStudentProgram(student.id, programId);
    scoreMap[student.id] = new Map(scores.map((s) => [s.criterion_id, s]));
  }
  return res.render('assessments/evaluate', {
    layout: 'layouts/main',
    title: `Evaluate - ${program.name}`,
    program,
    criteria,
    students,
    scoreMap,
  });
}

async function saveEvaluation(req, res) {
  const programId = req.params.id;
  const program = await programModel.findById(programId);
  if (!program) {
    req.flash.error('Program not found.');
    return res.redirect('/assessments');
  }
  const criteria = await assessmentModel.criteriaForProgram(programId);
  let students = await attendanceModel.programStudents(programId);
  const user = req.session.user;
  if (user.role === ROLES.INSTRUCTOR) {
    const instructor = await userModel.instructorByUserId(user.id);
    if (instructor) {
      const placements = await placementModel.findAll({ programId });
      const allowed = new Set(placements.filter((p) => p.supervisor_id === instructor.id).map((p) => p.student_pk));
      students = students.filter((s) => allowed.has(s.id));
    } else {
      students = [];
    }
  }

  let saved = 0;
  for (const student of students) {
    for (const criterion of criteria) {
      const key = `score_${student.id}_${criterion.id}`;
      if (req.body[key] === undefined || req.body[key] === '') continue;
      const score = Number(req.body[key]);
      if (Number.isNaN(score) || score < 0 || score > 100) continue;
      await assessmentModel.upsertScore({
        studentId: student.id,
        programId,
        criterionId: criterion.id,
        score,
        comment: sanitizeString(req.body[`comment_${student.id}_${criterion.id}`], 1000),
        assessedBy: user.id,
      });
      saved += 1;
    }
    await assessmentModel.computeResult(student.id, programId);
  }
  await auditLog(req, 'SAVE', 'student_assessments', null, { programId, saved });
  req.flash.success(`Assessment saved (${saved} score entries) and totals recalculated.`);
  return res.redirect(`/assessments?program_id=${programId}`);
}

async function compute(req, res) {
  const programId = req.params.id;
  const results = await assessmentModel.computeResultsForProgram(programId);
  const passMark = Number(await adminModel.getSetting('pass_mark') || 50);
  for (const r of results) {
    const grade = gradeForScore(r.total, passMark);
    await db.query('UPDATE assessment_results SET grade = ? WHERE student_id = ? AND cbe_program_id = ?', [grade, r.studentId, programId]);
  }
  await auditLog(req, 'COMPUTE', 'assessment_results', programId, { count: results.length });
  req.flash.success(`Results computed for ${results.length} student(s).`);
  return res.redirect(`/assessments?program_id=${programId}`);
}

async function release(req, res) {
  const programId = req.params.id;
  const passMark = Number(await adminModel.getSetting('pass_mark') || 50);
  const results = await assessmentModel.resultsForProgram(programId);
  for (const r of results) {
    const grade = gradeForScore(r.total_score, passMark);
    await db.query('UPDATE assessment_results SET grade = ? WHERE id = ?', [grade, r.id]);
  }
  await assessmentModel.releaseResults(programId, req.session.user.id);

  const [students] = await db.query(
    'SELECT DISTINCT s.user_id FROM student_placements sp JOIN students s ON s.id = sp.student_id WHERE sp.cbe_program_id = ?',
    [programId]
  );
  const program = await programModel.findById(programId);
  for (const s of students) {
    await notificationModel.create({
      userId: s.user_id,
      title: 'Results released',
      message: `Your results for "${program.name}" have been released.`,
      type: 'Success',
      link: '/assessments',
    });
  }
  await auditLog(req, 'RELEASE', 'assessment_results', programId);
  req.flash.success('Results released to students.');
  return res.redirect(`/assessments?program_id=${programId}`);
}

async function revoke(req, res) {
  const programId = req.params.id;
  await assessmentModel.revokeResults(programId);
  await auditLog(req, 'REVOKE', 'assessment_results', programId);
  req.flash.warning('Result release revoked.');
  return res.redirect(`/assessments?program_id=${programId}`);
}

async function myResults(req, res) {
  const student = await userModel.studentByUserId(req.session.user.id);
  if (!student) {
    req.flash.error('No student profile is linked to your account.');
    return res.redirect('/dashboard');
  }
  const results = await assessmentModel.resultsForStudent(student.id);
  return res.render('assessments/my-results', {
    layout: 'layouts/main',
    title: 'My results',
    results,
  });
}

module.exports = {
  index,
  criteriaPage,
  addCriterion,
  updateCriterion,
  deleteCriterion,
  evaluateForm,
  saveEvaluation,
  compute,
  release,
  revoke,
  myResults,
};