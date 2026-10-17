const path = require('path');
const fs = require('fs');
const os = require('os');
const multer = require('multer');

// Storage mode:
//   "disk" - files are saved under /uploads (local PC, XAMPP, normal servers)
//   "db"   - files are kept in memory and stored in the MySQL database
//            (required on Vercel, whose file system is read-only/temporary)
const STORAGE_MODE = process.env.UPLOAD_STORAGE || (process.env.VERCEL ? 'db' : 'disk');
const USE_MEMORY = STORAGE_MODE === 'db';

const UPLOAD_DIR = USE_MEMORY
  ? path.join(os.tmpdir(), 'uploads')
  : path.join(__dirname, '..', '..', 'uploads');
const REPORT_DIR = path.join(UPLOAD_DIR, 'reports');
const AVATAR_DIR = path.join(UPLOAD_DIR, 'avatars');
const CSV_DIR = path.join(UPLOAD_DIR, 'imports');

function ensureDir(dir) {
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch (err) {
    // Read-only file systems are fine when files are kept in memory.
  }
}
if (!USE_MEMORY) {
  [REPORT_DIR, AVATAR_DIR, CSV_DIR].forEach(ensureDir);
}

const MIME_TYPES = new Map([
  ['application/pdf', 'pdf'],
  ['application/msword', 'doc'],
  ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'docx'],
]);

// Vercel limits request bodies to about 4.5 MB, so default to 4 MB there.
const MAX_SIZE = Number(process.env.UPLOAD_MAX_SIZE_MB || (process.env.VERCEL ? 4 : 10)) * 1024 * 1024;

function storageFor(dir) {
  if (USE_MEMORY) return multer.memoryStorage();
  return multer.diskStorage({
    destination(req, file, cb) {
      cb(null, dir);
    },
    filename(req, file, cb) {
      const safe = path
        .basename(file.originalname)
        .replace(/[^a-zA-Z0-9._-]/g, '_');
      cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}-${safe}`);
    },
  });
}

const reportUpload = multer({
  storage: storageFor(REPORT_DIR),
  limits: { fileSize: MAX_SIZE },
  fileFilter(req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const mime = MIME_TYPES.get(file.mimetype);
    if (mime && (ext === '.pdf' || ext === '.doc' || ext === '.docx')) {
      return cb(null, true);
    }
    return cb(new Error('Only PDF and Word (DOC/DOCX) files are allowed.'));
  },
});

const csvUpload = multer({
  storage: storageFor(CSV_DIR),
  limits: { fileSize: MAX_SIZE },
  fileFilter(req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.csv') return cb(null, true);
    return cb(new Error('Only CSV files are allowed.'));
  },
});

module.exports = {
  reportUpload, csvUpload, UPLOAD_DIR, REPORT_DIR, AVATAR_DIR, CSV_DIR, MAX_SIZE, STORAGE_MODE, USE_MEMORY,
};
