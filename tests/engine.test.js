// Unit tests for the Profile Analysis Service and the rule engine.
// They use the WORKED EXAMPLE from the synopsis (Section 6.5), and need no database.
const { skills, roles } = require('../server/seed/data');
const { analyse, findAlternativeRoles } = require('../server/services/analysis');
const { buildRoadmap, isLocked, completionStats } = require('../server/services/recommendation');

// Build the "requirements" list for a role from the seed data. Skill names are used as ids here.
const byName = Object.fromEntries(skills.map((s) => [s.name, s]));
function requirementsOf(title) {
  return roles
    .find((r) => r.title === title)
    .requirements.map((q) => ({
      skillId: q.skill,
      name: q.skill,
      category: byName[q.skill].category,
      tier: byName[q.skill].tier,
      estWeeks: byName[q.skill].estWeeks,
      prerequisiteIds: byName[q.skill].prerequisites,
      requiredLevel: q.level,
      weight: q.weight,
    }));
}

// The sample student from Table 4
const student = { HTML: 3, CSS: 2, JavaScript: 2, 'Node.js': 1, Git: 2, 'REST APIs': 1 };
const fullStack = requirementsOf('Full Stack Developer');
const phaseNames = roles.find((r) => r.title === 'Full Stack Developer').phaseNames;

describe('Profile Analysis Service (Table 4)', () => {
  const result = analyse(fullStack, student);

  test('readiness is 40%', () => expect(Math.round(result.readinessPct)).toBe(40));
  test('3 strong, 3 weak, 4 missing', () => expect(result.counts).toEqual({ strong: 3, weak: 3, missing: 4 }));

  test('each skill is classified correctly', () => {
    const status = Object.fromEntries(result.skills.map((s) => [s.name, s.status]));
    expect(status).toMatchObject({
      HTML: 'strong', CSS: 'strong', Git: 'strong',
      JavaScript: 'weak', 'Node.js': 'weak', 'REST APIs': 'weak',
      React: 'missing', 'Express.js': 'missing', MongoDB: 'missing', 'JWT Auth': 'missing',
    });
  });

  test('a student above the requirement is capped at 100%', () => {
    const everything = Object.fromEntries(fullStack.map((r) => [r.skillId, 3]));
    expect(analyse(fullStack, everything).readinessPct).toBe(100);
  });

  test('a student with no skills scores 0%', () => expect(analyse(fullStack, {}).readinessPct).toBe(0));
});

describe('Rule-based recommendation engine (Table 5)', () => {
  const gaps = analyse(fullStack, student).skills.filter((s) => s.status !== 'strong');
  const roadmap = buildRoadmap(gaps, phaseNames);

  test('order respects prerequisites (R3) and weight (R4)', () => {
    expect(roadmap.map((i) => i.skillName)).toEqual([
      'JavaScript', 'Node.js', 'Express.js', 'REST APIs', 'React', 'MongoDB', 'JWT Auth',
    ]);
  });

  test('R1 learn / R2 improve', () => {
    const actions = Object.fromEntries(roadmap.map((i) => [i.skillName, i.action]));
    expect(actions).toEqual({
      JavaScript: 'improve', 'Node.js': 'improve', 'Express.js': 'learn',
      'REST APIs': 'improve', React: 'learn', MongoDB: 'learn', 'JWT Auth': 'learn',
    });
  });

  test('phases follow the skill tier', () => {
    expect(roadmap.map((i) => i.phase)).toEqual([1, 2, 2, 2, 3, 3, 4]);
    expect(roadmap[0].phaseName).toBe('Foundation');
    expect(roadmap[6].phaseName).toBe('Security');
  });

  test('total duration is 12 weeks', () => expect(completionStats(roadmap).totalWeeks).toBe(12));

  test('readiness becomes 52% after completing items 1 and 2', () => {
    const after = { ...student, JavaScript: 3, 'Node.js': 3 };
    expect(Math.round(analyse(fullStack, after).readinessPct)).toBe(52);
  });

  test('R5: alternative roles with at least 50% match', () => {
    const all = roles.map((r) => ({ roleId: r.title, title: r.title, requirements: requirementsOf(r.title) }));
    const alts = findAlternativeRoles(all, student, 'Full Stack Developer', 50);
    expect(alts.map((a) => [a.title, Math.round(a.matchPct)])).toEqual([
      ['Frontend Developer', 54],
      ['Web Designer', 52],
    ]);
  });

  test('R3/R6: locked until earlier items are completed', () => {
    const items = roadmap.map((i) => ({ ...i, status: 'not_started' }));
    expect(isLocked(items[0], items)).toBe(false); // JavaScript
    expect(isLocked(items[1], items)).toBe(true); // Node.js needs JavaScript
    items[0].status = 'completed';
    expect(isLocked(items[1], items)).toBe(false);
    expect(isLocked(items[2], items)).toBe(true); // Express.js needs Node.js
    expect(isLocked(items[4], items)).toBe(true); // React: phase 2 still open (R6)
  });

  test('milestones at 25/50/75/100%', () => {
    const items = roadmap.map((i, n) => ({ ...i, status: n < 4 ? 'completed' : 'not_started' }));
    const stats = completionStats(items); // 4 of 7 = 57%
    expect(stats.completionPct).toBe(57);
    expect(stats.milestones.map((m) => m.reached)).toEqual([true, true, false, false]);
  });
});

describe('Seed data sanity', () => {
  test('every prerequisite exists and is not in a later phase than the skill', () => {
    for (const s of skills) {
      for (const p of s.prerequisites) {
        expect(byName[p]).toBeDefined();
        expect(byName[p].tier).toBeLessThanOrEqual(s.tier);
      }
    }
  });

  test('every role requirement points to a real skill', () => {
    for (const r of roles) for (const q of r.requirements) expect(byName[q.skill]).toBeDefined();
  });
});
