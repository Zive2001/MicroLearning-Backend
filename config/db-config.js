// config/db-config.js
require('dotenv').config();

module.exports = {
  SQL_HOST: process.env.SQL_HOST || 'localhost',
  SQL_USER: process.env.SQL_USER || 'root',
  SQL_PASSWORD: process.env.SQL_PASSWORD || '',
  SQL_DATABASE: process.env.SQL_DATABASE || 'sandbox',
  SQL_PORT: process.env.SQL_PORT || 3306
};