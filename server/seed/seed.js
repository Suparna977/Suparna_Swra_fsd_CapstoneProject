// Loads the knowledge base from data.js into MongoDB. Safe to run many times:
// it updates existing records instead of creating duplicates.
const { Skill, JobRole, RoleSkill, Resource } = require('../models');
const data = require('./data');

async function seedDatabase() {
  // 1. skills (without prerequisites first, because they point to other skills)
  for (const s of data.skills) {
    await Skill.updateOne(
      { name: s.name },
      { $set: { category: s.category, tier: s.tier, estWeeks: s.estWeeks } },
      { upsert: true }
    );
  }
  const skillDocs = await Skill.find();
  const idByName = new Map(skillDocs.map((s) => [s.name, s._id]));

  // 2. prerequisites
  for (const s of data.skills) {
    await Skill.updateOne({ name: s.name }, { $set: { prerequisites: s.prerequisites.map((n) => idByName.get(n)) } });
  }

  // 3. roles and what each one requires
  for (const r of data.roles) {
    const role = await JobRole.findOneAndUpdate(
      { title: r.title },
      { $set: { domain: r.domain, description: r.description, phaseNames: r.phaseNames } },
      { upsert: true, new: true }
    );
    await RoleSkill.deleteMany({ role: role._id });
    await RoleSkill.insertMany(
      r.requirements.map((q) => ({ role: role._id, skill: idByName.get(q.skill), requiredLevel: q.level, weight: q.weight }))
    );
  }

  // 4. learning resources
  await Resource.deleteMany({});
  await Resource.insertMany(data.resources.map((x) => ({ ...x, skill: idByName.get(x.skill) })));
}

module.exports = { seedDatabase };
