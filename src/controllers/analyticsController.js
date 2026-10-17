const analytics = require('../models/analytics.model');
const programModel = require('../models/program.model');
const siteModel = require('../models/site.model');
const adminModel = require('../models/admin.model');
const reportModel = require('../models/report.model');
const attendanceModel = require('../models/attendance.model');
const db = require('../config/db');
const { todaySql, addDays } = require('../utils/helpers');

function filterOptions() {
  return Promise.all([
    adminModel.listDepartments(),
    programModel.findAll(),
    siteModel.findAllSites({}),
    adminModel.listGroups(),
    adminModel.listAcademicYears(),
  ]).then(([departments, programs, sites, groups, years]) => ({ departments, programs, sites, groups, years }));
}

function toCsv(columns, rows) {
  const escape = (v) => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const header = columns.map((c) => escape(c.label)).join(',');
  const body = rows.map((row) => columns.map((c) => escape(row[c.key])).join(',')).join('\n');
  return `${header}\n${body}\n`;
}

function sendCsv(res, filename, columns, rows) {
  const csv = toCsv(columns, rows);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  return res.send(csv);
}

async function index(req, res) {
  const [counts, byDept, byProgram, trend, reportStatus, completion] = await Promise.all([
    analytics.dashboardCounts(),
    analytics.participationByDepartment(),
    analytics.participationByProgram(),
    analytics.attendanceTrend(14),
    analytics.reportSubmissionsByStatus(),
    analytics.programCompletionRate(),
  ]);
  return res.render('analytics/index', {
    layout: 'layouts/main',
    title: 'Reports & Analytics',
    counts,
    byDept,
    byProgram,
    trend,
    reportStatus,
    completion,
    options: await filterOptions(),
  });
}

async function students(req, res) {
  const filters = req.query;
  const rows = await analytics.studentsForExport(filters);
  const options = await filterOptions();
  return res.render('analytics/students', { layout: 'layouts/main', title: 'Student registration report', rows, options, filters });
}

async function studentsCsv(req, res) {
  const rows = await analytics.studentsForExport(req.query);
  return sendCsv(res, 'student_registration.csv', [
    { key: 'student_id', label: 'Student ID' },
    { key: 'full_name', label: 'Full name' },
    { key: 'gender', label: 'Gender' },
    { key: 'year_of_study', label: 'Year' },
    { key: 'department', label: 'Department' },
    { key: 'group', label: 'Group' },
    { key: 'placement_site', label: 'Placement site' },
    { key: 'program', label: 'Program' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'status', label: 'Status' },
  ], rows);
}

async function placements(req, res) {
  const rows = await analytics.studentsForExport(req.query);
  const options = await filterOptions();
  return res.render('analytics/placements', { layout: 'layouts/main', title: 'Community placement report', rows, options, filters: req.query });
}

async function placementsCsv(req, res) {
  const rows = await analytics.studentsForExport(req.query);
  return sendCsv(res, 'community_placements.csv', [
    { key: 'student_id', label: 'Student ID' },
    { key: 'full_name', label: 'Full name' },
    { key: 'department', label: 'Department' },
    { key: 'program', label: 'Program' },
    { key: 'placement_site', label: 'Community site' },
    { key: 'supervisor', label: 'Supervisor' },
  ], rows);
}

async function attendance(req, res) {
  const filters = req.query;
  const rows = await analytics.attendanceExport(filters);
  const options = await filterOptions();
  return res.render('analytics/attendance', { layout: 'layouts/main', title: 'Attendance report', rows, options, filters });
}

async function attendanceCsv(req, res) {
  const rows = await analytics.attendanceExport(req.query);
  return sendCsv(res, 'attendance_report.csv', [
    { key: 'student_id', label: 'Student ID' },
    { key: 'full_name', label: 'Full name' },
    { key: 'department', label: 'Department' },
    { key: 'program', label: 'Program' },
    { key: 'attendance_date', label: 'Date' },
    { key: 'status', label: 'Status' },
    { key: 'remarks', label: 'Remarks' },
    { key: 'recorded_by', label: 'Recorded by' },
  ], rows);
}

