// Small helpers that read from MongoDB and shape the data for the pure services.
const { JobRole, RoleSkill, UserSkill } = require('../models');

function toRequirement(rs) {
  return {
    skillId: String(rs.skill._id),
    name: rs.skill.name,
    category: rs.skill.category,
    tier: rs.skill.tier,
    estWeeks: rs.skill.estWeeks,
    prerequisiteIds: rs.skill.prerequisites.map(String),
    requiredLevel: rs.requiredLevel,
    weight: rs.weight,
  };
}

// One role + its required skills. Returns null if the role does not exist.
async function loadRole(roleId) {
  const role = await JobRole.findById(roleId);
  if (!role) return null;
  const rows = await RoleSkill.find({ role: role._id }).populate('skill');
  return { role, requirements: rows.map(toRequirement) };
}

// Every role with its required skills (used for "alternative career paths")
async function loadAllRoles() {
  const roles = await JobRole.find().sort('title');
  const rows = await RoleSkill.find().populate('skill');
  return roles.map((role) => ({
    roleId: String(role._id),
    title: role.title,
    role,
    requirements: rows.filter((r) => String(r.role) === String(role._id)).map(toRequirement),
  }));
}

// The student's current levels as a Map: skillId -> level
async function loadUserLevels(userId) {
  const rows = await UserSkill.find({ user: userId });
  return new Map(rows.map((r) => [String(r.skill), r.level]));
}

module.exports = { loadRole, loadAllRoles, loadUserLevels };
