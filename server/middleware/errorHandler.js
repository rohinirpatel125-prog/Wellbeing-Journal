// 404 for unknown API routes
function notFound(req, res) {
  res.status(404).json({ error: 'NotFound', message: `Route ${req.method} ${req.originalUrl} not found` });
}

// Central error handler: turns every failure into a consistent JSON shape
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // Mongoose schema validation
  if (err.name === 'ValidationError') {
    const details = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
    return res.status(400).json({ error: 'ValidationError', message: 'Please fix the highlighted fields', details });
  }
  // Duplicate date (unique index)
  if (err.code === 11000) {
    return res.status(409).json({
      error: 'DuplicateEntry',
      message: 'You already have an entry for that date. Edit it instead.',
      details: [{ field: 'date', message: 'An entry for this date already exists' }],
    });
  }
  // Bad ObjectId
  if (err.name === 'CastError') {
    return res.status(400).json({ error: 'BadRequest', message: `Invalid value for ${err.path}` });
  }
  // Malformed JSON body
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'BadRequest', message: 'Request body is not valid JSON' });
  }
  console.error(err);
  res.status(500).json({ error: 'ServerError', message: 'Something went wrong on the server' });
}

module.exports = { notFound, errorHandler };