async function assessments(req, res) {
  const filters = req.query;
  const rows = await analytics.assessmentExport(filters);
  const options = await filterOptions();
  return res.render('analytics/assessments', { layout: 'layouts/main', title: 'Supervisor assessment report', rows, options, filters });
}

async function assessmentsCsv(req, res) {
  const rows = await analytics.assessmentExport(req.query);
  return sendCsv(res, 'assessment_report.csv', [
    { key: 'student_id', label: 'Student ID' },
    { key: 'full_name', label: 'Full name' },
    { key: 'department', label: 'Department' },
    { key: 'program', label: 'Program' },
    { key: 'total_score', label: 'Total score' },
    { key: 'grade', label: 'Grade' },
    { key: 'is_released', label: 'Released' },
  ], rows);
}

async function fieldwork(req, res) {
  const filters = req.query;
  const reports = await reportModel.findAll({ programId: filters.program_id || '', status: filters.status || '', search: filters.search || '' });
  const options = await filterOptions();
  return res.render('analytics/fieldwork', { layout: 'layouts/main', title: 'Fieldwork report submissions', rows: reports, options, filters });
}

async function fieldworkCsv(req, res) {
  const filters = req.query;
  const rows = await reportModel.findAll({ programId: filters.program_id || '', status: filters.status || '', search: filters.search || '' });
  return sendCsv(res, 'fieldwork_submissions.csv', [
    { key: 'student_id', label: 'Student ID' },
    { key: 'student_name', label: 'Student' },
    { key: 'program_name', label: 'Program' },
    { key: 'title', label: 'Title' },
    { key: 'status', label: 'Status' },
    { key: 'submitted_at', label: 'Submitted at' },
    { key: 'reviewed_at', label: 'Reviewed at' },
  ], rows);
}

async function programs(req, res) {
  const rows = await programModel.findAll({});
  const completion = await analytics.programCompletionRate();
  return res.render('analytics/programs', { layout: 'layouts/main', title: 'Program completion report', rows, completion });
}

async function programsCsv(req, res) {
  const rows = await programModel.findAll({});
  return sendCsv(res, 'program_completion.csv', [
    { key: 'code', label: 'Code' },
    { key: 'name', label: 'Program' },
    { key: 'department_name', label: 'Department' },
    { key: 'status', label: 'Status' },
    { key: 'start_date', label: 'Start' },
    { key: 'end_date', label: 'End' },
    { key: 'student_count', label: 'Students' },
  ], rows);
}

async function departments(req, res) {
  const participation = await analytics.participationByDepartment();
  const [performance] = await db.query(
    `SELECT d.name AS department,
            COUNT(DISTINCT s.id) AS students,
            ROUND(AVG(ar.total_score), 1) AS avg_score,
            SUM(CASE WHEN ar.total_score >= 50 THEN 1 ELSE 0 END) AS passed
     FROM departments d
     LEFT JOIN students s ON s.department_id = d.id
     LEFT JOIN assessment_results ar ON ar.student_id = s.id
     GROUP BY d.id, d.name
     ORDER BY d.name`
  );
  return res.render('analytics/departments', { layout: 'layouts/main', title: 'Department performance report', participation, performance });
}

async function departmentsCsv(req, res) {
  const [performance] = await db.query(
    `SELECT d.name AS department,
            COUNT(DISTINCT s.id) AS students,
            ROUND(AVG(ar.total_score), 1) AS avg_score,
            SUM(CASE WHEN ar.total_score >= 50 THEN 1 ELSE 0 END) AS passed
     FROM departments d
     LEFT JOIN students s ON s.department_id = d.id
     LEFT JOIN assessment_results ar ON ar.student_id = s.id
     GROUP BY d.id, d.name
     ORDER BY d.name`
  );
  return sendCsv(res, 'department_performance.csv', [
    { key: 'department', label: 'Department' },
    { key: 'students', label: 'Students' },
    { key: 'avg_score', label: 'Average score' },
    { key: 'passed', label: 'Passed' },
  ], performance);
}

module.exports = {
  index,
  students,
  studentsCsv,
  placements,
  placementsCsv,
  attendance,
  attendanceCsv,
  assessments,
  assessmentsCsv,
  fieldwork,
  fieldworkCsv,
  programs,
  programsCsv,
  departments,
  departmentsCsv,
};