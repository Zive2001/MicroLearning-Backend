// config/db-config.js
require('dotenv').config();

module.exports = {
  ORACLE_USER: process.env.ORACLE_USER || 'system',
  ORACLE_PASSWORD: process.env.ORACLE_PASSWORD || 'oracle',
  ORACLE_CONNECT_STRING: process.env.ORACLE_CONNECT_STRING || 'localhost:1521/XE',
  ORACLE_POOL_MIN: parseInt(process.env.ORACLE_POOL_MIN || '2'),
  ORACLE_POOL_MAX: parseInt(process.env.ORACLE_POOL_MAX || '5'),
  ORACLE_POOL_INCREMENT: parseInt(process.env.ORACLE_POOL_INCREMENT || '1')
};