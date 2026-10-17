const bcrypt = require('bcrypt');
const db = require('../config/db');
const userModel = require('../models/user.model');
const adminModel = require('../models/admin.model');
const siteModel = require('../models/site.model');
const { auditLog } = require('../middleware/audit');
const { validatorsFor, sanitizeString, validateEmail } = require('../middleware/validation');

const DEFAULT_PASSWORD = process.env.DEFAULT_USER_PASSWORD || 'Password@123';

// ---------------- Users ----------------
async function usersIndex(req, res) {
  const { search = '', role = '', status = '' } = req.query;
  let users = await userModel.listUsers();
  if (search) {
    const q = search.toLowerCase();
    users = users.filter((u) =>
      (u.full_name || '').toLowerCase().includes(q) ||
      (u.username || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q)
    );
  }
  if (role) users = users.filter((u) => u.role === role);
  if (status === 'active') users = users.filter((u) => u.is_active);
  if (status === 'inactive') users = users.filter((u) => !u.is_active);
  const roles = await adminModel.listRoles();
  return res.render('admin/users', {
    layout: 'layouts/main',
    title: 'User accounts',
    users,
    roles,
    filters: { search, role, status },
  });
}

async function userNewForm(req, res) {
  const [roles, departments, partners] = await Promise.all([
    adminModel.listRoles(),
    adminModel.listDepartments(),
    siteModel.findAllPartners(),
  ]);
  return res.render('admin/user-form', {
    layout: 'layouts/main',
    title: 'Create user account',
    userRecord: {},
    roles,
    departments,
    partners,
    errors: [],
    action: '/admin/users',
    isEdit: false,
  });
}

function validateUser(values, { isEdit = false } = {}) {
  const v = validatorsFor(values);
  const errors = [];
  const push = (e) => { if (e) errors.push(e); };
  if (!isEdit) push(v.required('username', 'Username'));
  push(v.required('full_name', 'Full name'));
  push(v.email('email'));
  if (!values.role_id) errors.push('Select a role.');
  return errors;
}

async function userCreate(req, res) {
  const errors = validateUser(req.body);
  if (!errors.length) {
    const dup = await userModel.findByUsername(sanitizeString(req.body.username));
    if (dup) errors.push('That username is already taken.');
    const emailErr = validateEmail(req.body.email);
    if (!emailErr && sanitizeString(req.body.email)) {
      const dupEmail = await userModel.findByEmail(sanitizeString(req.body.email));
      if (dupEmail) errors.push('That email is already in use.');
    }
    if (!sanitizeString(req.body.password)) {
      // default password used below
    }
  }

  const roleRow = (await adminModel.listRoles()).find((r) => String(r.id) === String(req.body.role_id));

  if (errors.length) {
    const [roles, departments, partners] = await Promise.all([
      adminModel.listRoles(),
      adminModel.listDepartments(),
      siteModel.findAllPartners(),
    ]);
    return res.status(400).render('admin/user-form', {
      layout: 'layouts/main',
      title: 'Create user account',
      userRecord: req.body,
      roles,
      departments,
      partners,
      errors,
      action: '/admin/users',
      isEdit: false,
    });
  }

  const password = sanitizeString(req.body.password) || DEFAULT_PASSWORD;
  const hash = await bcrypt.hash(password, 10);
  const userId = await userModel.createUser({
    username: sanitizeString(req.body.username, 100),
    email: sanitizeString(req.body.email, 150) || null,
    passwordHash: hash,
    fullName: sanitizeString(req.body.full_name, 150),
    phone: sanitizeString(req.body.phone, 30) || null,
    roleId: req.body.role_id,
    departmentId: req.body.department_id || null,
  });

  try {
    if (roleRow && roleRow.name === 'Instructor') {
      await db.query(
        'INSERT INTO instructors (user_id, employee_id, title, department_id, specialization, phone) VALUES (?, ?, ?, ?, ?, ?)',
        [userId, sanitizeString(req.body.employee_id, 30) || null, sanitizeString(req.body.title, 20) || null, req.body.department_id || null, sanitizeString(req.body.specialization, 150) || null, sanitizeString(req.body.phone, 30) || null]
      );
    } else if (roleRow && roleRow.name === 'Student') {
      await db.query(
        'INSERT INTO students (user_id, student_id, full_name, gender, department_id, year_of_study, email, phone) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [userId, sanitizeString(req.body.username, 30), sanitizeString(req.body.full_name, 150), 'Other', req.body.department_id || null, 1, sanitizeString(req.body.email, 150) || null, sanitizeString(req.body.phone, 30) || null]
      );
    } else if (roleRow && roleRow.name === 'Partner' && req.body.community_partner_id) {
      await siteModel.addPartnerUser(req.body.community_partner_id, userId);
    }
  } catch (err) {
    req.flash.warning('User was created, but linking the role profile failed: ' + err.message);
  }

  await auditLog(req, 'CREATE', 'users', userId, { role: roleRow ? roleRow.name : null });
  req.flash.success('User account created.');
  return res.redirect('/admin/users');
}

