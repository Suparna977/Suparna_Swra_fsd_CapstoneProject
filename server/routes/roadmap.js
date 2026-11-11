// Roadmap generation (rule engine) and progress tracking.
const express = require('express');
const { body, param } = require('express-validator');
const { Roadmap, UserSkill, Resource } = require('../models');
const { asyncHandler, requireAuth, validate } = require('../middleware');
const { loadRole, loadUserLevels } = require('../services/loaders');
const { analyse } = require('../services/analysis');
const { buildRoadmap, isLocked, completionStats } = require('../services/recommendation');

const roadmapRouter = express.Router();
const progressRouter = express.Router();
roadmapRouter.use(requireAuth);
progressRouter.use(requireAuth);

// Shape a roadmap for the frontend: adds "locked" per item, resources and progress numbers.
async function formatRoadmap(roadmap) {
  const resources = await Resource.find({ skill: { $in: roadmap.items.map((i) => i.skill) } });
  const items = roadmap.items.map((i) => ({
    id: i._id,
    seqNo: i.seqNo,
    skillName: i.skillName,
    category: i.category,
    action: i.action,
    fromLevel: i.fromLevel,
    targetLevel: i.targetLevel,
    phase: i.phase,
    phaseName: i.phaseName,
    estWeeks: i.estWeeks,
    rules: i.rules,
    prerequisiteNames: i.prerequisiteNames,
    status: i.status,
    locked: isLocked(i, roadmap.items),
    completedAt: i.completedAt,
    resources: resources
      .filter((r) => String(r.skill) === String(i.skill))
      .map((r) => ({ id: r._id, title: r.title, type: r.type, url: r.url })),
  }));
  return {
    id: roadmap._id,
    role: { id: roadmap.role, title: roadmap.roleTitle },
    status: roadmap.status,
    startReadinessPct: roadmap.startReadinessPct,
    readinessPct: roadmap.readinessPct,
    createdAt: roadmap.createdAt,
    history: roadmap.history.map((h) => ({ date: h.date, readinessPct: h.readinessPct })),
    ...completionStats(roadmap.items),
    items,
  };
}

// POST /api/roadmap/generate { roleId }
roadmapRouter.post(
  '/generate',
  [body('roleId').isMongoId().withMessage('Choose a goal role.')],
  validate,
  asyncHandler(async (req, res) => {
    const loaded = await loadRole(req.body.roleId);
    if (!loaded) return res.status(404).json({ message: 'Role not found.' });

    const levels = await loadUserLevels(req.user.id);
    const result = analyse(loaded.requirements, levels);
    const gaps = result.skills.filter((s) => s.status !== 'strong');
    if (gaps.length === 0) {
      return res.status(400).json({ message: `You already meet every requirement for ${loaded.role.title}. Nothing to learn!` });
    }

    // Only one active roadmap per student: the old one is kept but archived.
    await Roadmap.updateMany({ user: req.user.id, status: 'active' }, { $set: { status: 'archived' } });

    const roadmap = await Roadmap.create({
      user: req.user.id,
      role: loaded.role._id,
      roleTitle: loaded.role.title,
      startReadinessPct: result.readinessPct,
      readinessPct: result.readinessPct,
      history: [{ date: new Date(), readinessPct: result.readinessPct }],
      items: buildRoadmap(gaps, loaded.role.phaseNames),
    });

    res.status(201).json({ roadmap: await formatRoadmap(roadmap) });
  })
);

// GET /api/roadmap   -> the active roadmap (or null)
roadmapRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const roadmap = await Roadmap.findOne({ user: req.user.id, status: { $in: ['active', 'completed'] } }).sort('-createdAt');
    res.json({ roadmap: roadmap ? await formatRoadmap(roadmap) : null });
  })
);

// PATCH /api/progress/:itemId { status }
// Allowed moves: not_started -> in_progress -> completed (and back to not_started before completing)
const ALLOWED = {
  not_started: ['in_progress', 'completed'],
  in_progress: ['not_started', 'completed'],
  completed: [],
};

progressRouter.patch(
  '/:itemId',
  [
    param('itemId').isMongoId(),
    body('status').isIn(['not_started', 'in_progress', 'completed']).withMessage('Invalid status.'),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const roadmap = await Roadmap.findOne({ user: req.user.id, 'items._id': req.params.itemId });
    if (!roadmap) return res.status(404).json({ message: 'Roadmap item not found.' });

    const item = roadmap.items.id(req.params.itemId);
    const next = req.body.status;

    if (roadmap.status === 'archived') return res.status(400).json({ message: 'This roadmap is archived. Open your current roadmap.' });
    if (isLocked(item, roadmap.items)) return res.status(400).json({ message: 'Finish the earlier items first. This one is locked.' });
    if (!ALLOWED[item.status].includes(next)) {
      return res.status(400).json({ message: item.status === 'completed' ? 'Completed items cannot be changed.' : 'That status change is not allowed.' });
    }

    item.status = next;

    if (next === 'completed') {
      item.completedAt = new Date();

      // Raise the student's stored level for this skill (never lowers it)
      const existing = await UserSkill.findOne({ user: req.user.id, skill: item.skill });
      if (!existing || existing.level < item.targetLevel) {
        await UserSkill.findOneAndUpdate(
          { user: req.user.id, skill: item.skill },
          { $set: { level: item.targetLevel, updatedAt: new Date() } },
          { upsert: true }
        );
      }

      // Recalculate readiness with the Profile Analysis Service
      const loaded = await loadRole(roadmap.role);
      const result = analyse(loaded.requirements, await loadUserLevels(req.user.id));
      roadmap.readinessPct = result.readinessPct;
      roadmap.history.push({ date: new Date(), readinessPct: result.readinessPct });

      if (roadmap.items.every((i) => i.status === 'completed')) roadmap.status = 'completed';
    }

    await roadmap.save();
    res.json({ roadmap: await formatRoadmap(roadmap) });
  })
);

module.exports = { roadmapRouter, progressRouter, formatRoadmap };
