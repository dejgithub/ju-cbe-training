const db = require('../config/db');

async function programStudents(programId) {
  const [rows] = await db.query(
    `SELECT s.id, s.student_id, s.full_name, s.group_id, g.name AS group_name,
            cs.name AS site_name
     FROM student_placements sp
     JOIN students s ON s.id = sp.student_id
     LEFT JOIN student_groups g ON g.id = sp.group_id
     LEFT JOIN community_sites cs ON cs.id = sp.community_site_id
     WHERE sp.cbe_program_id = ? AND sp.status IN ('Active','Assigned')
     ORDER BY s.full_name`,
    [programId]
  );
  return rows;
}

async function studentPrograms(studentId) {
  const [rows] = await db.query(
    `SELECT sp.cbe_program_id AS id, p.name, p.code, sp.status AS placement_status
     FROM student_placements sp
     JOIN cbe_programs p ON p.id = sp.cbe_program_id
     WHERE sp.student_id = ? AND sp.status != 'Withdrawn'`,
    [studentId]
  );
  return rows;
}

async function recordsByDate(programId, date) {
  const [rows] = await db.query(
    `SELECT a.id, a.status, a.remarks, a.attendance_date,
            s.id AS student_id, s.student_id AS reg_no, s.full_name
     FROM attendance a
     JOIN students s ON s.id = a.student_id
     WHERE a.cbe_program_id = ? AND a.attendance_date = ?
     ORDER BY s.full_name`,
    [programId, date]
  );
  return rows;
}

async function upsertOne({ studentId, programId, activityId, date, status, remarks, recordedBy }) {
  await db.query(
    `INSERT INTO attendance
      (student_id, activity_id, cbe_program_id, attendance_date, status, remarks, recorded_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       activity_id = VALUES(activity_id),
       status = VALUES(status),
       remarks = VALUES(remarks),
       recorded_by = VALUES(recorded_by)`,
    [studentId, activityId || null, programId, date, status, remarks || null, recordedBy]
  );
}

async function rollcall({ programId, date, status, activityId, recordedBy, studentIds }) {
  for (const sid of studentIds) {
    await upsertOne({ studentId: sid, programId, activityId, date, status, remarks: null, recordedBy });
  }
}

async function statisticsByStudent(programId, startDate, endDate) {
  const [rows] = await db.query(
    `SELECT s.id AS student_id, s.student_id AS reg_no, s.full_name,
            p.name AS program_name,
            COUNT(a.id) AS total_days,
            SUM(CASE WHEN a.status = 'Present' THEN 1 ELSE 0 END) AS present_days,
            SUM(CASE WHEN a.status = 'Absent' THEN 1 ELSE 0 END) AS absent_days,
            SUM(CASE WHEN a.status = 'Late' THEN 1 ELSE 0 END) AS late_days,
            SUM(CASE WHEN a.status = 'Excused' THEN 1 ELSE 0 END) AS excused_days,
            CASE
              WHEN COUNT(a.id) = 0 THEN 0
              ELSE ROUND(
                (SUM(CASE WHEN a.status IN ('Present','Late') THEN 1 ELSE 0 END) / COUNT(a.id)) * 100, 1)
            END AS attendance_percentage
     FROM student_placements sp
     JOIN students s ON s.id = sp.student_id
     JOIN cbe_programs p ON p.id = sp.cbe_program_id
     LEFT JOIN attendance a ON a.student_id = sp.student_id
        AND a.cbe_program_id = sp.cbe_program_id
        AND a.attendance_date BETWEEN ? AND ?
     WHERE sp.cbe_program_id = ? AND sp.status IN ('Active','Assigned')
     GROUP BY s.id, s.student_id, s.full_name, p.name
     ORDER BY s.full_name`,
    [startDate, endDate, programId]
  );
  return rows;
}

async function dailyStats(programId, startDate, endDate) {
  const [rows] = await db.query(
    `SELECT a.attendance_date AS date,
            COUNT(*) AS recorded,
            SUM(CASE WHEN a.status = 'Present' THEN 1 ELSE 0 END) AS present,
            SUM(CASE WHEN a.status = 'Absent' THEN 1 ELSE 0 END) AS absent,
            SUM(CASE WHEN a.status = 'Late' THEN 1 ELSE 0 END) AS late,
            SUM(CASE WHEN a.status = 'Excused' THEN 1 ELSE 0 END) AS excused
     FROM attendance a
     WHERE a.cbe_program_id = ?
       AND a.attendance_date BETWEEN ? AND ?
       AND a.id = (SELECT MIN(a2.id) FROM attendance a2 WHERE a2.student_id = a.student_id AND a2.cbe_program_id = a.cbe_program_id AND a2.attendance_date = a.attendance_date)
     GROUP BY a.attendance_date
     ORDER BY a.attendance_date`,
    [programId, startDate, endDate]
  );
  return rows;
}

async function studentMonthly(studentId, monthsBack = 2) {
  const id = Number(studentId);
  const [rows] = await db.query(
    `SELECT a.status, COUNT(*) AS total
     FROM attendance a
     WHERE a.student_id = ?
       AND a.attendance_date >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
     GROUP BY a.status`,
    [id, monthsBack]
  );
  return rows;
}

module.exports = {
  programStudents,
  studentPrograms,
  recordsByDate,
  upsertOne,
  rollcall,
  statisticsByStudent,
  dailyStats,
  studentMonthly,
};