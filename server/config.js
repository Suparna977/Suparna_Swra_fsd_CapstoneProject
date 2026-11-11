// Reads settings from the .env file (or from the hosting service's environment).
require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';

if (isProduction && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is missing. Set it in your hosting dashboard (Environment).');
}

module.exports = {
  isProduction,
  isTest: process.env.NODE_ENV === 'test',
  port: process.env.PORT || 5000,
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/skill-gap-analyzer',
  // The fallback is only for local development.
  jwtSecret: process.env.JWT_SECRET || 'dev-only-secret-do-not-use-in-production',
  jwtExpiresIn: '7d',
  // Rule R5: another role is suggested when the skill match is at least this many percent.
  alternativeRoleThreshold: Number(process.env.ALT_ROLE_THRESHOLD) || 50,
};
