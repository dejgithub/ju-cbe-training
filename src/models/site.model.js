const db = require('../config/db');

async function findAllSites({ search = '', type = '' } = {}) {
  const where = [];
  const params = [];
  if (search) {
    where.push('(cs.name LIKE ? OR cs.address LIKE ? OR cs.city LIKE ? OR cp.organization_name LIKE ?)');
    const like = `%${search}%`;
    params.push(like, like, like, like);
  }
  if (type) where.push('cs.site_type = ?'), params.push(type);
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const [rows] = await db.query(
    `SELECT cs.*, cp.organization_name,
            (SELECT COUNT(*) FROM student_placements sp WHERE sp.community_site_id = cs.id AND sp.status != 'Withdrawn') AS active_students,
            (SELECT COUNT(*) FROM student_placements sp WHERE sp.community_site_id = cs.id) AS total_students
     FROM community_sites cs
     LEFT JOIN community_partners cp ON cp.id = cs.community_partner_id
     ${whereSql}
     ORDER BY cs.name`,
    params
  );
  return rows;
}

async function findSiteById(id) {
  const [rows] = await db.query(
    `SELECT cs.*, cp.organization_name
     FROM community_sites cs
     LEFT JOIN community_partners cp ON cp.id = cs.community_partner_id
     WHERE cs.id = ? LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

async function createSite(data) {
  const [result] = await db.query(
    `INSERT INTO community_sites
      (name, site_type, address, city, contact_person, phone, email,
       available_placements, community_partner_id, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.name,
      data.site_type || 'Other',
      data.address || null,
      data.city || null,
      data.contact_person || null,
      data.phone || null,
      data.email || null,
      Number(data.available_placements || 0),
      data.community_partner_id || null,
      data.status || 'Active',
    ]
  );
  return result.insertId;
}

async function updateSite(id, data) {
  await db.query(
    `UPDATE community_sites
     SET name = ?, site_type = ?, address = ?, city = ?, contact_person = ?,
         phone = ?, email = ?, available_placements = ?, community_partner_id = ?, status = ?
     WHERE id = ?`,
    [
      data.name,
      data.site_type || 'Other',
      data.address || null,
      data.city || null,
      data.contact_person || null,
      data.phone || null,
      data.email || null,
      Number(data.available_placements || 0),
      data.community_partner_id || null,
      data.status || 'Active',
      id,
    ]
  );
}

async function removeSite(id) {
  await db.query('DELETE FROM community_sites WHERE id = ?', [id]);
}

async function findAllPartners() {
  const [rows] = await db.query(
    `SELECT cp.*, (SELECT COUNT(*) FROM community_sites cs WHERE cs.community_partner_id = cp.id) AS site_count
     FROM community_partners cp
     ORDER BY cp.organization_name`
  );
  return rows;
}

async function findPartnerById(id) {
  const [rows] = await db.query('SELECT * FROM community_partners WHERE id = ? LIMIT 1', [id]);
  return rows[0] || null;
}

async function createPartner(data) {
  const [result] = await db.query(
    `INSERT INTO community_partners (organization_name, contact_person, phone, email, address, description)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [data.organization_name, data.contact_person || null, data.phone || null, data.email || null, data.address || null, data.description || null]
  );
  return result.insertId;
}

async function updatePartner(id, data) {
  await db.query(
    `UPDATE community_partners
     SET organization_name = ?, contact_person = ?, phone = ?, email = ?, address = ?, description = ?
     WHERE id = ?`,
    [data.organization_name, data.contact_person || null, data.phone || null, data.email || null, data.address || null, data.description || null, id]
  );
}

async function removePartner(id) {
  await db.query('DELETE FROM community_partners WHERE id = ?', [id]);
}

async function findPartnerUsers(partnerId) {
  const [rows] = await db.query(
    `SELECT u.id, u.username, u.email, u.full_name, u.phone, u.is_active, u.created_at
     FROM community_partner_users cpu
     JOIN users u ON u.id = cpu.user_id
     WHERE cpu.community_partner_id = ?
     ORDER BY u.full_name`,
    [partnerId]
  );
  return rows;
}

async function addPartnerUser(partnerId, userId) {
  await db.query('INSERT INTO community_partner_users (community_partner_id, user_id) VALUES (?, ?)', [partnerId, userId]);
}

async function removePartnerUser(userId) {
  await db.query('DELETE FROM community_partner_users WHERE user_id = ?', [userId]);
}

async function sitesForPartner(partnerId) {
  const [rows] = await db.query(
    `SELECT cs.* FROM community_sites cs
     WHERE cs.community_partner_id = ? AND cs.status = 'Active'
     ORDER BY cs.name`,
    [partnerId]
  );
  return rows;
}

module.exports = {
  findAllSites,
  findSiteById,
  createSite,
  updateSite,
  removeSite,
  findAllPartners,
  findPartnerById,
  createPartner,
  updatePartner,
  removePartner,
  findPartnerUsers,
  addPartnerUser,
  removePartnerUser,
  sitesForPartner,
};