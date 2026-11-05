const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'chitvault',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  multipleStatements: true,
  dateStrings: true
};

let pool = mysql.createPool(dbConfig);

async function testConnection() {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query('SELECT 1 as connected, DATABASE() as current_db, VERSION() as mysql_version');
    connection.release();
    return {
      success: true,
      data: rows[0],
      config: {
        host: dbConfig.host,
        port: dbConfig.port,
        user: dbConfig.user,
        database: dbConfig.database
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      config: {
        host: dbConfig.host,
        port: dbConfig.port,
        user: dbConfig.user,
        database: dbConfig.database
      }
    };
  }
}

async function query(sql, params) {
  return pool.query(sql, params);
}

function updateConfig(newConfig) {
  Object.assign(dbConfig, newConfig);
  pool = mysql.createPool(dbConfig);
  return testConnection();
}

module.exports = {
  pool,
  query,
  testConnection,
  updateConfig,
  getDbConfig: () => ({ ...dbConfig, password: '****' })
};
