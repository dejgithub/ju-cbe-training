const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

const studentModel = require('../models/student.model');
const userModel = require('../models/user.model');
const adminModel = require('../models/admin.model');
const db = require('../config/db');
const { auditLog } = require('../middleware/audit');
const { validatorsFor, sanitizeString, validateEmail } = require('../middleware/validation');

const DEFAULT_PASSWORD = process.env.DEFAULT_USER_PASSWORD || 'Password@123';

async function getStudentRoleId() {
  const [rows] = await db.query("SELECT id FROM roles WHERE name = 'Student' LIMIT 1");
  return rows[0].id;
}

function validateStudent(values, { isEdit = false, excludeStudentId = null } = {}) {
  const v = validatorsFor(values);
  const errors = [];
  const push = (e) => { if (e) errors.push(e); };

  push(v.required('student_id', 'Student ID'));
  push(v.required('full_name', 'Full name'));
  push(v.email('email'));
  push(v.date('date_of_birth', 'Date of birth'));
  push(v.number('year_of_study', 'Year of study', { min: 1, max: 8 }));
  if (!['Male', 'Female', 'Other'].includes(sanitizeString(values.gender))) {
    push('Select a valid gender.');
  }
  return errors;
}

async function index(req, res) {
  const { search = '', department_id = '', year = '', status = '', group_id = '' } = req.query;
  const students = await studentModel.findAll({
    search,
    departmentId: department_id,
    year,
    status,
    groupId: group_id,
  });
  const departments = await adminModel.listDepartments();
  const groups = await adminModel.listGroups();
  return res.render('students/index', {
    layout: 'layouts/main',
    title: 'Students',
    students,
    departments,
    groups,
    filters: { search, department_id, year, status, group_id },
  });
}

async function newForm(req, res) {
  const departments = await adminModel.listDepartments();
  const groups = await adminModel.listGroups();
  return res.render('students/form', {
    layout: 'layouts/main',
    title: 'Register student',
    student: {},
    departments,
    groups,
    isEdit: false,
    errors: [],
    action: '/students',
  });
}

async function create(req, res) {
  const values = req.body;
  const errors = validateStudent(values);

  if (!errors.length) {
    const existing = await studentModel.findByStudentId(sanitizeString(values.student_id));
    if (existing) errors.push('A student with this Student ID already exists.');
    const dupUser = await userModel.findByUsername(sanitizeString(values.student_id));
    if (dupUser) errors.push('A user account with this username already exists.');
  }

  if (errors.length) {
    const departments = await adminModel.listDepartments();
    const groups = await adminModel.listGroups();
    return res.status(400).render('students/form', {
      layout: 'layouts/main',
      title: 'Register student',
      student: values,
      departments,
      groups,
      isEdit: false,
      errors,
      action: '/students',
    });
  }

  const roleId = await getStudentRoleId();
  const hash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  const userId = await userModel.createUser({
    username: sanitizeString(values.student_id),
    email: sanitizeString(values.email) || null,
    passwordHash: hash,
    fullName: sanitizeString(values.full_name),
    phone: sanitizeString(values.phone) || null,
    roleId,
    departmentId: values.department_id || null,
  });

  const studentId = await studentModel.create(
    {
      ...values,
      student_id: sanitizeString(values.student_id),
      full_name: sanitizeString(values.full_name),
    },
    userId
  );

  await auditLog(req, 'CREATE', 'students', studentId, { student_id: values.student_id });
  req.flash.success(`Student registered. Login username "${sanitizeString(values.student_id)}" with the default password.`);
  return res.redirect('/students');
}

async function editForm(req, res) {
  const student = await studentModel.findById(req.params.id);
  if (!student) {
    req.flash.error('Student not found.');
    return res.redirect('/students');
  }
  const departments = await adminModel.listDepartments();
  const groups = await adminModel.listGroups();
  return res.render('students/form', {
    layout: 'layouts/main',
    title: 'Edit student',
    student,
    departments,
    groups,
    isEdit: true,
    errors: [],
    action: `/students/${student.id}`,
  });
}

async function update(req, res) {
  const id = req.params.id;
  const student = await studentModel.findById(id);
  if (!student) {
    req.flash.error('Student not found.');
    return res.redirect('/students');
  }
  const errors = validateStudent(req.body, { isEdit: true });
  if (!errors.length) {
    const dup = await studentModel.findByStudentId(sanitizeString(req.body.student_id));
    if (dup && dup.id !== Number(id)) errors.push('A student with this Student ID already exists.');
  }
  if (errors.length) {
    const departments = await adminModel.listDepartments();
    const groups = await adminModel.listGroups();
    return res.status(400).render('students/form', {
      layout: 'layouts/main',
      title: 'Edit student',
      student: { ...student, ...req.body },
      departments,
      groups,
      isEdit: true,
      errors,
      action: `/students/${id}`,
    });
  }

  await studentModel.update(id, {
    ...req.body,
    student_id: sanitizeString(req.body.student_id),
    full_name: sanitizeString(req.body.full_name),
  });
  await studentModel.updateLinkedUser(id, { email: sanitizeString(req.body.email), phone: sanitizeString(req.body.phone) });
  await auditLog(req, 'UPDATE', 'students', id);
  req.flash.success('Student record updated.');
  return res.redirect('/students');
}

