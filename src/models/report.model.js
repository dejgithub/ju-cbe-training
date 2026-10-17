const db = require('../config/db');

async function findAll({ programId = '', status = '', search = '' } = {}) {
  const where = [];
  const params = [];
  if (programId) where.push('r.cbe_program_id = ?'), params.push(programId);
  if (status) where.push('r.status = ?'), params.push(status);
  if (search) {
    where.push('(s.full_name LIKE ? OR s.student_id LIKE ? OR r.title LIKE ?)');
    const like = `%${search}%`;
    params.push(like, like, like);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const [rows] = await db.query(
    `SELECT r.*, s.student_id, r.student_id AS student_pk, s.full_name AS student_name,
            p.name AS program_name,
            u.full_name AS reviewed_by_name
     FROM fieldwork_reports r
     JOIN students s ON s.id = r.student_id
     JOIN cbe_programs p ON p.id = r.cbe_program_id
     LEFT JOIN users u ON u.id = r.reviewed_by
     ${whereSql}
     ORDER BY r.submitted_at DESC`,
    params
  );
  return rows.map((r) => {
    return r;
  });
}

async function findById(id) {
  const [rows] = await db.query(
    `SELECT r.*, s.student_id, r.student_id AS student_pk, s.full_name AS student_name, s.user_id AS student_user_id,
            p.name AS program_name, p.code AS program_code,
            u.full_name AS reviewer_name
     FROM fieldwork_reports r
     JOIN students s ON s.id = r.student_id
     JOIN cbe_programs p ON p.id = r.cbe_program_id
     LEFT JOIN users u ON u.id = r.reviewed_by
     WHERE r.id = ? LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

async function forStudent(studentId) {
  const [rows] = await db.query(
    `SELECT r.*, p.name AS program_name
     FROM fieldwork_reports r
     JOIN cbe_programs p ON p.id = r.cbe_program_id
     WHERE r.student_id = ?
     ORDER BY r.submitted_at DESC`,
    [studentId]
  );
  return rows;
}

async function revisionsOf(reportId) {
  const [rows] = await db.query(
    `SELECT r.* FROM fieldwork_reports r
     WHERE r.id = ? OR r.revision_of = ?
     ORDER BY r.submitted_at ASC`,
    [reportId, reportId]
  );
  return rows;
}

async function create(data) {
  const [result] = await db.query(
    `INSERT INTO fieldwork_reports
      (revision_of, student_id, cbe_program_id, title, description,
       file_path, file_name, file_type, file_size, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.revision_of || null,
      data.student_id,
      data.cbe_program_id,
      data.title,
      data.description || null,
      data.file_path,
      data.file_name,
      data.file_type,
      data.file_size || 0,
      data.status || 'Submitted',
    ]
  );
  return result.insertId;
}

// Report files kept in the database (used on Vercel / when UPLOAD_STORAGE=db).
async function saveFile(reportId, buffer) {
  await db.query(
    'INSERT INTO report_files (report_id, file_data) VALUES (?, ?) ON DUPLICATE KEY UPDATE file_data = VALUES(file_data)',
    [reportId, buffer]
  );
}

async function getFile(reportId) {
  const [rows] = await db.query('SELECT file_data FROM report_files WHERE report_id = ? LIMIT 1', [reportId]);
  return rows[0] ? rows[0].file_data : null;
}

async function setStatus(id, status, reviewerId, comment = null) {
  await db.query(
    `UPDATE fieldwork_reports
     SET status = ?, review_comment = ?, reviewed_by = ?, reviewed_at = NOW()
     WHERE id = ?`,
    [status, comment, reviewerId, id]
  );
}

async function addFeedback(reportId, userId, comment) {
  await db.query(
    'INSERT INTO report_feedback (report_id, user_id, comment) VALUES (?, ?, ?)',
    [reportId, userId, comment]
  );
}

async function feedbackFor(reportId) {
  const [rows] = await db.query(
    `SELECT rf.*, u.full_name, r.name AS role_name
     FROM report_feedback rf
     JOIN users u ON u.id = rf.user_id
     LEFT JOIN roles r ON r.id = u.role_id
     WHERE rf.report_id = ?
     ORDER BY rf.created_at ASC`,
    [reportId]
  );
  return rows;
}

async function pendingCount() {
  const [rows] = await db.query(
    `SELECT COUNT(*) AS total FROM fieldwork_reports r
     WHERE r.status IN ('Submitted','Under Review') AND r.revision_of IS NULL`
  );
  return rows[0].total;
}

async function statusCounts() {
  const [rows] = await db.query(
    `SELECT status, COUNT(*) AS total FROM fieldwork_reports GROUP BY status`
  );
  return rows;
}

async function remove(id) {
  await db.query('DELETE FROM fieldwork_reports WHERE id = ?', [id]);
}

module.exports = {
  findAll,
  findById,
  forStudent,
  revisionsOf,
  create,
  setStatus,
  addFeedback,
  feedbackFor,
  saveFile,
  getFile,
  pendingCount,
  statusCounts,
  remove,
};