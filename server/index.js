// Starts everything: connects to MongoDB, loads the starter data once, then listens for requests.
const mongoose = require('mongoose');
const config = require('./config');
const app = require('./app');
const { Skill } = require('./models');
const { seedDatabase } = require('./seed/seed');

async function start() {
  try {
    await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 10000 });
  } catch (err) {
    console.error('\nCould not connect to MongoDB.');
    console.error('Check MONGODB_URI in your .env file, and that MongoDB is running (or your Atlas IP access is open).\n');
    console.error(err.message);
    process.exit(1);
  }
  console.log('Connected to MongoDB');

  // First run on an empty database: load the roles and skills automatically.
  if ((await Skill.countDocuments()) === 0) {
    await seedDatabase();
    console.log('Loaded starter skills, roles and learning links');
  }

  app.listen(config.port, () => console.log(`Server running on http://localhost:${config.port}`));
}

start();
