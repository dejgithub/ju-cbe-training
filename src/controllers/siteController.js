const siteModel = require('../models/site.model');
const db = require('../config/db');
const bcrypt = require('bcrypt');
const userModel = require('../models/user.model');
const { auditLog } = require('../middleware/audit');
const { validatorsFor, sanitizeString } = require('../middleware/validation');

const SITE_TYPES = ['Hospital', 'Health Center', 'School', 'Kebele', 'NGO', 'Government Office', 'Private', 'Other'];
const DEFAULT_PASSWORD = process.env.DEFAULT_USER_PASSWORD || 'Password@123';

async function index(req, res) {
  const { search = '', type = '' } = req.query;
  const sites = await siteModel.findAllSites({ search, type });
  const partners = await siteModel.findAllPartners();
  return res.render('sites/index', {
    layout: 'layouts/main',
    title: 'Community Sites',
    sites,
    partners,
    filters: { search, type },
    siteTypes: SITE_TYPES,
  });
}

async function newForm(req, res) {
  const partners = await siteModel.findAllPartners();
  return res.render('sites/form', {
    layout: 'layouts/main',
    title: 'Register community site',
    site: { status: 'Active', site_type: 'Health Center' },
    partners,
    siteTypes: SITE_TYPES,
    errors: [],
    action: '/sites',
    isEdit: false,
  });
}

function validateSite(values) {
  const v = validatorsFor(values);
  const errors = [];
  const push = (e) => { if (e) errors.push(e); };
  push(v.required('name', 'Site name'));
  push(v.email('email'));
  push(v.number('available_placements', 'Available placements', { min: 0, max: 10000 }));
  if (values.site_type && !SITE_TYPES.includes(sanitizeString(values.site_type))) errors.push('Invalid site type.');
  return errors;
}

async function create(req, res) {
  const errors = validateSite(req.body);
  const partners = await siteModel.findAllPartners();
  if (errors.length) {
    return res.status(400).render('sites/form', {
      layout: 'layouts/main',
      title: 'Register community site',
      site: req.body,
      partners,
      siteTypes: SITE_TYPES,
      errors,
      action: '/sites',
      isEdit: false,
    });
  }
  const id = await siteModel.createSite(sanitizeSite(req.body));
  await auditLog(req, 'CREATE', 'community_sites', id, { name: req.body.name });
  req.flash.success('Community site registered.');
  return res.redirect('/sites');
}

function sanitizeSite(body) {
  return {
    name: sanitizeString(body.name, 150),
    site_type: SITE_TYPES.includes(body.site_type) ? body.site_type : 'Other',
    address: sanitizeString(body.address, 255),
    city: sanitizeString(body.city, 100),
    contact_person: sanitizeString(body.contact_person, 150),
    phone: sanitizeString(body.phone, 30),
    email: sanitizeString(body.email, 150),
    available_placements: Number(body.available_placements || 0),
    community_partner_id: body.community_partner_id || null,
    status: body.status === 'Inactive' ? 'Inactive' : 'Active',
  };
}

async function editForm(req, res) {
  const site = await siteModel.findSiteById(req.params.id);
  if (!site) {
    req.flash.error('Site not found.');
    return res.redirect('/sites');
  }
  const partners = await siteModel.findAllPartners();
  return res.render('sites/form', {
    layout: 'layouts/main',
    title: 'Edit community site',
    site,
    partners,
    siteTypes: SITE_TYPES,
    errors: [],
    action: `/sites/${site.id}`,
    isEdit: true,
  });
}

async function update(req, res) {
  const id = req.params.id;
  const site = await siteModel.findSiteById(id);
  if (!site) {
    req.flash.error('Site not found.');
    return res.redirect('/sites');
  }
  const errors = validateSite(req.body);
  const partners = await siteModel.findAllPartners();
  if (errors.length) {
    return res.status(400).render('sites/form', {
      layout: 'layouts/main',
      title: 'Edit community site',
      site: { ...site, ...req.body },
      partners,
      siteTypes: SITE_TYPES,
      errors,
      action: `/sites/${id}`,
      isEdit: true,
    });
  }
  await siteModel.updateSite(id, sanitizeSite(req.body));
  await auditLog(req, 'UPDATE', 'community_sites', id);
  req.flash.success('Community site updated.');
  return res.redirect('/sites');
}

