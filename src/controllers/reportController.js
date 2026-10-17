const fs = require('fs');
const path = require('path');
const reportModel = require('../models/report.model');
const programModel = require('../models/program.model');
const attendanceModel = require('../models/attendance.model');
const userModel = require('../models/user.model');
const notificationModel = require('../models/notification.model');
const placementModel = require('../models/placement.model');
const { auditLog } = require('../middleware/audit');
const { sanitizeString } = require('../middleware/validation');
const { ROLES } = require('../middleware/auth');

const REVIEW_STATUSES = ['Under Review', 'Approved', 'Returned'];

async function index(req, res) {
  const user = req.session.user;
  const { program_id = '', status = '', search = '' } = req.query;
  if (user.role === ROLES.STUDENT) {
    const student = await userModel.studentByUserId(user.id);
    if (!student) {
      req.flash.error('No student profile is linked to your account.');
      return res.redirect('/dashboard');
    }
    const reports = await reportModel.forStudent(student.id);
    return res.render('reports/student-index', {
      layout: 'layouts/main',
      title: 'My fieldwork reports',
      reports,
      student,
    });
  }

  let reports = await reportModel.findAll({ programId: program_id, status, search });
  if (user.role === ROLES.INSTRUCTOR) {
    const instructor = await userModel.instructorByUserId(user.id);
    if (instructor) {
      const placements = await placementModel.findAll({});
      const supervisedStudentIds = new Set(
        placements.filter((p) => p.supervisor_id === instructor.id).map((p) => p.student_pk)
      );
      reports = reports.filter((r) => supervisedStudentIds.has(r.student_pk));
    }
  }
  const programs = await programModel.findAll();
  return res.render('reports/index', {
    layout: 'layouts/main',
    title: 'Fieldwork Reports',
    reports,
    programs,
    filters: { program_id, status, search },
  });
}

async function newForm(req, res) {
  const student = await userModel.studentByUserId(req.session.user.id);
  if (!student) {
    req.flash.error('No student profile is linked to your account.');
    return res.redirect('/reports');
  }
  const programs = await attendanceModel.studentPrograms(student.id);
  return res.render('reports/form', {
    layout: 'layouts/main',
    title: 'Submit fieldwork report',
    programs,
    report: {},
    errors: [],
    action: '/reports',
    isEdit: false,
  });
}

async function submit(req, res) {
  const student = await userModel.studentByUserId(req.session.user.id);
  if (!student) {
    req.flash.error('No student profile is linked to your account.');
    return res.redirect('/reports');
  }
  const errors = [];
  const title = sanitizeString(req.body.title, 200);
  if (!title) errors.push('Report title is required.');
  if (!req.body.cbe_program_id) errors.push('Select the program this report belongs to.');
  if (!req.file) errors.push('Attach a PDF or Word document.');

  if (errors.length) {
    if (req.file && req.file.path) fs.unlink(req.file.path, () => {});
    const programs = await attendanceModel.studentPrograms(student.id);
    return res.status(400).render('reports/form', {
      layout: 'layouts/main',
      title: 'Submit fieldwork report',
      programs,
      report: req.body,
      errors,
      action: '/reports',
      isEdit: false,
    });
  }

  // On Vercel (or UPLOAD_STORAGE=db) the file lives in memory and is saved in the database.
  const inDb = Boolean(req.file.buffer);
  const relPath = inDb ? 'db:report' : path.posix.join('uploads', 'reports', path.basename(req.file.path));
  const id = await reportModel.create({
    revision_of: req.body.revision_of || null,
    student_id: student.id,
    cbe_program_id: req.body.cbe_program_id,
    title,
    description: sanitizeString(req.body.description, 5000),
    file_path: relPath,
    file_name: req.file.originalname,
    file_type: path.extname(req.file.originalname).replace('.', '').toLowerCase(),
    file_size: req.file.size,
  });
  if (inDb) await reportModel.saveFile(id, req.file.buffer);

  await notificationModel.notifyRole('Instructor', {
    title: 'New fieldwork report submitted',
    message: `${student.full_name} submitted "${title}".`,
    type: 'Info',
    link: `/reports/${id}`,
  });
  await notificationModel.notifyRole('Coordinator', {
    title: 'Fieldwork report pending review',
    message: `${student.full_name} submitted "${title}".`,
    type: 'Warning',
    link: `/reports/${id}`,
  });

  await auditLog(req, 'SUBMIT', 'fieldwork_reports', id, { title });
  req.flash.success('Fieldwork report submitted.');
  return res.redirect(`/reports/${id}`);
}