async function remove(req, res) {
  const id = req.params.id;
  const student = await studentModel.findById(id);
  if (!student) {
    req.flash.error('Student not found.');
    return res.redirect('/students');
  }
  await auditLog(req, 'DELETE', 'students', id, { student_id: student.student_id });
  await studentModel.remove(id);
  if (student.user_id) {
    await userModel.deleteUser(student.user_id);
  }
  req.flash.success('Student record deleted.');
  return res.redirect('/students');
}

async function history(req, res) {
  const student = await studentModel.findById(req.params.id);
  if (!student) {
    req.flash.error('Student not found.');
    return res.redirect('/students');
  }
  const rows = await studentModel.cbeHistory(student.id);
  return res.render('students/history', {
    layout: 'layouts/main',
    title: `CBE history - ${student.full_name}`,
    student,
    history: rows,
  });
}

async function importForm(req, res) {
  return res.render('students/import', {
    layout: 'layouts/main',
    title: 'Import students',
    result: null,
    errors: [],
  });
}

async function importCsv(req, res) {
  const errors = [];
  if (!req.file) {
    errors.push('Please choose a CSV file to upload.');
    return res.status(400).render('students/import', { layout: 'layouts/main', title: 'Import students', result: null, errors });
  }

  let records = [];
  try {
    const content = req.file.buffer ? req.file.buffer.toString('utf8') : fs.readFileSync(req.file.path, 'utf8');
    records = parse(content, { columns: true, skip_empty_lines: true, trim: true });
  } catch (err) {
    errors.push(`Could not parse CSV file: ${err.message}`);
  } finally {
    if (req.file.path) fs.unlink(req.file.path, () => {});
  }

  if (!errors.length && (!records.length || !records[0].student_id || !records[0].full_name)) {
    errors.push('The CSV must contain at least the columns: student_id, full_name, gender, department_code, year_of_study, email, phone, address.');
  }

  if (errors.length) {
    return res.status(400).render('students/import', { layout: 'layouts/main', title: 'Import students', result: null, errors });
  }

  const result = { imported: 0, skipped: 0, skippedRows: [] };
  const roleId = await getStudentRoleId();
  const hash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  const departments = await adminModel.listDepartments();
  const deptByCode = new Map(departments.map((d) => [d.code.toLowerCase(), d.id]));

  for (const row of records) {
    const studentId = sanitizeString(row.student_id, 30);
    const fullName = sanitizeString(row.full_name, 150);
    if (!studentId || !fullName) {
      result.skipped += 1;
      result.skippedRows.push({ row, reason: 'Missing student_id or full_name' });
      continue;
    }
    const existing = await studentModel.findByStudentId(studentId);
    if (existing) {
      result.skipped += 1;
      result.skippedRows.push({ row, reason: 'Student ID already exists' });
      continue;
    }
    const email = validateEmail(row.email) ? null : sanitizeString(row.email) || null;
    const deptId = row.department_code ? deptByCode.get(String(row.department_code).toLowerCase()) || null : null;
    const username = studentId;
    const dupUser = await userModel.findByUsername(username);
    try {
      let userId;
      if (dupUser) {
        userId = dupUser.id;
      } else {
        userId = await userModel.createUser({
          username,
          email,
          passwordHash: hash,
          fullName,
          phone: sanitizeString(row.phone) || null,
          roleId,
          departmentId: deptId,
        });
      }
      await studentModel.create(
        {
          student_id: studentId,
          full_name: fullName,
          gender: ['Male', 'Female', 'Other'].includes(sanitizeString(row.gender)) ? sanitizeString(row.gender) : 'Other',
          date_of_birth: /^\d{4}-\d{2}-\d{2}$/.test(sanitizeString(row.date_of_birth)) ? sanitizeString(row.date_of_birth) : null,
          department_id: deptId,
          year_of_study: Number(row.year_of_study) || 1,
          email,
          phone: sanitizeString(row.phone) || null,
          address: sanitizeString(row.address) || null,
          group_id: null,
          status: 'Enrolled',
        },
        userId
      );
      result.imported += 1;
    } catch (err) {
      result.skipped += 1;
      result.skippedRows.push({ row, reason: err.message });
    }
  }

  await auditLog(req, 'IMPORT', 'students', null, { imported: result.imported, skipped: result.skipped });
  req.flash.success(`Import complete: ${result.imported} added, ${result.skipped} skipped.`);
  return res.render('students/import', { layout: 'layouts/main', title: 'Import students', result, errors: [] });
}

module.exports = {
  index,
  newForm,
  create,
  editForm,
  update,
  remove,
  history,
  importForm,
  importCsv,
};