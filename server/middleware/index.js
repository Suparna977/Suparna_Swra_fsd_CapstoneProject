const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const config = require('../config');

// Lets us write "async (req, res) => {...}" routes without try/catch in every one.
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Protects private routes. The browser sends:  Authorization: Bearer <token>
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Please log in first.' });

  try {
    const payload = jwt.verify(token, config.jwtSecret);
    req.user = { id: payload.id, role: payload.role };
    next();
  } catch {
    res.status(401).json({ message: 'Your session has expired. Please log in again.' });
  }
}

// For admin-only routes (role-based access control)
const requireRole = (role) => (req, res, next) =>
  req.user && req.user.role === role ? next() : res.status(403).json({ message: 'You are not allowed to do this.' });

// Used after express-validator checks: stops the request if any input is invalid.
function validate(req, res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) return next();
  res.status(400).json({ message: result.array()[0].msg, errors: result.array().map((e) => ({ field: e.path, message: e.msg })) });
}

// Central error handler: one place that turns any error into a clean JSON reply.
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err.name === 'CastError') return res.status(400).json({ message: 'That id is not valid.' });
  if (err.code === 11000) return res.status(409).json({ message: 'That already exists.' });
  if (!config.isTest) console.error(err);
  res.status(err.status || 500).json({ message: err.status ? err.message : 'Something went wrong on the server.' });
}

module.exports = { asyncHandler, requireAuth, requireRole, validate, errorHandler };
