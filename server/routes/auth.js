// Sign up / log in. Passwords are stored only as bcrypt hashes; login returns a JWT.
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body } = require('express-validator');
const config = require('../config');
const { User } = require('../models');
const { asyncHandler, requireAuth, validate } = require('../middleware');

const router = express.Router();

const publicUser = (u) => ({ id: u._id, name: u.name, email: u.email, role: u.role });
const makeToken = (u) => jwt.sign({ id: u._id, role: u.role }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });

router.post(
  '/register',
  [
    body('name').trim().isLength({ min: 2, max: 60 }).withMessage('Name must be 2 to 60 characters.'),
    body('email').trim().toLowerCase().isEmail().withMessage('Enter a valid email address.'),
    body('password').isLength({ min: 8, max: 72 }).withMessage('Password must be 8 to 72 characters.'),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { name, email, password } = req.body;

    if (await User.findOne({ email })) {
      return res.status(409).json({ message: 'An account with this email already exists. Try logging in.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, passwordHash });
    res.status(201).json({ token: makeToken(user), user: publicUser(user) });
  })
);

router.post(
  '/login',
  [
    body('email').trim().toLowerCase().isEmail().withMessage('Enter a valid email address.'),
    body('password').notEmpty().withMessage('Enter your password.'),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    // Same message for "no such email" and "wrong password" so attackers learn nothing.
    const ok = user && (await bcrypt.compare(password, user.passwordHash));
    if (!ok) return res.status(401).json({ message: 'Email or password is incorrect.' });

    res.json({ token: makeToken(user), user: publicUser(user) });
  })
);

// Used by the frontend on page load to check the saved token is still valid.
router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(401).json({ message: 'Account not found. Please log in again.' });
    res.json({ user: publicUser(user) });
  })
);

module.exports = router;
