// The student's profile and skill list (all routes need a login).
const express = require('express');
const { body, param } = require('express-validator');
const { User, Skill, UserSkill } = require('../models');
const { asyncHandler, requireAuth, validate } = require('../middleware');

const router = express.Router();
router.use(requireAuth);

const levelRule = body('level').isInt({ min: 1, max: 3 }).withMessage('Level must be 1, 2 or 3.').toInt();

async function skillList(userId) {
  const rows = await UserSkill.find({ user: userId }).populate('skill').sort('-updatedAt');
  return rows.map((r) => ({
    skillId: r.skill._id,
    name: r.skill.name,
    category: r.skill.category,
    level: r.level,
    updatedAt: r.updatedAt,
  }));
}

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id);
    res.json({
      user: { id: user._id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt },
      skills: await skillList(user._id),
    });
  })
);

router.put(
  '/',
  [body('name').trim().isLength({ min: 2, max: 60 }).withMessage('Name must be 2 to 60 characters.')],
  validate,
  asyncHandler(async (req, res) => {
    const user = await User.findByIdAndUpdate(req.user.id, { name: req.body.name }, { new: true });
    res.json({ user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  })
);

// Add a skill (or change its level if it is already in the profile)
router.post(
  '/skills',
  [body('skillId').isMongoId().withMessage('Choose a skill.'), levelRule],
  validate,
  asyncHandler(async (req, res) => {
    if (!(await Skill.exists({ _id: req.body.skillId }))) return res.status(404).json({ message: 'Skill not found.' });
    await UserSkill.findOneAndUpdate(
      { user: req.user.id, skill: req.body.skillId },
      { $set: { level: req.body.level, updatedAt: new Date() } },
      { upsert: true }
    );
    res.status(201).json({ skills: await skillList(req.user.id) });
  })
);

router.put(
  '/skills/:skillId',
  [param('skillId').isMongoId(), levelRule],
  validate,
  asyncHandler(async (req, res) => {
    const row = await UserSkill.findOneAndUpdate(
      { user: req.user.id, skill: req.params.skillId },
      { $set: { level: req.body.level, updatedAt: new Date() } }
    );
    if (!row) return res.status(404).json({ message: 'That skill is not in your profile.' });
    res.json({ skills: await skillList(req.user.id) });
  })
);

router.delete(
  '/skills/:skillId',
  [param('skillId').isMongoId()],
  validate,
  asyncHandler(async (req, res) => {
    await UserSkill.deleteOne({ user: req.user.id, skill: req.params.skillId });
    res.json({ skills: await skillList(req.user.id) });
  })
);

module.exports = router;
