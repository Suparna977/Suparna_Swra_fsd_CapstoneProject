// RULE-BASED RECOMMENDATION ENGINE
// Turns the gap (from analysis.js) into an ordered roadmap using the rules R1-R6.
// Also a pure module (no database), so it can be unit-tested with the worked example.
//
//  R1 Missing skill   -> add as "learn"
//  R2 Weak skill      -> add as "improve" up to the required level
//  R3 Prerequisite    -> a prerequisite is always placed before the skill that needs it
//  R4 Priority        -> inside a phase, the higher weight comes first
//  R5 Alternative     -> see findAlternativeRoles() in analysis.js
//  R6 Completion      -> a phase unlocks only when the previous phase is completed

/**
 * gapSkills: analysis skills with status 'weak' or 'missing', each carrying
 *            { skillId, name, category, tier, requiredLevel, currentLevel, weight, estWeeks, prerequisiteIds }
 * phaseNames: ['Foundation', 'Backend', 'Data & UI', 'Security']
 */
function buildRoadmap(gapSkills, phaseNames) {
  const inGap = new Set(gapSkills.map((s) => s.skillId));
  const placed = new Set();
  const ordered = [];

  const tiers = [...new Set(gapSkills.map((s) => s.tier))].sort((a, b) => a - b);

  for (const tier of tiers) {
    let remaining = gapSkills.filter((s) => s.tier === tier);

    while (remaining.length > 0) {
      // R3: only skills whose prerequisites (that are part of the gap) are already placed
      let ready = remaining.filter((s) => s.prerequisiteIds.every((p) => !inGap.has(p) || placed.has(p)));
      if (ready.length === 0) ready = remaining; // safety net against bad data (cycles)

      // R4: highest weight first (name breaks ties so the order is always the same)
      ready.sort((a, b) => b.weight - a.weight || a.name.localeCompare(b.name));
      const next = ready[0];

      ordered.push(next);
      placed.add(next.skillId);
      remaining = remaining.filter((s) => s !== next);
    }
  }

  const nameById = new Map(gapSkills.map((s) => [s.skillId, s.name]));
  const phaseCounts = {};
  ordered.forEach((s) => (phaseCounts[s.tier] = (phaseCounts[s.tier] || 0) + 1));

  return ordered.map((s, i) => {
    const prereqInRoadmap = s.prerequisiteIds.filter((p) => inGap.has(p));
    const rules = [s.currentLevel === 0 ? 'R1' : 'R2'];
    if (prereqInRoadmap.length > 0) rules.push('R3');
    if (phaseCounts[s.tier] > 1) rules.push('R4');

    return {
      seqNo: i + 1,
      skill: s.skillId,
      skillName: s.name,
      category: s.category,
      action: s.currentLevel === 0 ? 'learn' : 'improve',
      fromLevel: s.currentLevel,
      targetLevel: s.requiredLevel,
      phase: s.tier,
      phaseName: (phaseNames && phaseNames[s.tier - 1]) || `Phase ${s.tier}`,
      estWeeks: s.estWeeks,
      rules,
      prerequisites: prereqInRoadmap,
      prerequisiteNames: s.prerequisiteIds.map((p) => nameById.get(p)).filter(Boolean),
      status: 'not_started',
    };
  });
}

// R6 + R3: an item is locked until every earlier phase is completed
// and every prerequisite that is in the roadmap is completed.
function isLocked(item, items) {
  if (item.status === 'completed') return false;
  const done = (o) => o.status === 'completed';
  const earlierPhaseOpen = items.some((o) => o.phase < item.phase && !done(o));
  const prereqOpen = items.some((o) => item.prerequisites.map(String).includes(String(o.skill)) && !done(o));
  return earlierPhaseOpen || prereqOpen;
}

const MILESTONES = [25, 50, 75, 100];

function completionStats(items) {
  const total = items.length;
  const completed = items.filter((i) => i.status === 'completed').length;
  const completionPct = total === 0 ? 0 : Math.round((100 * completed) / total);
  return {
    total,
    completed,
    completionPct,
    totalWeeks: items.reduce((sum, i) => sum + (i.estWeeks || 0), 0),
    milestones: MILESTONES.map((pct) => ({ pct, reached: completionPct >= pct })),
  };
}

module.exports = { buildRoadmap, isLocked, completionStats };
