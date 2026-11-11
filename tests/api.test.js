// API tests: sign up, log in, protected routes, saving data, roadmap and progress.
// They run against a temporary in-memory MongoDB (downloaded automatically the first time).
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let app;
let seedDatabase;

beforeAll(async () => {
  const uri = process.env.TEST_MONGO_URI || (mongod = await MongoMemoryServer.create()).getUri();
  await mongoose.connect(uri);
  await mongoose.connection.dropDatabase();
  app = require('../server/app');
  ({ seedDatabase } = require('../server/seed/seed'));
  await seedDatabase();
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
});

const auth = (token) => ({ Authorization: `Bearer ${token}` });

describe('Authentication', () => {
  const user = { name: 'Test Student', email: 'Test@Example.com', password: 'password123' };

  test('register creates an account and returns a token', async () => {
    const res = await request(app).post('/api/auth/register').send(user);
    expect(res.status).toBe(201);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user.email).toBe('test@example.com'); // lower-cased
    expect(res.body.user.passwordHash).toBeUndefined(); // never sent back
  });

  test('duplicate email is rejected', async () => {
    const res = await request(app).post('/api/auth/register').send(user);
    expect(res.status).toBe(409);
  });

  test('short password and bad email are rejected', async () => {
    expect((await request(app).post('/api/auth/register').send({ ...user, email: 'x@y.com', password: '123' })).status).toBe(400);
    expect((await request(app).post('/api/auth/register').send({ ...user, email: 'not-an-email' })).status).toBe(400);
  });

  test('login works with the right password only', async () => {
    const ok = await request(app).post('/api/auth/login').send({ email: 'test@example.com', password: 'password123' });
    expect(ok.status).toBe(200);
    expect(ok.body.token).toBeTruthy();
    const bad = await request(app).post('/api/auth/login').send({ email: 'test@example.com', password: 'wrong-password' });
    expect(bad.status).toBe(401);
  });

  test('protected routes need a valid token', async () => {
    expect((await request(app).get('/api/dashboard')).status).toBe(401);
    expect((await request(app).get('/api/dashboard').set(auth('garbage'))).status).toBe(401);
    const login = await request(app).post('/api/auth/login').send({ email: 'test@example.com', password: 'password123' });
    expect((await request(app).get('/api/auth/me').set(auth(login.body.token))).body.user.name).toBe('Test Student');
  });
});