async function userEditForm(req, res) {
  const userRecord = await userModel.findById(req.params.id);
  if (!userRecord) {
    req.flash.error('User not found.');
    return res.redirect('/admin/users');
  }
  const [roles, departments, partners] = await Promise.all([
    adminModel.listRoles(),
    adminModel.listDepartments(),
    siteModel.findAllPartners(),
  ]);
  return res.render('admin/user-form', {
    layout: 'layouts/main',
    title: 'Edit user account',
    userRecord,
    roles,
    departments,
    partners,
    errors: [],
    action: `/admin/users/${userRecord.id}`,
    isEdit: true,
  });
}

async function userUpdate(req, res) {
  const id = req.params.id;
  const errors = validateUser({ ...req.body, username: 'x' }, { isEdit: true });
  if (!errors.length && sanitizeString(req.body.email)) {
    const dupEmail = await userModel.findByEmail(sanitizeString(req.body.email));
    if (dupEmail && dupEmail.id !== Number(id)) errors.push('That email is already in use.');
  }
  if (errors.length) {
    req.flash.error(errors.join(' '));
    return res.redirect(`/admin/users/${id}/edit`);
  }
  await userModel.updateUser(id, {
    email: sanitizeString(req.body.email, 150),
    fullName: sanitizeString(req.body.full_name, 150),
    phone: sanitizeString(req.body.phone, 30),
    roleId: req.body.role_id,
    departmentId: req.body.department_id || null,
    isActive: req.body.is_active === '1' || req.body.is_active === 'on',
  });
  await auditLog(req, 'UPDATE', 'users', id);
  req.flash.success('User account updated.');
  return res.redirect('/admin/users');
}

async function userResetPassword(req, res) {
  const id = req.params.id;
  const hash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  await userModel.resetPassword(id, hash);
  await auditLog(req, 'PASSWORD_RESET', 'users', id);
  req.flash.success('Password reset to the default password. The user must set a new password at next login.');
  return res.redirect('/admin/users');
}

async function userToggleActive(req, res) {
  const id = req.params.id;
  const userRecord = await userModel.findById(id);
  if (!userRecord) {
    req.flash.error('User not found.');
    return res.redirect('/admin/users');
  }
  if (userRecord.id === req.session.user.id) {
    req.flash.error('You cannot deactivate your own account.');
    return res.redirect('/admin/users');
  }
  await userModel.updateUser(id, {
    email: userRecord.email,
    fullName: userRecord.fullName,
    phone: userRecord.phone,
    roleId: userRecord.roleId,
    departmentId: userRecord.departmentId,
    isActive: !userRecord.isActive,
  });
  await auditLog(req, userRecord.isActive ? 'DEACTIVATE' : 'ACTIVATE', 'users', id);
  req.flash.success(`User ${userRecord.isActive ? 'deactivated' : 'activated'}.`);
  return res.redirect('/admin/users');
}

async function userDelete(req, res) {
  const id = req.params.id;
  if (Number(id) === req.session.user.id) {
    req.flash.error('You cannot delete your own account.');
    return res.redirect('/admin/users');
  }
  await auditLog(req, 'DELETE', 'users', id);
  await userModel.deleteUser(id);
  req.flash.success('User account deleted.');
  return res.redirect('/admin/users');
}

// ---------------- Departments ----------------
async function departmentsIndex(req, res) {
  const departments = await adminModel.listDepartments();
  return res.render('admin/departments', { layout: 'layouts/main', title: 'Departments', departments });
}

