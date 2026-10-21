const notFound = (req, res) => res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let status = err.statusCode || 500;
  let message = err.message || 'Server error';

  if (err.name === 'ValidationError') {
    status = 400;
    message = Object.values(err.errors).map((e) => e.message).join(' ');
  } else if (err.name === 'CastError') {
    status = 400;
    message = 'Invalid ID or value format.';
  } else if (err.code === 11000) {
    status = 409;
    message = 'A record with this value already exists.';
  }

  if (status === 500) console.error(err);
  res.status(status).json({ message });
};

module.exports = { notFound, errorHandler };
