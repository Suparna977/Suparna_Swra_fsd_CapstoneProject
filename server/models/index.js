// All database collections (MongoDB) in one file. Each Schema describes the shape of one collection.
const mongoose = require('mongoose');
const { Schema } = mongoose;
const ObjectId = Schema.Types.ObjectId;

// users: accounts and access control
const userSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 60 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true }, // never the real password
  role: { type: String, enum: ['student', 'admin'], default: 'student' },
  createdAt: { type: Date, default: Date.now },
});

// skills: skill catalogue + prerequisite graph
const skillSchema = new Schema({
  name: { type: String, required: true, unique: true },
  category: { type: String, required: true },
  tier: { type: Number, min: 1, max: 4, required: true }, // 1-4 = the roadmap phase
  estWeeks: { type: Number, default: 1 }, // time needed to learn it
  prerequisites: [{ type: ObjectId, ref: 'Skill' }],
});

// jobroles: goal roles offered to students
const jobRoleSchema = new Schema({
  title: { type: String, required: true, unique: true },
  domain: { type: String, required: true },
  description: { type: String, default: '' },
  phaseNames: { type: [String], default: ['Foundation', 'Core', 'Applied', 'Advanced'] },
});

// roleskills: what each role requires (level 1-3) and how important it is (weight)
const roleSkillSchema = new Schema({
  role: { type: ObjectId, ref: 'JobRole', required: true },
  skill: { type: ObjectId, ref: 'Skill', required: true },
  requiredLevel: { type: Number, min: 1, max: 3, required: true },
  weight: { type: Number, min: 1, max: 5, required: true },
});
roleSkillSchema.index({ role: 1, skill: 1 }, { unique: true });

// userskills: the student's skill profile
const userSkillSchema = new Schema({
  user: { type: ObjectId, ref: 'User', required: true },
  skill: { type: ObjectId, ref: 'Skill', required: true },
  level: { type: Number, min: 1, max: 3, required: true },
  updatedAt: { type: Date, default: Date.now },
});
userSkillSchema.index({ user: 1, skill: 1 }, { unique: true });

// roadmaps: generated plan. The items live inside the roadmap document.
const roadmapItemSchema = new Schema({
  seqNo: Number,
  skill: { type: ObjectId, ref: 'Skill' },
  skillName: String,
  category: String,
  action: { type: String, enum: ['learn', 'improve'] },
  fromLevel: Number,
  targetLevel: Number,
  phase: Number,
  phaseName: String,
  estWeeks: Number,
  rules: [String],
  prerequisites: [{ type: ObjectId, ref: 'Skill' }], // only the ones that are also in this roadmap
  prerequisiteNames: [String],
  status: { type: String, enum: ['not_started', 'in_progress', 'completed'], default: 'not_started' },
  completedAt: Date,
});

const roadmapSchema = new Schema({
  user: { type: ObjectId, ref: 'User', required: true },
  role: { type: ObjectId, ref: 'JobRole', required: true },
  roleTitle: String,
  startReadinessPct: Number,
  readinessPct: Number,
  status: { type: String, enum: ['active', 'completed', 'archived'], default: 'active' },
  createdAt: { type: Date, default: Date.now },
  history: [{ date: { type: Date, default: Date.now }, readinessPct: Number }], // for the trend chart
  items: [roadmapItemSchema],
});

// resources: learning links for each skill
const resourceSchema = new Schema({
  skill: { type: ObjectId, ref: 'Skill', required: true },
  title: { type: String, required: true },
  type: { type: String, enum: ['docs', 'video', 'course', 'article'], default: 'docs' },
  url: { type: String, required: true },
});

module.exports = {
  User: mongoose.model('User', userSchema),
  Skill: mongoose.model('Skill', skillSchema),
  JobRole: mongoose.model('JobRole', jobRoleSchema),
  RoleSkill: mongoose.model('RoleSkill', roleSkillSchema),
  UserSkill: mongoose.model('UserSkill', userSkillSchema),
  Roadmap: mongoose.model('Roadmap', roadmapSchema),
  Resource: mongoose.model('Resource', resourceSchema),
};
