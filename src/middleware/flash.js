function flash(messages) {
  return `<div class="alert alert-${messages.type} alert-dismissible fade show" role="alert">
    ${messages.text}
    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
  </div>`;
}

function flashFactory(req) {
  return {
    success: (text) => { req.session.flash = { type: 'success', text }; },
    error: (text) => { req.session.flash = { type: 'danger', text }; },
    warning: (text) => { req.session.flash = { type: 'warning', text }; },
    info: (text) => { req.session.flash = { type: 'info', text }; },
  };
}

function consumeFlash(req, res, next) {
  const messages = req.session.flash;
  delete req.session.flash;
  res.locals.flash = messages || null;
  req.flash = flashFactory(req);
  next();
}

module.exports = { consumeFlash, flash };