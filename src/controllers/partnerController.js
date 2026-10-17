const db = require('../config/db');
const userModel = require('../models/user.model');
const siteModel = require('../models/site.model');
const notificationModel = require('../models/notification.model');
const { auditLog } = require('../middleware/audit');
const { sanitizeString } = require('../middleware/validation');

async function partnerContext(req, res) {
  const partner = await userModel.partnerLinkByUserId(req.session.user.id);
  if (!partner) {
    req.flash.error('No community partner organization is linked to your account.');
    return res.redirect('/dashboard');
  }
  return partner;
}

async function index(req, res) {
  const partner = await partnerContext(req, res);
  if (!partner) return undefined;

  const sites = await siteModel.sitesForPartner(partner.community_partner_id);
  const siteIds = sites.map((s) => s.id);
  let placements = [];
  let confirmations = [];
  let feedback = [];
  if (siteIds.length) {
    [placements] = await db.query(
      `SELECT sp.id, sp.status AS placement_status, sp.start_date, sp.end_date,
              s.student_id AS reg_no, s.full_name AS student_name, s.gender,
              d.name AS department_name, cs.name AS site_name, p.name AS program_name
       FROM student_placements sp
       JOIN students s ON s.id = sp.student_id
       JOIN cbe_programs p ON p.id = sp.cbe_program_id
       LEFT JOIN departments d ON d.id = s.department_id
       JOIN community_sites cs ON cs.id = sp.community_site_id
       WHERE sp.community_site_id IN (?) AND sp.status != 'Withdrawn'
       ORDER BY s.full_name`,
      [siteIds]
    );
    const placementIds = placements.map((p) => p.id);
    if (placementIds.length) {
      [confirmations] = await db.query(
        `SELECT * FROM partner_confirmations
         WHERE placement_id IN (?)
         ORDER BY created_at DESC`,
        [placementIds]
      );
      [feedback] = await db.query(
        `SELECT pf.*, u.full_name AS author
         FROM partner_feedback pf
         JOIN users u ON u.id = pf.partner_user_id
         WHERE pf.placement_id IN (?)
         ORDER BY pf.created_at DESC`,
        [placementIds]
      );
    }
  }
  const confirmationByPlacement = new Map();
  confirmations.forEach((c) => {
    if (!confirmationByPlacement.has(c.placement_id)) confirmationByPlacement.set(c.placement_id, c);
  });
  const feedbackByPlacement = new Map();
  feedback.forEach((f) => {
    if (!feedbackByPlacement.has(f.placement_id)) feedbackByPlacement.set(f.placement_id, []);
    feedbackByPlacement.get(f.placement_id).push(f);
  });

  return res.render('partner/index', {
    layout: 'layouts/main',
    title: 'Assigned students',
    partner,
    sites,
    placements,
    confirmationByPlacement,
    feedbackByPlacement,
  });
}

async function verifyPlacementForPartner(req, res) {
  const partner = await partnerContext(req, res);
  if (!partner) return null;
  const [rows] = await db.query(
    `SELECT sp.id, sp.student_id, s.full_name AS student_name, sp.community_site_id
     FROM student_placements sp
     JOIN students s ON s.id = sp.student_id
     JOIN community_sites cs ON cs.id = sp.community_site_id
     WHERE sp.id = ? AND cs.community_partner_id = ? LIMIT 1`,
    [req.body.placement_id || req.params.placementId, partner.community_partner_id]
  );
  return { partner, placement: rows[0] || null };
}

async function confirm(req, res) {
  const ctx = await verifyPlacementForPartner(req, res);
  if (!ctx) return undefined;
  if (!ctx.placement) {
    req.flash.error('Placement not found or not managed by your organization.');
    return res.redirect('/partner');
  }
  const status = req.body.status === 'Declined' ? 'Declined' : 'Confirmed';
  await db.query(
    'INSERT INTO partner_confirmations (placement_id, partner_user_id, status, note) VALUES (?, ?, ?, ?)',
    [ctx.placement.id, req.session.user.id, status, sanitizeString(req.body.note, 500) || null]
  );
  await notificationModel.notifyRole('Coordinator', {
    title: `Participation ${status.toLowerCase()}`,
    message: `${ctx.partner.organization_name} marked ${ctx.placement.student_name}'s participation as "${status}".`,
    type: status === 'Confirmed' ? 'Success' : 'Warning',
    link: '/placements',
  });
  await auditLog(req, 'PARTNER_CONFIRM', 'student_placements', ctx.placement.id, { status });
  req.flash.success('Participation status recorded.');
  return res.redirect('/partner');
}

async function feedback(req, res) {
  const ctx = await verifyPlacementForPartner(req, res);
  if (!ctx) return undefined;
  if (!ctx.placement) {
    req.flash.error('Placement not found or not managed by your organization.');
    return res.redirect('/partner');
  }
  const comment = sanitizeString(req.body.comment, 3000);
  if (!comment) {
    req.flash.error('Feedback comment is required.');
    return res.redirect('/partner');
  }
  const rating = Number(req.body.rating);
  await db.query(
    'INSERT INTO partner_feedback (placement_id, partner_user_id, rating, comment) VALUES (?, ?, ?, ?)',
    [ctx.placement.id, req.session.user.id, Number.isNaN(rating) ? null : Math.max(1, Math.min(5, rating)), comment]
  );
  await notificationModel.notifyRole('Coordinator', {
    title: 'Community partner feedback',
    message: `${ctx.partner.organization_name} provided feedback on ${ctx.placement.student_name}.`,
    type: 'Info',
    link: '/placements',
  });
  await auditLog(req, 'PARTNER_FEEDBACK', 'student_placements', ctx.placement.id);
  req.flash.success('Feedback submitted.');
  return res.redirect('/partner');
}

module.exports = { index, confirm, feedback };