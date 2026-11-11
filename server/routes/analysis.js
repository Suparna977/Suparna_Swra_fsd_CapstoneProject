// POST /api/analysis  { roleId }  -> skill-gap report for one goal role
const express = require('express');
const { body } = require('express-validator');
const config = require('../config');
const { asyncHandler, requireAuth, validate } = require('../middleware');
const { loadRole, loadAllRoles, loadUserLevels } = require('../services/loaders');
const { analyse, findAlternativeRoles } = require('../services/analysis');

const router = express.Router();
router.use(requireAuth);

router.post(
  '/',
  [body('roleId').isMongoId().withMessage('Choose a goal role.')],
  validate,
  asyncHandler(async (req, res) => {
    const loaded = await loadRole(req.body.roleId);
    if (!loaded) return res.status(404).json({ message: 'Role not found.' });

    const levels = await loadUserLevels(req.user.id);
    const result = analyse(loaded.requirements, levels);
    const alternatives = findAlternativeRoles(await loadAllRoles(), levels, loaded.role._id, config.alternativeRoleThreshold);

    res.json({
      role: { id: loaded.role._id, title: loaded.role.title, domain: loaded.role.domain, description: loaded.role.description },
      ...result,
      alternatives,
    });
  })
);

module.exports = router;
