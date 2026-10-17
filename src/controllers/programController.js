const programModel = require('../models/program.model');
const activityModel = require('../models/activity.model');
const placementModel = require('../models/placement.model');
const assessmentModel = require('../models/assessment.model');
const adminModel = require('../models/admin.model');
const userModel = require('../models/user.model');
const notificationModel = require('../models/notification.model');
const { auditLog } = require('../middleware/audit');
const { validatorsFor, sanitizeString } = require('../middleware/validation');

const STATUSES = ['Planned', 'Active', 'Completed', 'Cancelled'];
const ACTIVITY_TYPES = ['Lecture', 'Field Work', 'Group Discussion', 'Seminar', 'Community Service', 'Assignment', 'Exam', 'Other'];

function validateProgram(values) {
  const v = validatorsFor(values);
  const errors = [];
  const push = (e) => { if (e) errors.push(e); };
  push(v.required('name', 'Program name'));
  push(v.required('code', 'Program code'));
  push(v.date('start_date', 'Start date'));
  push(v.date('end_date', 'End date'));
  if (values.status && !STATUSES.includes(sanitizeString(values.status))) errors.push('Invalid program status.');
  if (values.start_date && values.end_date && values.end_date < values.start_date) {
    errors.push('End date must be on or after the start date.');
  }
  return errors;
}

async function formData() {
  const [departments, years, coordinators, allPrograms] = await Promise.all([
    adminModel.listDepartments(),
    adminModel.listAcademicYears(),
    userModel.listCoordinators(),
    programModel.findAll(),
  ]);
  return { departments, years, coordinators, allPrograms };
}

async function index(req, res) {
  const { search = '', status = '', department_id = '' } = req.query;
  const programs = await programModel.findAll({ search, status, departmentId: department_id });
  const departments = await adminModel.listDepartments();
  return res.render('programs/index', {
    layout: 'layouts/main',
    title: 'CBE Programs',
    programs,
    departments,
    filters: { search, status, department_id },
  });
}

async function newForm(req, res) {
  const data = await formData();
  return res.render('programs/form', {
    layout: 'layouts/main',
    title: 'Create CBE program',
    program: { status: 'Planned' },
    ...data,
    isEdit: false,
    errors: [],
    action: '/programs',
    statuses: STATUSES,
  });
}

async function create(req, res) {
  const errors = validateProgram(req.body);
  const data = await formData();
  if (errors.length) {
    return res.status(400).render('programs/form', {
      layout: 'layouts/main',
      title: 'Create CBE program',
      program: req.body,
      ...data,
      isEdit: false,
      errors,
      action: '/programs',
      statuses: STATUSES,
    });
  }
  const id = await programModel.create(sanitizeBody(req.body), req.session.user.id);
  await auditLog(req, 'CREATE', 'cbe_programs', id, { code: req.body.code });
  if (req.body.notify) {
    await notificationModel.notifyRole('Student', {
      title: 'New CBE program',
      message: `A new CBE program "${sanitizeString(req.body.name)}" has been created.`,
      type: 'Info',
      link: `/programs/${id}`,
    });
  }
  req.flash.success('CBE program created.');
  return res.redirect(`/programs/${id}`);
}

function sanitizeBody(body) {
  return {
    name: sanitizeString(body.name, 200),
    code: sanitizeString(body.code, 30),
    description: sanitizeString(body.description, 5000),
    objectives: sanitizeString(body.objectives, 5000),
    learning_outcomes: sanitizeString(body.learning_outcomes, 5000),
    department_id: body.department_id || null,
    coordinator_user_id: body.coordinator_user_id || null,
    academic_year_id: body.academic_year_id || null,
    start_date: sanitizeString(body.start_date),
    end_date: sanitizeString(body.end_date),
    location: sanitizeString(body.location, 200),
    status: STATUSES.includes(body.status) ? body.status : 'Planned',
  };
}

async function show(req, res) {
  const program = await programModel.findById(req.params.id);
  if (!program) {
    req.flash.error('Program not found.');
    return res.redirect('/programs');
  }
  const [activities, placements, criteria, sites, instructors] = await Promise.all([
    activityModel.findByProgram(program.id),
    placementModel.findAll({ programId: program.id }),
    assessmentModel.criteriaForProgram(program.id, { includeInactive: true }),
    require('../models/site.model').findAllSites({}),
    userModel.listInstructors(),
  ]);
  return res.render('programs/show', {
    layout: 'layouts/main',
    title: program.name,
    program,
    activities,
    placements,
    criteria,
    sites,
    instructors,
    activityTypes: ACTIVITY_TYPES,
    weightsSum: criteria.reduce((s, c) => s + Number(c.weight), 0),
  });
}