describe('Full flow: skills -> analysis -> roadmap -> progress', () => {
  let token;
  let otherToken;
  let ids; // skill name -> id
  let fullStackId;
  let roadmap;

  beforeAll(async () => {
    token = (await request(app).post('/api/auth/register').send({ name: 'Flow Student', email: 'flow@example.com', password: 'password123' })).body.token;
    otherToken = (await request(app).post('/api/auth/register').send({ name: 'Other Student', email: 'other@example.com', password: 'password123' })).body.token;
    const skills = (await request(app).get('/api/skills').set(auth(token))).body.skills;
    ids = Object.fromEntries(skills.map((s) => [s.name, s.id]));
    const roles = (await request(app).get('/api/roles').set(auth(token))).body.roles;
    fullStackId = roles.find((r) => r.title === 'Full Stack Developer').id;
    expect(roles).toHaveLength(6);
  });

  test('skills are saved in the database and can be edited and removed', async () => {
    const sample = { HTML: 3, CSS: 2, JavaScript: 2, 'Node.js': 1, Git: 2, 'REST APIs': 1 };
    for (const [name, level] of Object.entries(sample)) {
      const res = await request(app).post('/api/profile/skills').set(auth(token)).send({ skillId: ids[name], level });
      expect(res.status).toBe(201);
    }
    let profile = (await request(app).get('/api/profile').set(auth(token))).body;
    expect(profile.skills).toHaveLength(6);

    await request(app).put(`/api/profile/skills/${ids.Git}`).set(auth(token)).send({ level: 3 });
    await request(app).delete(`/api/profile/skills/${ids.Git}`).set(auth(token));
    await request(app).post('/api/profile/skills').set(auth(token)).send({ skillId: ids.Git, level: 2 });
    profile = (await request(app).get('/api/profile').set(auth(token))).body;
    expect(profile.skills.find((s) => s.name === 'Git').level).toBe(2);

    expect((await request(app).post('/api/profile/skills').set(auth(token)).send({ skillId: ids.Git, level: 9 })).status).toBe(400);
  });

  test("one student cannot see another student's skills", async () => {
    const other = (await request(app).get('/api/profile').set(auth(otherToken))).body;
    expect(other.skills).toHaveLength(0);
  });

  test('analysis matches the worked example (40%)', async () => {
    const res = await request(app).post('/api/analysis').set(auth(token)).send({ roleId: fullStackId });
    expect(res.status).toBe(200);
    expect(Math.round(res.body.readinessPct)).toBe(40);
    expect(res.body.counts).toEqual({ strong: 3, weak: 3, missing: 4 });
    expect(res.body.alternatives.map((a) => a.title)).toEqual(['Frontend Developer', 'Web Designer']);
  });

  test('roadmap is generated and saved', async () => {
    const res = await request(app).post('/api/roadmap/generate').set(auth(token)).send({ roleId: fullStackId });
    expect(res.status).toBe(201);
    roadmap = res.body.roadmap;
    expect(roadmap.items.map((i) => i.skillName)).toEqual(['JavaScript', 'Node.js', 'Express.js', 'REST APIs', 'React', 'MongoDB', 'JWT Auth']);
    expect(roadmap.totalWeeks).toBe(12);
    expect(roadmap.items[0].locked).toBe(false);
    expect(roadmap.items[1].locked).toBe(true);
    expect(roadmap.items[0].resources.length).toBeGreaterThan(0);

    const again = (await request(app).get('/api/roadmap').set(auth(token))).body.roadmap;
    expect(again.id).toBe(roadmap.id); // it is really stored
  });

  test('locked items and other students are refused', async () => {
    const locked = await request(app).patch(`/api/progress/${roadmap.items[1].id}`).set(auth(token)).send({ status: 'in_progress' });
    expect(locked.status).toBe(400);
    const stranger = await request(app).patch(`/api/progress/${roadmap.items[0].id}`).set(auth(otherToken)).send({ status: 'completed' });
    expect(stranger.status).toBe(404);
  });

  test('completing items raises skill levels and readiness (40% -> 52%)', async () => {
    let res = await request(app).patch(`/api/progress/${roadmap.items[0].id}`).set(auth(token)).send({ status: 'in_progress' });
    expect(res.body.roadmap.items[0].status).toBe('in_progress');

    res = await request(app).patch(`/api/progress/${roadmap.items[0].id}`).set(auth(token)).send({ status: 'completed' });
    expect(res.status).toBe(200);
    expect(res.body.roadmap.items[1].locked).toBe(false); // Node.js unlocked

    res = await request(app).patch(`/api/progress/${roadmap.items[1].id}`).set(auth(token)).send({ status: 'completed' });
    expect(Math.round(res.body.roadmap.readinessPct)).toBe(52);
    expect(res.body.roadmap.completed).toBe(2);
    expect(res.body.roadmap.history).toHaveLength(3);

    const profile = (await request(app).get('/api/profile').set(auth(token))).body;
    expect(profile.skills.find((s) => s.name === 'JavaScript').level).toBe(3);

    const redo = await request(app).patch(`/api/progress/${roadmap.items[0].id}`).set(auth(token)).send({ status: 'not_started' });
    expect(redo.status).toBe(400); // completed items stay completed
  });

  test('dashboard summarises everything', async () => {
    const res = await request(app).get('/api/dashboard').set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.skillCount).toBe(6); // JavaScript and Node.js were already in the profile (levels raised only)
    expect(res.body.roadmap.completionPct).toBe(29);
    expect(res.body.nextItem.skillName).toBe('Express.js');
    expect(res.body.analysis.categoryScores.length).toBeGreaterThan(0);
  });

  test('a new roadmap archives the old one', async () => {
    const roles = (await request(app).get('/api/roles').set(auth(token))).body.roles;
    const frontendId = roles.find((r) => r.title === 'Frontend Developer').id;
    const res = await request(app).post('/api/roadmap/generate').set(auth(token)).send({ roleId: frontendId });
    expect(res.status).toBe(201);
    expect(res.body.roadmap.role.title).toBe('Frontend Developer');
    const current = (await request(app).get('/api/roadmap').set(auth(token))).body.roadmap;
    expect(current.role.title).toBe('Frontend Developer');
  });
});
