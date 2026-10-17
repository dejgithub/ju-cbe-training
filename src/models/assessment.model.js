const db = require('../config/db');

async function criteriaForProgram(programId, { includeInactive = false } = {}) {
  const [rows] = await db.query(
    `SELECT * FROM assessment_criteria
     WHERE cbe_program_id = ? ${includeInactive ? '' : 'AND is_active = 1'}
     ORDER BY weight DESC`,
    [programId]
  );
  return rows;
}

async function globalCriteria() {
  const [rows] = await db.query(
    `SELECT * FROM assessment_criteria WHERE cbe_program_id IS NULL ORDER BY weight DESC`
  );
  return rows;
}

async function createCriterion(data) {
  const [result] = await db.query(
    `INSERT INTO assessment_criteria (cbe_program_id, name, description, weight)
     VALUES (?, ?, ?, ?)`,
    [data.cbe_program_id || null, data.name, data.description || null, Number(data.weight || 0)]
  );
  return result.insertId;
}

async function updateCriterion(id, { name, description, weight, isActive }) {
  await db.query(
    `UPDATE assessment_criteria
     SET name = ?, description = ?, weight = ?, is_active = ?
     WHERE id = ?`,
    [name, description || null, Number(weight || 0), isActive ? 1 : 0, id]
  );
}

async function removeCriterion(id) {
  await db.query('DELETE FROM assessment_criteria WHERE id = ?', [id]);
}

async function weightsSumForProgram(programId) {
  const [rows] = await db.query(
    'SELECT COALESCE(SUM(weight),0) AS total FROM assessment_criteria WHERE cbe_program_id = ? AND is_active = 1',
    [programId]
  );
  return Number(rows[0].total);
}

async function scoresForStudentProgram(studentId, programId) {
  const [rows] = await db.query(
    `SELECT sa.*, ac.name AS criterion_name, ac.weight
     FROM student_assessments sa
     JOIN assessment_criteria ac ON ac.id = sa.criterion_id
     WHERE sa.student_id = ? AND sa.cbe_program_id = ?`,
    [studentId, programId]
  );
  return rows;
}

async function upsertScore({ studentId, programId, criterionId, score, comment, assessedBy }) {
  await db.query(
    `INSERT INTO student_assessments
      (student_id, cbe_program_id, criterion_id, score, comment, assessed_by)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       score = VALUES(score),
       comment = VALUES(comment),
       assessed_by = VALUES(assessed_by)`,
    [studentId, programId, criterionId, Number(score), comment || null, assessedBy]
  );
}

async function computeResult(studentId, programId) {
  const criteria = await criteriaForProgram(programId);
  let total = 0;
  for (const c of criteria) {
    const scores = await scoresForStudentProgram(studentId, programId);
    const found = scores.find((s) => s.criterion_id === c.id);
    const score = found ? Number(found.score) : 0;
    total += (score * Number(c.weight)) / 100;
  }
  const totalRounded = Math.round(total * 100) / 100;
  await db.query(
    `INSERT INTO assessment_results (student_id, cbe_program_id, total_score, grade)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       total_score = VALUES(total_score),
       grade = VALUES(grade),
       computed_at = NOW()`,
    [studentId, programId, totalRounded, null]
  );
  return totalRounded;
}

async function computeResultsForProgram(programId) {
  const [students] = await db.query(
    'SELECT DISTINCT student_id FROM student_placements WHERE cbe_program_id = ? AND status != ?',
    [programId, 'Withdrawn']
  );
  const results = [];
  for (const row of students) {
    const total = await computeResult(row.student_id, programId);
    results.push({ studentId: row.student_id, total });
  }
  return results;
}

async function resultsForProgram(programId) {
  const [rows] = await db.query(
    `SELECT ar.*, s.student_id AS reg_no, s.full_name AS student_name,
            d.name AS department_name
     FROM assessment_results ar
     JOIN students s ON s.id = ar.student_id
     LEFT JOIN departments d ON d.id = s.department_id
     WHERE ar.cbe_program_id = ?
     ORDER BY ar.total_score DESC`,
    [programId]
  );
  return rows;
}

async function resultForStudentProgram(studentId, programId) {
  const [rows] = await db.query(
    `SELECT ar.* FROM assessment_results ar
     WHERE ar.student_id = ? AND ar.cbe_program_id = ? LIMIT 1`,
    [studentId, programId]
  );
  return rows[0] || null;
}

async function releaseResults(programId, releasedBy) {
  await db.query(
    `UPDATE assessment_results
     SET is_released = 1, released_by = ?, released_at = NOW()
     WHERE cbe_program_id = ?`,
    [releasedBy, programId]
  );
}

async function revokeResults(programId) {
  await db.query(
    `UPDATE assessment_results SET is_released = 0, released_by = NULL, released_at = NULL
     WHERE cbe_program_id = ?`,
    [programId]
  );
}

async function resultsForStudent(studentId) {
  const [rows] = await db.query(
    `SELECT ar.*, p.name AS program_name, p.code AS program_code
     FROM assessment_results ar
     JOIN cbe_programs p ON p.id = ar.cbe_program_id
     WHERE ar.student_id = ?
     ORDER BY ar.computed_at DESC`,
    [studentId]
  );
  return rows;
}

async function resultsForSupervisor(supervisorUserId) {
  const [rows] = await db.query(
    `SELECT ar.*, s.student_id AS reg_no, s.full_name AS student_name,
            p.name AS program_name
     FROM assessment_results ar
     JOIN students s ON s.id = ar.student_id
     JOIN cbe_programs p ON p.id = ar.cbe_program_id
     JOIN student_placements sp ON sp.student_id = s.id AND sp.cbe_program_id = p.id
     JOIN instructors i ON i.id = sp.supervisor_id
     WHERE i.user_id = ?
     ORDER BY p.name, s.full_name`,
    [supervisorUserId]
  );
  return rows;
}

module.exports = {
  criteriaForProgram,
  globalCriteria,
  createCriterion,
  updateCriterion,
  removeCriterion,
  weightsSumForProgram,
  scoresForStudentProgram,
  upsertScore,
  computeResult,
  computeResultsForProgram,
  resultsForProgram,
  resultForStudentProgram,
  releaseResults,
  revokeResults,
  resultsForStudent,
  resultsForSupervisor,
};