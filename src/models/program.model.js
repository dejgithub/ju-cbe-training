const db = require('../config/db');

async function findAll({ search = '', status = '', departmentId = '' } = {}) {
  const where = [];
  const params = [];
  if (search) {
    where.push('(p.name LIKE ? OR p.code LIKE ? OR p.location LIKE ?)');
    const like = `%${search}%`;
    params.push(like, like, like);
  }
  if (status) where.push('p.status = ?'), params.push(status);
  if (departmentId) where.push('p.department_id = ?'), params.push(departmentId);
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const [rows] = await db.query(
    `SELECT p.*, d.name AS department_name, d.code AS department_code,
            CONCAT(u.full_name) AS coordinator_name, a.name AS academic_year_name,
            (SELECT COUNT(*) FROM student_placements sp WHERE sp.cbe_program_id = p.id) AS student_count,
            (SELECT COUNT(*) FROM community_sites cs
              JOIN student_placements sp2 ON sp2.community_site_id = cs.id
              WHERE sp2.cbe_program_id = p.id) AS site_count
     FROM cbe_programs p
     LEFT JOIN departments d ON d.id = p.department_id
     LEFT JOIN users u ON u.id = p.coordinator_user_id
     LEFT JOIN academic_years a ON a.id = p.academic_year_id
     ${whereSql}
     ORDER BY p.start_date DESC`,
    params
  );
  return rows;
}

async function findById(id) {
  const [rows] = await db.query(
    `SELECT p.*, d.name AS department_name, d.code AS department_code,
            CONCAT(u.full_name) AS coordinator_name, a.name AS academic_year_name,
            (SELECT COUNT(*) FROM student_placements sp WHERE sp.cbe_program_id = p.id) AS student_count
     FROM cbe_programs p
     LEFT JOIN departments d ON d.id = p.department_id
     LEFT JOIN users u ON u.id = p.coordinator_user_id
     LEFT JOIN academic_years a ON a.id = p.academic_year_id
     WHERE p.id = ? LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

async function create(data, userId) {
  const [result] = await db.query(
    `INSERT INTO cbe_programs
      (name, code, description, objectives, learning_outcomes, department_id,
       coordinator_user_id, academic_year_id, start_date, end_date, location, status, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.name,
      data.code,
      data.description || null,
      data.objectives || null,
      data.learning_outcomes || null,
      data.department_id || null,
      data.coordinator_user_id || null,
      data.academic_year_id || null,
      data.start_date || null,
      data.end_date || null,
      data.location || null,
      data.status || 'Planned',
      userId,
    ]
  );
  return result.insertId;
}

async function update(id, data) {
  await db.query(
    `UPDATE cbe_programs
     SET name = ?, code = ?, description = ?, objectives = ?, learning_outcomes = ?,
         department_id = ?, coordinator_user_id = ?, academic_year_id = ?,
         start_date = ?, end_date = ?, location = ?, status = ?
     WHERE id = ?`,
    [
      data.name,
      data.code,
      data.description || null,
      data.objectives || null,
      data.learning_outcomes || null,
      data.department_id || null,
      data.coordinator_user_id || null,
      data.academic_year_id || null,
      data.start_date || null,
      data.end_date || null,
      data.location || null,
      data.status || 'Planned',
      id,
    ]
  );
}

async function setStatus(id, status) {
  await db.query('UPDATE cbe_programs SET status = ? WHERE id = ?', [status, id]);
}

async function remove(id) {
  await db.query('DELETE FROM cbe_programs WHERE id = ?', [id]);
}

async function statusCounts() {
  const [rows] = await db.query(
    `SELECT status, COUNT(*) AS total FROM cbe_programs GROUP BY status`
  );
  return rows;
}

async function listDepartmentsCoverage() {
  const [rows] = await db.query(
    `SELECT d.name, COUNT(p.id) AS programs
     FROM departments d
     LEFT JOIN cbe_programs p ON p.department_id = d.id
     GROUP BY d.id, d.name`
  );
  return rows;
}

module.exports = { findAll, findById, create, update, setStatus, remove, statusCounts, listDepartmentsCoverage };