function pad(n) {
  return String(n).padStart(2, '0');
}

function formatDate(value) {
  if (!value) return '';
  const m = String(value).match(/(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  return String(value);
}

function formatDateTime(value) {
  if (!value) return '';
  const m = String(value).match(/(\d{4})-(\d{2})-(\d{2})[\sT](\d{2}):(\d{2})(?::(\d{2}))?/);
  if (m) return `${m[3]}/${m[2]}/${m[1]} ${m[4]}:${m[5]}`;
  return String(value);
}

function formatTime(value) {
  if (!value) return '';
  const m = String(value).match(/(\d{2}):(\d{2})/);
  if (m) return `${m[1]}:${m[2]}`;
  return String(value);
}

function todaySql() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function nowSql() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function tomorrowSql(n = 1) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function statusBadgeClass(status) {
  const map = {
    Active: 'bg-success',
    Planned: 'bg-info',
    Completed: 'bg-secondary',
    Cancelled: 'bg-danger',
    Enrolled: 'bg-success',
    Inactive: 'bg-secondary',
    Graduated: 'bg-info',
    Transferred: 'bg-warning',
    Present: 'bg-success',
    Absent: 'bg-danger',
    Late: 'bg-warning',
    Excused: 'bg-info',
    Submitted: 'bg-primary',
    'Under Review': 'bg-warning',
    Approved: 'bg-success',
    Returned: 'bg-danger',
    Assigned: 'bg-info',
    Withdrawn: 'bg-danger',
    Pending: 'bg-warning',
    Overdue: 'bg-danger',
    CompletedTask: 'bg-success',
    Male: 'bg-info',
    Female: 'bg-pink',
    Other: 'bg-secondary',
    Hospital: 'bg-danger',
    'Health Center': 'bg-success',
    School: 'bg-info',
    Kebele: 'bg-warning',
    NGO: 'bg-primary',
    'Government Office': 'bg-dark',
    Private: 'bg-secondary',
  };
  return map[status] || 'bg-secondary';
}

function gradeForScore(score, passMark) {
  if (score === null || score === undefined) return null;
  const s = Number(score);
  const pass = Number(passMark || 50);
  if (s < pass) return 'F';
  if (s >= 90) return 'A';
  if (s >= 80) return 'B';
  if (s >= 70) return 'C';
  if (s >= 60) return 'D';
  return 'F';
}

function toQuery(obj) {
  if (!obj) return '';
  return Object.keys(obj)
    .filter((k) => obj[k] !== undefined && obj[k] !== null && obj[k] !== '')
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(obj[k])}`)
    .join('&');
}

function cssClass(value) {
  return String(value === null || value === undefined ? '' : value)
    .replace(/[^a-zA-Z0-9\-_ ]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .toLowerCase();
}

module.exports = {
  formatDate,
  formatDateTime,
  formatTime,
  todaySql,
  nowSql,
  tomorrowSql,
  addDays,
  statusBadgeClass,
  gradeForScore,
  toQuery,
  cssClass,
};