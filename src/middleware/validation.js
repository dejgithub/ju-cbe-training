const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function sanitizeString(value, maxLen = 255) {
  if (value === null || value === undefined) return '';
  return String(value).trim().slice(0, maxLen);
}

function requiredString(value, label) {
  const v = sanitizeString(value);
  if (!v) return `${label} is required.`;
  return null;
}

function optionalString(value, label, maxLen = 255) {
  const v = sanitizeString(value);
  if (v.length > maxLen) return `${label} must be ${maxLen} characters or fewer.`;
  return null;
}

function validateEmail(value) {
  const v = sanitizeString(value);
  if (!v) return null;
  if (v.length > 150) return 'Email is too long.';
  if (!EMAIL_RE.test(v)) return 'Enter a valid email address.';
  return null;
}

function validateDate(value, label) {
  const v = sanitizeString(value);
  if (!v) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return `${label} must be a valid date (YYYY-MM-DD).`;
  return null;
}

function validateNumber(value, label, { min = null, max = null } = {}) {
  const v = sanitizeString(value);
  if (!v) return null;
  const n = Number(v);
  if (Number.isNaN(n)) return `${label} must be a number.`;
  if (min !== null && n < min) return `${label} must be at least ${min}.`;
  if (max !== null && n > max) return `${label} must be at most ${max}.`;
  return null;
}

function validatorsFor(values) {
  return {
    required: (key, label) => requiredString(values[key], label),
    optional: (key, label, max) => optionalString(values[key], label, max),
    email: (key) => validateEmail(values[key]),
    date: (key, label) => validateDate(values[key], label),
    number: (key, label, opts) => validateNumber(values[key], label, opts),
  };
}

module.exports = {
  sanitizeString,
  requiredString,
  optionalString,
  validateEmail,
  validateDate,
  validateNumber,
  validatorsFor,
};