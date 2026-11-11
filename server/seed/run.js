// Run with:  npm run seed
const mongoose = require('mongoose');
const config = require('../config');
const { seedDatabase } = require('./seed');

(async () => {
  await mongoose.connect(config.mongoUri);
  await seedDatabase();
  console.log('Seeded skills, roles and learning resources.');
  await mongoose.disconnect();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
