const db = require('../config/db');

async function create({ userId, title, message, type = 'Info', link = null }) {
  const [result] = await db.query(
    'INSERT INTO notifications (user_id, title, message, type, link) VALUES (?, ?, ?, ?, ?)',
    [userId, title, message, type, link]
  );
  return result.insertId;
}

async function forUser(userId, { unreadOnly = false, limit = 30 } = {}) {
  const [rows] = await db.query(
    `SELECT * FROM notifications
     WHERE user_id = ?
     ${unreadOnly ? 'AND is_read = 0' : ''}
     ORDER BY created_at DESC
     LIMIT ?`,
    [userId, limit]
  );
  return rows;
}

async function markRead(id, userId) {
  await db.query('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [id, userId]);
}

async function markAllRead(userId) {
  await db.query('UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0', [userId]);
}

async function unreadCount(userId) {
  const [rows] = await db.query(
    'SELECT COUNT(*) AS total FROM notifications WHERE user_id = ? AND is_read = 0',
    [userId]
  );
  return Number(rows[0].total);
}

async function notifyUsers(userIds, payload) {
  for (const userId of userIds) {
    await create({ userId, ...payload });
  }
}

async function notifyRole(roleName, payload) {
  await db.query(
    `INSERT INTO notifications (user_id, title, message, type, link)
     SELECT u.id, ?, ?, ?, ? FROM users u
     JOIN roles r ON r.id = u.role_id
     WHERE r.name = ? AND u.is_active = 1`,
    [payload.title, payload.message, payload.type || 'Info', payload.link || null, roleName]
  );
}

module.exports = { create, forUser, markRead, markAllRead, unreadCount, notifyUsers, notifyRole };