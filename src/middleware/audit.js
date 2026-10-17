const db = require('../config/db');

async function auditLog(req, action, entityType = null, entityId = null, details = null) {
  try {
    await db.query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address) VALUES (?, ?, ?, ?, ?, ?)',
      [
        req.session.user ? req.session.user.id : null,
        action,
        entityType,
        entityId,
        details ? JSON.stringify(details) : null,
        req.ip || null,
      ]
    );
  } catch (err) {
    console.error('Audit log write failed:', err.message);
  }
}

module.exports = { auditLog };