async function editForm(req, res) {
  const program = await programModel.findById(req.params.id);
  if (!program) {
    req.flash.error('Program not found.');
    return res.redirect('/programs');
  }
  const data = await formData();
  return res.render('programs/form', {
    layout: 'layouts/main',
    title: 'Edit CBE program',
    program,
    ...data,
    isEdit: true,
    errors: [],
    action: `/programs/${program.id}`,
    statuses: STATUSES,
  });
}

async function update(req, res) {
  const id = req.params.id;
  const program = await programModel.findById(id);
  if (!program) {
    req.flash.error('Program not found.');
    return res.redirect('/programs');
  }
  const errors = validateProgram(req.body);
  const data = await formData();
  if (errors.length) {
    return res.status(400).render('programs/form', {
      layout: 'layouts/main',
      title: 'Edit CBE program',
      program: { ...program, ...req.body },
      ...data,
      isEdit: true,
      errors,
      action: `/programs/${id}`,
      statuses: STATUSES,
    });
  }
  await programModel.update(id, sanitizeBody(req.body));
  await auditLog(req, 'UPDATE', 'cbe_programs', id);
  req.flash.success('CBE program updated.');
  return res.redirect(`/programs/${id}`);
}

async function changeStatus(req, res) {
  const { status } = req.body;
  if (!STATUSES.includes(status)) {
    req.flash.error('Invalid status.');
    return res.redirect(`/programs/${req.params.id}`);
  }
  await programModel.setStatus(req.params.id, status);
  await auditLog(req, 'STATUS_CHANGE', 'cbe_programs', req.params.id, { status });
  req.flash.success(`Program status changed to ${status}.`);
  return res.redirect(`/programs/${req.params.id}`);
}

async function remove(req, res) {
  const id = req.params.id;
  await programModel.remove(id);
  await auditLog(req, 'DELETE', 'cbe_programs', id);
  req.flash.success('Program deleted.');
  return res.redirect('/programs');
}

// ---------------- Activities ----------------
function validateActivity(values) {
  const errors = [];
  if (!sanitizeString(values.title)) errors.push('Activity title is required.');
  if (values.type && !ACTIVITY_TYPES.includes(sanitizeString(values.type))) errors.push('Invalid activity type.');
  return errors;
}

async function addActivity(req, res) {
  const programId = req.params.id;
  const errors = validateActivity(req.body);
  if (errors.length) {
    req.flash.error(errors.join(' '));
    return res.redirect(`/programs/${programId}`);
  }
  const activityId = await activityModel.create(
    {
      cbe_program_id: programId,
      community_site_id: req.body.community_site_id || null,
      title: sanitizeString(req.body.title, 200),
      description: sanitizeString(req.body.description, 5000),
      type: req.body.type || 'Other',
      scheduled_date: sanitizeString(req.body.scheduled_date),
      start_time: sanitizeString(req.body.start_time),
      end_time: sanitizeString(req.body.end_time),
      location: sanitizeString(req.body.location, 200),
      deadline_at: sanitizeString(req.body.deadline_at) || null,
    },
    req.session.user.id
  );
  if (req.body.assign_to_program) {
    await activityModel.assignToProgram(activityId, programId);
  }
  await auditLog(req, 'CREATE', 'training_activities', activityId, { programId });
  req.flash.success('Activity added.');
  return res.redirect(`/programs/${programId}`);
}

async function deleteActivity(req, res) {
  const programId = req.params.id;
  await activityModel.remove(req.params.activityId);
  await auditLog(req, 'DELETE', 'training_activities', req.params.activityId);
  req.flash.success('Activity removed.');
  return res.redirect(`/programs/${programId}`);
}

module.exports = {
  index,
  newForm,
  create,
  show,
  editForm,
  update,
  changeStatus,
  remove,
  addActivity,
  deleteActivity,
  STATUSES,
  ACTIVITY_TYPES,
};