async function departmentCreate(req, res) {
  const name = sanitizeString(req.body.name, 150);
  const code = sanitizeString(req.body.code, 20);
  if (!name || !code) {
    req.flash.error('Department name and code are required.');
    return res.redirect('/admin/departments');
  }
  await db.query('INSERT INTO departments (name, code, description) VALUES (?, ?, ?)', [name, code, sanitizeString(req.body.description, 2000)]);
  await auditLog(req, 'CREATE', 'departments', null, { code });
  req.flash.success('Department added.');
  return res.redirect('/admin/departments');
}

async function departmentUpdate(req, res) {
  const id = req.params.id;
  await db.query('UPDATE departments SET name = ?, code = ?, description = ? WHERE id = ?', [
    sanitizeString(req.body.name, 150),
    sanitizeString(req.body.code, 20),
    sanitizeString(req.body.description, 2000),
    id,
  ]);
  await auditLog(req, 'UPDATE', 'departments', id);
  req.flash.success('Department updated.');
  return res.redirect('/admin/departments');
}

async function departmentDelete(req, res) {
  const id = req.params.id;
  const [students] = await db.query('SELECT COUNT(*) AS total FROM students WHERE department_id = ?', [id]);
  if (students[0].total > 0) {
    req.flash.error('Cannot delete a department that has students.');
    return res.redirect('/admin/departments');
  }
  await db.query('DELETE FROM departments WHERE id = ?', [id]);
  await auditLog(req, 'DELETE', 'departments', id);
  req.flash.success('Department deleted.');
  return res.redirect('/admin/departments');
}

// ---------------- Academic years ----------------
async function yearsIndex(req, res) {
  const years = await adminModel.listAcademicYears();
  return res.render('admin/years', { layout: 'layouts/main', title: 'Academic years', years });
}

async function yearCreate(req, res) {
  const name = sanitizeString(req.body.name, 50);
  if (!name) {
    req.flash.error('Academic year name is required.');
    return res.redirect('/admin/years');
  }
  await adminModel.createAcademicYear({
    name,
    start_date: sanitizeString(req.body.start_date),
    end_date: sanitizeString(req.body.end_date),
    is_current: req.body.is_current === 'on' || req.body.is_current === '1',
  });
  await auditLog(req, 'CREATE', 'academic_years', null, { name });
  req.flash.success('Academic year added.');
  return res.redirect('/admin/years');
}

async function yearUpdate(req, res) {
  const id = req.params.id;
  await adminModel.updateAcademicYear(id, {
    name: sanitizeString(req.body.name, 50),
    start_date: sanitizeString(req.body.start_date),
    end_date: sanitizeString(req.body.end_date),
    is_current: req.body.is_current === 'on' || req.body.is_current === '1',
  });
  await auditLog(req, 'UPDATE', 'academic_years', id);
  req.flash.success('Academic year updated.');
  return res.redirect('/admin/years');
}

// ---------------- Groups ----------------
async function groupsIndex(req, res) {
  const groups = await adminModel.listGroups({ programId: req.query.program_id || '' });
  const programs = await require('../models/program.model').findAll();
  const departments = await adminModel.listDepartments();
  const years = await adminModel.listAcademicYears();
  return res.render('admin/groups', {
    layout: 'layouts/main',
    title: 'Student groups',
    groups,
    programs,
    departments,
    years,
    filters: { program_id: req.query.program_id || '' },
  });
}

async function groupCreate(req, res) {
  const name = sanitizeString(req.body.name, 100);
  if (!name) {
    req.flash.error('Group name is required.');
    return res.redirect('/admin/groups');
  }
  const id = await adminModel.createGroup({
    name,
    code: sanitizeString(req.body.code, 30),
    cbe_program_id: req.body.cbe_program_id || null,
    department_id: req.body.department_id || null,
    academic_year_id: req.body.academic_year_id || null,
  });
  await auditLog(req, 'CREATE', 'student_groups', id, { name });
  req.flash.success('Group added.');
  return res.redirect('/admin/groups');
}

async function groupUpdate(req, res) {
  const id = req.params.id;
  await adminModel.updateGroup(id, {
    name: sanitizeString(req.body.name, 100),
    code: sanitizeString(req.body.code, 30),
    cbe_program_id: req.body.cbe_program_id || null,
    department_id: req.body.department_id || null,
    academic_year_id: req.body.academic_year_id || null,
  });
  await auditLog(req, 'UPDATE', 'student_groups', id);
  req.flash.success('Group updated.');
  return res.redirect('/admin/groups');
}

