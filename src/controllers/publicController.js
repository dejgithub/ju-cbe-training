const adminModel = require('../models/admin.model');
const notificationModel = require('../models/notification.model');
const { sanitizeString, validateEmail } = require('../middleware/validation');

function home(req, res) {
  return res.render('public/home', { layout: 'layouts/public', title: 'Home' });
}

function about(req, res) {
  return res.render('public/about', { layout: 'layouts/public', title: 'About' });
}

function mission(req, res) {
  return res.render('public/mission', { layout: 'layouts/public', title: 'Mission' });
}

function vision(req, res) {
  return res.render('public/vision', { layout: 'layouts/public', title: 'Vision' });
}

async function contact(req, res) {
  const [email, phone, address] = await Promise.all([
    adminModel.getSetting('contact_email'),
    adminModel.getSetting('contact_phone'),
    adminModel.getSetting('contact_address'),
  ]);
  return res.render('public/contact', {
    layout: 'layouts/public',
    title: 'Contact Us',
    contact: {
      email: email || '',
      phone: phone || '',
      address: address || 'Jimma University, Jimma, Ethiopia',
    },
    form: {},
    errors: [],
  });
}

async function postContact(req, res) {
  const name = sanitizeString(req.body.name, 150);
  const email = sanitizeString(req.body.email, 150);
  const subject = sanitizeString(req.body.subject, 200);
  const message = sanitizeString(req.body.message, 5000);

  const errors = [];
  if (!name) errors.push('Please enter your name.');
  if (!email || !validateEmail(email)) errors.push('Please enter a valid email address.');
  if (!message) errors.push('Please enter a message.');

  if (errors.length) {
    const [sEmail, sPhone, sAddress] = await Promise.all([
      adminModel.getSetting('contact_email'),
      adminModel.getSetting('contact_phone'),
      adminModel.getSetting('contact_address'),
    ]);
    return res.status(400).render('public/contact', {
      layout: 'layouts/public',
      title: 'Contact Us',
      contact: {
        email: sEmail || '',
        phone: sPhone || '',
        address: sAddress || 'Jimma University, Jimma, Ethiopia',
      },
      form: { name, email, subject, message },
      errors,
    });
  }

  try {
    await notificationModel.notifyRole('Admin', {
      title: `Contact message: ${subject || 'General enquiry'}`,
      message: `From ${name} <${email}>: ${message}`,
      type: 'Info',
      link: '/notifications',
    });
  } catch (err) {
    console.error('Failed to deliver contact message:', err.message);
  }

  req.flash.success('Thank you for your message. The CBE office will get back to you soon.');
  return res.redirect('/contact');
}

module.exports = { home, about, mission, vision, contact, postContact };
