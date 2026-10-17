const attendanceModel = require('../models/attendance.model');
const activityModel = require('../models/activity.model');
const programModel = require('../models/program.model');
const placementModel = require('../models/placement.model');
const userModel = require('../models/user.model');
const notificationModel = require('../models/notification.model');
const { auditLog } = require('../middleware/audit');
const { sanitizeString } = require('../middleware/validation');
const { todaySql, addDays } = require('../utils/helpers');
const { ROLES } = require('../middleware/auth');

const STATUSES = ['Present', 'Absent', 'Late', 'Excused'];

async function index(req, res) {
  const user = req.session.user;
  if (user.role === ROLES.STUDENT) {
    return studentView(req, res);
  }

  const programs = await programModel.findAll({ status: 'Active' });
  const selectedProgram = req.query.program_id || (programs[0] ? programs[0].id : '');
  const date = req.query.date || todaySql();

  let students = [];
  let records = [];
  let activities = [];
  if (selectedProgram) {
    [students, records, activities] = await Promise.all([
      attendanceModel.programStudents(selectedProgram),
      attendanceModel.recordsByDate(selectedProgram, date),
      activityModel.findByProgram(selectedProgram),
    ]);
  }
  const recordByStudent = new Map(records.map((r) => [r.student_id, r]));

  return res.render('attendance/index', {
    layout: 'layouts/main',
    title: 'Attendance',
    programs,
    students,
    activities,
    recordByStudent,
    selectedProgram: String(selectedProgram),
    date,
    statuses: STATUSES,
  });
}

async function studentView(req, res) {
  const student = await userModel.studentByUserId(req.session.user.id);
  if (!student) {
    req.flash.error('No student profile is linked to your account.');
    return res.redirect('/dashboard');
  }
  const programs = await attendanceModel.studentPrograms(student.id);
  const selectedProgram = req.query.program_id || (programs[0] ? programs[0].id : '');
  const start = req.query.start || addDays(todaySql(), -30);
  const end = req.query.end || todaySql();
  let stats = [];
  if (selectedProgram) {
    stats = await attendanceModel.statisticsByStudent(selectedProgram, start, end);
  }
  const summary = await attendanceModel.studentMonthly(student.id, 3);
  return res.render('attendance/student', {
    layout: 'layouts/main',
    title: 'My attendance',
    student,
    programs,
    stats,
    summary,
    selectedProgram: String(selectedProgram),
    start,
    end,
  });
}

async function save(req, res) {
  const { program_id, attendance_date, activity_id } = req.body;
  if (!program_id || !attendance_date) {
    req.flash.error('Program and date are required.');
    return res.redirect('/attendance');
  }

  const students = await attendanceModel.programStudents(program_id);
  let saved = 0;
  for (const s of students) {
    const status = req.body[`status_${s.id}`];
    if (!status) continue;
    if (!STATUSES.includes(status)) continue;
    await attendanceModel.upsertOne({
      studentId: s.id,
      programId: program_id,
      activityId: activity_id || null,
      date: attendance_date,
      status,
      remarks: sanitizeString(req.body[`remarks_${s.id}`]),
      recordedBy: req.session.user.id,
    });
    saved += 1;
  }

  await auditLog(req, 'SAVE', 'attendance', null, { program_id, date: attendance_date, saved });

  if (req.body.notify_absent === 'on') {
    const absentees = students.filter((s) => req.body[`status_${s.id}`] === 'Absent');
    for (const s of absentees) {
      const [rows] = await require('../config/db').query('SELECT user_id FROM students WHERE id = ?', [s.id]);
      if (rows[0]) {
        await notificationModel.create({
          userId: rows[0].user_id,
          title: 'Attendance recorded: Absent',
          message: `You were marked absent on ${attendance_date}.`,
          type: 'Warning',
          link: '/attendance',
        });
      }
    }
  }

  req.flash.success(`Attendance saved for ${saved} student(s).`);
  return res.redirect(`/attendance?program_id=${program_id}&date=${attendance_date}`);
}

async function stats(req, res) {
  const programs = await programModel.findAll();
  const selectedProgram = req.query.program_id || (programs[0] ? programs[0].id : '');
  const start = req.query.start || addDays(todaySql(), -60);
  const end = req.query.end || todaySql();
  let rows = [];
  if (selectedProgram) {
    rows = await attendanceModel.statisticsByStudent(selectedProgram, start, end);
  }
  return res.render('attendance/stats', {
    layout: 'layouts/main',
    title: 'Attendance reports',
    programs,
    rows,
    selectedProgram: String(selectedProgram),
    start,
    end,
  });
}

module.exports = { index, save, stats, STATUSES };