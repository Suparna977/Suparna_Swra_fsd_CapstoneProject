// Read-only lists: the skill catalogue and the role catalogue.
const express = require('express');
const { Skill, JobRole, RoleSkill } = require('../models');
const { asyncHandler, requireAuth } = require('../middleware');
const { loadRole, loadUserLevels } = require('../services/loaders');

const router = express.Router();
router.use(requireAuth);

// GET /api/skills?q=rea   (search by name)
router.get(
  '/skills',
  asyncHandler(async (req, res) => {
    const q = String(req.query.q || '').trim();
    const filter = q ? { name: new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') } : {};
    const skills = await Skill.find(filter).sort('category name');
    res.json({ skills: skills.map((s) => ({ id: s._id, name: s.name, category: s.category, tier: s.tier })) });
  })
);

// GET /api/roles
router.get(
  '/roles',
  asyncHandler(async (req, res) => {
    const [roles, counts] = await Promise.all([
      JobRole.find().sort('title'),
      RoleSkill.aggregate([{ $group: { _id: '$role', skillCount: { $sum: 1 } } }]),
    ]);
    const countById = new Map(counts.map((c) => [String(c._id), c.skillCount]));
    res.json({
      roles: roles.map((r) => ({
        id: r._id,
        title: r.title,
        domain: r.domain,
        description: r.description,
        skillCount: countById.get(String(r._id)) || 0,
      })),
    });
  })
);

// GET /api/roles/:id   -> required skills, plus the student's current level for each
router.get(
  '/roles/:id',
  asyncHandler(async (req, res) => {
    const loaded = await loadRole(req.params.id);
    if (!loaded) return res.status(404).json({ message: 'Role not found.' });
    const levels = await loadUserLevels(req.user.id);
    const { role, requirements } = loaded;
    res.json({
      role: { id: role._id, title: role.title, domain: role.domain, description: role.description },
      requirements: requirements.map((r) => ({
        skillId: r.skillId,
        name: r.name,
        category: r.category,
        requiredLevel: r.requiredLevel,
        weight: r.weight,
        currentLevel: levels.get(r.skillId) || 0,
      })),
    });
  })
);

module.exports = router;