async function remove(req, res) {
  const id = req.params.id;
  const [used] = await db.query('SELECT COUNT(*) AS total FROM student_placements WHERE community_site_id = ?', [id]);
  if (used[0].total > 0) {
    req.flash.error('Cannot delete a site that has student placements. Set it to inactive instead.');
    return res.redirect('/sites');
  }
  await siteModel.removeSite(id);
  await auditLog(req, 'DELETE', 'community_sites', id);
  req.flash.success('Community site deleted.');
  return res.redirect('/sites');
}

// ---------------- Partners ----------------
async function partnersIndex(req, res) {
  const partners = await siteModel.findAllPartners();
  return res.render('sites/partners', {
    layout: 'layouts/main',
    title: 'Community Partners',
    partners,
  });
}

async function createPartner(req, res) {
  if (!sanitizeString(req.body.organization_name)) {
    req.flash.error('Organization name is required.');
    return res.redirect('/sites/partners');
  }
  const id = await siteModel.createPartner({
    organization_name: sanitizeString(req.body.organization_name, 150),
    contact_person: sanitizeString(req.body.contact_person, 150),
    phone: sanitizeString(req.body.phone, 30),
    email: sanitizeString(req.body.email, 150),
    address: sanitizeString(req.body.address, 255),
    description: sanitizeString(req.body.description, 2000),
  });
  await auditLog(req, 'CREATE', 'community_partners', id);
  req.flash.success('Community partner added.');
  return res.redirect('/sites/partners');
}

async function partnerDetail(req, res) {
  const partner = await siteModel.findPartnerById(req.params.id);
  if (!partner) {
    req.flash.error('Partner not found.');
    return res.redirect('/sites/partners');
  }
  const [sites, users] = await Promise.all([
    siteModel.sitesForPartner(partner.id),
    siteModel.findPartnerUsers(partner.id),
  ]);
  const allUsers = await userModel.listUsers();
  const partnerUsers = allUsers.filter((u) => u.role === 'Partner');
  return res.render('sites/partner-detail', {
    layout: 'layouts/main',
    title: partner.organization_name,
    partner,
    sites,
    users,
    partnerUsers,
  });
}

async function updatePartner(req, res) {
  const id = req.params.id;
  await siteModel.updatePartner(id, {
    organization_name: sanitizeString(req.body.organization_name, 150),
    contact_person: sanitizeString(req.body.contact_person, 150),
    phone: sanitizeString(req.body.phone, 30),
    email: sanitizeString(req.body.email, 150),
    address: sanitizeString(req.body.address, 255),
    description: sanitizeString(req.body.description, 2000),
  });
  await auditLog(req, 'UPDATE', 'community_partners', id);
  req.flash.success('Partner updated.');
  return res.redirect(`/sites/partners/${id}`);
}

async function removePartner(req, res) {
  const id = req.params.id;
  await siteModel.removePartner(id);
  await auditLog(req, 'DELETE', 'community_partners', id);
  req.flash.success('Partner deleted.');
  return res.redirect('/sites/partners');
}

async function createPartnerUser(req, res) {
  const partnerId = req.params.id;
  const username = sanitizeString(req.body.username, 100);
  const fullName = sanitizeString(req.body.full_name, 150);
  if (!username || !fullName) {
    req.flash.error('Username and full name are required.');
    return res.redirect(`/sites/partners/${partnerId}`);
  }
  const existing = await userModel.findByUsername(username);
  if (existing) {
    req.flash.error('That username is already taken.');
    return res.redirect(`/sites/partners/${partnerId}`);
  }
  const [roleRows] = await db.query("SELECT id FROM roles WHERE name = 'Partner' LIMIT 1");
  const hash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  const userId = await userModel.createUser({
    username,
    email: sanitizeString(req.body.email, 150) || null,
    passwordHash: hash,
    fullName,
    phone: sanitizeString(req.body.phone, 30) || null,
    roleId: roleRows[0].id,
    departmentId: null,
  });
  await siteModel.addPartnerUser(partnerId, userId);
  await auditLog(req, 'CREATE', 'community_partner_users', userId, { partnerId });
  req.flash.success('Partner user account created.');
  return res.redirect(`/sites/partners/${partnerId}`);
}

async function removePartnerUser(req, res) {
  const partnerId = req.params.id;
  await siteModel.removePartnerUser(req.params.userId);
  await auditLog(req, 'DELETE', 'community_partner_users', req.params.userId, { partnerId });
  req.flash.success('Partner user removed.');
  return res.redirect(`/sites/partners/${partnerId}`);
}

module.exports = {
  index,
  newForm,
  create,
  editForm,
  update,
  remove,
  partnersIndex,
  createPartner,
  partnerDetail,
  updatePartner,
  removePartner,
  createPartnerUser,
  removePartnerUser,
  SITE_TYPES,
};