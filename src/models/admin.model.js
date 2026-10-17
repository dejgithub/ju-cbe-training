const db = require('../config/db');

async function listDepartments() {
  const [rows] = await db.query(
    `SELECT d.*, (SELECT COUNT(*) FROM students s WHERE s.department_id = d.id) AS student_count,
            (SELECT COUNT(*) FROM cbe_programs p WHERE p.department_id = d.id) AS program_count
     FROM departments d ORDER BY d.name`
  );
  return rows;
}

async function listAcademicYears() {
  const [rows] = await db.query('SELECT * FROM academic_years ORDER BY start_date DESC');
  return rows;
}

async function createAcademicYear(data) {
  const [result] = await db.query(
    'INSERT INTO academic_years (name, start_date, end_date, is_current) VALUES (?, ?, ?, ?)',
    [data.name, data.start_date || null, data.end_date || null, data.is_current ? 1 : 0]
  );
  if (data.is_current) {
    await db.query('UPDATE academic_years SET is_current = 0 WHERE id <> ?', [result.insertId]);
  }
  return result.insertId;
}

async function updateAcademicYear(id, data) {
  await db.query(
    'UPDATE academic_years SET name = ?, start_date = ?, end_date = ?, is_current = ? WHERE id = ?',
    [data.name, data.start_date || null, data.end_date || null, data.is_current ? 1 : 0, id]
  );
  if (data.is_current) {
    await db.query('UPDATE academic_years SET is_current = 0 WHERE id <> ?', [id]);
  }
}

async function listGroups({ programId = '' } = {}) {
  const where = programId ? 'WHERE g.cbe_program_id = ?' : '';
  const params = programId ? [programId] : [];
  const [rows] = await db.query(
    `SELECT g.*, d.name AS department_name, p.name AS program_name,
            (SELECT COUNT(*) FROM students s WHERE s.group_id = g.id) AS members
     FROM student_groups g
     LEFT JOIN departments d ON d.id = g.department_id
     LEFT JOIN cbe_programs p ON p.id = g.cbe_program_id
     ${where}
     ORDER BY g.name`,
    params
  );
  return rows;
}

async function createGroup(data) {
  const [result] = await db.query(
    'INSERT INTO student_groups (name, code, cbe_program_id, department_id, academic_year_id) VALUES (?, ?, ?, ?, ?)',
    [data.name, data.code || null, data.cbe_program_id || null, data.department_id || null, data.academic_year_id || null]
  );
  return result.insertId;
}

async function findGroupById(id) {
  const [rows] = await db.query('SELECT * FROM student_groups WHERE id = ? LIMIT 1', [id]);
  return rows[0] || null;
}

async function updateGroup(id, data) {
  await db.query(
    'UPDATE student_groups SET name = ?, code = ?, cbe_program_id = ?, department_id = ?, academic_year_id = ? WHERE id = ?',
    [data.name, data.code || null, data.cbe_program_id || null, data.department_id || null, data.academic_year_id || null, id]
  );
}

async function removeGroup(id) {
  await db.query('UPDATE students SET group_id = NULL WHERE group_id = ?', [id]);
  await db.query('DELETE FROM student_groups WHERE id = ?', [id]);
}

async function listRoles() {
  const [rows] = await db.query('SELECT * FROM roles ORDER BY id');
  return rows;
}

async function getSetting(key) {
  const [rows] = await db.query('SELECT setting_value FROM system_settings WHERE setting_key = ? LIMIT 1', [key]);
  return rows[0] ? rows[0].setting_value : null;
}

async function setSetting(key, value, userId, description = null) {
  await db.query(
    `INSERT INTO system_settings (setting_key, setting_value, description, updated_by)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       setting_value = VALUES(setting_value),
       description = COALESCE(VALUES(description), description),
       updated_by = VALUES(updated_by)`,
    [key, value, description, userId]
  );
}

async function allSettings() {
  const [rows] = await db.query('SELECT * FROM system_settings ORDER BY setting_key');
  return rows;
}

async function listAnnouncements({ activeOnly = false } = {}) {
  const [rows] = await db.query(
    `SELECT a.*, u.full_name AS author_name
     FROM announcements a
     JOIN users u ON u.id = a.created_by
     ${activeOnly ? 'WHERE a.is_active = 1' : ''}
     ORDER BY a.created_at DESC`
  );
  return rows;
}

async function activeAnnouncementsForRoles(roleNames) {
  const names = roleNames.join(',');
  const [rows] = await db.query(
    `SELECT * FROM announcements
     WHERE is_active = 1
       AND (audience = 'All' OR FIND_IN_SET(audience, ?))
     ORDER BY created_at DESC
     LIMIT 10`,
    [names]
  );
  return rows;
}

async function createAnnouncement(data) {
  const [result] = await db.query(
    'INSERT INTO announcements (title, message, audience, is_active, created_by) VALUES (?, ?, ?, ?, ?)',
    [data.title, data.message, data.audience || 'All', data.is_active ? 1 : 0, data.created_by]
  );
  return result.insertId;
}

async function updateAnnouncement(id, data) {
  await db.query(
    'UPDATE announcements SET title = ?, message = ?, audience = ?, is_active = ? WHERE id = ?',
    [data.title, data.message, data.audience || 'All', data.is_active ? 1 : 0, id]
  );
}

async function removeAnnouncement(id) {
  await db.query('DELETE FROM announcements WHERE id = ?', [id]);
}

async function listAuditLogs(limit = 100) {
  const [rows] = await db.query(
    `SELECT al.*, u.full_name AS user_name
     FROM audit_logs al
     LEFT JOIN users u ON u.id = al.user_id
     ORDER BY al.created_at DESC
     LIMIT ?`,
    [limit]
  );
  return rows;
}

module.exports = {
  listDepartments,
  listAcademicYears,
  createAcademicYear,
  updateAcademicYear,
  listGroups,
  createGroup,
  findGroupById,
  updateGroup,
  removeGroup,
  listRoles,
  getSetting,
  setSetting,
  allSettings,
  listAnnouncements,
  activeAnnouncementsForRoles,
  createAnnouncement,
  updateAnnouncement,
  removeAnnouncement,
  listAuditLogs,
};