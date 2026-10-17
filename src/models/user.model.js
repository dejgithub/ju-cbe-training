const db = require('../config/db');

function rowToUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    passwordHash: row.password_hash,
    fullName: row.full_name,
    phone: row.phone,
    role: row.role,
    roleId: row.role_id,
    departmentId: row.department_id,
    departmentName: row.department_name,
    isActive: !!row.is_active,
    mustChangePassword: !!row.must_change_password,
    lastLoginAt: row.last_login_at,
    createdAt: row.created_at,
  };
}

async function findByUsername(username) {
  const [rows] = await db.query(
    `SELECT u.*, r.name AS role, d.name AS department_name
     FROM users u
     JOIN roles r ON r.id = u.role_id
     LEFT JOIN departments d ON d.id = u.department_id
     WHERE u.username = ? LIMIT 1`,
    [username]
  );
  return rowToUser(rows[0]);
}

async function findByEmail(email) {
  const [rows] = await db.query(
    `SELECT u.*, r.name AS role, d.name AS department_name
     FROM users u
     JOIN roles r ON r.id = u.role_id
     LEFT JOIN departments d ON d.id = u.department_id
     WHERE u.email = ? LIMIT 1`,
    [email]
  );
  return rowToUser(rows[0]);
}

async function findById(id) {
  const [rows] = await db.query(
    `SELECT u.*, r.name AS role, d.name AS department_name
     FROM users u
     JOIN roles r ON r.id = u.role_id
     LEFT JOIN departments d ON d.id = u.department_id
     WHERE u.id = ? LIMIT 1`,
    [id]
  );
  return rowToUser(rows[0]);
}

async function createUser({ username, email, passwordHash, fullName, phone, roleId, departmentId }) {
  const [result] = await db.query(
    `INSERT INTO users (username, email, password_hash, full_name, phone, role_id, department_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [username, email || null, passwordHash, fullName, phone || null, roleId, departmentId || null]
  );
  return result.insertId;
}

async function updateLastLogin(id) {
  await db.query('UPDATE users SET last_login_at = NOW() WHERE id = ?', [id]);
}

async function changePassword(id, passwordHash) {
  await db.query('UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?', [passwordHash, id]);
}

async function listUsers() {
  const [rows] = await db.query(
    `SELECT u.id, u.username, u.email, u.full_name, u.phone, u.is_active,
            u.last_login_at, u.created_at,
            r.name AS role, d.name AS department_name
     FROM users u
     JOIN roles r ON r.id = u.role_id
     LEFT JOIN departments d ON d.id = u.department_id
     ORDER BY u.created_at DESC`
  );
  return rows;
}

async function updateUser(id, { email, fullName, phone, roleId, departmentId, isActive }) {
  await db.query(
    `UPDATE users
     SET email = ?, full_name = ?, phone = ?, role_id = ?, department_id = ?, is_active = ?
     WHERE id = ?`,
    [email || null, fullName, phone || null, roleId, departmentId || null, isActive ? 1 : 0, id]
  );
}

async function resetPassword(id, passwordHash) {
  await db.query('UPDATE users SET password_hash = ?, must_change_password = 1 WHERE id = ?', [passwordHash, id]);
}

async function deleteUser(id) {
  await db.query('DELETE FROM users WHERE id = ?', [id]);
}

async function instructorByUserId(userId) {
  const [rows] = await db.query(
    `SELECT i.* FROM instructors i WHERE i.user_id = ? LIMIT 1`,
    [userId]
  );
  return rows[0] || null;
}

async function studentByUserId(userId) {
  const [rows] = await db.query(
    `SELECT s.*, d.name AS department_name, g.name AS group_name
     FROM students s
     LEFT JOIN departments d ON d.id = s.department_id
     LEFT JOIN student_groups g ON g.id = s.group_id
     WHERE s.user_id = ? LIMIT 1`,
    [userId]
  );
  return rows[0] || null;
}

async function partnerLinkByUserId(userId) {
  const [rows] = await db.query(
    `SELECT cpu.*, cp.organization_name
     FROM community_partner_users cpu
     JOIN community_partners cp ON cp.id = cpu.community_partner_id
     WHERE cpu.user_id = ? LIMIT 1`,
    [userId]
  );
  return rows[0] || null;
}

async function listInstructors() {
  const [rows] = await db.query(
    `SELECT i.id, i.employee_id, i.title, i.specialization, i.phone,
            u.id AS user_id, u.full_name, u.email, u.username,
            d.name AS department_name
     FROM instructors i
     JOIN users u ON u.id = i.user_id
     LEFT JOIN departments d ON d.id = i.department_id
     ORDER BY u.full_name`
  );
  return rows;
}

async function listCoordinators() {
  const [rows] = await db.query(
    `SELECT u.id, u.full_name, u.username, u.email
     FROM users u
     WHERE u.role_id = (SELECT id FROM roles WHERE name = 'Coordinator') AND u.is_active = 1
     ORDER BY u.full_name`
  );
  return rows;
}

module.exports = {
  findByUsername,
  findByEmail,
  findById,
  createUser,
  updateLastLogin,
  changePassword,
  listUsers,
  updateUser,
  resetPassword,
  deleteUser,
  instructorByUserId,
  studentByUserId,
  partnerLinkByUserId,
  listInstructors,
  listCoordinators,
};