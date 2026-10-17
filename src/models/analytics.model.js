const db = require('../config/db');

async function dashboardCounts() {
  const [rows] = await db.query(
    `SELECT
      (SELECT COUNT(*) FROM students WHERE status = 'Enrolled') AS students_total,
      (SELECT COUNT(*) FROM instructors) AS instructors_total,
      (SELECT COUNT(*) FROM cbe_programs WHERE status = 'Active') AS programs_active,
      (SELECT COUNT(*) FROM cbe_programs) AS programs_total,
      (SELECT COUNT(*) FROM community_sites WHERE status = 'Active') AS sites_total,
      (SELECT COUNT(*) FROM fieldwork_reports fr WHERE fr.status IN ('Submitted','Under Review') AND fr.revision_of IS NULL) AS reports_pending,
      (SELECT COUNT(*) FROM cbe_programs WHERE status = 'Completed') AS programs_completed,
      (SELECT COUNT(*) FROM cbe_programs WHERE status = 'Planned') AS programs_planned,
      (SELECT COUNT(*) FROM student_placements WHERE status IN ('Active','Assigned')) AS placements_active,
      (SELECT COUNT(*) FROM users) AS users_total`
  );
  return rows[0];
}

async function participationByDepartment() {
  const [rows] = await db.query(
    `SELECT d.name AS department, COUNT(DISTINCT sp.student_id) AS students
     FROM student_placements sp
     JOIN students s ON s.id = sp.student_id
     JOIN departments d ON d.id = s.department_id
     WHERE sp.status != 'Withdrawn'
     GROUP BY d.name
     ORDER BY students DESC`
  );
  return rows;
}

async function participationByProgram() {
  const [rows] = await db.query(
    `SELECT p.name AS program, p.status, COUNT(DISTINCT sp.student_id) AS students
     FROM cbe_programs p
     LEFT JOIN student_placements sp ON sp.cbe_program_id = p.id AND sp.status != 'Withdrawn'
     GROUP BY p.id, p.name, p.status
     ORDER BY students DESC`
  );
  return rows;
}

async function attendanceTrend(days = 14) {
  const [rows] = await db.query(
    `SELECT a.attendance_date AS date,
            SUM(a.status = 'Present') AS present,
            SUM(a.status = 'Absent') AS absent,
            SUM(a.status = 'Late') AS late,
            SUM(a.status = 'Excused') AS excused,
            COUNT(DISTINCT a.student_id) AS students
     FROM attendance a
     WHERE a.attendance_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
     GROUP BY a.attendance_date
     ORDER BY a.attendance_date`,
    [days]
  );
  return rows;
}

async function attendanceSummary() {
  const [rows] = await db.query(
    `SELECT status, COUNT(*) AS total,
            ROUND(COUNT(*) / (SELECT COUNT(*) FROM attendance) * 100, 1) AS pct
     FROM attendance GROUP BY status`
  );
  return rows;
}

async function programCompletionRate() {
  const total = await programCountByStatus();
  const completed = total.find((t) => t.status === 'Completed')?.total || 0;
  const active = total.find((t) => t.status === 'Active')?.total || 0;
  const overall = total.reduce((s, t) => s + t.total, 0);
  return { completed, active, planned: total.find((t) => t.status === 'Planned')?.total || 0, overall };
}

async function programCountByStatus() {
  const [rows] = await db.query('SELECT status, COUNT(*) AS total FROM cbe_programs GROUP BY status');
  return rows;
}

async function studentRegistrationsByYear() {
  const [rows] = await db.query(
    `SELECT a.name AS year_name, COUNT(sp.id) AS registrations
     FROM academic_years a
     LEFT JOIN cbe_programs p ON p.academic_year_id = a.id
     LEFT JOIN student_placements sp ON sp.cbe_program_id = p.id
     GROUP BY a.id, a.name
     ORDER BY a.start_date`
  );
  return rows;
}

async function reportSubmissionsByStatus() {
  const [rows] = await db.query(
    `SELECT status, COUNT(*) AS total FROM fieldwork_reports GROUP BY status`
  );
  return rows;
}

async function reportSubmissionsByProgram() {
  const [rows] = await db.query(
    `SELECT p.name AS program, COUNT(fr.id) AS reports,
            SUM(fr.status = 'Approved') AS approved
     FROM cbe_programs p
     LEFT JOIN fieldwork_reports fr ON fr.cbe_program_id = p.id AND fr.revision_of IS NULL
     GROUP BY p.id, p.name`
  );
  return rows;
}

async function topSites() {
  const [rows] = await db.query(
    `SELECT cs.name AS site, COUNT(sp.id) AS students
     FROM community_sites cs
     LEFT JOIN student_placements sp ON sp.community_site_id = cs.id AND sp.status != 'Withdrawn'
     GROUP BY cs.id, cs.name
     ORDER BY students DESC
     LIMIT 8`
  );
  return rows;
}

