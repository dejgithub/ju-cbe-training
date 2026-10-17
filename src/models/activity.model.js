const db = require('../config/db');

async function findByProgram(programId) {
  const [rows] = await db.query(
    `SELECT ta.*, cs.name AS site_name
     FROM training_activities ta
     LEFT JOIN community_sites cs ON cs.id = ta.community_site_id
     WHERE ta.cbe_program_id = ?
     ORDER BY COALESCE(ta.scheduled_date, ta.created_at) DESC`,
    [programId]
  );
  return rows;
}

async function findById(id) {
  const [rows] = await db.query(
    `SELECT ta.*, cs.name AS site_name, p.name AS program_name
     FROM training_activities ta
     LEFT JOIN community_sites cs ON cs.id = ta.community_site_id
     JOIN cbe_programs p ON p.id = ta.cbe_program_id
     WHERE ta.id = ? LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

async function upcoming(limit = 10) {
  const [rows] = await db.query(
    `SELECT ta.*, cs.name AS site_name, p.name AS program_name
     FROM training_activities ta
     JOIN cbe_programs p ON p.id = ta.cbe_program_id
     LEFT JOIN community_sites cs ON cs.id = ta.community_site_id
     WHERE (ta.scheduled_date >= CURDATE() OR ta.scheduled_date IS NULL)
       AND p.status IN ('Active','Planned')
     ORDER BY ta.scheduled_date ASC
     LIMIT ?`,
    [limit]
  );
  return rows;
}

async function upcomingForStudent(studentId, limit = 10) {
  const [rows] = await db.query(
    `SELECT ta.*, p.name AS program_name
     FROM activity_assignments aa
     JOIN training_activities ta ON ta.id = aa.activity_id
     JOIN cbe_programs p ON p.id = ta.cbe_program_id
     WHERE aa.student_id = ?
       AND p.status IN ('Active','Planned')
       AND (ta.scheduled_date >= CURDATE() OR ta.deadline_at >= NOW() OR (ta.scheduled_date IS NULL AND ta.deadline_at IS NULL))
     ORDER BY COALESCE(ta.scheduled_date, ta.deadline_at) ASC
     LIMIT ?`,
    [studentId, limit]
  );
  return rows;
}

async function create(data, userId) {
  const [result] = await db.query(
    `INSERT INTO training_activities
      (cbe_program_id, community_site_id, title, description, type,
       scheduled_date, start_time, end_time, location, deadline_at, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.cbe_program_id,
      data.community_site_id || null,
      data.title,
      data.description || null,
      data.type || 'Other',
      data.scheduled_date || null,
      data.start_time || null,
      data.end_time || null,
      data.location || null,
      data.deadline_at || null,
      userId,
    ]
  );
  return result.insertId;
}

async function update(id, data) {
  await db.query(
    `UPDATE training_activities
     SET community_site_id = ?, title = ?, description = ?, type = ?,
         scheduled_date = ?, start_time = ?, end_time = ?, location = ?, deadline_at = ?
     WHERE id = ?`,
    [
      data.community_site_id || null,
      data.title,
      data.description || null,
      data.type || 'Other',
      data.scheduled_date || null,
      data.start_time || null,
      data.end_time || null,
      data.location || null,
      data.deadline_at || null,
      id,
    ]
  );
}

async function remove(id) {
  await db.query('DELETE FROM training_activities WHERE id = ?', [id]);
}

async function assignToGroup(activityId, groupId) {
  await db.query(
    `INSERT IGNORE INTO activity_assignments (activity_id, student_id, status)
     SELECT ?, s.id, 'Pending' FROM students s WHERE s.group_id = ?`,
    [activityId, groupId]
  );
}

async function assignToProgram(activityId, programId) {
  await db.query(
    `INSERT IGNORE INTO activity_assignments (activity_id, student_id, status)
     SELECT ?, s.id, 'Pending' FROM students s
     WHERE s.id IN (SELECT sp.student_id FROM student_placements sp WHERE sp.cbe_program_id = ?)`,
    [activityId, programId]
  );
}

module.exports = { findByProgram, findById, upcoming, upcomingForStudent, create, update, remove, assignToGroup, assignToProgram };