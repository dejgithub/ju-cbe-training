const db = require('../config/db');

const SELECT_BASE = `
  SELECT s.id, s.student_id, s.full_name, s.gender, s.date_of_birth,
         s.year_of_study, s.phone, s.email, s.address, s.status,
         s.user_id, s.group_id,
         d.id AS department_id, d.name AS department_name, d.code AS department_code,
         g.name AS group_name,
         u.username
  FROM students s
  LEFT JOIN departments d ON d.id = s.department_id
  LEFT JOIN student_groups g ON g.id = s.group_id
  LEFT JOIN users u ON u.id = s.user_id
`;

async function findAll({ search = '', departmentId = null, year = null, status = null, groupId = null } = {}) {
  const where = [];
  const params = [];
  if (search) {
    where.push('(s.full_name LIKE ? OR s.student_id LIKE ? OR s.email LIKE ? OR s.phone LIKE ?)');
    const like = `%${search}%`;
    params.push(like, like, like, like);
  }
  if (departmentId) {
    where.push('s.department_id = ?');
    params.push(departmentId);
  }
  if (year) {
    where.push('s.year_of_study = ?');
    params.push(Number(year));
  }
  if (status) {
    where.push('s.status = ?');
    params.push(status);
  }
  if (groupId) {
    where.push('s.group_id = ?');
    params.push(groupId);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const [rows] = await db.query(
    `${SELECT_BASE} ${whereSql} ORDER BY s.full_name ASC`,
    params
  );
  return rows;
}

async function findById(id) {
  const [rows] = await db.query(`${SELECT_BASE} WHERE s.id = ? LIMIT 1`, [id]);
  return rows[0] || null;
}

async function findByStudentId(studentId) {
  const [rows] = await db.query(`${SELECT_BASE} WHERE s.student_id = ? LIMIT 1`, [studentId]);
  return rows[0] || null;
}

async function create(data, userId) {
  const [result] = await db.query(
    `INSERT INTO students
      (user_id, student_id, full_name, gender, date_of_birth, department_id,
       year_of_study, email, phone, address, group_id, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      data.student_id,
      data.full_name,
      data.gender || 'Other',
      data.date_of_birth || null,
      data.department_id || null,
      Number(data.year_of_study || 1),
      data.email || null,
      data.phone || null,
      data.address || null,
      data.group_id || null,
      data.status || 'Enrolled',
    ]
  );
  return result.insertId;
}

async function update(id, data) {
  await db.query(
    `UPDATE students
     SET student_id = ?, full_name = ?, gender = ?, date_of_birth = ?, department_id = ?,
         year_of_study = ?, email = ?, phone = ?, address = ?, group_id = ?, status = ?
     WHERE id = ?`,
    [
      data.student_id,
      data.full_name,
      data.gender || 'Other',
      data.date_of_birth || null,
      data.department_id || null,
      Number(data.year_of_study || 1),
      data.email || null,
      data.phone || null,
      data.address || null,
      data.group_id || null,
      data.status || 'Enrolled',
      id,
    ]
  );
}

async function updateLinkedUser(studentId, { email, phone }) {
  await db.query(
    `UPDATE users u
     JOIN students s ON s.user_id = u.id
     SET u.email = ?, u.phone = ?
     WHERE s.id = ?`,
    [email || null, phone || null, studentId]
  );
}

async function remove(id) {
  await db.query('DELETE FROM students WHERE id = ?', [id]);
}

async function countByStatus() {
  const [rows] = await db.query(
    `SELECT status, COUNT(*) AS total FROM students GROUP BY status`
  );
  return rows;
}

async function countByDepartment() {
  const [rows] = await db.query(
    `SELECT d.name AS department, COUNT(s.id) AS total
     FROM students s
     JOIN departments d ON d.id = s.department_id
     GROUP BY d.name, s.department_id
     ORDER BY total DESC`
  );
  return rows;
}

async function assignedGroups() {
  const [rows] = await db.query(
    `SELECT g.id, g.name, g.code, COUNT(s.id) AS members
     FROM student_groups g
     LEFT JOIN students s ON s.group_id = g.id
     GROUP BY g.id, g.name, g.code
     ORDER BY g.name`
  );
  return rows;
}

async function cbeHistory(studentId) {
  const [rows] = await db.query(
    `SELECT p.id AS program_id, p.name, p.code, p.status, p.start_date, p.end_date,
            cs.name AS site_name, r.status AS report_status
     FROM student_placements sp
     JOIN cbe_programs p ON p.id = sp.cbe_program_id
     LEFT JOIN community_sites cs ON cs.id = sp.community_site_id
     LEFT JOIN fieldwork_reports r ON r.student_id = sp.student_id AND r.cbe_program_id = sp.cbe_program_id AND r.revision_of IS NULL
     WHERE sp.student_id = ?
     ORDER BY p.start_date DESC`,
    [studentId]
  );
  return rows;
}

module.exports = {
  findAll,
  findById,
  findByStudentId,
  create,
  update,
  updateLinkedUser,
  remove,
  countByStatus,
  countByDepartment,
  assignedGroups,
  cbeHistory,
};