async function studentsForExport({ departmentId = '', programId = '', siteId = '', groupId = '', status = '' } = {}) {
  const where = [];
  const params = [];
  if (departmentId) where.push('s.department_id = ?'), params.push(departmentId);
  if (groupId) where.push('s.group_id = ?'), params.push(groupId);
  if (status) where.push('s.status = ?'), params.push(status);
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  let rows;
  if (programId || siteId) {
    rows = await exportWithPlacement(programId, siteId, whereSql, params);
  } else {
    const [r] = await db.query(
      `SELECT s.student_id, s.full_name, s.gender, s.year_of_study,
              s.email, s.phone, s.status,
              d.name AS department, g.name AS "group",
              COALESCE(cs.name, '') AS placement_site,
              COALESCE(p.name, '') AS program
       FROM students s
       LEFT JOIN departments d ON d.id = s.department_id
       LEFT JOIN student_groups g ON g.id = s.group_id
       LEFT JOIN student_placements sp ON sp.student_id = s.id AND sp.status != 'Withdrawn'
       LEFT JOIN community_sites cs ON cs.id = sp.community_site_id
       LEFT JOIN cbe_programs p ON p.id = sp.cbe_program_id
       ${whereSql}
       ORDER BY s.full_name`,
      params
    );
    rows = r;
  }
  return rows;
}

async function exportWithPlacement(programId, siteId, whereSql, params) {
  const extra = [];
  if (programId) extra.push('sp.cbe_program_id = ?');
  if (siteId) extra.push('sp.community_site_id = ?');
  const extParams = [];
  if (programId) extParams.push(programId);
  if (siteId) extParams.push(siteId);
  const extraSql = extra.length ? `AND ${extra.join(' AND ')}` : '';
  const [rows] = await db.query(
    `SELECT s.student_id, s.full_name, s.gender, s.year_of_study,
            s.email, s.phone, s.status,
            d.name AS department, g.name AS "group",
            cs.name AS placement_site, p.name AS program,
            CONCAT_WS(' ', i.title, iu.full_name) AS supervisor
     FROM student_placements sp
     JOIN students s ON s.id = sp.student_id
     LEFT JOIN departments d ON d.id = s.department_id
     LEFT JOIN student_groups g ON g.id = s.group_id
     LEFT JOIN community_sites cs ON cs.id = sp.community_site_id
     JOIN cbe_programs p ON p.id = sp.cbe_program_id
     LEFT JOIN instructors i ON i.id = sp.supervisor_id
     LEFT JOIN users iu ON iu.id = i.user_id
     WHERE sp.status != 'Withdrawn' ${extraSql}
     ORDER BY s.full_name`,
    [...extParams, ...params]
  );
  return rows;
}

async function attendanceExport({ programId = '', startDate = '', endDate = '', departmentId = '' } = {}) {
  const where = [];
  const params = [];
  if (programId) where.push('a.cbe_program_id = ?'), params.push(programId);
  if (startDate) where.push('a.attendance_date >= ?'), params.push(startDate);
  if (endDate) where.push('a.attendance_date <= ?'), params.push(endDate);
  if (departmentId) where.push('s.department_id = ?'), params.push(departmentId);
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const [rows] = await db.query(
    `SELECT s.student_id, s.full_name, d.name AS department,
            a.attendance_date, a.status, a.remarks,
            p.name AS program, CONCAT(u.full_name) AS recorded_by
     FROM attendance a
     JOIN students s ON s.id = a.student_id
     JOIN cbe_programs p ON p.id = a.cbe_program_id
     LEFT JOIN departments d ON d.id = s.department_id
     JOIN users u ON u.id = a.recorded_by
     ${whereSql}
     ORDER BY a.attendance_date DESC, s.full_name`,
    params
  );
  return rows;
}

async function assessmentExport({ programId = '' }) {
  const where = programId ? 'WHERE ar.cbe_program_id = ?' : '';
  const params = programId ? [programId] : [];
  const [rows] = await db.query(
    `SELECT s.student_id, s.full_name, d.name AS department,
            p.name AS program, ar.total_score, ar.grade, ar.is_released,
            ar.released_at
     FROM assessment_results ar
     JOIN students s ON s.id = ar.student_id
     JOIN cbe_programs p ON p.id = ar.cbe_program_id
     LEFT JOIN departments d ON d.id = s.department_id
     ${where}
     ORDER BY p.name, s.full_name`,
    params
  );
  return rows;
}

module.exports = {
  dashboardCounts,
  participationByDepartment,
  participationByProgram,
  attendanceTrend,
  attendanceSummary,
  programCompletionRate,
  programCountByStatus,
  studentRegistrationsByYear,
  reportSubmissionsByStatus,
  reportSubmissionsByProgram,
  topSites,
  studentsForExport,
  attendanceExport,
  assessmentExport,
};