async function show(req, res) {
  const report = await reportModel.findById(req.params.id);
  if (!report) {
    req.flash.error('Report not found.');
    return res.redirect('/reports');
  }
  const user = req.session.user;

  if (user.role === ROLES.STUDENT) {
    const student = await userModel.studentByUserId(user.id);
    if (!student || student.id !== report.student_pk) {
      return res.status(403).render('errors/403', { layout: 'layouts/main', title: 'Access denied' });
    }
  } else if (user.role === ROLES.INSTRUCTOR) {
    const instructor = await userModel.instructorByUserId(user.id);
    const placements = await placementModel.findAll({ programId: report.cbe_program_id });
    const allowed = instructor && placements.some((p) => p.student_pk === report.student_pk && p.supervisor_id === instructor.id);
    if (!allowed) {
      return res.status(403).render('errors/403', { layout: 'layouts/main', title: 'Access denied' });
    }
  }

  const [feedback, revisions] = await Promise.all([
    reportModel.feedbackFor(report.id),
    reportModel.revisionsOf(report.id),
  ]);
  return res.render('reports/show', {
    layout: 'layouts/main',
    title: report.title,
    report,
    feedback,
    revisions,
    canReview: [ROLES.INSTRUCTOR, ROLES.COORDINATOR, ROLES.ADMIN].includes(user.role),
    reviewStatuses: REVIEW_STATUSES,
  });
}

async function review(req, res) {
  const report = await reportModel.findById(req.params.id);
  if (!report) {
    req.flash.error('Report not found.');
    return res.redirect('/reports');
  }
  const status = sanitizeString(req.body.status);
  if (!REVIEW_STATUSES.includes(status)) {
    req.flash.error('Invalid review status.');
    return res.redirect(`/reports/${report.id}`);
  }
  await reportModel.setStatus(report.id, status, req.session.user.id, sanitizeString(req.body.review_comment, 5000));
  if (sanitizeString(req.body.review_comment)) {
    await reportModel.addFeedback(report.id, req.session.user.id, sanitizeString(req.body.review_comment, 5000));
  }

  const recipientId = report.student_user_id;
  if (recipientId) {
    await notificationModel.create({
      userId: recipientId,
      title: `Report ${status.toLowerCase()}`,
      message: `Your report "${report.title}" was marked "${status}".`,
      type: status === 'Approved' ? 'Success' : status === 'Returned' ? 'Warning' : 'Info',
      link: `/reports/${report.id}`,
    });
  }
  await auditLog(req, 'REVIEW', 'fieldwork_reports', report.id, { status });
  req.flash.success(`Report marked as "${status}".`);
  return res.redirect(`/reports/${report.id}`);
}

async function comment(req, res) {
  const report = await reportModel.findById(req.params.id);
  if (!report) {
    req.flash.error('Report not found.');
    return res.redirect('/reports');
  }
  const text = sanitizeString(req.body.comment, 5000);
  if (text) {
    await reportModel.addFeedback(report.id, req.session.user.id, text);
  }
  return res.redirect(`/reports/${report.id}`);
}

async function download(req, res) {
  const report = await reportModel.findById(req.params.id);
  if (!report) {
    req.flash.error('Report not found.');
    return res.redirect('/reports');
  }
  const user = req.session.user;
  if (user.role === ROLES.STUDENT) {
    const student = await userModel.studentByUserId(user.id);
    if (!student || student.id !== report.student_pk) {
      return res.status(403).render('errors/403', { layout: 'layouts/main', title: 'Access denied' });
    }
  }
  if (String(report.file_path).startsWith('db:')) {
    const data = await reportModel.getFile(report.id);
    if (!data) {
      req.flash.error('The stored file could not be found. It may have been removed.');
      return res.redirect(`/reports/${report.id}`);
    }
    await auditLog(req, 'DOWNLOAD', 'fieldwork_reports', report.id);
    res.attachment(report.file_name);
    return res.send(data);
  }
  const absPath = path.join(__dirname, '..', '..', report.file_path);
  if (!fs.existsSync(absPath)) {
    req.flash.error('The stored file could not be found. It may have been removed.');
    return res.redirect(`/reports/${report.id}`);
  }
  await auditLog(req, 'DOWNLOAD', 'fieldwork_reports', report.id);
  return res.download(absPath, report.file_name);
}

async function remove(req, res) {
  const report = await reportModel.findById(req.params.id);
  if (!report) {
    req.flash.error('Report not found.');
    return res.redirect('/reports');
  }
  if (!String(report.file_path).startsWith('db:')) {
    const absPath = path.join(__dirname, '..', '..', report.file_path);
    fs.unlink(absPath, () => {});
  }
  await reportModel.remove(report.id);
  await auditLog(req, 'DELETE', 'fieldwork_reports', report.id);
  req.flash.success('Report deleted.');
  return res.redirect('/reports');
}

module.exports = { index, newForm, submit, show, review, comment, download, remove, REVIEW_STATUSES };