async function groupDelete(req, res) {
  const id = req.params.id;
  await adminModel.removeGroup(id);
  await auditLog(req, 'DELETE', 'student_groups', id);
  req.flash.success('Group deleted.');
  return res.redirect('/admin/groups');
}

// ---------------- Announcements ----------------
async function announcementsIndex(req, res) {
  const announcements = await adminModel.listAnnouncements();
  return res.render('admin/announcements', { layout: 'layouts/main', title: 'Announcements', announcements });
}

async function announcementCreate(req, res) {
  const title = sanitizeString(req.body.title, 200);
  const message = sanitizeString(req.body.message, 5000);
  if (!title || !message) {
    req.flash.error('Announcement title and message are required.');
    return res.redirect('/admin/announcements');
  }
  const id = await adminModel.createAnnouncement({
    title,
    message,
    audience: sanitizeString(req.body.audience) || 'All',
    is_active: req.body.is_active === 'on' || req.body.is_active === '1',
    created_by: req.session.user.id,
  });

  const audience = sanitizeString(req.body.audience) || 'All';
  if (audience === 'All') {
    await db.query(
      `INSERT INTO notifications (user_id, title, message, type, link)
       SELECT id, ?, ?, 'Announcement', '/notifications' FROM users WHERE is_active = 1`,
      [title, message]
    );
  } else {
    const roleName = { Students: 'Student', Instructors: 'Instructor', Coordinators: 'Coordinator', Admin: 'Admin', Partners: 'Partner' }[audience];
    if (roleName) {
      await db.query(
        `INSERT INTO notifications (user_id, title, message, type, link)
         SELECT u.id, ?, ?, 'Announcement', '/notifications' FROM users u
         JOIN roles r ON r.id = u.role_id WHERE r.name = ? AND u.is_active = 1`,
        [title, message, roleName]
      );
    }
  }

  await auditLog(req, 'CREATE', 'announcements', id, { audience });
  req.flash.success('Announcement published.');
  return res.redirect('/admin/announcements');
}

async function announcementUpdate(req, res) {
  const id = req.params.id;
  await adminModel.updateAnnouncement(id, {
    title: sanitizeString(req.body.title, 200),
    message: sanitizeString(req.body.message, 5000),
    audience: sanitizeString(req.body.audience) || 'All',
    is_active: req.body.is_active === 'on' || req.body.is_active === '1',
  });
  await auditLog(req, 'UPDATE', 'announcements', id);
  req.flash.success('Announcement updated.');
  return res.redirect('/admin/announcements');
}

async function announcementDelete(req, res) {
  const id = req.params.id;
  await adminModel.removeAnnouncement(id);
  await auditLog(req, 'DELETE', 'announcements', id);
  req.flash.success('Announcement deleted.');
  return res.redirect('/admin/announcements');
}

// ---------------- Settings ----------------
async function settingsIndex(req, res) {
  const settings = await adminModel.allSettings();
  return res.render('admin/settings', { layout: 'layouts/main', title: 'System settings', settings });
}

async function settingsUpdate(req, res) {
  const keys = ['site_name', 'institution_name', 'pass_mark', 'assessment_weights_locked', 'contact_email', 'contact_phone', 'contact_address'];
  for (const key of keys) {
    if (req.body[key] !== undefined) {
      await adminModel.setSetting(key, sanitizeString(req.body[key], 500), req.session.user.id);
    }
  }
  await auditLog(req, 'UPDATE', 'system_settings', null);
  req.flash.success('Settings saved.');
  return res.redirect('/admin/settings');
}

// ---------------- Audit logs ----------------
async function auditIndex(req, res) {
  const logs = await adminModel.listAuditLogs(200);
  return res.render('admin/audit', { layout: 'layouts/main', title: 'Audit logs', logs });
}

module.exports = {
  usersIndex,
  userNewForm,
  userCreate,
  userEditForm,
  userUpdate,
  userResetPassword,
  userToggleActive,
  userDelete,
  departmentsIndex,
  departmentCreate,
  departmentUpdate,
  departmentDelete,
  yearsIndex,
  yearCreate,
  yearUpdate,
  groupsIndex,
  groupCreate,
  groupUpdate,
  groupDelete,
  announcementsIndex,
  announcementCreate,
  announcementUpdate,
  announcementDelete,
  settingsIndex,
  settingsUpdate,
  auditIndex,
};