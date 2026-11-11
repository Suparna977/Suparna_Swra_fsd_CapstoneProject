// PROFILE ANALYSIS SERVICE
// A "pure" module: it only does maths on the data you give it. No database inside,
// so it is easy to test and easy to explain in a viva.

const LEVEL_LABELS = { 0: 'None', 1: 'Beginner', 2: 'Intermediate', 3: 'Advanced' };

/**
 * requirements: [{ skillId, name, category, tier, requiredLevel, weight }]
 * userLevels:   Map or plain object   skillId -> level (1..3). Missing = 0 (not known)
 */
function analyse(requirements, userLevels) {
  const levelOf = (id) => (userLevels instanceof Map ? userLevels.get(id) : userLevels[id]) || 0;

  let earned = 0;
  let totalWeight = 0;
  const skills = requirements.map((r) => {
    const current = levelOf(r.skillId);
    const ratio = Math.min(current, r.requiredLevel) / r.requiredLevel; // 0..1
    earned += r.weight * ratio;
    totalWeight += r.weight;

    let status = 'weak';
    if (current === 0) status = 'missing';
    else if (ratio === 1) status = 'strong';

    return { ...r, currentLevel: current, ratio, status };
  });

  const readiness = totalWeight === 0 ? 0 : (100 * earned) / totalWeight;

  // Category-wise score for the chart (same formula, per category)
  const byCat = {};
  for (const s of skills) {
    byCat[s.category] = byCat[s.category] || { earned: 0, total: 0 };
    byCat[s.category].earned += s.weight * s.ratio;
    byCat[s.category].total += s.weight;
  }
  const categoryScores = Object.entries(byCat).map(([category, v]) => ({
    category,
    pct: Math.round((100 * v.earned) / v.total),
  }));

  return {
    readinessPct: round1(readiness),
    counts: {
      strong: skills.filter((s) => s.status === 'strong').length,
      weak: skills.filter((s) => s.status === 'weak').length,
      missing: skills.filter((s) => s.status === 'missing').length,
    },
    skills,
    categoryScores,
  };
}

// Rule R5 - roles where the match is at least `threshold` percent.
// allRoles: [{ roleId, title, requirements }]
function findAlternativeRoles(allRoles, userLevels, excludeRoleId, threshold) {
  return allRoles
    .filter((r) => r.roleId !== String(excludeRoleId))
    .map((r) => ({ roleId: r.roleId, title: r.title, matchPct: analyse(r.requirements, userLevels).readinessPct }))
    .filter((r) => r.matchPct >= threshold)
    .sort((a, b) => b.matchPct - a.matchPct);
}

function round1(n) {
  return Math.round(n * 10) / 10;
}

module.exports = { analyse, findAlternativeRoles, LEVEL_LABELS };
