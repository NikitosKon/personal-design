import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config();

let pool;

function parseDatabaseUrl(url) {
  try {
    const parsed = new URL(url);
    return {
      host: parsed.hostname,
      port: parsed.port,
      user: parsed.username,
      password: parsed.password,
      database: parsed.pathname.replace(/^\//, '')
    };
  } catch (e) {
    return null;
  }
}

export async function getPool() {
  if (pool) return pool;

  let cfg = null;
  if (process.env.DATABASE_URL) {
    cfg = parseDatabaseUrl(process.env.DATABASE_URL);
  }

  pool = mysql.createPool({
    host: cfg?.host || process.env.DB_HOST || process.env.MYSQLHOST,
    user: cfg?.user || process.env.DB_USER || process.env.MYSQLUSER,
    password: cfg?.password || process.env.DB_PASS || process.env.MYSQLPASSWORD,
    database: cfg?.database || process.env.DB_NAME || process.env.MYSQLDATABASE,
    port: cfg?.port || process.env.DB_PORT || process.env.MYSQLPORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    decimalNumbers: true
  });

  return pool;
}

export async function initDatabase() {
  const db = await getPool();

  // Создаём таблицы, если не существуют
  await db.execute(`
    CREATE TABLE IF NOT EXISTS admins (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(100) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS messages (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(200),
      email VARCHAR(200),
      project_type VARCHAR(200),
      message TEXT,
      status ENUM('new','read','replied') DEFAULT 'new',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS content (
      id INT AUTO_INCREMENT PRIMARY KEY,
      key_name VARCHAR(200) NOT NULL UNIQUE,
      value TEXT,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // Seed admin if none exists
  const [rows] = await db.execute(`SELECT COUNT(*) AS cnt FROM admins`);
  if (rows[0].cnt === 0) {
    const adminUser = process.env.ADMIN_USERNAME || 'admin';
    const adminPass = process.env.ADMIN_PASSWORD || 'password';
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(adminPass, salt);
    await db.execute(`INSERT INTO admins (username, password_hash) VALUES (?, ?)`, [adminUser, hash]);
    console.log(`Seeded admin user: ${adminUser} (from ADMIN_USERNAME / ADMIN_PASSWORD env)`);
  }

  console.log('Database initialized');
}

export { getPool as db };
