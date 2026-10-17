const path = require('path');
const express = require('express');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const expressLayouts = require('express-ejs-layouts');
const db = require('./config/db');
const { consumeFlash, flash } = require('./middleware/flash');
const { csrfSetup, requireCsrf } = require('./middleware/csrf');
const helpers = require('./utils/helpers');

const app = express();

// Needed behind Vercel's proxy so HTTPS and secure cookies work.
app.set('trust proxy', 1);

// ---------------- View engine ----------------
// On Vercel the bundled function may not resolve __dirname the same way,
// so fall back to cwd if the relative path has no views directory.
const fs = require('fs');
const projectRoot = path.join(__dirname, '..');
const viewsDir = fs.existsSync(path.join(projectRoot, 'views'))
  ? path.join(projectRoot, 'views')
  : path.join(process.cwd(), 'views');
app.set('view engine', 'ejs');
app.set('views', viewsDir);
app.use(expressLayouts);

// ---------------- Static assets ----------------
const publicDir = fs.existsSync(path.join(projectRoot, 'public'))
  ? path.join(projectRoot, 'public')
  : path.join(process.cwd(), 'public');
app.use(express.static(publicDir));
if (!require('./middleware/upload').USE_MEMORY) {
  const uploadsDir = fs.existsSync(path.join(projectRoot, 'uploads'))
    ? path.join(projectRoot, 'uploads')
    : path.join(process.cwd(), 'uploads');
  app.use('/uploads', express.static(uploadsDir));
}

// ---------------- Body parsing ----------------
app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit: '1mb' }));

// ---------------- Session (MySQL-backed) ----------------
const sessionStore = new MySQLStore({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'ju_cbe_training',
  expiration: Number(process.env.SESSION_MAX_AGE_HOURS || 8) * 3600000,
  createDatabaseTable: true,
  connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || (process.env.VERCEL ? 2 : 10)),
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' } : undefined,
  checkExpirationInterval: 900000,
});

app.use(
  session({
    name: 'cbe.sid',
    secret: process.env.SESSION_SECRET || 'insecure-dev-secret-change-me',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: Number(process.env.SESSION_MAX_AGE_HOURS || 8) * 3600000,
    },
  })
);

// ---------------- Per-request locals ----------------
app.use(async (req, res, next) => {
  res.locals.appName = 'CBE Training Management System';
  res.locals.institutionName = 'Jimma University';
  res.locals.currentUser = req.session.user || null;
  res.locals.currentPath = req.path;
  res.locals.flashBox = flash;
  Object.assign(res.locals, helpers);

  if (req.session.user) {
    try {
      const [rows] = await db.query(
        `SELECT u.id, u.username, u.full_name, u.email, r.name AS role,
                u.department_id, u.is_active
         FROM users u
         JOIN roles r ON r.id = u.role_id
         WHERE u.id = ? LIMIT 1`,
        [req.session.user.id]
      );
      if (rows.length === 0) {
        req.session.destroy(() => res.redirect('/login'));
        return undefined;
      }
      if (!rows[0].is_active) {
        req.session.destroy(() => res.redirect('/login?error=deactivated'));
        return undefined;
      }
      const current = {
        id: rows[0].id,
        username: rows[0].username,
        fullName: rows[0].full_name,
        email: rows[0].email,
        role: rows[0].role,
        departmentId: rows[0].department_id,
        isActive: !!rows[0].is_active,
      };
      req.session.user = current;
      res.locals.currentUser = current;

      const [notif] = await db.query(
        'SELECT COUNT(*) AS total FROM notifications WHERE user_id = ? AND is_read = 0',
        [current.id]
      );
      res.locals.unreadCount = notif[0].total;
    } catch (err) {
      console.error('Failed to load user context:', err.message);
      res.locals.unreadCount = 0;
    }
  } else {
    res.locals.unreadCount = 0;
  }
  return next();
});

app.use(consumeFlash);
app.use(csrfSetup);

// ---------------- Routes ----------------
// Wrap async handlers so rejected promises are forwarded to the error handler
// instead of crashing the process (Express 4 does not await route handlers).
function wrapHandler(fn) {
  if (typeof fn !== 'function' || fn.__asyncWrapped) return fn;
  const wrapped = function wrappedHandler(req, res, next) {
    try {
      const result = fn(req, res, next);
      if (result && typeof result.then === 'function') result.catch(next);
    } catch (err) {
      next(err);
    }
  };
  wrapped.__asyncWrapped = true;
  return wrapped;
}

function wrapRouter(router) {
  router.stack.forEach((layer) => {
    if (layer.route && layer.route.stack) {
      layer.route.stack.forEach((s) => { s.handle = wrapHandler(s.handle); });
    } else if (typeof layer.handle === 'function') {
      layer.handle = wrapHandler(layer.handle);
    }
  });
  return router;
}

function mount(prefix, routerPath) {
  app.use(prefix, wrapRouter(require(routerPath)));
}

mount('/', './routes/publicRoutes');
mount('/', './routes/authRoutes');
mount('/dashboard', './routes/dashboardRoutes');
mount('/students', './routes/studentRoutes');
mount('/programs', './routes/programRoutes');
mount('/sites', './routes/siteRoutes');
mount('/placements', './routes/placementRoutes');
mount('/attendance', './routes/attendanceRoutes');
mount('/reports', './routes/reportRoutes');
mount('/assessments', './routes/assessmentRoutes');
mount('/notifications', './routes/notificationRoutes');
mount('/analytics', './routes/analyticsRoutes');
mount('/admin', './routes/adminRoutes');
mount('/partner', './routes/partnerRoutes');
mount('/profile', './routes/profileRoutes');

// ---------------- 404 ----------------
app.use((req, res) => {
  const layout = res.locals.currentUser ? 'layouts/main' : 'layouts/public';
  res.status(404).render('errors/404', { layout, title: 'Page not found' });
});

// ---------------- Error handler ----------------
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  const status = err.status || (err.name === 'MulterError' ? 400 : 500);
  const layout = res.locals.currentUser ? 'layouts/main' : 'layouts/public';
  if (status >= 500) {
    if (!res.headersSent) {
      return res.status(status).render('errors/500', { layout, title: 'Server error' });
    }
  }
  if (!res.headersSent) {
    return res.status(status).render('errors/500', { layout, title: 'Error', message: err.message });
  }
  return next(err);
});

module.exports = app;