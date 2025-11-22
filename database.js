import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config();

let pool;

export async function getPool() {
  if (pool) return pool;

  const config = {
    host: process.env.MYSQLHOST || 'localhost',
    user: process.env.MYSQLUSER || 'root',
    password: process.env.MYSQLPASSWORD || '',
    database: process.env.MYSQLDATABASE || 'personal_design',
    port: process.env.MYSQLPORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    decimalNumbers: true
  };

  if (process.env.DATABASE_URL) {
    try {
      const url = new URL(process.env.DATABASE_URL);
      config.host = url.hostname;
      config.port = url.port;
      config.user = url.username;
      config.password = url.password;
      config.database = url.pathname.replace(/^\//, '');
    } catch (e) {
      console.log('Using individual MySQL config');
    }
  }

  pool = mysql.createPool(config);
  return pool;
}

export async function initDatabase() {
  const db = await getPool();

  // Создаём таблицы
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
      title VARCHAR(200) NOT NULL UNIQUE,
      content TEXT,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // Добавляем тестового админа если нет
  const [rows] = await db.execute(`SELECT COUNT(*) AS cnt FROM admins`);
  if (rows[0].cnt === 0) {
    const hash = await bcrypt.hash('thklty13$', 10);
    await db.execute(`INSERT INTO admins (username, password_hash) VALUES (?, ?)`, ['tykhon', hash]);
    console.log('✅ Test admin created: tykhon / thklty13$');
  }

  // Добавляем дефолтный контент
  const defaultContent = [
    ['hero_title', 'We craft premium logos, posters, social content, promo videos & 3D visuals.'],
    ['hero_subtitle', 'Fast delivery, polished aesthetics, and conversion-driven visuals. Get a free sample for your first project — no strings attached.'],
    ['services', '[]'],
    ['portfolio', '[]'],
    ['contact_info', '{"email":"hello@personaldesign.com","phone":"+353 1 234 5678","address":"Dublin, Ireland"}']
  ];

  for (const [key, value] of defaultContent) {
    await db.execute(
      'INSERT IGNORE INTO content (title, content) VALUES (?, ?)',
      [key, value]
    );
  }

  console.log('✅ Database initialized');
}