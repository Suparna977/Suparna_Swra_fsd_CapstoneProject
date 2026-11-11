// GET /api/dashboard -> everything the dashboard page needs in one request
const express = require('express');
const { Roadmap, UserSkill, User } = require('../models');
const { asyncHandler, requireAuth } = require('../middleware');
const { loadRole, loadUserLevels } = require('../services/loaders');
const { analyse } = require('../services/analysis');
const { formatRoadmap } = require('./roadmap');

const router = express.Router();
router.use(requireAuth);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const [user, skillCount, roadmap] = await Promise.all([
      User.findById(req.user.id),
      UserSkill.countDocuments({ user: req.user.id }),
      Roadmap.findOne({ user: req.user.id, status: { $in: ['active', 'completed'] } }).sort('-createdAt'),
    ]);

    const out = { user: { name: user.name }, skillCount, roadmap: null, analysis: null, nextItem: null };

    if (roadmap) {
      const formatted = await formatRoadmap(roadmap);
      const loaded = await loadRole(roadmap.role);
      const live = analyse(loaded.requirements, await loadUserLevels(req.user.id));

      out.roadmap = formatted;
      out.analysis = { counts: live.counts, categoryScores: live.categoryScores };
      // "Next step" = first item that is not completed and not locked
      out.nextItem = formatted.items.find((i) => i.status !== 'completed' && !i.locked) || null;
    }

    res.json(out);
  })
);

module.exports = router;
