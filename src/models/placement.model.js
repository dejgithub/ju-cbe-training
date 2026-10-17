const db = require('../config/db');

async function findAll({ programId = '', siteId = '', status = '', search = '' } = {}) {
  const where = [];
  const params = [];
  if (programId) where.push('sp.cbe_program_id = ?'), params.push(programId);
  if (siteId) where.push('sp.community_site_id = ?'), params.push(siteId);
  if (status) where.push('sp.status = ?'), params.push(status);
  if (search) {
    where.push('(s.full_name LIKE ? OR s.student_id LIKE ?)');
    const like = `%${search}%`;
    params.push(like, like);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const [rows] = await db.query(
    `SELECT sp.*, s.student_id, sp.student_id AS student_pk, s.full_name AS student_name, s.department_id,
            d.name AS department_name, cs.name AS site_name, cs.site_type,
            g.name AS group_name,
            CONCAT_WS(' ', i.title, iu.full_name) AS supervisor_name,
            p.name AS program_name, p.code AS program_code
     FROM student_placements sp
     JOIN students s ON s.id = sp.student_id
     JOIN cbe_programs p ON p.id = sp.cbe_program_id
     LEFT JOIN departments d ON d.id = s.department_id
     LEFT JOIN community_sites cs ON cs.id = sp.community_site_id
     LEFT JOIN student_groups g ON g.id = sp.group_id
     LEFT JOIN instructors i ON i.id = sp.supervisor_id
     LEFT JOIN users iu ON iu.id = i.user_id
     ${whereSql}
     ORDER BY s.full_name`,
    params
  );
  return rows;
}

async function forStudent(studentId) {
  const [rows] = await db.query(
    `SELECT sp.*, cs.name AS site_name, cs.site_type, cs.address AS site_address,
            cs.city AS site_city, cs.contact_person, cs.phone AS site_phone,
            cs.email AS site_email,
            g.name AS group_name,
            CONCAT_WS(' ', i.title, iu.full_name) AS supervisor_name,
            p.name AS program_name, p.code AS program_code, p.status AS program_status,
            p.start_date AS program_start, p.end_date AS program_end
     FROM student_placements sp
     JOIN cbe_programs p ON p.id = sp.cbe_program_id
     LEFT JOIN community_sites cs ON cs.id = sp.community_site_id
     LEFT JOIN student_groups g ON g.id = sp.group_id
     LEFT JOIN instructors i ON i.id = sp.supervisor_id
     LEFT JOIN users iu ON iu.id = i.user_id
     WHERE sp.student_id = ?
     ORDER BY p.start_date DESC, sp.id DESC`,
    [studentId]
  );
  return rows;
}

async function findById(id) {
  const [rows] = await db.query(
    `SELECT sp.*, s.student_id, s.full_name AS student_name,
            cs.name AS site_name, cs.address AS site_address,
            g.name AS group_name,
            CONCAT_WS(' ', i.title, iu.full_name) AS supervisor_name,
            p.name AS program_name
     FROM student_placements sp
     JOIN students s ON s.id = sp.student_id
     JOIN cbe_programs p ON p.id = sp.cbe_program_id
     LEFT JOIN community_sites cs ON cs.id = sp.community_site_id
     LEFT JOIN student_groups g ON g.id = sp.group_id
     LEFT JOIN instructors i ON i.id = sp.supervisor_id
     LEFT JOIN users iu ON iu.id = i.user_id
     WHERE sp.id = ? LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

async function programStudents(programId) {
  const [rows] = await db.query(
    `SELECT s.id, s.student_id, s.full_name, s.department_id, d.name AS department_name
     FROM students s
     LEFT JOIN departments d ON d.id = s.department_id
     WHERE NOT EXISTS (
       SELECT 1 FROM student_placements sp
       WHERE sp.student_id = s.id AND sp.cbe_program_id = ?
     )
     AND s.status = 'Enrolled'
     ORDER BY s.full_name`,
    [programId]
  );
  return rows;
}

async function assignedStudentIds(programId) {
  const [rows] = await db.query('SELECT student_id FROM student_placements WHERE cbe_program_id = ?', [programId]);
  return rows.map((r) => r.student_id);
}

async function create(data, userId) {
  const [result] = await db.query(
    `INSERT INTO student_placements
      (student_id, community_site_id, cbe_program_id, supervisor_id, group_id,
       start_date, end_date, status, assigned_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.student_id,
      data.community_site_id,
      data.cbe_program_id,
      data.supervisor_id || null,
      data.group_id || null,
      data.start_date || null,
      data.end_date || null,
      data.status || 'Assigned',
      userId,
    ]
  );
  return result.insertId;
}

async function bulkCreate(rows, userId) {
  const values = rows.map((r) => [
    r.student_id,
    r.community_site_id,
    r.cbe_program_id,
    r.supervisor_id || null,
    r.group_id || null,
    r.start_date || null,
    r.end_date || null,
    r.status || 'Assigned',
    userId,
  ]);
  await db.query(
    `INSERT INTO student_placements
      (student_id, community_site_id, cbe_program_id, supervisor_id, group_id,
       start_date, end_date, status, assigned_by)
     VALUES ?`,
    [values]
  );
}

async function update(id, data) {
  await db.query(
    `UPDATE student_placements
     SET community_site_id = ?, supervisor_id = ?, group_id = ?,
         start_date = ?, end_date = ?, status = ?
     WHERE id = ?`,
    [
      data.community_site_id,
      data.supervisor_id || null,
      data.group_id || null,
      data.start_date || null,
      data.end_date || null,
      data.status || 'Assigned',
      id,
    ]
  );
}

async function remove(id) {
  await db.query('DELETE FROM student_placements WHERE id = ?', [id]);
}

async function siteCapacityUsage(siteId) {
  const [rows] = await db.query(
    `SELECT cs.available_placements,
            (SELECT COUNT(*) FROM student_placements sp
             WHERE sp.community_site_id = cs.id AND sp.status != 'Withdrawn') AS used
     FROM community_sites cs WHERE cs.id = ?`,
    [siteId]
  );
  return rows[0] || null;
}

module.exports = {
  findAll,
  forStudent,
  findById,
  programStudents,
  assignedStudentIds,
  create,
  bulkCreate,
  update,
  remove,
  siteCapacityUsage,
};