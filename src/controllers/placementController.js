const placementModel = require('../models/placement.model');
const programModel = require('../models/program.model');
const siteModel = require('../models/site.model');
const userModel = require('../models/user.model');
const adminModel = require('../models/admin.model');
const studentModel = require('../models/student.model');
const notificationModel = require('../models/notification.model');
const { auditLog } = require('../middleware/audit');
const { sanitizeString } = require('../middleware/validation');
const { ROLES } = require('../middleware/auth');

const STATUSES = ['Assigned', 'Active', 'Completed', 'Withdrawn'];

async function index(req, res) {
  const user = req.session.user;
  const { search = '', program_id = '', site_id = '', status = '' } = req.query;

  if (user.role === ROLES.STUDENT) {
    const student = await userModel.studentByUserId(user.id);
    if (!student) {
      req.flash.error('No student profile is linked to your account.');
      return res.redirect('/dashboard');
    }
    const placements = await placementModel.forStudent(student.id);
    return res.render('placements/my', {
      layout: 'layouts/main',
      title: 'My placement',
      placements,
      student,
    });
  }

  const placements = await placementModel.findAll({ search, programId: program_id, siteId: site_id, status });
  const [programs, sites] = await Promise.all([
    programModel.findAll(),
    siteModel.findAllSites({}),
  ]);
  return res.render('placements/index', {
    layout: 'layouts/main',
    title: 'Student Placements',
    placements,
    programs,
    sites,
    filters: { search, program_id, site_id, status },
    statuses: STATUSES,
  });
}

async function newForm(req, res) {
  const [programs, sites, instructors, groups, students] = await Promise.all([
    programModel.findAll({ status: 'Active' }),
    siteModel.findAllSites({}),
    userModel.listInstructors(),
    adminModel.listGroups(),
    studentModel.findAll({ status: 'Enrolled' }),
  ]);
  const programId = req.query.program_id || '';
  const unassigned = programId
    ? await placementModel.programStudents(programId)
    : students.map((s) => ({ id: s.id, student_id: s.student_id, full_name: s.full_name, department_name: s.department_name }));
  return res.render('placements/form', {
    layout: 'layouts/main',
    title: 'Assign student placement',
    placement: { status: 'Assigned' },
    programs,
    allPrograms: await programModel.findAll(),
    sites,
    instructors,
    groups,
    unassigned,
    filters: { program_id: programId },
    statuses: STATUSES,
    errors: [],
    action: '/placements',
    isEdit: false,
  });
}

function validatePlacement(values) {
  const errors = [];
  if (!values.student_id) errors.push('Select a student.');
  if (!values.community_site_id) errors.push('Select a community site.');
  if (!values.cbe_program_id) errors.push('Select a program.');
  if (values.status && !STATUSES.includes(sanitizeString(values.status))) errors.push('Invalid status.');
  return errors;
}

async function create(req, res) {
  const errors = validatePlacement(req.body);
  if (!errors.length) {
    const existing = await placementModel.findAll({ programId: req.body.cbe_program_id });
    if (existing.some((p) => String(p.student_id) === String(req.body.student_id))) {
      errors.push('This student already has a placement for the selected program.');
    }
  }
  if (errors.length) {
    req.flash.error(errors.join(' '));
    return res.redirect('/placements/new');
  }
  const id = await placementModel.create(
    {
      student_id: req.body.student_id,
      community_site_id: req.body.community_site_id,
      cbe_program_id: req.body.cbe_program_id,
      supervisor_id: req.body.supervisor_id || null,
      group_id: req.body.group_id || null,
      start_date: sanitizeString(req.body.start_date),
      end_date: sanitizeString(req.body.end_date),
      status: STATUSES.includes(req.body.status) ? req.body.status : 'Assigned',
    },
    req.session.user.id
  );

  const student = await studentModel.findById(req.body.student_id);
  if (student && student.user_id) {
    await notificationModel.create({
      userId: student.user_id,
      title: 'Community placement assigned',
      message: 'You have been assigned to a community site. Open your placement to view details.',
      type: 'Success',
      link: '/placements',
    });
  }
  await auditLog(req, 'CREATE', 'student_placements', id);
  req.flash.success('Student placement created.');
  return res.redirect('/placements');
}

async function bulkAssign(req, res) {
  const { community_site_id, cbe_program_id, supervisor_id, group_id, start_date, end_date, student_ids } = req.body;
  let ids = student_ids;
  if (!Array.isArray(ids)) ids = ids ? [ids] : [];
  if (!community_site_id || !cbe_program_id || ids.length === 0) {
    req.flash.error('Select a program, a site and at least one student.');
    return res.redirect('/placements/new');
  }
  const rows = ids.map((studentId) => ({
    student_id: studentId,
    community_site_id,
    cbe_program_id,
    supervisor_id: supervisor_id || null,
    group_id: group_id || null,
    start_date: sanitizeString(start_date),
    end_date: sanitizeString(end_date),
    status: 'Assigned',
  }));
  try {
    await placementModel.bulkCreate(rows, req.session.user.id);
    await auditLog(req, 'BULK_ASSIGN', 'student_placements', null, { count: rows.length, program: cbe_program_id });
    req.flash.success(`${rows.length} student(s) assigned successfully.`);
  } catch (err) {
    req.flash.error('Some students could not be assigned. They may already have a placement for this program.');
  }
  return res.redirect('/placements');
}

async function editForm(req, res) {
  const placement = await placementModel.findById(req.params.id);
  if (!placement) {
    req.flash.error('Placement not found.');
    return res.redirect('/placements');
  }
  const [sites, instructors, groups] = await Promise.all([
    siteModel.findAllSites({}),
    userModel.listInstructors(),
    adminModel.listGroups(),
  ]);
  return res.render('placements/form', {
    layout: 'layouts/main',
    title: 'Edit placement',
    placement,
    programs: await programModel.findAll(),
    sites,
    instructors,
    groups,
    unassigned: [],
    statuses: STATUSES,
    errors: [],
    action: `/placements/${placement.id}`,
    isEdit: true,
  });
}

async function update(req, res) {
  const id = req.params.id;
  const errors = validatePlacement({ ...req.body, student_id: req.body.student_id || 1 });
  if (errors.length) {
    req.flash.error(errors.join(' '));
    return res.redirect(`/placements/${id}/edit`);
  }
  await placementModel.update(id, {
    community_site_id: req.body.community_site_id,
    supervisor_id: req.body.supervisor_id || null,
    group_id: req.body.group_id || null,
    start_date: sanitizeString(req.body.start_date),
    end_date: sanitizeString(req.body.end_date),
    status: STATUSES.includes(req.body.status) ? req.body.status : 'Assigned',
  });
  await auditLog(req, 'UPDATE', 'student_placements', id);
  req.flash.success('Placement updated.');
  return res.redirect('/placements');
}

async function remove(req, res) {
  const id = req.params.id;
  await placementModel.remove(id);
  await auditLog(req, 'DELETE', 'student_placements', id);
  req.flash.success('Placement removed.');
  return res.redirect('/placements');
}

module.exports = { index, newForm, create, bulkAssign, editForm, update, remove, STATUSES };