# Skill Gap Analyzer & Career Path Recommender

Capstone project for 24CSP-337 Full Stack-II. A student signs up, records the skills they have, picks a goal role, and gets a skill-gap report, a readiness score and an ordered learning roadmap. They tick off roadmap steps and watch the score rise.

**Stack:** React (Vite) + Node/Express + MongoDB (Mongoose). JWT login, passwords hashed with bcrypt.

**One server, one website address.** Express serves the API *and* the built React app, so you deploy once and share one link.

---

## 1. Run it on your computer

You need: [Node.js](https://nodejs.org) (LTS version) and a MongoDB database. The easiest database is a free MongoDB Atlas cluster (set up in step 3 below). The same one works on your computer and online, so do that first.

Open a terminal in this folder (in VS Code: Terminal > New Terminal), then:

```
npm install
npm install --prefix client
copy .env.example .env        (Mac/Linux: cp .env.example .env)
```

Open the new `.env` file and paste your Atlas connection string after `MONGODB_URI=`. Change `JWT_SECRET` to any long random text.

Start everything:

```
npm run dev
```

Open **http://localhost:5173**. Create an account and try it. The first time the server starts it loads 25 skills, 6 roles and learning links into your database by itself.

> Keep this folder somewhere like `Documents`, not `Downloads` (stray config files in Downloads can confuse Vite).

---

## 2. Try the worked example from your synopsis

1. Sign up, then open **My skills** and set: HTML Advanced, CSS Intermediate, JavaScript Intermediate, Node.js Beginner, Git Intermediate, REST APIs Beginner.
2. **Goal roles** > Full Stack Developer > **See my gap**. You get **40%**, 3 strong, 3 need work, 4 missing, and Frontend Developer (54%) and Web Designer (52%) as alternatives.
3. **Build my roadmap**. Finish *JavaScript* and *Node.js*. Readiness becomes **52%**.

The automated tests check exactly these numbers.

---

## 3. Put it online (so anyone can open it)

### a) Free cloud database: MongoDB Atlas
1. Sign up at mongodb.com/atlas and create a **free (M0)** cluster.
2. **Database Access** > add a database user. Use a simple password (letters and numbers only).
3. **Network Access** > Add IP address > **Allow access from anywhere** (`0.0.0.0/0`). The hosting service needs this.
4. **Connect** > **Drivers** > copy the connection string. Replace `<password>` with your password and add the database name before the `?`:
   `mongodb+srv://user:pass@cluster0.xxxxx.mongodb.net/skill-gap-analyzer?retryWrites=true&w=majority`

### b) Put the code on GitHub
```
git init
git add .
git commit -m "Skill Gap Analyzer"
```
Create an empty repository on github.com, then run the two lines it shows you (`git remote add origin ...` and `git push -u origin main`). Your `.env` is ignored, so your secrets stay private.

### c) Free hosting: Render
1. Sign up at render.com with GitHub. **New** > **Web Service** > pick your repository.
2. Fill in:
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Environment variables:** `MONGODB_URI` (your Atlas string), `JWT_SECRET` (long random text), `NODE_ENV` = `production`
3. Click **Create Web Service**. After a few minutes you get a link like `https://your-app.onrender.com`. That is your public website.

Free Render apps go to sleep after 15 minutes without visitors, and the first visit afterwards takes 30 to 60 seconds. **Open the link once before a demo or viva** so it is awake.

---

## 4. How the project is organised

```
server/                     the backend (Express)
  index.js                  starts the server and connects to MongoDB
  app.js                    sets up middleware and connects all the routes
  models/index.js           the 7 database collections (users, skills, jobroles, roleskills, userskills, roadmaps, resources)
  routes/                   one file per feature (auth, profile, catalogue, analysis, roadmap, dashboard)
  middleware/index.js       login check (JWT), input validation, error handler
  services/analysis.js      Profile Analysis Service: gap + readiness score
  services/recommendation.js Rule-based engine: roadmap order, locking, milestones
  seed/data.js              skills, roles, weights and links (plain data, edit freely)
client/src/                 the frontend (React)
  pages/                    Login, Register, Dashboard, Skills, Roles, Analysis, Roadmap
  components/               top bar, charts, small shared pieces
  AuthContext.jsx           who is logged in
  api.js                    the one place that calls the backend
tests/                      engine.test.js (rules) and api.test.js (all endpoints)
```

### What happens when someone signs up
1. `pages/Register.jsx` checks the form and calls `AuthContext.register`.
2. That sends `POST /api/auth/register` (`api.js`) to the server.
3. `routes/auth.js` validates the input, hashes the password with bcrypt, and saves the user in MongoDB.
4. The server replies with a **JWT token**. The browser keeps it in `localStorage`.
5. Every later request carries `Authorization: Bearer <token>`. `middleware/index.js` (`requireAuth`) checks it before any private route runs.

### The rules (R1 to R6)
| Rule | Where | What it does |
|---|---|---|
| R1 Missing skill | `recommendation.js` | Skill you do not have becomes a "learn" step |
| R2 Weak skill | `recommendation.js` | Skill below the required level becomes an "improve" step |
| R3 Prerequisite | `recommendation.js` | A prerequisite always comes before the skill that needs it |
| R4 Priority | `recommendation.js` | Inside a phase, higher weight first |
| R5 Alternative role | `analysis.js` | Roles with at least 50% match are suggested (`ALT_ROLE_THRESHOLD`) |
| R6 Completion | `recommendation.js` | A phase unlocks when the previous phase is done; readiness is recalculated |

---

## 5. Run the tests

```
npm test
```

28 tests: the worked example from the synopsis, every rule, sign up / log in, protected routes, saving data, roadmap and progress. The API tests start a temporary MongoDB and download it the first time (needs internet).

---

## 6. Synopsis versus this build (for your report)

**Built:** registration and login (bcrypt + JWT), skill profile with 3 levels and search, role catalogue (6 roles), gap analysis with readiness score, category chart, rule engine R1 to R6, alternative roles, roadmap with locking, progress tracking, milestone badges, readiness trend chart, dashboard, input validation (express-validator), Helmet, CORS, rate limiting on login, central error handling, unit and API tests (Jest, Supertest).

**Differences to mention:**
- `bcryptjs` is used instead of `bcrypt`. Same algorithm, but it installs on Windows without a compiler.
- Plain CSS and Context API instead of Tailwind/Bootstrap and Redux (the synopsis lists these as options).
- Roles, skills, prerequisites and weights are stored in MongoDB and edited in `server/seed/data.js`. The rule on/off switches are not stored as data.

**Not built yet (good next steps):** admin panel with CRUD and usage statistics, downloadable PDF report, notifications and weekly goals, secondary goal role, radar chart. The `role` field on users and the `PUT /api/profile` endpoint are already there to build on.

---

## 7. Common problems

| Problem | Fix |
|---|---|
| `Could not connect to MongoDB` | Check `MONGODB_URI` in `.env`. In Atlas, check Network Access allows your IP (or `0.0.0.0/0`). |
| Blank page after deploying | The build did not run. The Render Build Command must be `npm install && npm run build`. |
| "JWT_SECRET is missing" on Render | Add `JWT_SECRET` under Environment. |
| `npm audit` shows warnings | Safe to ignore for this project. The warning is about server-side React Router features that are not used here. |
| Changed `seed/data.js` but nothing changed | Run `npm run seed`. |
| Want a clean database | In Atlas, delete the `skill-gap-analyzer` database and restart the server. It reloads the starter data. |
